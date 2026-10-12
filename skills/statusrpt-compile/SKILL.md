---
name: statusrpt-compile
description: >-
  Compile a weekly ElastiCache-Agentic status report from pre-fetched source
  files. Use when asked to "compile the status report", "build the weekly
  report", "reconcile the status report", or "generate the status report" when
  the source data has already been gathered into a fixtures/source directory.
  Reads a previous report plus GitHub/Confluence/Taskei/Chorus source data,
  reconciles every project table (including Infrastructure/Terraform), and emits
  one fully compiled report. Does NOT fetch live data and does NOT push a PR.
---

# Compile Weekly Status Report

## Role

You are the compile stage of the weekly status-report pipeline. You take a
previous report plus already-fetched source data and produce the next week's
report, fully reconciled. You do not fetch live data (a separate step did that),
you do not open a PR, and you do not ask the user questions — you decide and
stage every change, because a later human-review stage approves your output.

## Task

Produce ONE compiled status report (markdown) for the requested date by:
initializing it from the previous report, reconciling every project table
against the fetched GitHub data, adding new work surfaced by the Confluence
tracker, regenerating the narrative sections, and preserving everything the
sources do not touch.

## Context — Inputs

All inputs are files in the source directory the request names (e.g.
`{{fixturesDir}}`). Read each one; never reach for the network.

| File | What it is |
|------|-----------|
| `report-prev.md` | The previous week's report. Your base. |
| `gh-api-responses.json` | Fetched PR state keyed `"<owner>/<repo>#<n>"`: `state`, `merged`, `merged_at`, optional `releases[]` (`tag_name`, `html_url`, `body`), `closed_comments[]`, `successor`. Ground truth for reconciliation. |
| `confluence-tracker.html` | The PR Status Tracker — the leading edge. PRs appear here before they are in the report tables. |
| `taskei-sprint.json` | Current sprint tasks: `name`, `workflowAction`, `section`, `pr`. Context for the summary. |
| `chorus-narratives.json` | Narrative deliverable docs (`title`, `doc_id`). Reference for narrative/documentation items. |

Ignore any `_comment` or `_expect` keys in the JSON — they are fixture
annotations, not data.

## Context — Report structure

Sections, in order: H1 title line; `Hello everyone,`; executive-summary prose;
`### Completed Projects` (+ table + `**Note:**` line); `## This Week's Progress`;
`## Highlights`; `## Lowlights`; `## Insights`; `## Merged Projects`;
`## Submitted Projects`; `## Dropped Projects`; `## Infrastructure` (+ table).

## Instructions

Work the steps in order. Each step's output feeds the next.

### Step 1 — Initialize the new report (criterion: initialization)

From `report-prev.md`:

1. Rewrite the H1 title date to the requested date.
2. Remove every carried-over `**New**` label — these marked last week's changes
   and must not persist. (You will add fresh `**New**` labels only to rows that
   change THIS run, in later steps.)
3. Remove every strikethrough span (`~~...~~`) and its delimiters.
4. For any line with two status spans joined by `&rarr;`, drop the first span
   and the arrow, keeping only the most recent (second) span.
5. Reset `## Lowlights` and `## Insights` each to a single `* none` line.
6. Collapse any double spaces or stray leading/trailing whitespace you created.

### Step 2 — Reconcile Submitted Projects (criterion: submitted-reconciliation)

For each PR in `## Submitted Projects`, look it up in `gh-api-responses.json`:

- `merged: true` → move the row to `## Merged Projects`, add `**New**`. (It may
  be promoted further in Step 3.)
- closed, not merged, has an open `successor` (comments say continued/rebased in
  another PR) → keep the row in Submitted but repoint its PR link to the
  successor PR.
- closed, not merged, `closed_comments` show maintainer rejection ("won't
  accept", "not aligned") → move the row to `## Dropped Projects`, add `**New**`,
  and add a reason column citing the rejection.
- still `open` → leave unchanged.

### Step 3 — Promote Merged → Completed only on a confirmed release (criterion: release-verification)

For each row now in `## Merged Projects` (including ones just moved there):

1. If the PR has no `releases[]`, leave it in Merged.
2. Find the first release whose `body` references the PR number (e.g. `#30`).
   That is the *confirmed including release*.
3. If found → move the row to `### Completed Projects`, citing that release's
   `tag_name` + `html_url`. Never cite a different or newer release.
4. If `releases[]` exist but NONE reference the PR → leave it in Merged and flag
   it inline (e.g. append `release found, PR not confirmed in changelog`). Do not
   promote it.

### Step 4 — Reconcile Infrastructure, then add new infra PRs (criterion: infrastructure-reconciliation)

The `## Infrastructure` table has columns Issue | Description | PR | Status.

First, clean up prior-week resolutions: remove any row whose current Status is
already a green `Merged` or red `Closed` span — those were resolved in a prior
week and have had their week of visibility.

Then, for each remaining row, look up its PR in `gh-api-responses.json`:

- newly `merged: true` this run → set Status to `<span class="green">Merged</span>`,
  add `**New**`, and KEEP the row this week (next week's cleanup removes it).
- newly closed-not-merged → set Status to `<span class="red">Closed</span>`, add
  `**New**`, keep the row this week.
- still open → leave the Status unchanged.

Finally, add new infra PRs: for every PR in `confluence-tracker.html` that targets
the terraform/infrastructure provider and is NOT already a row in the
Infrastructure table, append a new row (Issue, Description, PR link, Status from
the tracker).

### Step 5 — Intake new PRs from the tracker (criterion: tracker-intake)

For every PR in `confluence-tracker.html` that is NOT already present anywhere in
the report's project tables and is not an infrastructure PR (handled in Step 4),
add it to `## Submitted Projects` with its project name and PR link.

### Step 6 — Regenerate the narrative sections (criterion: summary-generation)

1. **This Week's Progress** — replace the `## This Week's Progress` bullet list
   with bullets describing THIS run's reconciled changes (moves, link updates,
   drops, infra relabels, new intake). Use `taskei-sprint.json` for section
   grouping and task context. Carry over nothing from last week's list.
2. **Executive summary** — replace only the prose between `Hello everyone,` and
   `### Completed Projects`. Group by report section; cover every section that
   changed; objective prose only (no "great", "exciting", "milestone"). Preserve
   the `Hello everyone,` line and the blank line before `### Completed Projects`.
3. **Exclusion** — exclude any Taskei item whose `workflowAction` is
   `Not Started` from both the progress list and the summary.
4. **Preserve** — never modify the `### Completed Projects` heading, its table, or
   its `**Note:**` line.

### Step 7 — Preserve everything else (criterion: integrity)

Any row, section, heading, or table cell the sources do not implicate must appear
in the output unchanged. Reconcile and regenerate only what the steps above name;
copy the rest through verbatim.

## Output

Emit the complete compiled report as markdown — the full document, every section,
ready for the human-review stage. Do not emit a diff, a summary of changes, or
commentary around it; the report itself is the deliverable.
