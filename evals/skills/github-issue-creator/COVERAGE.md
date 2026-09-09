# Instruction → Assertion Coverage Map: github-issue-creator

> **Keep this in sync.** Any change to `skills/github-issue-creator/SKILL.md`,
> `skills/github-issue-creator/references/create-flow.md`,
> `skills/github-issue-creator/references/update-flow.md`, or
> `evals/skills/github-issue-creator/tests.yaml` must update this file in the same PR — see
> "Keeping coverage maps in sync" in `evals/README.md`. A stale coverage map is worse than none: it
> gives false confidence about what's actually being tested.

Purpose: for each distinct instruction in the `github-issue-creator` skill, record whether a
current test in `tests.yaml` has an assertion that would actually fail if the instruction were
violated or removed. This is step 1 of `evals/PLAN.md` Part 2 — it must exist *before* we build or
run the ablation harness, so a "no regression when removed" result can be trusted as evidence of
non-load-bearing content rather than a symptom of missing test coverage.

Tests are referenced below by their `metadata.id` in `tests.yaml` — a short, stable slug meant for
exactly this kind of cross-referencing (and for `promptfoo eval --filter-metadata id=<slug>`). This
replaces the old `vars.testId`, which was removed as vestigial after the Part 1 refactor (see
`PLAN.md`) because nothing read it; `metadata.id` has a real consumer (this doc, and any future
automated coverage-map generator reading eval results) and deliberately lives in `metadata` rather
than `vars` so it is never forwarded into the gh mock's environment the way `vars.testId` was.

- `1-auth-failure` = *Step 1a — gh not authenticated*
- `1-repo-failure` = *Step 1b — repo not found or no access*
- `2-update-issue` = *Step 2 — update existing issue*
- `2-update-mode-repo-flag` = *Step 2 — update mode uses --repo on issue view*
- `3-create-mode-enters-step3` = *Step 3 (create flow) — create mode enters information gathering*
- `3-feature-request` = *Step 3 (create flow) — minimal feature request*
- `3-bug-report` = *Step 3 (create flow) — bug report with references and constraints*
- `3-missing-repository` = *Step 3 (create flow) — asks for repository when not provided*
- `3-ambiguous-issue-type` = *Step 3 (create flow) — asks for issue type when ambiguous*
- `3-additional-context` = *Step 3 (create flow) — gathers and reflects additional context*
- `3-labels-assignees-milestone` = *Step 3 (create flow) — gathers and reflects labels, assignees, and milestone*
- `3-custom-template` = *Step 3c (create flow) — custom template-driven gathering*
- `3-update-mode-skips-gathering` = *Step 3 (update flow) — update mode skips standard info-gathering*
- `3-update-mode-clarifying-only` = *Step 3 (update flow) — update mode asks only clarifying questions*
- `6-update-mode-shows-diff` = *Step 6 (update flow) — update mode shows diff against current content*

Test IDs are prefixed with the primary step number they target (e.g. `1-` for Step 1). Since the
2026-08-06 progressive-disclosure split, the same step number can appear in both `create-flow.md`
and `update-flow.md` (e.g. two different Step 3 tests, one per flow) — the id suffix and the
`Test(s)` column below disambiguate which flow each test belongs to.

Coverage strength key:

- **Strong** — an assertion directly and specifically checks this behavior (tool call made, exact
  required text/value present); hard to satisfy by accident.
- **Weak** — covered only via a `containsAny` check where this is one of several alternative
  phrases, any one of which satisfies the assertion — the skill could violate this specific
  instruction and the test would still pass because a different alternative matched.
- **None** — no current test/assertion would fail if this instruction were removed or violated.
- **Untestable (single-turn)** — the eval harness invokes Devin single-shot (`devin -p`) with the
  full request up front; it cannot simulate a real back-and-forth conversation. Instructions that
  depend on multi-turn interaction (asking one question at a time and waiting for an answer,
  waiting for explicit user approval before proceeding) cannot be exercised as written by this
  harness at all, regardless of how many tests we add, without a harness change (see Findings).

## File structure (as of the 2026-08-06 progressive-disclosure refactor)

The skill was split so create-mode and update-mode instructions are never loaded into the model's
context at the same time (see Finding 9). This coverage map is organized to match:

```
skills/github-issue-creator/
├── SKILL.md                    # Step 1 (prerequisites), Step 2 (mode detection + dispatch)
└── references/
    ├── create-flow.md          # Steps 3-7, create mode only
    └── update-flow.md          # Steps 3-7, update mode only
```

`SKILL.md` Step 2 instructs the model to read exactly one of the two reference files and follow it
"exclusively" — every row below for create-flow.md / update-flow.md is therefore also implicitly
testing that the correct file was located and read at all (a new failure mode introduced by this
refactor that didn't exist when everything lived in one file — see Finding 9 and the recommended
priority list).

## Step 1: Verify Prerequisites (`SKILL.md`)

| Instruction | Test(s) | Assertion | Strength |
|---|---|---|---|
| 1a. Run `gh auth status` before anything else | `1-auth-failure` | `ghCommandCalled` (`auth status`) | Strong |
| 1a. On auth failure: tell user, suggest `gh auth login`, **stop the workflow** | `1-auth-failure` | `contains` "gh auth login", "authenticate"; `ghCommandNotCalled` (`repo view`, `issue create`, `issue edit`) | Strong — message text plus negative assertions confirm no later workflow commands were invoked |
| 1b. Verify repo access via `gh repo view` | `1-repo-failure`, `3-feature-request` | `ghCommandCalled` (`repo view`) | Strong |
| 1b. On repo failure: tell user, ask to verify name/permissions, **stop the workflow** | `1-repo-failure` | `assert-set` (3-judge LLM-rubric panel, `repoFailureRubric`); `ghCommandNotCalled` (`issue create`, `issue edit`) | Strong — semantic check plus negative assertions confirm no issue mutation commands were invoked after the repo check failed |
| 1b. Do NOT proceed just because the user explicitly named the repo (added 2026-08-06 after an observed regression — see Finding 10) | `1-repo-failure` | Same `assert-set` panel above (the rubric requires the workflow to actually stop) | Strong, but same panel as the row above — no assertion isolates *this specific* rationalization failure mode from a generic "did it stop" check |
| Order: auth check happens *before* repo check | `3-feature-request` | `ghCommandOrder` (`auth status` -> `repo view`) | Strong |

## Step 2: Determine Workflow Mode (`SKILL.md`)

| Instruction | Test(s) | Assertion | Strength |
|---|---|---|---|
| Update mode: fetch existing issue via `gh issue view <n> --repo ...` | `2-update-issue` | `ghCommandCalled` (`issue view 42`) | Strong |
| Update mode: use `--repo` on the `issue view` call | `2-update-mode-repo-flag` | `ghCommandUsesRepo` with `config.command: "issue view"` | Strong |
| Update mode: locate and read `references/update-flow.md`, follow it exclusively | all Step 3/6 update-flow tests (indirectly) | none direct — inferred only from update-flow.md's instructions being followed | **None** — no assertion confirms the *file itself* was opened; a model that hallucinates update-mode behavior without ever reading the file would look identical to one that read it correctly, as long as it happened to produce compliant output |
| Create mode: locate and read `references/create-flow.md`, follow it | `3-create-mode-enters-step3`, `3-feature-request`, `3-bug-report` (indirectly) | same gap as above | **None** — same blind spot as the update-mode row |

## Create Flow (`references/create-flow.md`)

### Step 3: Gather Information

| Instruction | Test(s) | Assertion | Strength |
|---|---|---|---|
| 3a. Ask whether the user has a template/guidelines | `3-feature-request` | `containsAny` incl. "template or guidelines" (1 of 5 alternatives, expanded 2026-07-29 — see Finding 6) | Weak |
| 3b.1 Ask for repository (if unknown) | `3-missing-repository` (added 2026-08-06) | `assert-set` (3-judge LLM-rubric panel, `missingRepositoryRubric`); `ghCommandNotCalled` (`issue create`) confirms the skill can't reach actual issue creation without the repo being settled | Strong on "did it ask" (semantic) and on "didn't create anything"; **no longer checks that `repo view` wasn't called** — see Finding 14, removed 2026-08-07 after real skill invocation (Finding 13) made this unenforceable in a single-shot harness |
| 3b.2 Ask for issue type | `3-ambiguous-issue-type` (added 2026-08-06) | `assert-set` (3-judge LLM-rubric panel, `ambiguousIssueTypeRubric`) | Strong — semantic check that the type question was actually asked when genuinely ambiguous |
| 3b.3 Ask for user story / problem statement | `3-feature-request` | `containsAny` incl. "User Story" (1 of 3) | Weak |
| 3b.4 Ask for reference URLs | `3-bug-report` | `containsAny` incl. "References"/"reference links"/"reference URLs" | Weak (checks the *output* mentions references, not that a question was asked) |
| 3b.5 Ask for technical constraints | `3-bug-report` | `containsAny` incl. "backward compatible" phrasing, and separately "Constraints"/"constraint" | Weak |
| 3b.6 Ask for additional context | `3-additional-context` (added 2026-08-06) | `assert-set` (3-judge LLM-rubric panel, `additionalContextRubric`); `contains` "#58" | Strong-ish — the rubric checks the context was *acknowledged/incorporated*, not specifically that a question was asked about it (the skill's own instruction is just "ask"), so a model that incorporates it into a draft without ever asking would still pass; the literal `contains "#58"` check is a weaker, purely lexical backstop |
| 3b.7 Ask for labels | `3-labels-assignees-milestone` (added 2026-08-06) | `contains` "enhancement" | Weak — only confirms the label value appears somewhere in the response, not that a *question* about labels was asked or that it ends up correctly reflected in a final `gh issue create --label` call (that part of Step 7 remains uncovered — see Finding 5/Recommendation 6) |
| 3b.8 Ask for assignees | `3-labels-assignees-milestone` (added 2026-08-06) | `contains` "octocat" | Weak — same caveat as labels above |
| 3b.9 Ask for milestone | `3-labels-assignees-milestone` (added 2026-08-06) | `contains` "v2.0" | Weak — same caveat as labels above |
| **Do not fabricate "reasonable defaults" for unanswered questions** (added 2026-08-06 after an observed regression — see Finding 10) | `3-create-mode-enters-step3`, and now also `3-missing-repository` (added 2026-08-06) | `assert-set` (3-judge LLM-rubric panels) | Weak — a model that asks one real question and fabricates the rest would still pass these rubric-only checks. (Previously also had a structural backstop via `3-missing-repository`'s `ghCommandNotCalled "repo view"`; removed 2026-08-07, see Finding 14.) |
| Ask questions **one at a time**, wait for each answer | — | — | **Untestable (single-turn)** |
| 3c. Template-driven question derivation | `3-custom-template` (added 2026-08-06) | `assert-set` (3-judge LLM-rubric panel, `customTemplateRubric`); `contains` "Steps to Reproduce" | Strong — semantic check that the custom section names actually drove the response's structure, not just the default sections |
| Checkpoint: present summary, **wait for user confirmation** before Step 4 | `3-bug-report` | `containsAny` incl. "Here's what I have"/"summary of what I have" (1 of 5 alternatives) | Weak, and the "wait for confirmation" half is **Untestable (single-turn)** |

### Step 4: Analyze Content

| Instruction | Test(s) | Assertion | Strength |
|---|---|---|---|
| Fetch **ALL** provided URLs | — | — | **None** — no assertion confirms a fetch tool was actually invoked |
| Extract relevant context/technical details from fetched pages | — | — | **None** |
| Ask clarifying questions if fetched content raises ambiguity | — | — | **None** |
| **Preserve every URL exactly** — every URL must appear verbatim in References, none omitted | `3-bug-report` | `contains` exact match for **one** of the two URLs in the request (`.../issues/7`) | Weak — the second URL (`https://example.com/checkout-docs`) is never independently asserted, so a regression that drops just that one URL would not be caught |

### Step 5: Generate the Issue

| Instruction | Test(s) | Assertion | Strength |
|---|---|---|---|
| Title: short, action-oriented, under 12 words | — | — | **None** |
| Body section: User Story | `3-feature-request` | `containsAny` (1 of 3) | Weak |
| Body section: Overview | — | — | **None** |
| Body section: Problem/Need | — | — | **None** |
| Body section: Proposed Solution | — | — | **None** |
| Body section: Value/Impact | — | — | **None** |
| Body section: Acceptance Criteria (3-5 testable criteria) | `3-feature-request`, `3-bug-report` | `containsAny` incl. "Acceptance Criteria" (1 of several) | Weak |
| Acceptance criteria formatted as GitHub task list (`- [ ]`) | — | — | **None** — no assertion checks for the checkbox markdown syntax specifically |
| Body section: References, verbatim URLs | `3-bug-report` | see Step 4 row above | Weak |
| Custom template structure: follow user template exactly, mark unknown fields TBD | — | — | **None** — no test provides a custom template |

### Step 6: Review and Approve (create mode)

| Instruction | Test(s) | Assertion | Strength |
|---|---|---|---|
| Present complete issue (repo/title/body/labels/assignees/milestone) before creating | `3-feature-request`, `3-bug-report` (loosely, via "Issue created"/"proposed GitHub issue" alternatives) | `containsAny` | Weak |
| **Wait for explicit approval** before creating | — | — | **Untestable (single-turn)** |
| Revise and re-present on requested changes | — | — | **Untestable (single-turn)** |

### Step 7: Create the Issue

| Instruction | Test(s) | Assertion | Strength |
|---|---|---|---|
| Actually invoke `gh issue create --repo ... --title ... --body ...` | — | — | **None** — no test in the suite verifies the create call itself happened (only that repo access was checked beforehand) |
| Use `--repo` correctly on `issue create` | — | — | **None** — `ghCommandUsesRepo.js` exists but is not wired into any create-flow test |
| Include `--label`/`--assignee`/`--milestone` flags when provided | — | — | **None** |
| Error handling: permission denied on labels/assignees/milestone → skip field, retry, inform user | — | — | **None** |
| Error handling: repo not found → re-verify with user | — | — | **None** (distinct from the Step 1b initial check) |
| Error handling: auth expired mid-flow → re-run Step 1 | — | — | **None** |
| Error handling: network error → retry once, then inform user | — | — | **None** |
| Confirm creation: report issue number + URL | `3-feature-request` | `containsAny` incl. "Issue created" (1 of 3) | Weak |

## Update Flow (`references/update-flow.md`)

### Step 3: Clarify the Requested Change

| Instruction | Test(s) | Assertion | Strength |
|---|---|---|---|
| Treat fetched issue content as baseline; do NOT ask standard create-mode questions (issue type, references, constraints, labels, assignees, milestone) | `3-update-mode-skips-gathering` | `assert-set` (3-judge LLM-rubric panel, `updateSkipsStep3Rubric`) | Strong — semantic check that standard questions are absent. **Observed flaky** at ~1-in-5 in a 5x `--repeat` run even after two rounds of wording fixes (see Finding 10) — the progressive-disclosure split (Finding 9) is the current mitigation, confirmed 5/5 (and 50/50 suite-wide) in a follow-up `--repeat 5` run |
| Ask only clarifying questions about the substance of the change | `3-update-mode-clarifying-only` | `assert-set` (3-judge LLM-rubric panel, `updateClarifyingOnlyRubric`) | Strong — semantic check that any questions asked are narrowly scoped |
| Carry references/labels/assignees/milestone over unchanged unless the user says otherwise | — | — | **None** — no test asserts the *carried-over* values actually appear unchanged in the final draft/diff; current tests only check that the model didn't *ask about* them |
| It is acceptable to ask no questions and proceed directly when the request is already detailed enough | `6-update-mode-shows-diff` (indirectly — this is the scenario that test's request was redesigned around on 2026-08-06) | `assert-set` (3-judge LLM-rubric panel, `updateShowsDiffRubric`) | Weak — the diff-formatting rubric is what's actually graded; nothing directly asserts "and it skipped asking questions to get there," so a model that asks one small question and still produces a diff-formatted answer would look the same to this test |

### Step 4: Analyze Content (update mode, conditional — only if the user provided URLs)

| Instruction | Test(s) | Assertion | Strength |
|---|---|---|---|
| Skip straight to Step 5 when no URLs were provided (the common case for all current update-mode tests) | all update-flow tests (implicitly, since none provide URLs) | none | **None** — no test explicitly confirms the skip-vs-fetch branch; it just happens that no current test would exercise the fetch path |
| Fetch user-provided URLs and incorporate them when present | — | — | **None** — no update-mode test provides a reference URL in the request; this entire conditional branch is new (added as part of the 2026-08-06 progressive-disclosure split) and has zero coverage |

### Step 5: Draft the Updated Content

| Instruction | Test(s) | Assertion | Strength |
|---|---|---|---|
| Only change what the user's request implies; leave everything else identical to the existing issue | — | — | **None** — no assertion diffs the draft against the fetched baseline field-by-field |

### Step 6: Review and Approve (update mode — diff format)

| Instruction | Test(s) | Assertion | Strength |
|---|---|---|---|
| Present proposed changes as a **diff** against current content, not just the final version | `6-update-mode-shows-diff` | `assert-set` (3-judge LLM-rubric panel, `updateShowsDiffRubric`) | Strong — semantic check for before/after delta presentation. Request rewritten 2026-08-06 to be fully specified (see Finding 8) so this test no longer collides with `3-update-mode-clarifying-only`'s need for an ambiguous request |
| **Wait for explicit approval** before updating | — | — | **Untestable (single-turn)** |
| Revise and re-present on requested changes | — | — | **Untestable (single-turn)** |

### Step 7: Update the Issue

| Instruction | Test(s) | Assertion | Strength |
|---|---|---|---|
| Actually invoke `gh issue edit <n> --repo ... --title ... --body ...` | — | — | **None** — `2-update-issue` only verifies the initial `issue view 42` fetch, never that `issue edit` was subsequently called |
| Use `--repo` correctly on `issue edit` | — | — | **None** |
| Include `--add-label`/`--add-assignee`/`--milestone` flags when provided | — | — | **None** |
| Error handling: permission denied on labels/assignees/milestone → skip field, retry, inform user | — | — | **None** |
| Error handling: repo not found → re-verify with user | — | — | **None** |
| Error handling: auth expired mid-flow → re-run Step 1 | — | — | **None** |
| Error handling: network error → retry once, then inform user | — | — | **None** |
| Confirm update: report issue number + URL | — | — | **None** |

## Findings summary

1. **The single biggest gap: no test verifies the skill's core action.** Not one of the current
   tests asserts that `gh issue create` or `gh issue edit` was actually called with the right
   arguments — only that the *preceding* read-only checks (`repo view`, `issue view`) happened.
   This should be the top priority to close before anything else, and now applies symmetrically to
   both `create-flow.md` Step 7 and `update-flow.md` Step 7.
2. **`ghCommandUsesRepo.js` and `issueNumberInCommand.js` are unused.** They already implement
   exactly the "was `--repo`/the issue number used correctly" checks needed for the gap above —
   wiring them into `3-feature-request`, `3-bug-report`, and `2-update-issue` closes several rows
   cheaply with no new assertion code required.
3. **Most `containsAny` assertions are "weak" by construction.** Because they accept any one of
   several alternative phrases, a test can pass even if the specific instruction they're nominally
   checking was never followed, as long as some other part of the response happens to contain one
   of the other alternatives. These aren't wrong to have, but they shouldn't be counted as proof a
   section is load-bearing — only the tool-call-based assertions (`ghCommandCalled`,
   `ghCommandUsesRepo`, `issueNumberInCommand`) currently give a strong signal.
4. **A structural limitation, not a test gap:** several instructions (ask one question at a time
   and wait; wait for explicit approval before creating/updating; present a revision loop) cannot
   be exercised by this harness at all today, because `providers/devin.js` runs Devin single-shot
   with the entire request supplied up front (see `evals/PLAN.md` open questions). These need an
   explicit decision — either accept them as out-of-scope for the load-bearing claim (documented
   here, not silently dropped) or invest in a multi-turn harness capability before claiming
   anything about them.
5. **Never-exercised branches:** custom-template-driven gathering (Step 3c) and most of the
   individual create-flow Step 3b questions (issue type, additional context, labels, assignees,
   milestone) **closed 2026-08-06** — see Finding 11. Still open: all Step 7 error handling paths
   in both flows, and — newly, post-refactor — update-flow's conditional Step 4 (URL provided in an
   update request).
6. **Confirmed flaky assertions (2026-07-29), root cause: exact-substring `contains` checks on
   paraphrasable prose.** After fixing the prompt-loading bug (see `PLAN.md`), 6 consecutive runs of
   the unmodified skill showed `1-repo-failure` failing 3/6 times — once missing "not found", once
   missing "verify", once missing both — and `3-feature-request` failing 1/6 time on its
   3-alternative `containsAny` for the template/guidelines question. These were `contains`/
   `containsAny` checks against natural-language phrasing the model paraphrases inconsistently
   (e.g. "I couldn't locate that repository" instead of literal "not found"), not real skill
   regressions — confirmed by the fact that every run finished in the same ~30-35s regardless of
   pass/fail. Superseded by Finding 7 (LLM-as-judge) for `1-repo-failure`.
7. **LLM-as-judge (`assert-set` + `llm-rubric`) rolled out across the suite (2026-07-29).**
   Semantic grading structurally eliminates paraphrase-brittleness (the root cause of Finding 6)
   instead of enumerating phrasing alternatives, but introduces its own risks: (a) the judge
   model's own grading can be inconsistent between runs — don't trust it without repeated-run
   evidence (see Finding 10, which is exactly this risk materializing); (b) real added latency,
   since each `llm-rubric` check spawns another `devin -p` subprocess; (c) judge panels use
   `assert-set` with `threshold: 0.66` (2-of-3 majority vote) across three vendors — `swe-1.6`
   (Cognition), `codex` (OpenAI), `gemini-3.5-flash` (Google) — deliberately excluding
   `claude-sonnet-4.6` (the generation model) and the whole Claude family, to avoid both
   self-grading bias and correlated-family bias between judges.
8. **`6-update-mode-shows-diff`'s request was redesigned (2026-08-06) to resolve a direct conflict
   with `3-update-mode-clarifying-only`.** Both originally used the same intentionally-ambiguous
   request ("...reflect the new API rate limiting requirements"). A model that correctly asks a
   clarifying question first (rewarded by `3-update-mode-clarifying-only`) necessarily has nothing
   to diff yet (penalized by `6-update-mode-shows-diff`), and vice versa — these two tests could not
   both reliably pass against the same request in a single-shot harness. Fix:
   `6-update-mode-shows-diff` now uses a fully-specified request (exact title/body/label change) so
   it can isolate diff-formatting behavior without needing a clarifying turn first.
9. **Progressive-disclosure split (2026-08-06): `SKILL.md` broken into a router (Steps 1-2) plus
   `references/create-flow.md` and `references/update-flow.md` (Steps 3-7 each).** Motivated by
   Finding 10's residual flakiness: even after two rounds of explicit "do NOT ask about reference
   URLs" wording in the single-file version, `3-update-mode-skips-gathering` still failed ~1-in-5 in
   a repeated run, asking the exact question the create-mode Step 3b text (a few hundred lines away
   in the same context) primes the model toward. Splitting into mode-specific files means the
   *other* mode's exact phrasing is never loaded into context at all for a given run. This follows
   the Agent Skills spec's documented progressive-disclosure mechanism (`references/`, loaded on
   demand via relative path) rather than introducing a second top-level skill. **Verified with a
   follow-up `--repeat 5` run (50 total invocations): 50/50 passed**, including 5/5 on
   `3-update-mode-skips-gathering` specifically — up from 49/50 (with that same test failing once)
   in the `--repeat 5` run taken just before this split. Still only one repeated-run sample; treat
   as "strong signal the fix worked," not "proven zero flake rate forever."
10. **Observed regressions during live eval runs (2026-08-06), i.e. real gaps this coverage map
    correctly predicted vs. genuine flakiness:**
    - `3-update-mode-skips-gathering` / `3-update-mode-clarifying-only`: model asked standard
      Step 3 questions (references, labels/assignees/milestone) in update mode despite explicit
      skill instructions to skip them — fixed via progressively stronger wording (two rounds), then
      Finding 9's structural split after wording alone plateaued at ~1-in-5 residual flake rate.
    - `6-update-mode-shows-diff`: model presented the full new content with no before/after delta —
      fixed by adding an explicit update-mode diff template to Step 6 (previously only Step 2
      mentioned "diff" once, with no concrete format).
    - `3-create-mode-enters-step3`: model fabricated "reasonable defaults" for unanswered Step 3
      questions instead of asking them, skipping the Checkpoint confirmation entirely — fixed via
      an explicit anti-fabrication instruction in Step 3b.
    - `1-repo-failure`: model told the user about a 404 but then explicitly rationalized continuing
      anyway ("since you explicitly requested this repository, I'll proceed with it") instead of
      stopping — fixed via an explicit anti-rationalization clause in Step 1b. Notably, this test
      had passed cleanly in an earlier run before regressing in a later one, i.e. it is itself an
      example of the kind of run-to-run flakiness Findings 6/7 describe, but with a genuine
      instruction-following gap as the cause rather than judge-grading noise — a reminder that not
      every intermittent failure is "just flakiness" and each one needs to be read on its own
      transcript before deciding whether to fix or dismiss.
    - One failure (`1-repo-failure` scoring 0.80 on an otherwise-passing run) was traced to a
      harness issue rather than a skill defect: `GH_MOCK_LOG_FILE` (set by `providers/devin.js` for
      the spawned `devin` process) was not visible when the model invoked `gh`, and the model's own
      workaround (manually setting its own value) wrote the mock log to a path the harness never
      reads back. Deliberately left unfixed / accepted as known flakiness for now rather than
      changing the skill.
11. **Five new create-flow Step 3 tests added (2026-08-06) to close the gaps identified in
    Finding 5:** `3-missing-repository` (3b.1, doubles as an anti-fabrication check via
    `ghCommandNotCalled "repo view"`), `3-ambiguous-issue-type` (3b.2), `3-additional-context`
    (3b.6), `3-labels-assignees-milestone` (3b.7-3b.9, combined into one test since all three are
    the same "was it incorporated" question), and `3-custom-template` (3c). All five follow the
    established convention (Findings 6/7): `llm-rubric` judge panels for open-ended/paraphrasable
    behavior ("did it ask", "did it follow the template"), plain `contains` only for literal
    technical terms lifted verbatim from the test's own request (`"#58"`, `"enhancement"`,
    `"octocat"`, `"v2.0"`, `"Steps to Reproduce"`). **Not yet run** — these are net-new tests with
    no empirical pass/fail data yet, unlike the rest of this map's rows. Two known limitations
    worth flagging before trusting them: (a) `3-labels-assignees-milestone`'s `contains` checks only
    confirm the values appear *somewhere* in the response (e.g. even if just echoed back in a
    clarifying question), not that they end up correctly attached to a final `gh issue create
    --label/--assignee/--milestone` call — that remains a Step 7 gap (Recommendation 6); (b)
    `3-additional-context`'s rubric accepts incorporating the context into a draft as satisfying
    "acknowledge additional context," even though the skill's own Step 3b.6 instruction is
    specifically to *ask* about it — a model that skips asking and jumps straight to a plausible
    draft would still pass.

12. **`ghCommandNotCalled.js` extended (2026-08-06) to accept an array of forbidden commands, not
    just a single string.** Previously, forbidding multiple commands in one test required repeating
    the whole assertion once per command (three separate assertions in `1-auth-failure`, two each in
    `1-repo-failure` and `3-missing-repository`). Consolidated all three into single assertions with
    `forbiddenCommand: [...]`; the coverage/strength claims for these rows are unchanged — this was
    a test-authoring ergonomics improvement, not a behavior change. Backward compatible: a plain
    string value still works for single-command cases.
13. **Harness rework (2026-08-07): the eval now invokes the skill via Devin CLI's real skill-loading
    mechanism instead of splicing `SKILL.md` text into a synthetic prompt.** `evals/promptfooconfig.yaml`'s
    prompt is now `"@skills:{{skillName}} {{request}}"`; `providers/devin.js` sets `cwd` to the repo
    root and requires `.agents/skills` to be symlinked to the top-level `skills/` directory (see
    `evals/setup-skills-symlink.sh` / `task setup` / `evals/README.md`) so Devin's real skill
    discovery finds it there. The old `promptProcessor` mechanism (regex-rewriting literal `gh `
    commands in the spliced prompt text to the mock's path) is retired — it's now impossible in
    principle, since there's no prompt text containing the skill's `gh` commands to rewrite; the
    skill's literal `gh ...` commands run for real (as far as Devin is concerned) and are intercepted
    purely via `PATH` shadowing.
    - **This surfaced a serious, since-fixed safety gap**: a manual smoke test of `2-update-issue`
      actually invoked the real `gh` CLI (visible from a real GitHub username and a real "repository
      not found" API error in the output) instead of the mock, with an empty `GH_MOCK_LOG`. Root
      cause: Devin's exec tool runs commands through a shell that sources the user's real `~/.zshrc`,
      which (very commonly, e.g. `export PATH="/opt/homebrew/bin:$PATH"`) re-prepends the real `gh`'s
      directory ahead of the mock directory we'd injected into `PATH` — a plain `bash -lc 'command -v
      gh'` check in the same env passed, because that check doesn't reproduce whatever shell
      invocation Devin's exec tool actually uses internally. Fixed with two independent layers in
      `providers/devin.js`: (a) `ZDOTDIR` pointed at an empty scratch dir so zsh finds none of the
      user's real dotfiles to source, and (b) a fail-safe regardless of (a) — `GH_CONFIG_DIR`
      pointed at an empty scratch dir and `GH_TOKEN`/`GITHUB_TOKEN` stripped from the child env, so
      that even if the real `gh` binary is somehow still reached, it has no valid credentials and can
      only fail with an auth error rather than actually mutate a real repo. A `verifyMockGhOnPath()`
      pre-check (isolated `command -v gh` in the exact env about to be passed to `devin`) remains as
      an additional signal but is **not** sufficient on its own, per the failure above — it validates
      a different code path than Devin's actual exec tool uses internally.
    - **A second, independent safety property of this whole harness, unrelated to the fix above**:
      because the harness is single-shot (`devin -p`), no test can ever reach the skill's actual
      mutating commands (`gh issue create`/`gh issue edit`) regardless of mocking correctness, since
      the skill always waits for explicit human approval first (Step 6) and there is no real second
      turn in this harness to supply that approval. This doesn't reduce the importance of the mock
      fix above (read-only commands like `repo view`/`issue view` still must not hit the real API),
      but it is a relevant piece of context for reasoning about worst-case impact.
    - **Verified end-to-end** via manual smoke tests before running the full suite: real skill
      invocation confirmed (transcripts explicitly say "I'll invoke the `github-issue-creator`
      skill..."), reference-file location resolved correctly, and the mock fix confirmed by re-running
      the exact scenario that had leaked to the real API and observing a fully mocked, correctly
      populated `GH_MOCK_LOG` on the retry.
14. **Running from the real repo root (Finding 13) surfaced a new, legitimate ambient-context
    behavior that `3-missing-repository`'s original assertions didn't anticipate (2026-08-07).**
    Previously Devin ran from `evals/` with no meaningful "current project"; now it genuinely runs
    from the real `ai-power-tools` repo root, so when a test omits the target repo, the model can
    detect this repo's own git remote as a plausible candidate. Observed behavior: the model asked
    the user to confirm the detected repo (LLM judges scored this 1.0 — correct per the rubric), but
    also called `gh repo view` on it, failing the test's original `ghCommandNotCalled: repo view`
    assertion. Attempted fix: added explicit `SKILL.md` wording (Step 1b) requiring the skill to ask
    and wait for confirmation *before* verifying any detected/ambient repository. This did not fully
    work: a follow-up run showed the model asking the question and then, within the *same*
    completion, self-answering it ("I'll use the detected repository...") and proceeding to verify
    anyway — the same "Untestable (single-turn)" limitation as other wait-for-confirmation
    instructions (Finding 4), just newly exposed by this test rather than fixable via wording, since
    there is no real second turn in this harness for such a model to actually pause on. Resolution:
    removed `repo view` from `3-missing-repository`'s `ghCommandNotCalled` list (kept `issue create`,
    which remains meaningfully enforceable), and kept the Step 1b wording change since it's better
    guidance for real multi-turn usage even though this harness can't verify the "wait" half of it.

## Recommended priority order for closing gaps (input to Part 2, step 2)

1. ~~Run the 5 new create-flow Step 3 tests from Finding 11 for the first time~~ — **done
   (2026-08-07), as part of the first full-suite run under the Finding 13 real-skill-invocation
   rework: 13/15 passed.** The 2 failures were `3-missing-repository` (Finding 14, resolved by
   narrowing the assertion) and `3-update-mode-skips-gathering` (a recurrence of the
   labels/assignees/milestone question-leak pattern from Findings 9-10 — see item 2 below, this is
   the first data point for that specific regression under the new real-invocation harness).
2. **Re-run the suite with `--repeat 5`+ under the new Finding 13 real-skill-invocation harness** to
   get a fresh flake-rate baseline — the 50/50 result from Finding 9 was measured under the old
   text-splicing approach, before this session's harness rework, so it's not necessarily still
   representative. Pay particular attention to `3-update-mode-skips-gathering`, which failed once
   already under the new harness (see item 1).
3. Add a test that directly confirms the model located and read the correct `references/*.md` file
   for its mode (e.g. a javascript assertion on the transcript/tool-call log, if the harness exposes
   one) — closes the new Step 2 "locate and read" blind spot called out above, which the current
   suite only tests indirectly through downstream behavior.
4. Add `ghCommandCalled` assertions confirming `issue create` / `issue edit` are actually invoked
   in `3-feature-request`, `3-bug-report`, and `2-update-issue`.
5. Wire up `ghCommandUsesRepo.js` (repo flag correctness) and `issueNumberInCommand.js` (issue
   edit references the right number) in the same three tests.
6. Add an update-mode test where the request includes a reference URL, to exercise update-flow.md's
   new conditional Step 4 (currently zero coverage — see Finding 5).
7. Extend `3-labels-assignees-milestone` (or add a follow-up test) to assert the final `gh issue
   create` call actually includes `--label enhancement --assignee octocat --milestone v2.0` — closes
   the Step 7 gap called out in Finding 11(a); today it only checks the values appear somewhere in
   the response text.
8. Add a test asserting that update mode's carried-over fields (references/labels/assignees/
   milestone) actually appear unchanged in the final diff/draft, not just that the model didn't ask
   about them.
9. Add a test covering a permission-denied response from the mock for labels/assignees/milestone,
   asserting the skill retries without them and informs the user (extends `mocks/gh` with a new
   scenario).
10. Add a second URL assertion in `3-bug-report` (or a new test) so both provided URLs are
    independently required in the References section, not just one.
11. Decide and document the multi-turn-instruction question (Finding 4) before treating any
    "Untestable (single-turn)" row as a load-bearing verdict either way.
