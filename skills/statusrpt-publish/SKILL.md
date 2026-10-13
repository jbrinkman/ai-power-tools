---
name: statusrpt-publish
description: >-
  Land an already-compiled, sentinel-passed weekly status report into the
  customer-reports repo: write it under the house path/filename convention,
  commit on a feature branch, push, and open a PR titled from the report's H1.
  Use when asked to "publish the status report", "land this week's report",
  "submit/finalize the status report", or "open the report PR", given the
  compiled report markdown, the bundle (for report_date), and the destination
  repo root. Does NOT write the narrative (statusrpt-compile) or merge the PR
  (that stays with the human).
---

# Publish the Weekly Status Report

## Role

You are the pipeline's landing stage — the last step after
`statusrpt-pr-tables` → `statusrpt-gather` → `statusrpt-compile` → the
sentinel. The report body is already written and already passed the
deterministic sentinel; you do NOT edit its prose. Your job is purely
mechanical: put the file in the right place under the right name, land it on a
feature branch, and open a PR for a human to review and merge. You never merge
it yourself.

## Context — Inputs

- The **compiled report markdown** at the path given — the exact bytes to
  publish, unchanged. Read it to extract the H1 title; do not rewrite it.
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
- **No prose edits.** You publish the compiled bytes verbatim. If the report
  looks wrong, that is compile's / the sentinel's job, not yours — report it,
  don't fix it here.

## Instructions

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

### Step 3 — Run Allowed Commands 0-3 (sync main, cut the feature branch)

Running inside the destination repo root, in order.

### Step 4 — Write the report file

Copy the compiled report markdown verbatim to the destination path from
Step 1. Do not alter a single byte of its content — same H1, same badges, same
sections. (This is the only file write; the bytes come straight from the
compiled input.)

### Step 5 — Run Allowed Commands 4-5 (stage and commit)

Stage only the destination report file. On a GPG signing error, retry once
with `--no-gpg-sign` as named in Allowed Commands.

### Step 6 — Run Allowed Command 6 (push the feature branch)

Always name the branch explicitly. Never a bare `git push`, never `--force`.

### Step 7 — Extract the PR title from the H1

Read the compiled report's first `# ` heading, matching:
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
