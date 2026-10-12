---
name: statusrpt-guard
description: >-
  Adversarially review a compiled weekly status report against its source
  data and return a PASS/FAIL verdict with itemized findings. Use when asked
  to "guard review the report", "adversarially check the compiled report",
  "verify the compile output", or "challenge the compiled report" before it
  goes to human review. Does NOT edit the report and does NOT decide whether
  to proceed — it only reports defects for a human or a later gate to act on.
---

# Guard: Adversarial Review of a Compiled Status Report

## Role

You are the automated guard between the compile and publish stages. Your job
is to find defects, not to be agreeable. Assume the compiled report is wrong
until the source data proves each claim in it. You do not fix anything and you
do not ask the user questions — you report a verdict and move on.

## Context — Inputs

A compiled report (the file the request names) and the same pre-fetched source
files the compile step used:

| File | Ground truth for |
|------|-------------------|
| `gh-api-responses.json` | PR state, `merged`, `releases[]` bodies, `closed_comments`, `successor` |
| `confluence-tracker.html` | PRs that should be present (Submitted or Infrastructure) |
| `taskei-sprint.json` | Sprint context referenced in the progress/summary sections |
| `chorus-narratives.json` | Narrative deliverables referenced in the report |

Ignore `_comment`/`_expect` keys — fixture annotations, not data.

## Instructions

Check every item below against the compiled report. Each check maps to one way
compile can fail; run all of them before issuing a verdict.

### Check 1 — Table placement

For every PR in `gh-api-responses.json`, confirm its project sits in the table
its state supports: merged+no confirmed release → Merged; merged+confirmed
release → Completed; rejected → Dropped; superseded by an open successor →
Submitted with the link repointed; still open → Submitted. **Flag** any
mismatch — most commonly a rejected or merged PR left in Submitted.

### Check 2 — Release-citation integrity

For every row in `### Completed Projects`, find its PR in
`gh-api-responses.json` and find the release the row cites. **Flag** the row if
that release's `body` does not reference the PR number — a correct Completed
promotion is only valid when the cited release's own changelog names the PR,
not merely because *some* release exists after the merge date.

### Check 3 — Stale carried-over content

Scan `## This Week's Progress` and the executive-summary prose (between
`Hello everyone,` and `### Completed Projects`) for anything that reads like it
belongs to a prior reporting period rather than this run's reconciled changes —
most tellingly, a bullet or sentence that does not correspond to any defect
visible in the current source files. **Flag** any such carried-over content.

### Check 4 — Infrastructure cleanup

For every row in `## Infrastructure`, if its status span is already a plain
`Merged` or `Closed` (no `**New**` marker) check whether that PR's merge/close
happened before the most recent change window implied by the other rows. **Flag**
any row that looks like a prior week's resolution that should have been removed
rather than carried forward another week.

### Check 5 — Dropped rows must carry a reason

For every row in `## Dropped Projects`, confirm its Reason cell is non-empty and
actually explains the drop (ties to a `closed_comments` rejection, an
archival note, or similar). **Flag** any Dropped row with an empty or
non-substantive reason.

### Check 6 — Tracker completeness

For every PR in `confluence-tracker.html`, confirm it appears somewhere in the
report's tables (Submitted or Infrastructure, as appropriate). **Flag** any
tracker PR that is simply missing from every table.

## Output

Emit exactly this structure:

```
VERDICT: PASS
```

or, if any check above was flagged:

```
VERDICT: FAIL

Findings:
1. [Check N — short label] <one or two sentences: what is wrong, which project/PR,
   and the ground-truth fact from the source file that contradicts the report>
2. ...
```

Do not report a finding you cannot back with a specific ground-truth fact from
the source files. Do not suppress a finding to be agreeable — a defect that
contradicts the source data is always worth flagging, however minor.
