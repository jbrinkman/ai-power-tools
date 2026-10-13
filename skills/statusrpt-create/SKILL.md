---
name: statusrpt-create
description: >-
  Create (but do NOT publish) the weekly elasticache-agentic status report:
  reconcile the database, assemble the bundle, write the narrative, and run
  the deterministic sentinel gate — then STOP and hand the draft to the human
  for review. This is the FIRST of two deliberately separate workflows; it
  never pushes, commits, or opens a PR, and it has no path to publishing. Use
  when asked to "create this week's status report", "draft the weekly report",
  "build the status report for review", or "run the report-creation
  pipeline", given the source files (database path, GitHub PR data, Confluence
  tracker, Taskei sprint, Chorus narratives folder, prior report) and the
  report date. Publishing is a SEPARATE skill (statusrpt-publish-report) the
  human invokes AFTER they have fully reviewed this draft — the two are not
  linked and must not be automated into one run.
---

# Create the Weekly Status Report (for review, not for publishing)

## Role

You are the report-creation workflow — the first of two deliberately separate
workflows. You run the four creation stages in order and produce a reviewed-
ready draft on disk. **You stop there.** You do NOT publish, commit, push, or
open a PR, and you do not invoke, suggest invoking, or "continue into" the
publish workflow. The hard stop after this workflow is a human-in-the-loop
boundary by design: a person must fully review the draft before any publish
happens, and that review is not something this run can satisfy, shortcut, or
hand off automatically.

```
statusrpt-pr-tables → statusrpt-gather → statusrpt-compile → sentinel → [STOP — human review]
   (reconcile DB)      (assemble bundle)   (write narrative)  (gate)
```

Publishing is the SEPARATE `statusrpt-publish-report` skill, which the human
invokes themselves after review. This skill does not call it, and must not.

## Context — Inputs

Collect these from the request (ask only for what's missing):

- The report **date** (`YYYY-MM-DD`) for this run.
- The **database path** (elasticache-agentic-status SQLite DB).
- pr-tables' sources: live GitHub PR data (`gh-api-responses.json` or
  equivalent) and the Confluence tracker.
- gather's remaining sources: the current Taskei sprint, the Chorus
  narratives folder listing, and the **prior week's report** path.

You do NOT need (and must not ask for) the destination repo root — that
belongs to the publish workflow, not this one.

## Instructions

### Step 1 — Run statusrpt-pr-tables

Invoke the `statusrpt-pr-tables` skill with the database path and its two
source files. Do not proceed until it reports completion — gather's
precondition is an ALREADY-reconciled database. If pr-tables reports an
ambiguous classification it couldn't resolve, stop and surface that to the
user before continuing; don't guess on its behalf.

### Step 2 — Run statusrpt-gather

Invoke `statusrpt-gather` with the SAME (now-reconciled) database path, the
Taskei sprint, the Chorus narratives folder, and the prior report path, plus
this run's report date. Its only output is `bundle.json` — keep it; the
publish workflow will need it later for `report_date`, so write it to a
known path alongside the draft (see Step 5).

### Step 3 — Run statusrpt-compile

Invoke `statusrpt-compile` with the bundle from Step 2 and the prior report
path (for continuity). Its only output is the compiled report markdown.

### Step 4 — Run the sentinel gate

Run the deterministic sentinel against compile's output (plain code, invoke
it directly — not an agent skill):

```js
const sentinel = require('<repo>/sentinels/statusrpt-sentinel/sentinel.js');
const { ok, findings } = sentinel.runAll(compiledReportText, { knownNames: [] });
```

- `ok === false` (an error-severity finding): the draft has a mechanical
  defect. Report every finding; do NOT present the draft as review-ready and
  do NOT patch the text yourself (that's a compile fix). The workflow ends
  here, failed.
- `ok === true` with `warning` findings (e.g. a dangling strikethrough):
  continue, but carry the warnings into your hand-off so the human sees them.

### Step 5 — Write the draft to disk and STOP

Write the compiled report and its bundle to a known, stable location the
human (and later the publish skill) can find — e.g. a `drafts/` directory
the request names or, by default, next to the prior report as
`<report-date>-DRAFT.md` plus `<report-date>-bundle.json`. State both paths
explicitly in your hand-off.

Then **stop and hand off to the human.** Your final message:
- states the draft path and the bundle path,
- summarizes what pr-tables changed (counts by action) and whether the
  sentinel passed clean or with warnings (list any warnings),
- tells the user to review the draft fully, and
- tells them that when they are satisfied, publishing is a SEPARATE step they
  invoke themselves via `statusrpt-publish-report` with the draft and bundle
  paths — you will not and cannot do it as part of this run.

Do not offer to publish, do not ask "shall I publish now", and do not treat a
casual "looks good" as authorization to continue — publishing is a distinct
workflow the human starts deliberately.

## Output

A hand-off summary only: the draft path, the bundle path, pr-tables change
counts, sentinel result (+ any warnings), and the explicit instruction that
publishing is the separate `statusrpt-publish-report` workflow to run after
review. Never a PR, never a push, never a "continuing to publish".
