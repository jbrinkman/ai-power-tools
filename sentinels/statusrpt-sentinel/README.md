# statusrpt-sentinel

A deterministic structural gate for the `statusrpt-*` weekly status report
workflow. Plain Node.js code, zero dependencies — **not an agent skill, no
LLM call**. It runs between `statusrpt-compile` (writes the report) and the
human/adversarial-review punch-out, and again before `statusrpt-publish`, to
catch mechanically-decidable defects cheaply and deterministically, so the
expensive stages (the model, the adversarial reviewer, the human) are never
spent re-discovering something a regex already answers with certainty.

## What it checks

- Required sections present, in house-style order (`checkSectionOrder`)
- `### Infrastructure` is a subsection of Status Details, never a top-level
  `##` section (`checkInfrastructureHeadingLevel`)
- Infrastructure is a bullet list, never a markdown table
  (`checkInfrastructureNotTable`)
- Every status badge uses one of the two closed vocabularies — the status
  words (Done/On Track/In Progress/Not Started/Blocked/Off Track/At Risk/
  Paused/Pending Updates) and the SEPARATE risk-severity words (High/Medium/
  Low) — with the matching CSS class (`checkBadgeVocabulary`)
- No plain-text status word standing in for a badge, e.g. `>Completed<`
  (`checkNoPlainTextStatus`)
- No leftover placeholder/template tokens — `TBD`, `Lorem ipsum`,
  `<INSERT ...>`, an unresolved `{{...}}` (`checkNoPlaceholders`)
- No meta-commentary about the compilation task leaking into the output
  (`checkNoMetaCommentary`)
- Strikethrough date-correction markers (the real house-style idiom,
  `~~Sep 30~~ Oct 13`) are balanced and actually resolved, not left dangling
  mid-edit (`checkStrikethroughResolved`)
- Staffing names no individual (`checkStaffingNoNames`, given a list of
  known names to check for)

Each check returns `{ rule, severity: 'error'|'warning', message, line? }[]`.
`runAll(text, opts)` aggregates every check into `{ ok, findings }` —
`ok` is `false` only when at least one `error`-severity finding exists; a
`warning` (e.g. a dangling strikethrough) does not fail the gate but should
still surface to the human punch-out.

## Why this exists instead of another agent skill

Every one of these rules is mechanically decidable — the same realization
that drove `statusrpt-compile`'s own eval suite to switch from mostly
`llm-rubric` to mostly deterministic assertions (see
`evals/skills/statusrpt-compile/ITERATIONS.md`, Iteration 3). An LLM
re-checking LLM output for a yes/no structural fact is slower, costs money,
and can itself hallucinate a pass. This module is the Stage-4 "automated
guardrail": a cheap, deterministic circuit breaker that always gives the
same answer for the same input, with its own unit tests proving it, leaving
the adversarial LLM review (`report-review-guidelines` /
`customer-report-review`, reused untouched) to spend its budget only on
genuine judgment calls — is this risk language consistent with that badge,
is this dropped reason specific enough — that no regex can answer.

## Running the tests

```bash
cd sentinels/statusrpt-sentinel
node --test
```

No install step — zero runtime dependencies, uses Node's built-in test
runner (`node:test`, `node:assert/strict`).

## Usage

```js
const sentinel = require('./sentinel.js');
const { ok, findings } = sentinel.runAll(compiledReportText, {
  knownNames: ['Dana Smith', 'Riley Chen'], // staff names to check Staffing against
});
if (!ok) {
  // block the workflow punch-out; surface findings to the human reviewer
}
```
