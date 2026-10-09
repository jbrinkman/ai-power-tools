---
name: review-valkey-narrative
description: >-
  Evaluate Valkey integration narratives against standard criteria, whether the
  narrative lives in Confluence or in Chorus (chorus.aws.dev, Amazon's internal
  AI-native doc platform). Use when asked to "review a narrative", "evaluate a
  valkey narrative", "check a narrative", "review valkey integration", or
  "assess narrative completeness". Detects the source from the input, reads the
  narrative, scores it, and runs an interactive comment-approval workflow that
  posts back to the originating document.
---

# Review Valkey Integration Narrative

Evaluate Valkey integration narratives, providing structured feedback on completeness, technical approach, and problem articulation. Narratives may live in **Confluence** or in **Chorus** (`chorus.aws.dev`) — the team migrated from Confluence to Chorus, so handle both. The evaluation criteria (Steps 2–4) are identical regardless of source; only retrieval (Step 1) and comment posting (Step 5) differ.

## Step 0: Determine the Source

Figure out whether the narrative is in Confluence or Chorus before doing anything else.

| Signal | Source |
|--------|--------|
| URL contains `chorus.aws.dev/doc/<docId>` | **Chorus** |
| URL contains `atlassian.net/wiki` or a Confluence page ID | **Confluence** |
| User says "Chorus" / "the chorus doc" / "the new doc" | **Chorus** |
| User says "Confluence" / "the wiki page" | **Confluence** |
| Only a title/search term given | Default to **Chorus** (current system of record); if nothing is found there, fall back to searching Confluence. State which you searched. |

If the source is genuinely ambiguous and both could match, ask the user which one before retrieving.

### Chorus prerequisites (only when the source is Chorus)

Chorus access is through the **`chorus-mcp`** MCP server — the Supported, hosted (Streamable HTTP) server, Midway-authed. (Do **not** use `local-chorus-mcp`: it is an "in development" binary gated behind a deemed-export artifact permission and carries open security findings; `chorus-mcp` is the supported path.) Confirm it is available:

```bash
aim mcp list | grep -A1 '^chorus-mcp'
```

- If not installed: `aim mcp install chorus-mcp`. The install prints the agent config snippet:
  ```json
  "mcpServers": { "chorus-mcp": { "command": "chorus-mcp", "args": [] } }
  ```
  A new session is required for a freshly added MCP to load.
- `chorus-mcp` exposes six tools, each dispatching on an `action`: **`ChorusDocRead`** (read, read-sheet, read-block, list-content, search), **`ChorusDocWrite`** (create-doc, insert-block, edit-block, delete-block, …), **`ChorusComment`** (list, write, reply, edit, react), **`ChorusManage`** (folders/rename/archive), and `ChorusCanvasRead`/`ChorusCanvasWrite` (HTML canvas docs — not needed for narrative review). There is **no** `reveal` step and no prose `str_replace` on this server; those belong to the other (unsupported) server.
- Chorus authenticates via **Midway**. If a call fails on auth, run `mwinit` (or, in an AgentSpace, use the chat input's triple-dot menu → **Refresh Midway** — do not run `mwinit` in an AgentSpace). Auth wobbles after sleep are almost always Midway.

## Step 1: Retrieve the Narrative

### Source A — Chorus

Use the `chorus-mcp` tools.

**If given a title or search term**, find the doc with `ChorusDocRead` `search` (matches title and body; returns `doc_id`s). Use `list-content` instead to browse a folder level:

```
ChorusDocRead  { "action": "search", "query": "<TITLE OR TERM>" }
```

**If given a direct Chorus URL** (`https://chorus.aws.dev/doc/<docId>/<title-slug>`), extract `<docId>` from the path (the segment right after `/doc/`).

**Read the full narrative** with `ChorusDocRead` `read`. It returns the doc as Markdown with per-block delimiters of the form `<!-- id=<block_id>, type=<type> -->`. **Keep these block ids** — you need a `block_id` to anchor a comment in Step 5:

```
ChorusDocRead  { "action": "read", "doc_id": "<docId>" }
```

Notes:
- Doc URLs are `https://chorus.aws.dev/doc/<docId>/<title-slug>` (`doc` singular). Construct the URL from the `doc_id` when you need to cite the narrative.
- Chorus renders fenced ` ```mermaid ` blocks as live diagrams; treat Mermaid blocks as first-class narrative content when evaluating diagrams/architecture.

### Source B — Confluence

Use the **confluence-cli** skill to access the narrative.

**If given a page title or search term:**

```bash
atlassian-cli confluence search cql 'title ~ "<TITLE>" AND type = page AND space = AMZ' -f json
```

**If given a direct Confluence URL:** extract the page ID from the URL (the numeric ID in the path).

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
2. Ask: "Should I add this comment to the <Chorus|Confluence> document?"
3. Wait for user response
4. **If approved:** Post the comment to the originating source (see below)
5. **If declined:** Move to the next comment
6. Continue until all comments are reviewed

### Posting a comment — Chorus

Use `ChorusComment`. A narrative comment should anchor to the passage it is about, so pass a nested `anchor` whose `block_id` comes from the `<!-- id=... -->` delimiter in the Step 1 `read` output (the `anchor` is a character range within that one block). `body` is Markdown. `write` returns a `comment_num`:

```
ChorusComment  { "action": "write", "doc_id": "<docId>",
                 "anchor": { "block_id": "<block_id>", ... }, "body": "<COMMENT_TEXT>" }
```

- To respond in an existing thread rather than open a new one, use `reply` with the thread's `parent_num` (the `comment_num` that `list` reports): `{ "action": "reply", "doc_id": "<docId>", "parent_num": <n>, "body": "..." }`.
- To review what is already on the doc, use `list`: `{ "action": "list", "doc_id": "<docId>" }`.
- No `reveal` or presence registration is required on `chorus-mcp` — just `read` (Step 1) then `write`. If you did not retain a `block_id` for the passage, re-run `ChorusDocRead` `read` to recover the delimiters before anchoring.

### Posting a comment — Confluence

```bash
atlassian-cli confluence page add-comment <PAGE_ID> "<COMMENT_TEXT>"
```

## Step 6: Final Summary

After processing all comments:

- Report how many comments were added vs. total proposed
- State which source (Chorus or Confluence) the comments were posted to, and cite the document URL
- Provide final recommendations
- Offer to re-evaluate after the author makes updates

## Narrative Locations

- **Chorus (current):** narratives live at `https://chorus.aws.dev/doc/<docId>/<title-slug>`. Find them with `ChorusDocRead` `search` (or `list-content` to browse a folder), or ask the author for the doc link / Chorus folder.
- **Confluence (legacy):** Space `AMZ`, Narratives folder — https://bitquill.atlassian.net/wiki/spaces/AMZ/pages/4002775042/Narratives

## Review Best Practices

- Read the **entire narrative** before starting evaluation
- Be **specific** — reference exact sections in comments
- Be **constructive** — suggest improvements, not just criticisms
- Adapt evaluation for non-standard narratives
- Present **one comment at a time** — don't overwhelm the user
- Respect user decisions — if they decline a comment, move on
- On Chorus: anchor each comment to the relevant block via the `block_id` from the `read` delimiters, and prefer `reply` to continue an existing thread rather than opening duplicates
