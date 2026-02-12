# Code Review Workflow

## When to Use
Activate when user asks to review code against a Jira issue or validate implementation completeness.

## Workflow

### 1. Gather Requirements
- Fetch Jira issue with subtasks using `getJiraIssue`
- Search and fetch related Confluence docs
- Compile requirements checklist (see requirements-gathering.md)

### 2. Analyze Code
- Read relevant code files
- Map code to requirements
- Check for requirement references in comments

### 3. Generate Compliance Report
```
📊 Code Review Report for [ISSUE-KEY]

Files Reviewed: [file1.ts, file2.ts]
Overall Compliance: X/Y requirements (Z%)

Main Requirements:
✅ [Req 1] - Implemented in [file:lines]
⚠️ [Req 2] - Partial: missing [aspect]
❌ [Req 3] - Not found

Subtasks:
✅ [ISSUE-123] - Implemented in [file]

Confluence Specs:
✅ [Spec 1] - Code follows spec
⚠️ [Spec 2] - Deviation: [details]

Acceptance Criteria:
✅ [Criterion 1] - Met
⚠️ [Criterion 2] - Cannot verify from code (needs testing)

Recommendations:
1. [Action item 1]
2. [Action item 2]
```

## Review Strategies

**Comprehensive**: All requirements + all files (for merge readiness)
**Focused**: Specific subtask + relevant sections (for WIP review)
**Gap Analysis**: List requirements without implementations (for planning)
**Spec Compliance**: Validate against Confluence specs only (for standards check)

## Troubleshooting

**Can't find implementation**: Search keywords, check indirect implementation via libraries
**Code doesn't match specs**: Check if docs outdated, look for comments explaining deviation
**Ambiguous requirements**: Check comments for clarifications, mark "needs clarification"
**Partial implementation**: List what's done vs missing, check for TODOs
