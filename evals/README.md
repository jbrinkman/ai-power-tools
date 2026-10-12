# Skills Evaluation Framework

This directory contains a [Promptfoo](https://promptfoo.dev) evaluation framework for the `ai-power-tools` skills. The framework can execute and grade skills through either the [Devin CLI](https://www.devin.com/) or the Kiro CLI, selected by a provider-specific config.

## Structure

```
evals/
├── promptfooconfig.devin.yaml    # Devin-provider config (provider, grader, defaults)
├── promptfooconfig.kiro.yaml     # Kiro-provider config (identical except the provider)
├── Taskfile.yml                  # Task runner; CONFIG var selects the provider config
├── providers/
│   ├── devin.js                  # Devin CLI wrapper with mock gh injection
│   └── kiro.js                   # Kiro CLI wrapper with the same mock gh injection
├── mocks/
│   └── gh                        # Fake gh CLI that returns scenario-driven responses
├── assertions/
│   ├── containsAny.js            # Case-insensitive OR contains check
│   └── ghCommandCalled.js        # Verify a command was captured by the mock gh
├── skills/
│   └── <skill>/
│       └── tests.yaml            # Per-skill test cases
└── tmp/                          # Generated logs and debug output
```

## How it works

- Two provider configs select how skills are executed and graded: `promptfooconfig.devin.yaml` (Devin) and `promptfooconfig.kiro.yaml` (Kiro). They are identical except for the `providers:` / `defaultTest.options.provider` block — keep their `prompts`, `defaultTest`, and `tests` lists in sync.
- The skill prompt is loaded directly from `../../skills/<skill>/SKILL.md` so it never goes out of sync with the skill definition.
- `providers/devin.js` and `providers/kiro.js` each prepend `mocks/` to `PATH` before spawning their CLI, so the skill executes the fake `gh` script instead of the real GitHub CLI.
- `mocks/gh` records every command to `tmp/promptfoo-gh-mock.log` and returns responses based on test variables (e.g., `authFail`, `repoFail`, `expectedIssue`).
- Test files in `skills/<skill>/tests.yaml` are plain YAML lists of test cases imported by both configs.

## Running evaluations

You need `promptfoo` plus the CLI for your chosen provider (`devin` or `kiro-cli`) available on your PATH. The Taskfile uses `npx promptfoo` so a global install is optional. The `CONFIG` task variable selects the provider config (defaults to Devin).

```bash
# Evaluate one skill (default provider = Devin)
task eval:github-issue-creator

# Evaluate all skills through a specific provider
task eval:all:devin
task eval:all:kiro

# Or select the config explicitly on any eval target
task eval:statusrpt-compile CONFIG=promptfooconfig.kiro.yaml

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
3. Add `- file://skills/<skill>/tests.yaml` to `tests:` in **both** `promptfooconfig.devin.yaml` and `promptfooconfig.kiro.yaml` (keep the two lists identical).
4. Add a `task eval:<skill>` target to `Taskfile.yml`.

## Mock `gh` scenarios

The fake `gh` reads test variables forwarded by the active provider (`providers/devin.js` or `providers/kiro.js`) as `PROMPTFOO_VAR_*` env vars:

- `authFail=true` → `gh auth status` returns an authentication error.
- `repoFail=true` → `gh repo view` returns a 404 / access-denied error.
- `expectedIssue=42` → `gh issue view 42` returns mock issue data.
- `expectedRepo=test-org/test-repo` → used as the default repo when `--repo` is omitted.
