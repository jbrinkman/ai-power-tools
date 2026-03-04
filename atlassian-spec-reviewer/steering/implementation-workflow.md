# Implementation Workflow

## When to Use
Activate when user mentions implementing a Jira issue (e.g., "implement PROJ-123") or building a feature from requirements.

## Workflow

### 1. Auto-Gather Context
When user mentions a Jira key, automatically:
- Fetch issue with `getJiraIssue` (includes subtasks)
- Search Confluence: `text ~ "PROJ-123"` and by issue summary keywords
- Get linked Confluence pages from descriptions
- Present complete context package (see requirements-gathering.md format)

### 2. Create Implementation Checklist
```
Implementation Checklist for [ISSUE-KEY]:

☐ Main Requirements
  ☐ [Requirement 1]
☐ Subtask Requirements  
  ☐ [ISSUE-123]: [Requirement]
☐ Confluence Specs
  ☐ [Spec point]
☐ Acceptance Criteria
  ☐ [Criterion 1]
```

### 3. Guide Implementation
- Work through checklist systematically
- Follow patterns from ADRs and existing codebase.

### 4. Validate & Report
```
✅ Implementation Review for [ISSUE-KEY]

Completed: X/Y requirements

✅ [Requirement 1] - Implemented in [file]
⚠️ [Requirement 2] - Partially done (see notes)

Notes: [Deviations or clarifications]
Next Steps: [Update Jira, add tests, etc.]
```

## Troubleshooting

**Scattered requirements**: Compile from Jira + Confluence before coding
**Vague requirements**: Search for similar completed issues, check ADRs, flag gaps
**Can't find docs**: Search by feature area not issue key, check multiple spaces
