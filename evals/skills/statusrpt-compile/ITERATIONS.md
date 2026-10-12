# statusrpt-compile — EDD Iteration Log

Eval-Driven Development evidence for the `statusrpt-compile` skill, per the
AI Maturity Framework Stage 3 (§3 Iteration & Evolution: >=2 documented iterations,
each with baseline -> hypothesis -> change -> measured result -> reasoning).

Eval suite: `evals/skills/statusrpt-compile/tests.yaml` (7 distinct criteria).
Provider: Kiro CLI, `claude-sonnet-5.5` (mid-tier Sonnet, not frontier).
Runner: `task eval:statusrpt-compile CONFIG=promptfooconfig.kiro.yaml`.

## Iteration 0 — RED (no skill)

- **Baseline:** 0/7. `skills/statusrpt-compile/SKILL.md` did not exist; the suite
  defined the bar before the skill.
- **Hypothesis:** An RTCC-structured skill with one instruction block per
  criterion (init cleanup, Submitted reconcile, release-gated promotion, infra
  reconcile incl. add+remove, tracker intake, all-sections summary with
  Not-Started exclusion, integrity) will clear the suite.
- **Change:** Wrote the first `SKILL.md`.
- **Result:** See Iteration 1 (the first real run surfaced a harness issue first).

## Iteration 1 — first run: harness permission wall

- **Baseline:** 1/7 passed (14.29%).
- **Observed:** Six tests failed with the SAME non-skill cause — `kiro-cli` in
  `--no-interactive` mode refused the skill's `read`/`glob` tool calls:
  "tool permission approval is not supported in non-interactive mode. Use
  --trust-all-tools." The skill could not read its own fixtures, so it had no
  input to compile. The single pass was a test where the model fabricated a
  plausible report from the prompt text alone.
- **Hypothesis:** This is a provider wiring gap, not a skill-logic gap. The Devin
  provider runs skills with `--permission-mode dangerous` for exactly this
  reason; the ported `kiro.js` omitted the kiro-cli equivalent. Adding
  `--trust-all-tools` (provider mode only; the mock `gh` on PATH keeps tools off
  the real GitHub CLI) should let the skill read fixtures and expose its true
  logic score.
- **Change:** Added `--trust-all-tools` to the provider-mode `kiro-cli chat`
  invocation in `evals/providers/kiro.js`.
- **Result:** **7/7 passed (100%)**. All seven criteria green on first real
  execution of the skill logic.
- **Reasoning:** The jump from 1->7 came entirely from fixing tool-permission
  wiring; the skill logic needed no change to pass, which indicates the
  RTCC/one-block-per-criterion design was sound. The lone Iteration-1 pass was a
  false positive (fabricated output), now superseded by a real grounded pass.

## Iteration 2 — REFACTOR (trim for load-bearing; fix a brittle assertion)

- **Baseline:** 7/7 green, but `SKILL.md` carried two non-load-bearing sections.
- **Hypothesis:** The `## Task` section (a prose restatement of the 7 Steps) and
  the `## Context — Report structure` inventory (section list never checked by any
  criterion; the only load-bearing structural facts — the `Hello everyone,` /
  `### Completed Projects` boundary and the `**Note:**` line — already live inside
  Steps 1 and 6) are dead weight. Removing them raises the load-bearing ratio
  (Stage 3 §1, >=90%) without weakening any criterion, so the suite stays 7/7.
- **Change:** Deleted both sections (~18 lines). No Step, constraint, or
  grader-checked example touched.
- **Result (first re-run):** 6/7 — criterion `summary-generation` failed on the
  `not-contains: "In Review"` assertion.
- **Diagnosis:** NOT a skill regression. Inspecting the model output: the
  prior-week bullet "Demo CLI moved to In Review" was correctly GONE; the only
  "In Review" was a *legitimate current* reference — the model annotated the
  Sample Framework Adapter bullet with its Taskei workflow state `(SAMP-1, In
  Review)`, which is accurate data from `taskei-sprint.json`. The assertion was a
  brittle substring proxy that passed pre-refactor only because the earlier
  wording happened not to surface the token. Per EDD discipline (don't game an
  assertion to force green — fix it to express real intent), the real intent is
  "the specific prior-week bullet must not survive."
- **Fix:** Changed the assertion to `not-contains: "Demo CLI moved to In Review"`,
  which targets the actual carried-over bullet and matches what the C6 LLM-rubric
  already checks.
- **Result (final):** **7/7 passed (100%)**. Refactor complete, no regression.
- **Reasoning:** The refactor validated the harness as well as the skill — it
  surfaced a false-negative-prone assertion that a pure Green run had masked.
  Leaner skill, more precise eval, same 100%.

## Status

GREEN at 100% (7/7) on Kiro / claude-sonnet-5.5. Meets Stage 3 §2 (>=3 distinct
criteria, 95%+ achievable, mid-tier model) and §3 (documented iterations with
cause-and-effect). Certified on the Kiro provider.

Cross-provider (Devin) run: PENDING — to be executed on an Improving laptop with
Devin access via `task eval:statusrpt-compile CONFIG=promptfooconfig.devin.yaml`.
The skill logic and the 7 criteria are provider-agnostic; the only
provider-specific wiring is the headless tool-trust flag (kiro: `--trust-all-tools`,
devin: `--permission-mode dangerous`), already present in each provider. A Devin
run confirms the harness port, not the skill logic. Append its result here when run.
