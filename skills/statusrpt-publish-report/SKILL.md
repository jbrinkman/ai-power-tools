---
name: statusrpt-publish-report
description: >-
  Publish a weekly elasticache-agentic status report draft that the human has
  ALREADY fully reviewed: take the reviewed draft markdown and its bundle
  (both produced earlier by the separate statusrpt-create workflow), and land
  the report into the customer-reports repo on a feature branch with a PR.
  This is the SECOND of two deliberately separate workflows; it does NOT
  create, reconcile, re-gather, or re-compile anything — it publishes exactly
  the reviewed bytes it is given. Use when asked to "publish the reviewed
  report", "I've reviewed it, publish it", "land the status report", or "open
  the report PR", given the reviewed draft path, the bundle path, and the
  destination repo root. Running this skill is the human's explicit go-ahead
  AFTER review — it must never be invoked automatically as a continuation of
  report creation.
---

# Publish the Reviewed Weekly Status Report

## Role

You are the publish workflow — the second of two deliberately separate
workflows. The report has ALREADY been created by `statusrpt-create` and
ALREADY been reviewed by a human; the fact that this skill was invoked at all
IS that human's go-ahead. You do not regenerate, re-reconcile, re-gather, or
re-compile anything — doing so would discard the human's review by producing
bytes they never saw. You publish exactly the reviewed draft you are handed.

If you were somehow invoked without a reviewed draft on disk (no draft path
given, or the path doesn't exist), STOP and say so — the correct first step
is the separate `statusrpt-create` workflow followed by human review, not
regenerating the report here.

## Context — Inputs

- The **reviewed draft** markdown path — the exact bytes to publish,
  unchanged. (Produced by `statusrpt-create`, then reviewed/edited by the
  human.) Read it to extract the H1 title; never rewrite its content.
- The **bundle** (`bundle.json`) path — read `report_date` from it.
- The **destination repo root** — the local `customer-reports` checkout.

## Instructions

### Step 1 — Confirm the reviewed inputs exist

Confirm the draft path and bundle path were given and exist on disk. If
either is missing, stop and tell the user to run `statusrpt-create` and
review the draft first — do NOT attempt to create or compile a report here.

### Step 2 — Delegate to statusrpt-publish

Invoke the `statusrpt-publish` skill with the reviewed draft markdown (as the
compiled report input), the bundle path (for `report_date`), and the
destination repo root. That skill owns the fixed git+gh sequence (sync main →
feature branch → add → commit → push → open PR from the H1), is idempotent on
an existing PR, never force-pushes, and leaves merging to a human. Do not
re-implement any of that here — this workflow's only added responsibility
over `statusrpt-publish` is enforcing that what gets published is a
human-reviewed draft, not a freshly-generated one.

### Step 3 — Report

Report exactly what `statusrpt-publish` reports: the destination file path
written, the branch name, the commit (and whether the GPG fallback was used),
the push result, and the PR URL — new or pre-existing. State plainly that
merging the PR remains a human decision.

## Output

A short summary: draft published, branch, commit, PR URL. Never regenerate
the report; never merge the PR.
