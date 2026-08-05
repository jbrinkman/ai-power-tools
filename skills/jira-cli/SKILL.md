---
name: jira-cli
description: >-
  Work with Jira issues using the atlassian-cli.
  Use when asked to "manage Jira issues", "create an issue", "update an issue",
  "search Jira", "view an issue", "transition an issue", "add a comment",
  "link issues", "assign an issue", "list projects", "delete an issue",
  or any Jira issue operations via the command line.
  Provides correct atlassian-cli command syntax to avoid trial-and-error.
---

# Jira Issues via Atlassian CLI (atlassian-cli)

This skill targets the Atlassian CLI binary (`atlassian-cli`) and its `jira` subcommands (not a standalone `jira` binary).
Use `atlassian-cli jira` to manage Jira issues. This skill provides command reference grounding —
load the appropriate reference file before constructing commands.

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
| View issues, search (JQL), list projects, get issue details, view comments, view transitions, view fields | `${SKILL_ROOT}/references/read-commands.md` |
| Create, update, delete issues, transition issues, add comments, assign issues, link issues, manage labels, set custom fields | `${SKILL_ROOT}/references/write-commands.md` |
| Authentication issues (login, logout, switch profiles) | `${SKILL_ROOT}/references/auth.md` |

Load **only** the reference file needed for the current task.

## Step 3: Construct and Execute Commands

1. Read the reference file for exact syntax — positional args, flags, and options
2. Construct the command using only documented flags
3. Use `-f json` for machine-readable output when parsing results
4. Execute the command

## Critical Syntax Notes

- **Issue commands use a positional ISSUE_KEY** — not an `--id` flag: `atlassian-cli jira issue get <ISSUE_KEY>`
- **Search uses `--jql` flag** — not a positional argument: `atlassian-cli jira issue search --jql "project = PROJ"`
- **Custom fields use `--field` syntax** — `--field 'fieldName=value'` or `--field 'fieldName={"json":"structure"}'`
- **ADF (Atlassian Document Format)** — description fields accept ADF JSON: `--field 'description={"version":1,"type":"doc","content":[...]}'`
- **Output format** uses `-f` flag: `-f json`, `-f yaml`, `-f markdown`, `-f csv`, `-f table`
- **Profile selection** uses `-p <PROFILE>` global option
- Do NOT invent flags. Always consult the reference files.

## Expected Behavior: Mutating Commands

The Jira API returns HTTP 204 (No Content) for successful update and transition
operations. The CLI may report `"Failed to parse JSON response: error decoding
response body"` with a non-zero exit code. **This is expected and does NOT mean
the operation failed.** Always verify the result with a subsequent `get` command
rather than retrying the mutation.
