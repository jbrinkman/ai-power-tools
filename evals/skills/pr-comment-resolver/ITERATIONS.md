# pr-comment-resolver — EDD iteration log

Eval-Driven Development record for the **test-timing** behavior change. Runner:
Promptfoo. Provider/grader: Kiro / claude-sonnet-5.5.

## Unit boundary

This suite certifies ONE behavior of `pr-comment-resolver`: in a PR with several
comments, the per-comment push gate (Step 5.3) runs only the project's FAST
checks (format, lint, type-check, build, fast/targeted test), and the project's
full LONG-RUNNING test suite runs ONCE after all comments are resolved (Step 6b),
not after each comment. It does not re-test the rest of the resolver loop
(worktree, assessment, reply/resolve), which is unchanged.

It grades the PLAN the skill lays out for a described multi-comment scenario, not
a live multi-turn git/gh run — the resolver loop drives many side-effecting
commands across turns and is not reliably reproducible under a single
non-interactive provider turn (a known confabulation failure mode for long
mutating sequences). This mirrors how `statusrpt-compile` grades a produced
artifact rather than a live pipeline.

## Iteration 1 — RED attempt that wrongly PASSED (test measured the model)

- First `tests.yaml` asked the model how IT would sequence the checks for a
  6-comment PR with an 8-minute suite, then asserted the two-tier plan.
- Ran it against the UNCHANGED skill: **100% pass** — wrong. Reading the output,
  the model had NOTED the skill lacks the tiering and then invented the correct
  plan itself as an explicit "departure from the skills". The assertions matched
  the model's own good judgment, not the skill. A test that passes before the
  behavior exists certifies nothing.

## Iteration 2 — make the probe faithful-to-skill so it is genuinely RED

- Rewrote the request to pin the model to report the sequencing THE SKILL
  PRESCRIBES, and to say plainly if the skill does not prescribe a tiering.
- Added a deterministic "not a departure" criterion and an llm-rubric requiring
  the two-tier plan to be presented as the skill's OWN behavior (FAIL if framed
  as a deviation / if the skill runs all checks per push / if the slow suite is
  dropped or run per comment).
- Against the unchanged skill: **0% pass (RED)**, and the llm-rubric reason
  confirmed the right cause — "the skill has no tiering ... never runs the full
  suite as its own step".

## Iteration 3 — GREEN (skill edit) + brittle-regex fallout

- Edited `SKILL.md`: Step 5.3 now runs only the fast tier and explicitly defers
  the full long-running suite; new **Step 6b** runs that suite once over the
  final branch tip after all comments, fixing forward on failure; Step 6 and the
  Exit criteria updated to match.
- First GREEN run passed, but the llm-rubric passed while three prose regexes
  FAILED on correct output — they were too brittle for the model's phrasing
  ("once, after the last comment"; "the full `go test -race ./...` is excluded
  here"). Rebuilt criteria 1–3 to anchor on stable tokens the FIXED skill
  produces (the words "once" + an after-all phrase; the "fast tier/gate"
  vocabulary; a citation of the skill's own Step 6b / two-tier framing), keeping
  them RED against the old skill (no "fast tier", no "Step 6b").

## Iteration 4 — REFACTOR: drop the flaky deterministic negative

- A `--repeat 5` run exposed a flake: the deterministic "does NOT run the slow
  suite per comment" negative regex false-failed on correct output. It matched a
  sentence that NAMES the per-comment anti-pattern only to REJECT it ("running
  the slow suite after every comment multiplies the wait") and, in another run,
  jumped a comma into the correct "...and the full suite runs once at the end"
  clause.
- Root cause: distinguishing "prescribes the per-comment anti-pattern" from
  "names it to reject it" is reading comprehension, not a mechanical match — the
  wrong job for a regex. Removed the deterministic negative; the llm-rubric
  already FAILs explicitly if the plan runs the slow suite per comment, and that
  judgment is stable. (Same lesson as statusrpt-compile Iteration on
  meta-commentary: don't chase a comprehension check with proximity regex.)
- Final suite: 3 deterministic criteria (once-after-all; fast-tier-excludes-slow;
  cites the skill's own steps) + 1 llm-rubric (faithful two-tier, not a
  departure).

## Stability

- Final `--repeat 5` against the FIXED skill: **5/5 pass**.
- Final `--repeat 5` against the pre-fix skill (stash the SKILL.md edit): **0/5
  pass**.
- Both directions stable across repeats; no flakes remain.
