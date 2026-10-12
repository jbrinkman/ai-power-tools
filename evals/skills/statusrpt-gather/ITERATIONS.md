# statusrpt-gather — EDD iteration log

Eval-Driven Development record for the gathering stage. Runner: Promptfoo.
Provider/grader: Kiro / claude-sonnet-5.5. Output is a JSON bundle, graded by
the custom `jsonBundle.js` assertion (dotted-path equals/exists/arrayLength/
arrayContains over the parsed output).

## Unit boundary

gather reads an ALREADY-RECONCILED database (statusrpt-pr-tables runs first
in the weekly workflow and owns all reconciliation; gather never scans PRs or
moves buckets) plus the Taskei sprint, the Chorus narratives folder, and the
prior report, and emits ONE normalized `bundle.json` for statusrpt-compile.

Design principle, confirmed with the user: gather **normalizes but does not
editorialize**. It copies every sprint task verbatim, including ones marked
"Not Started"; the house-style exclusion rule belongs to the writer, not here.
This keeps gather's eval surface free of house-style judgment to grade.

## Iteration 1 — RED

- Wrote 7 distinct criteria as one assembly test (one bundle built from
  several independent facts is one unit of work — same single-test reasoning
  as statusrpt-pr-tables' reconciliation run): provenance (C1), faithful
  bucket grouping from the DB (C2), changes_this_week sourced from
  `reconciliation_events` not bucket-diffing (C3), infrastructure carried with
  `is_new` (C4), sprint tasks verbatim incl. Not-Started (C5), narratives
  normalized from Chorus (C6), `sources_consulted` present (C7).
- Built fixtures: a focused `reconciled-seed.sql` (a settled post-reconcile
  state — no mid-flight ambiguity, since that judgment is pr-tables'), plus
  Taskei / Chorus / prior-report fixtures. The Taskei fixture deliberately
  carries a Not-Started task to exercise C5.
- Wrote and sanity-tested the new `jsonBundle.js` assertion against sample
  shapes (equals, arrayContains, fenced-block extraction) before trusting it.
- No SKILL.md → RED confirmed (0%).

## Iteration 2 — GREEN (with a test-bug correction)

- Wrote `SKILL.md`: RTCC, 6 steps mapping to the 7 criteria. Role states the
  assembler-not-editor stance and the explicit "include Not-Started" rule;
  steps cover provenance, DB bucket grouping (read-only, no re-judging),
  changes-from-events, infrastructure carry, verbatim sprint copy, Chorus
  normalization. Output contract shows the exact bundle shape.
- First run: **10/12 assertions pass**. The two failures were C5 — but
  inspecting the actual output showed the skill was CORRECT: all three sprint
  tasks present (SAMP-3 Not-Started included), normalized per the contract
  from Taskei's `shortId` to `id`. The assertions were matching the raw
  `shortId` field the contract explicitly renames. **The test was wrong, not
  the skill.** Fixed the C5 matchers to use `id`, and strengthened C5: now
  also asserts SAMP-3's `workflow_action == "Not Started"` and that the task
  array length is exactly 3 (nothing dropped).
- Re-run: **13/13 assertions (7/7 criteria), 100%.** Independently verified by
  parsing the emitted JSON directly, not trusting promptfoo's summary — the
  bundle grouped buckets correctly, drew changes from the events table,
  carried infrastructure with `is_new`, copied all three sprint tasks
  verbatim, normalized the Chorus docs with constructed URLs, and recorded
  real source paths.

## Iteration 3 — REFACTOR

- Audited the skill for dead weight. The Role's "normalize never editorialize"
  and Step 3's "do not infer changes by diffing buckets" looked like possible
  duplication but serve different criteria (C5 no-exclusion vs C3 events-as-
  source-of-truth) — both load-bearing, kept. No section was removable
  without dropping a graded behavior. No change made; the skill was already
  lean. (A refactor iteration that honestly finds nothing to cut is still a
  refactor iteration — the alternative is manufacturing a cut to look busy.)

## Status

GREEN at 100% (7 criteria, 13 assertions) on Kiro / claude-sonnet-5.5. Meets
Stage 3 §2 (≥3 distinct criteria — this unit has 7) and §3 (documented
Red/Green/Refactor, with a real test-bug correction in the Green iteration
caught by inspecting output rather than trusting the pass/fail summary). Devin
cross-provider run PENDING on an Improving laptop via
`task eval:statusrpt-gather CONFIG=promptfooconfig.devin.yaml`.
