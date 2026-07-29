# Instruction → Assertion Coverage Map: github-issue-creator

> **Keep this in sync.** Any change to `skills/github-issue-creator/SKILL.md` or
> `evals/skills/github-issue-creator/tests.yaml` must update this file in the same PR — see
> "Keeping coverage maps in sync" in `evals/README.md`. A stale coverage map is worse than none: it
> gives false confidence about what's actually being tested.

Purpose: for each distinct instruction in `skills/github-issue-creator/SKILL.md`, record whether a
current test in `tests.yaml` has an assertion that would actually fail if the instruction were
violated or removed. This is step 1 of `evals/PLAN.md` Part 2 — it must exist *before* we build or
run the ablation harness, so a "no regression when removed" result can be trusted as evidence of
non-load-bearing content rather than a symptom of missing test coverage.

Tests are referenced below by their `description` field in `tests.yaml` (there is no `testId` or
other stable identifier — it was removed as vestigial after the Part 1 refactor, see `PLAN.md`),
shortened here for table readability:

- "Auth failure" = *Step 1a — gh not authenticated*
- "Repo failure" = *Step 1b — repo not found or no access*
- "Feature request" = *Minimal feature request*
- "Bug report" = *Bug report with references and constraints*
- "Update issue" = *Update existing issue*

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

## Step 1: Verify Prerequisites

| Instruction | Test(s) | Assertion | Strength |
|---|---|---|---|
| 1a. Run `gh auth status` before anything else | "Auth failure" | `ghCommandCalled` (`auth status`) | Strong |
| 1a. On auth failure: tell user, suggest `gh auth login`, **stop the workflow** | "Auth failure" | `contains` "gh auth login", "authenticate" | Weak — checks the message text but not that the workflow actually stopped (e.g., that `repo view`/`issue create` were never subsequently called) |
| 1b. Verify repo access via `gh repo view` | "Repo failure", "Feature request" | `ghCommandCalled` (`repo view`) | Strong |
| 1b. On repo failure: tell user, ask to verify name/permissions, **stop the workflow** | "Repo failure" | `contains` "repository", "not found", "verify" | Weak — same gap as above, doesn't confirm the workflow actually stopped |
| Order: auth check happens *before* repo check | "Feature request" | `ghCommandOrder` (`auth status` -> `repo view`) | Strong |

## Step 2: Determine Workflow Mode

| Instruction | Test(s) | Assertion | Strength |
|---|---|---|---|
| Update mode: fetch existing issue via `gh issue view <n> --repo ...` | "Update issue" | `ghCommandCalled` (`issue view 42`) | Strong (call happened) but see note below |
| Update mode: use `--repo` on the `issue view` call | "Update issue" | — | **None** — `ghCommandUsesRepo`/repo-flag checking exists in the codebase but isn't wired into this test |
| Update mode: skip standard info-gathering questions from Step 3 | — | — | **None** |
| Update mode: ask only clarifying questions for ambiguity | — | — | **None** |
| Update mode: present proposed changes as a **diff** against current content | — | — | **None** |
| Create mode: proceed to Step 3 | "Feature request", "Bug report" | (implicit only) | **None** as a distinct check — nothing would fail if this branch were removed as long as the rest of the flow still happens to work |

## Step 3: Gather Information

| Instruction | Test(s) | Assertion | Strength |
|---|---|---|---|
| 3a. Ask whether the user has a template/guidelines | "Feature request" | `containsAny` incl. "template or guidelines" (1 of 3 alternatives) | Weak |
| 3b.1 Ask for repository (if unknown) | — | — | **None** (all test requests already state the repo) |
| 3b.2 Ask for issue type | — | — | **None** |
| 3b.3 Ask for user story / problem statement | "Feature request" | `containsAny` incl. "User Story" (1 of 3) | Weak |
| 3b.4 Ask for reference URLs | "Bug report" | `containsAny` incl. "References"/"reference links"/"reference URLs" | Weak (checks the *output* mentions references, not that a question was asked) |
| 3b.5 Ask for technical constraints | "Bug report" | `containsAny` incl. "backward compatible" phrasing, and separately "Constraints"/"constraint" | Weak |
| 3b.6 Ask for additional context | — | — | **None** |
| 3b.7 Ask for labels | — | — | **None** |
| 3b.8 Ask for assignees | — | — | **None** |
| 3b.9 Ask for milestone | — | — | **None** |
| Ask questions **one at a time**, wait for each answer | — | — | **Untestable (single-turn)** |
| 3c. Template-driven question derivation | — | — | **None** — no test supplies a custom template |
| Checkpoint: present summary, **wait for user confirmation** before Step 4 | "Bug report" | `containsAny` incl. "Here's what I have"/"summary of what I have" (1 of 5 alternatives) | Weak, and the "wait for confirmation" half is **Untestable (single-turn)** |

## Step 4: Analyze Content

| Instruction | Test(s) | Assertion | Strength |
|---|---|---|---|
| Fetch **ALL** provided URLs | — | — | **None** — no assertion confirms a fetch tool was actually invoked |
| Extract relevant context/technical details from fetched pages | — | — | **None** |
| Ask clarifying questions if fetched content raises ambiguity | — | — | **None** |
| **Preserve every URL exactly** — every URL must appear verbatim in References, none omitted | "Bug report" | `contains` exact match for **one** of the two URLs in the request (`.../issues/7`) | Weak — the second URL (`https://example.com/checkout-docs`) is never independently asserted, so a regression that drops just that one URL would not be caught |

## Step 5: Generate the Issue

| Instruction | Test(s) | Assertion | Strength |
|---|---|---|---|
| Title: short, action-oriented, under 12 words | — | — | **None** |
| Body section: User Story | "Feature request" | `containsAny` (1 of 3) | Weak |
| Body section: Overview | — | — | **None** |
| Body section: Problem/Need | — | — | **None** |
| Body section: Proposed Solution | — | — | **None** |
| Body section: Value/Impact | — | — | **None** |
| Body section: Acceptance Criteria (3-5 testable criteria) | "Feature request", "Bug report" | `containsAny` incl. "Acceptance Criteria" (1 of several) | Weak |
| Acceptance criteria formatted as GitHub task list (`- [ ]`) | — | — | **None** — no assertion checks for the checkbox markdown syntax specifically |
| Body section: References, verbatim URLs | "Bug report" | see Step 4 row above | Weak |
| Custom template structure: follow user template exactly, mark unknown fields TBD | — | — | **None** — no test provides a custom template |

## Step 6: Review and Approve

| Instruction | Test(s) | Assertion | Strength |
|---|---|---|---|
| Present complete issue (repo/title/body/labels/assignees/milestone) before creating | "Feature request", "Bug report" (loosely, via "Issue created"/"proposed GitHub issue" alternatives) | `containsAny` | Weak |
| **Wait for explicit approval** before creating/updating | — | — | **Untestable (single-turn)** |
| Revise and re-present on requested changes | — | — | **Untestable (single-turn)** |

## Step 7: Create or Update the Issue

| Instruction | Test(s) | Assertion | Strength |
|---|---|---|---|
| Actually invoke `gh issue create --repo ... --title ... --body ...` | — | — | **None** — no test in the suite verifies the create call itself happened (only that repo access was checked beforehand) |
| Actually invoke `gh issue edit <n> --repo ... --title ... --body ...` | — | — | **None** — "Update issue" only verifies the initial `issue view 42` fetch, never that `issue edit` was subsequently called |
| Use `--repo` correctly on create/edit | — | — | **None** — `ghCommandUsesRepo.js` exists but is not wired into any test |
| Include `--label`/`--assignee`/`--milestone` flags when provided | — | — | **None** |
| Error handling: permission denied on labels/assignees/milestone → skip field, retry, inform user | — | — | **None** |
| Error handling: repo not found → re-verify with user | — | — | **None** (distinct from the Step 1b initial check) |
| Error handling: auth expired mid-flow → re-run Step 1 | — | — | **None** |
| Error handling: network error → retry once, then inform user | — | — | **None** |
| Confirm creation: report issue number + URL | "Feature request" | `containsAny` incl. "Issue created" (1 of 3) | Weak |
| Confirm update: report issue number + URL | — | — | **None** |

## Findings summary

1. **The single biggest gap: no test verifies the skill's core action.** Not one of the 5 current
   tests asserts that `gh issue create` or `gh issue edit` was actually called with the right
   arguments — only that the *preceding* read-only checks (`repo view`, `issue view`) happened.
   This should be the top priority to close before anything else.
2. **`ghCommandUsesRepo.js` and `issueNumberInCommand.js` are unused.** They already implement
   exactly the "was `--repo`/the issue number used correctly" checks needed for the gap above —
   wiring them into "Feature request", "Bug report", and "Update issue" closes several rows cheaply
   with no new assertion code required.
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
5. **Never-exercised branches:** custom-template-driven gathering (Step 3c), all Step 7 error
   handling paths, and most of the individual Step 3b questions (issue type, additional context,
   labels, assignees, milestone) have zero coverage today.

**Closed (2026-07-28):** the Step 1 ordering gap (auth check before repo check) — added
`evals/assertions/ghCommandOrder.js`, a generic "these commands must appear in this relative order
in the mock log" assertion, and wired it into "Feature request" as `auth status -> repo view`. This
is the first order/sequence assertion called for in `PLAN.md` Part 2; the same assertion can be
reused for other sequencing checks (e.g. `repo view -> issue create`) once gap #1 below is closed.

## Recommended priority order for closing gaps (input to Part 2, step 2)

1. Add `ghCommandCalled` assertions confirming `issue create` / `issue edit` are actually invoked
   in "Feature request", "Bug report", and "Update issue".
2. Wire up `ghCommandUsesRepo.js` (repo flag correctness) and `issueNumberInCommand.js` (issue
   edit references the right number) in the same three tests.
3. Add a test covering labels/assignees/milestone end-to-end (request includes them, assert the
   `gh issue create`/`edit` call includes the corresponding flags).
4. Add a test covering a permission-denied response from the mock for labels/assignees/milestone,
   asserting the skill retries without them and informs the user (extends `mocks/gh` with a new
   scenario).
5. Add a second URL assertion in "Bug report" (or a new test) so both provided URLs are
   independently required in the References section, not just one.
6. Add a test with a custom template/guidelines URL to exercise Step 3c / custom template
   structure.
7. Decide and document the multi-turn-instruction question (Finding 4) before treating any
   "Untestable (single-turn)" row as a load-bearing verdict either way.
