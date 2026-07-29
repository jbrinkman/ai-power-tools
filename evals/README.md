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
├── mocks/
│   └── gh                        # Fake gh CLI that returns scenario-driven responses
├── lib/
│   └── mockLog.js                # Shared helpers for embedding/extracting the gh mock trace
├── assertions/
│   ├── containsAny.js            # Case-insensitive OR contains check
│   ├── ghCommandCalled.js        # Verify a command was captured by the mock gh
│   ├── ghCommandOrder.js         # Verify commands were captured in a given relative order
│   ├── ghCommandUsesRepo.js      # Verify issue create/edit used the expected --repo
│   └── issueNumberInCommand.js   # Verify issue edit referenced the expected issue number
└── skills/
    └── github-issue-creator/
        ├── tests.yaml            # Per-skill test cases
        └── COVERAGE.md           # Instruction -> assertion coverage map (keep in sync, see below)
```

## How it works

- `promptfooconfig.yaml` defines the Devin provider (`claude-sonnet-4.6`) and the grader (`swe-1.6`).
- The skill prompt is loaded directly from `../../skills/<skill>/SKILL.md` so it never goes out of sync with the skill definition.
- `providers/devin.js` prepends `mocks/` to `PATH` before spawning Devin, so the skill executes the fake `gh` script instead of the real GitHub CLI.
- Before each test invocation, `providers/devin.js` creates a private, unique temp file and points the mock at it via `GH_MOCK_LOG_FILE`. `mocks/gh` records every command it receives to that file and returns responses based on test variables (e.g., `authFail`, `repoFail`, `expectedIssue`).
- After Devin finishes, `providers/devin.js` reads that temp file and appends its contents to the provider output, wrapped in delimiters (see `lib/mockLog.js`), then deletes the temp file. Because the trace travels with the specific test's output, it can never collide with or leak into another test's results — there's no shared log file to keep track of.
- Assertions that need to verify real tool usage (`ghCommandCalled.js`, `ghCommandUsesRepo.js`, `issueNumberInCommand.js`) call `extractMockLog(output)` from `lib/mockLog.js` to pull that trace back out of the output before checking it.
- Test files in `skills/<skill>/tests.yaml` are plain YAML lists of test cases imported by the master config.

## Running evaluations

You need `promptfoo` and `devin` available on your PATH. The Taskfile uses `npx promptfoo` so a global install is optional.

```bash
# Evaluate one skill
task eval:github-issue-creator

# Evaluate all skills
task eval:all

# Run a single test by its stable metadata.id (see "Adding a new skill" below), without
# creating a dedicated task or editing the Taskfile — anything after `--` is passed straight
# through to `promptfoo eval`
task eval:github-issue-creator -- --filter-metadata id=feature-request

# Open the Promptfoo dashboard with all evaluation history
task view

# Open the latest HTML report
task view:last

# Clean artifacts
task clean
```

## Adding a new skill

1. Create `evals/skills/<skill>/tests.yaml` as a YAML list of test cases.
2. Set `metadata.skill: <skill>` on each test.
3. Set `metadata.id: <short-stable-slug>` on each test (e.g. `feature-request`) — a stable
   cross-reference key for that skill's `COVERAGE.md` and for `promptfoo eval --filter-metadata
   id=<slug>`. Use `metadata`, not `vars`, since `vars` get forwarded into any mock's environment
   by `providers/devin.js` and this id has nothing to do with the skill under test.
4. Add `- file://skills/<skill>/tests.yaml` to `tests:` in `promptfooconfig.yaml`.
5. Add a `task eval:<skill>` target to `Taskfile.yml`.

## Keeping coverage maps in sync

Skills with a `COVERAGE.md` (e.g. `skills/github-issue-creator/COVERAGE.md`) maintain a
hand-authored map from each instruction in that skill's `SKILL.md` to the specific test/assertion
that would fail if the instruction were violated or removed, referencing tests by their
`metadata.id`. It exists to support load-bearing analysis of the prompt (see `PLAN.md`) — a stale
coverage map is worse than none, since it gives false confidence about what's actually being
tested.

**Any change to a skill's `SKILL.md` or its `tests.yaml`/assertions must update that skill's
`COVERAGE.md` in the same PR.** Treat it the same as updating tests when you change behavior.

## Mock `gh` scenarios

The fake `gh` reads test variables forwarded by `providers/devin.js` as `PROMPTFOO_VAR_*` env vars:

- `authFail=true` → `gh auth status` returns an authentication error.
- `repoFail=true` → `gh repo view` returns a 404 / access-denied error.
- `expectedIssue=42` → `gh issue view 42` returns mock issue data.
- `expectedRepo=test-org/test-repo` → used as the default repo when `--repo` is omitted.
