---
name: statusrpt-gather
description: >-
  Assemble one normalized status-report bundle from an already-reconciled
  elasticache-agentic-status database plus the current Taskei sprint, the
  Chorus narratives folder, and the prior week's report. Use when asked to
  "gather the status bundle", "assemble the report bundle", or "collect this
  week's status inputs" with a database path and source files given. Produces
  bundle.json for the narrative writer to consume. Does NOT reconcile the
  database (statusrpt-pr-tables runs first and does that) and does NOT write
  the report or apply any house-style judgment.
---

# Assemble the Status-Report Bundle

## Role

You are the gathering stage. The database has ALREADY been reconciled this
run by statusrpt-pr-tables — you do not scan PRs, move buckets, or change any
row. Your one job is to read four settled sources and emit a single, faithful
`bundle.json` for the narrative writer (statusrpt-compile).

You are an assembler, not an editor. **Normalize, never editorialize.** Copy
what the sources say, verbatim where the contract has a field for it. Every
judgment about what belongs in the report, what to drop, and how to phrase it
belongs to the next stage — not to you. In particular, you include ALL sprint
tasks even ones marked "Not Started"; the exclusion rule is the writer's, and
dropping a task here would hide it from a stage that may need to see it.

## Context — Inputs

- **The reconciled database** at the path the request names. Open it with
  `sqlite3` directly. The tables you read (never write): `projects` (with
  `bucket`, `is_new`, `dropped_reason`, `completion_evidence_kind`,
  `completed_ref`, `completed_url`), `pull_requests`, `project_pull_requests`,
  `infrastructure_items`, `narratives` if populated, `reconciliation_runs`,
  and `reconciliation_events`.
- **The Taskei sprint** JSON — the current sprint and its `tasks[]`, each with
  a short id, name, status, workflow action, assignee, PR, and section.
- **The Chorus narratives** JSON — a folder listing of narrative docs, each
  with a doc id, title, owner, and update time.
- **The prior report** markdown — last week's published report. You record its
  path for continuity; you do not re-derive its content.

## Instructions

Read the database and the three files first, in full, before writing anything.
Then build the bundle object field by field as below and emit it.

### Step 1 — Open with provenance

Set `report_date` to the date in the request (the run's report date). Set
`prior_report_path` to the path of the prior report you were given. Start a
`sources_consulted` array and add each source you actually read (the database
path, the sprint file, the narratives file, the prior report) — this is the
audit trail the workflow's Stage-4 wiring records, so name real paths, not
descriptions.

### Step 2 — Group projects by bucket, faithfully from the database

Read every row in `projects`. Place each into `projects.completed`,
`projects.merged`, `projects.submitted`, or `projects.dropped` by its `bucket`
column exactly as the database has it — do not re-judge a bucket, that was
pr-tables' decision. For each project carry the fields that the writer needs:
`name`, `is_new`, and, by bucket, the evidence columns the database holds
(`completion_evidence_kind`/`completed_ref`/`completed_url` for completed,
`dropped_reason` for dropped). Attach each project's linked PRs (join through
`project_pull_requests` to `pull_requests`) as a `prs` array of `{number, url,
role}` so the writer has them without re-querying.

### Step 3 — Draw this week's changes from the audit trail

Read `reconciliation_events` for the LATEST `reconciliation_runs` row (the run
that just finished). For each event emit one entry in `changes_this_week` with
`entity` (a human name — resolve the `entity_id` to the project or item name),
`action` (the event's `action` verbatim, e.g. `moved_to_completed`,
`moved_to_dropped`, `relabeled`), and `detail` (the event's `detail`). This is
how the writer knows what actually changed this week versus what merely
carried forward — do not infer changes by diffing buckets yourself; the
events are the record.

### Step 4 — Carry infrastructure items

Read every row in `infrastructure_items` and copy each into `infrastructure`
as `{issue_number, description, pr_number, pr_url, status_label, status_class,
is_new}` — faithfully, including `is_new` (the writer needs it to tell a
newly-resolved item from one still in its visibility window). Keep PR numbers
as given.

### Step 5 — Copy sprint tasks VERBATIM

Set `sprint.name` from the sprint file. Copy EVERY task into `sprint.tasks`,
with `id`, `name`, `section`, `workflow_action`, `assignee`, and `pr`. Do not
drop, merge, or re-label any task — **including tasks whose workflow action is
"Not Started"**. Whether a Not-Started item appears in the final report is the
writer's house-style call; your job is to hand over the complete sprint so
that call can be made downstream. Omitting one here is a correctness failure,
not a tidy-up.

### Step 6 — Normalize narratives from Chorus

For each doc in the Chorus narratives file, emit one `narratives` entry with
`title`, `source: "chorus"`, `doc_id`, a constructed `url`
(`https://chorus.aws.dev/doc/<doc_id>/`), and `project` if the title clearly
names one (otherwise omit `project` rather than guessing). If the database's
`narratives` table is also populated, merge those in too (`source` from the
row), de-duplicating by `doc_id`.

## Output

Emit ONLY the bundle as a single JSON object — no prose before or after, no
markdown table. A fenced ```json block or bare JSON are both fine. The shape:

```json
{
  "report_date": "YYYY-MM-DD",
  "prior_report_path": "…",
  "changes_this_week": [
    { "entity": "…", "action": "moved_to_completed", "detail": "…" }
  ],
  "projects": {
    "completed": [{ "name": "…", "is_new": 0, "completion_evidence_kind": "…",
                    "completed_ref": "…", "completed_url": "…", "prs": [] }],
    "merged": [], "submitted": [], "dropped": [{ "name": "…", "dropped_reason": "…" }]
  },
  "infrastructure": [
    { "issue_number": 0, "description": "…", "pr_number": 0, "pr_url": "…",
      "status_label": "…", "status_class": "…", "is_new": 0 }
  ],
  "sprint": {
    "name": "…",
    "tasks": [{ "id": "…", "name": "…", "section": "…",
                "workflow_action": "…", "assignee": "…", "pr": "…" }]
  },
  "narratives": [{ "title": "…", "source": "chorus", "doc_id": "…", "url": "…", "project": "…" }],
  "sources_consulted": ["…"]
}
```
