# Skills Evaluation Framework

This directory contains a [Promptfoo](https://promptfoo.dev) evaluation framework for the `ai-power-tools` skills. The framework uses the [Devin CLI](https://www.devin.com/) to execute skills and grade results.

> **In-progress work:** see [`PLAN.md`](./PLAN.md) for the follow-on prompt ablation /
> load-bearing coverage effort.

## Structure

```
evals/
├── promptfooconfig.yaml          # Master Promptfoo config (provider, grader, defaults)
├── Taskfile.yml                  # Task runner for per-skill and full evaluations
├── providers/
│   └── devin.js                  # Devin CLI wrapper with mock gh injection + trace embedding
├── processors/
│   └── github-issue-creator.js   # Per-skill prompt processor (rewrites `gh ` calls to the mock)
├── mocks/
│   └── gh                        # Fake gh CLI that returns scenario-driven responses
├── lib/
│   └── mockLog.js                # Shared helpers for embedding/extracting the gh mock trace
├── assertions/
│   ├── containsAny.js            # Case-insensitive OR contains check
│   ├── ghCommandCalled.js        # Verify a command was captured by the mock gh
│   ├── ghCommandNotCalled.js     # Verify one or more commands were NOT captured by the mock gh
│   ├── ghCommandOrder.js         # Verify commands were captured in a given relative order
│   ├── ghCommandUsesRepo.js      # Verify issue create/edit used the expected --repo
│   └── issueNumberInCommand.js   # Verify issue edit referenced the expected issue number
└── skills/
    └── github-issue-creator/
        ├── tests.yaml            # Per-skill test cases
        └── COVERAGE.md           # Instruction -> assertion coverage map (keep in sync, see below)
```

The skill under test itself lives outside `evals/`, at `../skills/<skill>/`. As of the
`github-issue-creator` progressive-disclosure refactor, a skill directory can look like:

```
skills/github-issue-creator/
├── SKILL.md                    # Frontmatter + shared steps only (e.g. prerequisites, mode
│                                # detection/dispatch) — this is the only file the eval harness
│                                # loads directly (see "How it works" below)
└── references/
    ├── create-flow.md          # Steps specific to one branch of the workflow
    └── update-flow.md          # Steps specific to another branch of the workflow
```

`SKILL.md` instructs the agent to locate and read the appropriate `references/*.md` file itself
(via its own file tools) once it has determined which branch applies, rather than that file being
loaded up front. This is a deliberate application of the Agent Skills specification's
[progressive disclosure](https://agentskills.io/specification#progressive-disclosure) mechanism —
splitting mutually-exclusive branches of a workflow into separate files means each one's exact
phrasing is never sitting in context at the same time as the other's, which matters for skills
where the model was observed bleeding one branch's phrasing into the other (see
`skills/github-issue-creator/COVERAGE.md` Findings 9-10 for the concrete regression this fixed,
and the known risk it introduces — the harness has no way to directly assert the agent actually
found and read the right reference file; that's tracked as an open coverage gap).

## How it works

- `promptfooconfig.yaml` defines the Devin provider (`claude-sonnet-4.6`) and the grader (`swe-1.6`).
- The skill prompt is loaded directly from `../skills/<skill>/SKILL.md` via a `file://`-prefixed `vars` entry (`skillFile: file://../skills/<skill>/SKILL.md`), so it never goes out of sync with the skill definition. The prompt template references it as a plain `{{skillFile}}` — do not prefix it with `@`; that is not a promptfoo file-reference convention (it looks similar to `@`-mention syntax in some editors/CLIs, but promptfoo only recognizes `file://`). An earlier version of this config used `@{{skillFile}}`, which silently passed the literal, unresolved path string to Devin instead of the skill's actual content — see `PLAN.md`'s "Known issues and fixes".
- **Only `SKILL.md` itself is embedded into the prompt this way.** If a skill splits work into `references/*.md` files (see "Structure" above), those are *not* preloaded by the harness — the prompt only ever contains an instruction telling the agent to go find and read the right one at runtime, exactly as it would in a real Devin session. This means the eval genuinely exercises the agent's own file-discovery behavior for those files, for better or worse (see Findings 9-10 in the relevant skill's `COVERAGE.md`).
- `providers/devin.js` sets `GH_CMD` to the absolute path of `mocks/gh` (and also prepends `mocks/` to `PATH` as a fallback), so the skill executes the fake `gh` script instead of the real GitHub CLI. The skill itself uses `${GH_CMD:-gh}` for every `gh` invocation, falling back to the system `gh` when the variable is unset.
- If a test sets `vars.promptProcessor` (e.g. `processors/github-issue-creator.js`), `providers/devin.js` runs the assembled prompt through that module before sending it to Devin. The `github-issue-creator` processor rewrites literal `gh ` command invocations in the prompt text to use the mock binary's path instead, so the pattern is generic and reusable for any skill that needs similar rewriting.
- Before each test invocation, `providers/devin.js` creates a private, unique temp file and points the mock at it via `GH_MOCK_LOG_FILE`. `mocks/gh` records every command it receives to that file and returns responses based on test variables (e.g., `authFail`, `repoFail`, `expectedIssue`).
- After Devin finishes, `providers/devin.js` reads that temp file and appends its contents to the provider output, wrapped in delimiters (see `lib/mockLog.js`), then deletes the temp file. Because the trace travels with the specific test's output, it can never collide with or leak into another test's results — there's no shared log file to keep track of.
- Assertions that need to verify real tool usage (`ghCommandCalled.js`, `ghCommandNotCalled.js`, `ghCommandUsesRepo.js`, `issueNumberInCommand.js`) call `extractMockLog(output)` from `lib/mockLog.js` to pull that trace back out of the output before checking it.
- Test files in `skills/<skill>/tests.yaml` are plain YAML lists of test cases imported by the master config.
- Many assertions in the suite are `assert-set` panels of three `llm-rubric` judges (`swe-1.6`, `codex`, `gemini-3.5-flash`, deliberately excluding the Claude family used for generation) with a `threshold: 0.66` (2-of-3 majority vote), used for open-ended/paraphrasable behavior that plain `contains`/`containsAny` checks proved too brittle for. See the relevant skill's `COVERAGE.md` Findings 6-7 for the rationale and history.

## Running evaluations

You need `promptfoo` and `devin` available on your PATH. The Taskfile uses `npx promptfoo` so a global install is optional.

**One-time setup (after cloning, or after a fresh checkout):** run `evals/setup-skills-symlink.sh`.
This creates `.agents/skills` at the repo root as a symlink to the top-level `skills/` directory, so
Devin CLI's real skill discovery (which scans `.agents/skills/<name>/SKILL.md` relative to its
working directory — see `devin skills paths`) can find every skill in this repo without relocating
or duplicating any of them. This lets evals invoke skills the way a real Devin session would, rather
than splicing `SKILL.md` text into a synthetic prompt ourselves.

This symlink is **intentionally not committed to git** — add it via the script instead of checking
it in, since symlinks don't reliably survive a default-configured Windows git checkout (it would
silently become a plain text file containing the path string instead of a real symlink, breaking
skill discovery for anyone who clones the repo that way). The script is idempotent and safe to
re-run; it refuses to touch `.agents/skills` if something unexpected already exists there instead of
overwriting it.

```bash
# One-time setup: make skills discoverable by Devin CLI's real skill-loading mechanism
task setup
# (equivalent to running ./evals/setup-skills-symlink.sh directly)

# Evaluate one skill
task eval:github-issue-creator

# Evaluate all skills
task eval:all

# Run a single test by its stable metadata.id (see "Adding a new skill" below), without
# creating a dedicated task or editing the Taskfile — anything after `--` is passed straight
# through to `promptfoo eval`
task eval:github-issue-creator -- --filter-metadata id=3-feature-request

# Run every test N times in one report to check for flakiness (each repeat shows up as its
# own row in results.html, so you can scan a given test for pass/fail flips across repeats)
task eval:github-issue-creator -- --repeat 5

# Open the Promptfoo dashboard with all evaluation history
task view

# Open the latest HTML report
task view:last

# Clean artifacts
task clean
```

Since `llm-rubric` judge panels and the agent under test are both non-deterministic, a single
green run is not strong evidence a test (or a fix) is reliable — prefer `--repeat 5` (or more) when
validating a change to a skill or its tests, and read the failing transcript(s) directly in
`results.html` rather than assuming a failure is "just flakiness." Several regressions found during
development of the `github-issue-creator` suite turned out to be real instruction-following gaps
that happened to also look intermittent across runs — see `skills/github-issue-creator/COVERAGE.md`
Finding 10 for examples of both categories side by side.

## Adding a new skill

1. Create `evals/skills/<skill>/tests.yaml` as a YAML list of test cases.
2. Set `metadata.skill: <skill>` on each test.
3. Set `metadata.id: <step-prefix>-<short-stable-slug>` on each test (e.g. `3-feature-request` for
   a test primarily targeting that skill's Step 3) — a stable cross-reference key for that skill's
   `COVERAGE.md` and for `promptfoo eval --filter-metadata id=<slug>`. Use `metadata`, not `vars`,
   since `vars` get forwarded into any mock's environment by `providers/devin.js` and this id has
   nothing to do with the skill under test. If the skill is split into multiple `references/*.md`
   files with their own step numbering (see "Structure" above), the same step number can
   legitimately appear as the prefix for tests targeting different files — disambiguate with the
   id suffix and the test's `description`.
4. Add `- file://skills/<skill>/tests.yaml` to `tests:` in `promptfooconfig.yaml`.
5. Add a `task eval:<skill>` target to `Taskfile.yml`.

## Keeping coverage maps in sync

Skills with a `COVERAGE.md` (e.g. `skills/github-issue-creator/COVERAGE.md`) maintain a
hand-authored map from each instruction in that skill's `SKILL.md` (and any `references/*.md` files
it delegates to) to the specific test/assertion that would fail if the instruction were violated or
removed, referencing tests by their `metadata.id`. It exists to support load-bearing analysis of
the prompt (see `PLAN.md`) — a stale coverage map is worse than none, since it gives false
confidence about what's actually being tested.

**Any change to a skill's `SKILL.md`/`references/*.md` or its `tests.yaml`/assertions must update
that skill's `COVERAGE.md` in the same PR.** Treat it the same as updating tests when you change
behavior. `COVERAGE.md` also carries a running "Findings" log of regressions found and fixed, test
design mistakes discovered, and known flaky/out-of-scope behaviors — keep adding to it rather than
just the tables, since the history of *why* something is tested a certain way is as valuable as the
current state.

## Mock `gh` scenarios

The fake `gh` reads test variables forwarded by `providers/devin.js` as `PROMPTFOO_VAR_*` env vars:

- `authFail=true` → `gh auth status` returns an authentication error.
- `repoFail=true` → `gh repo view` returns a 404 / access-denied error.
- `expectedIssue=42` → `gh issue view 42` returns mock issue data.
- `expectedRepo=test-org/test-repo` → used as the default repo when `--repo` is omitted.

`mocks/gh` requires `GH_MOCK_LOG_FILE` to be set (it fails loudly, non-zero exit, if not) — this is
set per-invocation by `providers/devin.js` (see "How it works" above) and should never need to be
set manually. If a test's mock log comes back empty even though the transcript shows `gh` commands
succeeding, that env var likely wasn't visible inside the Devin CLI subprocess for that run; this
has been observed as a rare, so-far-unresolved harness flakiness (not a skill defect) — see
`skills/github-issue-creator/COVERAGE.md` Finding 10 for a specific instance.
