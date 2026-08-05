# Jira Write Commands Reference

Reference for creating, updating, and modifying Jira issues.

---

## Create Issue

Create a new Jira issue.

```bash
atlassian-cli jira issue create [OPTIONS]
```

| Flag | Required | Description |
|------|----------|-------------|
| `--project` | Yes | Project key (e.g., `PROJ`) |
| `--issue-type` | Yes | Issue type (e.g., `Story`, `Task`, `Bug`, `Subtask`) |
| `--summary` | Yes | Issue title/summary |
| `--field` | No | Set custom or additional fields (repeatable) |
| `-f, --format` | No | Output format: `json`, `yaml`, `markdown`, `table` |
| `-p, --profile` | No | Profile to use |

### Field Syntax

Use `--field` to set any field beyond summary:

| Field | Syntax |
|-------|--------|
| Description (plain text) | `--field 'description=Plain text content'` |
| Description (ADF) | `--field 'description={"version":1,"type":"doc","content":[...]}'` |
| Labels | `--field 'labels=["label1","label2"]'` |
| Epic Link | `--field 'parent={"key":"EPIC-123"}'` |
| Assignee | `--field 'assignee={"accountId":"..."}'` or `--field 'assignee={"emailAddress":"user@example.com"}'` |
| Priority | `--field 'priority={"name":"High"}'` |
| Custom field | `--field 'customfield_10001=value'` |

### Examples

```bash
# Create a basic story
atlassian-cli jira issue create \
  --project PROJ \
  --issue-type Story \
  --summary "Implement user authentication" \
  -f json

# Create with description and labels
atlassian-cli jira issue create \
  --project PROJ \
  --issue-type Story \
  --summary "Add login page" \
  --field 'description=User story and acceptance criteria here' \
  --field 'labels=["frontend","authentication"]' \
  -f json

# Create with ADF description
atlassian-cli jira issue create \
  --project PROJ \
  --issue-type Story \
  --summary "Add OAuth support" \
  --field 'description={"version":1,"type":"doc","content":[{"type":"heading","attrs":{"level":2},"content":[{"type":"text","text":"User Story"}]},{"type":"paragraph","content":[{"type":"text","text":"As a developer, I want OAuth support so that users can log in with third-party providers."}]}]}' \
  -f json

# Create and link to Epic
atlassian-cli jira issue create \
  --project PROJ \
  --issue-type Story \
  --summary "Implement password reset" \
  --field 'parent={"key":"PROJ-100"}' \
  --field 'labels=["authentication"]' \
  -f json

# Create a subtask
atlassian-cli jira issue create \
  --project PROJ \
  --issue-type Subtask \
  --summary "Write unit tests" \
  --field 'parent={"key":"PROJ-123"}' \
  -f json
```

### ADF (Atlassian Document Format)

Jira descriptions support rich formatting via ADF. Common node types:

| Element | ADF JSON |
|---------|----------|
| Heading | `{"type":"heading","attrs":{"level":2},"content":[{"type":"text","text":"Title"}]}` |
| Paragraph | `{"type":"paragraph","content":[{"type":"text","text":"Content"}]}` |
| Bullet list | `{"type":"bulletList","content":[{"type":"listItem","content":[{"type":"paragraph","content":[{"type":"text","text":"Item"}]}]}]}` |
| Bold text | `{"type":"text","marks":[{"type":"strong"}],"text":"Bold"}` |
| Link | `{"type":"text","marks":[{"type":"link","attrs":{"href":"URL"}}],"text":"Label"}` |

Full ADF structure:

```json
{
  "version": 1,
  "type": "doc",
  "content": [
    {"type": "heading", "attrs": {"level": 2}, "content": [{"type": "text", "text": "Section"}]},
    {"type": "paragraph", "content": [{"type": "text", "text": "Content here"}]}
  ]
}
```

---

## Update Issue

Update an existing issue.

```bash
atlassian-cli jira issue update <ISSUE_KEY> [OPTIONS]
```

**IMPORTANT**: `ISSUE_KEY` is a **positional argument**, not a flag.

| Flag | Required | Description |
|------|----------|-------------|
| `--summary` | No | Update the issue title |
| `--field` | No | Update specific fields (repeatable, same syntax as create) |
| `-f, --format` | No | Output format: `json`, `yaml`, `markdown`, `table` |
| `-p, --profile` | No | Profile to use |

### Examples

```bash
# Update summary
atlassian-cli jira issue update PROJ-123 \
  --summary "New title for the issue"

# Update multiple fields
atlassian-cli jira issue update PROJ-123 \
  --field 'labels=["updated","new-label"]' \
  --field 'priority={"name":"High"}' \
  -f json

# Update description with ADF
atlassian-cli jira issue update PROJ-123 \
  --field 'description={"version":1,"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"Updated description"}]}]}'
```

### Expected Behavior

Update commands may return `"Failed to parse JSON response: error decoding response body"` even when successful. The Jira API returns HTTP 204 (No Content) for updates. Verify with a subsequent `get` command:

```bash
atlassian-cli jira issue update PROJ-123 --summary "New title"
atlassian-cli jira issue get PROJ-123 -f json | jq -r '.fields.summary'
```

---

## Transition Issue

Move an issue through workflow states (e.g., "To Do" → "In Progress" → "Done").

```bash
atlassian-cli jira issue transition <ISSUE_KEY> [OPTIONS]
```

**IMPORTANT**: `ISSUE_KEY` is a **positional argument**, not a flag.

| Flag | Required | Description |
|------|----------|-------------|
| `--transition` | Yes | Transition name or ID |
| `--field` | No | Set fields during transition (e.g., resolution) |
| `-f, --format` | No | Output format: `json`, `yaml`, `markdown`, `table` |
| `-p, --profile` | No | Profile to use |

### Finding Valid Transitions

Before transitioning, check available transitions:

```bash
atlassian-cli jira issue transitions PROJ-123 -f json
```

### Examples

```bash
# Transition by name
atlassian-cli jira issue transition PROJ-123 --transition "In Progress"

# Transition by ID
atlassian-cli jira issue transition PROJ-123 --transition 21

# Transition and set resolution
atlassian-cli jira issue transition PROJ-123 \
  --transition "Done" \
  --field 'resolution={"name":"Fixed"}'
```

### Expected Behavior

Transition commands may return `"Failed to parse JSON response: error decoding response body"` even when successful. Verify with:

```bash
atlassian-cli jira issue get PROJ-123 -f json | jq -r '.fields.status.name'
```

---

## Add Comment

Add a comment to an issue.

```bash
atlassian-cli jira issue comment add <ISSUE_KEY> [OPTIONS]
```

**IMPORTANT**: `ISSUE_KEY` is a **positional argument**, not a flag.

| Flag | Required | Description |
|------|----------|-------------|
| `--body` | Yes | Comment text (plain text or ADF JSON string) |
| `-f, --format` | No | Output format: `json`, `yaml`, `markdown`, `table` |
| `-p, --profile` | No | Profile to use |

### Examples

```bash
# Add plain text comment
atlassian-cli jira issue comment add PROJ-123 \
  --body "This issue is blocked by PROJ-456"

# Add comment with ADF formatting
atlassian-cli jira issue comment add PROJ-123 \
  --body '{"version":1,"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","marks":[{"type":"strong"}],"text":"Important:"},{"type":"text","text":" This needs review before proceeding."}]}]}' \
  -f json
```

---

## Assign Issue

Assign an issue to a user.

```bash
atlassian-cli jira issue assign <ISSUE_KEY> [OPTIONS]
```

**IMPORTANT**: `ISSUE_KEY` is a **positional argument**, not a flag.

| Flag | Required | Description |
|------|----------|-------------|
| `--assignee` | Yes | Assignee account ID or email |
| `-f, --format` | No | Output format: `json`, `yaml`, `markdown`, `table` |
| `-p, --profile` | No | Profile to use |

### Examples

```bash
# Assign by email
atlassian-cli jira issue assign PROJ-123 --assignee user@example.com

# Assign by account ID
atlassian-cli jira issue assign PROJ-123 --assignee "5b10a2844c20165700ede21g"

# Unassign (assign to no one)
atlassian-cli jira issue assign PROJ-123 --assignee ""
```

---

## Link Issues

Create a link between two issues.

```bash
atlassian-cli jira issue link [OPTIONS]
```

| Flag | Required | Description |
|------|----------|-------------|
| `--from` | Yes | Source issue key |
| `--to` | Yes | Target issue key |
| `--type` | Yes | Link type (e.g., `Blocks`, `Relates`, `Duplicates`) |
| `-f, --format` | No | Output format: `json`, `yaml`, `markdown`, `table` |
| `-p, --profile` | No | Profile to use |

### Common Link Types

| Type | Meaning |
|------|---------|
| `Blocks` | Source issue blocks target issue |
| `Relates` | Issues are related |
| `Duplicates` | Source duplicates target |
| `Clones` | Source is a clone of target |

### Examples

```bash
# Create a "blocks" link
atlassian-cli jira issue link \
  --from PROJ-123 \
  --to PROJ-456 \
  --type Blocks

# Create a "relates" link
atlassian-cli jira issue link \
  --from PROJ-123 \
  --to PROJ-789 \
  --type Relates
```

---

## Delete Issue

Delete an issue permanently.

```bash
atlassian-cli jira issue delete <ISSUE_KEY> [OPTIONS]
```

**IMPORTANT**: `ISSUE_KEY` is a **positional argument**, not a flag.

| Flag | Required | Description |
|------|----------|-------------|
| `--force` | No | Skip confirmation prompt |
| `-p, --profile` | No | Profile to use |

### Examples

```bash
# Delete with confirmation
atlassian-cli jira issue delete PROJ-123

# Delete without confirmation
atlassian-cli jira issue delete PROJ-123 --force
```

**Warning**: Deletion is permanent and cannot be undone.

---

## Manage Labels

Add or remove labels from an issue.

```bash
atlassian-cli jira issue update <ISSUE_KEY> --field 'labels=[...]'
```

### Examples

```bash
# Set labels (replaces existing)
atlassian-cli jira issue update PROJ-123 \
  --field 'labels=["new-label","another-label"]'

# Remove all labels
atlassian-cli jira issue update PROJ-123 \
  --field 'labels=[]'
```

To add labels without removing existing ones, first fetch the current labels:

```bash
# Get current labels
CURRENT=$(atlassian-cli jira issue get PROJ-123 -f json | jq -r '.fields.labels')

# Append new label
NEW=$(echo $CURRENT | jq '. + ["new-label"]')

# Update issue
atlassian-cli jira issue update PROJ-123 --field "labels=$NEW"
```

---

## Set Custom Fields

Use `--field 'customfield_NNNNN=value'` to set custom fields.

### Finding Custom Field IDs

```bash
atlassian-cli jira fields list -f json | jq '.[] | select(.custom == true) | {id, name}'
```

### Examples

```bash
# Set a custom text field
atlassian-cli jira issue update PROJ-123 \
  --field 'customfield_10001=Custom value'

# Set a custom select field
atlassian-cli jira issue update PROJ-123 \
  --field 'customfield_10002={"value":"Option A"}'

# Set a custom number field
atlassian-cli jira issue update PROJ-123 \
  --field 'customfield_10003=42'
```

---

## Batch Operations

When performing multiple operations, construct commands programmatically:

```bash
# Create multiple issues from a list
for TITLE in "Task 1" "Task 2" "Task 3"; do
  atlassian-cli jira issue create \
    --project PROJ \
    --issue-type Task \
    --summary "$TITLE" \
    -f json
done

# Bulk transition issues
for KEY in $(atlassian-cli jira issue search --jql "status = 'In Review'" -f json | jq -r '.issues[].key'); do
  atlassian-cli jira issue transition "$KEY" --transition "Done"
done
```
