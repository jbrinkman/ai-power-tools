---
name: github-issue-creator
description: >-
  Create and update GitHub issues using the GitHub CLI (gh).
  Use when asked to "create a GitHub issue", "open an issue", "file an issue",
  "create an issue on GitHub", "update GitHub issue #N", "update issue #N",
  or when the user mentions GitHub issue creation, feature requests,
  bug reports, or issue updates via the command line.
  Guides through interactive requirements gathering, generates professional
  issue content with acceptance criteria, and creates/updates issues via gh commands.
---

<!--
Based on the Jira Story Creator skill by Joe Brinkman.
Adapted to use the GitHub CLI (gh) for issue creation and updates.
-->

# GitHub Issue Creator

Create and update GitHub issues using the GitHub CLI (`gh`). This skill guides
you through an interactive workflow: gather requirements, generate professional
issue content, review it, and create or update the issue on GitHub.

This file only covers Steps 1-2 (prerequisites and mode detection). The rest
of the workflow lives in per-mode reference files under `references/` in this
skill's own directory, so that create-mode and update-mode instructions never
end up in context at the same time — read only the one that applies.

## Step 1: Verify Prerequisites

Before doing anything else, confirm the environment is ready.

### 1a. Check that gh is installed and authenticated

Run:

```bash
gh auth status
```

**If authentication succeeds** (exit code 0, output shows an active account):
continue to 1b.

**If authentication fails** (non-zero exit code or no active account):

1. Tell the user that `gh` is not installed or not authenticated.
2. Suggest they run:
   ```bash
   gh auth login
   ```
3. **Stop the workflow.** Do not proceed until the user confirms they have
   authenticated and you re-verify with `gh auth status`.

### 1b. Verify repository access

If the user's request does not explicitly state a target repository, **ask
the user to confirm it before doing anything else in this step** — including
running `gh repo view`. This applies even if you can detect a plausible
repository from ambient context (e.g., the current working directory's git
remote): you may mention that detected value as a suggestion when you ask,
but do NOT treat it as confirmed and do NOT verify it until the user
responds. Only once the user has stated or confirmed the target repository
(from their original request or from their answer to this question) should
you proceed to verify access:

```bash
gh repo view <owner/repo> --json name,owner 2>&1
```

**If successful**: proceed to Step 2.

**If access denied or not found**:

1. Tell the user the repository was not found or they lack access.
2. Ask them to verify the repository name and their permissions.
3. **Stop the workflow.** Do not proceed until access is confirmed. Do NOT
   proceed anyway just because the user explicitly named this repository —
   an explicit request does not confirm the repository exists or is
   accessible. Wait for the user to confirm the correct repository/access
   before continuing to Step 2.

## Step 2: Determine Workflow Mode

Determine whether this is a **create** or **update** operation.

### Update mode

If the user references an existing issue (e.g., "update issue #42", "edit #15"):

1. Fetch the existing issue:
   ```bash
   gh issue view <number> --repo <owner/repo> --json title,body,labels,assignees,milestone
   ```
2. Treat the existing issue content as the template.
3. **IMMEDIATELY read `references/update-flow.md`** before proceeding. This file
   contains Steps 3-7 of the workflow. Look for it in the same directory tree as
   this SKILL.md file. If you're unsure of the path, glob for 
   `**/github-issue-creator/references/update-flow.md` to locate it.
4. Follow **only** the update flow instructions for the remainder of the workflow.
   Do not use any create-mode questions.

### Create mode

1. **IMMEDIATELY read `references/create-flow.md`** before proceeding. This file
   contains Steps 3-7 of the workflow. Look for it in the same directory tree as
   this SKILL.md file. If you're unsure of the path, glob for
   `**/github-issue-creator/references/create-flow.md` to locate it.
2. Follow the create flow instructions for the remainder of the workflow.
