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

**The very first character you output MUST be the `#` of the report's H1
title.** This is a customer-facing document: it begins with the report itself,
nothing before it. If you need to resolve a file path, decide where a fixture
lives, or reason about the request at all, do that thinking privately — in
your own reasoning/scratch process, never as response text the user sees.
Your visible output contains ONLY the report, starting at `#`. Any sentence
that describes your own process (where something is located, what you're
about to do, how a path resolved, that you're following the skill) is a
defect, however it's phrased — not just the specific wordings you've seen
before.

## Context — Inputs

- `bundle.json` at the path given — read it whole before writing anything. Key
  shape: `report_date`, `changes_this_week[]`, `projects.{completed,merged,
  submitted,dropped}[]` (each with `prs[]` and bucket-specific evidence
  fields), `infrastructure[]`, `sprint.tasks[]` (ALL tasks, unfiltered —
  including `workflow_action: "Not Started"` ones you must exclude
  yourself), `narratives[]`, `sources_consulted[]`.
- The prior week's report markdown — the continuity BASELINE. Read it whole
  before writing. For Risks, Dependencies, Lowlights, and Staffing it is the
  starting point you update (see "Carry forward" in House Style and Step 4/7),
  not merely a reference; for the other sections it tells you what to carry
  forward (open risks, dependencies) and what's now resolved.

## House Style (binding — violating any of these is a defect)

- **Badge vocabulary is closed, with one per-domain exception.** General
  status is one of exactly: `Done`, `On Track`, `In Progress`, `Not Started`,
  `Blocked`, `Off Track`, `At Risk`, `Paused`, `Pending Updates`, `Dropped` —
  rendered `<span class="CLASS">WORD</span>` with the matching class (green
  for Done/On Track/In Progress, gray for Not Started/Dropped, red for
  Blocked/Off Track, yellow for At Risk, paused for Paused, pending for
  Pending Updates). **The CSS class is always one of these exact 6 lowercase
  words** — `green`, `gray`, `red`, `yellow`, `paused`, `pending` — never a
  class derived from the badge word itself (e.g. `Done` is
  `<span class="green">Done</span>`, NOT `<span class="done">Done</span>`).
  Never write a status as plain text. **Infrastructure
  items are the one exception**: their badge word is the bundle's own
  `status_label` (e.g. `Merged`, `Awaiting Merge`) rendered as-is — these are
  real, standing house-style words, not something to remap into the general
  list (see Step 6).
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
- **Carry forward, don't rewrite from scratch.** The prior report is the
  BASELINE for the narrative sections that the bundle does not fully
  reconstruct — **Risks, Dependencies, Lowlights, and Staffing**. Start each
  of these from the prior report's version and apply this week's deltas on
  top; an entry is removed ONLY when this week's data gives it an explicit
  disposition (resolved, mitigated, shipped, dropped-with-reason), and when
  you remove one you say so (e.g. "resolved this week"). Never drop a prior
  entry by silent omission — a prior risk or dependency with no backing data
  in this week's bundle still carries forward verbatim unless the bundle
  resolves it. The bundle-authoritative sections — Last Week's Progress,
  This Week's Focus, Goals, Status Details, Infrastructure — are regenerated
  from bundle data as before; this baseline rule does not loosen their
  grounding.

## Instructions

### Step 1 — Decide what's new vs continuing

Use `changes_this_week[]` as the primary signal for "Last Week's Progress"
and the Summary — these are the events pr-tables actually recorded this run,
not everything in the bundle. Cross-reference the prior report: anything it
listed as an open risk/dependency that isn't resolved in this bundle still
belongs in this week's Risks/Dependencies; anything it listed as "next" that
now shows up in `changes_this_week` is this week's progress, with
traceability back to last week's wording.

### Step 2 — Open with the H1 title, then the Summary

Emit, in this exact order, as the first lines of the report:

1. The **H1 title** — the first and only `#` (single-hash) heading:
   `# Amazon ElastiCache - Extended / Improving Vancouver Status Update <YYYY-MM-DD>`
   using the bundle's `report_date`. This is the literal first line of output;
   nothing precedes it.
2. The **`## Summary` heading** itself (a literal markdown heading, like every
   section below).
3. Below the heading: "Hello everyone," then the Overall Status badge line,
   then one paragraph. Ground that paragraph in the actual changes and open
   risks — a reader who reads only this paragraph must know what happened,
   whether the project is on track, and whether they need to do anything.
   Never reference a milestone by a bare internal label without saying what it
   is.

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

If a sprint task's own underlying project already shipped (its bullet cites a
release version/date — e.g. a "ship X" task whose X is now released), badge
that bullet `Done`/`On Track`, not `In Progress` — the dated-item rule
applies to the task's own prose, not just to the project's separate Goals/
Status Details entry. Don't write a bullet that both cites a release and
badges itself `In Progress`; that is a contradiction.

### Step 4 — Write Risks and Dependencies

Start from the prior report's Risks and Dependencies as the baseline, then
apply this week's deltas:

1. **Carry every prior risk and dependency forward.** Copy each one from the
   prior report. A prior entry stays in this week's report even when the
   bundle has no data about it — the bundle not mentioning a risk is NOT a
   resolution.
2. **Update an entry** when this week's data changes it: adjust the severity
   badge, impact, or mitigation to reflect the bundle (e.g. a submitted
   project that stalled further, an infrastructure item that aged).
3. **Remove an entry only with an explicit disposition.** Drop a prior risk/
   dependency only when this week's data resolves or mitigates it, and say so
   in the report (a one-line "resolved this week" note, or fold the
   resolution into Last Week's Progress) rather than deleting it silently.
4. **Add new entries** implied by this week's data — a `projects.submitted`
   item stalled, an `infrastructure` item aged, a new blocking dependency.

Each risk bullet: severity badge (`red`=High/`orange`=Medium/`yellow`=Low) +
a short bold title + impact + mitigation. Dependencies are a plain bullet
list of blocking factors, not badged.

### Step 5 — Write Goals and Status Details from the completed/merged/dropped projects

For each `projects.completed[]` item: state it shipped, cite the evidence
(`completed_ref`/`completed_url` — if `completion_evidence_kind` is
`beta-release`, say so plainly, don't flag it as unconfirmed). For each
`projects.dropped[]` item: badge it `<span class="gray">Dropped</span>` and
state the real `dropped_reason` verbatim in substance — never paraphrase it
away into something vaguer, and never omit a dropped project.
`projects.submitted[]` items still in flight get a one-line status reflecting
their current state.

### Step 6 — Write the Infrastructure bullet list

Under `### Infrastructure` inside Status Details, one bullet per
`infrastructure[]` item: issue number/description, its PR link, and a status
badge using `status_label` AS-IS (`Merged`, `Awaiting Merge`, etc. are real
house-style words for infrastructure items — do not substitute a general
status word) with the class from `status_class` (red/green). Never render
these as a table.

### Step 7 — Write Lowlights and Staffing

**Lowlights** carry forward from the prior report as a baseline: keep each
prior lowlight unless this week's data resolves it (then note the
resolution), update any that this week's data changes, and add new ones the
bundle implies. If the prior report's Lowlights was empty and nothing this
week qualifies, keep it empty (`* none`).

**Staffing** also carries forward from the prior report — reproduce its
counts, role buckets, and any contract/end-date note, updating only what this
week's staffing context actually changes. Counts and role buckets only, from
whatever staffing context the request or prior report provides — no names,
ever.

## Output

Output ONLY the compiled report as markdown (the full report body, in house
style, ready to be reviewed) — no explanation of what you did, no bundle
excerpt, no meta-commentary.
