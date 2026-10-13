# statusrpt-compile — EDD iteration log

Eval-Driven Development record for the narrative-writing stage. Runner:
Promptfoo. Provider/grader: Kiro / claude-sonnet-5.5.

## Unit boundary

compile consumes `bundle.json` (already assembled by statusrpt-gather from an
already-reconciled DB) and writes the weekly report prose per the
`customer-reports` house style. It does not reconcile data and does not
perform adversarial review — `report-review-guidelines` /
`customer-report-review` (existing, mature, untouched) own that. This unit's
eval only needs to prove compile WRITES correctly against house style, not
re-implement the whole review rulebook.

House-style ground truth: `customer-reports/README.md` (closed badge
vocabulary, "On Track not In Progress when dated", purple=internal-only, a
SEPARATE red/orange/yellow High/Medium/Low vocabulary for Risk severity) plus
the real section order read directly from the project's own
`2026-status-reports/*.md`.

## Iteration 1 — RED

- Wrote 8 criteria as one compile-one-bundle test, initially ALL as
  `llm-rubric`: section order, badge vocabulary, dated-item badge rule,
  Not-Started exclusion, dropped-reason fidelity, Infrastructure-as-bullets,
  Staffing-no-names, no leftover placeholders.
- Fixtures: `bundle.json` shaped exactly like gather's real certified output,
  reusing gather's `report-prev.md` for continuity.
- No `SKILL.md` → RED confirmed.

## Iteration 2 — GREEN (first pass, rubric-only)

- Wrote `SKILL.md`. First run: a Nunjucks template-parse error — a literal
  `{{...}}` inside one rubric's prose was being treated as a template
  expression by promptfoo's own templating, not as example text. Fixed by
  rephrasing without literal double-braces.
- Re-run: **8/8 (100%)**. Read the actual compiled output directly rather
  than trusting the summary — it looked correct.

## Iteration 3 — User steering: "7 evals won't be enough for a report this
complex; deterministic evals are practically free, why limit them?"

- Correct challenge. Nearly every one of the 8 criteria is mechanically
  checkable (closed badge vocabulary via regex, section headings present/
  ordered, a named string absent/present, no markdown table under a known
  heading) and did not need an LLM judge wearing an `llm-rubric` costume.
  Rebuilt the suite deterministic-first: regex/`contains`/custom `javascript`
  assertions for everything mechanically checkable, keeping `llm-rubric` for
  only the 2 criteria that genuinely require reading comprehension (dropped-
  reason paraphrase fidelity, "is this string a person's name").
- **This rework caught two real things the rubric-only pass had missed:**
  1. A **real skill defect**: the compiled output omitted the literal
     `## Summary` heading — "Hello everyone," appeared right after the H1
     with no heading between them, even though every real report in
     `2026-status-reports/` has `## Summary` immediately after the H1. The
     rubric-only Iteration 2 run never caught this because none of its 8
     rubric prompts asked about a literal heading string. **Fixed** by making
     Step 2 explicit that `## Summary` is a literal heading to emit, not just
     implied by its content.
  2. Three **test-implementation bugs** surfaced while sanity-testing the new
     deterministic assertions against the real output before trusting them
     (same discipline as `jsonBundle.js`): JS `RegExp` doesn't support
     Python-style inline flags (`(?s)`, `(?i)`) — rewrote as plain multi-line
     JS checks; a naive `not-contains "## Infrastructure"` false-matched
     against the correct `### Infrastructure` subsection (substring, not
     line-anchored) — rewrote with an anchored regex distinguishing `##` from
     `###`; a badge-vocabulary checker didn't know about the SEPARATE
     red/orange/yellow Risk-severity vocabulary and flagged a correct
     `yellow">Low` badge as invalid — added the second vocabulary.
- Fixed the real `## Summary` heading defect in the skill AND all three test
  bugs, then re-ran: **all deterministic + rubric assertions pass**,
  independently verified by reading the full compiled output directly (not
  just the pass/fail summary) — `## Summary` present, correct section order,
  closed vocabulary respected on both axes, the dated Adapter never mis-
  badged, the Not-Started task fully absent, the Session Store reason
  faithful, Infrastructure a bulleted `###` subsection with both PR links,
  Staffing name-free, no meta-commentary.

## Iteration 4 — REFACTOR

- Found and removed one genuine duplication: Step 2 had two paragraphs
  restating "badge first, then one paragraph" from the earlier edit that
  added the literal-heading instruction. Removed the redundant second
  paragraph, keeping the single merged instruction. Re-ran: no regression,
  still 100%.

## Status

GREEN (deterministic-first suite, 8 criteria covered mostly by regex/
`contains`/custom `javascript` assertions, 2 reserved for `llm-rubric`) on
Kiro / claude-sonnet-5.5. Meets Stage 3 §2 (≥3 distinct criteria — 8 here)
and §3 (documented Red/Green/Refactor, including a real skill defect AND
three real test bugs caught by switching to deterministic checks per user
steering, each independently verified against the raw output text). Devin
cross-provider run PENDING on an Improving laptop via
`task eval:statusrpt-compile CONFIG=promptfooconfig.devin.yaml`.
