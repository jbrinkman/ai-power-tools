---
name: generate-weekly-summary
description: >
  Generate the "This Week's Progress" section and executive summary for a status
  report. Use when asked to "generate summary", "update progress", "write executive
  summary", "generate this week's progress", "update exec summary", or "write weekly
  summary". Scans for **New** labeled tasks and produces both sections.
---

Generate the "This Week's Progress" bullet list and the executive summary paragraph section
for the current status report by scanning for tasks marked with `**New**`.

## Step 1: Identify the Target Report

1. If the user specifies a report file, use that file.
2. Otherwise, find the most recent report in the latest year directory under the status reports folder.
3. Read the entire report file.

## Step 2: Collect New Items

Scan the report body (everything after `## This Week's Progress`) for lines containing `**New**`.

For each `**New**` line, extract:
- The task or subtask name
- The parent task/section hierarchy (e.g., "CrewAI / Data Store", "Microsoft Agent Framework / HistoryProvider")
- The report section it belongs to (e.g., "AI Framework Integrations", "Valkey Search Enhancements", "Valkey Glide Enhancements", "Developer Experience & Tooling", "Demos & Documentation", "Infrastructure")
- The new status (the last `<span>` status label on the line)
- Any PR links on the line
- Any trailing comment text

### Exclusion Rule

Exclude any `**New**` item where the status transition ends in `Not Started`. These represent
new backlog items, not actual progress. For example, skip lines like:

```
- **New** SomeTask - <span class="gray">Not Started</span>
```

Also exclude lines where the transition arrow ends in `Not Started`:

```
- **New** SomeTask - <span class="green">In Progress</span> &rarr; <span class="gray">Not Started</span>
```

Only include items where the final status indicates actual work was done (In Progress, In Review,
Submitted, Done, Merged, Awaiting Merge, Blocked, Paused, Not a Bug, Closed, etc.).

## Step 3: Generate "This Week's Progress" Section

Create a bullet list under `## This Week's Progress` following these conventions:

1. Each bullet starts with `- ` (markdown list item).
2. Describe the change concisely: what moved and to what status.
3. Include PR links where available, using the same markdown link format as the task line.
4. Use the task's full context path for clarity (e.g., "CrewAI Data Store" not just "Data Store").
5. If a task has a status transition (`&rarr;`), describe it as "moved to [new status]".
6. If a task has a comment, incorporate relevant details into the bullet.
7. Group related items into a single bullet when they share the same parent and status change
   (e.g., "Microsoft Agent Framework HistoryProvider and ContextProvider moved to Submitted").

### Progress Bullet Format Examples

```
- CrewAI Data Store PRs submitted - [PR5700](...), [PR5701](...), [PR5702](...), [PR5703](...).
- Microsoft Agent Framework HistoryProvider and ContextProvider moved to Submitted - Python [PR](...), .Net [PR](...).
- ValkeySearch 1.2 API Support: C# and PHP modules merged.
- OpenMemory Implementation Native Vector Search moved to Done - [PR](...).
```

## Step 4: Generate Executive Summary

Create the executive summary section that starts after "Hello everyone," and ends before
the `### Completed Projects` section.

### Boundary Rules

The executive summary occupies ONLY the space between "Hello everyone," and `### Completed Projects`.
The report structure between the H1 title and `## This Week's Progress` is:

```
Hello everyone,

[Executive summary paragraphs — THIS is what gets replaced]

### Completed Projects

[Table of completed projects — PRESERVE this entirely]

**Note:** _All completed projects are fully released..._

## This Week's Progress
```

**CRITICAL:** The `### Completed Projects` section (including its table and the `**Note:**` line
that follows it) MUST be preserved exactly as-is. Never modify, remove, or overwrite it.
The executive summary replacement zone ends immediately before the `### Completed Projects` heading.

### Structure Rules

1. Write in prose format — paragraphs, not bullet points.
2. Group progress by report section. Each section with changes gets one or two paragraphs.
3. Only include sections that had changes this week (have `**New**` items).
4. Do not include sections with no changes.
5. Keep the tone objective and factual. Do not include subjective commentary, opinions, or
   qualitative assessments (e.g., avoid "great progress", "significant milestone", "exciting").
6. Include PR links inline where relevant, using the same markdown link format as the task lines.
7. Reference specific PR numbers, status changes, and concrete facts.

### Section Ordering

Follow this order when multiple sections have changes (skip sections with no changes):

1. AI Framework Integrations
2. Developer Experience & Tooling
3. Valkey Search Enhancements
4. Valkey Glide Enhancements
5. Demos & Documentation
6. Ecosystem Expansion
7. Infrastructure

### Paragraph Style

- Start with what changed, not meta-commentary about the week.
- State facts: what was submitted, merged, moved to a new status, or started.
- Include links to PRs where available.
- When multiple items in the same section changed, combine them naturally into flowing prose.
- Keep paragraphs focused — one paragraph per section is typical, two if there is substantial content.

### Example Executive Summary Paragraph

```
The Microsoft Agent Framework HistoryProvider and ContextProvider have been submitted with
both Python ([PR](link)) and .Net ([PR](link)) implementations. The CrewAI Data Store has
been broken into four PRs ([PR5700](link), [PR5701](link), [PR5702](link), [PR5703](link))
at the CrewAI team's request for easier review.
```

## Step 5: Write the Changes

1. Replace the existing `## This Week's Progress` bullet list with the newly generated list.
   The section starts after the `## This Week's Progress` heading and ends at the next `##` heading.
2. Replace the existing executive summary — ONLY the text between "Hello everyone," and
   `### Completed Projects` — with the newly generated summary.
3. Preserve the "Hello everyone," opening line and the blank line before `### Completed Projects`.
4. **Do NOT modify the `### Completed Projects` section, its table, or the `**Note:**` line.**
   These must remain exactly as they are in the source file.

## Step 6: Present Changes for Review

1. Show the user the generated "This Week's Progress" section.
2. Show the user the generated executive summary.
3. Ask the user to review and confirm, or request changes.
4. Apply any requested changes before finalizing.

## Important Rules

- Never modify task lines in the report body — only update the progress section and executive summary.
- **Never modify, remove, or overwrite the `### Completed Projects` section.** This includes the heading, the table, and the `**Note:**` line beneath it.
- Keep the executive summary objective. No subjective language.
- Exclude `**New**` items that end in "Not Started" status from both the progress list and summary.
- Preserve all existing formatting, HTML spans, and structure in the rest of the report.
- When in doubt about grouping, prefer separate bullets for clarity.
