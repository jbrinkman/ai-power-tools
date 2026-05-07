---
name: jira-story-creator
description: >-
  Create well-structured Jira stories using the Atlassian CLI (atlassian-cli).
  Use when asked to "create a Jira story", "write a user story", "add a story to Jira",
  "create a Jira ticket", "create a spike", or when the user mentions Jira issue creation,
  user stories, acceptance criteria, or epic linking via the command line.
  Guides through interactive requirements gathering, generates professional descriptions
  with acceptance criteria, and creates stories via atlassian-cli commands.
---

<!--
Based on the Jira Story Wizard Kiro Power by Joe Brinkman.
Adapted to use the Atlassian CLI (atlassian-cli) instead of acli.
-->

# Jira Story Creator

Create well-structured Jira stories using the Atlassian CLI (`atlassian-cli`). This skill
guides you through an interactive workflow: gather requirements, generate a
professional story with acceptance criteria, review it, and create it in Jira.

## Step 1: Verify Prerequisites

Before doing anything else, confirm the environment is ready.

### 1a. Check that atlassian-cli is installed

Run:

```bash
which atlassian-cli
```

**If the command is found** (exit code 0, prints a path): continue to 1b.

**If the command is not found** (non-zero exit code or empty output):

1. Tell the user that `atlassian-cli` is not installed or not on their PATH.
2. **Stop the workflow.** Do not proceed until the user confirms installation and
   you re-verify with `which atlassian-cli`.

### 1b. Check Jira authentication

Run:

```bash
atlassian-cli auth status
```

**If authentication succeeds** (exit code 0, output shows a configured profile):
proceed to Step 2.

**If authentication fails** (non-zero exit code, or output shows no configured profile):

1. Tell the user they are not currently authenticated.
2. Suggest they run:
   ```bash
   atlassian-cli auth login --profile work --base-url https://site.atlassian.net --email user@example.com
   ```
3. **Stop the workflow.** Do not proceed until the user confirms they have
   authenticated and you re-verify with `atlassian-cli auth status`.

## Step 2: Gather Information

**IMPORTANT**: You MUST ask every question below, one at a time, regardless of what
the user provided in their initial prompt. Do NOT skip questions. Do NOT proceed to
Step 3 until every question has been explicitly answered (or answered with 'none').
If the user provided information upfront (e.g., URLs, an Epic, a user story),
acknowledge what you extracted but still ask the remaining questions.

Collect the following by asking questions **one at a time**. Wait for each answer
before asking the next.

1. **Epic Link** — Check if the user already mentioned an Epic key (e.g. `PROJ-122`).
   If yes, confirm: *"I see you mentioned Epic PROJ-122. I'll link the story there. Correct?"*
   If not, ask: *"What Epic should this story be linked to? (e.g. PROJ-122, or 'none')"*

2. **Project Key** — Extract from the Epic key if provided (e.g. `PROJ` from `PROJ-122`).
   If no Epic, ask: *"What Jira project key should this story be created in? (e.g. PROJ)"*

3. **Issue Type** — Ask:
   *"What type of work is this? (Story, Spike/Research, Bug, Task — default: Story)"*

4. **User Story Components** — If the user gave a partial story, extract the actor,
   action, and benefit and confirm: *"I extracted this user story: 'As a [actor], I want [action], so that [benefit].' Is that correct, or would you like to adjust it?"*
   If components are missing, ask:
   *"Let's build the user story. Please provide: As a [actor/role], I want [action], so that [benefit]."*

5. **GitHub Repository URL** — Ask:
   *"What is the GitHub repository URL for this work? (or 'none')"*
   If the user already provided a repo URL, confirm: *"I see you provided [URL] — is this the primary repository? Any others?"*

6. **Documentation URLs** — Ask:
   *"Are there documentation pages I should review for context? (provide URLs or 'none')"*
   If the user already provided doc URLs, ask: *"I see you provided [URLs]. Are there any additional documentation pages I should review?"*

7. **Additional Reference URLs** — Ask:
   *"Any other reference URLs I should review? (e.g., API docs, design specs, RFCs, competitor examples — provide with labels or 'none')"*

8. **Technical Constraints** — Ask:
   *"Are there specific technical constraints I should know about? (e.g., must use a specific API, language requirements, architectural patterns, or 'none')"*

9. **Dependencies** — Ask:
   *"Does this work depend on or block any other stories/work? (provide issue keys or describe, or 'none')"*

10. **Additional Context** — Ask:
    *"Any other context, requirements, or non-functional concerns (performance, security, accessibility) I should factor in? (or 'none')"*

11. **Valkey Integration Subtasks** — Ask:
    *"Is this a Valkey integration story that needs standard subtasks (implementation + cookbook examples)? (yes/no — default: yes)"*

    If **yes**, the story will automatically include two subtasks after creation:
    - **Implementation subtask** — for the actual integration work (PR to the target repository from Question 5)
    - **Cookbook subtask** — for creating cookbook examples in [valkey-io/valkey-samples](https://github.com/valkey-io/valkey-samples)

    If the user answers yes, also ask:
    *"Any notes on the cookbook subtask? (e.g., blocked by a specific PR, specific examples to include, or 'none')"*

    If **no**, skip subtask creation entirely.

### Checkpoint

After all questions are answered, present a brief summary of what you collected:

```text
Here's what I have so far:
- Epic: [value]
- Project: [value]
- Type: [value]
- User Story: As a [actor], I want [action], so that [benefit]
- Repository: [value or none]
- Documentation: [URLs or none]
- References: [URLs or none]
- Technical Constraints: [value or none]
- Dependencies: [value or none]
- Additional Context: [value or none]
- Valkey Integration Subtasks: [yes/no]
  - Cookbook notes: [value or none]

Does this look complete, or is there anything you'd like to add or change before I
analyze the content and draft the story?
```

**Do NOT proceed to Step 3 until the user confirms the summary.**

## Step 3: Analyze Content

**IMPORTANT**: Do NOT begin generating the story (Step 4) until this step is fully
complete. All URLs must be fetched and analyzed first.

1. Fetch **ALL** URLs provided by the user. For each URL, use the Jina Reader
   proxy for cleaner, more complete content extraction:
   - Fetch `https://r.jina.ai/<url>` using web_fetch in full mode
   - This returns clean markdown optimized for LLM consumption, with navigation,
     ads, and boilerplate removed

2. For each fetched page, extract:
   - Project purpose and scope
   - Technical architecture and stack
   - Relevant features and integration points
   - Any constraints or requirements mentioned
   - **Key linked pages** that may contain deeper relevant context (e.g., API
     references, architecture docs, getting-started guides)

3. **Deep analysis** — If the fetched content references important sub-pages that
   would provide critical context for the story (e.g., a docs homepage links to
   an API reference or architecture overview), ask the user:
   *"I found these potentially relevant linked pages: [list]. Should I review any
   of them for additional context?"*
   Fetch and analyze any pages the user confirms (also via Jina Reader).

4. Synthesize findings into a coherent understanding of what the story needs to
   accomplish, considering the user story, technical constraints, and dependencies.

5. If the fetched content reveals ambiguity or raises new questions not covered in
   Step 2, ask the user for clarification BEFORE proceeding to Step 4.

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

Once approved, build and execute the `atlassian-cli` command.

### Build the description as ADF

Do NOT use the `--description` flag — it only supports plain text wrapped in a
single paragraph. Instead, use `--field 'description=<ADF_JSON>'` to pass a rich
Atlassian Document Format (ADF) document that preserves headings, bullet lists,
bold text, and other formatting.

Construct the ADF JSON with this structure:

```json
{
  "version": 1,
  "type": "doc",
  "content": [
    {
      "type": "heading",
      "attrs": {"level": 2},
      "content": [{"type": "text", "text": "User Story"}]
    },
    {
      "type": "paragraph",
      "content": [{"type": "text", "text": "As a [actor], I want [action] so that [benefit]"}]
    },
    {
      "type": "heading",
      "attrs": {"level": 2},
      "content": [{"type": "text", "text": "Overview"}]
    },
    {
      "type": "paragraph",
      "content": [{"type": "text", "text": "[overview text]"}]
    },
    {
      "type": "heading",
      "attrs": {"level": 2},
      "content": [{"type": "text", "text": "Acceptance Criteria"}]
    },
    {
      "type": "bulletList",
      "content": [
        {"type": "listItem", "content": [{"type": "paragraph", "content": [{"type": "text", "text": "[criterion 1]"}]}]},
        {"type": "listItem", "content": [{"type": "paragraph", "content": [{"type": "text", "text": "[criterion 2]"}]}]}
      ]
    }
  ]
}
```

ADF node types to use:

| Element | ADF Type | Notes |
|---------|----------|-------|
| Heading | `{"type":"heading","attrs":{"level":N},"content":[...]}` | N = 1-6 |
| Paragraph | `{"type":"paragraph","content":[...]}` | |
| Bullet list | `{"type":"bulletList","content":[...listItems]}` | |
| List item | `{"type":"listItem","content":[...paragraphs]}` | Must contain paragraph nodes |
| Bold text | `{"type":"text","marks":[{"type":"strong"}],"text":"..."}` | |
| Link | `{"type":"text","marks":[{"type":"link","attrs":{"href":"URL"}}],"text":"..."}` | |

### Create the issue

**IMPORTANT**: Run this command exactly ONCE. Do NOT retry or re-run if you see a
response parsing error — the issue will have been created. If parsing fails, use
`atlassian-cli jira issue search --jql "project = [KEY] ORDER BY created DESC" --limit 1 -f json`
to find the created issue.

```bash
atlassian-cli jira issue create \
  --project "[PROJECT_KEY]" \
  --issue-type "Story" \
  --summary "[title]" \
  --field 'description={"version":1,"type":"doc","content":[...ADF content...]}' \
  --field 'labels=["label1","label2"]' \
  --field 'parent={"key":"[EPIC_KEY]"}' \
  -f json
```

Parse the key from the JSON output using:
```bash
| python3 -c "import sys,json; d=json.load(sys.stdin); print(d['key'])"
```

Flag reference:

| Flag | Required | Notes |
|------|----------|-------|
| `--project` | Yes | Project key (e.g. `PROJ`) |
| `--issue-type` | Yes | Usually `Story`; use `Task` if Story is unavailable |
| `--summary` | Yes | The story title |
| `--field 'description={...}'` | Yes | ADF JSON document for rich formatting |
| `--field 'labels=[...]'` | No | JSON array of label strings |
| `--field 'parent={"key":"..."}'` | No | Epic key for linking; omit if no Epic |
| `-f json` | No | Returns JSON output for parsing the created issue key |

### Expected error on mutating commands

The Jira API returns HTTP 204 (No Content) for successful update and transition
operations. The CLI may report `"Failed to parse JSON response: error decoding
response body"` with a non-zero exit code. **This is expected and does NOT mean
the operation failed.** Always verify the result with a subsequent `get` command
rather than retrying the mutation.

### Handle errors

- **"unauthorized"** — Authentication expired. Re-run Step 1.
- **"Field 'X' is required"** — The project has custom required fields. Inform the
  user and ask for the missing values.
- **"Invalid issue type"** — `Story` may not be available. Run
  `atlassian-cli jira issue create --help` to check valid types, then
  retry with the correct type.
- **"Epic not found" / "parent not found"** — Verify the Epic key with
  `atlassian-cli jira issue get [EPIC_KEY]` and retry.
- **"error decoding response body"** — See "Expected error on mutating commands"
  above. Verify with a `get` command; do NOT retry.

### Confirm creation

Parse the JSON output to extract the issue key. Present:

```text
Story created successfully!
Key: [PROJ-456]
URL: https://[site].atlassian.net/browse/[PROJ-456]
```

Remind the user: *"Sprint assignment must be done manually in the Jira UI."*

### Create Valkey Integration Subtasks

**Only perform this section if the user answered "yes" to Question 11.**

After the parent story is created successfully, create two subtasks:

#### Subtask 1: Implementation

Build an ADF description for the implementation subtask with scope and references,
then create:

```bash
atlassian-cli jira issue create \
  --project "[PROJECT_KEY]" \
  --issue-type "Subtask" \
  --summary "Implement [short integration description]" \
  --field 'description={"version":1,"type":"doc","content":[{"type":"heading","attrs":{"level":2},"content":[{"type":"text","text":"Scope"}]},{"type":"bulletList","content":[{"type":"listItem","content":[{"type":"paragraph","content":[{"type":"text","text":"[implementation scope from Step 3]"}]}]},{"type":"listItem","content":[{"type":"paragraph","content":[{"type":"text","text":"Submit as a PR to [target repository URL]"}]}]}]},{"type":"heading","attrs":{"level":2},"content":[{"type":"text","text":"References"}]},{"type":"bulletList","content":[{"type":"listItem","content":[{"type":"paragraph","content":[{"type":"text","marks":[{"type":"link","attrs":{"href":"[URL]"}}],"text":"[Label]"}]}]}]}]}' \
  --field 'labels=["PR-Needed","New-Integration"]' \
  --field 'parent={"key":"[PARENT_STORY_KEY]"}' \
  -f json
```

#### Subtask 2: Cookbook Examples

Build an ADF description for the cookbook subtask, then create:

```bash
atlassian-cli jira issue create \
  --project "[PROJECT_KEY]" \
  --issue-type "Subtask" \
  --summary "Create [integration name] cookbook examples in valkey-samples" \
  --field 'description={"version":1,"type":"doc","content":[{"type":"heading","attrs":{"level":2},"content":[{"type":"text","text":"Scope"}]},{"type":"bulletList","content":[{"type":"listItem","content":[{"type":"paragraph","content":[{"type":"text","text":"Create cookbook examples showing how to use [integration]"}]}]},{"type":"listItem","content":[{"type":"paragraph","content":[{"type":"text","text":"Follow the cookbook framework structure in the repository"}]}]},{"type":"listItem","content":[{"type":"paragraph","content":[{"type":"text","text":"Submit as a PR to valkey-io/valkey-samples"}]}]}]},{"type":"heading","attrs":{"level":2},"content":[{"type":"text","text":"References"}]},{"type":"bulletList","content":[{"type":"listItem","content":[{"type":"paragraph","content":[{"type":"text","marks":[{"type":"link","attrs":{"href":"https://github.com/valkey-io/valkey-samples"}}],"text":"Valkey Samples Repository"}]}]}]}]}' \
  --field 'labels=["PR-Needed"]' \
  --field 'parent={"key":"[PARENT_STORY_KEY]"}' \
  -f json
```

**Note**: Subtask creation may also produce the "error decoding response body"
message. Verify each subtask was created with a search before retrying.

Present the subtask results:

```text
Subtasks created:
- [KEY-1]: [Implementation subtask title]
  URL: https://[site].atlassian.net/browse/[KEY-1]
- [KEY-2]: [Cookbook subtask title]
  URL: https://[site].atlassian.net/browse/[KEY-2]
```

## Step 7: Optional — Save Markdown

Ask: *"Would you like me to save a markdown file with the story details? If yes, what filename?"*

Only create the file if the user confirms. If saving:

- Use the project/integration name for the filename (e.g., `docsgpt-valkey-integration.md`),
  not the Jira issue key, unless the user specifies otherwise.
- Include subtask details (keys and summaries) if subtasks were created.
- Ask whether to include the original prompt; default to excluding it.
- Redact any secrets or PII before writing.

## Quick Reference: Useful atlassian-cli Commands

| Task | Command |
|------|---------|
| Check auth | `atlassian-cli auth status` |
| Who am I | `atlassian-cli auth whoami` |
| Test auth | `atlassian-cli auth test` |
| Log in | `atlassian-cli auth login --profile work --base-url https://site.atlassian.net --email user@example.com` |
| List projects | `atlassian-cli jira project list --limit 50` |
| Search issues | `atlassian-cli jira issue search --project PROJ --limit 20` |
| Search (JQL) | `atlassian-cli jira issue search --jql "project = PROJ ORDER BY created DESC"` |
| View an issue | `atlassian-cli jira issue get PROJ-123` |
| View issue (JSON) | `atlassian-cli jira issue get PROJ-123 -f json` |
| Create issue | `atlassian-cli jira issue create --project PROJ --issue-type Story --summary "Title"` |
| List fields | `atlassian-cli jira fields list` |
