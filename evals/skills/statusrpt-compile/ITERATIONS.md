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

## Iteration 5 — Flakiness audit via `promptfoo --repeat` (user-directed)

Running `task eval:sr-all` five times surfaced compile failing 2/5 — the
suite had never been run more than once per edit, so this was the first
evidence of real run-to-run model non-determinism. User pointed out
`promptfoo eval --repeat N` runs each test case N times in ONE invocation
instead of manual shell loops — switched to that for every validation pass
below.

- **Finding 1 (real skill gap): meta-commentary before the H1.** Some runs
  opened with a sentence narrating file-path resolution
  (`"The fixtures are under evals/skills, relative to the cwd.## Summary"`),
  glued onto the first heading. Root cause: the skill never actually
  instructed compile to EMIT an H1 at all — Step 2 jumped straight to
  `## Summary`, so there was no anchor forcing "report content starts here."
  **Fixed** by adding an explicit H1-first instruction (Step 2 now opens with
  the literal `# Amazon ElastiCache - ...` line using `report_date`) and
  tightening the Role section.
- **Finding 2 (test over-match, not a skill bug): Criterion 3 flagged a
  legitimate in-flight sprint task.** The original check forbade `In
  Progress` on ANY line mentioning "Sample Framework Adapter" by name — but
  a follow-up sprint task line referencing the (already-shipped) Adapter can
  legitimately still be in-flight. Re-scoped the check to the line actually
  citing the `v2.1.0` release evidence, not every line name-dropping the
  project.
- **Finding 3 (real skill + test gap): `Dropped` wasn't in the badge
  vocabulary at all.** Grepped every real report in `2026-status-reports/`
  and confirmed `<span class="gray">Dropped</span>` is standing, consistently
  used house style — the vocabulary list in both `SKILL.md` and the test's
  `statusWords` map had simply omitted it. Added it to both, plus an
  explicit instruction in Step 5 to badge dropped projects `gray`.
- **Finding 4 (test over-strictness): dropped-reason regex too brittle.** A
  run phrased the reason "not aligned with **the project's** direction"
  (added article + possessive) — faithful to the bundle's `"not aligned with
  project direction"`, but an exact-phrase regex rejected it. Loosened the
  regex to tolerate that trivial variation while still requiring the real
  substance.
- **Finding 5 (real skill + test gap): `Merged`/`Awaiting Merge` aren't
  general status words but ARE real house style.** Grepped the whole
  `2026-status-reports/` history and confirmed Infrastructure items render
  their `status_label` as-is (`Merged`, `Awaiting Merge`, etc., always green)
  — a THIRD vocabulary distinct from both the general status words and the
  risk-severity words. The skill's Step 6 said to "map" these into the
  general vocabulary, which is backwards; fixed Step 6 and the House Style
  bullet to say these render as-is, and added the infra vocabulary to the
  test's badge checker.
- **Finding 6 (real skill gap): a sprint task contradicted itself.** One run
  wrote `<span class="green">In Progress</span> Complete the closeout of the
  Sample Framework Adapter, which is released as v2.1.0...` — badging a task
  In Progress while its own prose cites the release. The dated-item rule
  (`On Track`/`Done`, not `In Progress`, when dated) wasn't explicitly tied
  to a sprint task's OWN prose, only to the project-level entries. Added a
  clarifying paragraph to Step 3.
- **Finding 7 (real skill gap): an invented CSS class.** One run emitted
  `<span class="done">Done</span>` instead of `<span class="green">Done</span>`.
  Grepped the real reports and confirmed `done` never appears as a class —
  only the 6 named ones. Made the House Style bullet state the exact 6
  lowercase class names explicitly, with a worked example, rather than only
  describing the word→class mapping in prose.
- **Finding 8 (test architecture, user-directed): meta-commentary needed
  `llm-rubric`, not more regex.** After Finding 1's fix reduced but did not
  eliminate the meta-commentary slip (it recurred once more, with a
  different wording the deterministic phrase-list hadn't anticipated), the
  user correctly stopped the chase: "we should not try to keep chasing a
  specific sentence in the output — this is a case where we are using a
  deterministic eval when we should be using an LLM rubric." Converted
  Criterion 8's meta-commentary check from a growing deny-list of phrases to
  an `llm-rubric` asking the real question ("is this sentence about the
  task, not report content") — the same category as the two criteria already
  on `llm-rubric` (dropped-reason fidelity, Staffing names). Kept the
  genuinely mechanical placeholder checks (`TBD`, `Lorem ipsum`, `<INSERT`)
  deterministic.
- Validated the full set of fixes with `--repeat 10` twice in a row:
  **20/20 (100%)** combined, after the architecture change — up from the
  2/5 and intermittent single-digit failures seen before this iteration.

## Status

GREEN. 8 criteria: 6 fully deterministic (section order, two-plus-one badge
vocabularies with exact CSS classes, dated-item rule scoped to real evidence
lines, Not-Started exclusion, Infrastructure-as-bullets), 3 on `llm-rubric`
(dropped-reason paraphrase fidelity, Staffing-no-names, meta-commentary
judgment) — each `llm-rubric` reserved for a question that genuinely needs
reading comprehension rather than pattern-matching. Validated with
`promptfoo eval --repeat 10` (not manual shell loops) at 20/20 across the
latest two batches. Meets Stage 3 §2/§3. Devin cross-provider run PENDING on
an Improving laptop via `task eval:sr-compile CONFIG=promptfooconfig.devin.yaml`.

The recurring lesson of this iteration: several "the model is wrong" findings
turned out to be "the test's vocabulary is incomplete relative to the real,
already-established house style" (`Dropped`, `Merged`, `Awaiting Merge`) —
each verified against the actual `2026-status-reports/*.md` history before
touching the skill or test, not assumed. And the meta-commentary saga is the
general case of "don't fight non-deterministic phrasing with a deny-list";
`--repeat` is the right tool to even notice this kind of flakiness exists.
