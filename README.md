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
batched inline review via `gh api`. Requires `gh`; uses `atlassian-cli` only when
a Jira issue is referenced.

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

## Project Structure

```
ai-power-tools/
├── skills/
│   ├── code-review/
│   ├── confluence-cli/
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
