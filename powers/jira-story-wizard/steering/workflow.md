# Jira Story Creation Workflow

This steering file provides the detailed interactive workflow for creating well-structured Jira stories.

## Standard Labels

Use these standard labels when appropriate to maintain consistency:

- `Spike` - Research or investigation work
- `PR-Needed` - Requires pull request to external repository
- `New-Integration` - New third-party system integration
- `Enhancement` - Improvement to existing functionality

You may suggest additional labels based on story context, but prefer these standard labels when applicable.

**IMPORTANT**: Jira labels cannot contain spaces. Always use hyphens or underscores instead (e.g., `New-Integration` not `New Integration`).

## Workflow

When this steering document is invoked, follow this process:

### Phase 1: Information Gathering

Collect the following information by asking questions **one at a time**:

1. **Epic Link** (if not provided in initial prompt)
   - Check if the user mentioned an Epic in their initial message (e.g., "for Epic PROJ-122")
   - If not mentioned, ask: "What Epic should this story be linked to? (e.g., PROJ-122)"

2. **Project** (optional override)
   - Default to the user's primary project unless they specify otherwise
   - Only ask if user mentions a different project or if context suggests it

3. **User Story Components**
   - If the user provided a partial story, extract the actor, action, and benefit
   - If missing components, ask for them to complete: "As a [actor], I want [action] so that [benefit]"

4. **GitHub Repository URL** (optional)
   - Ask: "What is the GitHub repository URL? (or 'none' if not applicable)"
   - Label this as "Project Repository" in references

5. **Documentation URL** (optional)
   - Ask: "What is the documentation URL? (or 'none' if not applicable)"
   - Label this as "Documentation" in references

6. **Additional Reference URLs** (optional)
   - Ask: "Any additional reference URLs? Provide them with labels (e.g., 'API Guide: https://...' or 'none')"

7. **Screenshot URL** (optional)
   - Ask: "Would you like to include a screenshot for visual reference? If yes, provide the URL to capture (or 'none')"
   - If provided, use the Puppeteer screenshot tool to capture it

8. **Additional Context** (optional)
   - Ask: "Any additional context or requirements I should know about? (or 'none')"

### Phase 2: Content Analysis

After gathering all information:

1. **Fetch and analyze URLs** (if provided)
   - Review GitHub repository for project description and technical details
   - Review documentation for features, architecture, and integration points
   - Review additional references for specific context

2. **Capture screenshot** (if URL provided)
   - Use `puppeteer_screenshot` tool with `encoded: true` to capture the page as base64
   - Save the screenshot as a local file for manual attachment to Jira
   - Generate a descriptive filename based on the story context
   - Note the screenshot file location for reference in the story

3. **Synthesize information** to understand:
   - The project's purpose and capabilities
   - Technical architecture and integration opportunities
   - User needs and expected benefits
   - Visual context from screenshot (if captured)

### Phase 3: Story Generation

Generate the complete Jira story with:

1. **Title** (short, concise summary)
   - Generate a brief, descriptive title that captures the essence of the story
   - Keep it under 10-12 words
   - Use action-oriented language
   - Examples:
     - "Create Valkey integration for data persistence"
     - "Implement authentication service with OAuth2"
     - "Add real-time notifications to dashboard"

2. **Description** (structured narrative with 4-5 sections)
   - **User Story**: The full user story in format "As a [actor], I want [action] so that [benefit]"
   - **Overview/Context**: Brief background on the project and why this story matters
   - **Problem/Need**: What challenge or opportunity this addresses
   - **Proposed Solution**: How this story will address the need
   - **Value/Impact**: Expected benefits and outcomes
   - **Screenshot Reference** (if captured): Note the local screenshot file path and instructions for manual attachment to Jira
   - If you believe more sections are needed, ask for user input before proceeding

3. **Acceptance Criteria**
   - Generate 3-5 specific, testable criteria based on the story
   - Make them concrete and measurable
   - Examples:
     - "Integration successfully stores session data in cache"
     - "Documentation includes setup guide with code examples"
     - "Unit tests achieve >80% coverage"
     - "Performance benchmarks show <10ms latency"

4. **References**
   - List all provided URLs with descriptive labels:
     - Project Repository: [URL]
     - Documentation: [URL]
   - If screenshot was captured, include the file path and attachment instructions

5. **Labels**
   - Suggest relevant labels from the standard list
   - May suggest 1-2 additional context-specific labels if highly relevant
   - Ensure all labels use hyphens or underscores instead of spaces
   - Include in review for user approval

### Phase 4: Review and Approval

Present the complete story to the user for review:

```
Here's the proposed Jira story:

**Title**: [generated title]

**Description**:
**User Story**: As a [actor], I want [action] so that [benefit]

[generated description with sections]

**Acceptance Criteria**:
- [criterion 1]
- [criterion 2]
- [criterion 3]

**References**:
- [labeled URLs]

**Labels**: [suggested labels]

**Project**: [project-key]
**Epic**: [epic link]

Please review and let me know if you'd like any changes, or approve to create the story.
```

Wait for user approval or requested changes before proceeding.

### Phase 5: Story Creation

Once approved:

1. **Create the Jira story** using the Jira MCP tools
   - Use the generated title as the "summary" field
   - Use the full description (including User Story section) as the "description" field
   - Use the user's specified project (or their primary project)
   - Link to the specified Epic using the parent field
   - Include all approved content
   - Note: Sprint assignment must be done manually in Jira UI after creation

2. **Confirm creation**
   - Provide the story key (e.g., PROJ-123)
   - Provide the story URL

3. **Ask about markdown file**
   - "Would you like me to save a markdown file with the story details? If yes, what filename should I use?"
   - Only create the file if user confirms and provides a filename

## Important Notes

- Always ask questions one at a time and wait for responses
- Fetch and analyze all URLs together after gathering complete context
- Capture screenshots with `encoded: true` and save them as local files
- Generate descriptive filenames for screenshots (e.g., "jira-story-AEA-123-screenshot.png")
- Include screenshot file path and attachment instructions in story references
- Generate professional, well-structured narratives using information from URLs and user input
- The title should be short and action-oriented (under 10-12 words)
- The description should start with the full user story, then include context sections
- Keep descriptions concise but informative (4-5 sections)
- Make acceptance criteria specific and testable
- All labels must use hyphens or underscores, never spaces
- Sprint assignment cannot be done via API - remind user to assign manually in Jira UI
- Only create markdown files when explicitly requested by user

## Screenshot Workflow

When capturing screenshots:

1. **Capture with encoding**: Use `puppeteer_screenshot` with `encoded: true` parameter
2. **Generate filename**: Create descriptive filename like "jira-story-{epic}-{timestamp}-screenshot.png"
3. **Save locally**: Write the base64 data to a PNG file in the workspace
4. **Include in story**: Add file path and attachment instructions to story references
5. **Inform user**: Explain how to manually attach the screenshot to the Jira issue

**Example screenshot workflow:**

```
1. Capture: puppeteer_screenshot with encoded: true
2. Save: Write base64 data to "jira-story-PROJ-100-screenshot.png"
3. Reference: "Screenshot saved to: ./jira-story-PROJ-100-screenshot.png"
4. Instructions: "To attach: Open Jira story → Click 'Attach' → Select the screenshot file"
```

**Screenshot Best Practices:**

- Verify the URL is accessible before attempting capture
- Allow sufficient time for page load (especially for JavaScript-heavy pages)
- Inform the user if screenshot capture fails (some sites block headless browsers)
- Use descriptive filenames that include Epic/story context
- Always save screenshots locally for manual attachment
