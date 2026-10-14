---
name: statusrpt-create
description: >-
  Create the weekly elasticache-agentic status report: reconcile the
  database, assemble the bundle, write the narrative, and leave a
  reviewed-ready draft on disk. Use when asked to "create this week's status
  report", "draft the weekly report", "build the status report for review",
  or "run the report-creation pipeline". Runs end-to-end from a bare
  invocation; every input defaults and may be overridden in the request.
---

# Create the Weekly Status Report (for review, not for publishing)

## Role

You are the report-creation workflow. Your single responsibility is: verify
you're in the right workspace, confirm the repo is ready, run the three
creation stages in order, and produce a reviewed-ready draft on disk. **You
stop there.** You do NOT publish, commit, push, or open a PR. The hard stop
after this workflow is a human-in-the-loop boundary by design: a person must
fully review the draft before any publish happens, and that review is not
something this run can satisfy, shortcut, or hand off automatically. What
happens to the draft after you hand it off is outside this skill's
responsibility — you do not need to know, name, or reason about whatever
reads it next.

```
[workspace check] → [pre-flight + cut branch] → statusrpt-pr-tables → statusrpt-gather → statusrpt-compile → [STOP — human review]
  (right repo/folder)    (off main, onto this        (reconcile DB)      (assemble bundle)   (write narrative)
                          run's feature branch)
```

## Context — Inputs

Every input below has a baked-in default, so a bare invocation
("create this week's status report") runs end-to-end **without stopping to
ask the user anything.** The user may override any default by naming a
different value in their request; absent an override, use the default and
proceed. Do NOT prompt, confirm, or pause for any of these — only surface a
value back to the user if resolving a default genuinely fails (e.g. the
database file does not exist, or the Confluence page returns an error).

- **Report date** — defaults to the upcoming Monday (the report always
  covers a week ending the following Monday) unless the request names a
  different date. Compute it; don't ask.
- **The database** — defaults to the elasticache-agentic-status DB this
  project already uses (`/Users/jbrinkmy/Projects/elasticache-agentic-status/
  elasticache-agentic.db`), unless the request names a different path.
  Which GitHub repos/PRs to check comes FROM the database itself (every PR
  already tracked in `pull_requests`) — you don't need the user to enumerate
  repos; you fetch live GitHub state yourself for the PRs already on file
  plus whatever the Confluence tracker below surfaces as new (see Step 3).
- **The Confluence PR tracker page** — defaults to page **`4063395841`**
  (the elasticache-agentic PR Status Tracker), read via `atlassian-cli
  confluence page get`. Don't ask; only override if the request names a
  different page.
- **The Taskei room and sprint** — the room defaults to **"Improving
  Elasticache Agentic"** (`284e66bb-e41a-4584-8d6c-a0c05f221818`); don't ask
  for it. Within that room, default to the **latest/current sprint** —
  resolve it yourself (the sprint whose date range contains the report date,
  or the most recent) rather than asking. Only override if the request names
  a different room/sprint.
- **The Chorus narratives folder** — defaults to `fld_vAeTIroVanoh` (the
  elasticache-agentic Narratives folder); don't ask. Read the narrative docs
  directly from it via the Chorus tools. Only override if the request names a
  different folder.
- **The prior week's report** — defaults to the most recent file under this
  project's `<year>-status-reports/` directory; don't ask. Only override if
  the request names a specific one (if none exists yet, proceed without a
  prior report rather than asking).

You do NOT need (and must not ask for) the destination repo root — landing
the report on a branch and opening a PR is outside this skill's
responsibility.

## Instructions

### Step 1 — Locate the project folder and verify it

This skill may be invoked from anywhere inside the `customer-reports`
checkout — the repo root, a sibling customer's folder, or already inside
`amazon-elasticache-agentic/`. Locate the right folder yourself rather than
assuming the current directory is it:

1. `git rev-parse --show-toplevel` — the repo root. Then `git remote
   get-url origin` — must resolve to the `Bit-Quill/customer-reports` repo
   (any URL form). If it doesn't, stop: this working tree is the wrong repo
   entirely, and no subfolder search inside it will fix that.
2. The project folder is `<repo-root>/amazon-elasticache-agentic` —
   construct this absolute path from the repo root found in check 1; do not
   rely on the current directory already being it. Confirm the directory
   exists. (This repo holds ~20 other customer folders side by side,
   including the similarly-named `amazon-elasticache` — that is a different
   folder and never a substitute.)
3. Confirm **at least one** `<year>-status-reports/` directory exists
   directly under that project folder (e.g. `2026-status-reports/`) — a
   general sanity check that this is really the report project, not a check
   for this run's specific year (Step 6 handles that, including creating a
   new year's folder on its first use). If none exist at all, stop — this
   does not look like the report folder even if checks 1-2 passed.

If all three confirm, treat `<repo-root>/amazon-elasticache-agentic` as this
run's project root for the rest of the skill, regardless of where you were
invoked from — every path from here (the DB default, `<year>-status-
reports/`, the report filename, and every git command in Step 2) is
relative to THAT folder, not the original working directory. `cd` there (or
otherwise anchor all subsequent commands to it) before continuing. If any
check fails, stop and tell the user exactly which check failed and what you
found instead — do not guess a corrected path and do not fall back to a
different directory.

### Step 2 — Pre-flight: confirm the repo is ready, then cut this run's branch

Before touching the database, confirm this project's git state is clean, the
prior week's report has actually landed, and get off `main` before any
report content is created — so nothing from this run can land on `main` by
accident:

1. `gh auth status` — if it fails, stop and tell the user to run
   `gh auth login`, then re-invoke this skill.
2. `git status --porcelain` — if it reports anything, stop and tell the user
   to commit, stash, or discard those changes before starting a new report.
3. `git checkout main` then `git pull` — get this checkout onto `main` and
   synced with `origin/main`.
4. `gh pr list --state open --author @me` — if this lists any open PR (the
   prior week's report, almost always), stop and tell the user that report's
   PR must be merged or closed first; name the PR(s) found. Do not proceed
   until this returns empty.
5. `git checkout -b elasticache-agentic-status-<YYYY-MM-DD>` (this run's
   report date) — fallback if that branch already exists from a prior,
   interrupted run of this same report: `git checkout elasticache-agentic-
   status-<YYYY-MM-DD>`. From here through Step 6, every step of this skill
   runs on this branch, never on `main`.

Only once all five pass do you continue to Step 3.

### Step 3 — Fetch live PR state, then run statusrpt-pr-tables

`statusrpt-pr-tables` itself reads a PR-state file shaped
`gh-api-responses.json` (keyed `"<owner>/<repo>#<n>"`: `state`, `merged`,
`merged_at`, `closed_at`, optional `releases[]`, `closed_comments[]`,
`successor`) rather than calling `gh` itself — fetching that data live is
this orchestrator's job, not something to change in pr-tables (which is
already certified against that exact file contract).

1. Query every PR currently tracked in the database's `pull_requests` table
   (`owner`, `repo`, `number`) plus any new ones the Confluence tracker page
   names, via `gh api`/`gh pr view`, to build that same JSON shape.
2. Write it under `$KIROCREW_SCRATCH` (e.g. `$KIROCREW_SCRATCH/statusrpt-
   run-<report-date>/gh-api-responses.json`) — **never inside this
   project's working tree**, not even in a dotfile or hidden folder. This
   project only ever receives the two files Step 6 writes (the report and
   its bundle sidecar); every other working file (fetched PR state, the
   Confluence tracker fetch, intermediate scratch) belongs under
   `$KIROCREW_SCRATCH` and must never be placed under `<year>-status-
   reports/` or the project root.
3. Invoke `statusrpt-pr-tables` with the database path, that live-fetched
   file, and the Confluence tracker page.

Do not proceed until it reports completion — gather's precondition is an
ALREADY-reconciled database. If pr-tables reports an
ambiguous classification it couldn't resolve, stop and surface that to the
user before continuing; don't guess on its behalf.

### Step 4 — Run statusrpt-gather

Invoke `statusrpt-gather` with the SAME (now-reconciled) database path, the
Taskei sprint/room, the Chorus narratives folder, and the prior report path,
plus this run's report date. Its only output is `bundle.json` — keep it;
write it to a known path alongside the draft (see Step 6).

### Step 5 — Run statusrpt-compile

Invoke `statusrpt-compile` with the bundle from Step 4 and the prior report
path (for continuity). Its only output is the compiled report markdown.

### Step 6 — Write the report to disk and STOP

Write the compiled report to this project's `<year>-status-reports/`
directory, where `<year>` is derived from **this run's report date**
(the date resolved in Context — Inputs, not today's date), using the
standard report filename:

```
<project>/<YYYY>-status-reports/elasticache-agentic-status-<YYYY-MM-DD>.md
```

e.g. for report date 2026-10-12: `2026-status-reports/elasticache-agentic-
status-2026-10-12.md`. For report date 2027-01-05:
`2027-status-reports/elasticache-agentic-status-2027-01-05.md` — a
different year than the folders you confirmed exist in Step 1, which is
expected at a year boundary, not an error.

If `<YYYY>-status-reports/` for this run's year does not exist yet, create
it — the first report of a new year always starts a new folder. This is the
one point where a missing year-folder is correct and expected, as distinct
from Step 1's check that at least one such folder exists at all.

This filename is the report's permanent name — whatever lands it on a branch
and opens a PR later uses this exact file, on the SAME feature branch
(`elasticache-agentic-status-<YYYY-MM-DD>`) you cut in Step 2 and have
remained on this entire run. The report is never written while `main` is
checked out.

Write the bundle as a sidecar next to it:
`elasticache-agentic-status-<YYYY-MM-DD>-bundle.json`. State both paths
explicitly in your hand-off.

Then **stop and hand off to the human.** Your final message:
- states the report path, the bundle path, and the branch name,
- summarizes what pr-tables changed (counts by action),
- tells the user to review the report fully, and
- tells them that once they're satisfied, publishing it is a separate,
  deliberate step they take themselves — you will not and cannot do it as
  part of this run.

Do not offer to publish, do not ask "shall I publish now", and do not treat a
casual "looks good" as authorization to continue — publishing is a distinct
step the human starts deliberately.

## Output

A hand-off summary only: the report path, the bundle path, the branch name,
pr-tables change counts, and a plain statement that publishing is a separate
step for the human to take when ready. Never a PR, never a push, never a
"continuing to publish".
