# statusrpt-pr-tables — EDD Iteration Log

Eval-Driven Development evidence for `statusrpt-pr-tables`, per the AI
Maturity Framework Stage 3 (>=2 documented iterations with baseline ->
hypothesis -> change -> measured result -> reasoning).

Eval suite: `evals/skills/statusrpt-pr-tables/tests.yaml` — ONE
reconciliation-run test case, 10 distinct criteria across 20 `dbQuery`
assertions (reconciliation is one atomic unit of work over the whole seeded
DB, not an independently-repeatable per-case fact).
Provider: Kiro CLI, `claude-sonnet-5.5`.
Runner: `task eval:statusrpt-pr-tables CONFIG=promptfooconfig.kiro.yaml`.

## Iteration 0 — RED (no skill)

- **Baseline:** 0/10 criteria. No `skills/statusrpt-pr-tables/SKILL.md`; the
  suite (and the new `dbQuery` assertion mechanism) defined the bar first.
- **Hypothesis:** A skill that (1) classifies every closed-unmerged PR's close
  reason from comments, (2) moves projects on PR-state change, (3) confirms
  completion evidence with four distinct evidence kinds (release-tag,
  website-update, cd-pipeline/npm note, beta-release-via-convention) before
  promoting, (4) maintains the Infrastructure relabel/remove/add lifecycle,
  (5) dedupes Confluence multi-row/multi-PR intake into single projects, and
  (6) writes a full audit trail, will satisfy all 10 criteria.
- **Change:** Wrote the first `SKILL.md`.

## Iteration 1 — GREEN (first real run)

- **Baseline:** 0/10 (Red).
- **Change:** First `SKILL.md` as hypothesised, operating directly on the
  SQLite DB via `sqlite3` INSERT/UPDATE/DELETE.
- **Result:** **10/10 criteria passed (100%)** on the first real execution —
  independently re-verified by querying the resulting DB directly outside
  promptfoo (not just trusting the harness's own report): correct bucket
  moves and `release_confirmed` in both directions (C1/C4), the superseded
  link repoint (C2), a non-empty cited `dropped_reason` (C3), both non-release
  evidence paths — website-update (C5) and the `project_conventions`
  always-beta exception (C6) — correct, the full Infrastructure lifecycle
  (relabel+keep / remove / add, C7) correct, both Confluence intake variances
  deduplicated into one project each with the right PRs linked (C8/C9), and
  the audit trail present (1 run, 19 events, C10).
- **Reasoning:** No harness defect and no skill-logic gap this time — the
  one-reconciliation-run-many-assertions design (fixed during Red, see
  statusrpt-pr-tables RED commit) avoided the race that would have corrupted
  a per-case-test design, and the RTCC structure with one instruction block
  per criterion carried through to a correct first write.

## Iteration 2 — REFACTOR (remove a stance redundancy)

- **Baseline:** 10/10 green.
- **Audit:** Line-by-line load-bearing review found the skill already lean
  (no restated-summary section, no unused inventory). One genuine redundancy:
  the Role section's "treat every status as wrong until the sources prove it"
  and Step 3's opening "decide whether you have real evidence it shipped"
  stated the same adversarial-evidence stance twice.
- **Hypothesis:** Tightening Step 3's opening to state the requirement
  directly ("confirm it actually shipped before promoting it") without
  repeating the Role-level framing loses no criterion.
- **Change:** Reworded Step 3's opening sentence.
- **Result:** **10/10 passed (100%)**. No regression.
- **Reasoning:** The adversarial stance is still carried once, at the Role
  level, where it applies to every step; Step 3 only needed its own
  requirement, not a restatement of why.

## Iteration 3 — Rollback capability (schema + skill + a bug the test caught)

- **Trigger:** a design question — "does the schema have enough to roll back a
  run?" The honest answer with the Green schema was no: `reconciliation_events`
  recorded a prose `detail` but no structured before/after values, and deletes
  were unrecoverable.
- **Change:** added `reconciliation_runs.snapshot_path` (pre-run whole-DB file
  copy — the blunt rollback floor) and `old_value`/`new_value` JSON to
  `reconciliation_events` (surgical per-change reversal); added a `rollback.py`
  helper (snapshot-restore and transactional per-run event reversal); extended
  the skill's Step 6 to snapshot-first and log old/new per change; added two
  eval criteria (events carry old/new; a snapshot_path is recorded).
- **Result (first attempt):** eval 100%, BUT an end-to-end rollback *test*
  (reconcile, then actually run the reversal) FAILED: `no such column:
  project_pull_requests`. Two real bugs surfaced, exactly because the
  capability was tested rather than assumed:
  1. a link repoint is a change to the `project_pull_requests` JOIN table, which
     has no single `id` — the event model and rollback helper only handled
     own-column UPDATE/INSERT/DELETE, so join-table changes had no reversible
     representation;
  2. the rollback applied events without a transaction, so the mid-run failure
     left the DB half-reverted.
- **Fix:** added `project_pull_request` to the event `entity_type` set (entity_id
  0, link identity in the JSON); taught `rollback.py` to reverse join rows by
  composite key; wrapped the whole reversal in one transaction (abort leaves the
  DB untouched); taught the skill to log link changes as `project_pull_request`
  events.
- **Result (after fix):** eval 100%, and the end-to-end proof passes — a full
  reconciliation (24 events) reverses in one transaction and the DB returns
  EXACTLY to seed state (bucket, infra row, and link all restored). Rollback is
  now a verified capability, not an implied one.
- **Reasoning:** "the schema looks sufficient" is not evidence; running the
  rollback is. The join-table gap would have been invisible until the first real
  rollback in production.

## Status

GREEN at 100% (11 criteria, 24 assertions) on Kiro / claude-sonnet-5.5, with
rollback verified end-to-end. Meets Stage 3 §2 (>=3 distinct criteria — this
unit has 11 — 95%+ achievable, mid-tier model) and §3 (documented
Red/Green/Refactor + a tested capability addition). Devin cross-provider run
PENDING on an Improving laptop via
`task eval:statusrpt-pr-tables CONFIG=promptfooconfig.devin.yaml`.
