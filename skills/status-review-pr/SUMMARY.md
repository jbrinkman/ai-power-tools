# Skill Creation Summary: review-status-pr

## Overview

Created a new skill `review-status-pr` that automates the review and management of pull requests in status reports using the GitHub CLI directly.

## What It Does

The skill performs two main functions:

### 1. Review Submitted PRs
- Extracts PRs from the `## Submitted Projects` table
- Checks their status on GitHub using `gh api` (open/merged/closed)
- Interactively asks the user to:
  - Move merged PRs to the **Merged** table
  - Move closed/rejected PRs to the **Dropped** table
  - Skip PRs that should remain in Submitted
- Updates the status report, marking moved items with `**New**` labels

### 2. Review Merged PRs
- Extracts PRs from the `## Merged Projects` table
- Checks if they've been included in any releases using `gh api`
- Asks the user to confirm moving released PRs to **Completed**
- Updates the status report with release links

## Files Created

```
.kiro/skills/review-status-pr/
├── SKILL.md                        (main skill instructions)
├── README.md                       (documentation)
└── SUMMARY.md                      (this file)
```

## Trigger Phrases

The skill activates when you say:
- "review pr status"
- "check submitted prs"
- "update pr statuses"
- "review merged prs"
- "check for releases"

## Requirements

- GitHub CLI (`gh`) installed and authenticated
- No additional dependencies!

## GitHub CLI Commands Used

### Check PR Status
```bash
gh api repos/{owner}/{repo}/pulls/{pr_number} --jq '{state: .state, merged: (.merged // false), closed_at: .closed_at, merged_at: .merged_at}'
```

### Check for Releases
```bash
gh api repos/{owner}/{repo}/releases --paginate --jq '[.[] | select(.published_at >= "{merged_at}") | {tag_name, name, published_at, html_url}] | sort_by(.published_at) | reverse'
```

## Design Decision: Why No Python Scripts?

Initially designed with Python scripts, the skill was refactored to use `gh api` directly because:
- ✅ **Simpler**: No additional dependencies (no `uv`, no Python packages)
- ✅ **More direct**: GitHub CLI is already available and authenticated
- ✅ **Easier to maintain**: Fewer files, less abstraction
- ✅ **More transparent**: Commands are visible in the skill instructions

## Next Steps

To use the skill:

1. Ensure `gh` is authenticated: `gh auth status`
2. Invoke the skill: "review pr status"
3. Follow the interactive prompts to manage PRs

## Compliance with Agent Skills Specification

✅ Frontmatter properly formatted with name and description
✅ SKILL.md under 500 lines
✅ Written in imperative voice
✅ Clear numbered steps (Steps 1-12)
✅ Directory name matches skill name
✅ No unnecessary complexity or abstractions
✅ Documentation includes examples and usage patterns
✅ Uses existing tools (gh CLI) rather than introducing new dependencies

## Status

**✅ COMPLETE** - Skill is ready to use!