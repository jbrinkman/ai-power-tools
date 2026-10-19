---
name: statusrpt-pr-tables
description: >-
  Reconcile the elasticache-agentic-status SQLite database against live GitHub
  and Confluence state. Use when asked to "reconcile the PR tables", "update
  the project database", "run pr-tables reconciliation", or "sync the status
  database" with a database path and source files (GitHub PR data, a
  Confluence tracker) given. Moves projects between buckets, repoints
  superseded PR links, classifies dropped reasons, confirms completion
  evidence (release, website update, CD pipeline, beta convention), maintains
  the Infrastructure item lifecycle, and writes an audit trail. Does not
  write the narrative report itself.
---

# Reconcile PR/Project Database

## Role

You are the reconciliation stage. You own one database as the source of
truth for every tracked project, PR, and infrastructure item. You decide and
write every change yourself — no questions, no report prose. Treat every
status as wrong until the sources prove it; a project's bucket, a PR's close
reason, and a completion claim are all judgment calls you make from evidence,
not assumptions.

## Context — Inputs

- The database at the path the request names. Open it with `sqlite3` directly
  (read the schema with `.schema` first if unfamiliar with a table).
- `gh-api-responses.json` — live PR state keyed `"<owner>/<repo>#<n>"`:
  `state`, `merged`, `merged_at`, `closed_at`, optional `releases[]`
  (`tag_name`, `html_url`, `body`), `closed_comments[]`, `successor`, and for
  some entries a `website_check` object. Ignore any `_comment`/`_expect` keys
  — fixture annotations, not data.
- `confluence-tracker.html` — the PR Status Tracker. The leading edge: new
  work appears here before it exists in the database at all.

## Instructions

Open the database first and read every row in `projects`, `pull_requests`,
`project_pull_requests`, `infrastructure_items`, and `project_conventions` so
you have the full starting state before making any change. Then work the
steps below IN ORDER — the ordering is load-bearing: a brand-new project or
PR must exist in the database before you scan PR state, or its status won't
be checked until next week's run.

### Step 1 — Snapshot before any mutation

**Before writing anything**, copy the whole database file to a timestamped
snapshot (e.g. `cp <db> <db-dir>/snapshots/<db-stem>-<run_date>.db`), creating
the `snapshots/` directory if needed. This is the rollback floor: restoring
that file always undoes the run. Insert one row into `reconciliation_runs`
for this run (`run_date` = today, `snapshot_path` = the snapshot you just
wrote, `source_summary` noting which files you consulted); you'll set
`finished_at` at the end.

### Step 2 — Intake new work from the Confluence tracker FIRST

Do this before scanning any PR's live state, so a project or PR that is new
this run is already in the database by the time Step 4 checks `gh-api-
responses.json` against it — otherwise it would sit untracked for a full
extra week before its first status check.

The tracker is read as **rows describing projects**, not literal 1:1 rows —
decide the real project boundary before writing anything:

- Two or more tracker rows for a project you haven't seen before, naming the
  SAME or an obviously related project (e.g. "Brand New Integration" and
  "Brand New Integration (docs)"), are **one** project with multiple PRs —
  insert exactly one `projects` row, then link every PR you found across all
  of those rows to it via `project_pull_requests` (give each a `role` if the
  rows distinguish them, e.g. "implementation" vs "documentation").
- A single tracker row whose PR cell lists more than one PR link is also one
  project with multiple PRs — link all of them.
- Skip any tracker PR already linked to an existing project (no duplicate
  project rows for PRs you already track).
- A brand-new project's initial bucket is `submitted` unless the tracker
  already shows it merged/closed.

Also, for every PR in `confluence-tracker.html` that targets the
infrastructure/terraform repo and has no matching row in
`infrastructure_items` (by `pr_number`), **insert** a new row here: issue
number and URL from the tracker, description, PR number and URL, and the
status label as the tracker shows it — so Step 5 can also check its live
state in this same run.

### Step 3 — Classify every closed, unmerged PR

For each PR in `gh-api-responses.json` with `state: closed` and
`merged: false` — including any PR you just linked in Step 2 — read its
`closed_comments` and decide:

- a comment says the content shipped via a different PR → `merged-elsewhere`
- a comment says the PR was continued/rebased in another, still-open PR →
  `superseded`; set `successor_owner`/`successor_repo`/`successor_number` from
  the `successor` field, and **repoint** the project's link in
  `project_pull_requests`/rendering to the successor PR (link the successor
  PR row itself via `project_pull_requests` if not already linked)
- a comment is an explicit maintainer rejection ("won't accept", "not
  aligned") → `rejected`
- nothing in the comments clarifies it → `ambiguous`

Write `close_reason` and a short `close_evidence` quote on the `pull_requests`
row for every closed-unmerged PR you examine, regardless of what action it
triggers next.

### Step 4 — Move projects whose PR state changed

For each project currently `submitted` — including any you just inserted in
Step 2 — check its linked PR(s) in `gh-api-responses.json`:

- any linked PR now `merged: true` → move the project to `merged` (bucket
  update on `projects`); it may be promoted further in Step 5
- a linked PR's `close_reason` is `rejected` → move the project to `dropped`,
  and set `dropped_reason` to a short, specific sentence citing the rejection
  (don't leave it blank)
- a linked PR's `close_reason` is `superseded` → the project **stays**
  `submitted` (its new, open successor is still being tracked)
- a linked PR's `close_reason` is `merged-elsewhere` → treat as merged (same
  as the first case)

### Step 5 — Confirm completion evidence before promoting to `completed`

For each project in `merged` with at least one `merged: true` PR, confirm it
actually shipped before promoting it. **Check `project_conventions` for this
project first** — a recorded exception (e.g. `always-beta`) changes what
counts as sufficient evidence, so look before you judge.

1. If a linked PR has `releases[]` and ANY release's `body` text references
   that PR's number → that is the confirmed release. Set
   `release_confirmed = 1`, `release_tag`/`release_url` to that release, and
   `release_evidence` to the matching excerpt. Promote the project to
   `completed`, `completion_evidence_kind = 'release-tag'`,
   `completed_ref`/`completed_url` from the release.
2. If `releases[]` exist but NONE reference the PR → leave `release_confirmed
   = 0` and the project in `merged`. Do not promote on an unrelated release.
3. If there is no release at all, check for other evidence in the fixture
   (`website_check`, a CD-pipeline note, an npm-publish note). A confirmed
   `website_check.found = true` → promote to `completed`,
   `completion_evidence_kind = 'website-update'`, and set
   `completion_evidence` to the check's own `evidence` text (quote it, don't
   paraphrase away the specifics).
4. If the project has an `always-beta` convention and the only release is a
   beta tag (e.g. `v0.9.0-beta`) → that beta tag IS sufficient evidence for
   this project. Promote to `completed`, `completion_evidence_kind =
   'beta-release'`, citing the beta release as `completed_ref`/`completed_url`
   and noting the convention in `completion_evidence`. Do not leave it
   unpromoted or flag it as unconfirmed — the convention exists precisely so
   you don't re-litigate this every run.
5. If none of the above apply, leave the project in `merged`.

### Step 6 — Reconcile Infrastructure item status

For each row in `infrastructure_items` (including any you inserted in
Step 2):

- if its `status_label` is already a plain `Merged` or `Closed` with
  `is_new = 0` → it resolved in a **prior** run and has had its week of
  visibility. **Delete the row.**
- if its PR is `merged: true` or newly closed in `gh-api-responses.json` and
  the row doesn't already reflect that → update `status_label` to `Merged`
  (or `Closed`), `status_class` to `green` (or `red`), set `is_new = 1`, and
  **keep** the row this run (the next run's cleanup removes it).
- if its PR is still `open` → leave the row unchanged.

### Step 7 — Write the audit trail and finish

For every change you made in Steps 2–6 — a bucket move, a relabel, a link
repoint, an insert, a delete — insert one `reconciliation_events` row with:

- `entity_type`, `entity_id`, an `action` (e.g. `moved_to_completed`,
  `link_repointed`, `added`, `removed`);
- `old_value` and `new_value` as JSON objects making the change mechanically
  reversible — for an INSERT, `old_value` is NULL and `new_value` is the new
  row's key columns; for a DELETE, `new_value` is NULL and `old_value` is the
  ENTIRE row being deleted (so it can be reinserted); for an UPDATE, both hold
  only the columns that changed, before and after. A change to a
  `project_pull_requests` LINK (adding, removing, or repointing) is logged
  with `entity_type = 'project_pull_request'`, `entity_id = 0`, and the link's
  identity — `project_id`, `pull_request_id`, and `role` — in the JSON (since
  the join table has no single id);
- `detail`, a sentence saying what changed and why.

Set `reconciliation_runs.finished_at` once you're done.

## Output

Make every change directly in the database with `sqlite3` (INSERT/UPDATE/
DELETE statements). Do not render a report or markdown table — the database
rows and the audit trail ARE the output. When finished, report a short
summary of what you changed (counts by action), not the full row contents.
