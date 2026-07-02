---
name: review-valkey-narrative
description: >-
  Evaluate Valkey integration narratives in Confluence against standard criteria.
  Use when asked to "review a narrative", "evaluate a valkey narrative",
  "check a narrative", "review valkey integration", or "assess narrative completeness".
  Provides structured feedback with interactive comment approval workflow.
---

# Review Valkey Integration Narrative

Evaluate Valkey integration narratives stored in Confluence, providing structured feedback on completeness, technical approach, and problem articulation.

## Step 1: Retrieve the Narrative

Use the **confluence-cli** skill to access the narrative.

**If given a page title or search term:**

```bash
atlassian-cli confluence search cql 'title ~ "<TITLE>" AND type = page AND space = AMZ' -f json
```

**If given a direct Confluence URL:**

Extract the page ID from the URL (the numeric ID in the path).

**Read the full narrative content:**

```bash
atlassian-cli confluence page get <PAGE_ID> --body-only
```

Also retrieve page metadata for context:

```bash
atlassian-cli confluence page get <PAGE_ID> -f json
```

## Step 2: Evaluate Against Standard Criteria

Read the complete narrative, then assess each criterion below.

### Required Technical Questions

| # | Criterion | What to Check |
|---|-----------|---------------|
| 1 | **Current KV Database Usage** | Does the framework currently use any KV database like Redis? Clearly stated? |
| 2 | **Redis Feature Usage** | Specific Redis features documented (strings, hashes, lists, sets, streams, pub/sub, etc.)? |
| 3 | **Redis Modules** | Does the framework use Redis modules (RedisSearch, RedisJSON)? Identified? |
| 4 | **Module Wrapping** | If modules used, are they direct or wrapped by another library (e.g., RedisVL)? |
| 5 | **Valkey Compatibility** | Can the framework work with Valkey with no modifications via Redis compatibility? Assessment justified? |
| 6 | **Source Code Location** | Where will code live? (PR to existing repo / new Valkey org repo / sample app) Rationale explained? |
| 7 | **Problem Articulation** | Clear problem statement? Are Valkey users unable to use existing solution? Does Valkey-Glide offer significant benefit? |

### Narrative Quality Assessment

| Aspect | What to Check |
|--------|---------------|
| **Story Coherence** | Logical flow from problem identification to proposed solution? |
| **Supporting Information** | Usage stats, community feedback, benchmarks, competitive analysis? |
| **Compelling Case** | Would a reader reach the same conclusion? |
| **Sufficient Detail** | Technical approach, expected outcomes, implementation plan, success criteria clear? |

## Step 3: Handle Non-Standard Narratives

Not all narratives fit the standard integration pattern (e.g., tooling, documentation, Kiro Powers).

If standard criteria don't fully apply:

1. Identify the narrative type explicitly
2. Focus on fundamentals:
   - Is there a clearly identified problem or opportunity?
   - Is the proposed solution well-justified?
   - Sufficient context for decision-making?
   - Expected outcomes clear?
3. Ask adaptive questions per type:
   - **Tooling/automation:** What manual process does this automate? Time/effort savings?
   - **Documentation:** Target audience? What gap does it fill?
   - **Exploratory:** Key questions to answer? Decision criteria?

## Step 4: Generate Evaluation Summary

Present a structured summary:

1. **Overall Assessment:** Complete | Needs Improvement | Incomplete
2. **Strengths** of the narrative
3. **Gaps or Concerns** identified
4. **Number of specific comments** to follow

### Rubric

| Rating | Description |
|--------|-------------|
| **Complete** | All criteria addressed, compelling justification, sufficient detail, coherent story, ready for decision |
| **Needs Improvement** | Most criteria addressed but has gaps, needs minor revisions |
| **Incomplete** | Missing multiple criteria, weak justification, insufficient detail, requires significant revision |

## Step 5: Interactive Comment Workflow

For each specific comment:

1. Present the comment with:
   - The criterion or section it relates to
   - The issue or gap identified
   - Suggested improvement
2. Ask: "Should I add this comment to the Confluence page?"
3. Wait for user response
4. **If approved:** Add the comment:
   ```bash
   atlassian-cli confluence page add-comment <PAGE_ID> "<COMMENT_TEXT>"
   ```
5. **If declined:** Move to the next comment
6. Continue until all comments are reviewed

## Step 6: Final Summary

After processing all comments:

- Report how many comments were added vs. total proposed
- Provide final recommendations
- Offer to re-evaluate after the author makes updates

## Confluence Location

**Space:** AMZ
**Narratives folder:** https://bitquill.atlassian.net/wiki/spaces/AMZ/pages/4002775042/Narratives

## Review Best Practices

- Read the **entire narrative** before starting evaluation
- Be **specific** — reference exact sections in comments
- Be **constructive** — suggest improvements, not just criticisms
- Adapt evaluation for non-standard narratives
- Present **one comment at a time** — don't overwhelm the user
- Respect user decisions — if they decline a comment, move on
