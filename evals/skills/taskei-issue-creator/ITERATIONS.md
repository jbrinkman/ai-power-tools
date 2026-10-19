# taskei-issue-creator — EDD iteration log

Eval-Driven Development record for the Taskei (SIM) task creator. Runner:
Promptfoo. Provider/grader: Kiro / claude-sonnet-5.5 (pinned — this skill is
MCP-backed and only certifiable under the Kiro provider's `taskei-mock` agent;
there is no Devin MCP-mock path, so it is intentionally absent from
`promptfooconfig.devin.yaml`).

## Unit boundary

taskei-issue-creator mirrors github-issue-creator's interactive flow (verify
access → determine create/update mode → gather requirements one question at a
time → analyze reference URLs → generate the task → review/approve → write),
but writes through the credentialed builder-mcp **MCP tools**
(`TaskeiGetRooms`, `TaskeiGetRoomResources`, `TaskeiListTasks`,
`TaskeiCreateTask`, `TaskeiUpdateTask`) instead of the `gh` CLI. It does not
touch git, does not open a PR, and does not bulk-migrate (the AEA→Taskei
migration tool is a separate thing).

## The harness problem (why this unit needed new infrastructure)

Every pre-existing skill is CLI-backed, so the eval harness mocks it by
prepending `evals/mocks/` to `PATH` — the skill runs the fake `gh`/`git`
binary and `ghCommandCalled.js` asserts against its command log. Taskei has
**no CLI**: `TaskeiCreateTask` is an MCP tool kiro-cli calls through the
builder-mcp server. There is nothing on `PATH` to shadow, and running the real
tool would create live tasks in a real Taskei room — not repeatable, not safe.

So this unit required building the **MCP analogue** of the PATH-shadow trick:

- `evals/mocks/builder-mcp` — a self-contained Node stdio MCP server speaking
  just enough JSON-RPC (`initialize`, `tools/list`, `tools/call`) to serve a
  kiro-cli session. It implements a CLOSED ALLOWLIST of exactly the five Taskei
  tools the skill may use, returns deterministic room/resource/task fixtures,
  and LOGS every `tools/call` (name + full args) to a per-test command log.
  An off-allowlist tool returns an `isError` result naming the offending tool,
  so a stray call surfaces as a diagnosable failure (same philosophy as the
  closed-allowlist gh/git mocks).
- `evals/.kiro/agents/taskei-mock.json` — a kiro-cli **workspace agent** with
  `includeMcpJson: false` (ignores the real global `mcp.json`) whose
  `builder-mcp` server command points at the mock above. A test selects it via
  an `agent: taskei-mock` var; the Kiro provider passes `--agent taskei-mock`.
- `evals/assertions/taskeiToolCalled.js` — the MCP analogue of
  `ghCommandCalled.js`: parses the mock's log into `{tool, args}` entries and
  asserts `expectedTool` / `mustNotCallTool` / `argContains` /
  `argMustNotContain`.
- Registered in `promptfooconfig.kiro.yaml` (only), `evals/Taskfile.yml`
  (`eval:taskei-issue-creator`, pinned to the Kiro config), and un-ignored in
  `.gitignore` (the root `.kiro/` ignore was scoped to `/.kiro/` so the
  hand-authored eval agent under `evals/.kiro/agents` is tracked).

## Iteration 1 — RED

Wrote 5 test cases (no-writable-rooms stop, create-STORY-end-to-end,
`: Tickets`-room guard, update-uses-TaskeiUpdateTask, requested-label-absent)
plus the mock server, agent config, and assertion. With no SKILL.md, RED.

## Iteration 2 — harness wiring bug: ${VAR} not expanded in agent args

First end-to-end agent probe reported "no Taskei integration" — the mock tools
did not load. A literal-absolute-path agent variant loaded them fine, proving
the cause: **kiro-cli does not expand `${TASKEI_MOCK_SERVER}` in agent
`args`** (env-var expansion applies to the `env` block, as in the global
mcp.json, not to `args`). Fixed by giving the agent a portable RELATIVE command
path (`./mocks/builder-mcp`) resolved from the eval workspace cwd (`evals/`,
where the Kiro provider runs promptfoo), and removed the dead
`TASKEI_MOCK_SERVER` provider plumbing. Mock server smoke-tested directly
(handshake, tools/list, happy-path call, closed-allowlist rejection, log
write) and end-to-end under the agent (TaskeiGetRooms call logged).

Also hit a YAML parse error: an unquoted `: Tickets` inside a test
`description` broke the mapping — quoted the description.

## Iteration 3 — GREEN-ish then a REAL flake: 5/5, then 4/5

First full run 5/5; a second full run 4/5. Per the project rule
("a test that passes locally but fails on a re-run is unreliable and must be
root-caused, not re-run to green"), chased it instead of accepting it.

Root cause (confirmed from the mock log, not guessed): the **create** case
intermittently called `TaskeiCreateTask` **without a `type`** even though the
user explicitly asked for a STORY — the created task came out untyped. The
cause was the SKILL.md's own wording: the Step 7 `type` bullet read
"(omit to create without a type)", which handed the model permission to drop a
type the user had actually specified. A permissive escape hatch in the prompt,
not a harness defect.

Fix in the SKILL (not the test): restated the `type` instruction positively —
"Always pass a `type` on a create: a planning task is a STORY unless the user
said otherwise" — and dropped the omit-the-type clause.

## Iteration 4 — GREEN, stable

Re-ran the full 5-case suite 4× back to back: 4/4 runs at 5/5, and the create
call carried `"type"` on every run (verified by grepping the create case's
isolated mock log directly, not just trusting the pass/fail summary). Flake
eliminated at its root.

## Status

GREEN. 5 test cases against the mock builder-mcp MCP server, each with its own
isolated command log (the 5 cases run concurrently and must not see each
other's tool calls — same isolation discipline as sr-publish). Pinned to the
Kiro provider. Verified stable across repeated full-suite runs.

The reusable payoff: `evals/mocks/builder-mcp` + `taskei-mock.json` +
`taskeiToolCalled.js` make **any** future MCP-backed skill certifiable the same
way CLI-backed skills already are — add the tool to the mock's allowlist and
assert against its log.
