# Historical Review Criteria

This file contains criteria for comparing the current report against previous weeks' reports and review comments to identify recurring issues and track feedback resolution.

## Overview

The historical review phase analyzes the last 3 weeks of reports and their review comments to:
1. Identify unresolved feedback from previous reviews
2. Detect recurring patterns or mistakes
3. Verify improvements based on past comments
4. Track issue resolution over time

## Data Collection

### Step 1: Identify Previous Reports

Using `gh` CLI, fetch the last 3 merged PRs for the same team:

```bash
# Get team folder from current PR file paths
TEAM_FOLDER=$(gh pr view <current_pr> --repo Bit-Quill/customer-reports --json files --jq '.files[0].path' | cut -d'/' -f1)

# Get list of merged PRs for this team
gh pr list --repo Bit-Quill/customer-reports \
  --state merged \
  --limit 20 \
  --json number,title,files,mergedAt \
  --jq ".[] | select(.files[].path | startswith(\"$TEAM_FOLDER/\"))"
```

Filter to the 3 most recent merged PRs for the team.

### Step 2: Fetch Review Comments

For each of the 3 previous PRs:

```bash
# Get all reviews for the PR
gh api repos/Bit-Quill/customer-reports/pulls/<pr_number>/reviews \
  --jq '.[] | {id, user: .user.login, state, body, submitted_at}'

# Get review comments (line-level comments)
gh api repos/Bit-Quill/customer-reports/pulls/<pr_number>/comments \
  --jq '.[] | {id, user: .user.login, body, path, line, created_at, resolved: .pull_request_review_id}'
```

### Step 3: Fetch Report Content

For each previous PR, fetch the report markdown content:

```bash
# Get the file content from the merged PR
gh api repos/Bit-Quill/customer-reports/contents/<file_path>?ref=<commit_sha> \
  --jq '.content' | base64 -d
```

## Analysis Categories

### 1. Unresolved Review Comments

**Objective**: Identify comments from previous reviews that were not addressed

**Method**:
1. For each review comment from previous 3 PRs:
   - Extract the issue/concern raised
   - Check if similar issue exists in current PR
   - Determine if the feedback was addressed or ignored

2. **Pattern matching strategies**:
   - Look for exact text matches (e.g., same typo recurring)
   - Look for similar structural issues (e.g., missing dates on goals)
   - Look for same status indicator errors
   - Look for same capitalization mistakes

3. **Finding criteria**:
   - **Severity: Warning** - If exact same issue from last week's comments appears again
   - **Severity: Info** - If similar pattern from 2-3 weeks ago appears again

**Example Finding**:
```
Issue: Previously flagged spelling error still present
Context: Week -1 review comment: "Fix typo: 'recieve' → 'receive' on line 34"
Current: Same typo appears on line 42 of current report
Suggestion: Fix the spelling error and consider adding to spell-check dictionary
```

### 2. Recurring Patterns

**Objective**: Detect issues that appear across multiple weeks

**Method**:
1. Categorize previous review comments by type:
   - Spelling/grammar errors
   - Date format issues
   - Status indicator problems
   - Missing sections
   - Capitalization inconsistencies

2. For each category, check if:
   - Same type of issue appears in 2+ previous reviews
   - Current report has the same category of issue

3. **Finding criteria**:
   - **Severity: Warning** - If same category of error appears in current + 2 previous weeks
   - **Severity: Info** - If same category appears in current + 1 previous week

**Example Finding**:
```
Issue: Recurring pattern - inconsistent project name capitalization
Context: 
  - Week -3: "Fix 'Aws Lambda' → 'AWS Lambda'"
  - Week -1: "Fix 'aws s3' → 'Amazon S3'"
  - Current: Found "azure functions" (should be "Azure Functions")
Suggestion: Consider creating a project glossary for consistent terminology
```

### 3. Improvement Tracking

**Objective**: Recognize and acknowledge when previous feedback was addressed

**Method**:
1. For each comment from previous reviews:
   - Check if the specific issue no longer exists in current report
   - Look for positive changes based on feedback

2. **Acknowledgment** (positive feedback):
   - If a recurring issue was fixed: acknowledge the improvement
   - If report quality improved in a specific area: note it

3. **Finding criteria**:
   - **Severity: Info** - Provide positive feedback when improvements are evident
   - This can be used to build a summary of improvements for the review

**Example Finding**:
```
Issue: Improvement noted - Date formatting consistency
Context: Previous reviews flagged inconsistent date formats
Current: All dates now use consistent DD-MMM-YYYY format
Suggestion: (None - this is a positive finding)
```

### 4. Trend Analysis

**Objective**: Identify trends in report quality over time

**Method**:
1. Track metrics across previous 3 reports:
   - Number of review comments per report
   - Categories of issues (spelling, dates, structure)
   - Resolution rate (issues fixed vs recurring)

2. **Generate trend insights**:
   - Is quality improving? (fewer issues over time)
   - Are same issues recurring? (stagnant or declining)
   - Are new types of issues appearing?

3. **Finding criteria**:
   - **Severity: Info** - Trend observations for overall awareness
   - Include in review summary, not as individual findings

**Example Insight**:
```
Trend: Improving quality - review comment count decreasing
Week -3: 12 comments
Week -2: 8 comments
Week -1: 5 comments
Current review: (will be determined after this review)
```

## Comment Resolution Tracking

### Resolution Status

For each previous comment, determine resolution status:

1. **Resolved** - Issue no longer present in current report
2. **Partially Resolved** - Issue improved but still needs work
3. **Unresolved** - Issue still present, no change
4. **Not Applicable** - Issue was specific to previous report context

### Flagging Unresolved Comments

**Priority levels**:
- **High Priority** - Comments from 1 week ago, still unresolved
- **Medium Priority** - Comments from 2 weeks ago, still unresolved
- **Low Priority** - Comments from 3 weeks ago (may no longer be relevant)

## Specific Historical Checks

### 1. Goal Tracking Across Weeks

**Check**: Goals mentioned in previous reports should be tracked in current report

**Method**:
1. Extract goal/milestone names from previous 3 reports
2. Check if those goals are still present or marked as "Done"
3. Verify goals didn't disappear without explanation

**Finding**:
```
Issue: Previously tracked goal no longer mentioned
Context: "Milestone 2 - Query Support" was tracked in weeks -3, -2, -1 (status: In Progress)
Current: Goal not found in current report, not marked as Done
Suggestion: Verify if goal was completed, abandoned, or accidentally omitted
```

**Severity**: Warning

### 2. Risk Item Tracking

**Check**: Risks mentioned in previous reports should be tracked or resolved

**Method**:
1. Extract risk items from previous reports (look in Risks section)
2. Check if risks are still listed, or if they've been resolved/mitigated
3. Flag risks that disappeared without resolution notes
4. **Special check**: Risks that are still unresolved but removed from tracking

**Finding Pattern 1 - Risk Dropped Without Explanation**:
```
Issue: Previously flagged risk no longer mentioned
Context: Week -2 and -1 reported "High Risk: Lack of access to internal email"
Current: Risk not mentioned, no resolution noted
Suggestion: Update risk section with resolution or continue tracking
```

**Finding Pattern 2 - Risk Retired While Still Active**:
```
Issue: Risk removed but underlying issue remains unresolved
Context: 
  - Week -2: "Medium Risk: Performance degradation in prod" (mitigation: investigating)
  - Week -1: "Medium Risk: Performance degradation in prod" (mitigation: profiling in progress)
  - Current: Risk not listed, but Goals section shows "Performance optimization" still In Progress
Analysis: Risk appears to still exist (work is ongoing) but was removed from Risks section
Suggestion: Either:
  - Re-add to Risks section if still a risk
  - Or add resolution note: "Previously reported risk - now tracked as routine optimization work"
```

**Validation logic**:
- If risk text from previous report does NOT appear in current report
- AND no resolution language appears near that topic (e.g., "resolved", "mitigated", "closed", "no longer a concern")
- AND the underlying work/issue is still mentioned elsewhere in the report
- THEN flag as "Risk retired without resolution"

**Severity**: Warning for Pattern 1, Info for Pattern 2 (depends on whether work is truly complete)

**Finding Pattern 3 - Risk Severity Downgrade Without Explanation**:

**Check**: Compare each risk's severity badge against the same risk in the previous report.

**Method**:
1. For each risk in the current report, find the matching risk in the previous week's report (match by topic/subject, not exact wording).
2. Compare severity levels (High > Medium > Low).
3. If severity decreased but the underlying facts are unchanged or worse (same unresolved blocker, same staffing gap, deadline now more overdue), flag as needing explanation.

**What to flag**:
- Risk severity decreased without new mitigating information (severity: warning)
- Risk removed entirely while the underlying issue is still referenced elsewhere in the report (severity: warning)
- Date anchors removed from risk text, reducing the reader's ability to assess urgency (severity: info)

**Suggested fix**: Either explain what changed to justify the lower severity, or restore the previous severity level.

```
Issue: Risk severity decreased without justification
Context:
  - Week -1: "Medium Risk: We didn't receive the scope of the new assignment on August 15"
  - Current: "Low Risk: We didn't receive the scope of the new assignment" (date removed, facts unchanged)
Analysis: Scope is now MORE overdue (9 days vs 0), yet severity dropped and date anchor removed
Suggestion: Keep at Medium and retain the date reference, or explain what mitigated the risk
```

**Severity**: Warning

### 3. Action Item Follow-Up

**Check**: Action items from previous reports should be tracked to closure

**Method**:
1. Extract open action items from previous reports
2. Check if they're still listed or marked as "Closed/Resolved"
3. Flag actions that were dropped without closure

**Finding**:
```
Issue: Action item from previous week not tracked
Context: Week -1 Action: "Mrs. Stakeholder - Approve additional resource. Opened 10-Jul-2026"
Current: Action not found in current report
Suggestion: Add status update - is this still open, closed, or escalated?
```

**Severity**: Warning

### 4. Date Slips

**Check**: Compare target dates across weeks to detect slips

**Method**:
1. Extract goal target dates from previous reports
2. Compare with current report dates for the same goals
3. Flag if target dates moved without explanation

**Finding**:
```
Issue: Goal target date slipped without documentation
Context: 
  - Week -2: "Feature X - Target: 20-Jul-2026"
  - Week -1: "Feature X - Target: 20-Jul-2026 - On Track"
  - Current: "Feature X - Target: 30-Jul-2026 - On Track"
Suggestion: Mark as "Off Track" or "At Risk" and explain the 10-day slip
```

**Severity**: Warning

### 5. Stale Active Content Detection

**Check**: Risks, active milestone descriptions, and "In Progress" items whose text is word-for-word identical across 3+ consecutive reports without a staleness annotation.

**Method**:
1. For each risk item in the current report, compare its description text against the same risk in the previous 2 reports.
2. For active items (In Progress, Submitted, Awaiting Merge), check if their description and context are unchanged for 3+ weeks.
3. Stable scaffolding (recipient lists, CSS blocks, completed project tables, goals definitions) is exempt.

**What to flag**:
- Risk description text identical across 3+ reports with no "No change since [date]" annotation (severity: warning)
- Active milestone or item description unchanged for 3+ weeks (severity: info)
- Items that previously had dynamic updates (new PRs, new context) but have gone static (severity: info)

**Suggested fix**:
- Add a trailing annotation: "No change since 2026-08-03."
- Or update the text with current information (new progress, revised mitigation, etc.)
- Or remove the item if it is no longer active/relevant.

**Exceptions (don't flag)**:
- Completed project tables (static by design)
- Goal definitions (stable unless revised)
- Staffing section (only changes when headcount changes)
- Dropped project reasons (historical record)

**Severity**: Warning for risks unchanged 3+ weeks, Info for other sections

### 6. Recurring Section Continuity

**Check**: Compare the H3/H4 section headers in the current report against the previous report. Flag if a section that appeared in 3+ consecutive prior reports is absent this week without explanation.

**Method**:
1. Extract all `###` and `####` headers from the current report.
2. Extract the same from the previous report.
3. If a header present in the previous 3 reports is missing this week, flag it.
4. Exempt sections that are explicitly situational (e.g., "Weekly Accomplishments" may not appear every week if there's a "TL;DR" alternative).

**What to flag**:
- Recurring section (3+ consecutive weeks) absent with no removal note (severity: warning)
- Section moved to a different position in the report (severity: info, note the relocation)

**Suggested fix**: Either restore the section, or add a note: "Roadmap section removed; roadmap link now lives in [X]."

**Severity**: Warning

## Implementation Strategy

### Phase 4 Execution Flow

1. **Fetch Historical Data** (5-10 seconds)
   - Previous 3 PRs for the team
   - Review comments for each PR
   - Report content for each PR

2. **Parse and Structure** (10-15 seconds)
   - Extract goals, risks, actions, dates from each historical report
   - Categorize review comments by type
   - Build comparison data structures

3. **Analysis** (10-15 seconds)
   - Check for unresolved comments
   - Detect recurring patterns
   - Track goal/risk/action continuity
   - Identify date slips

4. **Generate Findings** (5 seconds)
   - Create structured findings for each issue
   - Include historical context in finding details
   - Add severity based on recurrence and priority

### Caching and Performance

To optimize performance:
- Cache historical data for the current review session
- Skip re-fetching if data already loaded
- Limit to 3 most recent PRs (configurable if needed)

### Handling Missing Historical Data

If historical data is unavailable:
- **No previous PRs found**: Skip historical review, note in summary
- **API errors**: Log error, continue with other phases
- **Private/inaccessible PRs**: Skip those PRs, use what's available

## Output Format

For each finding in this phase, structure as:

```json
{
  "file": "path/to/report.md",
  "line": 42,
  "severity": "error|warning|info",
  "category": "historical",
  "issue": "Clear description of historical issue",
  "suggestion": "Specific recommendation",
  "context": {
    "historical_data": "Reference to previous report/comment",
    "week_offset": -1,
    "previous_pr": 123,
    "resolution_status": "unresolved"
  }
}
```

## Integration with Other Phases

- **Guidelines Review**: Use to understand what was flagged before
- **Language/Spelling Review**: Check if same errors recur
- **Date Validation**: Compare date slips over time
- **Deduplication**: Coordinate to avoid duplicate findings across historical and other phases

## Positive Feedback

Don't just flag problems - also note improvements:

- "Excellent improvement in date consistency compared to previous weeks"
- "Risk section clarity has improved significantly"
- "All comments from last week's review have been addressed"

Include 1-2 positive findings in the review summary if improvements are evident.
