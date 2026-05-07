# Read Commands Reference

All commands support `-f <FORMAT>` (table, json, yaml, csv, quiet, markdown) and `--envelope` for wrapped output.

---

## Page Get

Get page details by ID.

```
atlassian-cli confluence page get [OPTIONS] <PAGE_ID>
```

| Argument/Flag | Required | Description |
|---------------|----------|-------------|
| `<PAGE_ID>` | Yes | Positional page ID |
| `--body-only` | No | Output only the page body content (HTML or markdown) |

### Examples

```bash
# Get page details
atlassian-cli confluence page get 123456789

# Get page as JSON
atlassian-cli confluence page get 123456789 -f json

# Get only the body content
atlassian-cli confluence page get 123456789 --body-only
```

---

## Page List

List pages, optionally filtered by space.

```
atlassian-cli confluence page list [OPTIONS]
```

| Flag | Required | Description |
|------|----------|-------------|
| `--space` | No | Filter by space key |
| `--limit` | No | Maximum number of results |

### Examples

```bash
# List all pages
atlassian-cli confluence page list

# List pages in a specific space
atlassian-cli confluence page list --space TEAM

# List with limit, output as JSON
atlassian-cli confluence page list --space DOCS --limit 50 -f json
```

---

## Page Versions

List version history for a page.

```
atlassian-cli confluence page versions [OPTIONS] <PAGE_ID>
```

| Argument/Flag | Required | Description |
|---------------|----------|-------------|
| `<PAGE_ID>` | Yes | Positional page ID |

### Examples

```bash
atlassian-cli confluence page versions 123456789
atlassian-cli confluence page versions 123456789 -f json
```

---

## Page Comments

List comments on a page.

```
atlassian-cli confluence page comments [OPTIONS] <PAGE_ID>
```

| Argument/Flag | Required | Description |
|---------------|----------|-------------|
| `<PAGE_ID>` | Yes | Positional page ID |

### Examples

```bash
atlassian-cli confluence page comments 123456789
atlassian-cli confluence page comments 123456789 -f json
```

---

## Page Get-Restrictions

Get restrictions on a page.

```
atlassian-cli confluence page get-restrictions [OPTIONS] <PAGE_ID>
```

| Argument/Flag | Required | Description |
|---------------|----------|-------------|
| `<PAGE_ID>` | Yes | Positional page ID |

### Examples

```bash
atlassian-cli confluence page get-restrictions 123456789
```

---

## Space List

List spaces.

```
atlassian-cli confluence space list [OPTIONS]
```

| Flag | Required | Description |
|------|----------|-------------|
| `--limit` | No | Maximum number of results |
| `--space-type` | No | Filter: `global` or `personal` |

### Examples

```bash
# List all spaces
atlassian-cli confluence space list

# List global spaces only
atlassian-cli confluence space list --space-type global

# List with limit
atlassian-cli confluence space list --limit 50 -f json
```

---

## Space Get

Get space details by key.

```
atlassian-cli confluence space get [OPTIONS] <KEY>
```

| Argument/Flag | Required | Description |
|---------------|----------|-------------|
| `<KEY>` | Yes | Positional space key (e.g., TEAM) |

### Examples

```bash
atlassian-cli confluence space get TEAM
atlassian-cli confluence space get DOCS -f json
```

---

## Search: CQL

Search using Confluence Query Language.

```
atlassian-cli confluence search cql [OPTIONS] <QUERY>
```

| Argument/Flag | Required | Description |
|---------------|----------|-------------|
| `<QUERY>` | Yes | CQL query string |
| `--limit` | No | Maximum number of results |

### Examples

```bash
# Find pages in a space
atlassian-cli confluence search cql 'space = TEAM AND type = page'

# Find pages with a label
atlassian-cli confluence search cql 'label = important' --limit 50

# Find pages modified recently
atlassian-cli confluence search cql 'lastModified > now("-7d") AND type = page' -f json
```

---

## Search: Text

Full text search across all content.

```
atlassian-cli confluence search text [OPTIONS] <QUERY>
```

| Argument/Flag | Required | Description |
|---------------|----------|-------------|
| `<QUERY>` | Yes | Search query |
| `--limit` | No | Maximum number of results |

### Examples

```bash
atlassian-cli confluence search text 'meeting notes'
atlassian-cli confluence search text 'project update' --limit 20 -f json
```

---

## Search: In-Space

Search within a specific space.

```
atlassian-cli confluence search in-space [OPTIONS] <SPACE> <QUERY>
```

| Argument/Flag | Required | Description |
|---------------|----------|-------------|
| `<SPACE>` | Yes | Space key |
| `<QUERY>` | Yes | Search query |
| `--limit` | No | Maximum number of results |

### Examples

```bash
atlassian-cli confluence search in-space TEAM 'release notes'
atlassian-cli confluence search in-space DOCS 'api reference' --limit 10 -f json
```

---

## Search: Params

Search using filter parameters (builds CQL internally).

```
atlassian-cli confluence search params [OPTIONS]
```

| Flag | Required | Description |
|------|----------|-------------|
| `--space` | No | Filter by space key |
| `--type` | No | Content type: `page`, `blogpost`, `attachment` |
| `--creator` | No | Filter by creator (use `@me` for current user) |
| `--label` | No | Filter by label (repeatable) |
| `--title` | No | Search in title |
| `--text` | No | Free text search |
| `--show-query` | No | Display the generated CQL query |
| `--limit` | No | Max results (default 25) |

### Examples

```bash
# Find pages in a space
atlassian-cli confluence search params --space TEAM --type page

# Find my pages with a label
atlassian-cli confluence search params --creator @me --label important

# Search by title in a space, show the CQL
atlassian-cli confluence search params --space DOCS --title "architecture" --show-query -f json
```
