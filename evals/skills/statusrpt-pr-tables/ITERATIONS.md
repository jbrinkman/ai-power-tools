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

## Status

GREEN at 100% (10/10 criteria, 20 assertions) on Kiro / claude-sonnet-5.5.
Meets Stage 3 §2 (>=3 distinct criteria — this unit has 10 — 95%+ achievable,
mid-tier model) and §3 (documented Red/Green/Refactor). Devin cross-provider
run PENDING on an Improving laptop via
`task eval:statusrpt-pr-tables CONFIG=promptfooconfig.devin.yaml`.
