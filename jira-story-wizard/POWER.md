---
name: "jira-story-wizard"
displayName: "Jira Story Wizard"
description: "Interactive wizard for creating well-structured Jira stories with user story best practices and acceptance criteria."
keywords: ["jira", "story", "user-story", "agile", "epic", "acceptance-criteria"]
author: "Joe Brinkman"
---

# Jira Story Wizard

## Overview

The Jira Story Wizard is an interactive agent-guided workflow for creating professional, well-structured Jira stories that follow user story best practices. It leverages the Atlassian Jira MCP server to help you create comprehensive stories with clear requirements.

This power guides you through a structured process to gather requirements, analyze documentation, generate acceptance criteria, and create consistently formatted, detailed Jira stories that your team can immediately act on.

**Key capabilities:**

- Interactive question-based workflow for gathering story requirements
- Automatic fetching and analysis of documentation URLs
- Generation of well-structured descriptions with multiple sections
- Smart acceptance criteria based on story context
- Support for Epic linking and custom labels
- Consistent formatting following user story best practices

## Important: Chat Mode Only

This power is designed to work entirely in chat (vibe) mode. Do NOT suggest switching to spec mode or creating a spec for story creation. The interactive workflow handles all phases (gathering requirements, generating content, reviewing, and creating the story) directly in the conversation. Always stay in chat mode throughout the entire workflow.

## Available Steering Files

This power includes one steering file with the detailed workflow:

- **workflow** - Complete interactive workflow for creating Jira stories with all phases (information gathering, content analysis, story generation, review, and creation)

To access the detailed workflow, use:

```
Call action "readSteering" with powerName="jira-story-wizard", steeringFile="workflow.md"
```

The workflow steering file is automatically invoked when you mention creating a Jira story.

## Onboarding

### Prerequisites

- Active Atlassian/Jira account with story creation permissions
- Access to the Jira project where stories will be created
- Authenticated Jira MCP server connection

### Configuration

**Jira MCP Server:**
The Jira SSE server connects to Atlassian's MCP endpoint and requires authentication through your Atlassian account. Authentication is handled automatically when you first use Jira tools in Kiro.

**No additional setup required** - the server works out of the box once the power is installed.

## Recommended Tool Approvals

For the smoothest experience, consider auto-approving these frequently used tools in the MCP Server view:

### Jira SSE Server Tools

- `createJiraIssue` - Core functionality for creating Jira stories
- `getVisibleJiraProjects` - Discover available projects for story creation
- `getJiraProjectIssueTypesMetadata` - Get available issue types (Story, Task, etc.)
- `atlassianUserInfo` - Get current user context for story assignment
- `getAccessibleAtlassianResources` - Access Atlassian cloud instances
- `searchJiraIssuesUsingJql` - Search for existing issues and Epics
- `getJiraIssueTypeMetaWithFields` - Get field requirements for story creation
- `search` - Unified search across Jira and Confluence

### Why These Tools Are Safe

- **Read-only operations**: Most tools only retrieve information without making changes
- **Controlled writes**: `createJiraIssue` only creates stories with user-provided content
- **No system access**: Tools only interact with Jira/Confluence
- **Transparent actions**: All operations are visible and logged in the conversation

**Note:** You can always approve tools individually as prompts appear, but pre-approving these tools eliminates interruptions during the story creation workflow.

### Standard Labels

The wizard uses a set of standard labels to maintain consistency across stories. The authoritative list of labels is defined in the [workflow steering file](steering/workflow.md). Labels cannot contain spaces — always use hyphens or underscores.

## Common Workflows

### Workflow 1: Create a Basic Jira Story

**Goal:** Create a well-structured Jira story with user story format, description, and acceptance criteria.

**Steps:**

1. **Invoke the wizard** by mentioning you want to create a Jira story
   - Example: "I need to create a Jira story for adding authentication"
   - The wizard will activate and begin the interactive workflow

2. **Provide Epic link** (if not already mentioned)
   - Example: "PROJ-122"

3. **Answer questions one at a time:**
   - User story components (actor, action, benefit)
   - GitHub repository URL (optional)
   - Documentation URL (optional)
   - Additional reference URLs (optional)
   - Additional context (optional)

4. **Review the generated story:**
   - Title
   - Description with sections (User Story, Overview, Problem/Need, Proposed Solution, Value/Impact)
   - Acceptance criteria (3-5 specific, testable items)
   - References
   - Labels

5. **Approve or request changes**

6. **Story is created** and you receive the story key and URL

**Example:**

```
User: "Create a Jira story for Epic PROJ-122 to add OAuth2 authentication"

Agent: "What is the GitHub repository URL? (or 'none' if not applicable)"

User: "https://github.com/myorg/auth-service"

Agent: "What is the documentation URL? (or 'none' if not applicable)"

User: "https://docs.myorg.com/auth"

[Agent fetches and analyzes URLs]

Agent: "Here's the proposed Jira story:

**Title**: Implement OAuth2 authentication service

**Description**:
**User Story**: As a user, I want to authenticate using OAuth2 so that I can securely access the application with my existing credentials.

**Overview**: This story implements OAuth2 authentication...
[continues with full description]

**Acceptance Criteria**:
- OAuth2 flow successfully authenticates users
- Token refresh mechanism works correctly
- Unit tests achieve >80% coverage
- Documentation includes integration guide

**References**:
- Project Repository: https://github.com/myorg/auth-service
- Documentation: https://docs.myorg.com/auth

**Labels**: New-Integration, Enhancement

**Project**: PROJ
**Epic**: PROJ-122

Please review and let me know if you'd like any changes, or approve to create the story."

User: "Looks good, create it"

Agent: "✅ Story created successfully!
Story: PROJ-456
URL: https://yoursite.atlassian.net/browse/PROJ-456"
```

### Workflow 2: Create a Spike Story

**Goal:** Create a research or investigation story (Spike) with appropriate labeling.

**Steps:**

1. **Mention it's a Spike** when invoking the wizard
   - Example: "Create a Spike story to research GraphQL migration options"

2. **Follow the interactive workflow** as usual

3. **The wizard automatically:**
   - Adjusts the user story format for research work
   - Adds the `Spike` label
   - Focuses acceptance criteria on research deliverables (findings, recommendations, POC)

**Example Spike Acceptance Criteria:**

- Research document compares at least 3 GraphQL client libraries
- POC demonstrates basic query and mutation operations
- Recommendation includes pros/cons and migration effort estimate
- Findings are presented to the team

## MCP Servers and Tools

This power uses one MCP server:

### Jira SSE Server

**Server:** `jira-sse`  
**Connection:** Remote (SSE) - <https://mcp.atlassian.com/v1/sse>

**Available Tools:**

- `getAccessibleAtlassianResources` - Get available Atlassian cloud instances
- `getVisibleJiraProjects` - List Jira projects you can access
- `getJiraIssue` - Retrieve issue details
- `getJiraProjectIssueTypesMetadata` - Get available issue types for a project
- `createJiraIssue` - Create a new Jira issue/story
- `atlassianUserInfo` - Get current user information
- `searchJiraIssuesUsingJql` - Search issues using JQL
- `getJiraIssueTypeMetaWithFields` - Get field metadata for issue types
- `search` - Unified search across Jira and Confluence

**Auto-approved tools:** All tools listed above are pre-approved for seamless workflow.

## Best Practices

### User Story Format

Always follow the standard user story format:

```
As a [actor/role],
I want [action/feature],
so that [benefit/value].
```

**Good examples:**

- "As a developer, I want API documentation so that I can integrate the service quickly"
- "As a user, I want to reset my password so that I can regain access if I forget it"
- "As an admin, I want to view audit logs so that I can track system changes"

**Avoid:**

- Technical implementation details in the user story itself (put those in description)
- Vague benefits ("so that it works better")
- Missing the actor or benefit

### Description Structure

Keep descriptions concise but informative with 4-5 sections:

1. **User Story** - The full user story statement
2. **Overview/Context** - Brief background (2-3 sentences)
3. **Problem/Need** - What challenge this addresses (2-3 sentences)
4. **Proposed Solution** - How this story solves it (3-4 sentences)
5. **Value/Impact** - Expected benefits (2-3 sentences)

### Acceptance Criteria

Make criteria specific, testable, and measurable:

**Good criteria:**

- "Authentication flow completes in <2 seconds"
- "Error messages display in user's preferred language"
- "Unit tests achieve >80% code coverage"
- "API returns 401 for invalid tokens"

**Avoid:**

- Vague criteria ("works well", "looks good")
- Implementation details ("uses Redux for state management")
- Non-testable statements ("code is clean")

### Labels

- Use standard labels when applicable
- Keep custom labels focused and relevant
- Use hyphens or underscores, never spaces
- Limit to 3-5 labels per story

## Troubleshooting

### Jira Connection Issues

**Problem:** "Unable to connect to Jira" or authentication errors

**Solutions:**

1. Verify you're logged into Atlassian in your browser
2. Check that the Jira MCP server is enabled in Kiro settings
3. Try disconnecting and reconnecting the Jira MCP server
4. Verify you have permissions to create issues in the target project

### Story Creation Fails

**Problem:** Story creation returns an error

**Common causes and solutions:**

**Error: "Field 'X' is required"**

- Some Jira projects have custom required fields
- Check project settings in Jira UI to see required fields
- Provide the required field values when creating the story

**Error: "Epic not found"**

- Verify the Epic key is correct (e.g., "PROJ-122")
- Ensure the Epic exists and you have access to it
- Check that the Epic is in the same project

**Error: "Invalid issue type"**

- The project may not support "Story" issue type
- Use `getJiraProjectIssueTypesMetadata` to see available types
- Specify the correct issue type for your project

### Sprint Assignment

**Problem:** "How do I assign the story to a sprint?"

**Solution:** Sprint assignment cannot be done via the MCP API. After creating the story:

1. Open the story in Jira UI (use the provided URL)
2. Click the sprint field
3. Select the target sprint from the dropdown
4. Save the change

This is a Jira API limitation, not a power limitation.

## Workflow Tips

### Efficient Story Creation

1. **Prepare information beforehand:**
   - Have Epic key ready
   - Gather relevant URLs
   - Think through the user story components

2. **Use the interactive workflow:**
   - Answer questions one at a time
   - Provide "none" for optional fields you want to skip
   - Review carefully before approving

3. **Leverage URL analysis:**
   - Provide GitHub repos for technical context
   - Include documentation for feature details
   - Add API references for integration stories

### Batch Story Creation

For creating multiple related stories:

1. **Create the first story** with full detail
2. **Note the pattern** used for description and criteria
3. **Create subsequent stories** more quickly by referencing the first
4. **Maintain consistency** in format and detail level

### Documentation

When the wizard offers to save a markdown file:

- Accept if you want a local record
- Useful for sharing story details with team before creation
- Good for tracking story evolution over time
- Decline if you only need the Jira story itself

## Additional Resources

- **Jira API Documentation**: <https://developer.atlassian.com/cloud/jira/platform/rest/v3/>
- **User Story Best Practices**: <https://www.atlassian.com/agile/project-management/user-stories>
- **Acceptance Criteria Guide**: <https://www.atlassian.com/agile/project-management/acceptance-criteria>

---

**MCP Servers:** jira-sse
