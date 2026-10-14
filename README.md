# AI Power Tools

A collection of agent **skills** for enhancing productivity with the Kiro IDE and
Kiro CLI. Each skill is a self-contained markdown procedure (`SKILL.md`, plus
optional `references/` and scripts) that an agent loads on demand when your
request matches the skill's triggers.

> **Note:** This project began as a set of Kiro *Powers* and has since moved to
> the [Agent Skills](https://agentskills.io/specification) format. Skills live
> under `skills/` and are the supported, actively maintained surface. Any
> remaining top-level Power directories are legacy.

## Installing Skills

Skills are discovered from a skills directory. On macOS with the Kiro IDE and the
KiroCrew agent layer there are two such directories, and a skill must be linked
into each surface where you want it available:

- `~/.kiro/skills/` — read by the Kiro IDE "Agent Capabilities → Skills" page and
  the kiro-cli default agent.
- `~/.kiro/crew/skills/` — read by the KiroCrew agent layer.

Discovery is one level deep (`*/SKILL.md`), so symlink **each skill directory
individually** (not the parent `skills/` folder). Example:

```bash
# From a clone of this repo:
mkdir -p "$HOME/.kiro/skills" "$HOME/.kiro/crew/skills"
for d in skills/*/; do
  name=$(basename "$d")
  ln -sfn "$PWD/$d" "$HOME/.kiro/skills/$name"
  ln -sfn "$PWD/$d" "$HOME/.kiro/crew/skills/$name"
done
```

Editing a skill in this repo then propagates live to both surfaces.

## Available Skills

### Jira & Confluence (Atlassian CLI)

These skills drive the [atlassian-cli](https://github.com/omar16100/atlassian-cli)
binary. They require `atlassian-cli` to be installed and authenticated
(`atlassian-cli auth status`).

#### jira-cli

Work with Jira issues via `atlassian-cli`: view, search (JQL), create, update,
transition, comment, assign, link, and manage labels. Provides grounded command
syntax (loaded from `references/`) to avoid trial-and-error, and documents the
expected HTTP-204 "parse error" on mutating commands.

**Triggers:** "manage Jira issues", "create/update/search/view/transition an
issue", "add a comment", "link issues", "assign an issue", "list projects".

#### jira-story-creator

Interactive workflow for creating well-structured Jira stories: gather
requirements one question at a time, analyze reference URLs, generate a
professional description with acceptance criteria, and create the story (with rich
ADF formatting and optional Epic linking) via `atlassian-cli`. Supports optional
standard Valkey-integration subtasks (implementation + cookbook).

**Triggers:** "create a Jira story", "write a user story", "add a story to Jira",
"create a Jira ticket", "create a spike".

*Supersedes the legacy Jira Story Wizard Power.*

#### confluence-cli

Work with Confluence pages via `atlassian-cli`: read, create, update, publish,
search, list, delete, manage labels/comments/restrictions. Provides grounded
command syntax (loaded from `references/`) with critical positional-argument and
`--body`-as-file-path notes.

**Triggers:** "read a confluence page", "create/update/delete a page", "search
confluence", "find a page", "list pages".

### GitHub

#### github-issue-creator

Create and update GitHub issues via the GitHub CLI (`gh`). Interactive
requirements gathering, professional issue content with acceptance-criteria task
lists, template-driven or default structure, and graceful handling of
permission-limited fields (labels/assignees/milestone). Requires `gh` installed
and authenticated.

**Triggers:** "create a GitHub issue", "open/file an issue", "update issue #N".

#### code-review

Perform thorough, language-agnostic code reviews on GitHub pull requests.
Human-in-the-loop: gathers PR + linked issue/Jira context, checks CI status,
presents findings one at a time (correctness, security, performance, testing,
design) with a severity and a single suggested comment, and submits them as one
batched inline review via `gh api`. Requires `gh`; uses Atlassian's `acli` only
when a Jira issue is referenced.

**Triggers:** reviewing pull requests, examining code changes, providing feedback
on code quality.

#### pr-comment-resolver

Work through the review comments on a GitHub PR one at a time, *addressing* each
(the counterpart to `code-review`, which writes them). For each unresolved thread:
summarize it, propose a fix, and wait for you to approve, skip, or supply an
alternative. On an approved fix it commits the change, replies to the thread with
a commit reference, and resolves the thread — then ends with a summary table of
every comment and its resolution. Requires `gh`.

**Triggers:** "resolve/address/respond to PR review comments", "fix the review
comments".

### Valkey / Narrative Review

#### review-valkey-narrative

Evaluate Valkey integration narratives stored in Confluence against standard
technical criteria (KV usage, Redis features/modules, Valkey compatibility, source
location, problem articulation) plus narrative-quality assessment. Adapts to
non-standard narratives, and runs an interactive one-comment-at-a-time approval
workflow that posts approved comments back to the Confluence page via
`confluence-cli`.

**Triggers:** "review a narrative", "evaluate a valkey narrative", "check a
narrative", "review valkey integration", "assess narrative completeness".

*Supersedes the legacy Review Valkey Narrative Power.*

### Improving Engage (EIP)

#### engage-eip-entry

Log EIP (Engagement, Involvement & Participation) activities into Improving's
Engage portal (`engage.improving.com`, Involvement tab) from a calendar/activity
spreadsheet. Two phases: **(1) classify** — read the spreadsheet's events and add a
`Classification` sheet into the same workbook, mapping each row to a valid Engage
Category + Type + Quantity (plus the reporting period derived from the date and any
required extra field such as Organization URL / Attendance Type / Topic Area),
flagging anything uncertain for review; **(2) enter** — drive the Add Activity form
with Playwright, filing each confirmed row under the matching quarter, with
per-row verification and dedup. Bundles a category→type map, the Engage catalog
(point values), and the extra-fields matrix so classification needs no live
re-scraping. Requires an authenticated Engage session for Phase 2.

**Triggers:** "log my EIP points into Engage", "record my involvement activities",
"enter my calendar into the involvement tab", "classify my EIP calendar into Engage
categories/types", "bulk-add involvement activities to engage.improving.com".

### Weekly Status Reports (ElastiCache Agentic)

A pipeline of skills for producing the team's weekly status report. Typical order:
`status-new-report` → edit → `status-review-pr` → `status-generate-weekly-summary`
→ `status-review-report` → `status-finalize-report`. These require `gh` for PR
checks.

#### status-new-report

Create a new weekly status report by copying the latest report, renaming it with
the target date, updating the H1 title date, and running cleanup (strip `**New**`
labels, resolve strikethrough date changes, reset Lowlights/Insights).

**Triggers:** "create status report", "new status report", "weekly report".

#### status-review-pr

Review the PRs in the Submitted, Merged, and Infrastructure tables: check each
PR's live GitHub state, move closed/merged PRs to the right table (with comment
analysis for superseded/rejected/merged-elsewhere), and promote merged PRs to
Completed once the including release is confirmed. Human-in-the-loop per change.

**Triggers:** "review pr status", "check submitted prs", "update pr statuses",
"review merged prs", "check for releases".

#### status-generate-weekly-summary

Generate the "This Week's Progress" bullet list and the executive-summary prose by
scanning the report for `**New**`-labeled tasks (excluding items that end in "Not
Started"). Preserves the Completed Projects section exactly.

**Triggers:** "generate summary", "update progress", "write executive summary",
"generate this week's progress".

#### status-review-report

Pre-PR review of the latest report against a codified checklist (with the previous
report as continuity context), presenting issues one at a time to fix or skip. Can
review a report as originally submitted by PR number.

**Triggers:** "review status report", "check report", "pre-PR review", "review
before submitting".

#### status-finalize-report

Commit outstanding changes to the latest report, push the branch, and open a PR
using the report's H1 heading as the PR title. Falls back to `--no-gpg-sign`, never
force-pushes, and won't create a duplicate PR.

**Triggers:** "finalize report", "submit status report", "push status report",
"create PR for report".

### Weekly Status Reports v2 (statusrpt-*, ElastiCache Agentic)

The successor pipeline to the section above — database-backed reconciliation
with a full audit trail, a normalized bundle contract between stages, and a
deterministic structural gate before anything is pushed. Each stage is a
separate, independently-certified skill (see `evals/skills/statusrpt-*/` for
each one's EDD eval suite).

**This is deliberately TWO separate workflows with a hard human-in-the-loop
boundary between them — they are not linked and must not be automated into a
single run:**

```
Workflow 1 — statusrpt-create:
  statusrpt-pr-tables → statusrpt-gather → statusrpt-compile → sentinel → [STOP, write draft]

          ↓  (human fully reviews the draft — a real stop, not an in-run pause)

Workflow 2 — statusrpt-publish (human invokes it, after review):
  reads the reviewed draft + bundle from disk → lands it on a branch + PR
```

The split is structural, not just a prompt-level pause: `statusrpt-create`
has no path to publishing (it writes a draft to disk and stops), and
`statusrpt-publish` only reads a reviewed draft from disk and never
regenerates it — there is no code path from one into the other, so the human
invoking `statusrpt-publish` IS the review gate. Invoke the individual stage
skills directly only for a standalone/partial run (e.g. re-compiling after a
hand-edited bundle).

#### statusrpt-create

Workflow 1. Runs reconcile → gather → compile → sentinel, writes the draft
report + its bundle to disk, and STOPS — handing the draft to the human for
review. Never pushes, commits, opens a PR, or invokes the publish workflow.

**Triggers:** "create this week's status report", "draft the weekly report",
"build the status report for review", "run the report-creation pipeline".

#### statusrpt-publish

Workflow 2, invoked by the human AFTER they've reviewed the draft. Takes the
reviewed draft + bundle paths (produced earlier by `statusrpt-create`) and
publishes exactly those bytes, unchanged: write the file under the house
path/filename convention, commit on a feature branch, push, and open a PR
titled from the report's H1. Falls back to `--no-gpg-sign`, never
force-pushes, and won't create a duplicate PR. Does NOT write the narrative
(`statusrpt-compile`'s job) or merge the PR (stays with the human).

**Triggers:** "publish the status report", "publish the reviewed report",
"land this week's report", "submit/finalize the status report", "open the
report PR".

#### statusrpt-pr-tables

Reconciles the status database against live GitHub and Confluence state:
moves projects between buckets, repoints superseded PR links, classifies
dropped reasons, confirms completion evidence, maintains the Infrastructure
item lifecycle, and writes a reversible audit trail.

**Triggers:** "reconcile the PR tables", "update the project database",
"run pr-tables reconciliation", "sync the status database".

#### statusrpt-gather

Assembles one normalized `bundle.json` from the already-reconciled database
plus the current Taskei sprint, the Chorus narratives folder, and the prior
report — faithfully, with no house-style filtering (that's compile's job).

**Triggers:** "gather the status bundle", "assemble the report bundle",
"collect this week's status inputs".

#### statusrpt-compile

Writes the customer-facing narrative report from `bundle.json`, applying the
house style (closed badge vocabulary, section order, exclusion rules).

**Triggers:** "compile the status report", "write this week's report",
"draft the weekly report".

#### statusrpt-sentinel

Not an agent skill — plain, zero-dependency Node code
(`sentinels/statusrpt-sentinel/`) that structurally gates compile's output
before it reaches a human or publish: section order, badge vocabulary,
Infrastructure-as-bullets, no leftover placeholders/meta-commentary. See
its own `README.md` for the check list and usage.

#### statusrpt-publish

Lands an already-compiled, sentinel-passed report into the destination repo:
writes it under the house path/filename convention, commits on a feature
branch, pushes, and opens a PR titled from the report's H1. Idempotent on an
existing PR; never force-pushes; merging stays with a human.

**Triggers:** "publish the status report", "land this week's report",
"submit/finalize the status report", "open the report PR".

## Project Structure

```
ai-power-tools/
├── skills/
│   ├── code-review/
│   ├── confluence-cli/
│   ├── engage-eip-entry/
│   ├── github-issue-creator/
│   ├── jira-cli/
│   ├── jira-story-creator/
│   ├── pr-comment-resolver/
│   ├── review-valkey-narrative/
│   ├── status-finalize-report/
│   ├── status-generate-weekly-summary/
│   ├── status-new-report/
│   ├── status-review-pr/
│   └── status-review-report/
├── evals/
├── CHANGELOG.md
├── LICENSE
└── README.md
```

## Contributing

Contributions are welcome. Please ensure all commits follow conventional commit
standards and include DCO signoff.

## License

See the LICENSE file for details.
