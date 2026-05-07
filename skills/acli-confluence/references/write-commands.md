# Write Commands Reference

All commands support `-f <FORMAT>` (table, json, yaml, csv, quiet, markdown) and `--envelope` for wrapped output.

**Important**: The `--body` flag takes a **file path** to an HTML file in Confluence storage format, NOT inline HTML content. Write content to a file first, then pass the path.

**Expected error on mutating commands**: The Atlassian API returns HTTP 204 (No Content) for successful update/transition operations. The CLI may report `"Failed to parse JSON response: error decoding response body"` with a non-zero exit code. **This does NOT mean the operation failed.** Verify the result with a subsequent `get` command rather than retrying.

---

## Page Create

Create a new page.

```bash
atlassian-cli confluence page create [OPTIONS] --space <SPACE> --title <TITLE>
```

| Flag | Required | Description |
|------|----------|-------------|
| `--space` | Yes | Space key |
| `--title` | Yes | Page title |
| `--body` | No | Path to body content file (HTML storage format) |
| `--parent` | No | Parent page ID |

### Examples

```bash
# Create a page in a space
atlassian-cli confluence page create --space TEAM --title "New Page"

# Create with body content from file
atlassian-cli confluence page create --space TEAM --title "Architecture" --body ./content.html

# Create as child of another page
atlassian-cli confluence page create --space TEAM --title "Sub Page" --parent 123456789 --body ./content.html -f json
```

### Body File Workflow

```bash
# 1. Write content to a temp file
cat > /tmp/page-content.html << 'EOF'
<h2>Overview</h2>
<p>Page content in Confluence storage format (XHTML).</p>
<ul>
  <li>Item one</li>
  <li>Item two</li>
</ul>
EOF

# 2. Create the page
atlassian-cli confluence page create --space TEAM --title "My Page" --body /tmp/page-content.html

# 3. Clean up
rm -f /tmp/page-content.html
```

---

## Page Update

Update an existing page.

```bash
atlassian-cli confluence page update [OPTIONS] <PAGE_ID>
```

| Argument/Flag | Required | Description |
|---------------|----------|-------------|
| `<PAGE_ID>` | Yes | Positional page ID |
| `--title` | No | New page title |
| `--body` | No | Path to new body content file (HTML storage format) |
| `--status` | No | Target status: `current` (published) or `draft` |
| `--message` | No | Version message for audit trail |

### Examples

```bash
# Update page title
atlassian-cli confluence page update 123456789 --title "Updated Title"

# Update body content
atlassian-cli confluence page update 123456789 --body ./updated-content.html

# Update with version message
atlassian-cli confluence page update 123456789 --body ./content.html --message "Added API section"

# Convert to draft
atlassian-cli confluence page update 123456789 --status draft
```

---

## Page Publish

Publish a draft page for the first time.

```bash
atlassian-cli confluence page publish [OPTIONS] --body <BODY> <PAGE_ID>
```

| Argument/Flag | Required | Description |
|---------------|----------|-------------|
| `<PAGE_ID>` | Yes | Positional page ID |
| `--body` | Yes | Path to body content file (HTML storage format) |
| `--title` | No | Page title (uses existing if not specified) |
| `--message` | No | Version message for audit trail |

### Examples

```bash
# Publish a draft
atlassian-cli confluence page publish 123456789 --body ./final-content.html

# Publish with new title and message
atlassian-cli confluence page publish 123456789 --body ./content.html --title "Final Title" --message "Initial publish"
```

---

## Page Delete

Delete a page.

```bash
atlassian-cli confluence page delete [OPTIONS] <PAGE_ID>
```

| Argument/Flag | Required | Description |
|---------------|----------|-------------|
| `<PAGE_ID>` | Yes | Positional page ID |
| `--force` | No | Force deletion without confirmation |

### Examples

```bash
# Delete (will prompt for confirmation)
atlassian-cli confluence page delete 123456789

# Force delete without confirmation
atlassian-cli confluence page delete 123456789 --force
```

---

## Page Add-Label

Add a label to a page.

```bash
atlassian-cli confluence page add-label [OPTIONS] <PAGE_ID> <LABEL>
```

| Argument | Required | Description |
|----------|----------|-------------|
| `<PAGE_ID>` | Yes | Positional page ID |
| `<LABEL>` | Yes | Label name |

### Examples

```bash
atlassian-cli confluence page add-label 123456789 important
atlassian-cli confluence page add-label 123456789 architecture
```

---

## Page Remove-Label

Remove a label from a page.

```bash
atlassian-cli confluence page remove-label [OPTIONS] <PAGE_ID> <LABEL>
```

| Argument | Required | Description |
|----------|----------|-------------|
| `<PAGE_ID>` | Yes | Positional page ID |
| `<LABEL>` | Yes | Label name |

### Examples

```bash
atlassian-cli confluence page remove-label 123456789 outdated
```

---

## Page Add-Comment

Add a comment to a page.

```bash
atlassian-cli confluence page add-comment [OPTIONS] <PAGE_ID> <COMMENT>
```

| Argument | Required | Description |
|----------|----------|-------------|
| `<PAGE_ID>` | Yes | Positional page ID |
| `<COMMENT>` | Yes | Comment text |

### Examples

```bash
atlassian-cli confluence page add-comment 123456789 "Reviewed and approved"
```

---

## Page Add-Restriction

Add a restriction to a page.

```bash
atlassian-cli confluence page add-restriction [OPTIONS] --operation <OPERATION> --subject-type <SUBJECT_TYPE> --subject-id <SUBJECT_ID> <PAGE_ID>
```

| Argument/Flag | Required | Description |
|---------------|----------|-------------|
| `<PAGE_ID>` | Yes | Positional page ID |
| `--operation` | Yes | `read` or `update` |
| `--subject-type` | Yes | `user` or `group` |
| `--subject-id` | Yes | User ID or group name |

### Examples

```bash
# Restrict editing to a specific user
atlassian-cli confluence page add-restriction 123456789 --operation update --subject-type user --subject-id "5e4b..."

# Restrict reading to a group
atlassian-cli confluence page add-restriction 123456789 --operation read --subject-type group --subject-id "engineering"
```

---

## Page Remove-Restriction

Remove a restriction from a page.

```bash
atlassian-cli confluence page remove-restriction [OPTIONS] --operation <OPERATION> --subject-type <SUBJECT_TYPE> --subject-id <SUBJECT_ID> <PAGE_ID>
```

Same flags as add-restriction.

### Examples

```bash
atlassian-cli confluence page remove-restriction 123456789 --operation update --subject-type user --subject-id "5e4b..."
```
