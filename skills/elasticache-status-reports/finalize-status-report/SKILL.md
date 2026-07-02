---
name: finalize-status-report
description: >
  Finalize and submit the latest status report. Commits all outstanding changes,
  pushes the branch, and creates a pull request using the report's H1 title.
  Use when asked to "finalize report", "submit status report", "push status report",
  "create PR for report", or "finalize status".
---

Commit all outstanding changes to the latest status report, push the branch to the remote, and create a pull request using the H1 heading from the report as the PR title.

## Step 1: Identify the Target Report

1. If the user specifies a report file, use that file.
2. Otherwise, find the most recent report by looking in the year-based directories (e.g., `2026-status-reports/`, `2025-status-reports/`). Start with the highest year directory and find the most recent file by date.
3. Confirm the file exists and note its path.

## Step 2: Check for Uncommitted Changes

1. Run `git status` to check for uncommitted changes.
2. If there are no uncommitted changes and the branch is already pushed, skip to Step 5 (create PR) if no PR exists yet, or inform the user everything is already up to date.
3. If there are uncommitted changes, proceed to Step 3.

## Step 3: Commit Changes

1. Stage the status report file: `git add <path-to-report>`.
2. Also stage any other modified files that are part of this report workflow (e.g., skill files in `.kiro/`).
3. Determine the report date from the filename (pattern: `elasticache-agentic-status-YYYY-MM-DD.md`).
4. Commit with the message: `docs: add status report for <YYYY-MM-DD>`
5. If GPG signing fails, retry with `--no-gpg-sign`.

## Step 4: Push to Remote

1. If the branch has no upstream tracking, push with: `git push -u origin <branch-name>`
2. If the branch already has upstream tracking, push with: `git push`
3. Confirm the push was successful.

## Step 5: Extract PR Title

1. Read the status report file.
2. Find the H1 heading line matching the pattern:
   `# Amazon ElastiCache - Extended / Improving Vancouver Status Update YYYY-MM-DD`
3. Use the text after `# ` (without the `#` and leading space) as the PR title.

## Step 6: Create Pull Request

1. Check if a PR already exists for this branch: `gh pr list --head <branch-name>`
2. If a PR already exists, inform the user and provide the PR URL. Do not create a duplicate.
3. If no PR exists, create one:
   ```
   gh pr create --title "<H1 title text>" --body "Weekly status report for <YYYY-MM-DD>." --base main
   ```
4. Report the PR URL to the user.

## Step 7: Confirm

Report to the user:
- The report file that was committed
- The commit message used
- The branch name
- Whether the push was successful
- The PR URL and title

## Important Rules

- Never force push. Use regular `git push` only.
- If GPG signing fails, use `--no-gpg-sign` as a fallback.
- If a PR already exists for the branch, do not create a duplicate — just report the existing one.
- The PR title must exactly match the H1 heading text from the report (without the `# ` prefix).
- The PR body should be concise: "Weekly status report for YYYY-MM-DD."
