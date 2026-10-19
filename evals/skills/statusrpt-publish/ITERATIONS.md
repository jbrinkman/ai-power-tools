# statusrpt-publish — EDD iteration log

Eval-Driven Development record for the pipeline's landing stage. Runner:
Promptfoo. Provider/grader: Kiro / claude-sonnet-5.5 (pinned — this skill's
eval always runs the Kiro provider regardless of the suite's default CONFIG,
per explicit direction, since it's the one that exercises real git/gh
execution end to end).

## Unit boundary

publish is purely mechanical: it takes the already-compiled, already-
sentinel-passed report markdown plus the bundle's `report_date`, writes the
report into the destination `customer-reports` checkout under the house
path/filename convention, and runs a FIXED git+gh sequence to land it on a
feature branch and open a PR. It does not write narrative (statusrpt-compile)
and does not merge the PR — that stays with a human reviewer. Mirrors the
retired `status-finalize-report` skill's flow (sync main → branch → commit →
push → `gh pr create` from the H1), reading from the new pipeline's artifacts
instead of an already-open editor buffer.

## Iteration 1 — RED

- Wrote 3 test cases (full flow, idempotent-existing-PR, GPG-signing-failure
  fallback) against a mock `git`/`gh` on `PATH` (new `evals/mocks/git`,
  alongside the existing `evals/mocks/gh` extended with `pr list`/`pr create`
  handlers) and a new `gitCommandCalled.js` assertion (sequence/presence/
  absence checks against the mock's command log, mirroring the existing
  `ghCommandCalled.js` pattern).
- No `SKILL.md` → RED confirmed (0/3).

## Iteration 2 — GREEN, first pass: 0/3, misdiagnosed as model confabulation

- Wrote `SKILL.md`. First run: 0/3, with the mock log showing only
  `git rev-parse --is-inside-work-tree` ever executed, while the model's
  narrative output confidently described a full `checkout`/`commit`/`push`/
  `gh pr create` flow with plausible-looking (but never-logged) results.
- Spent three real diagnostic rounds chasing this as **model confabulation**
  under `kiro-cli --no-interactive`:
  1. Hardened the mock to answer every probe an agent might run
     (`--show-toplevel`, `remote -v`, global-flag parsing) — no change.
  2. Loosened assertions to accept narrative-level text instead of the mock
     log — rejected on reflection: that would certify narration, not
     execution, so reverted.
  3. Restructured the skill's rules from a blacklist ("don't probe") to a
     positive whitelist of exact allowed commands, per user direction — a
     good structural improvement on its own merits, but did not change the
     observed 0/3 result.
  Reported this to the user as an apparent hard limitation of the
  `--no-interactive` provider on multi-step, side-effecting tasks and
  proposed converting the skill to a deterministic script instead.

## Iteration 3 — User correction: "why is this so challenging? We used gh
cli in the old finalize skill without problems"

- Correct pushback. The old `status-finalize-report` did the same four
  mutating commands (`git add`/`commit`/`push`, `gh pr create`) with no
  friction. The difficulty was entirely self-inflicted in the eval harness,
  not the task: an invented scratch "destination repo" that wasn't a real
  git repo, under an open-ended mock that invited probing.

## Iteration 4 — Root cause found: NOT confabulation, a log-path bug

- User noticed **two different mock log files** on disk:
  `evals/tmp/promptfoo-gh-mock.log` and
  `evals/tmp/publish-dest/tmp/promptfoo-gh-mock.log`.
- `GH_MOCK_LOG_FILE` was a RELATIVE path. The skill `cd`s into the
  destination repo root before running git; the mock scripts and the JS
  assertions each resolved that relative path against their OWN current
  working directory, splitting one logical log into two physical files. The
  real commands (checkout, add, commit, push, pr create) were landing
  correctly in `publish-dest/tmp/...`; the assertions were reading the
  almost-empty `evals/tmp/...`. **The model had been executing the real flow
  correctly all along** — nothing in Iteration 2's three "fixes" was
  addressing an actual defect, because there wasn't a confabulation bug.
- Fixed by making `GH_MOCK_LOG_FILE` absolute in `evals/Taskfile.yml` via
  Task's built-in `{{.TASKFILE_DIR}}`.
- Also whitelisted `git rev-parse --is-inside-work-tree` as an explicit,
  named optional pre-flight check (Allowed Commands item 0) per user
  direction, since the model reliably wants to run it and refusing it
  outright serves no purpose once the real log-path bug was understood.

## Iteration 5 — GREEN, 2/3: a real test-harness bug (not a skill bug)

- Re-ran with the absolute log path: 2/3. The failure —
  `expectedCommand is not configured for this assertion` — was
  `ghCommandCalled.js` never having supported a `mustNotContain` config
  option (only `gitCommandCalled.js` had it), while the `pr-exists` test case
  used `mustNotContain: "pr create"` against the `gh` log. Fixed by adding
  `mustNotContain` support to `ghCommandCalled.js`, matching
  `gitCommandCalled.js`'s shape.

## Iteration 6 — GREEN, 1/3 still failing: concurrent test-case log collision

- Re-ran: 2/3, but now `pr-exists` failed on `mustNotContain: "pr create"`
  because it DID appear in the (still shared) log — written there by the
  concurrently-running full-flow test case, not by `pr-exists` itself. The
  3 test cases run concurrently by default and were sharing one log file and
  one scratch destination directory, so one test's real `pr create` call
  contaminated another test's absence check.
- Fixed with full per-test isolation, per user direction ("give each test
  case its own isolated mock log file"):
  - Each of the 3 test cases now sets its own `logFile` var
    (`tmp/sr-publish-{full,pr-exists,gpg-fail}.log`) and its own scratch
    `destRoot` (`tmp/publish-dest-{full,pr-exists,gpg-fail}`).
  - `evals/mocks/git` and `evals/mocks/gh` now prefer
    `PROMPTFOO_VAR_logFile` (forwarded by the provider from the test's
    `logFile` var) over the shared `GH_MOCK_LOG_FILE`, resolving a relative
    value against the mocks' own directory — not the process's current
    working directory, which the skill may have `cd`'d away from.
  - `gitCommandCalled.js`/`ghCommandCalled.js` read `context.vars.logFile`
    the same way, anchored against `evals/`.
  - `evals/Taskfile.yml`'s `eval:sr-publish` target now clears and creates
    all three per-test logs/scratch dirs.
- Re-ran: **3/3 (100%)**. Independently verified by reading each of the
  three isolated logs directly (not just the pass/fail summary): `full` and
  `gpg-fail` each show the complete correct sequence ending in `pr create`;
  `pr-exists` shows the identical mechanical flow stopping cleanly at
  `pr list` with no `pr create` anywhere in its own log.

## Iteration 7 — REFACTOR

- Found genuine duplication: the "Allowed Commands" whitelist (added in
  Iteration 2 under the confabulation theory) and the "Instructions" Steps
  1-9 restated the same 9 commands almost verbatim — defensible while
  debugging a suspected model problem, dead weight now that the real bug was
  harness-side. Collapsed Steps 3/5/6/8 to reference the Allowed Commands
  list by number instead of re-stating each command.
- Removed two paragraphs written specifically to counter the (incorrect)
  confabulation hypothesis — "this skill's whole purpose is to push, that's
  not a conflict with git-safety caution" and "actually run every command,
  never narrate" — since neither addresses a real, demonstrated defect; the
  Binding Rules already state the actual governing constraints (feature-
  branch-only, never force-push, idempotent PR, GPG fallback).
- Kept the whitelist structure itself (positive "Allowed Commands" over a
  blacklist of forbidden probes) — a genuine improvement on its own merits,
  independent of why it was first introduced.
- Re-ran: still **3/3 (100%)**, independently re-verified against all three
  logs — refactor was behavior-preserving.

## Status

GREEN. 3 test cases (full flow, idempotent existing-PR, GPG-signing fallback)
against a closed-allowlist mock `git`/`gh`, each test case now fully isolated
(own command log, own scratch destination repo) to prevent concurrent cross-
contamination. Verified by reading each isolated log directly, not the
summary alone. The eval is pinned to the Kiro provider (`task eval:sr-publish`
always runs `promptfooconfig.kiro.yaml`) since this unit specifically proves
real git/gh execution. Devin cross-provider run PENDING on an Improving
laptop.

The real lesson of this unit: a 0/3 result that looks like a model behavior
problem may be a harness bug wearing that costume. Three rounds of patching
the skill/mock against a "confabulation" theory produced no change in
outcome — that lack of movement, in hindsight, was itself the signal to stop
and inspect the harness's own plumbing (working directories, shared state
across concurrent runs) rather than iterate further on prompt wording.
