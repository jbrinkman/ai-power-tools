---
name: "jira-story-wizard"
displayName: "Jira Story Wizard"
description: "Interactive wizard for creating well-structured Jira stories with user story best practices, acceptance criteria, and optional screenshots for visual context."
keywords: ["jira", "story", "user-story", "agile", "epic", "acceptance-criteria", "screenshot"]
author: "Joe Brinkman"
---

# Jira Story Wizard

## Overview

The Jira Story Wizard is an interactive agent-guided workflow for creating professional, well-structured Jira stories that follow user story best practices. It combines the power of the Atlassian Jira MCP server with Puppeteer screenshot capabilities to help you create comprehensive stories with visual context.

This power guides you through a structured process to gather requirements, analyze documentation, generate acceptance criteria, and optionally capture screenshots to attach to your stories. The result is consistently formatted, detailed Jira stories that your team can immediately act on.

**Key capabilities:**

- Interactive question-based workflow for gathering story requirements
- Automatic fetching and analysis of documentation URLs
- Generation of well-structured descriptions with multiple sections
- Smart acceptance criteria based on story context
- Screenshot capture for visual reference
- Support for Epic linking and custom labels
- Consistent formatting following user story best practices

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
- Node.js installed (for Puppeteer screenshot functionality)

### Configuration

**Jira MCP Server:**
The Jira SSE server connects to Atlassian's MCP endpoint and requires authentication through your Atlassian account. Authentication is handled automatically when you first use Jira tools in Kiro.

**Puppeteer Screenshot Server:**
The Puppeteer server runs locally via npx and requires no additional configuration. It will automatically download Chromium on first use.

**No additional setup required** - both servers work out of the box once the power is installed.

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

### Puppeteer Server Tools

- `puppeteer_screenshot` - Capture screenshots for visual reference
- `puppeteer_navigate` - Navigate to URLs before taking screenshots

### Why These Tools Are Safe

- **Read-only operations**: Most tools only retrieve information without making changes
- **Controlled writes**: `createJiraIssue` only creates stories with user-provided content
- **No system access**: Tools only interact with Jira/Confluence and web pages
- **Transparent actions**: All operations are visible and logged in the conversation

**Note:** You can always approve tools individually as prompts appear, but pre-approving these tools eliminates interruptions during the story creation workflow.

### Standard Labels

The wizard uses these standard labels to maintain consistency across stories:

- `Spike` - Research or investigation work
- `PR-Needed` - Requires pull request to external repository
- `New-Integration` - New third-party system integration
- `Enhancement` - Improvement to existing functionality

**Important:** Jira labels cannot contain spaces. Always use hyphens or underscores (e.g., `New-Integration` not `New Integration`).

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

### Workflow 2: Create a Story with Screenshot

**Goal:** Create a Jira story that includes a screenshot for visual reference (e.g., UI mockup, error state, design reference).

**Steps:**

1-5. **Follow the same steps as Workflow 1** to create the basic story

1. **Before or after story creation, capture a screenshot:**
   - Provide the URL to screenshot
   - Example: "Take a screenshot of <https://example.com/mockup>"

2. **Screenshot is captured** and can be referenced in the story description or attached

**Example:**

```
User: "Create a story for redesigning the login page, and include a screenshot of the current design"

[Interactive workflow proceeds as in Workflow 1]

Agent: "Would you like me to capture a screenshot of the current login page?"

User: "Yes, screenshot https://app.myorg.com/login"

Agent: "Screenshot captured successfully. I'll include a reference to it in the story description."
```

**Note:** Screenshots are captured and saved locally as PNG files. The Jira MCP server doesn't support automatic file attachment, so screenshots must be manually attached to Jira issues through the Jira UI after story creation.

### Workflow 3: Create a Spike Story

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

This power uses two MCP servers:

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

### Puppeteer Server

**Server:** `puppeteer`  
**Connection:** Local (STDIO) - npx @modelcontextprotocol/server-puppeteer

**Available Tools:**

- `puppeteer_screenshot` - Capture screenshots of web pages
- `puppeteer_navigate` - Navigate to URLs for screenshot capture

**Disabled Tools:** Form interaction tools (clicking, filling, selecting, hovering, JavaScript evaluation) are disabled to keep the context focused on screenshot functionality. Navigation is enabled and trusted as it's essential for capturing screenshots of specific URLs.

**Auto-approved tools:** `puppeteer_screenshot` and `puppeteer_navigate` are pre-approved.

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

### Screenshots

Use screenshots for:

- UI mockups or design references
- Error states that need fixing
- Current state before redesign
- Visual bugs or layout issues
- Competitor features for reference

**Don't overuse screenshots** - only include them when visual context adds significant value.

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

### Screenshot Capture Issues

**Problem:** Screenshot fails or times out

**Solutions:**

1. Verify the URL is accessible and loads properly
2. Check your internet connection
3. Try a simpler page first to verify Puppeteer is working
4. Increase timeout if the page is slow to load
5. Ensure Chromium downloaded successfully (first run may take time)

**Problem:** Screenshot is blank or incomplete

**Solutions:**

1. The page may require JavaScript - wait for page load
2. Some pages block headless browsers - this is expected for some sites
3. Try a different URL to verify functionality
4. Check if the page requires authentication

**Problem:** How do I attach the screenshot to the Jira story?

**Solution:** Screenshots are saved locally and must be manually attached:

1. Open the Jira story in your browser (use the provided URL)
2. Click the "Attach" button or paperclip icon
3. Select the screenshot file from your local filesystem
4. The file will be uploaded and attached to the story

**Note:** The Jira MCP server doesn't support automatic file attachment - this is a limitation of the MCP implementation, not Jira itself.

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
- **Puppeteer Documentation**: <https://pptr.dev/>

---

**Package:** `@modelcontextprotocol/server-puppeteer@latest`  
**MCP Servers:** jira-sse, puppeteer
