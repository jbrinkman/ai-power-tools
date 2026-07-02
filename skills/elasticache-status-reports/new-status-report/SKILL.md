---
name: new-status-report
description: Create a new weekly status report. Use when asked to "create status report", "new status report", "weekly report", or "create report". Copies the latest report, renames it with the specified or current date, and updates the H1 title date.
---

Create a new weekly status report by copying the most recent report and updating it with a new date.

## Step 1: Determine the Target Date and Year

1. If the user provides a date in the prompt, use that date. Accept flexible formats (e.g., "March 16", "2026-03-16", "03-16").
2. If no date is provided, use the current date.
3. Format the date as `YYYY-MM-DD` for the filename and title.
4. Determine the year from the target date to identify the correct status reports folder.

## Step 2: Verify GitHub Authentication

1. Run `gh auth status` to verify the user is logged in to GitHub.
2. If the command fails (non-zero exit code), stop and inform the user they need to authenticate first by running `gh auth login`, then tell you to continue.
3. Do not proceed to the next step until authentication is confirmed.

## Step 3: Check for Open Pull Requests

1. Run `gh pr list --state open --author @me` to check for open pull requests authored by the current user.
2. If there are open PRs by the current user, stop and inform the user. List the open PRs and ask them to merge or close them first, then tell you to continue.
3. PRs from other authors should be ignored — they do not block this workflow.
4. Do not proceed to the next step until there are no open PRs by the current user.

## Step 4: Sync with Main Branch

1. Run `git checkout main` to switch to the main branch.
2. Run `git pull` to pull the latest changes.
3. Confirm the checkout and pull were successful before proceeding.

## Step 5: Find the Latest Status Report

1. Look in the `<year>-status-reports/` directory matching the target year first.
2. If no reports exist for the target year, check the previous year's directory.
3. Status report files follow the naming pattern: `elasticache-agentic-status-YYYY-MM-DD.md`
4. Sort files by date and select the most recent one as the template.

## Step 6: Create the New Report

1. Read the contents of the latest status report.
2. Create a new file at: `<year>-status-reports/elasticache-agentic-status-<YYYY-MM-DD>.md` using the target date.
3. Create the year directory if it doesn't exist.

## Step 7: Open the New Report in the Editor

1. Run `kiro <path-to-new-file>` in the terminal to open the newly created file in the editor.

## Step 8: Update the H1 Title Date

1. Find the H1 heading line that matches the pattern:
   `# Amazon ElastiCache - Extended / Improving Vancouver Status Update YYYY-MM-DD`
2. Replace the date in that heading with the new target date in `YYYY-MM-DD` format.
3. Do not modify any other content in the report.

## Step 9: Clean Up Carried-Over Content

After copying and renaming the file, clean up content that should not carry over to the new report:

1. Remove all `**New**` text labels from the file. These markers indicate items that were new in the previous report and should not persist.
2. Remove all strikethrough text (text wrapped in `~~`). This includes the `~~` delimiters and the text between them. For example, `~~03-13-26~~` should be removed entirely, including any trailing whitespace or dash before the next token.
3. For any task line that contains two `<span>` status labels separated by `&rarr;`, remove the first `<span>...</span>` element and the `&rarr;` that follows it, keeping only the second (most recent) status span. For example:
   - Before: `<span class="green">In Progress</span> &rarr; <span class="green">In Review</span>`
   - After: `<span class="green">In Review</span>`
4. Clean up any resulting double spaces or leading/trailing whitespace on affected lines.

## Step 10: Show Diff for Visual Confirmation

1. Run a diff between the source (previous week) report and the newly created report.
2. Display the diff output to the user so they can visually confirm the cleanup changes (removed `**New**` labels, stripped strikethrough text, collapsed double status spans, updated title date).
3. This is an informational step only — no user action is required to proceed.

## Step 11: Create a New Branch and Commit

1. Derive the branch name from the new filename without the `.md` extension (e.g., `elasticache-agentic-status-2026-03-16`).
2. Run `git checkout -b <branch-name>` to create and switch to the new branch.
3. Run `git add` on the new file.
4. Commit with the message: `docs: add status report for <YYYY-MM-DD>`

## Step 12: Push Branch to Remote

1. Ask the user if they want to push the new branch to the remote.
2. If yes, run `git push -u origin <branch-name>`.
3. If no, skip this step.

## Step 13: Confirm

Report to the user:

- The source file that was copied
- The new file path that was created
- The date used for the new report
- The branch name that was created
- The commit that was made
- Whether the branch was pushed to the remote. If it was not pushed, remind the user they will need to push manually later with `git push -u origin <branch-name>`.
