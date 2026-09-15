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
   requires the working tree, not just API access; Step 2 checks out the PR's
   head branch.

## Step 1: Identify the PR

Determine the target PR from the user's request. Accept a PR number, a full PR
URL, or "the current branch's PR". Resolve `owner`, `repo`, and `pr_number`.

- For a URL like `https://github.com/OWNER/REPO/pull/N`, parse the three parts.
- For a bare number, use the current repo (`gh repo view --json owner,name`).
- Record `OWNER/REPO` for all later `gh api` calls; pass `--repo OWNER/REPO`
  explicitly so cross-repo PRs work.

## Step 2: Check out the PR branch

The fixes are committed onto the PR's head branch, so it must be checked out
locally with a clean working tree.

1. Run `git status --porcelain` first. If the tree is not clean, stop and ask
   the user how to handle the uncommitted changes — do not stash or discard
   without direction, and do not check out over them.
2. Run `gh pr checkout <pr_number> --repo OWNER/REPO`.
3. Run `git status` again to confirm the PR branch is clean before making edits.

## Step 3: Gather PR context and comments

1. `gh pr view <pr_number> --repo OWNER/REPO --json title,body,baseRefName,headRefName`
   for PR metadata.
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
2. **Verify** the change builds/lints if a quick check applies — prefer the
   project's own build system / task runner (Makefile, Taskfile, npm scripts,
   `go build`, etc.) over hand-rolled tool invocations, so results match CI.
3. **Commit** just this change. Use a conventional-commit message referencing
   the comment, e.g.
   `git commit --no-gpg-sign -m "fix: <short description> (review comment)"`.
   Use `--no-gpg-sign` only if gpg is unavailable on this machine; otherwise
   respect the repo's signing config. Prefer staging the specific changed files
   over `git add .`.
4. **Push** to the PR's head branch, naming the branch explicitly:
   `git push origin <head-branch>`. A bare `git push` is blocked by policy.
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
user asks to. If new commits triggered CI, mention it but do not block on it
unless the user wants to wait.

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

## Exit criteria

- Every unresolved review thread has been presented with an independent validity
  assessment and given a decision by the user.
- Each approved/alternative fix has its own commit, an in-thread reply with a
  commit link, and a resolved thread.
- Each rejected comment has an in-thread reply explaining why no change was made
  and a resolved thread — no silent closes.
- The final summary table (including the assessment column) and the list of
  comments left open have been shown.
