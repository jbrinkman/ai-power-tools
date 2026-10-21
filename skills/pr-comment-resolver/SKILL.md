---
name: pr-comment-resolver
description: Work through the review comments on a GitHub pull request one at a time, addressing each. Use when asked to resolve, address, or respond to PR review comments/feedback, or to "fix the review comments" on a pull request. For each comment: summarize it, independently assess whether the comment is valid (agree/partially agree/disagree), and propose a fix — then wait for the user to approve, reject, skip, or supply an alternative. On an approved fix, commit the change, reply to the comment with a commit reference, and mark the thread resolved; on a reject, reply with the reasoning and resolve. Ends with a table of every comment, the assessment, and its resolution.
---

<!--
Companion to the code-review skill (which posts review comments). This skill
addresses review comments left by others. Reuses the same gh / gh api / GraphQL
conventions for reading and resolving review threads.
-->

# Resolve PR Review Comments

Work through the unresolved review comments on a GitHub pull request one at a
time, addressing each with the user in the loop. This is the counterpart to
the `code-review` skill: that skill *writes* review comments; this skill
*addresses* them.

Do not batch. Present one comment, get a decision, act on it, then move to the
next. Never move on until the user responds.

## Step 0: Validate tools

1. Run `gh auth status` to confirm the GitHub CLI is installed and
   authenticated. If it fails, stop and ask the user to install
   (`brew install gh`) and authenticate (`gh auth login`).
2. Confirm the current directory is a clone of the PR's repository. Committing
   requires the working tree, not just API access.
3. This skill does **not** check out the PR branch in your current clone. All
   work happens in a dedicated git worktree (Step 2) so that two sessions
   working different PRs in the same clone never fight over the checked-out
   branch. The worktree is a separate working directory with its own branch, so
   your current clone's branch is never changed and needs no restoring — removing
   the worktree at the end (Step 9) leaves the clone exactly as it was.

## Step 1: Identify the PR

Determine the target PR from the user's request. Accept a PR number, a full PR
URL, or "the current branch's PR". Resolve `owner`, `repo`, and `pr_number`.

- For a URL like `https://github.com/OWNER/REPO/pull/N`, parse the three parts.
- For a bare number, use the current repo (`gh repo view --json owner,name`).
- Record `OWNER/REPO` for all later `gh api` calls; pass `--repo OWNER/REPO`
  explicitly so cross-repo PRs work.

## Step 2: Create an isolated worktree for the PR branch

The fixes are committed onto the PR's head branch. Rather than checking that
branch out in the current clone (which would switch the branch out from under
any other session using the same clone, and leave the user on the PR branch
afterward), create a dedicated **git worktree** and do all the work there. A
worktree is a second working directory attached to the same repository, with its
own checked-out branch — so concurrent sessions on different PRs never collide,
and your starting clone's branch is never touched.

1. Run `git status --porcelain` in the current clone first. If the tree is not
   clean, that is fine for worktree creation — the worktree is separate — but if
   the user intended those changes for this PR, stop and ask. Do not stash or
   discard anything.
2. Fetch the PR's head ref and create a dedicated worktree for it under
   `$KIROCREW_SCRATCH` (session-owned scratch, reclaimed automatically). This
   sequence works for both same-repo and fork PRs:

   ```bash
   HEAD_BRANCH=$(gh pr view <pr_number> --repo OWNER/REPO --json headRefName -q .headRefName)
   WT="$KIROCREW_SCRATCH/pr-comment-resolver/<pr_number>-${HEAD_BRANCH//\//-}"

   # Fetch the PR head into a local branch named after the PR head.
   # pull/<n>/head resolves the PR's commits regardless of same-repo vs fork.
   git fetch origin "pull/<pr_number>/head:$HEAD_BRANCH"

   # Attach a worktree checked out to that branch.
   git worktree add "$WT" "$HEAD_BRANCH"
   ```

   - If `git fetch` into `$HEAD_BRANCH` fails because that local branch already
     exists and points elsewhere, add the worktree against the existing branch
     instead: `git worktree add "$WT" "$HEAD_BRANCH"`.
   - If `git worktree add` reports the branch is already checked out in another
     worktree (a concurrent run), run `git worktree list`, reuse that existing
     worktree path as `$WT`, and skip creating a new one.
3. **Change into the worktree** and treat it as your working directory for the
   rest of the pass: `cd "$WT"`. Confirm it is clean and on the PR branch with
   `git status`. Every edit, commit, and push in Steps 4–6 happens here, never in
   the user's original clone.
4. Record the worktree path `$WT` and the main clone root — Step 9 removes the
   worktree and leaves the original clone untouched (no branch restore needed,
   because the clone's branch was never changed).

Note on pushing (Step 5): a worktree branch created this way has no upstream set,
and for a fork PR `origin` is the base repo. Step 5 always names the remote and
branch explicitly and resolves the correct head remote for forks, so no upstream
is required here.

## Step 3: Gather PR context and comments

1. `gh pr view <pr_number> --repo OWNER/REPO --json title,body,baseRefName,headRefName,headRepositoryOwner,isCrossRepository`
   for PR metadata. `isCrossRepository` (and `headRepositoryOwner`) tell you
   whether the PR comes from a fork, which Step 5 needs to push correctly.
2. Fetch the **review comments** (inline, file-anchored) with their thread and
   resolution state via GraphQL, because the REST comments endpoint does not
   expose whether a thread is resolved:

```bash
gh api graphql -f query='
query($owner:String!,$repo:String!,$pr:Int!){
  repository(owner:$owner,name:$repo){
    pullRequest(number:$pr){
      reviewThreads(first:100){
        nodes{
          id
          isResolved
          isOutdated
          comments(first:20){
            nodes{ databaseId author{login} path line diffHunk body createdAt }
          }
        }
      }
    }
  }
}' -f owner=OWNER -f repo=REPO -F pr=PR_NUMBER
```

3. Build the working set: every thread where `isResolved` is `false`. Each
   thread's first comment is the reviewer's original comment; later comments are
   the discussion. Note the thread `id` (a `PRRT_…` node id — needed to resolve
   it) and the first comment's `databaseId` (needed to reply in-thread).
4. Also capture top-level PR review comments and issue comments if the user
   wants those addressed too: `gh api repos/OWNER/REPO/pulls/PR_NUMBER/comments`
   and `.../issues/PR_NUMBER/comments`. By default focus on unresolved inline
   review threads; ask the user if they also want general comments included.
5. **Verify the count.** State how many unresolved threads you found. If a
   thread surfaces later that was not in this set, treat it as one you missed,
   not as newly arrived — re-check the full set rather than assuming.

## Step 4: Address each comment, one at a time

For each unresolved thread, in order, present:

- **Comment N of M** — position in the queue.
- **Location**: `path:line` (or "general comment" if not file-anchored).
- **Reviewer**: the comment author's login.
- **Summary**: 1–3 sentences restating what the reviewer is asking for and why.
- **Assessment**: Your own independent judgment of whether the comment is
  valid — do not assume a reviewer (human or AI bot) is correct. You are the
  first line of defense against invalid, mistaken, or low-value comments. Read
  the actual code and the diff context before judging, and take an explicit
  stance:
  - **Agree** — the comment identifies a real issue worth fixing.
  - **Partially agree** — there is a real concern, but the framing, scope, or
    suggested remedy is off; note what you'd do differently.
  - **Disagree** — the comment is incorrect, based on a misreading, addresses
    code the PR did not change, is already handled elsewhere, is a stylistic
    preference that conflicts with the project's conventions, or is otherwise
    not worth acting on.

  State the stance in one line, then give a brief reason grounded in the code
  (cite the relevant line or fact). Be fair to the reviewer: a comment being
  from an AI bot is not by itself a reason to disagree, and a comment being from
  a senior human is not by itself a reason to agree — judge the substance.
- **Proposed fix**: The single best change that addresses the comment, when you
  Agree or Partially agree. Commit to one clear action — do not present multiple
  options joined by "or". Show the concrete diff or the exact edit you intend to
  make so the user can judge it. When you **Disagree**, propose *no* fix; instead
  propose a short, respectful reply explaining why the comment does not need a
  change, and recommend Reject.
- **Alternatives** (optional): brief bullets of other viable approaches, shown
  only to help the user decide. Not applied unless chosen.

Your assessment is a recommendation. The user always makes the final call — a
comment you disagree with is still fixed if the user approves a fix, and a
comment you agree with is still skipped or rejected if the user says so.

### Do not edit historic/audit artifacts

Spec files, task lists, design/requirements documents, and similar records
(e.g. `.kairon/specs/*`, a Kiro `requirements.md` / `design.md` / `tasks.md`)
are **immutable audit artifacts**: they capture what the author/LLM was given
to *generate* the code, not a living description of current behavior. A
divergence between an older spec and the corrected final code is expected and
intentional — the code and its tests are the authoritative record of current
behavior.

So when a reviewer (often an AI bot) flags that a spec no longer matches the
shipped code and asks you to rewrite the spec to match, **Disagree and
recommend Reject** by default. Rewriting the artifact would destroy its value
as a historical record and invalidate the audit trail. Explain in your
recommendation that the spec is a historic artifact and the divergence is
intended; if the user chooses Reject, reply to the thread and resolve it per
Step 5's reject path. Only edit files meant to track *current* behavior — live source,
tests, and user-facing docs (README, usage docs). If you are unsure whether a
given file is a historic artifact or living documentation, ask the user before
editing it.

Then ask for a decision and **wait** — do not proceed until the user responds:

| Decision | Action |
|----------|--------|
| **Approve** | Apply the proposed fix (Step 5). |
| **Reject** | You (and usually the user) judged the comment invalid. Apply no code change. Post the reply explaining why no change is needed, then resolve the thread (Step 5, reject path). Record it as rejected with the reason. |
| **Skip** | Leave the thread unaddressed and unresolved for now (defer, needs more thought, out of scope for this pass). Record the reason. Move on. |
| **Alternative** | The user supplies a different fix. Apply that instead (Step 5). |

Lead with your recommended decision (e.g. "I recommend **Reject** because…"),
but never move to the next comment until the user has chosen Approve, Reject,
Skip, or Alternative for the current one.

## Step 5: Apply an approved (or alternative) fix

Do these in order, per comment, so each fix maps to exactly one commit:

1. **Edit** the file(s) to implement the approved change.
2. **Commit** just this change. Use a conventional-commit message referencing
   the comment, e.g.
   `git commit --no-gpg-sign -m "fix: <short description> (review comment)"`.
   Use `--no-gpg-sign` only if gpg is unavailable on this machine; otherwise
   respect the repo's signing config. Prefer staging the specific changed files
   over `git add .`.
3. **Gate on the FAST checks before pushing.** Invoke the `verify-ci-checks`
   skill to discover the CI build checks the project enforces, but at this
   per-comment stage run only the **fast tier**: formatting, linting,
   type-checking, building, and a fast or targeted test (for example the tests
   for just the package this fix touched). **Defer the project's full
   long-running test suite** — the whole-repository run that takes minutes — to a
   single run after every comment is resolved (the new "final full-suite gate"
   step after Step 6). Running that slow suite after each comment multiplies the
   wait by the number of comments for no extra safety the final run does not
   already give. Pass `verify-ci-checks` the fast tier as the checks to run now,
   and tell it the long-running suite is deferred to the end. This fast gate is
   the per-comment push gate:
   - **Gate PASS** — the fast checks pass; proceed to push.
   - **Gate FAIL** — do **not** push. Fix the failing check(s), amend this
     comment's commit (or add a fixup that you squash into it so the fix stays
     part of the same logical change), and re-run the fast gate until it passes.
     If the same check keeps failing after a few focused attempts, stop and
     surface it to the user rather than thrashing.
   - **NOT APPLICABLE** — the project exposes no discoverable checks; note that
     and proceed to push.
4. **Push** to the PR's head branch from inside the worktree. Whether `origin`
   is the right remote depends on where the PR comes from (see the
   `isCrossRepository` metadata from Step 3):
   - **Same-repo PR**: push naming the branch explicitly —
     `git push origin <head-branch>`.
   - **Fork PR** (`isCrossRepository` is `true`): `origin` points at the base
     repo, not the fork, so pushing there is wrong. The worktree branch has no
     fork remote configured, so add one and push to it explicitly:
     `git remote add fork https://github.com/<headRepositoryOwner>/REPO.git`
     (skip if a remote already points at the fork), then
     `git push fork <head-branch>`. This requires the fork to have "Allow edits
     from maintainers" enabled; if the push is rejected for permissions, stop and
     tell the user rather than forcing it.
   In all cases name the branch (and remote) explicitly — a bare `git push` is
   blocked by policy.
5. **Capture the commit ref**: `git rev-parse HEAD` (short form for the reply).
6. **Reply to the thread** with an explanation plus a link to the commit:

```bash
gh api repos/OWNER/REPO/pulls/PR_NUMBER/comments \
  --method POST \
  -f body="Addressed in COMMIT_SHA: <one-line explanation>. See https://github.com/OWNER/REPO/commit/FULL_SHA" \
  -F in_reply_to=ORIGINAL_COMMENT_DATABASE_ID
```

7. **Resolve the thread** via GraphQL using the thread node id:

```bash
gh api graphql -f query='
mutation($threadId:ID!){
  resolveReviewThread(input:{threadId:$threadId}){
    thread{ isResolved }
  }
}' -f threadId=PRRT_THREAD_NODE_ID
```

For a **Rejected** comment (the comment is invalid / needs no code change), do
**not** edit, commit, or push. Instead:

1. Reply to the thread with a respectful explanation of why no change is needed,
   grounded in the code — do not just close it silently:

```bash
gh api repos/OWNER/REPO/pulls/PR_NUMBER/comments \
  --method POST \
  -f body="Thanks for the review. I don't think a change is needed here: <clear, specific reason>." \
  -F in_reply_to=ORIGINAL_COMMENT_DATABASE_ID
```

2. Resolve the thread with the same `resolveReviewThread` mutation shown above.

Record it as **Rejected** with the reason. If the user is uncertain about a
rejection, leave the thread unresolved and treat it as Skipped instead so a human
can weigh in.

For a **Skipped** comment, do none of the above — leave the thread open and
unresolved, and just record it as unaddressed with the user's reason.

Record for each comment: location, reviewer, your assessment stance, decision,
commit SHA (if any), and a one-line note on the resolution.

## Step 6: Repeat until every comment is reviewed

Continue through the queue one comment at a time. Do not stop early unless the
user asks to. Each pushed fix passed the per-comment **fast** gate (Step 5.3) or
had no discoverable checks. The project's full long-running test suite has not
run yet; it runs once now, in the next step, before the work is considered done.

## Step 6b: Final full-suite gate (run the long-running tests once)

After the last comment is resolved, run the project's full long-running test
suite **once**, over the final branch tip, in the worktree. This is the run that
was deferred from each per-comment gate in Step 5.3, so a cross-comment or
cross-package regression that the per-comment fast/targeted tests could not see
is caught here, in a single run rather than once per comment.

1. Invoke `verify-ci-checks` for the full suite this time (the whole-repository
   test run, for example `go test -race ./...`), plus any other long-running
   checks the project gates on that were deferred from the fast tier.
2. **Suite PASS** — the branch tip is verified; proceed to the summary.
3. **Suite FAIL** — the work is not done. The earlier per-comment commits are
   already pushed, so fix **forward** with a new commit (never amend or
   force-push an already-pushed commit), run the fast gate on that fix, push it,
   and re-run this full suite until it passes. Name which earlier fix most likely
   caused the failure. If it keeps failing after a few focused attempts, stop and
   surface it to the user.

Run this step even if only one comment was addressed: one final whole-repository
run is the floor, not something scaled away when the comment count is low.

## Step 7: Final summary table

After the last comment, present a table covering every comment reviewed, so the
user can see your assessment, what changed, and what remains:

| # | Location | Reviewer | Summary | Assessment | Decision | Commit | Resolution |
|---|----------|----------|---------|------------|----------|--------|-----------|
| 1 | `src/x.ts:42` | alice | Null check missing | Agree | Approved | `a1b2c3d` | Added guard; thread resolved |
| 2 | `src/y.ts:10` | copilot | Rename var | Disagree | Rejected | — | Name follows project convention; replied and resolved |
| 3 | `src/z.ts:88` | bob | Refactor loop | Partially agree | Skipped | — | Valid concern but out of scope; left open for follow-up |
| 4 | general | carol | Update README | Agree | Alternative | `e4f5g6h` | Documented under Usage instead; thread resolved |

Below the table, explicitly list the comments that remain **open** so nothing is
lost:
- **Skipped/deferred** threads are still open on the PR and may need a manual
  reply or follow-up.
- Call out any comment where your assessment and the user's decision diverged
  (e.g. you recommended Reject but the user approved a fix, or vice versa), so
  the reasoning is on record.

## Step 8: Re-check for remaining unresolved threads

The Step 3 query fetches up to 100 threads (`reviewThreads(first:100)`). That is
plenty for a normal PR, but rather than paginate, confirm completeness at the end
by re-counting:

1. Re-run the Step 3 GraphQL query and count threads where `isResolved` is
   `false`.
2. If the count is **0**, the pass is complete.
3. If the count is **greater than 0**, some threads are still open. That happens
   when the user Skipped/deferred a comment, or — rarely — when the PR had more
   than 100 threads and the first fetch was truncated. Report the remaining
   count and suggest running the skill again to work through them:

   > N review threads are still unresolved. Run the skill again on this PR to
   > continue — resolved threads drop out of the next fetch, so a re-run picks up
   > exactly what is left (including any beyond the first 100).

Because each resolved thread disappears from the next `first:100` fetch, repeated
runs converge on zero without any pagination logic in the skill.

## Step 9: Clean up the worktree

Always run this step, even if the pass ended early, failed, or the user stopped
it — the scratch worktree should not be left behind. Because the worktree is a
separate working directory, the user's original clone was never switched off its
branch, so there is nothing to restore: removing the worktree leaves the clone
exactly as the user left it (even if they changed its branch in another session
meanwhile).

1. Leave the worktree directory before removing it — change into the main clone
   root recorded in Step 2 (not the worktree, which is about to be deleted):

   ```bash
   cd <main-clone-root>
   ```

2. Remove the worktree (this deletes the scratch working directory but keeps the
   local branch and all pushed commits):

   ```bash
   git worktree remove "$WT"
   ```

   If `git worktree remove` refuses because the worktree has uncommitted changes
   (there should be none — every approved fix was committed), investigate rather
   than forcing: surface it to the user. Only use `--force` after confirming the
   leftover changes are expendable.
3. Optionally prune the local PR branch created in Step 2 if the user does not
   want it lingering: `git branch -D <head-branch>` (safe — the work is pushed to
   the remote PR). Leave it if unsure.
4. Note in the final summary that the worktree was removed and the user's clone
   was left untouched on whatever branch it was on.

## Exit criteria

- Every unresolved review thread has been presented with an independent validity
  assessment and given a decision by the user.
- Each approved/alternative fix has its own commit, an in-thread reply with a
  commit link, and a resolved thread.
- Each per-comment push was gated on the fast checks only (Step 5.3), and the
  project's full long-running test suite was run once over the final branch tip
  after all comments were resolved (Step 6b), with any failure fixed forward.
- Each rejected comment has an in-thread reply explaining why no change was made
  and a resolved thread — no silent closes.
- The final summary table (including the assessment column) and the list of
  comments left open have been shown.
- A final re-count of unresolved threads has been run; if any remain, the count
  was reported and a re-run of the skill was suggested.
- All work was done in an isolated git worktree (never by switching the current
  clone's branch), and the worktree was removed at the end — leaving the user's
  clone untouched on whatever branch it was on.
