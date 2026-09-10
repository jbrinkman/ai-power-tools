# Review Status PR Skill

This skill reviews pull requests in the Submitted and Merged tables of status reports, checking their current status on GitHub and moving them to appropriate tables based on their state.

## Usage

Trigger this skill by asking:
- "review pr status"
- "check submitted prs"
- "update pr statuses"
- "review merged prs"
- "check for releases"

You can optionally specify a date for a specific report:
- "review pr status for 2026-08-03"

## What It Does

### Phase 1: Review Submitted PRs

1. Extracts all PRs from the `## Submitted Projects` table
2. Checks the status of each PR on GitHub using `gh api` (open/merged/closed)
3. Highlights PRs that have been merged or closed
4. For each changed PR, asks the user:
   - Move to **Merged** table (for successfully merged PRs)
   - Move to **Dropped** table (for closed/rejected PRs)
   - **Skip** (leave in Submitted if still being worked on)
5. Updates the status report with the changes, marking moved items as `**New**`

### Phase 2: Review Merged PRs

1. Extracts all PRs from the `## Merged Projects` table
2. Checks if each merged PR has been included in any releases using `gh api`
3. For PRs found in releases, asks the user to confirm moving to **Completed**
4. Updates the status report, moving released PRs to the Completed table with release links

## Commands Used

### Check PR Status
```bash
gh api repos/{owner}/{repo}/pulls/{pr_number} --jq '{state: .state, merged: (.merged // false), closed_at: .closed_at, merged_at: .merged_at}'
```

### Check for Releases
```bash
gh api repos/{owner}/{repo}/releases --paginate --jq '[.[] | select(.published_at >= "{merged_at}") | {tag_name, name, published_at, html_url}] | sort_by(.published_at) | reverse'
```

## Requirements

- GitHub CLI (`gh`) must be installed and authenticated
- No additional dependencies needed!

## Examples

### Example 1: Review Latest Report

```
User: review pr status
Assistant: [Checks latest status report, presents summary of all Submitted PRs and their statuses]
```

### Example 2: Review Specific Report

```
User: check submitted prs for 2026-07-27
Assistant: [Checks status report for 2026-07-27]
```

### Example 3: Interactive Review

```
Assistant: Found 3 PRs with status changes:

| Project | PR Link | Status | Changed |
|---------|---------|--------|---------|
| Spring AI | PR 5471 | merged | ✅ |
| CrewAI | PR 5700 | closed | ✅ |
| SGLang | PR 16823 | open | - |

Reviewing Spring AI - PR 5471 (merged)
Should this project be moved to Merged, Dropped, or Skipped?

User: merged
```