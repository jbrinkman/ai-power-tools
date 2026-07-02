# Status Report Review Rules

## Severity Levels

- **blocking**: Must be fixed before submitting the PR. Factual errors, missing required content, or issues that will definitely be flagged by reviewers.
- **suggestion**: Worth fixing and usually caught in review. Inconsistencies, missing context, or quality issues.
- **nit**: Minor style or formatting issue. Optional to address.

## Rules

### 1. Executive Summary Quality (blocking)

The opening paragraph(s) after "Hello everyone," must:
- Lead with the biggest win or accomplishment from the past week
- Be concise enough for executives to scan quickly (3-5 sentences max)
- Include what the team is focusing on next
- Not duplicate detailed content from sections below
- Include links to key PRs or releases mentioned

Bad: A long paragraph restating every item from "This Week's Progress."
Good: "This week we delivered X (link) and Y (link). Next week we're focused on Z."

### 2. Status Badge Consistency (blocking)

- A parent item's status must reflect its children:
  - If all children are "Merged" or "Done", parent must be "Done"
  - If any child is "Blocked", parent should reflect that (not "In Progress")
  - If all children are "Not Started", parent cannot be "In Progress"
- Status color classes must match the status text:
  - `class="green"`: Done, Merged, Submitted, In Progress, In Review, Awaiting Merge, On Track
  - `class="gray"`: Not Started, Dropped, Not a Bug, Not Planned
  - `class="red"`: Blocked
  - `class="paused"`: Paused
- Every task item must have a status badge (no missing badges)
- Status text in the badge must match the described state (e.g., don't say "In Review" if the description says "merged")

### 3. Week-to-Week Continuity (blocking)

Compare against the previous week's report:
- Items must not silently disappear — they should be marked Dropped with explanation, moved to Completed Projects table, or still present
- New items must have the `**New**` prefix on their first appearance
- Lowlights and Insights should not be stale repeats from the previous week without an update or explanation of why they persist

### 4. Missing Links and ETAs (suggestion)

- Any reference to a deliverable (PR submitted, document created, video uploaded, release published, assessment completed) must include a link to that content — in any section of the report, including the opening paragraph
- Items with status "Submitted", "In Review", "Awaiting Merge", or "Merged" must have a PR link
- Items with status "In Progress" should have a target date or ETA
- Released items should link to the release
- `**New**` items should have a target date

### 5. Copy-Paste Errors (blocking)

- Each item's description must actually describe that item, not a different one
- Look for descriptions that reference a different project/framework name than the item heading
- Look for duplicate descriptions across different items

### 6. Typos and Capitalization (suggestion)

Known correct spellings:
- "ElastiCache" (not "Elasticache", "Elasticached", "Elastiache")
- "Sidekiq" (not "SideKiq")
- "ValkeySearch" or "Valkey Search" (not "Valkey Seach")
- "valkey-glide" (lowercase in code/package context)
- "GLIDE" (all caps when referring to the project name)

Check for common typos and inconsistent capitalization of product/project names throughout the report.

### 7. CSS Style Block Completeness (nit)

The `<style>` block at the top should define all color classes used in the report:
- `.green` — green background
- `.gray` — gray background
- `.red` — red background
- `.paused` — light blue background
- `.orange` — orange background (`#ff8000`)

Flag if a class is used in the report body but not defined in the style block.

### 8. Formatting Conventions (nit)

- Status transitions use `&rarr;` between two `<span>` elements
- Dash separator between status badge and description text
- `**New**` items include a target date after the description
- Strikethrough (`~~`) for missed/revised dates followed by the new date
- Numbered list for Goals section only; unordered (`-`) for all other lists
- 2-space indentation for nested list items

### 9. Grammar and Language (nit)

- Compound adjectives before nouns should be hyphenated ("well-defined API" not "well defined API")
- "its" (possessive) vs "it's" (contraction)
- Articles: don't drop "the" before noun phrases where English requires it
- Consistent tense within a section

### 10. Content Specificity (suggestion)

- Descriptions should be specific, not vague
- "Fixed issues" → what issues? Link them.
- "Made progress on X" → what specifically was done?
- Lowlights should state what help is needed or what action is being taken
- Insights should be actionable observations, not generic statements
