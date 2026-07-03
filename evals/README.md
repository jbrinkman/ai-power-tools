# Skills Evaluation Framework

This directory contains a [Promptfoo](https://promptfoo.dev) evaluation framework for the `ai-power-tools` skills. The framework uses the [Devin CLI](https://www.devin.com/) to execute skills and grade results.

## Structure

```
evals/
├── promptfooconfig.yaml          # Master Promptfoo config (provider, grader, defaults)
├── Taskfile.yml                  # Task runner for per-skill and full evaluations
├── providers/
│   └── devin.js                  # Devin CLI wrapper with mock gh injection
├── mocks/
│   └── gh                        # Fake gh CLI that returns scenario-driven responses
├── assertions/
│   ├── containsAny.js            # Case-insensitive OR contains check
│   └── ghCommandCalled.js        # Verify a command was captured by the mock gh
├── skills/
│   └── github-issue-creator/
│       └── tests.yaml            # Per-skill test cases
└── tmp/                          # Generated logs and debug output
```

## How it works

- `promptfooconfig.yaml` defines the Devin provider (`claude-sonnet-4.6`) and the grader (`swe-1.6`).
- The skill prompt is loaded directly from `../../skills/<skill>/SKILL.md` so it never goes out of sync with the skill definition.
- `providers/devin.js` prepends `mocks/` to `PATH` before spawning Devin, so the skill executes the fake `gh` script instead of the real GitHub CLI.
- `mocks/gh` records every command to `tmp/promptfoo-gh-mock.log` and returns responses based on test variables (e.g., `authFail`, `repoFail`, `expectedIssue`).
- Test files in `skills/<skill>/tests.yaml` are plain YAML lists of test cases imported by the master config.

## Running evaluations

You need `promptfoo` and `devin` available on your PATH. The Taskfile uses `npx promptfoo` so a global install is optional.

```bash
# Evaluate one skill
task eval:github-issue-creator

# Evaluate all skills
task eval:all

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
3. Add `- file://skills/<skill>/tests.yaml` to `tests:` in `promptfooconfig.yaml`.
4. Add a `task eval:<skill>` target to `Taskfile.yml`.

## Mock `gh` scenarios

The fake `gh` reads test variables forwarded by `providers/devin.js` as `PROMPTFOO_VAR_*` env vars:

- `authFail=true` → `gh auth status` returns an authentication error.
- `repoFail=true` → `gh repo view` returns a 404 / access-denied error.
- `expectedIssue=42` → `gh issue view 42` returns mock issue data.
- `expectedRepo=test-org/test-repo` → used as the default repo when `--repo` is omitted.
