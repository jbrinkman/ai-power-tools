---
name: statusrpt-publish
description: >-
  Publish a weekly elasticache-agentic status report draft that the human has
  ALREADY fully reviewed: write it under the house path/filename convention,
  commit on a feature branch, push, and open a PR titled from the report's H1.
  Use when asked to "publish the status report", "publish the reviewed
  report", "land this week's report", "I've reviewed it, publish it",
  "submit/finalize the status report", or "open the report PR", given the
  reviewed draft markdown path, the bundle (for report_date), and the
  destination repo root. Running this skill IS the human's go-ahead after
  review — it must never be invoked automatically as a continuation of
  statusrpt-create. Does NOT write the narrative (statusrpt-compile) or merge
  the PR (that stays with the human).
---

# Publish the Reviewed Weekly Status Report

## Role

You are the pipeline's landing stage — the last step after
`statusrpt-pr-tables` → `statusrpt-gather` → `statusrpt-compile`, and the
second of two deliberately separate workflows. The report has ALREADY been
created by `statusrpt-create` and ALREADY been reviewed by a human; the fact
that this skill was invoked at all IS that human's go-ahead. You do not
regenerate, re-reconcile, re-gather, re-compile, or edit its prose — doing so
would discard the human's review by producing or publishing bytes they never
saw. You publish exactly the reviewed draft you are handed, verbatim. Your
job past that point is purely mechanical: put the file in the right place
under the right name, land it on a feature branch, and open a PR for a human
to review and merge. You never merge it yourself.

If you were invoked without a reviewed draft on disk (no draft path given, or
the path doesn't exist), STOP and say so — the correct first step is the
separate `statusrpt-create` workflow followed by human review, not
regenerating or guessing at a report here.

## Context — Inputs

- The **reviewed draft** markdown at the path given — the exact bytes to
  publish, unchanged. (Produced by `statusrpt-create`, then reviewed/edited
  by the human.) Read it to extract the H1 title; do not rewrite it.
- The **bundle** (`bundle.json`) at the path given — read `report_date`
  (`YYYY-MM-DD`); it is the single source of truth for the report's date.
- The **destination repo root** given in the request — the local
  `customer-reports` checkout to write into and run git from. Treat every git
  command as running inside that root, trusted as-is. Never assume a
  hardcoded path.

## Allowed Commands (the complete set — nothing outside this list)

This skill runs **only** the following commands, each exactly once except
where a fallback is named, and in this order:

0. `git rev-parse --is-inside-work-tree` — optional pre-flight check that the
   destination repo root is a git working tree before you mutate anything.
0b. `git branch --show-current` — if this already equals
   `elasticache-agentic-status-<YYYY-MM-DD>` (most runs: `statusrpt-create`
   already cut this branch and the report was written there), **skip
   commands 1-3 entirely** — you're already in the right place, and
   checking out `main` here would needlessly pass through it mid-publish.
   Otherwise (a standalone invocation with no prior branch), run 1-3:
1. `git checkout main`
2. `git pull`
3. `git checkout -b elasticache-agentic-status-<YYYY-MM-DD>`
   — fallback if that branch already exists: `git checkout elasticache-agentic-status-<YYYY-MM-DD>`
4. `git add <destination-path>`
5. `git commit -m "docs: add status report for <YYYY-MM-DD>"`
   — fallback on a GPG signing error, retried once: `git commit --no-gpg-sign -m "docs: add status report for <YYYY-MM-DD>"`
6. `git push -u origin elasticache-agentic-status-<YYYY-MM-DD>`
7. `gh pr list --head elasticache-agentic-status-<YYYY-MM-DD>`
8. `gh pr create --title "<H1 title text>" --body "Weekly status report for <YYYY-MM-DD>." --base main`
   — only if Step 7 found no existing PR.

This closed list is the entire interaction with git/gh — there is no other
command to reach for. See Steps 1-9 below for how to derive `<YYYY-MM-DD>`,
the branch name, and the PR title that feed into it.

## Binding Rules (violating any is a defect)

- **Feature branch only.** Never commit to or push `main`/`master` directly.
- **Never force-push.** Plain `git push -u origin <branch>` only — never
  `--force`/`-f`, never a bare `git push` with no explicit branch.
- **Idempotent PR.** Step 7 always runs before Step 8; if it finds an existing
  PR, report its URL and skip Step 8 — do not open a duplicate.
- **GPG fallback.** Retry the commit once with `--no-gpg-sign` only if the
  first attempt fails on a GPG signing error. Do not disable signing
  pre-emptively.
- **No prose edits.** You publish the reviewed bytes verbatim. If the report
  looks wrong, that is compile's job, not yours — report it,
  don't fix it here.
- **No reviewed draft, no publish.** If the given draft path (or bundle path)
  doesn't exist on disk, stop immediately and say so, pointing back to
  `statusrpt-create` — never regenerate, re-compile, or guess at report
  content to fill the gap.

## Instructions

### Step 0 — Confirm the reviewed inputs exist

Confirm the draft path and bundle path were given and exist on disk. If
either is missing, stop and tell the user to run `statusrpt-create` and
review the draft first — do NOT attempt to create or compile a report here.

### Step 1 — Derive the destination path from report_date

1. Read `report_date` from the bundle (`YYYY-MM-DD`).
2. The destination file is, relative to the destination repo root:
   `<YYYY>-status-reports/elasticache-agentic-status-<YYYY-MM-DD>.md`
   where `<YYYY>` is the year from `report_date`.
3. Create the `<YYYY>-status-reports/` directory if it does not exist.

### Step 2 — Derive the branch name

The feature branch is the destination filename without the `.md` extension:
`elasticache-agentic-status-<YYYY-MM-DD>` (e.g.
`elasticache-agentic-status-2099-01-12`).

### Step 3 — Run Allowed Commands 0-0b, then 1-3 only if needed

Running inside the destination repo root. Check 0b first: if you're already
on this run's feature branch (the normal case — `statusrpt-create` cut it),
skip straight to Step 4. Otherwise run 1-3 to sync `main` and cut the branch
yourself.

### Step 4 — Write the report file

Copy the reviewed draft markdown verbatim to the destination path from
Step 1. Do not alter a single byte of its content — same H1, same badges, same
sections. (This is the only file write; the bytes come straight from the
reviewed draft input.)

### Step 5 — Run Allowed Commands 4-5 (stage and commit)

Stage only the destination report file. On a GPG signing error, retry once
with `--no-gpg-sign` as named in Allowed Commands.

### Step 6 — Run Allowed Command 6 (push the feature branch)

Always name the branch explicitly. Never a bare `git push`, never `--force`.

### Step 7 — Extract the PR title from the H1

Read the reviewed draft's first `# ` heading, matching:
`# Amazon ElastiCache - Extended / Improving Vancouver Status Update YYYY-MM-DD`
Use the text after `# ` (without the leading `# `) verbatim as the PR title.

### Step 8 — Run Allowed Commands 7-8 (check for, then open, the PR)

If Command 7 finds an existing PR for the branch, report its URL and stop —
do not run Command 8.

### Step 9 — Report

Tell the user:
- the destination file path written,
- the branch name,
- the commit message (and whether the GPG fallback was used),
- whether the push succeeded,
- the PR URL (new or pre-existing), and
- that merging the PR is left to a human reviewer — you did not merge it.

## Output

A short plain-text summary of the actions above (file path, branch, commit, PR
URL). No report body excerpt, no meta-commentary about the publishing process
itself beyond the summary.
