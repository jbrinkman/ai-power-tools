# Eval Framework Plan: Trustworthy Tool-Call Tracing + Prompt Load-Bearing Analysis

Status: **Part 1 implemented and fully verified live end-to-end (2026-07-29): full 5-test suite
consistently completes in ~30-35s via `task eval:github-issue-creator`, no hangs, after fixing the
`@`-vs-`file://` prompt bug below. Part 2 in progress: coverage map + gap list done, one order
assertion added, remaining priority gaps (verify `issue create`/`issue edit` invoked) not started,
and now blocked on re-reviewing all 5 tests' actual behavior now that Devin receives the real skill
content (see "Known issues and fixes").** This file is the handoff artifact for two related efforts
so they aren't lost across sessions/compaction. Update the checkboxes as work lands.

## Background / problem statement

The `github-issue-creator` evals mock the `gh` CLI (`evals/mocks/gh`) and need to verify which
`gh` subcommands the skill actually invoked. The original design had the mock write to a shared,
append-only log file named from a hand-authored `vars.testId`, which a separate assertion process
(`evals/assertions/ghCommandCalled.js`) re-opened by reconstructing that same filename.

Problems identified with that design:

- `testId` was optional with a silent fallback to a shared log file — omitting it (or a copy/paste
  duplicate) causes cross-test contamination instead of an obvious error.
- The log file is append-only and only cleared once per `task eval:*` invocation (in
  `Taskfile.yml`), so running promptfoo any other way (raw `npx promptfoo eval`, CI, UI re-run)
  leaves stale data that can mask a real regression (false positive).
- `ghCommandUsesRepo.js` / `issueNumberInCommand.js` regex the model's *entire prose output*,
  which can match a command the model merely described rather than actually ran (false positive).

Research finding: promptfoo's `exec:` provider contract only ever gives assertions the raw stdout
of the provider script as `output` — it does not parse structured metadata/trace fields out of
`exec` script stdout (confirmed via `promptfoo`'s `ScriptCompletionProvider` source). Promptfoo's
own recommended pattern for verifying tool calls in "real" agent frameworks is to attach trace/span
data to the specific run, not to a shared external store keyed by a hand-maintained id (see the
OpenAI Agents SDK + OTLP tracing guide). We were reinventing (and mis-solving) that same problem
with a mutable shared file.

## Decision

Have `evals/providers/devin.js` (the one process that both runs the mock and returns `output` to
promptfoo) capture the mock's log itself and fold it into the string it prints, instead of writing
to a file a separate process must rediscover. This removes the shared-state/testId problem
structurally rather than adding enforcement on top of it.

## Part 1: Refactor — embed the mock trace in provider output

Goal: assertions become simpler, and results become trustworthy (no cross-test contamination, no
staleness, no reliance on a manually-maintained unique id).

Status: **implemented, pending a live `task eval:github-issue-creator` run to confirm end-to-end.**

- [x] `evals/mocks/gh`: removed all `testId`-based log path logic. Now requires `GH_MOCK_LOG_FILE`
      to be set (`${GH_MOCK_LOG_FILE:?...}` — fails loudly, non-zero exit, clear message) and logs
      to it directly. No naming convention lives in the bash script anymore.
- [x] `evals/providers/devin.js` (provider mode only):
  - Generates a private, OS-guaranteed-unique temp file per invocation (`fs.mkdtempSync` in
    `os.tmpdir()`), passes its path via `env.GH_MOCK_LOG_FILE`.
  - After `spawnSync` returns, reads that temp file (empty string if the mock was never invoked)
    and appends it to `result.stdout` inside a delimited block via `wrapMockLog()`.
  - Deletes the temp dir afterward via `fs.rmSync(..., { recursive: true, force: true })`.
- [x] `evals/assertions/ghCommandCalled.js`: dropped all file I/O, the `getLogFile()` path
      reconstruction, and the `Atomics.wait` retry-polling hack. Now calls `extractMockLog(output)`
      and substring-checks the result.
- [x] `evals/assertions/ghCommandUsesRepo.js` and `evals/assertions/issueNumberInCommand.js`:
      switched from regexing the full `output` to regexing only the extracted mock-log block
      (matching the mock's actual `args: issue create --repo ...` log lines, not a `gh ...` prose
      mention). Note: neither assertion is currently wired into `tests.yaml` — they exist but are
      unused by any test today.
- [x] Consolidated the log embed/extract logic into one shared module: `evals/lib/mockLog.js`
      (`wrapMockLog` used by the provider, `extractMockLog` used by all three log-reading
      assertions). Placed at `evals/lib/` rather than `evals/assertions/lib/` since it's shared by
      both the provider and the assertions, not assertion-specific.
- [x] `evals/Taskfile.yml`: removed the `rm -f tmp/promptfoo-gh-mock*.log` cleanup steps and the
      `GH_MOCK_LOG_FILE` default env var/vars block — no more shared/persistent log file exists.
      `mkdir -p tmp` was also removed since nothing writes there anymore.
- [x] `evals/README.md`: updated the structure diagram and "How it works" section to describe the
      new embedded-trace mechanism instead of the shared log file.
- [x] Decision (revised 2026-07-28): `vars.testId` was removed from all 5 tests in `tests.yaml`.
      It was fully vestigial after the refactor above — nothing in `mocks/gh`, `providers/devin.js`,
      or any assertion reads it anymore, and its only claimed value (a human-readable label) was
      already redundant with each test's `description` field. Originally the plan was to keep it as
      a harmless cosmetic label, but on reflection that leaves dead config in place that could
      mislead a future reader into thinking it's wired to something — inconsistent with this
      project's own load-bearing standard, so it was removed instead.
- [x] **Reintroduced (2026-07-28) as `metadata.id`, not `vars.testId`.** Building `COVERAGE.md`
      surfaced a real need for a stable per-test identifier: coverage-map cross-referencing today,
      and correlating results once coverage-map generation is automated from eval output. Unlike
      the removed `vars.testId`, `metadata.id` has an actual consumer and deliberately lives in
      `metadata` (promptfoo's native filterable-metadata mechanism, already used for
      `metadata.skill`) rather than `vars`, so it is never forwarded into the gh mock's environment
      the way `vars.testId` was — the two problems are not the same. Also usable today via
      `promptfoo eval --filter-metadata id=<slug>` to run a single test in isolation.
- [x] Verified the mechanism directly (without a live Devin session, since this sandbox's `devin`
      CLI is not authenticated — `Error: Not logged in. Run devin auth login to authenticate.`):
  - `bash -n` / `node -c` syntax-checked every changed file.
  - Ran `mocks/gh` directly against a temp `GH_MOCK_LOG_FILE`, confirmed the recorded log format,
    and confirmed `${GH_MOCK_LOG_FILE:?...}` fails loudly (exit 1, clear message) when unset.
  - Round-tripped a real mock log through `wrapMockLog` → `extractMockLog` and confirmed the
    extracted content matches exactly.
  - Called `ghCommandCalled.js` and `ghCommandUsesRepo.js` directly against a simulated
    provider-output string and confirmed correct pass/fail behavior.
- [ ] **Still needed:** run `task eval:github-issue-creator` end-to-end in an environment with an
      authenticated `devin` CLI to confirm all 5 existing tests still pass through a real Devin
      session, including the two failure-scenario tests (`step-1a-auth`, `step-1b-repo`). Attempted
      here on 2026-07-28 and blocked purely by `devin` not being logged in in this sandbox — retry
      once that's available.

## Part 2: Ablation harness + instruction→assertion coverage map

Goal: produce a defensible artifact for the "95% of the prompt is load-bearing" requirement — i.e.
prove that (a) most of `skills/github-issue-creator/SKILL.md` measurably affects eval outcomes, and
(b) every instruction we claim is load-bearing has a specific assertion that would fail without it.

This depends on Part 1 being done first — ablation conclusions are only trustworthy if the
underlying eval signal has no false positives/negatives or cross-test noise.

**Sequencing decision (2026-07-28):** build the instruction→assertion coverage map *before*
writing more tests or building the ablation runner, and use it to decide which specific tests to
add. Rationale: if we ablate a `SKILL.md` section that no current test exercises, "no regression"
just reflects a coverage gap, not evidence the section is safe to remove — that would undermine the
credibility of the 95% claim rather than support it. Blindly adding "more tests" first risks
re-covering already-tested instructions while still missing the real gaps. The harness's mechanical
scaffolding (section tagging, variant generation, diff runner) is independent plumbing and can be
built in parallel, but shouldn't be *run* for a real verdict until coverage gaps identified by the
map are closed. Revised order: (1) coverage map + gap list, (2) close priority gaps with targeted
tests, (3) harness scaffolding (can overlap with 1/2), (4) run ablation once coverage is trustworthy.

- [x] **Coverage map + gap list built:** see
      [`skills/github-issue-creator/COVERAGE.md`](./skills/github-issue-creator/COVERAGE.md). Key
      findings: (a) no current test verifies the skill's core action (`gh issue create`/`issue
      edit` being called at all), (b) `ghCommandUsesRepo.js`/`issueNumberInCommand.js` are unused
      despite already implementing needed checks, (c) most `containsAny` assertions are "weak" —
      any one of several alternative phrases can satisfy them, so they shouldn't be treated as
      proof a section is load-bearing, (d) several instructions (ask one question at a time and
      wait; wait for explicit approval; revision loop) are **structurally untestable** by this
      harness today since `providers/devin.js` runs Devin single-shot rather than multi-turn — this
      needs an explicit scope decision, not a silent "not load-bearing" verdict. See
      `COVERAGE.md`'s "Recommended priority order for closing gaps" for the next concrete step.
- [ ] **Close priority gaps with targeted tests** per `COVERAGE.md`'s recommended order (starting
      with verifying `gh issue create`/`issue edit` are actually invoked — currently unverified in
      every test).
- [ ] **Decide the multi-turn/single-shot scope question** (Finding 4 in `COVERAGE.md`) before
      running the ablation harness, so "untestable" sections aren't mistaken for "not load-bearing"
      in the final report.
- [ ] **Section-tag the skill file.** Add lightweight markers (e.g. HTML comments
      `<!-- section: verify-repo-access -->` / `<!-- endsection -->`) around each distinct
      instruction block in `skills/github-issue-creator/SKILL.md` so sections can be identified and
      stripped programmatically without hand-editing the file per variant.
- [ ] **Build an ablation runner script** (e.g. `evals/scripts/ablate.js` or a new `Taskfile` task):
  - For each tagged section, generate a temporary variant of `SKILL.md` with that section removed.
  - Point `promptfooconfig.yaml`'s `skillFile` var at the variant (likely via a CLI override or a
    generated temp config) and run the existing test suite against it.
  - Record pass/fail + score deltas per section vs. the full/baseline skill file.
  - Sections whose removal causes **no measurable regression** across the whole suite are removal
    candidates ("not load-bearing" per current test coverage).
- [x] **Add order/sequence assertions (started 2026-07-28).** Added
      `evals/assertions/ghCommandOrder.js`, a generic "these commands must appear in this relative
      order in the mock log" assertion, and wired `auth status -> repo view` into the "Feature
      request" test (closes the Step 1 ordering gap in `COVERAGE.md`). This is reusable for further
      sequencing checks (e.g. `repo view -> issue create`) once gap #1 in `COVERAGE.md`'s priority
      list (verifying `issue create`/`issue edit` are actually invoked) is closed — not all
      procedural ordering is covered yet, just the Step 1 case.
- [x] **Build an instruction → assertion coverage map.** Done — see the checked-off item above and
      `skills/github-issue-creator/COVERAGE.md`. This map, cross-referenced with the ablation
      runner's empirical results (once built), is the actual artifact to present for the 95%
      load-bearing claim — not just an aggregate pass rate.
- [x] **Decided where the coverage map lives and how it's kept in sync:** hand-maintained per-skill
      `COVERAGE.md` next to that skill's `tests.yaml` (not generated, for now). Enforced only by
      convention today: `evals/README.md`'s "Keeping coverage maps in sync" section and a banner at
      the top of `COVERAGE.md` itself require it to be updated in the same PR as any `SKILL.md` or
      `tests.yaml` change. Revisit auto-generation from section tags once the ablation harness's
      tagging work (below) exists — see open question below on enforcement.

## Known issues and fixes

- **Fixed (2026-07-28): eval runs could hang indefinitely.** Running `task eval:github-issue-creator`
  appeared to hang and stop making progress. Root cause: `providers/devin.js` spawned the nested
  `devin` CLI with `stdio: ['pipe', 'pipe', 'pipe']` but never wrote to or closed its stdin — if
  `devin -p` ever tries to read from stdin, the process blocks forever on a pipe nothing will ever
  supply. This exact failure mode is called out in promptfoo's own `ScriptCompletionProvider`
  source, which closes stdin for the scripts it spawns for the same reason ("tools like opencode
  block forever waiting for input"); our nested spawn of the `devin` CLI itself hadn't gotten the
  same treatment. Fix: both `spawnSync` calls now use `stdio: ['ignore', 'pipe', 'pipe']` (via a
  shared `runDevin()` helper) and a configurable timeout (`DEVIN_EVAL_TIMEOUT_MS`, default 10
  minutes) as a second line of defense — any future hang now fails loudly with a clear message
  instead of stalling the whole eval run silently. This predates the Part 1 refactor (confirmed via
  git history) so it isn't a regression we introduced, but it's fixed now regardless. **This fix
  was necessary defense-in-depth but turned out not to be the primary cause of the intermittent
  stalls reported afterward — see the next item.**

- **Fixed (2026-07-29): the actual root cause of the intermittent stalls — `SKILL.md` was never
  being loaded into the prompt at all.** `promptfooconfig.yaml`'s prompt template was
  `"@{{skillFile}}\n\n## User Request\n\n{{request}}"`. `@` is **not** a promptfoo file-reference
  convention (only `file://` is — confirmed via promptfoo's `maybeLoadFromExternalFile` source);
  after Nunjucks substituted `{{skillFile}}`, promptfoo just passed the literal, unresolved string
  `@../../skills/github-issue-creator/SKILL.md` to Devin as part of the prompt text (confirmed via
  the `DEVIN_EVAL_DEBUG_LOG` diagnostic added above: `promptLength=151`, far too short to be the
  real ~11KB skill file). On top of that, the path itself had one `../` too many for its actual
  definition location (`evals/promptfooconfig.yaml` only needs one `../` to reach the repo root).
  Devin never received the skill's actual instructions from promptfoo — every test's behavior so
  far has been Devin treating that bad path as a hint and using its own tools to locate/interpret
  it, with unpredictable (and sometimes very long) search time depending on the run. That fully
  explains the intermittent nature: fast when it got lucky or gave up quickly, slow/stalled when it
  kept searching. Fix: `vars.skillFile` now uses the correct `file://../skills/...` prefix and
  relative path (promptfoo's real file-loading mechanism, verified to work for `vars` context), and
  the prompt template no longer has the bogus `@` prefix. Verified directly: captured the actual
  prompt argument passed to a stand-in fake `devin` before and after the fix — 151 characters
  (literal path string) before, 11,159 characters (the real `SKILL.md` content plus the user
  request) after.
- **Open question this raises:** every eval result recorded before 2026-07-29 (including whatever
  established confidence that `auth-failure`/`repo-failure`/`feature-request` "worked") was
  actually grading Devin's response to a bare, skill-less `@path`-shaped request, not real
  skill-following behavior. Those passing assertions likely reflect Devin's own generic good
  judgment (and, per the earlier debug transcripts, its own initiative in tracking down the actual
  skill file) rather than the skill's instructions being exercised as written. **All 5 tests should
  be re-run and re-reviewed now that the real skill content is actually reaching Devin** — pass/fail
  outcomes may change, and `COVERAGE.md` may need revisiting once we know what Devin does with the
  actual instructions rather than a mangled reference to them.
- **Confirmed fixed (2026-07-29):** user re-ran `task eval:github-issue-creator` (all 5 tests, real
  `devin` CLI, no debug fakes) 4 times after the fix. Every run completed in ~30-35s — no hangs,
  matching the earlier fake-`devin` timing verification. 3 of 4 runs passed all tests; 1 run had 2
  test failures. All 4 runs finished in the same ~30-35s range regardless of pass/fail, confirming
  the failures are ordinary LLM non-determinism (different assertion outcomes from run to run for
  the same input), not a timing/hang issue. **Next: identify which 2 tests failed and why**, since
  that's directly relevant input for `COVERAGE.md` (a test that only sometimes passes on an
  unmodified skill is a flaky/weak assertion, which would corrupt ablation-testing conclusions the
  same way the false-positive risks discussed earlier in this file would).

- Do we want the ablation runner to be a one-off manual script, or a `task ablate:<skill>` target
  that's part of the normal workflow going forward?
- What threshold counts as "no measurable regression" for a section (zero assertion failures across
  the suite, or some tolerance given non-determinism in LLM outputs)?
- The coverage map sync is currently convention-only (PR review discipline), not enforced. Should
  we add a real check later (e.g. fail CI if `SKILL.md`/`tests.yaml` changed more recently in git
  history than `COVERAGE.md`), consistent with the project's general preference for loud failures
  over silently-trusted conventions? Deferred for now since there's no CI wired up yet for evals.
