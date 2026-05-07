---
name: acli-confluence
description: >-
  Work with Confluence pages using the atlassian-cli.
  Use when asked to "read a confluence page", "create a page", "update a page",
  "search confluence", "find a page", "list pages", "delete a page",
  or any Confluence page operations via the command line.
  Provides correct atlassian-cli command syntax to avoid trial-and-error.
---

# Confluence Pages via atlassian-cli

Use `atlassian-cli confluence` to manage Confluence pages. This skill provides
command reference grounding — load the appropriate reference file before
constructing commands.

## Step 1: Verify Prerequisites

### Check that atlassian-cli is installed

```bash
which atlassian-cli
```

If not found, inform the user that `atlassian-cli` is not installed.

### Check authentication

```bash
atlassian-cli auth status
```

If not authenticated, read `${SKILL_ROOT}/references/auth.md` for login instructions.

## Step 2: Load the Appropriate Reference

Based on the user's intent, load the correct reference file:

| Intent | Reference File |
|--------|---------------|
| View a page, list pages, search, list spaces, view versions, view comments | `${SKILL_ROOT}/references/read-commands.md` |
| Create, update, publish, delete pages, manage labels, add comments, restrictions | `${SKILL_ROOT}/references/write-commands.md` |
| Authentication issues (login, logout, switch profiles) | `${SKILL_ROOT}/references/auth.md` |

Load **only** the reference file needed for the current task.

## Step 3: Construct and Execute Commands

1. Read the reference file for exact syntax — positional args, flags, and options
2. Construct the command using only documented flags
3. Use `-f json` for machine-readable output when parsing results
4. Execute the command

## Critical Syntax Notes

- **Page commands use a positional PAGE_ID** — not a `--id` flag: `atlassian-cli confluence page get <PAGE_ID>`
- **Space get uses a positional KEY** — not a `--key` flag: `atlassian-cli confluence space get <KEY>`
- **Search uses positional QUERY** — not a `--query` flag: `atlassian-cli confluence search text '<query>'`
- **Body content is a file path** — `--body ./content.html` points to a file, not inline HTML
- **Output format** uses `-f` flag: `-f json`, `-f yaml`, `-f markdown`, `-f csv`, `-f table`
- **Profile selection** uses `-p <PROFILE>` global option
- Do NOT invent flags. Always consult the reference files.
