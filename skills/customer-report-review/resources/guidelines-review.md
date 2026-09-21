# Guidelines Review Criteria

This file contains the review criteria for validating that customer status reports conform to the established guidelines from the weekly-reports repository.

## Structure and Format

### Email Subject Line Format
- **Check**: Subject line follows format: `CUSTOMER_NAME CUSTOMER_PROJECT / Improving Vancouver Status Update YYYY-MM-DD`
- **Severity**: Warning
- **Example Issue**: "Subject line format is incorrect. Should be: 'CustomerName ProjectName / Improving Vancouver Status Update 2026-07-20'"

## Linked Artifact Status Validation

### GitHub Issue/PR Status Matches Report
**What to check:**
- Any GitHub issue or PR links in the report
- Compare the linked artifact's actual state (open/closed/merged) with what the report implies

**How to validate:**
- Extract GitHub URLs from the report (issues and PRs)
- Use `gh` CLI to check actual status: `gh issue view <number> --repo <owner>/<repo> --json state,closedAt`
- Compare actual state with reported status

**Common mismatches:**
- ✗ Report shows "[In Progress]" but linked issue was closed 4 weeks ago
- ✗ Report shows "[Blocked]" but linked PR was already merged
- ✗ Issue closed as "won't fix" but report shows it as active work

**What to flag:**
- Linked artifact closed/merged but report status indicates active work (severity: warning)
- Epic/parent issue closed but still referenced as the primary tracking link (severity: info)
- Artifacts closed >2 weeks ago still shown as in-progress (severity: warning)

**Evidence requirements:**
- When verifying an artifact's state, the finding must include at least one concrete detail from the API response (title, state, merge date, or author) rather than a bare assertion.
- ✗ "...but that PR is still open and unmerged." (reads as an assumption)
- ✓ "`gh api repos/.../pulls/349` returns `state: OPEN`, `mergedAt: null` (opened Jul 22, no merge as of this review)."
- If the check is unavailable (API error, private repo), do not assert the state. Ask for confirmation instead.

**Suggested fix:**
- Update status to match artifact state
- Or link to the actual open artifact doing the work
- Or add context: "[In Progress] Node Windows support — CI/CD tracked in [PR #6404](link) ([epic #5847](link) closed 30-Jun)"

---

### Required Sections
Check that the report includes all required sections:

1. **Summary Section**
   - **Check**: Summary section exists and is present
   - **Check**: Summary is concise (ideally one paragraph)
   - **Check**: Summary includes at least one of: key decisions, stakeholder issues, risks, or impacts
   - **Check**: Summary is standalone (can be understood without reading details)
   - **Check**: Summary avoids vague milestone references (e.g., "Milestone #4" without context)
   - **Severity**: Error if missing, Warning if too long or vague

2. **Risks Section** (if applicable)
   - **Check**: Risks use proper color coding: `<span class="red">High</span>`, `<span class="orange">Medium</span>`, `<span class="yellow">Low</span>`
   - **Check**: Each risk includes impact description
   - **Check**: Each risk includes mitigation steps
   - **Check**: Risks are not duplicates of items in Goals section
   - **Severity**: Warning

   **Risk Severity-Color Cross-Validation**
   - **Check**: For each risk bullet, validate that the CSS class matches the severity word inside the span:
     - `class="red"` must contain "High"
     - `class="orange"` must contain "Medium"
     - `class="yellow"` must contain "Low"
   - **Check**: If sibling risk bullets use different classes for the same severity word, flag the outlier.
   - **Severity**: Warning

3. **Weekly Accomplishments Section** (if applicable)
   - **Check**: Section exists if referenced in goals
   - **Check**: Items are in bullet format
   - **Check**: Items trace back to previous week's "Next Week" section
   - **Severity**: Info

4. **Goals Section**
   - **Check**: Goals section exists and is not empty
   - **Check**: Each goal has a status indicator
   - **Check**: Goals use proper HTML status spans (not plain text like "Completed", "Pending")
   - **Check**: Goals with target dates include: Target Date and ETA (if different)
   - **Check**: "At Risk" or "Off Track" goals include reason for risk
   - **Check**: "At Risk" or "Off Track" goals include mitigation/action plan
   - **Check**: Goals use proper date format: DD-MMM-YYYY (e.g., 20-Jul-2026)
   - **Severity**: Error if missing, Warning for format issues

5. **Actions Section** (if applicable)
   - **Check**: Each action has an owner
   - **Check**: Each action has a description
   - **Check**: Each action has a date opened
   - **Check**: New actions are marked "(New Action)"
   - **Check**: Resolved actions are marked "Closed. (Resolved Action)"
   - **Severity**: Warning

6. **Staffing Section**
   - **Check**: Staffing section exists
   - **Check**: Reports current number of billed staff
   - **Check**: Does not use specific names
   - **Severity**: Warning if missing

## Status Color Coding

### Valid Status Indicators
Check that status indicators use proper HTML spans from the approved list:

- `<span class="green">Done</span>`
- `<span class="green">On Track</span>`
- `<span class="green">In Progress</span>`
- `<span class="gray">Not Started</span>`
- `<span class="red">Blocked</span>`
- `<span class="red">Off Track</span>`
- `<span class="yellow">At Risk</span>`
- `<span class="paused">Paused</span>`
- `<span class="pending">Pending Updates</span>`

### Status Indicator Checks
- **Check**: All status indicators use proper `<span>` tags with correct class names
- **Check**: No plain text status values (e.g., "Completed", "In Review", "Pending")
- **Check**: "On Track" is used instead of "In Progress" when there's a date associated
- **Check**: Purple `<span class="pending">` is a valid status indicator meaning "TBD / awaiting final information." Do NOT flag it as a violation. Content within pending spans (placeholder text, TBD dates, incomplete links) should also NOT be flagged — the pending span itself communicates that the author is waiting for updates.
- **Severity**: Error for invalid status, Warning for suboptimal choice

## Project-Specific Forbidden Status Words

### Purpose
Some projects maintain a list of forbidden status words or phrases that should not appear in customer reports. These are typically vague, ambiguous, or inconsistent with project standards.

### How to Check
1. **Locate project README**: Use historical review to find the project folder (e.g., `amazon-elasticache-agentic/`)
2. **Check for forbidden words list**: Look for sections like "Forbidden Status Words", "Avoid These Terms", "Status Guidelines"
3. **If found, validate against report**: Search the report for any forbidden words/phrases
4. **Flag violations**: Report any forbidden words found with context

### Common Forbidden Words (examples from various projects)
- "TBD" or "To Be Determined"
- "Soon" or "Shortly"
- "Investigating" (without timeline)
- "Working on" (prefer specific status)
- "Almost done" or "Nearly complete"

### What to Flag
- Any word/phrase from the project's forbidden list (severity: warning)
- Multiple vague qualifiers in critical sections like Summary or Risks (severity: info)

### Suggested Fix
- Replace with specific status span: `<span class="green">In Progress</span>` instead of "working on"
- Add concrete timeline: "Investigating root cause (target resolution: 28-Jul-2026)" instead of "investigating"
- Use precise language: "Expected completion: 05-Aug-2026" instead of "soon"

**Note**: Only flag words that appear in the specific project's documented forbidden list. Don't flag general vague language unless it appears in a critical section.

---

## Style Requirements

### CSS Style Block
- **Check**: Report includes the required CSS style block at the top
- **Severity**: Error if missing

### Status Consistency
- **Check**: Status terminology is consistent throughout the report
- **Check**: No mixing of status styles (e.g., plain text and HTML spans)
- **Severity**: Warning

## Content Guidelines

### Summary Quality
- **Check**: Summary avoids technical jargon unless supporting a decision
- **Check**: Summary focuses on value and impact, not task lists
- **Check**: Summary provides context for milestone names
- **Check**: Summary answers the three executive questions (a reader who skips everything else should still know):
  1. What happened this week?
  2. Is the project on track?
  3. Does the reader need to do anything?
- **Severity**: Info

### Summary-Status Badge Consistency
- **Check**: For each milestone/release marked `At Risk` or `Off Track` in the Goals/Release Details section, verify the Summary section contains explicit risk language for that milestone.
- **Check**: If the Summary describes a milestone using only progress language (e.g., "working on", "conducting analysis") while the detailed section badges it At Risk, flag the mismatch.
- **What to flag**: Summary omits risk signal for a milestone that is At Risk or Off Track in the body (severity: warning)
- **Suggested fix**: Add a sentence to the Summary flagging the milestone as At Risk, matching the body's badge.
- **Severity**: Warning

### Goal Tracking
- **Check**: If a goal has slipped, it should be marked "Off Track" in the week it slips
- **Check**: Slipped goals should include a note about the new target date
- **Check**: Subsequent reports should track against the new date
- **Check**: Goal metrics for bugs/support include proper format: "# Total Open; # Not Started; # In Progress; # In Review"
- **Severity**: Warning

### Professional Tone
- **Check**: Report maintains professional tone throughout
- **Check**: No informal language or slang
- **Check**: Proper capitalization of company and product names
- **Severity**: Info

## Timeline Compliance

### Submission Timing
- **Check**: If metadata available, verify report is submitted within timeline:
  - Status as of EOD Friday
  - Out for review by Monday 8am
  - Final by Monday 11:59pm
- **Severity**: Info

## Recipient List

### Email Headers
- **Check**: To: includes key external stakeholders
- **Check**: Cc: includes Kyle.Porter@improving.com and Ray.Lum@improving.com
- **Check**: Cc: includes statuses@bitquilltech.com
- **Check**: Cc: includes team's group email
- **Severity**: Warning

## Formatting Issues

### Common Mistakes
- **Check**: No bare URLs (should be formatted as links if needed)
- **Check**: Consistent bullet point style
- **Check**: Proper spacing between sections
- **Check**: No trailing whitespace or multiple blank lines
- **Severity**: Info

## Guideline Violations

### Explicit Guideline Checks
Review README.md guidelines and flag any explicit violations:

- Using status values not in the approved list
- Missing required sections for the report type
- Incorrect date formats
- Missing context in summary section
- Restating information to customer that should have been communicated beforehand

**Severity**: Varies by violation type (Error for structural, Warning for style)

## Gantt Chart Validation

For reports containing Mermaid `gantt` code blocks:

### Gantt Status Tag Consistency
- **Check**: For each Gantt bar tagged `:done`, verify the corresponding task is described as complete in prose (e.g., "completed", "merged", "[Done]").
- **Check**: For each Gantt bar tagged `:active`, verify the task is described as in progress, not completed.
- **Check**: If a Gantt bar was `:done` last week but is `:active` this week (regression), flag unless the prose explains why (e.g., "reopened due to new findings").
- **Severity**: Warning

### Gantt Date Window Plausibility
- **Check**: A bar tagged `:done` must have a date window that has started (start date ≤ report cutoff date). A task cannot be done before its scheduled start.
- **Check**: A bar tagged `:active` should have a date window that overlaps with the report's cutoff date (start ≤ cutoff ≤ end).
- **Severity**: Warning for `:done` before start date, Info for `:active` outside window

### Gantt-Feature Matrix Cross-Reference
- **Check**: If the report includes both a Gantt chart and a feature/status matrix, verify consistency between Gantt `:done` tags and matrix cell status (e.g., Gantt `:done` → matrix should not still show BACKLOG or IN PROGRESS).
- **Severity**: Warning

## Output Format

For each finding in this phase, structure as:

```json
{
  "file": "path/to/report.md",
  "line": 42,
  "severity": "error|warning|info",
  "category": "guidelines",
  "issue": "Clear description of what's wrong",
  "suggestion": "Specific recommendation to fix the issue",
  "context": "Relevant text from the report (optional)"
}
```
