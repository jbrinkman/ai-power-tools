# Status Report Format Reference

This document is the source of truth for line formatting across all sections of the status report. All skills should reference this when constructing or modifying task lines.

## AI Framework Integrations

### Task Line Format

```
<indent>- [**New**] <task description> - [ECD] - <status> [&rarr; <status>] - [PR link] - [comment]
```

### Component Order

1. **Indent** — 0 spaces for top-level, 2 spaces for subtasks, 4 spaces for sub-subtasks
2. **List marker** — `- `
3. **New marker** (optional) — `**New** ` — indicates this item changed this week
4. **Task description** — concise name of the task
5. **ECD** (optional) — estimated completion date in `MM/DD/YY` format, preceded by ` - `
6. **Status label** — `<span class="...">Status</span>`, preceded by ` - `
7. **Status transition** (optional) — ` &rarr; <span class="...">New Status</span>`
8. **PR link** (optional) — `[PR](url)` or `[PR NNNN](url)`, preceded by ` - `
9. **Comment** (optional) — free-text explanation, preceded by ` - `

### Examples

```markdown
- Valkey Website and Documentation Consolidation - 5/22/26 - <span class="green">In Progress</span>
    - **New** Implement ValkeyVectorStore class for Kilocode - 05/29/26 - <span class="gray">Not Started</span> &rarr; <span class="green">In Progress</span>
    - ValkeyBackend class and vector search - <span class="green">Submitted</span> - [PR](https://...)
    - Create DB-GPT cookbook samples - <span class="red">Blocked</span> - Blocked until VectorStore [PR](https://...) is released.
```

### Key Rules

- ECD always comes **before** the status label, never after.
- When a status transition exists (`&rarr;`), the PR link and comment follow the final status.
- A task with status "Submitted", "In Review", "Awaiting Merge", or "Merged" must include a PR link.
- The `**New**` marker is placed immediately after the list marker (`- `), before the task description.

## Infrastructure (Terraform)

### Task Line Format

```
<indent>- [**New**] [issue link] - <issue description> - [priority] - [PR link] - <status> - [comment]
```

### Component Order

1. **Indent** — 4 spaces for issues under a provider subsection
2. **List marker** — `- `
3. **New marker** (optional) — `**New** `
4. **Issue link** — `[#NNNNN](url)` — GitHub issue reference
5. **Issue description** — brief description of the bug/feature
6. **Priority** (optional) — `**High**`, `**Medium**`, etc.
7. **PR link** (optional) — `[PR NNNNN](url)` — preceded by ` - `
8. **Status label** — `<span class="...">Status</span>`, preceded by ` - ` or a space
9. **Comment** (optional) — free-text explanation, preceded by ` - `

### Examples

```markdown
    - [#46440](https://...) - ElastiCache redis 5.0.6 to valkey 7.2 migration issue - [PR 46526](https://...) <span class="green">Awaiting Merge</span>
    - [#38557](https://...) - Secondary Replication Group issue - **High** - <span class="gray">Not a Bug</span> - Not reproducible
```

## Demos & Documentation

### Task Line Format

```
<indent>- [**New**] <task description> - [ECD] - <status> - [PR link] - [comment]
```

Same component order as AI Framework Integrations. Parent tasks may omit the status if their subtasks carry individual statuses.

## Valkey Search Enhancements

### Task Line Format

```
<indent>- [**New**] <command/feature name> - <status> - [PR link] - [comment]
```

These are typically single-line items without ECDs since they are all in Submitted status awaiting merge.

## Ecosystem Expansion

### Task Line Format

```
- [**New**] <project name> (<language>) integration - <status> - [comment]
```

Comments here typically describe the current state of outreach or blockers.

## Status Classes Reference

| Status | Span Class | Color |
|--------|-----------|-------|
| Not Started | `gray` | Gray |
| In Progress | `green` | Green |
| In Review | `green` | Green |
| Submitted | `green` | Green |
| Done | `green` | Green |
| Awaiting Merge | `green` | Green |
| Merged | `green` | Green |
| On Track | `green` | Green |
| Blocked | `red` | Red |
| Paused | `paused` | Light blue |
| Dropped | `gray` | Gray |
| Not a Bug | `gray` | Gray |
| Closed | `gray` | Gray |

## ECD Format

- Format: `MM/DD/YY` (e.g., `05/29/26`)
- Placement: Always **before** the status label
- When an ECD is missed: Use strikethrough on the old date followed by the new date: `~~05/19/26~~ 05/22/26`
- ECDs are optional but recommended for items with status "In Progress"
