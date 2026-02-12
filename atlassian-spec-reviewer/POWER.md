---
name: "atlassian-spec-reviewer"
displayName: "Atlassian Spec Reviewer"
description: "Read-only Atlassian integration - finds assigned tasks, reads requirements from Jira issues and subtasks, searches and reads Confluence documentation, implements or reviews code against complete specifications."
keywords: ["jira", "confluence", "document", "comments", "atlassian", "task", "issue", "subtask", "requirements", "specifications", "code-review", "read-only"]
author: "Edward Liang"
---

# Atlassian Spec Reviewer

## Overview

Atlassian Spec Reviewer is a read-only integration that bridges your Atlassian workflow with code implementation. It uses the official Atlassian MCP server to help you:

- Find tasks assigned to you across all Jira projects
- Retrieve complete task details including all subtasks
- Read requirements from main tasks and subtasks
- Search and read Confluence documentation and specifications
- Access Confluence page comments and discussions
- Browse Confluence spaces and pages
- Implement features with full requirement context from both Jira and Confluence
- Review existing code against Jira and Confluence specifications
- Search issues with powerful JQL queries
- Search Confluence with CQL (Confluence Query Language)

Key advantage: Never miss requirements hidden in subtasks or scattered across Confluence pages. This power is read-only by design - it focuses on gathering requirements and validating implementations without modifying Jira or Confluence.

## Available Steering Files

This power includes specialized workflow guides for specific tasks:

- **requirements-gathering** - Complete workflow for gathering requirements from Jira issues, subtasks, and Confluence documentation
- **implementation-workflow** - Step-by-step guide for implementing features based on gathered requirements from Jira and Confluence
- **code-review-workflow** - Process for reviewing existing code against Jira and Confluence specifications

To access a workflow, use:

```text
Call action "readSteering" with powerName="atlassian-spec-reviewer", steeringFile="<workflow-name>.md"
```

## Onboarding

### Prerequisites

- Atlassian Jira Cloud account
- Access to at least one Jira project
- Internet connection

### Installation

No installation needed! Uses Atlassian's hosted MCP server.

### Authentication

First use prompts browser authentication:
1. Browser opens to Atlassian login
2. Sign in and grant permissions
3. Return to Kiro

Authentication persists across sessions.

### Verification

Test with Jira: `"Show me all Jira projects I have access to"`

Test with Confluence: `"Show me all Confluence spaces I have access to"`

## Common Workflows

**Note:** For comprehensive workflows, refer to the steering files listed above. The examples below show common usage patterns, but the steering files provide complete step-by-step processes.

### Workflow 1: Find and Implement Assigned Tasks

**Find your tasks:**
```text
"Search Jira for my tasks in current sprint"
"Show me all high priority tasks assigned to me"
```

**Get complete details with subtasks:**
```text
"Get full details for PROJ-123 including all subtasks"
"Read all requirements for PROJ-123 from main task and subtasks"
```

**Implement with full context:**
```text
"Implement PROJ-123, addressing all main task and subtask requirements"
"Create implementation for PROJ-123 following all acceptance criteria"
```

### Workflow 2: Review Code Against Requirements

**Get complete requirements:**
```text
"Get all requirements for PROJ-789 including subtasks"
"Read PROJ-789 with all linked subtasks and acceptance criteria"
```

**Review existing code:**
```text
"Review src/auth/login.ts against all PROJ-789 requirements"
"Check if src/features/payment.ts implements all PROJ-456 requirements"
```

**Generate compliance checklist:**
```text
"Create checklist showing which PROJ-789 requirements are met vs missing"
"Compare src/api/users.ts against PROJ-234 and list gaps"
```

### Workflow 3: Advanced Search with JQL

**Find specific tasks:**
```text
"Search: assignee = currentUser() AND status = 'In Progress'"
"Search: project = PROJ AND sprint in openSprints() ORDER BY priority DESC"
"Search: priority = High AND assignee = currentUser() AND status != Done"
```

**Filter by criteria:**
```text
"Find all bugs assigned to me"
"Show tasks in current sprint that are blocked"
"List all stories in PROJ project that are ready for review"
```

### Workflow 4: Read Confluence Documentation

**Find documentation:**
```text
"Show me all Confluence spaces"
"List pages in the Engineering space"
"Search Confluence for API documentation"
```

**Read specifications:**
```text
"Get the content of Confluence page 123456"
"Read the API Design Guidelines page from Confluence"
"Show me the Architecture Decision Records space"
```

**Access discussions:**
```text
"Get all comments on Confluence page 123456"
"Show inline comments for the API spec page"
"Read footer comments on the design document"
```

### Workflow 5: Implement from Jira + Confluence

**Gather complete requirements:**
```text
"Get requirements from PROJ-123 and related Confluence pages"
"Read PROJ-456 and search Confluence for related API documentation"
"Show me PROJ-789 details and find the design doc in Confluence"
```

**Implement with full context:**
```text
"Implement PROJ-123 following both Jira requirements and Confluence API specs"
"Create feature based on PROJ-456 and the Architecture page in Confluence"
```

### Workflow 6: Search Confluence with CQL

**Find documentation:**
```text
"Search Confluence: type=page AND space=ENG AND title~'API'"
"Search Confluence: creator=currentUser() AND lastModified>=now('-7d')"
"Search Confluence: label='architecture' AND space='TECH'"
```

**Filter by criteria:**
```text
"Find all pages in Engineering space with 'security' in title"
"Show recently updated pages in the Product space"
"List all pages labeled 'onboarding'"
```

## Available MCP Tools

This power uses read-only tools from the Atlassian MCP server for both Jira and Confluence:

### Jira Tools

#### getJiraIssue
Get detailed issue information including subtasks.

**Parameters:**
- `issueKey` (required): Issue key (e.g., "PROJ-123")
- `cloudId` (required): Atlassian cloud ID

**Returns:** Complete issue with description, status, subtasks, comments, attachments

**Use for:** Reading full task details before implementation or review

#### searchJiraIssuesUsingJql
Search issues with JQL (Jira Query Language).

**Parameters:**
- `jql` (required): JQL query string
- `cloudId` (required): Atlassian cloud ID
- `maxResults` (optional): Limit results (default: 50)

**Common JQL patterns:**
- `assignee = currentUser()` - Your assigned issues
- `project = PROJ AND status = "In Progress"` - In-progress issues
- `sprint in openSprints()` - Current sprint issues
- `priority = High AND assignee = currentUser()` - Your high priority tasks

**Use for:** Finding tasks to work on

#### getVisibleJiraProjects
List all projects you have access to.

**Parameters:**
- `cloudId` (required): Atlassian cloud ID

**Returns:** List of accessible projects with keys and names

**Use for:** Discovering available projects

#### getAccessibleAtlassianResources
List all accessible Atlassian resources and cloud IDs.

**Returns:** Available cloud IDs and resources

**Use for:** Getting cloud ID for other operations

#### atlassianUserInfo
Get current authenticated user information.

**Parameters:**
- `cloudId` (required): Atlassian cloud ID

**Returns:** User profile information

**Use for:** Verifying authentication and user context

### Confluence Tools

#### getConfluencePage
Get detailed page content including body, metadata, and version history.

**Parameters:**
- `pageId` (required): Confluence page ID
- `cloudId` (required): Atlassian cloud ID

**Returns:** Complete page with title, body content, labels, version info

**Use for:** Reading specifications, documentation, and design documents

#### searchConfluenceUsingCql
Search Confluence pages with CQL (Confluence Query Language).

**Parameters:**
- `cql` (required): CQL query string
- `cloudId` (required): Atlassian cloud ID
- `limit` (optional): Limit results (default: 25)

**Common CQL patterns:**
- `type=page AND space=ENG` - All pages in Engineering space
- `title~"API" AND space=TECH` - Pages with "API" in title
- `creator=currentUser()` - Pages you created
- `lastModified>=now('-7d')` - Recently updated pages
- `label='architecture'` - Pages with specific label

**Use for:** Finding documentation and specifications

#### getConfluenceSpaces
List all Confluence spaces you have access to.

**Parameters:**
- `cloudId` (required): Atlassian cloud ID

**Returns:** List of accessible spaces with keys, names, and types

**Use for:** Discovering available documentation spaces

#### getPagesInConfluenceSpace
Get all pages within a specific Confluence space.

**Parameters:**
- `spaceKey` (required): Space key (e.g., "ENG", "TECH")
- `cloudId` (required): Atlassian cloud ID
- `limit` (optional): Limit results

**Returns:** List of pages in the space with titles and IDs

**Use for:** Browsing space contents

#### getConfluencePageFooterComments
Get footer comments (page-level comments) for a Confluence page.

**Parameters:**
- `pageId` (required): Confluence page ID
- `cloudId` (required): Atlassian cloud ID

**Returns:** List of footer comments with authors and content

**Use for:** Reading discussions and feedback on documentation

#### getConfluencePageInlineComments
Get inline comments (comments on specific content) for a Confluence page.

**Parameters:**
- `pageId` (required): Confluence page ID
- `cloudId` (required): Atlassian cloud ID

**Returns:** List of inline comments with context and location

**Use for:** Reading specific feedback on document sections

#### getConfluencePageDescendants
Get child pages and descendants of a Confluence page.

**Parameters:**
- `pageId` (required): Confluence page ID
- `cloudId` (required): Atlassian cloud ID

**Returns:** Hierarchical list of child pages

**Use for:** Navigating page hierarchies and finding related documentation

### Disabled Tools (Read-Only Mode)

The following write operations are disabled in this power:

**Jira write operations:**
- `createJiraIssue` - Create new issues
- `editJiraIssue` - Update existing issues
- `addCommentToJiraIssue` - Add comments
- `transitionJiraIssue` - Change issue status
- `addWorklogToJiraIssue` - Log work

**Confluence write operations:**
- `createConfluencePage` - Create new pages
- `updateConfluencePage` - Update existing pages
- `createConfluenceFooterComment` - Add footer comments
- `createConfluenceInlineComment` - Add inline comments

**Note on delete operations:** The official Atlassian Remote MCP server does not currently expose delete tools. If future server versions add delete capabilities (e.g., `deleteJiraIssue`, `deleteConfluencePage`), they should be added to the `disabledTools` list in `mcp.json` to maintain the read-only guarantee.

This ensures the power remains read-only and focused on requirements gathering and code validation.

## Best Practices

### Requirements Gathering
- Always retrieve full task details including subtasks before implementing
- Check subtasks carefully - requirements often split across them
- Search Confluence for related documentation and specifications
- Read comments on both Jira issues and Confluence pages for additional context
- Note acceptance criteria from main task, subtasks, and linked Confluence pages
- Check for design documents, API specs, and architecture decisions in Confluence

### Code Implementation
- List all requirements before writing code
- Address each requirement systematically
- Reference specific requirement IDs in code comments
- Verify implementation against checklist

### Code Review
- Get complete requirements first (main task + subtasks)
- Review code section by section against requirements
- Create checklist of met vs missing requirements
- Flag any code that doesn't match specifications

### Search Efficiency
- Use JQL for precise Jira searches instead of browsing
- Use CQL for precise Confluence searches
- Filter by assignee, sprint, and status for focused Jira results
- Filter by space, label, and date for focused Confluence results
- Order by priority to work on most important tasks first
- Save common JQL and CQL queries for reuse
- Search Confluence first for specifications before implementing Jira tasks

### Documentation Integration
- Link Jira issues to relevant Confluence pages mentally during implementation
- Read Confluence specs before starting Jira task implementation
- Check Confluence comments for clarifications and discussions
- Use Confluence spaces to understand team standards and patterns
- Reference both Jira requirements and Confluence documentation in code comments

### Workflow Integration
- Start each work session by checking assigned tasks
- Read full requirements before estimating or planning
- Update task status in Jira web UI after completing work
- Link related issues for traceability (do this in Jira web)

## Troubleshooting

### Authentication Issues

**Problem:** Not authenticated

**Solution:**
1. Use any Jira tool to trigger auth
2. Complete browser authentication
3. Retry operation

### Permission Errors

**Problem:** 403 Forbidden

**Solution:**
1. Verify project access in Jira web
2. Check with Jira admin for permissions
3. Ensure correct project key

### Issue Not Found

**Problem:** Issue key not found

**Solution:**
1. Verify issue key spelling (case-sensitive)
2. Check you have access to that project
3. Confirm issue exists in Jira web

### Search Returns Nothing

**Problem:** JQL returns no results

**Solution:**
1. Test JQL in Jira web interface first
2. Check field names (case-sensitive)
3. Use quotes for multi-word values
4. Simplify query incrementally

### Cloud ID Issues

**Problem:** Invalid cloud ID

**Solution:**
1. Use `getAccessibleAtlassianResources` first
2. Extract correct cloud ID from response
3. Use that ID in subsequent calls

### Confluence Page Not Found

**Problem:** Page ID not found

**Solution:**
1. Search for page using CQL first
2. Get page ID from search results
3. Verify you have access to that space
4. Check page exists in Confluence web

### Confluence Search Returns Nothing

**Problem:** CQL returns no results

**Solution:**
1. Test CQL in Confluence web interface first
2. Check space key spelling (case-sensitive)
3. Use `~` for fuzzy text matching in titles
4. Simplify query incrementally
5. Verify you have access to the space

## Configuration

**No configuration required** - uses Atlassian's hosted server.

Authentication handled via browser OAuth flow.

## MCP Config Placeholders

**No placeholders needed** - the official Atlassian MCP server handles authentication automatically through OAuth.

Simply use the power and authenticate when prompted!

## Tips for Effective Use

### Combining Jira and Confluence
1. Start with Jira task to understand what needs to be built
2. Search Confluence for related specifications and design docs
3. Read both Jira requirements and Confluence documentation
4. Check comments on both platforms for clarifications
5. Implement with complete context from both sources

### Finding Related Documentation
- Look for Confluence links in Jira issue descriptions
- Search Confluence using project name or feature name from Jira
- Check team spaces for standards and patterns
- Read page descendants for detailed specifications
- Review inline comments for implementation notes

### Efficient Workflow
1. `getAccessibleAtlassianResources` - Get cloud ID once
2. `searchJiraIssuesUsingJql` - Find your tasks
3. `getJiraIssue` - Read task details with subtasks
4. `searchConfluenceUsingCql` - Find related documentation
5. `getConfluencePage` - Read specifications
6. Implement with full context
7. Review code against both Jira and Confluence requirements

---

**MCP Server:** Official Atlassian MCP Server (Jira + Confluence)
**Endpoint:** `https://mcp.atlassian.com/v1/mcp`
**Documentation:** [Atlassian MCP Documentation](https://developer.atlassian.com/cloud/mcp/)
