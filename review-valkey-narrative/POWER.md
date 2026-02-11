---
name: "review-valkey-narrative"
displayName: "Review Valkey Narrative"
description: "Evaluate Valkey integration narratives in Confluence against standard criteria. Provides structured feedback on completeness, technical approach, and problem articulation for framework integration projects."
keywords: ["valkey", "narrative", "review", "confluence", "integration", "evaluation", "redis"]
author: "Valkey Integration Team"
---

# Review Valkey Narrative

## Overview

This power helps evaluate Valkey integration narratives stored in Confluence. It provides structured feedback based on standard evaluation criteria to ensure narratives are complete, technically sound, and provide clear justification for integration work.

The power is designed for teams working with AWS developers and the Valkey development team to assist Open Source Agentic framework projects integrate Valkey as part of their officially supported stack.

**Key Capabilities:**

- Access and read narratives from Confluence
- Evaluate narratives against standard technical criteria
- Provide structured feedback with specific comments
- Interactive comment approval workflow
- Adaptive evaluation for non-standard narratives

## Confluence Location

**Narratives Folder:** <https://bitquill.atlassian.net/wiki/spaces/AMZ/pages/4002775042/Narratives>

Team members create narrative documents in this folder when evaluating projects for Valkey integration.

## Evaluation Workflow

When you invoke this power to review a narrative, follow this workflow:

### Step 1: Retrieve the Narrative

Use the Atlassian MCP server to:

1. Search for or directly access the narrative page in Confluence
2. Read the complete narrative content
3. Parse the narrative structure and content

### Step 2: Evaluate Against Standard Criteria

Analyze the narrative against the following required criteria:

#### Required Technical Questions

**1. Current KV Database Usage**

- Does the framework currently leverage any KV database like Redis?
- Is this clearly stated in the narrative?

**2. Redis Feature Usage**

- What are the specific Redis features that the framework uses?
- Are these features documented with sufficient detail?
- Examples: strings, hashes, lists, sets, sorted sets, streams, pub/sub, etc.

**3. Redis Modules**

- Does the framework use any Redis modules like RedisSearch or RedisJSON?
- Are the specific modules clearly identified?

**4. Module Wrapping**

- If the framework does use Redis modules, are those modules used directly or are they wrapped by another library like RedisVL?
- Is the abstraction layer clearly documented?

**5. Valkey Compatibility**

- Can we use the framework with Valkey with no modifications and rely completely on Valkey's Redis compatibility?
- Is the compatibility assessment clear and justified?

**6. Source Code Location Strategy**

- If we are creating a new solution, what is the suggested approach in terms of where the source code will live?
- Options to evaluate:
  - Submitting a pull request to an existing project repository
  - Creating a new repository in the Valkey organization
  - Creating an example or sample app in the AWS or Valkey samples repositories
- Is the rationale for the chosen approach clearly explained?

**7. Problem Articulation**

- Does the narrative provide a clearly articulated problem that we are trying to solve?
- Key considerations:
  - Are Valkey users currently unable to leverage the existing solution?
  - Does Valkey and Valkey-Glide provide a significant benefit over existing database solutions offered in the framework?
  - Is the value proposition clear and compelling?

#### Narrative Quality Assessment

Beyond the technical questions, evaluate:

**Story Coherence**

- Does the narrative tell a coherent "story" about the problem to be solved and the approach being suggested?
- Is there a logical flow from problem identification to proposed solution?

**Supporting Information**

- Does the narrative include relevant supporting information?
- Examples: usage statistics, community feedback, technical benchmarks, competitive analysis

**Compelling Case**

- Does the narrative paint a compelling story for performing the work?
- Would a reader reach the same conclusion based on the information provided?

**Sufficient Detail**

- Does the narrative provide the necessary detail that allows the reader to understand:
  - The technical approach
  - The expected outcomes
  - The implementation plan
  - The success criteria

### Step 3: Adaptive Evaluation for Non-Standard Narratives

**IMPORTANT:** Not all narratives fit the standard integration pattern.

If the narrative describes a non-standard use case (e.g., building Kiro Powers for Valkey, documentation projects, tooling, etc.), adapt your evaluation:

1. **Identify the narrative type** - Recognize when standard criteria don't fully apply
2. **Ask relevant questions** - Formulate questions specific to the narrative's context
3. **Focus on fundamentals:**
   - Is there a clearly identified problem or opportunity?
   - Is the proposed solution (or "no further effort needed") well-justified?
   - Does the narrative provide sufficient context for decision-making?
   - Are the expected outcomes clear?

**Example Adaptive Questions:**

- For tooling/automation narratives: "What manual process does this automate? What's the time/effort savings?"
- For documentation narratives: "Who is the target audience? What gap in existing documentation does this fill?"
- For exploratory narratives: "What are the key questions to be answered? What are the decision criteria?"

### Step 4: Generate Evaluation Summary

Provide a high-level summary that includes:

- Overall assessment (Complete, Needs Improvement, Incomplete)
- Strengths of the narrative
- Key gaps or concerns
- Number of specific comments to follow

### Step 5: Interactive Comment Workflow

For each specific comment or suggestion:

1. **Present the comment** with:
   - The specific criterion or section it relates to
   - The issue or gap identified
   - Suggested improvement or clarification needed

2. **Ask for approval** - "Should I add this comment to the Confluence narrative?"

3. **Wait for user response** - One comment at a time

4. **If approved:** Use the Atlassian MCP server to add the comment to the appropriate section of the Confluence page

5. **If declined:** Move to the next comment

6. **Continue** until all comments have been reviewed

### Step 6: Final Summary

After all comments have been processed:

- Summarize how many comments were added
- Provide any final recommendations
- Offer to re-evaluate after updates if needed

## MCP Server Tools

This power uses the **jira-sse MCP server** (configured via jira-story-wizard power) to interact with Confluence.

**Key Tools Used:**

**getConfluencePage**

- Retrieve narrative content from Confluence
- Required parameters:
  - `cloudId` - Cloud ID (UUID or site URL)
  - `pageId` - Confluence page ID from URL
- Optional parameters:
  - `contentFormat` - "adf" (Atlassian Document Format) or "markdown" (default: markdown for easier reading)

**searchConfluenceUsingCql**

- Search for narratives using CQL (Confluence Query Language)
- Required parameters:
  - `cloudId` - Cloud ID (UUID or site URL)
  - `cql` - CQL query string (e.g., `title ~ "Letta" AND type = page AND space = AMZ`)
- Optional parameters:
  - `limit` - Max results (default: 25, max: 250)
  - `expand` - Properties to expand

**getPagesInConfluenceSpace**

- Get pages in the Narratives space
- Required parameters:
  - `cloudId` - Cloud ID (UUID or site URL)
  - `spaceId` - Space ID for AMZ space
- Optional parameters:
  - `title` - Title filter to find specific narratives
  - `limit` - Max results (default: 25, max: 250)

**createConfluenceFooterComment**

- Add evaluation comments to the narrative page
- Required parameters:
  - `cloudId` - Cloud ID (UUID or site URL)
  - `pageId` - Page ID to comment on
  - `body` - Comment content in Markdown

**getConfluencePageFooterComments**

- Review existing footer comments on the narrative
- Required parameters:
  - `cloudId` - Cloud ID (UUID or site URL)
  - `pageId` - Page ID
- Optional parameters:
  - `limit` - Max comments to retrieve
  - `status` - Comment status filter

**createConfluenceInlineComment**

- Create inline comments on specific text (for targeted feedback)
- Required parameters:
  - `cloudId` - Cloud ID (UUID or site URL)
  - `pageId` - Page ID to comment on
  - `body` - Comment content in Markdown
- Optional parameters:
  - `inlineCommentProperties` - Text selection properties for highlighting specific sections

**getAccessibleAtlassianResources**

- Get cloudId needed for all Confluence operations
- No parameters required
- Returns list of accessible Atlassian resources with their cloudIds

**search** (Rovo Search)

- Unified search across Jira and Confluence
- Required parameters:
  - `query` - Natural language search query
- Use this for quick searches when you don't need CQL precision

## Usage Examples

### Example 1: Review by Page Title

```text
User: "Review the Letta Valkey Integration narrative"

Agent workflow:
1. Get cloudId using getAccessibleAtlassianResources
2. Search Confluence using searchConfluenceUsingCql with query: title ~ "Letta" AND type = page AND space = AMZ
3. Retrieve the page content using getConfluencePage with pageId and contentFormat="markdown"
4. Evaluate against all criteria
5. Present summary evaluation
6. Present each comment one at a time for approval
7. Add approved comments using createConfluenceFooterComment
8. Provide final summary
```

### Example 2: Review by Direct URL

```text
User: "Review this narrative: https://bitquill.atlassian.net/wiki/spaces/AMZ/pages/123456789"

Agent workflow:
1. Extract page ID from URL (123456789)
2. Get cloudId using getAccessibleAtlassianResources
3. Retrieve the page content using getConfluencePage with pageId and contentFormat="markdown"
4. Evaluate against all criteria
5. Present summary evaluation
6. Present each comment one at a time for approval
7. Add approved comments using createConfluenceFooterComment
8. Provide final summary
```

### Example 3: Non-Standard Narrative

```text
User: "Review the Kiro Powers for Valkey narrative"

Agent workflow:
1. Get cloudId using getAccessibleAtlassianResources
2. Search for the narrative using searchConfluenceUsingCql
3. Retrieve the narrative using getConfluencePage
4. Recognize this is a non-standard integration (tooling/documentation)
5. Evaluate against fundamental questions:
   - Problem identification
   - Solution justification
   - Completeness
6. Ask adaptive questions specific to the tooling context
7. Present summary and comments
8. Interactive comment approval using createConfluenceFooterComment
9. Final summary
```

## Best Practices

### For Reviewers

- **Review the entire narrative** before starting the evaluation
- **Be specific** in comments - reference exact sections or statements
- **Be constructive** - suggest improvements, not just criticisms
- **Consider context** - adapt evaluation for non-standard narratives
- **Ask clarifying questions** - if something is unclear, ask before commenting

### For Narrative Authors

- **Address all required criteria** explicitly in your narrative
- **Provide evidence** - include links, data, examples to support claims
- **Tell a story** - connect problem → solution → value
- **Be specific** - avoid vague statements like "might be useful"
- **Include implementation details** - where will code live, who will maintain it, what's the timeline

### For the AI Agent

- **Read the complete narrative** before evaluating
- **Apply criteria thoughtfully** - not all narratives fit the standard pattern
- **Ask adaptive questions** when standard criteria don't fully apply
- **Be thorough but concise** in comments
- **One comment at a time** - don't overwhelm the user
- **Respect user decisions** - if they decline a comment, move on
- **Provide actionable feedback** - comments should be clear and specific

## Evaluation Criteria Reference

### Quick Checklist

Use this checklist when evaluating narratives:

- [ ] Current KV database usage clearly stated
- [ ] Specific Redis features documented
- [ ] Redis modules identified (if applicable)
- [ ] Module wrapping/abstraction documented (if applicable)
- [ ] Valkey compatibility assessment provided
- [ ] Source code location strategy defined
- [ ] Problem clearly articulated
- [ ] Value proposition is compelling
- [ ] Narrative tells a coherent story
- [ ] Supporting information included
- [ ] Sufficient technical detail provided
- [ ] Implementation approach is clear
- [ ] Success criteria defined

### Evaluation Rubric

**Complete Narrative:**

- Addresses all required criteria
- Provides compelling justification
- Includes sufficient technical detail
- Tells a coherent story
- Ready for decision-making

**Needs Improvement:**

- Addresses most criteria but has gaps
- Some justification provided but could be stronger
- Missing some technical details
- Story is present but could be clearer
- Needs minor revisions before decision

**Incomplete Narrative:**

- Missing multiple required criteria
- Weak or missing justification
- Insufficient technical detail
- Story is unclear or disconnected
- Requires significant revision

## Troubleshooting

### Cannot Find Narrative

**Problem:** Search doesn't return the expected narrative

**Solutions:**

1. Verify the narrative exists in the Narratives folder
2. Try searching by exact title
3. Ask user for the direct Confluence URL
4. Check if the narrative is in a different space

### Cannot Add Comments

**Problem:** createConfluenceFooterComment fails

**Solutions:**

1. Verify you have permission to comment on the page
2. Check that the page ID is correct
3. Ensure the jira-sse MCP server is properly authenticated
4. Try refreshing the MCP server connection
5. Verify the cloudId is correct

### Evaluation Seems Off

**Problem:** Standard criteria don't fit the narrative

**Solutions:**

1. Recognize this is a non-standard narrative
2. Switch to adaptive evaluation mode
3. Ask the user for context about the narrative type
4. Focus on fundamental questions (problem, solution, justification)

## Configuration

**No additional configuration required** - this power uses the jira-sse MCP server configuration from the jira-story-wizard power.

**Prerequisites:**

- jira-sse MCP server must be configured and authenticated
- User must have access to the Confluence space (AMZ)
- User must have permission to read pages and add comments

---

**MCP Server:** jira-sse (via jira-story-wizard)
**Confluence Space:** AMZ
**Target Folder:** Narratives
