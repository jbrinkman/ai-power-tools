---
name: pr-comment-resolver
description: Work through the review comments on a GitHub pull request one at a time, addressing each. Use when asked to resolve, address, or respond to PR review comments/feedback, or to "fix the review comments" on a pull request. For each comment: summarize it, propose a fix, and wait for the user to approve, skip, or supply an alternative before acting. On an approved fix, commit the change, reply to the comment with a commit reference, and mark the thread resolved. Ends with a table of every comment and its resolution.
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
2. Confirm the current directory is a clone of the PR's repository and the PR's
   head branch is checked out (see Step 2). Committing requires the working
   tree, not just API access.

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

1. Run `gh pr checkout <pr_number> --repo OWNER/REPO`.
2. Run `git status` to confirm a clean tree. If there are uncommitted changes,
   stop and ask the user how to handle them — do not stash or discard without
   direction.

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
- **Proposed fix**: The single best change that addresses the comment. Commit
  to one clear action — do not present multiple options joined by "or". Show the
  concrete diff or the exact edit you intend to make so the user can judge it.
- **Alternatives** (optional): brief bullets of other viable approaches, shown
  only to help the user decide. Not applied unless chosen.

Then ask for a decision and **wait** — do not proceed until the user responds:

| Decision | Action |
|----------|--------|
| **Approve** | Apply the proposed fix (Step 5). |
| **Skip** | Leave the thread unaddressed. Record the reason. Move on. |
| **Alternative** | The user supplies a different fix. Apply that instead (Step 5). |

Never move to the next comment until the current one is Approved, Skipped, or
resolved with an Alternative.

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

For a **Skipped** comment, do none of the above — just record it as unaddressed
with the user's reason.

Record for each comment: location, reviewer, decision, commit SHA (if any), and
a one-line note on the resolution.

## Step 6: Repeat until every comment is reviewed

Continue through the queue one comment at a time. Do not stop early unless the
user asks to. If new commits triggered CI, mention it but do not block on it
unless the user wants to wait.

## Step 7: Final summary table

After the last comment, present a table covering every comment reviewed, so the
user can see what changed and what remains:

| # | Location | Reviewer | Summary | Decision | Commit | Resolution |
|---|----------|----------|---------|----------|--------|-----------|
| 1 | `src/x.ts:42` | alice | Null check missing | Approved | `a1b2c3d` | Added guard; thread resolved |
| 2 | `src/y.ts:10` | bob | Rename var | Skipped | — | Left unaddressed: reviewer preference, deferred |
| 3 | general | carol | Update README | Alternative | `e4f5g6h` | Documented under Usage instead; thread resolved |

Below the table, explicitly list the comments that remain **unaddressed**
(Skipped or deferred) so nothing is lost. Note that skipped threads are still
open on the PR and may need a manual reply or follow-up.

## Exit criteria

- Every unresolved review thread has been presented to the user and given a
  decision.
- Each approved/alternative fix has its own commit, an in-thread reply with a
  commit link, and a resolved thread.
- The final summary table and the list of remaining unaddressed comments have
  been shown.
