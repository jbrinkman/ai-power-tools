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

## Status

GREEN at 100% (7/7) on Kiro / claude-sonnet-5.5. Meets Stage 3 §2 (>=3 distinct
criteria, 95%+ achievable, mid-tier model) and §3 (documented iterations with
cause-and-effect). Further refactor iterations, if any, will be appended here.
