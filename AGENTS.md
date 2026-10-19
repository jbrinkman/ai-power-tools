# AGENTS.md

Operating rules for any agent creating or changing skills in this repository.
These are requirements, not suggestions.

## Every skill change follows Eval-Driven Development (EDD)

Creating a **new skill** or changing an **existing skill's** behavior requires a
Promptfoo eval under `evals/skills/<skill>/`. Do not land a skill behavior
change without a passing eval that exercises it. Work the RED → GREEN → REFACTOR
loop:

1. **RED** — Write `evals/skills/<skill>/tests.yaml` first, with `metadata.skill:
   <skill>` on every case. Run it and confirm it fails before the skill (or the
   changed behavior) exists.
2. **GREEN** — Write or change the `SKILL.md` until the suite passes.
3. **REFACTOR** — Remove duplication and dead guidance; re-run and confirm the
   suite still passes.

Record the loop in `evals/skills/<skill>/ITERATIONS.md` (one short section per
iteration: what you asserted, what failed, what you changed). The existing
`ITERATIONS.md` files are the model to follow.

## Wiring a skill into the harness

- Add `- file://skills/<skill>/tests.yaml` to the `tests:` list in **both**
  `evals/promptfooconfig.devin.yaml` and `evals/promptfooconfig.kiro.yaml`, and
  keep the two lists identical — **except** an MCP-backed skill, which goes in
  the Kiro config only (see below) with a one-line note in the Devin config
  saying why it is absent.
- Add an `eval:<skill>` target to `evals/Taskfile.yml`.
- See `evals/README.md` for how the provider, mocks, and assertions fit together.

## Mocking the skill's side effects

A skill's external calls are stubbed so the eval is repeatable and never touches
a real backend. Pick the mechanism by how the skill acts:

- **CLI-backed skill** (shells out to `gh`, `git`, …): the provider prepends
  `evals/mocks/` to `PATH`, so the skill runs the fake binary there. Model the
  mock as a **closed allowlist** — recognize only the exact command sequence the
  skill is specified to run and fail loudly on anything else — and assert against
  its command log with `ghCommandCalled.js` / `gitCommandCalled.js`.
- **MCP-backed skill** (calls builder-mcp tools such as `TaskeiCreateTask`, …):
  the eval runs under a workspace agent in `evals/.kiro/agents/` whose
  `includeMcpJson` is `false` and whose server command points at a mock stdio MCP
  server in `evals/mocks/`. A test selects it with an `agent: <name>` var. The
  mock serves deterministic fixtures, enforces a closed tool allowlist, and logs
  every `tools/call`; assert against that log with `taskeiToolCalled.js`.
  `evals/mocks/builder-mcp` + `evals/.kiro/agents/taskei-mock.json` are the
  reference implementation — extend the mock's allowlist to cover a new tool.
  MCP-backed skills are certifiable only under the Kiro provider, so register
  them in `promptfooconfig.kiro.yaml` only.

## Non-negotiable testing rules

- **Isolate concurrent cases.** Test cases run concurrently. Give each its own
  mock command log (a per-test `logFile` var) and its own scratch directory, so
  one case's calls never contaminate another case's presence/absence check.
- **Root-cause flakes; never re-run to green.** A case that passes on one run and
  fails on another is unreliable and must be diagnosed and fixed — in the skill
  or the harness, whichever is actually wrong — not accepted, skipped, or retried
  until it passes. "Re-run the job" is not a resolution.
- **Fix the skill, not the assertion.** When an assertion catches a real behavior
  gap, change the `SKILL.md`. Do not weaken, delete, or narrow an assertion to
  make a failure disappear.
- **Verify against the artifact, not the summary.** Confirm the eval's claim by
  reading the mock's command log (or the produced file/DB) directly, not only the
  pass/fail count — a harness bug can make an assertion pass for the wrong reason.
- **Prefer deterministic assertions.** Use regex/contains/custom-JS for anything
  mechanically checkable (which tool ran, which argument it carried, headings,
  closed vocabularies). Reserve `llm-rubric` for criteria that genuinely need
  reading comprehension or judgment.
- **Grow sets safely.** Never gate on an exact count of a set meant to grow
  (`len == 5`). Assert the intent (e.g. every fixture on disk produced a result),
  so adding a case never breaks the guard.

## Skill authoring rules

- A `SKILL.md` frontmatter `description` is loaded at every session start, so keep
  it to purpose + when-to-use + concrete trigger phrases. Move behavioral guards,
  input lists, and "does not do X" statements into the body (Role / Binding
  Rules), where they govern execution.
- State instructions positively — the one correct thing to do, with a worked
  example — rather than a list of things to avoid. A "do not X" guard usually
  means the positive instruction was not precise enough.
- A single-responsibility skill must not name the skill that consumes its output;
  use scope-neutral handoff language so a downstream rename cannot break it.
- A human-review gate between two phases is two separately-invoked skills with no
  shared code path, never one skill with an internal "pause and confirm" step.

## After a skill change

Run the skill's eval (`task eval:<skill>` from `evals/`) and confirm it is green
and stable across repeated runs before considering the change done.
