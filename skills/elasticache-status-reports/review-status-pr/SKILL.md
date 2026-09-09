---
name: review-status-pr
description: >
  Review PRs in Submitted and Merged tables of status reports. Check PR statuses,
  move closed/merged PRs to appropriate tables, and promote merged PRs that have
  been released to Completed. Use when asked to "review pr status", "check submitted prs",
  "update pr statuses", "review merged prs", or "check for releases".
---

Review each PR in the Submitted and Merged tables of a status report, checking their current status on GitHub and moving them to appropriate tables based on their state.

## Step 1: Validate GitHub CLI

Before starting, verify that the GitHub CLI is installed and authenticated.

1. Run `gh auth status` to confirm the GitHub CLI is installed and authenticated.
2. If it fails, stop and ask the user to install (`brew install gh`) and authenticate (`gh auth login`).
3. Do not proceed until authentication is confirmed.

## Step 2: Identify the Status Report

1. If the user provides a **specific date** (e.g., "2026-08-03"), find that report file.
2. Otherwise, find the **most recent** status report by date in the year-based directories (e.g., `2026-status-reports/`).
3. Start with the current year directory and select the file with the most recent date.
4. Read the file in full.

## Step 3: Extract Submitted Projects Table

1. Locate the `## Submitted Projects` section in the report.
2. Extract the markdown table that follows it.
3. Parse each row to extract:
   - Project name
   - Pull request link(s) - may be multiple PRs separated by commas
   - Current status (if any)
4. For each PR link, extract the repository owner, repo name, and PR number using regex pattern: `https://github.com/([^/]+)/([^/]+)/pull/(\d+)`

## Step 4: Check Submitted PR Statuses

For each project in the Submitted table:

1. For each PR link, run:
   ```bash
   gh api repos/{owner}/{repo}/pulls/{pr_number} --jq '{state: .state, merged: (.merged // false), closed_at: .closed_at, merged_at: .merged_at}'
   ```
2. Parse the JSON output to determine:
   - `state`: "open" or "closed"
   - `merged`: true or false
   - If `merged` is true, treat state as "merged"
3. **If a PR is closed but NOT merged**, fetch the PR comments to determine the real outcome:
   ```bash
   gh api repos/{owner}/{repo}/issues/{pr_number}/comments --jq '[.[-5:][]] | .[] | {user: .user.login, created_at: .created_at, body: .body}'
   ```
   Analyze the last ~5 comments looking for:
   - **Superseded/rebased**: Comments indicating the PR was continued in another PR (e.g., "rebased as #XXXX", "continued in #XXXX", "opened #XXXX instead"). If a successor PR is referenced, check its status too.
   - **Merged via another PR**: Comments indicating the content was merged through a different PR (e.g., "merged in #XXXX", "duplicated and merged in #XXXX"). This means the work was accepted despite the original PR being closed.
   - **Rejected/won't merge**: Comments from maintainers indicating the contribution is not wanted (e.g., "we won't accept this", "closing as wont-fix", "not aligned with project direction").
   - **No relevant context**: If comments don't clarify, treat as ambiguous and flag for user review.

4. Based on comment analysis, classify each closed PR as one of:
   - **closed-merged-elsewhere**: The content was merged via a different PR (present as "merged via [successor PR link]")
   - **closed-superseded**: The PR was rebased/continued in a new PR that is still open (present as "superseded by [successor PR link]")
   - **closed-rejected**: Maintainers explicitly rejected the contribution
   - **closed-ambiguous**: No clear signal in comments; needs user judgment

5. If a successor PR is found, check its status and include that information when presenting to the user.
6. Collect all PR statuses for each project.

## Step 5: Present Submitted PRs Summary

Present a summary table showing:

| Project | PR Link | Status | Changed |
|---------|---------|--------|---------|
| Project Name | [PR 123](url) | open/merged/closed (context) | ✅ / - |

**Highlighting criteria:**
- Mark with ✅ if the PR status is `merged` or `closed` (these need user review)
- Mark with `-` if the PR status is still `open` (no action needed)

For closed PRs, include a brief context note from comment analysis:
- "closed — merged via #XXXX"
- "closed — superseded by #XXXX (open/merged)"
- "closed — rejected by maintainer"
- "closed — reason unclear"

## Step 6: Review Changed Submitted PRs

For each project with PRs that are `merged` or `closed`:

1. Present the project details:
   - **Project name**
   - **PR link(s) and their status**
   - **Status changed to**: merged, closed-merged-elsewhere, closed-superseded, closed-rejected, or closed-ambiguous
   - **Context from comments**: Quote or summarize the relevant comment(s) explaining why the PR was closed
   - **Successor PR** (if any): Link and current status
2. Based on the classification, suggest an action:
   - **merged** or **closed-merged-elsewhere**: Suggest moving to **Merged** (update PR link to successor if applicable)
   - **closed-superseded** (successor still open): Suggest updating the PR link in the Submitted table to point to the successor PR
   - **closed-superseded** (successor merged): Suggest moving to **Merged** with successor PR link
   - **closed-rejected**: Suggest moving to **Dropped**
   - **closed-ambiguous**: Present context and ask user to decide
3. Ask the user: "Should this project be moved to **Merged**, **Dropped**, **Updated** (update PR link), or **Skipped** (leave unchanged)?"
4. Based on the user's response:
   - **Merged**: Move the row to the `## Merged Projects` table, add `**New**` label to the project name. If a successor PR was merged, update the PR link to the successor.
   - **Dropped**: Move the row to the `## Dropped Projects` table with a reason column (ask user for reason), add `**New**` label to the project name
   - **Updated**: Update the PR link in the Submitted table to point to the successor PR
   - **Skipped**: Leave the row in the Submitted table unchanged
5. Continue until all changed PRs have been reviewed.

## Step 7: Update Status Report (Submitted Changes)

For each project that was moved or updated:

1. **Moved to Merged**: Remove the row from `## Submitted Projects` and add to `## Merged Projects`.
   - Format as `| **New** Project Name | [PR link](url) |`
   - If a successor PR was identified, use the successor's PR link.
2. **Moved to Dropped**: Remove the row from `## Submitted Projects` and add to `## Dropped Projects`.
   - Format as `| **New** Project Name | <user-provided reason> |`
3. **Updated PR link**: Modify the row in `## Submitted Projects` to point to the successor PR.
   - Replace the old PR link with the new one (e.g., `[PR 11196](https://github.com/mudler/LocalAI/pull/11196)`)
4. Write the updated content back to the status report file.

## Step 8: Extract Merged Projects Table

1. Locate the `## Merged Projects` section in the report (with any updates from Step 7).
2. Extract the markdown table that follows it.
3. Parse each row to extract:
   - Project name (strip `**New**` if present)
   - Pull request link(s)
   - Merged date (from the PR link if available)
4. For each PR link, extract the repository owner, repo name, and PR number.

## Step 9: Check for Releases

For each project in the Merged table:

1. For each PR, first get the merge information:
   ```bash
   gh api repos/{owner}/{repo}/pulls/{pr_number} --jq '{merged: (.merged // false), merged_at: .merged_at, merge_commit_sha: .merge_commit_sha}'
   ```
2. If the PR is not merged, skip it.
3. Get all releases published after the merge date (oldest first):
   ```bash
   gh api repos/{owner}/{repo}/releases --paginate --jq '[.[] | select(.published_at >= "{merged_at}") | {tag_name, name, published_at, html_url, body}] | sort_by(.published_at)'
   ```
4. For each release (starting from the oldest), check the release body for a reference to the PR number (e.g., `#11196`, `PR 11196`, or a link containing `/pull/11196`). The **first release whose body mentions the PR** is the one that includes it.
5. If no release body mentions the PR, fall back to fetching the release page HTML to check for PR references:
   ```bash
   web_fetch the release html_url and search for the PR number
   ```
6. If a release is confirmed to include the PR, record it as the **including release**. Do not default to the latest release — the correct version is the one whose changelog explicitly references the PR.
7. If no release mentions the PR in its notes but releases exist after the merge date, present this to the user as "releases found but PR not confirmed in changelog" and ask them to verify manually.

## Step 10: Present Released Projects

For each project with a confirmed including release:

1. Present the project details:
   - **Project name**
   - **PR link(s)**
   - **Included in release**: The specific release whose changelog references the PR (tag name and URL)
   - **Verification**: Quote or summarize how the PR is referenced in the release notes (e.g., "Listed as new backend `valkey-store`" or "Referenced as #11196 in changelog")
2. Notify the user: "This PR is confirmed in release [version]. Should it be moved to **Completed**?"
3. Wait for user confirmation (yes/no).
4. If yes: Move the project to the `## Completed Projects` table.
5. If no: Skip this project.

For projects where releases exist but the PR is not confirmed in any changelog:

1. Present the project details with the caveat that the PR was not found in release notes.
2. Ask the user whether to move it anyway or skip.

## Step 11: Update Status Report (Merged to Completed)

For each project that was moved to Completed:

1. Remove the row from the `## Merged Projects` table.
2. Add the row to the `## Completed Projects` table.
3. Format as: `| **New** Project Name | [version tag](release_url) |`
4. Use the **confirmed including release** (the first release whose changelog references the PR) for the version tag and link. Do not use the latest release unless it is the one that includes the PR.
5. Write the updated content back to the status report file.

## Step 12: Extract Infrastructure Section

1. Locate the `### Infrastructure` section in the report.
2. Extract each bullet point item that contains a PR link.
3. Parse each item to extract:
   - Issue number and link (e.g., `#45229`)
   - Issue description
   - PR number and link (e.g., `PR 46950`)
   - Current status label (the text inside `<span class="...">...</span>` tags)
   - Any additional labels (e.g., "Issuer Raised PR")
4. For each PR link, extract the repository owner, repo name, and PR number using regex pattern: `https://github.com/([^/]+)/([^/]+)/pull/(\d+)`
5. Skip items that do not have a PR link (e.g., items marked "Addressed as not a bug").

## Step 12b: Clean Up Previously Merged/Closed Infrastructure Items

Before checking PR statuses, remove any Infrastructure items that were already resolved in the previous report. Because the new report is copied from the previous week's file, an item that flipped to Merged/Closed last week arrives in this week's file already carrying that label.

1. Scan the Infrastructure items extracted in Step 12 for any whose current status label is `<span class="green">Merged</span>` or `<span class="red">Closed</span>`.
2. These represent PRs that were already merged/closed in a prior reporting period and have had their week of visibility. Remove each of these bullet-point lines from the `### Infrastructure` section entirely.
3. Present the list of removed items to the user for confirmation, then write the updated content back to the status report file.
4. Do not run status checks on these removed items in the following steps — they are done.

**Note:** Items newly relabeled Merged/Closed *during this review* (Step 15) are NOT removed this week; they stay so readers see the change, and next week's Step 12b removes them.

## Step 13: Check Infrastructure PR Statuses

For each Infrastructure PR:

1. Run:
   ```bash
   gh api repos/{owner}/{repo}/pulls/{pr_number} --jq '{state: .state, merged: (.merged // false), closed_at: .closed_at, merged_at: .merged_at}'
   ```
2. Determine the actual status:
   - If `merged` is true: PR has been merged
   - If `state` is "open": PR is still open (no change needed unless label is wrong)
   - If `state` is "closed" and `merged` is false: PR was closed without merge
3. **If a PR is closed but NOT merged**, fetch the last ~5 PR comments (same as Step 4) to determine if it was superseded or rejected.
4. Compare the actual status against the current label in the report:
   - "Awaiting Merge" → should still be open
   - "In Progress" → should still be open
   - If PR is merged but label says "Awaiting Merge" → status changed
   - If PR is closed without merge → status changed

## Step 14: Present Infrastructure PRs Summary

Present a summary table showing:

| Issue | PR | Current Label | Actual Status | Changed |
|-------|-----|---------------|---------------|---------|
| #45229 | PR 46950 | Awaiting Merge | open/merged/closed | ✅ / - |

**Highlighting criteria:**
- Mark with ✅ if the actual PR status no longer matches the current label
- Mark with `-` if no change is needed

## Step 15: Review Changed Infrastructure PRs

For each Infrastructure PR where the status has changed:

1. Present the item details:
   - **Issue number and description**
   - **PR link and actual status**
   - **Current label** vs **actual status**
   - **Context from comments** (if closed without merge)
2. Based on the actual status, suggest a new label:
   - PR merged → suggest `<span class="green">Merged</span>`, add a `**New**` label to the item (it changed this reporting period), and **keep the item in the report** so readers can see the change this week. Do not remove it this week; it will be cleaned up next week (see Step 12b).
   - PR closed/rejected → suggest `<span class="red">Closed</span>`, add a `**New**` label, and keep the item in the report this week (also cleaned up next week per Step 12b).
   - PR superseded → suggest updating the PR link and keeping the current label
3. Ask the user what action to take:
   - **Update label**: Change the status span to the new label
   - **Update PR link**: Replace the PR link with a successor PR
   - **Skip**: Leave unchanged

## Step 16: Update Status Report (Infrastructure Changes)

For each Infrastructure item that was changed:

1. **Update label**: Replace the `<span class="...">...</span>` tag with the new status label (e.g., `Merged` or `Closed`), keeping the item in the report.
2. **Update PR link**: Replace the old PR link text and URL with the successor.
3. Write the updated content back to the status report file.

Note: Removal of resolved items happens in Step 12b (cleanup of items already merged/closed in a prior week), not here.

## Step 17: Summary

Provide a final summary:

- **Submitted PRs reviewed**: X total, Y moved to Merged, Z moved to Dropped, W skipped
- **Merged PRs reviewed**: X total, Y moved to Completed, Z still in Merged
- **Infrastructure PRs reviewed**: X total, Y relabeled (Merged/Closed, kept in report), Z removed as prior-week cleanup (Step 12b), W skipped
- **Status report updated**: path to the file

## Important Rules

- Always use the GitHub CLI (`gh api`) to check PR status. Never guess or assume.
- When moving rows between tables, preserve the original row content except for adding `**New**` labels.
- For projects with multiple PRs, check all PRs and aggregate their statuses.
- If a project has mixed PR statuses (some open, some merged), ask the user how to handle it.
- Always wait for user confirmation before moving projects between tables.
- If `gh api` commands fail or return errors, report the error to the user and ask how to proceed.
- Preserve all other content in the status report unchanged (formatting, other sections, etc.).
- For release checking, use the heuristic that if a release was published after the merge date, the PR is likely included.