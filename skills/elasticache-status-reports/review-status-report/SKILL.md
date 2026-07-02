---
name: review-status-report
description: >
  Review the latest status report for common issues before submitting a PR.
  Use when asked to "review status report", "check report", "review report",
  "pre-PR review", or "review before submitting".
---

Review the latest status report against the codified review checklist, presenting issues one at a time for the user to address.

## Review Rules

#[[file:review-rules.md]]

## Step 0: Validate Tools

Before starting the review, verify that the GitHub CLI is installed and authenticated.

1. Run `gh auth status` to confirm the GitHub CLI is installed and authenticated.
2. If it fails, stop and ask the user to install (`brew install gh`) and authenticate (`gh auth login`).
3. Do not proceed to Step 1 until authentication is confirmed.

## Step 1: Identify Reports

1. If the user provides a **PR number**, use it to review the report as it was originally submitted:
   - Run `gh pr view <number> --json headRefName,headRefOid` to get the branch and commit SHA.
   - Identify the report file from the PR diff: `gh pr diff <number> --name-only`
   - Read the report at that commit: `git show <sha>:<filepath>`
   - For the previous report, find the file with the next-oldest date and read it from the same commit (it will be unchanged from main): `git show <sha>:<previous-filepath>`
2. If the user specifies a **report file or date**, use that file from the working tree.
3. Otherwise, find the most recent status report by date in the year-based directories (e.g., `2026-status-reports/`). Start with the highest year directory and select the file with the most recent date.
4. Find the previous report (the report with the next-oldest date) for comparison.
5. Read both files in full.

## Step 2: Run Review

Analyze the current report against all rules in the review checklist, using the previous report for continuity checks. Compile an internal list of all findings.

Order findings by severity, then by rule number:
1. All **blocking** issues first
2. Then **suggestion** issues
3. Then **nit** issues

## Step 3: Present Findings One at a Time

For each finding, present:

- **Location**: Section name and/or line content where the issue appears
- **Severity**: blocking, suggestion, or nit
- **Rule**: Which rule from the checklist it violates
- **Finding**: Clear description of the problem
- **Suggestion**: How to fix it (specific corrected text when possible)

Then wait for the user's response:

- **Fix**: Make the correction to the report file, then present the next finding.
- **Skip**: Discard this finding and move to the next.
- **Other instruction**: Follow the user's direction (e.g., update another skill, adjust the review rules, etc.), then continue with the next finding.

Do not present the next finding until the current one is resolved.

## Step 4: Summary

After all findings have been addressed or skipped, provide a brief summary:
- How many issues were found
- How many were fixed vs skipped
- Any patterns worth noting for future reports

## Important Rules

- Present exactly one finding at a time. Never batch multiple findings in a single response.
- Wait for user input between each finding.
- When fixing, make the minimal change needed — do not rewrite surrounding content.
- If no issues are found, say so and congratulate the user on a clean report.
- Do not modify the previous week's report. It is read-only context for comparison.
