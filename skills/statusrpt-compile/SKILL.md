---
name: statusrpt-compile
description: >-
  Write the weekly customer-facing status report narrative from an already-
  assembled bundle.json, following the amazon-elasticache-agentic report
  house style. Use when asked to "compile the status report", "write this
  week's report", or "draft the weekly report" with a bundle path and the
  prior week's report given. Does not reconcile data (statusrpt-pr-tables)
  or assemble the bundle (statusrpt-gather) — it only writes the narrative.
---

# Write the Weekly Status Report

## Role

You are the narrative-writing stage. The bundle you're given already holds
every fact, faithfully gathered and NOT yet filtered for house style — your
job is the opposite of gather's: you editorialize. You decide what belongs in
a customer-facing report and how to phrase it, within the house style below.
Nothing in the bundle is customer-facing by default; you choose.

## Context — Inputs

- `bundle.json` at the path given — read it whole before writing anything. Key
  shape: `report_date`, `changes_this_week[]`, `projects.{completed,merged,
  submitted,dropped}[]` (each with `prs[]` and bucket-specific evidence
  fields), `infrastructure[]`, `sprint.tasks[]` (ALL tasks, unfiltered —
  including `workflow_action: "Not Started"` ones you must exclude
  yourself), `narratives[]`, `sources_consulted[]`.
- The prior week's report markdown, for continuity — read it for what to
  carry forward (open risks, dependencies) and what's now resolved.

## House Style (binding — violating any of these is a defect)

- **Badge vocabulary is closed.** Every status is one of exactly: `Done`,
  `On Track`, `In Progress`, `Not Started`, `Blocked`, `Off Track`,
  `At Risk`, `Paused`, `Pending Updates` — rendered
  `<span class="CLASS">WORD</span>` with the matching class (green for Done/
  On Track/In Progress, gray for Not Started, red for Blocked/Off Track,
  yellow for At Risk, paused for Paused, pending for Pending Updates). Never
  write a status as plain text.
- **Use "On Track", not "In Progress", whenever the item has a date** (a
  target date, an ETA, a release version, a merge date). Reserve
  "In Progress" for undated work only.
- **Purple (`pending`) marks internal-only draft state** and is never sent to
  the customer — don't use it in the final compiled report unless the
  request explicitly asks for an internal draft.
- **Section set and order**: `## Summary` (with an **Overall Status:** badge
  line and one standalone paragraph) → `## Last Week's Progress (date range)`
  → `## This Week's Focus (date range)` → `## Website and Documentation Plan`
  (if the bundle has website/docs tasks) → `## Dependencies` → `## Risks`
  (red=High, orange=Medium, yellow=Low, each with impact + mitigation) →
  `## Lowlights` → `## Goals` → `## Status Details` (prose plus an
  `### Infrastructure` bullet list) → `## Staffing`.
- **Infrastructure is a bullet list, never a table** — one bullet per item,
  each carrying its issue/PR link and status badge.
- **Staffing reports counts only, never names.**
- **No leftover placeholders** — every bullet you write must be a finished
  sentence from real bundle data, never "TBD", a template token, or
  commentary about the compilation process itself.

## Instructions

### Step 1 — Decide what's new vs continuing

Use `changes_this_week[]` as the primary signal for "Last Week's Progress"
and the Summary — these are the events pr-tables actually recorded this run,
not everything in the bundle. Cross-reference the prior report: anything it
listed as an open risk/dependency that isn't resolved in this bundle still
belongs in this week's Risks/Dependencies; anything it listed as "next" that
now shows up in `changes_this_week` is this week's progress, with
traceability back to last week's wording.

### Step 2 — Write the Summary under a literal `## Summary` heading

Start with the `## Summary` heading itself (not just the content under it —
every section below is a literal markdown heading, this one included). Below
the heading: "Hello everyone," then the Overall Status badge line, then one
paragraph. Ground that paragraph in the actual changes and open risks — a
reader who reads only this paragraph must know what happened, whether the
project is on track, and whether they need to do anything. Never reference a
milestone by a bare internal label without saying what it is.

### Step 3 — Write Last Week's Progress and This Week's Focus from the sprint,
EXCLUDING Not Started tasks

Walk `sprint.tasks[]`. For each task whose `workflow_action` is NOT
"Not Started", write one bullet under the appropriate section/grouping
(group by the task's `section` field, matching the bundle's grouping, e.g.
"**Framework Integrations:**"), phrased as a sentence with the PR linked
where present. **Skip every task with `workflow_action: "Not Started"`
entirely — do not mention it anywhere in the report.** This is the one
exclusion rule gather deliberately leaves to you: the bundle keeps those
tasks so no information is lost upstream, but a backlog idea nobody has
started is not customer-facing progress.

### Step 4 — Write Risks and Dependencies

Pull open risks from the prior report (unless resolved this week) plus any
new risk implied by `projects.submitted` items stalled or
`infrastructure` items aged. Each risk bullet: severity badge
(`red`=High/`orange`=Medium/`yellow`=Low) + a short bold title + impact +
mitigation. Dependencies are a plain bullet list of blocking factors, not
badged.

### Step 5 — Write Goals and Status Details from the completed/merged/dropped projects

For each `projects.completed[]` item: state it shipped, cite the evidence
(`completed_ref`/`completed_url` — if `completion_evidence_kind` is
`beta-release`, say so plainly, don't flag it as unconfirmed). For each
`projects.dropped[]` item: state the real `dropped_reason` verbatim in
substance — never paraphrase it away into something vaguer, and never omit
a dropped project. `projects.submitted[]` items still in flight get a
one-line status reflecting their current state.

### Step 6 — Write the Infrastructure bullet list

Under `### Infrastructure` inside Status Details, one bullet per
`infrastructure[]` item: issue number/description, its PR link, and a status
badge matching `status_label` (map `Merged`/`Awaiting Merge`/etc. to the
closed badge vocabulary — `status_class` tells you red/green). Never render
these as a table.

### Step 7 — Write Staffing

Counts and role buckets only, from whatever staffing context the request or
prior report provides — no names, ever.

## Output

Output ONLY the compiled report as markdown (the full report body, in house
style, ready to be reviewed) — no explanation of what you did, no bundle
excerpt, no meta-commentary.
