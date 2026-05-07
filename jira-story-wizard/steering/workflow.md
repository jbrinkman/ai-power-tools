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

## Mode Requirement

**IMPORTANT**: This entire workflow MUST be executed in chat (vibe) mode. Do NOT suggest switching to spec mode or offer to create a spec. All phases — information gathering, content analysis, story generation, review, and creation — are handled interactively in the conversation. Never prompt the user about using specs for this workflow.

## Workflow

When this steering document is invoked, follow this process:

### Phase 1: Information Gathering

**IMPORTANT**: You MUST ask every question below, one at a time, regardless of what
the user provided in their initial prompt. Do NOT skip questions. Do NOT proceed to
Phase 2 until every question has been explicitly answered (or answered with 'none').
If the user provided information upfront (e.g., URLs, an Epic, a user story),
acknowledge what you extracted but still ask the remaining questions.

Collect the following information by asking questions **one at a time**:

1. **Epic Link** (if not provided in initial prompt)
   - Check if the user mentioned an Epic in their initial message (e.g., "for Epic PROJ-122")
   - If mentioned, confirm: "I see you mentioned Epic PROJ-122. I'll link the story there. Correct?"
   - If not mentioned, ask: "What Epic should this story be linked to? (e.g., PROJ-122, or 'none')"

2. **Project** (optional override)
   - Default to the user's primary project unless they specify otherwise
   - Only ask if user mentions a different project or if context suggests it

3. **Issue Type**
   - Ask: "What type of work is this? (Story, Spike/Research, Bug, Task — default: Story)"

4. **User Story Components**
   - If the user provided a partial story, extract the actor, action, and benefit
   - Confirm: "I extracted this user story: 'As a [actor], I want [action], so that [benefit].' Is that correct, or would you like to adjust it?"
   - If missing components, ask for them to complete: "As a [actor], I want [action] so that [benefit]"

5. **GitHub Repository URL**
   - Ask: "What is the GitHub repository URL for this work? (or 'none')"
   - If the user already provided a repo URL, confirm: "I see you provided [URL] — is this the primary repository? Any others?"
   - Label this as "Project Repository" in references

6. **Documentation URLs**
   - Ask: "Are there documentation pages I should review for context? (provide URLs or 'none')"
   - If the user already provided doc URLs, ask: "I see you provided [URLs]. Are there any additional documentation pages I should review?"
   - Label these as "Documentation" in references

7. **Additional Reference URLs**
   - Ask: "Any other reference URLs I should review? (e.g., API docs, design specs, RFCs, competitor examples — provide with labels or 'none')"

8. **Technical Constraints**
   - Ask: "Are there specific technical constraints I should know about? (e.g., must use a specific API, language requirements, architectural patterns, or 'none')"

9. **Dependencies**
   - Ask: "Does this work depend on or block any other stories/work? (provide issue keys or describe, or 'none')"

10. **Additional Context**
    - Ask: "Any other context, requirements, or non-functional concerns (performance, security, accessibility) I should factor in? (or 'none')"

#### Checkpoint

After all questions are answered, present a brief summary of what you collected:

```text
Here's what I have so far:
- Epic: [value]
- Project: [value]
- Type: [value]
- User Story: As a [actor], I want [action], so that [benefit]
- Repository: [value or none]
- Documentation: [URLs or none]
- References: [URLs or none]
- Technical Constraints: [value or none]
- Dependencies: [value or none]
- Additional Context: [value or none]

Does this look complete, or is there anything you'd like to add or change before I
analyze the content and draft the story?
```

**Do NOT proceed to Phase 2 until the user confirms the summary.**

### Phase 2: Content Analysis

**IMPORTANT**: Do NOT begin generating the story (Phase 3) until this phase is fully
complete. All URLs must be fetched and analyzed first.

After gathering all information:

1. **Fetch and analyze ALL URLs** using the Jina Reader proxy for cleaner, more
   complete content extraction:
   - Fetch `https://r.jina.ai/<url>` using web_fetch in full mode
   - This returns clean markdown optimized for LLM consumption, with navigation,
     ads, and boilerplate removed
   - Review GitHub repository for project description and technical details
   - Review documentation for features, architecture, and integration points
   - Review additional references for specific context

2. **For each fetched page, extract:**
   - Project purpose and scope
   - Technical architecture and stack
   - Relevant features and integration points
   - Any constraints or requirements mentioned
   - **Key linked pages** that may contain deeper relevant context (e.g., API
     references, architecture docs, getting-started guides)

3. **Deep analysis** — If the fetched content references important sub-pages that
   would provide critical context for the story (e.g., a docs homepage links to
   an API reference or architecture overview), ask the user:
   *"I found these potentially relevant linked pages: [list]. Should I review any
   of them for additional context?"*
   Fetch and analyze any pages the user confirms (also via Jina Reader).

4. **Synthesize information** to understand:
   - The project's purpose and capabilities
   - Technical architecture and integration opportunities
   - User needs and expected benefits
   - How technical constraints and dependencies factor in

5. **If the fetched content reveals ambiguity or raises new questions** not covered
   in Phase 1, ask the user for clarification BEFORE proceeding to Phase 3.

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

5. **Labels**
   - Suggest relevant labels from the standard list
   - May suggest 1-2 additional context-specific labels if highly relevant
   - Ensure all labels use hyphens or underscores instead of spaces
   - Include in review for user approval

### Phase 4: Review and Approval

Present the complete story to the user for review:

```text
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
   - Ask whether to include the original prompt verbatim; default to excluding it.
   - If included, redact secrets/PII (tokens, credentials, emails, IDs) before writing the file.

## Important Notes

- Always ask questions one at a time and wait for responses
- Fetch and analyze all URLs together after gathering complete context
- Generate professional, well-structured narratives using information from URLs and user input
- The title should be short and action-oriented (under 10-12 words)
- The description should start with the full user story, then include context sections
- Keep descriptions concise but informative (4-5 sections)
- Make acceptance criteria specific and testable
- All labels must use hyphens or underscores, never spaces
- Sprint assignment cannot be done via API - remind user to assign manually in Jira UI
- Only create markdown files when explicitly requested by user
