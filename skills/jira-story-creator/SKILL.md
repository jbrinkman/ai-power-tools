---
name: jira-story-creator
description: >-
  Create well-structured Jira stories using the Atlassian CLI (acli).
  Use when asked to "create a Jira story", "write a user story", "add a story to Jira",
  "create a Jira ticket", "create a spike", or when the user mentions Jira issue creation,
  user stories, acceptance criteria, or epic linking via the command line.
  Guides through interactive requirements gathering, generates professional descriptions
  with acceptance criteria, and creates stories via acli commands.
---

<!--
Based on the Jira Story Wizard Kiro Power by Joe Brinkman.
Adapted to use the Atlassian CLI (acli) instead of the Jira MCP server.
-->

# Jira Story Creator

Create well-structured Jira stories using the Atlassian CLI (`acli`). This skill
guides you through an interactive workflow: gather requirements, generate a
professional story with acceptance criteria, review it, and create it in Jira.

## Step 1: Verify Prerequisites

Before doing anything else, confirm the environment is ready.

### 1a. Check that acli is installed

Run:

```bash
which acli
```

**If the command is found** (exit code 0, prints a path): continue to 1b.

**If the command is not found** (non-zero exit code or empty output):

1. Tell the user that `acli` (the Atlassian CLI) is not installed or not on their PATH.
2. Direct them to the installation guide:
   [Atlassian CLI — Getting Started](https://developer.atlassian.com/cloud/acli/guides/how-to-get-started/)
3. **Stop the workflow.** Do not proceed until the user confirms installation and
   you re-verify with `which acli`.

### 1b. Check Jira authentication

Run:

```bash
acli jira auth status
```

**If authentication succeeds** (exit code 0, output shows a logged-in account):
proceed to Step 2.

**If authentication fails** (non-zero exit code, or output contains "unauthorized",
"not logged in", or "no authenticated"):

1. Tell the user they are not currently authenticated with Jira.
2. Suggest they run one of the following to log in:
   - Interactive (OAuth via browser): `acli jira auth login --web`
   - API token: `echo <token> | acli jira auth login --site "site.atlassian.net" --email "user@example.com" --token`
3. **Stop the workflow.** Do not proceed until the user confirms they have
   authenticated and you re-verify with `acli jira auth status`.

## Step 2: Gather Information

Collect the following by asking questions **one at a time**. Wait for each answer
before asking the next.

1. **Epic Link** — Check if the user already mentioned an Epic key (e.g. `PROJ-122`).
   If not, ask: *"What Epic should this story be linked to? (e.g. PROJ-122, or 'none')"*

2. **Project Key** — Extract from the Epic key if provided (e.g. `PROJ` from `PROJ-122`).
   If no Epic, ask: *"What Jira project key should this story be created in? (e.g. PROJ)"*

3. **User Story Components** — If the user gave a partial story, extract the actor,
   action, and benefit. If any are missing, ask:
   *"Let's build the user story. Please provide: As a [actor/role], I want [action], so that [benefit]."*

4. **GitHub Repository URL** (optional) — Ask:
   *"What is the GitHub repository URL? (or 'none')"*

5. **Documentation URL** (optional) — Ask:
   *"What is the documentation URL? (or 'none')"*

6. **Additional Reference URLs** (optional) — Ask:
   *"Any additional reference URLs? Provide them with labels (e.g. 'API Guide: https://...') or 'none'."*

7. **Additional Context** (optional) — Ask:
   *"Any additional context or requirements? (or 'none')"*

## Step 3: Analyze Content

After gathering all information:

1. If the user provided URLs, fetch and review them for project context, technical
   details, and integration points.
2. Synthesize the information to understand the project purpose, architecture, and
   user needs.

## Step 4: Generate the Story

Compose the complete story with these components:

### Title

- Short, action-oriented, under 12 words.
- Examples: "Implement OAuth2 authentication service", "Add real-time dashboard notifications"

### Description

Structure with these sections:

- **User Story**: `As a [actor], I want [action] so that [benefit]`
- **Overview**: Brief background (2-3 sentences)
- **Problem/Need**: What challenge this addresses (2-3 sentences)
- **Proposed Solution**: How this story solves it (3-4 sentences)
- **Value/Impact**: Expected benefits (2-3 sentences)

### Acceptance Criteria

Generate 3-5 specific, testable criteria. Good examples:

- "Authentication flow completes in under 2 seconds"
- "Unit tests achieve greater than 80% coverage"
- "API returns 401 for invalid tokens"

Avoid vague criteria like "works well" or implementation details like "uses Redux".

### References

List all provided URLs with descriptive labels.

### Labels

Select from standard labels when applicable:

| Label | Use When |
|-------|----------|
| `Spike` | Research or investigation work |
| `PR-Needed` | Requires pull request to external repository |
| `New-Integration` | New third-party system integration |
| `Enhancement` | Improvement to existing functionality |

Labels must use hyphens or underscores, never spaces. Limit to 3-5 per story.

## Step 5: Review and Approve

Present the complete story to the user in this format:

```text
Here's the proposed Jira story:

**Title**: [title]

**Description**:
**User Story**: As a [actor], I want [action] so that [benefit]

[remaining description sections]

**Acceptance Criteria**:
- [criterion 1]
- [criterion 2]
- [criterion 3]

**References**:
- [labeled URLs]

**Labels**: [labels]

**Project**: [project-key]
**Epic**: [epic-key or "none"]
**Issue Type**: Story

Please review and let me know if you'd like any changes, or approve to create.
```

Wait for explicit approval before proceeding. If the user requests changes, revise
and present again.

## Step 6: Create the Story in Jira

Once approved, build and execute the `acli` command.

### Build the description file

Write the full description (including User Story, all sections, Acceptance Criteria,
and References) to a temporary file. Use plain text formatting.

```bash
cat > /tmp/jira-story-desc.txt << 'STORY_EOF'
User Story: As a [actor], I want [action] so that [benefit]

Overview:
[overview text]

Problem/Need:
[problem text]

Proposed Solution:
[solution text]

Value/Impact:
[impact text]

Acceptance Criteria:
- [criterion 1]
- [criterion 2]
- [criterion 3]

References:
- [Label]: [URL]
STORY_EOF
```

### Create the work item

```bash
acli jira workitem create \
  --project "[PROJECT_KEY]" \
  --type "Story" \
  --summary "[title]" \
  --description-file "/tmp/jira-story-desc.txt" \
  --label "[label1],[label2]" \
  --parent "[EPIC_KEY]" \
  --json
```

Flag reference:

| Flag | Required | Notes |
|------|----------|-------|
| `--project` | Yes | Project key (e.g. `PROJ`) |
| `--type` | Yes | Usually `Story`; use `Task` if Story is unavailable |
| `--summary` | Yes | The story title |
| `--description-file` | Yes | Path to the temp description file |
| `--label` | No | Comma-separated, no spaces in label names |
| `--parent` | No | Epic key for linking; omit if no Epic |
| `--json` | No | Returns JSON output for parsing the created issue key |

### Handle errors

- **"unauthorized"** — Authentication expired. Re-run Step 1.
- **"Field 'X' is required"** — The project has custom required fields. Inform the
  user and ask for the missing values.
- **"Invalid issue type"** — `Story` may not be available. Run
  `acli jira workitem create --project "[KEY]" --help` to check valid types, then
  retry with the correct type.
- **"Epic not found" / "parent not found"** — Verify the Epic key with
  `acli jira workitem view [EPIC_KEY]` and retry.

### Confirm creation

Parse the JSON output to extract the issue key. Present:

```text
Story created successfully!
Key: [PROJ-456]
URL: https://[site].atlassian.net/browse/[PROJ-456]
```

Remind the user: *"Sprint assignment must be done manually in the Jira UI."*

### Clean up

Remove the temporary description file:

```bash
rm -f /tmp/jira-story-desc.txt
```

## Step 7: Optional — Save Markdown

Ask: *"Would you like me to save a markdown file with the story details? If yes, what filename?"*

Only create the file if the user confirms. If saving:

- Ask whether to include the original prompt; default to excluding it.
- Redact any secrets or PII before writing.

## Quick Reference: Useful acli Commands

| Task | Command |
|------|---------|
| Check auth | `acli jira auth status` |
| Log in (browser) | `acli jira auth login --web` |
| List projects | `acli jira project list --limit 50` |
| Search issues | `acli jira workitem search --jql "project = PROJ" --limit 20` |
| View an issue | `acli jira workitem view PROJ-123` |
| View issue (JSON) | `acli jira workitem view PROJ-123 --json` |
| Create work item | `acli jira workitem create --project "PROJ" --type "Story" --summary "Title"` |
