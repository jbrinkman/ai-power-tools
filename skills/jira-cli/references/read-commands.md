# Jira Read Commands Reference

Reference for viewing and searching Jira issues, projects, and metadata.

---

## Get Issue

View details of a specific issue.

```bash
atlassian-cli jira issue get <ISSUE_KEY> [OPTIONS]
```

**IMPORTANT**: `ISSUE_KEY` is a **positional argument**, not a flag.

| Flag | Required | Description |
|------|----------|-------------|
| `-f, --format` | No | Output format: `json`, `yaml`, `markdown`, `table` (default: table) |
| `-p, --profile` | No | Profile to use (defaults to default profile) |

### Examples

```bash
# View issue in table format
atlassian-cli jira issue get PROJ-123

# Get issue as JSON for parsing
atlassian-cli jira issue get PROJ-123 -f json

# Get issue using specific profile
atlassian-cli jira issue get PROJ-123 -p work -f json
```

---

## Search Issues

Search for issues using JQL (Jira Query Language).

```bash
atlassian-cli jira issue search [OPTIONS]
```

| Flag | Required | Description |
|------|----------|-------------|
| `--jql` | No | JQL query string (e.g., `"project = PROJ AND status = Open"`) |
| `--project` | No | Filter by project key (shorthand for JQL) |
| `--status` | No | Filter by status (shorthand for JQL) |
| `--assignee` | No | Filter by assignee (shorthand for JQL) |
| `--limit` | No | Maximum results to return (default: 50) |
| `--offset` | No | Number of results to skip for pagination |
| `-f, --format` | No | Output format: `json`, `yaml`, `markdown`, `table`, `csv` |
| `-p, --profile` | No | Profile to use |

### Examples

```bash
# Search with JQL
atlassian-cli jira issue search --jql "project = PROJ AND status = Open" -f json

# Search by project (shorthand)
atlassian-cli jira issue search --project PROJ --limit 20

# Search with complex JQL
atlassian-cli jira issue search --jql "project = PROJ AND assignee = currentUser() ORDER BY created DESC" --limit 10 -f json

# Paginated search
atlassian-cli jira issue search --project PROJ --limit 50 --offset 50
```

### Common JQL Patterns

| Pattern | JQL |
|---------|-----|
| Open issues in project | `project = PROJ AND status != Done` |
| My assigned issues | `assignee = currentUser() AND status != Done` |
| Recently created | `project = PROJ ORDER BY created DESC` |
| Issues by Epic | `"Epic Link" = PROJ-123` |
| Issues with label | `labels = "my-label"` |
| Issues updated today | `updated >= startOfDay()` |

---

## List Projects

List all accessible projects.

```bash
atlassian-cli jira project list [OPTIONS]
```

| Flag | Required | Description |
|------|----------|-------------|
| `--limit` | No | Maximum results to return (default: 50) |
| `--offset` | No | Number of results to skip for pagination |
| `-f, --format` | No | Output format: `json`, `yaml`, `markdown`, `table`, `csv` |
| `-p, --profile` | No | Profile to use |

### Examples

```bash
# List all projects
atlassian-cli jira project list

# List projects as JSON
atlassian-cli jira project list -f json --limit 100
```

---

## Get Project

View details of a specific project.

```bash
atlassian-cli jira project get <PROJECT_KEY> [OPTIONS]
```

**IMPORTANT**: `PROJECT_KEY` is a **positional argument**, not a flag.

| Flag | Required | Description |
|------|----------|-------------|
| `-f, --format` | No | Output format: `json`, `yaml`, `markdown`, `table` |
| `-p, --profile` | No | Profile to use |

### Examples

```bash
# Get project details
atlassian-cli jira project get PROJ -f json
```

---

## Get Issue Transitions

View available transitions (workflow actions) for an issue.

```bash
atlassian-cli jira issue transitions <ISSUE_KEY> [OPTIONS]
```

**IMPORTANT**: `ISSUE_KEY` is a **positional argument**, not a flag.

| Flag | Required | Description |
|------|----------|-------------|
| `-f, --format` | No | Output format: `json`, `yaml`, `markdown`, `table` |
| `-p, --profile` | No | Profile to use |

### Examples

```bash
# Get available transitions
atlassian-cli jira issue transitions PROJ-123 -f json
```

Use this before transitioning an issue to find valid transition IDs or names.

---

## Get Issue Comments

View comments on an issue.

```bash
atlassian-cli jira issue comments <ISSUE_KEY> [OPTIONS]
```

**IMPORTANT**: `ISSUE_KEY` is a **positional argument**, not a flag.

| Flag | Required | Description |
|------|----------|-------------|
| `--limit` | No | Maximum comments to return |
| `-f, --format` | No | Output format: `json`, `yaml`, `markdown`, `table` |
| `-p, --profile` | No | Profile to use |

### Examples

```bash
# Get all comments
atlassian-cli jira issue comments PROJ-123 -f json
```

---

## List Fields

List all Jira fields (built-in and custom).

```bash
atlassian-cli jira fields list [OPTIONS]
```

| Flag | Required | Description |
|------|----------|-------------|
| `-f, --format` | No | Output format: `json`, `yaml`, `markdown`, `table`, `csv` |
| `-p, --profile` | No | Profile to use |

### Examples

```bash
# List all fields as JSON
atlassian-cli jira fields list -f json
```

Use this to discover custom field IDs and names for use in `--field` flags.

---

## Get Issue Links

View links between issues.

```bash
atlassian-cli jira issue links <ISSUE_KEY> [OPTIONS]
```

**IMPORTANT**: `ISSUE_KEY` is a **positional argument**, not a flag.

| Flag | Required | Description |
|------|----------|-------------|
| `-f, --format` | No | Output format: `json`, `yaml`, `markdown`, `table` |
| `-p, --profile` | No | Profile to use |

### Examples

```bash
# Get issue links
atlassian-cli jira issue links PROJ-123 -f json
```

---

## Output Formats

All read commands support multiple output formats via the `-f` or `--format` flag:

| Format | Use When |
|--------|----------|
| `table` (default) | Human-readable terminal output |
| `json` | Parsing with `jq`, Python, or other tools |
| `yaml` | Configuration or human-readable structured data |
| `markdown` | Documentation or reports |
| `csv` | Spreadsheet import or data analysis |

### Parsing JSON with Python

```bash
atlassian-cli jira issue get PROJ-123 -f json | python3 -c "import sys,json; d=json.load(sys.stdin); print(d['fields']['summary'])"
```

### Parsing JSON with jq

```bash
atlassian-cli jira issue get PROJ-123 -f json | jq -r '.fields.summary'
```
