---
name: customer-report-review
description: Multi-phase review of customer status report PRs with interactive findings management. Use when reviewing pull requests in the Bit-Quill/customer-reports repository.
---

# Customer Report PR Review

Comprehensive multi-phase review system for customer status report pull requests in the Bit-Quill/customer-reports repository.

## When to Use This Skill

Use this skill when:
- Asked to "review customer report PR"
- Asked to "review status report"
- Asked to "check customer report"
- Given a PR number/URL from the customer-reports repository
- Asked to validate a weekly status report

## Workflow Overview

This skill performs a structured 4-phase review process:

1. **Guidelines Review** - Validate compliance with report format and style guidelines
2. **Language & Spelling Review** - Check for spelling, grammar, and consistent terminology
3. **Date Validation Review** - Verify due dates, completion dates, and estimates
4. **Historical Review** - Compare against previous weeks to identify recurring issues

After all phases complete, findings are:
- Deduplicated to remove redundant issues
- Presented one-by-one for user decision (Post/Fix/Skip)
- Submitted as a GitHub PR Review with file/line references

## Prerequisites

- `gh` CLI must be installed and authenticated
- Repository: `Bit-Quill/customer-reports`
- User must provide PR number or URL

## Instructions

### Phase 0: Setup and Validation

1. Extract the PR number from user input (accept PR number or full URL)
2. Set the repository: `Bit-Quill/customer-reports`
3. Use `gh pr view <number> --repo Bit-Quill/customer-reports --json` to fetch PR details:
   - Files changed
   - PR author
   - Current user (for self-review detection)
   - PR state

4. Fetch the content of all markdown files in the PR using:
   ```bash
   gh pr diff <number> --repo Bit-Quill/customer-reports
   ```

5. For each markdown file in the PR, fetch the full content using:
   ```bash
   gh api repos/Bit-Quill/customer-reports/contents/<file_path> \
     --jq '.content' | base64 -d
   ```

### Phase 1: Guidelines Review

Load criteria from: `resources/guidelines-review.md`

For each criterion in the guidelines review:
- Scan the report content
- Record findings with:
  - File path
  - Line number (or range)
  - Issue description
  - Severity (error/warning/info)
  - Suggested fix (if applicable)

**Important Exclusions:**
- **Pending Spans**: Content wrapped in `<span class="pending">...</span>` is intentionally incomplete while the author waits for updates. Do NOT flag placeholder text, "TBD", incomplete links, or similar content within pending spans as issues. The pending span itself is the status indicator that this content is being tracked.

### Phase 2: Language & Spelling Review

Load criteria from: `resources/language-spelling-review.md`

For each criterion:
- Check spelling and grammar
- Validate consistent capitalization of:
  - Project names
  - Company names
  - Technical terms
- Verify professional tone
- Record findings with same structure as Phase 1

### Phase 3: Date Validation Review

Load criteria from: `resources/date-validation-review.md`

For each date-related element:
- Extract dates from status items
- Compare against current date (use the current system date)
- Verify "In Progress" items have estimated dates
- Check for overdue items marked as "On Track"
- Record findings with same structure

### Phase 4: Historical Review

Load criteria from: `resources/historical-review.md`

1. Extract the project identifier from the current PR's file path:
   - Pattern: `<project-folder>/<year>-status-reports/<report-filename>.md`
   - Example: `amazon-elasticache-agentic/2026-status-reports/elasticache-agentic-status-2026-07-27.md`
   - Project identifier: `amazon-elasticache-agentic`
   
   **Note:** Use the complete folder name (everything before the first `/`). Do not include the year-specific status-reports subfolder.

2. Fetch previous 3 reports for this specific project:
   ```bash
   # Extract project folder from current PR file path
   PROJECT_FOLDER="amazon-elasticache-agentic"  # example - extract from actual file path
   
   # Get last 50 merged PRs (ordered by creation, newest first by default)
   # Filter to this project's status reports only
   # Take first 3 matches (most recently created reports for this project)
   gh pr list --repo Bit-Quill/customer-reports \
     --state merged \
     --limit 50 \
     --json number,title,files \
     --jq "[.[] | select(.files[].path | startswith(\"${PROJECT_FOLDER}/\")) | select(.files[].path | contains(\"-status-reports/\"))] | .[0:3] | .[] | .number"
   ```
   
   **Why this approach:**
   - Works across year boundaries (e.g., Dec 2026 → Jan 2027)
   - Focuses only on the specific project being reviewed
   - Uses creation time (PR number order) not merge time, since reports represent their creation date
   - Limit of 50 ensures we capture enough PRs even with dozens of weekly submissions

3. For each of the 3 identified PRs:
   - Fetch review comments using:
     ```bash
     gh api repos/Bit-Quill/customer-reports/pulls/<number>/reviews
     gh api repos/Bit-Quill/customer-reports/pulls/<number>/comments
     ```
   - Extract comment threads and resolutions

4. Analyze current PR for:
   - Previously identified issues that haven't been addressed
   - Recurring patterns in feedback
   - Improvements made based on previous feedback
   - **Week-over-week continuity issues:**
     - Items that dropped from Risks section without explanation
     - Items marked "In Progress" for 3+ weeks with no visible movement
     - New scope/commitments added without marking as new
     - Data/metrics that changed unexpectedly (e.g., 0→1 without new items)

5. Record findings for unresolved or recurring issues

### Phase 5: Deduplication

**Step 1: Fetch existing PR comments**

Before deduplicating internal findings, fetch all existing review comments already posted on the current PR:

```bash
gh api repos/Bit-Quill/customer-reports/pulls/<number>/comments \
  --jq '.[] | {user: .user.login, body: .body, path: .path, line: .line}'
```

Also fetch review bodies:

```bash
gh api repos/Bit-Quill/customer-reports/pulls/<number>/reviews \
  --jq '.[] | {user: .user.login, body: .body, state: .state}'
```

**Step 2: Deduplicate against existing comments**

For each finding from phases 1-4, check if a semantically similar comment already exists on the PR:
- Compare the finding's issue description against existing comment bodies
- Match on: same file + same/adjacent line + similar concern (even if worded differently)
- If an existing comment covers the same issue, **drop the finding** — do not post a duplicate
- Log dropped findings as "Already covered by existing comment from [user]"

**Step 3: Deduplicate internal findings**

1. Collect remaining findings from phases 1-4 (after removing those covered by existing comments)
2. Group findings by:
   - File and line number
   - Similar issue descriptions (use semantic similarity)
3. For duplicates, keep the most specific/detailed finding
4. Sort findings by:
   - File path (alphabetically)
   - Line number (ascending)
   - Severity (error > warning > info)

### Phase 6: Interactive Review

**Before presenting findings**, compute exact line numbers using the `find_lines.py` script:

```bash
python3 /Users/jbrinkman/.kiro/skills/customer-report-review/scripts/find_lines.py <local-report-file> "<exact text from finding>"
```

This eliminates manual line counting errors. The script reports the 1-indexed line number, or flags zero/multiple matches (narrow the search string if ambiguous). Always run this against the actual file content at the PR head, not the diff patch.

For each finding in the deduplicated list:

1. Present the finding to the user with:
   ```
   Finding #X of Y
   File: <file_path>
   Line: <line_number>
   Severity: <severity>
   
   Issue: <description>
   
   Suggested Fix: <fix>
   
   [P]ost | [S]kip | [E]dit
   ```

2. Wait for user decision:
   - **Post**: Mark for submission to GitHub
   - **Skip**: Discard this finding
   - **Edit**: Accept user's edited text, re-present the updated finding

3. Continue until all findings are processed

### Phase 7: Submit Review

1. Ask user for review decision:
   ```
   Ready to submit X findings to PR #<number>
   
   Review action:
   - [A]pprove - Approve the PR
   - [R]equest Changes - Request changes before approval
   - [C]omment - Comment only (use if reviewing your own PR)
   
   Choice:
   ```

2. If reviewing own PR (current user == PR author):
   - Force submission as "COMMENT"
   - Inform user that self-reviews must use COMMENT mode

3. Generate review summary body:

   Create a comprehensive summary based on the findings being posted:
   
   ```markdown
   ## Customer Report Review - <Report Date>
   
   [For APPROVE only: :shipit:]
   
   Completed multi-phase review covering:
   - ✅ Guidelines compliance (structure, status indicators, sections)
   - ✅ Language & spelling consistency
   - ✅ Date validation (overdue detection, ETA analysis)
   - ✅ Historical comparison (vs previous 3 weeks)
   
   ### Summary
   - **Total findings:** <X>
   - **Errors:** <count> (must fix)
   - **Warnings:** <count> (should fix)
   - **Info:** <count> (suggestions)
   
   ### Key Issues
   [For each ERROR and WARNING finding, include a one-line summary:]
   - ❌ **<category>**: <brief issue description> (line <X>)
   - ⚠️ **<category>**: <brief issue description> (line <X>)
   
   [If only INFO findings:]
   - 💡 Minor suggestions noted below
   
   [If APPROVE:]
   No blocking issues found. See line comments for details.
   
   [If REQUEST_CHANGES:]
   Please address the issues noted above before merging.
   
   [If COMMENT on self-review:]
   Self-review completed. Address feedback before requesting team review.
   ```
   
   **Example for APPROVE:**
   ```markdown
   ## Customer Report Review - 2026-07-20
   
   :shipit:
   
   Completed multi-phase review covering:
   - ✅ Guidelines compliance (structure, status indicators, sections)
   - ✅ Language & spelling consistency
   - ✅ Date validation (overdue detection, ETA analysis)
   - ✅ Historical comparison (vs previous 3 weeks)
   
   ### Summary
   - **Total findings:** 2
   - **Errors:** 0
   - **Warnings:** 1
   - **Info:** 1
   
   ### Key Issues
   - ⚠️ **Guidelines**: Missing 'Summary' section header (line 26)
   - 💡 **Language**: Consider omitting 'Insights' section when empty (line 179)
   
   No blocking issues found. Addressed prior feedback on Insights section. See line comments for details.
   ```

4. Submit review and comments using `gh` CLI:

   ```bash
   # Create a JSON payload file with the review and all comments
   cat > /tmp/review-payload.json <<EOF
   {
     "event": "<APPROVE|REQUEST_CHANGES|COMMENT>",
     "body": "<generated summary from step 3>",
     "comments": [
       {
         "path": "<file_path>",
         "line": <line_number>,
         "body": "<finding_text>"
       },
       ...
     ]
   }
   EOF
   
   # Submit the review with all comments in a single API call
   gh api repos/Bit-Quill/customer-reports/pulls/<number>/reviews \
     --method POST \
     --input /tmp/review-payload.json
   ```
   
   **Critical Notes:**
   - Use `--input` with a JSON file (not `-f` flags) to properly format the `comments` array
   - All comments MUST include valid `path` and `line` fields
   - The `line` must be a valid line number in the new file (right side of diff)
   - This creates a single review with all comments attached to it
   - **DO NOT** post individual comments after this - the comments are already posted as part of the review
   - Include :shipit: emoji in body text for APPROVE reviews

5. Confirm submission with summary:
   ```
   ✅ Review submitted successfully!
   
   PR #<number>: <PR title>
   
   Review Summary:
   - Review type: <APPROVE|REQUEST_CHANGES|COMMENT>
   - Total findings: <X>
     - Errors: <count>
     - Warnings: <count>
     - Info: <count>
   - Posted: <Y> findings
   - Skipped: <Z> findings
   
   Key findings posted:
   - <severity> <category>: <brief description> (line X)
   - <severity> <category>: <brief description> (line Y)
   
   View at: <PR_URL>
   ```

## Resource Files

This skill uses modular review criteria files:

- `resources/guidelines-review.md` - Report format and style guidelines
- `resources/language-spelling-review.md` - Language, spelling, and terminology checks
- `resources/date-validation-review.md` - Date validation rules
- `resources/historical-review.md` - Historical comparison criteria

## Error Handling

- If `gh` CLI is not installed: Prompt user to install it
- If PR not found: Ask user to verify PR number and repository
- If no markdown files in PR: Inform user and exit gracefully
- If API rate limits hit: Inform user and suggest trying again later
- If review submission fails: Show error and save findings to local file for manual submission

## Troubleshooting

### Duplicate Comments Issue
**Problem:** Comments appear twice on the PR

**Root Cause:** After successfully creating a review with embedded comments using `--input`, the code then posted the same comments again individually using `/pulls/<pr>/comments` API. Each individual comment post creates its own review, resulting in duplicates.

**Solution:** 
1. Use `gh api repos/.../pulls/<pr>/reviews --method POST --input <file>.json` with a JSON file containing the `comments` array
2. **DO NOT** post individual comments afterwards - they are already created as part of the review
3. The `--input` flag properly parses the JSON structure including nested `comments` array

**Example of what NOT to do:**
```bash
# Create review with comments (this works and creates the comments)
gh api repos/.../pulls/<pr>/reviews --method POST --input review.json

# WRONG - Don't do this! Comments already exist from above
gh api repos/.../pulls/<pr>/comments -f body="..." -f path="..." -F line=X
```

### Review API Details
- The `comments` array in `/pulls/<pr>/reviews` POST requests DOES work when using `--input` with a JSON file
- Individual line comments via `/pulls/<pr>/comments` auto-create their own review (different from the main review)
- Use `--input` with a JSON file, NOT `-f` flags, to properly format complex nested structures
- The `--input` approach is what the code-review skill uses and it works perfectly

## Notes

- All GitHub interactions must use `gh` CLI exclusively
- Findings must include specific file paths and line numbers for GitHub to attach comments correctly
- Self-reviews are automatically downgraded to COMMENT type per GitHub conventions
- The skill maintains state during interactive review so users can take breaks if needed
- **Review tone must be professional and factual.** Do not use flowery or subjective language about the quality of the PR (e.g., avoid "great progress", "excellent work", "well-structured report", "impressive improvement"). State facts: what changed, what's correct, what needs fixing. Positive findings should note the improvement factually (e.g., "Insights section now has content — addresses prior feedback") without qualitative praise.
- **All comment titles must be prefixed with `[AI Review]`** so the PR author knows the feedback was generated by AI. Apply the prefix to the bold header line of each line comment (e.g., `**[AI Review] ⚠️ Guidelines** — ...`). Also prefix the review summary H2 heading: `## [AI Review] Customer Report Review - <date>`.
