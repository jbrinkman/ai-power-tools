---
name: merge-conflict-resolver
description: Resolve merge conflicts on a GitHub pull request's branch, one conflicting file at a time, with the user in the loop. Use when a PR cannot merge because its branch has conflicts with the base, or when asked to "resolve the merge conflicts", "fix the conflicts", "rebase/merge the base branch", or "update the branch" on a PR. Merges the base branch into the PR head, and for each conflicting file presents the two sides and a proposed resolution; asks the user for clarification whenever a conflict's correct resolution is ambiguous. On approval it stages the resolved file, and once all files are resolved it completes the merge, runs the project's CI gate locally, and pushes the branch. Companion to pr-comment-resolver.
---

<!--
Companion to the pr-comment-resolver and code-review skills. Reuses the same
gh / git conventions for identifying a PR, checking out its branch, running the
verify-ci-checks push gate, and pushing (same-repo vs fork) safely.
-->

# Resolve Merge Conflicts

Resolve the merge conflicts on a GitHub pull request's branch by merging the
base branch into the PR head and working through each conflicting file one at a
time, with the user in the loop. This is a companion to `pr-comment-resolver`:
that skill addresses review comments; this one gets a conflicted branch
mergeable again.

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

## Step 3: Decide the integration strategy — merge, not rebase

Default to **merging the base branch into the PR head** (`git merge`), not
rebasing. A merge adds one new merge commit on top of the existing, already-pushed
PR history; it never rewrites commits that are already on the remote, so the push
in Step 7 is an ordinary fast-forwardable push with no force. A rebase rewrites
the branch's commits and would require a force-push, which is blocked by policy
on protected branches and is risky on any branch others may have pulled.

Only rebase if the user **explicitly** asks for a rebase and understands it
rewrites history and needs a force-push to the (non-protected) feature branch. If
so, confirm the branch is not protected and that the user accepts the force-push
before proceeding. Otherwise, use merge. Do not switch strategies silently.

## Step 4: Check out the PR branch and start the merge

1. Run `git status --porcelain` first. If the working tree is not clean, stop and
   ask the user how to handle the uncommitted changes — do not stash or discard
   without direction, and do not check out over them.
2. Check out the PR's head branch: `gh pr checkout <pr_number> --repo OWNER/REPO`.
3. Fetch the latest base branch so the merge is against current state:
   `git fetch origin <baseRefName>`.
4. Start the merge **without auto-committing**, so you control the resolution and
   the final commit:

   ```bash
   git merge --no-commit --no-ff origin/<baseRefName>
   ```

   - If this prints `Already up to date.` or exits with no conflicts and a clean
     merge, there is nothing to resolve — abort any in-progress state with
     `git merge --abort` if needed, tell the user the branch merges cleanly, and
     stop.
   - If it reports conflicts, continue to Step 5. Do **not** run
     `git merge --continue` or commit yet.

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
   and the merge cannot be completed while any path is unmerged. Stage the
   specific file, not `git add .`.
3. Re-check `git diff --name-only --diff-filter=U` to confirm this file dropped
   out of the unmerged set.

Move to the next file only after the current one is resolved and staged (or the
user explicitly Skipped it).

## Step 7: Complete the merge, gate, and push

Only once **every** conflicting file is resolved and staged (no Skipped files
remain):

1. **Confirm the index is clean of conflicts**:
   `git diff --name-only --diff-filter=U` must print nothing. If anything
   remains, go back to Step 6 for those files — do not proceed.
2. **Complete the merge commit**:

   ```bash
   git commit --no-edit
   ```

   Use the default merge message. Respect the repo's signing config; add
   `--no-gpg-sign` only if gpg is unavailable on this machine. (For a
   user-approved rebase instead of a merge, use `git rebase --continue` here, and
   expect to repeat Step 6 for each replayed commit that conflicts.)
3. **Gate on CI checks before pushing.** Invoke the `verify-ci-checks` skill to
   discover and run the project's CI build checks locally against the merged
   tree. A merge can compile cleanly yet still break tests when two
   independently-correct changes interact — the gate catches that before the
   branch leaves the machine.
   - **Gate PASS** — proceed to push.
   - **Gate FAIL** — do **not** push. The failing checks are a sign the merge
     resolution is wrong or incomplete. Fix the resolution (amend the merge
     commit or add a follow-up commit), re-run the gate, and repeat until it
     passes. If the same check keeps failing after a few focused attempts, stop
     and surface it to the user rather than thrashing.
   - **NOT APPLICABLE** — the project exposes no discoverable checks; note that
     and proceed to push.
4. **Push** to the PR's head branch. Which remote is correct depends on where the
   PR comes from (`isCrossRepository` from Step 2):
   - **Same-repo PR**: push naming the branch explicitly —
     `git push origin <head-branch>`.
   - **Fork PR** (`isCrossRepository` is `true`): `origin` points at the base
     repo, so pushing there is wrong. `gh pr checkout` configures the local
     branch to track the fork — find it with
     `git rev-parse --abbrev-ref --symbolic-full-name @{u}` (e.g. `fork/branch`)
     and run `git push <head-remote> <head-branch>`. This needs the fork's "Allow
     edits from maintainers"; if the push is rejected for permissions, stop and
     tell the user rather than forcing it.

   In all cases name the branch (and remote) explicitly — a bare `git push`, and
   any force-push to a protected branch, are blocked by policy. The merge path in
   this skill never needs a force-push; only a user-approved rebase does, and
   then only to a non-protected feature branch.

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

3. Report the final state: the merge commit SHA (`git rev-parse HEAD`), the gate
   verdict, that the branch was pushed, and the PR's recomputed mergeability.
4. List any file left **Skipped** — the merge was NOT completed if any remain, so
   say so explicitly and recommend re-running the skill to finish them.

## Exit criteria

- Every conflicting file was presented with both sides and a proposed resolution,
  and every ambiguous/semantic conflict was escalated to the user before being
  resolved.
- Each file was resolved by an explicit user decision and staged, with no
  conflict markers left in any file.
- The merge was completed only after the index was free of unmerged paths; the
  `verify-ci-checks` gate was run and passed (or was not applicable) before the
  push.
- The branch was pushed naming the branch explicitly (no bare or force push to a
  protected branch), the PR's mergeability was re-checked, and a summary table
  plus any remaining Skipped files were reported.
