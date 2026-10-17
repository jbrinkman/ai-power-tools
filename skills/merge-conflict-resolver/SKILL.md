---
name: merge-conflict-resolver
description: Resolve merge conflicts on a GitHub pull request's branch, one conflicting file at a time, with the user in the loop. Use when a PR cannot merge because its branch has conflicts with the base, or when asked to "resolve the merge conflicts", "fix the conflicts", "rebase/merge the base branch", or "update the branch" on a PR. Defaults to merging the base branch into the PR head; rebases instead only when the user explicitly asks. For each conflicting file it presents the two sides and a proposed resolution, and asks the user for clarification whenever a conflict's correct resolution is ambiguous. On approval it stages the resolved file, and once all files are resolved it completes the integration, runs the project's CI gate locally, and pushes the branch. Companion to pr-comment-resolver.
---

<!--
Companion to the pr-comment-resolver and code-review skills. Reuses the same
gh / git conventions for identifying a PR, isolating its branch in a git
worktree, running the verify-ci-checks push gate, and pushing (same-repo vs
fork) safely.
-->

# Resolve Merge Conflicts

Resolve the merge conflicts on a GitHub pull request's branch by integrating the
base branch into the PR head — merging by default, or rebasing when the user
explicitly asks — and working through each conflicting file one at a time, with
the user in the loop. This is a companion to `pr-comment-resolver`: that skill
addresses review comments; this one gets a conflicted branch mergeable again.

Do not batch. Present one conflicting file, propose a resolution, get a
decision, stage it, then move to the next. **Whenever a conflict's correct
resolution is ambiguous — the two sides changed overlapping logic in ways that
cannot be mechanically combined, or you cannot tell which side's intent should
win — stop and ask the user before resolving it.** Never guess at a semantic
merge.

## Step 0: Validate tools and inputs

1. Run `gh auth status` to confirm the GitHub CLI is installed and
   authenticated. If it fails, stop and ask the user to install
   (`brew install gh`) and authenticate (`gh auth login`).
2. Confirm the current directory is a clone of the PR's repository. Resolving
   conflicts requires the working tree, not just API access.
3. This skill does **not** check out the PR branch in your current clone. All
   work happens in a dedicated git worktree (Step 4) so that two sessions
   working different PRs in the same clone never fight over the checked-out
   branch. The worktree is a separate working directory with its own branch, so
   your current clone's branch is never changed and needs no restoring — removing
   the worktree at the end (Step 9) leaves the clone exactly as it was.

## Step 1: Identify the PR

Determine the target PR from the user's request. Accept a PR number, a full PR
URL, or "the current branch's PR". Resolve `owner`, `repo`, and `pr_number`.

- For a URL like `https://github.com/OWNER/REPO/pull/N`, parse the three parts.
- For a bare number, use the current repo (`gh repo view --json owner,name`).
- Record `OWNER/REPO` for all later `gh` / `gh api` calls; pass
  `--repo OWNER/REPO` explicitly so cross-repo PRs work.

## Step 2: Gather PR context

Run:

```bash
gh pr view <pr_number> --repo OWNER/REPO \
  --json title,baseRefName,headRefName,headRepositoryOwner,isCrossRepository,mergeable,mergeStateStatus
```

- `baseRefName` is the branch to merge **into** the PR head (what the PR targets,
  e.g. `main`).
- `headRefName` is the PR's branch — the one that must end up mergeable.
- `isCrossRepository` (with `headRepositoryOwner`) tells you whether the PR comes
  from a fork, which Step 7 needs to push correctly.
- `mergeable` / `mergeStateStatus` indicate whether GitHub currently sees a
  conflict. `mergeable: CONFLICTING` (or `mergeStateStatus: DIRTY`) confirms
  there are conflicts to resolve. If GitHub reports the PR as already mergeable
  (`MERGEABLE` / `CLEAN`), tell the user there are no conflicts to resolve and
  stop — do not merge the base in unnecessarily.

## Step 3: Decide the integration strategy — merge by default, rebase on request

Default to **merging the base branch into the PR head** (`git merge`), not
rebasing. A merge adds one new merge commit on top of the existing, already-pushed
PR history; it never rewrites commits that are already on the remote, so the push
in Step 7 is an ordinary fast-forwardable push with no force. A rebase rewrites
the branch's commits and would require a force-push, which is blocked by policy
on protected branches and is risky on any branch others may have pulled.

Rebase **is** supported, but only when the user **explicitly** asks for it and
understands it rewrites the branch's history and needs a force-push to the
(non-protected) feature branch. Before starting a rebase, confirm the head branch
is not a protected branch and that the user accepts the force-push. If the user
has not asked for a rebase, default to merge — do not switch strategies silently.

The per-file conflict resolution (Steps 5 and 6) is identical for both
strategies. Only the *start* (Step 4) and the *completion and push* (Step 7)
differ, and each of those steps has an explicit **merge path** and **rebase
path** below. Pick the path matching the chosen strategy and follow it
throughout; do not mix a merge start with a rebase completion.

## Step 4: Create an isolated worktree and start the integration

Rather than checking the PR branch out in the current clone (which would switch
the branch out from under any other session using the same clone, and leave the
user on the PR branch afterward), create a dedicated **git worktree** and do all
the integration there. A worktree is a second working directory attached to the
same repository, with its own checked-out branch — so concurrent sessions on
different PRs never collide, and your starting clone's branch is never touched.

1. Run `git status --porcelain` in the current clone first. If the working tree
   is not clean, that is fine for worktree creation — the worktree is separate —
   but if the user intended those changes for this PR, stop and ask. Do not stash
   or discard anything.
2. Fetch the PR's head ref and create a dedicated worktree for it under
   `$KIROCREW_SCRATCH` (session-owned scratch, reclaimed automatically). This
   sequence works for both same-repo and fork PRs:

   ```bash
   HEAD_BRANCH=$(gh pr view <pr_number> --repo OWNER/REPO --json headRefName -q .headRefName)
   WT="$KIROCREW_SCRATCH/merge-conflict-resolver/<pr_number>-${HEAD_BRANCH//\//-}"

   # Fetch the PR head into a local branch named after the PR head.
   # pull/<n>/head resolves the PR's commits regardless of same-repo vs fork.
   git fetch origin "pull/<pr_number>/head:$HEAD_BRANCH"

   # Attach a worktree checked out to that branch.
   git worktree add "$WT" "$HEAD_BRANCH"
   ```

   - If `git fetch` into `$HEAD_BRANCH` fails because that local branch already
     exists and points elsewhere, add the worktree against the existing branch:
     `git worktree add "$WT" "$HEAD_BRANCH"`.
   - If `git worktree add` reports the branch is already checked out in another
     worktree (a concurrent run), run `git worktree list`, reuse that existing
     worktree path as `$WT`, and skip creating a new one.
3. **Change into the worktree** and treat it as your working directory for the
   rest of the pass: `cd "$WT"`. Record the worktree path `$WT` and the main
   clone root — Step 9 removes the worktree and leaves the original clone
   untouched (no branch restore needed, because the clone's branch was never
   changed). Every command in Steps 5–8 runs here, never in the user's original
   clone.
4. Fetch the latest base branch so the integration is against current state:
   `git fetch origin <baseRefName>`.
5. Start the integration using the path for the chosen strategy. **Do not run the
   other path's commands.**

   **Merge path (default).** Start the merge **without auto-committing**, so you
   control the resolution and the final commit:

   ```bash
   git merge --no-commit --no-ff origin/<baseRefName>
   ```

   - If this prints `Already up to date.` or exits with no conflicts and a clean
     merge, there is nothing to resolve — abort any in-progress state with
     `git merge --abort` if needed, tell the user the branch merges cleanly, then
     go to Step 9 to clean up the worktree.
   - If it reports conflicts, continue to Step 5. Do **not** run
     `git merge --continue` or commit yet.

   **Rebase path (only when the user explicitly asked, per Step 3).** Replay the
   PR's commits on top of the current base:

   ```bash
   git rebase origin/<baseRefName>
   ```

   - If this reports the branch is up to date or finishes with no conflicts, there
     is nothing to resolve — tell the user the branch rebases cleanly and
     continue to Step 7's rebase path to push the (now rewritten) branch.
   - If it stops with conflicts, git pauses the rebase at the first conflicting
     commit. Continue to Step 5. A rebase resolves **one replayed commit at a
     time**: Step 5/6 resolve the current commit's conflicts, then Step 7's
     rebase path runs `git rebase --continue`, which may stop again at the next
     conflicting commit — repeat Steps 5–7 for each until the rebase finishes.
     Do **not** run `git commit` during a rebase; `git rebase --continue` makes
     the commit. If you need to back out entirely, `git rebase --abort` restores
     the pre-rebase branch.

## Step 5: Enumerate the conflicting files

1. List the files with conflicts:
   `git diff --name-only --diff-filter=U`.
2. State how many conflicting files there are and list them. This is the working
   set. Also note any conflicts that are **not** simple content conflicts and
   call them out separately, because they are resolved differently:
   - **Both-modified** (`UU`) — the common case; resolve the hunks in Step 6.
   - **Add/add, rename, delete/modify, modify/delete** — inspect with
     `git status` (and `git log --merge -- <file>` for history). For a
     delete/modify or modify/delete conflict the resolution is often "keep the
     file" vs "accept the deletion" rather than editing hunks; **treat these as
     ambiguous and ask the user** which side's intent should win unless it is
     unmistakable.
3. If a conflicting file is a historic/audit artifact that must not be
   hand-edited (for example `.kairon/specs/*`, or a project's generated
   changelog), note it; its resolution still has to produce a valid file, but
   flag to the user that the file is normally not edited and ask how they want it
   reconciled rather than rewriting its content on your own judgment.

## Step 6: Resolve each conflicting file, one at a time

For each file in the working set, in order, present:

- **File N of M** — position in the queue, with the `path`.
- **Conflict type** — both-modified, add/add, delete/modify, etc.
- **The two sides** — for each conflict hunk in the file, show *ours* (the PR
  head, `HEAD`) and *theirs* (the base branch) with enough surrounding context to
  judge intent. Read the surrounding code, not just the marked lines, so the
  resolution is coherent. Markers are `<<<<<<< HEAD` … `=======` … `>>>>>>>`.
- **Why they conflict** — one line on what each side changed and why git could
  not combine them (e.g. "both edited the same function signature", "base
  deleted a block the PR edited").
- **Proposed resolution** — the single best merged content for each hunk, as the
  concrete text you intend to write (not "ours" or "theirs" as a label unless the
  resolution genuinely is to take one side verbatim). Commit to one resolution;
  do not offer multiple joined by "or".

Then classify the conflict and act:

| Situation | Action |
|-----------|--------|
| **Mechanical / unambiguous** — non-overlapping edits, pure import or formatting collisions, one side is a strict superset, or the two intents clearly compose | Propose the merged content, show it, and ask the user to approve before staging. |
| **Ambiguous / semantic** — overlapping logic changes, a signature changed on both sides, a conflict where picking wrong would silently break behavior, or you cannot tell which intent should win | **Ask the user for clarification.** Lay out both sides and the trade-offs, ask the specific question you need answered, and **wait** for the answer before writing anything. Do not pick a side to keep moving. |

Ask for a decision and **wait** — do not resolve the file until the user responds:

| Decision | Action |
|----------|--------|
| **Approve** | Write the approved merged content into the file, removing all conflict markers (Step 6a). |
| **Ours** | Resolve the file by taking the PR head's version for the conflicting hunks (`git checkout --ours -- <file>` for a whole-file take, or edit the specific hunks). |
| **Theirs** | Resolve by taking the base branch's version (`git checkout --theirs -- <file>`, or edit the specific hunks). |
| **Alternative** | The user supplies different merged content. Write that instead. |
| **Skip** | Leave the file conflicted for now and move on; it must be revisited before the merge can complete (flag it in the summary). A skipped file blocks completion in Step 7. |

### Step 6a: Stage the resolved file

After writing the resolution:

1. Confirm no conflict markers remain:
   `git grep -nE '^(<<<<<<<|=======|>>>>>>>)' -- <file>` should print nothing.
2. **Stage the file explicitly**: `git add <file>`. This is required — a file
   edited to remove markers stays `UU` (unmerged) in the index until it is added,
   and neither the merge nor the rebase can continue while any path is unmerged.
   Stage the specific file, not `git add .`.
3. Re-check `git diff --name-only --diff-filter=U` to confirm this file dropped
   out of the unmerged set.

Move to the next file only after the current one is resolved and staged (or the
user explicitly Skipped it).

## Step 7: Complete the integration, gate, and push

Only once **every** conflicting file in the current step is resolved and staged
(no Skipped files remain):

1. **Confirm the index is clean of conflicts**:
   `git diff --name-only --diff-filter=U` must print nothing. If anything
   remains, go back to Step 6 for those files — do not proceed.
2. **Complete the integration** using the path for the chosen strategy.

   **Merge path (default).** Create the merge commit:

   ```bash
   git commit --no-edit
   ```

   Use the default merge message. Respect the repo's signing config; add
   `--no-gpg-sign` only if gpg is unavailable on this machine. The merge is now
   complete — continue to the gate.

   **Rebase path.** Continue the rebase; this commits the resolved commit for
   you (do **not** run `git commit` yourself during a rebase):

   ```bash
   git rebase --continue
   ```

   - If the rebase **stops again** at the next conflicting commit, go back to
     Step 5 and resolve that commit's conflicts, then return here and
     `git rebase --continue` again. Repeat until the rebase reports it has
     finished replaying all commits.
   - Only when the rebase is fully finished (no more commits to replay) is the
     integration complete — continue to the gate.
3. **Gate on CI checks before pushing.** Invoke the `verify-ci-checks` skill to
   discover and run the project's CI build checks locally against the integrated
   tree. An integration can compile cleanly yet still break tests when two
   independently-correct changes interact — the gate catches that before the
   branch leaves the machine.
   - **Gate PASS** — proceed to push.
   - **Gate FAIL** — do **not** push. The failing checks are a sign the conflict
     resolution is wrong or incomplete. Fix the resolution (for a merge, amend the
     merge commit or add a follow-up commit; for a rebase, the failing commit can
     be amended since the branch is being rewritten anyway), re-run the gate, and
     repeat until it passes. If the same check keeps failing after a few focused
     attempts, stop and surface it to the user rather than thrashing.
   - **NOT APPLICABLE** — the project exposes no discoverable checks; note that
     and proceed to push.
4. **Push** to the PR's head branch. The push differs by strategy *and* by where
   the PR comes from (`isCrossRepository` from Step 2).

   **Merge path — ordinary push (no force).** A merge only adds a commit, so the
   push fast-forwards:
   - **Same-repo PR**: push naming the branch explicitly —
     `git push origin <head-branch>`.
   - **Fork PR** (`isCrossRepository` is `true`): `origin` points at the base
     repo, so pushing there is wrong. The worktree branch has no fork remote
     configured, so add one and push to it explicitly:
     `git remote add fork https://github.com/<headRepositoryOwner>/REPO.git`
     (skip if a remote already points at the fork), then
     `git push fork <head-branch>`. This needs the fork's "Allow edits from
     maintainers"; if the push is rejected for permissions, stop and tell the
     user rather than forcing it.

   **Rebase path — force-push required.** A rebase rewrote the branch's commits,
   so a plain push is rejected (non-fast-forward); the branch must be
   force-pushed. Do this only after confirming in Step 3 that the head branch is
   **not** a protected branch (`main`/`master`/`mainline`) and the user accepted
   the force-push — force-pushing a protected branch is blocked by policy and must
   never be attempted.
   - Use `--force-with-lease`, never a bare `--force`: it refuses if the remote
     moved since you last fetched, protecting a collaborator's intervening push.
   - **Same-repo PR**: `git push --force-with-lease origin <head-branch>`.
   - **Fork PR**: add/resolve the `fork` remote as in the merge path above and
     `git push --force-with-lease fork <head-branch>` (still requires
     "Allow edits from maintainers"; stop and tell the user if rejected).

   In all cases name the branch (and remote) explicitly — a bare `git push`, and
   any force-push to a protected branch, are blocked by policy.

## Step 8: Confirm and summarize

1. Re-check mergeability so the result is confirmed, not assumed:
   `gh pr view <pr_number> --repo OWNER/REPO --json mergeable,mergeStateStatus`.
   A short delay may be needed for GitHub to recompute; if it still shows
   `UNKNOWN`, say so rather than claiming success.
2. Present a summary table of every conflicting file and how it was resolved:

| # | File | Conflict type | Resolution | Resolved by |
|---|------|---------------|------------|-------------|
| 1 | `src/app.ts` | both-modified | Merged both edits (kept new param + base's guard) | Approve |
| 2 | `go.mod` | both-modified | Took base's dependency bump | Theirs |
| 3 | `docs/x.md` | both-modified | User supplied combined wording | Alternative |
| 4 | `cfg.yaml` | delete/modify | Kept the file per user's call | Clarified |

3. Report the final state: the resulting head SHA (`git rev-parse HEAD`), whether
   it was a merge or a rebase, the gate verdict, that the branch was pushed (noting
   a force-push for the rebase path), and the PR's recomputed mergeability.
4. List any file left **Skipped** — the integration was NOT completed if any
   remain, so say so explicitly and recommend re-running the skill to finish them.

## Step 9: Clean up the worktree

Always run this step, even if the pass ended early, failed, or the user stopped
it — the scratch worktree should not be left behind. Because the worktree is a
separate working directory, the user's original clone was never switched off its
branch, so there is nothing to restore: removing the worktree leaves the clone
exactly as the user left it (even if they changed its branch in another session
meanwhile).

If a merge or rebase is still in progress because the pass stopped early (e.g. a
Skipped file blocked completion), abort it in the worktree first
(`git merge --abort` or `git rebase --abort`) **only if the user agrees to
discard the partial integration** — otherwise leave the worktree in place so the
user can finish it, and say so instead of removing it.

1. Leave the worktree directory before removing it — change into the main clone
   root recorded in Step 4 (not the worktree, which is about to be deleted):

   ```bash
   cd <main-clone-root>
   ```

2. Remove the worktree (this deletes the scratch working directory but keeps the
   local branch and all pushed commits):

   ```bash
   git worktree remove "$WT"
   ```

   If `git worktree remove` refuses because the worktree has uncommitted changes
   or an in-progress integration, do not force it blindly — surface it to the
   user. Only use `--force` after confirming the leftover state is expendable.
3. Optionally prune the local PR branch created in Step 4 if the user does not
   want it lingering: `git branch -D <head-branch>` (safe once the integration is
   pushed to the remote PR). Leave it if unsure or if the integration was not
   completed.
4. Note in the final summary that the worktree was removed and the user's clone
   was left untouched on whatever branch it was on.

## Exit criteria

- Every conflicting file was presented with both sides and a proposed resolution,
  and every ambiguous/semantic conflict was escalated to the user before being
  resolved.
- Each file was resolved by an explicit user decision and staged, with no
  conflict markers left in any file.
- The integration was completed only after the index was free of unmerged paths
  (for a rebase, this held at every replayed commit); the `verify-ci-checks` gate
  was run and passed (or was not applicable) before the push.
- The branch was pushed naming the branch (and remote) explicitly — an ordinary
  push for the merge path, or a `--force-with-lease` push for a user-approved
  rebase, never a bare push and never a force-push to a protected branch — the
  PR's mergeability was re-checked, and a summary table plus any remaining Skipped
  files were reported.
- All work was done in an isolated git worktree (never by switching the current
  clone's branch), and the worktree was removed at the end — leaving the user's
  clone untouched on whatever branch it was on.
