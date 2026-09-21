# Date Validation Review Criteria

This file contains criteria for validating dates, deadlines, time-based tracking, and metrics consistency in customer status reports.

## Mathematical Consistency in Metrics

**What to check:**
- Any metrics that should add up mathematically (defects, issues, counts, test results)
- Common patterns:
  - "New: X, Resolved: Y, Outstanding: Z"
  - Table totals vs row sums
  - Week-over-week deltas

**Mathematical rules:**
- `Outstanding_current = Outstanding_previous + New - Resolved`
- Table totals must equal sum of rows
- Percentage changes should match absolute numbers

**Examples of issues to flag:**
- ✗ Outstanding went from 0 to 1, but New=0 and Resolved=0 (impossible without explanation)
- ✗ Total row shows 9 but individual rows sum to 11
- ✗ Previous week: 1 open, This week: 0 open, but shows "8 resolved" (should be "1 resolved")
- ✗ "Resolved: 8" but no supporting PRs or details listed anywhere in report

**What to flag:**
- Mathematical inconsistencies without explanatory text (severity: warning)
- Week-over-week changes that don't match reported new/resolved counts (severity: warning)
- Totals that don't sum correctly (severity: error)
- Large quantitative claims (>5) without supporting evidence (severity: info)

**Suggested fix:**
- Add clarifying text: "Outstanding: 1 (pre-existing issue #4526 re-labeled this week; not newly reported)"
- Or correct the numbers to be mathematically consistent
- Or add links/details supporting large counts

## Unsupported Quantitative Claims

**What to check:**
- Large numbers (typically ≥5) in accomplishment claims
- Common patterns:
  - "Resolved 8 defects" - are these defects listed or linked?
  - "Completed 12 features" - are these features enumerated?
  - "Improved performance by 40%" - what metric/benchmark supports this?
  - "Processed 1000 records" - is this verified or estimaged?

**What to flag:**
- Claims of >5 items (defects, features, tests) without enumeration or links (severity: info)
- Performance improvement claims without benchmark data (severity: info)
- Vague quantitative claims like "numerous", "several", "many" when precision is expected (severity: info)
- Specific large numbers (>10) without any supporting detail (severity: warning)

**Suggested fix:**
- Add supporting evidence: "Resolved 8 defects ([PR #1234](link), [PR #1235](link), see section X for details)"
- Or enumerate in a table/list
- Or add qualifier: "Resolved approximately 8 defects (exact count being verified)"
- For performance: cite benchmarks, measurement tools, or link to analysis

**Exceptions (don't flag):**
- Metrics tables with columns that inherently provide detail (like defect tracking tables)
- References to clearly documented sections elsewhere in the report
- Small numbers (≤5) that are reasonable without extensive evidence

**Severity**: Info for moderate claims (5-10), Warning for large claims (>10) with no evidence

---

## Current Date Context

For all date validations, use the current system date as the reference point.

**Current date for this review**: Use system date at time of review execution

## Date Format Validation

### Standard Format
- **Expected Format**: DD-MMM-YYYY (e.g., 20-Jul-2026, 03-Jan-2026)
- **Check**: All target dates and ETAs use this format consistently
- **Check**: Month abbreviations use proper capitalization (Jan, Feb, Mar, not jan, JAN, January)
- **Severity**: Warning for incorrect format

### Report Date
- **Check**: Report date in subject/title is in YYYYMMDD format (e.g., 20260720)
- **Check**: Report date represents a valid calendar date
- **Check**: Report date is not in the future (reports should be historical)
- **Severity**: Warning

## Goal Date Validation

### Target Date Presence
For each goal in the Goals section:

1. **Check**: Goals with completion requirements have a Target Date
2. **Check**: If goal is time-bound, it includes "Target Date: DD-MMM-YYYY" or "Target: MMM DD"
3. **Check**: Long-running or support goals may not need target dates (this is acceptable)
4. **Severity**: Warning if missing for time-bound goals

### ETA Requirements
- **Check**: If ETA differs from Target Date, both must be present
- **Check**: ETA format: "ETA: DD-MMM-YYYY" or "(ETA MMM DD)"
- **Check**: If ETA exists, it should be later than the original target (otherwise why have an ETA?)
- **Severity**: Warning

### Date Logic Validation

For each goal with dates:

1. **Past Due Analysis**
   - **Check**: If Target Date is in the past and status is "Not Started" → Flag as Error
   - **Check**: If Target Date is in the past and status is "In Progress" or "On Track" → Flag as Warning
   - **Check**: If Target Date is in the past and status is "At Risk" or "Off Track" → Verify explanation exists
   - **Severity**: Error for "Not Started" past due, Warning for others

2. **ETA vs Target**
   - **Check**: If ETA is present and different from Target, goal should be marked "At Risk" or "Off Track"
   - **Check**: If goal is "On Track" but ETA ≠ Target, this is inconsistent
   - **Severity**: Warning

3. **Status Mismatch**
   - **Check**: "Done" or "Completed" goals should have completion date or be marked with past target date
   - **Check**: "On Track" goals with past target dates should be questioned
   - **Severity**: Warning

## In Progress Status Requirements

### Estimated Completion Date
For items marked with "In Progress" status:

1. **Check**: Item should have either:
   - A target date, OR
   - An ETA, OR
   - An explanation of why no date is provided

2. **Common patterns**:
   - "Feature X - In Progress" without any date → Flag
   - "Bug fixes - In Progress - 5 bugs remaining" without timeline → Flag
   - "Support tickets - In Progress" (ongoing work, no date needed) → OK

3. **Severity**: Warning if no date and work appears time-bound

### Progress Tracking Items

For support/bug tracking goals (e.g., "23 Total Open; 15 Not Started; 5 In Progress"):

1. **Check**: If tracking metrics, ensure format is consistent
2. **Check**: If resolution timeline is mentioned, verify dates are present
3. **Check**: "Resolve Between [Start] and [End]" should have valid date range
4. **Severity**: Info

## Overdue Item Analysis

### Identification
Identify all overdue items:

1. **Overdue = Target Date < Current Date AND Status ≠ "Done"/"Completed"**

2. For each overdue item:
   - **Check**: Is it marked "Off Track" or "At Risk"? (should be)
   - **Check**: Is there an explanation for the delay?
   - **Check**: Is there a new ETA or mitigation plan?
   - **Severity**: Warning if overdue without proper status/explanation

### Slipped Goals
For goals that have slipped (as indicated by ETA > Target):

1. **Check**: Report should note in the week the slip occurred (check against historical if available)
2. **Check**: New target date (ETA) should be present
3. **Check**: Explanation should be present
4. **Severity**: Warning if slip not properly documented

### Tight Deadline with Expanding Scope

**Check**: For each milestone/release with a target date within 7 days of the report's cutoff:
1. Check if new scope was added this week (new issues, new test requirements, additional work items).
2. Check if the status is still "On Track" (not At Risk or Off Track).
3. If both conditions are true, flag as needing either:
   - A buffer/contingency note ("Aug 27 holds because X was already triaged"), OR
   - A status change to At Risk.

**What to flag**:
- Imminent target (< 7 days) stays "On Track" despite new scope added this week (severity: warning)
- New issues explicitly described as "must be included" without schedule impact noted (severity: warning)

**Suggested fix**: Either mark the milestone At Risk with explanation, or add a note confirming the date still holds and why (e.g., "triaged and confirmed low-effort").

**Severity**: Warning

## Date Consistency Checks

### Internal Consistency
- **Check**: Same milestone/goal referenced multiple times should have consistent dates
- **Check**: Cross-references to dates in different sections should match
- **Severity**: Warning

### Timeline Logic
- **Check**: Start dates should be before end dates in ranges
- **Check**: Milestone sequences should be in logical order (Milestone 1 before Milestone 2, etc.)
- **Check**: Report date should be after all "Weekly Accomplishments" dates
- **Severity**: Warning

## Actions Section Date Validation

### Action Item Dates
For each action item:

1. **Check**: Each action has "Date Opened" in format DD-MMM-YYYY
2. **Check**: Date Opened is not in the future
3. **Check**: Resolved actions should indicate resolution (may or may not include close date)
4. **Severity**: Warning

### Open Action Duration
- **Check**: Flag actions that have been open for more than 30 days (Info level, for awareness)
- **Severity**: Info

## Report Timing Validation

### Report Coverage Period
- **Check**: Report should reflect status as of "end of day Friday" or customer-aligned cadence
- **Check**: If report date is not a Friday/Monday, note this as Info
- **Severity**: Info

### Submission Timeline
Based on guidelines:
- Reports out for review by Monday 8am (36 hours after EOD Friday)
- Final reports by Monday 11:59pm

**Note**: This validation can only be performed if PR metadata shows creation/submission times

- **Check**: If PR was created significantly late, flag as Info
- **Severity**: Info (this is advisory, not blocking)

## Date Parsing and Extraction

### Strategy for Finding Dates

1. **Goal Lines Pattern**:
   ```
   Goal description - Target MMM DD | Target Date: DD-MMM-YYYY
   Goal description - MMM DD {status}
   Goal description - Target: DD-MMM-YYYY (ETA: DD-MMM-YYYY)
   ```

2. **Extract dates using patterns**:
   - `Target Date: DD-MMM-YYYY`
   - `Target: DD-MMM-YYYY`
   - `ETA: DD-MMM-YYYY`
   - `(ETA MMM DD)`
   - `Target MMM DD`
   - Dates in range: `Between DD-MMM-YYYY and DD-MMM-YYYY`

3. **Parse each extracted date**:
   - Validate it's a real calendar date
   - Convert to comparable format
   - Compare against current date

4. **Store metadata** for each goal:
   ```json
   {
     "goal_text": "...",
     "line_number": 45,
     "status": "On Track",
     "target_date": "2026-07-30",
     "eta_date": null,
     "is_overdue": false,
     "has_explanation": true
   }
   ```

## Special Cases

### Ongoing Work
Some items are ongoing without fixed end dates:
- Support ticket queues
- Bug triage
- Maintenance work

**Check**: These should be clearly indicated as ongoing, not simply missing dates
**Severity**: Info

### Paused Items
Items marked with `<span class="paused">Paused</span>`:

- **Check**: May not have active target dates
- **Check**: Should have explanation for pause
- **Severity**: Info if dates are unclear

### Pending Updates
Items marked with `<span class="pending">...</span>`:

- **Note**: The `pending` span is a valid status indicator meaning "TBD / awaiting final information." It signals the author is still waiting for updates. Do NOT flag pending spans as violations.
- **Check**: Do NOT flag placeholder text, TBD dates, or incomplete content within pending spans — these are intentionally incomplete.
- **Severity**: N/A — not a finding

## Reporting Date Issues

### Finding Structure
For each date-related finding:

```json
{
  "file": "path/to/report.md",
  "line": 42,
  "severity": "error|warning|info",
  "category": "date-validation",
  "issue": "Clear description of the date issue",
  "suggestion": "Specific recommendation",
  "context": {
    "goal_text": "Original goal line",
    "current_date": "2026-07-20",
    "target_date": "2026-07-15",
    "eta_date": null,
    "status": "On Track",
    "days_overdue": 5
  }
}
```

### Example Findings

1. **Overdue without proper status**:
   ```
   Issue: Goal is overdue but marked "On Track"
   Context: Target Date: 15-Jul-2026 (5 days ago), Status: On Track
   Suggestion: Update status to "At Risk" or "Off Track" and provide explanation
   ```

2. **Missing ETA for In Progress**:
   ```
   Issue: Item marked "In Progress" without target date or ETA
   Context: "Feature ABC - In Progress"
   Suggestion: Add target date or ETA: "Feature ABC - Target: 30-Jul-2026 - In Progress"
   ```

3. **Inconsistent ETA**:
   ```
   Issue: ETA differs from Target but status is "On Track"
   Context: Target: 20-Jul-2026, ETA: 30-Jul-2026, Status: On Track
   Suggestion: Change status to "At Risk" or "Off Track" to reflect the slip
   ```

## Output Format

For each finding in this phase, structure as:

```json
{
  "file": "path/to/report.md",
  "line": 42,
  "severity": "error|warning|info",
  "category": "date-validation",
  "issue": "Clear description of date validation issue",
  "suggestion": "Specific recommendation to fix",
  "context": "Relevant date and status information"
}
```

## Integration with Other Phases

- Use Guidelines Review to understand goal structure
- Use Historical Review to track date slips across weeks
- Inform Language Review about date format inconsistencies
