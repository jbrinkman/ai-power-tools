# Requirements Gathering Workflow

## When to Use
Activate when user mentions gathering requirements, understanding a Jira issue, or needs complete context before starting work.

## Workflow

### 1. Get Cloud ID
- Use `getAccessibleAtlassianResources` if not cached

### 2. Fetch Complete Jira Context
- Use `getJiraIssue` for the issue key
- Extract requirements from main issue, all subtasks, and comments

### 3. Search Related Confluence Documentation
- Extract Confluence links from Jira descriptions/comments
- Search by issue key: `text ~ "PROJ-123"`
- Search by keywords from issue summary in spaces: ENG, TECH, ARCH, PRODUCT
- Look for: design docs, API specs, ADRs, integration guides

### 4. Fetch Confluence Pages
- Get content from discovered pages
- Read inline and footer comments for context
- Check page descendants for detailed specs

### 5. Present Complete Context Package
```
📋 Requirements for [ISSUE-KEY]: [Title]

Main Requirements:
- [Requirement from main issue]

Subtasks:
- [ISSUE-123]: [Subtask requirement]

Confluence Docs:
- [Page Title]: [Key points]

Acceptance Criteria:
- [Criterion 1]

Context from Comments:
- [Important clarification]
```

## Troubleshooting

**Conflicting requirements**: Check dates, look for comments explaining discrepancy, flag to user
**Missing Confluence docs**: Try broader search terms, search multiple spaces, proceed with Jira only
**Outdated documentation**: Check last modified date, review comments for updates, flag discrepancy
**Too many subtasks**: Group by category, ask user which are relevant, focus incrementally
