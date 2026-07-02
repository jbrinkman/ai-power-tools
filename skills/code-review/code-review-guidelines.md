# Code Review Guidelines

## Purpose

Code review builds shared understanding, catches problems before they reach users, and helps
engineers learn from each other. These guidelines apply across languages, frameworks, and project types.

## For Authors

### Writing a Good PR

- Keep PRs focused on a single feature, fix, or refactor. Smaller PRs get faster, better reviews.
- Write a clear description: what changed, why, and how to verify it.
- Note any alternative approaches you considered and why you chose this one.
- Reference related tickets, issues, or design documents.
- Label work-in-progress/draft PRs clearly so reviewers know the state.

### Before Requesting Review

- Self-review your own diff first — you'll catch things you missed while writing.
- Make sure CI passes before assigning reviewers.
- Leave comments on non-obvious sections to give reviewers context.

### After Receiving Feedback

- Respond to every comment, even if just to acknowledge it.
- Reference the commit that addresses each piece of feedback.
- Request re-review after pushing changes — don't assume reviewers are watching.
- Avoid rebasing during review; it orphans existing comments and makes incremental review harder.

## For Reviewers

### What to Look For

#### Correctness

The primary goal is catching bugs — things that could break the application now or later.

- **Runtime errors**: Null dereferences, index out of bounds, unhandled exceptions, type errors
- **Edge cases**: Empty collections, zero/negative values, Unicode, very large inputs, concurrent access
- **Error handling**: Are errors caught and handled? Are resources (connections, handles, locks) cleaned up on all paths?
- **Logic errors**: Off-by-one, wrong boolean operators, incorrect precedence, swapped arguments

#### Performance

- **Algorithmic complexity**: Flag O(n²) or worse when n is unbounded or driven by external input
- **N+1 data fetching**: Loading related data inside a loop instead of batching (applies to ORMs, APIs, file I/O)
- **Unbounded results**: Queries, API calls, or file reads without pagination, limits, or streaming
- **Unnecessary work**: Redundant allocations, repeated computation, serializing more data than needed
- **Concurrency issues**: Blocking I/O in async contexts, lock contention, missing synchronization, race conditions
- **Resource leaks**: Unclosed connections, file handles, event listeners, timers, or subscriptions
- **Retry storms**: Aggressive retry logic without backoff that can amplify failures
- **Cache misuse**: Missing cache invalidation, stampede on expiry, caching mutable data

#### Security

- **Injection**: SQL, OS command, template, LDAP, or expression injection from unsanitized input
- **Prompt injection**: User-supplied or externally-sourced content incorporated into LLM prompts without proper controls (see Prompt Injection section below for details)
- **Authentication/authorization**: Missing or incorrect access control checks, privilege escalation paths
- **Secrets**: Hardcoded credentials, tokens logged or exposed in error messages
- **Input validation**: Untrusted data accepted without validation, type checking, or size limits
- **Dependency risk**: New or updated dependencies that are unmaintained, suspiciously named, or unpinned
- **Data exposure**: Sensitive fields returned in API responses, logged, or included in error payloads

#### Design

- Does the change fit the project's existing architecture and conventions?
- Are responsibilities clearly separated? Is new logic in the right layer?
- Could any new code be extracted into a reusable function or module?
- Are public interfaces (functions, endpoints, message contracts) clear, minimal, and documented?
- Are breaking changes flagged with a migration path or versioning strategy?

#### Test Coverage

- Are there tests for the new or changed behavior?
- Do tests cover edge cases and failure modes, not just the happy path?
- Are tests readable and maintainable — minimal branching, clear assertions, good names?
- Is permission and access control logic tested?
- If tests can't be added (infrastructure, config, etc.), is that explained?

#### Long-Term Impact

Escalate to a senior engineer or broader team discussion when changes involve:

- Database schema or data model changes
- Public API or contract changes (REST, GraphQL, gRPC, message formats)
- Adoption of new frameworks, libraries, or tools
- Performance-critical or security-sensitive code paths
- Large refactors that touch many files or modules

### Code Reduction

If you spot a way to significantly simplify the code — fewer variables, fewer branches, clearer
intent — suggest it. But be pragmatic: don't chase minimal code at the expense of readability.

### Style and Naming

Automation should handle most formatting, but reviewers should still check:

- Names (variables, functions, files, metrics) are sensible, readable, and consistent
- No dead code, commented-out blocks, or debug artifacts committed accidentally
- Debug logging uses a structured logging framework with configurable levels — not bare `print`, `console.log`, `fmt.Println`, or similar. All logging should be filterable (e.g., suppressed or limited to warnings/errors in production).
- Migrations or schema changes have a deployment plan

## Feedback Approach

### Tone

- Be respectful and assume good intent.
- Frame suggestions constructively: "What if we renamed X to Y for clarity?" instead of "This is bad."
- Ask questions when you're unsure: "Have you considered...?" or "Is this intentional?"

### Severity Levels

Label comments so the author knows what matters most:

- **nit**: Minor preference or style point. Optional to address.
- **suggestion**: Worth fixing but won't block the PR.
- **blocking**: Must be resolved before merging.

### Pragmatism Over Perfection

- The goal is reducing risk, not producing flawless code.
- Approve when only nits remain — don't force another review cycle for minor issues.
- Every change request adds latency. Weigh the value of each ask against the delay it introduces.
- It's fine to ship in stages and improve later. If something never needs revisiting, the extra polish probably wasn't necessary.
- Introduce large architectural ideas in design discussions, not as PR review comments.

## Review Cadence

- Check for pending reviews at the start and end of each day.
- Aim to complete initial review within one business day.
- A PR should ideally be approved and merged within 48 hours of being ready for review.

## Common Anti-Patterns by Category

These examples are language-agnostic patterns. The syntax will vary, but the problems are universal.

### N+1 Data Fetching

Loading related data one item at a time inside a loop instead of batching:

```
# Pseudocode — applies to any ORM, API client, or data layer
for item in items:
    related = fetch_related(item.id)  # One call per item

# Better: batch fetch
related_map = fetch_related_batch([item.id for item in items])
```

### Unbounded Collection Processing

Operating on an entire dataset without limits:

```
# Dangerous when the table/collection is large
all_records = db.query("SELECT * FROM events")
process(all_records)

# Better: paginate or stream
for batch in db.query_batched("SELECT * FROM events", batch_size=1000):
    process(batch)
```

### Injection

Building queries or commands from untrusted input via string concatenation:

```
# Vulnerable
db.execute("SELECT * FROM users WHERE id = " + user_id)

# Safe: parameterized
db.execute("SELECT * FROM users WHERE id = ?", [user_id])
```

### Prompt Injection

In agentic systems and LLM-powered integrations, prompt injection is a critical attack vector.
It occurs when untrusted content — user input, semantic search results, KV cache values, tool
outputs, or any externally-sourced data — is incorporated into an LLM prompt in a way that lets
an attacker influence the model's behavior.

**What to look for during review:**

- **Untrusted data in prompts**: Any path where user input, database records, search results,
  cached values, or third-party API responses flow into a prompt without sanitization or clear
  boundary markers. Treat all externally-sourced content as untrusted.
- **Semantic search results**: Documents retrieved via vector/embedding search are especially
  risky — an attacker can craft content designed to be retrieved for specific queries, embedding
  malicious instructions in the text.
- **KV cache poisoning**: If cached values are included in prompts, an attacker who can write to
  the cache can inject instructions that persist across requests and affect multiple users.
- **Missing input/output boundaries**: Prompts should clearly delineate system instructions from
  user-supplied or retrieved content (e.g., using delimiters, role separation, or structured
  message formats). Without boundaries, the model can't distinguish instructions from data.
- **Insufficient output validation**: LLM responses that drive actions (tool calls, code execution,
  data mutations) must be validated before execution. An injected prompt can cause the model to
  return malicious tool calls or unexpected actions.
- **Excessive agent permissions**: Agents with broad tool access (file writes, network calls,
  database mutations) amplify the impact of a successful injection. Review whether the agent's
  permissions follow least-privilege principles.
- **Chained agent risks**: In multi-agent or multi-step pipelines, output from one agent becomes
  input to the next. Each handoff is an injection surface — ensure intermediate outputs are
  treated as untrusted.

```
# Risky: search results injected directly into prompt
results = semantic_search(user_query)
prompt = f"Answer based on this context:\n{results}\n\nQuestion: {user_query}"

# Better: clearly delimit untrusted content and validate output
prompt = build_prompt(
    system="You are a helpful assistant. Only answer based on the provided context.",
    context=sanitize(results),   # Strip or escape control sequences
    user_input=user_query,
    delimiter="---CONTEXT BOUNDARY---"
)
response = llm.complete(prompt)
validate_response(response)  # Check for unexpected tool calls or actions
```

### Missing Error Handling

Ignoring errors or swallowing exceptions silently:

```
# Bad: error is silently lost
try:
    result = do_something()
except Exception:
    pass

# Better: handle or propagate meaningfully
try:
    result = do_something()
except SpecificError as e:
    log.warning("Operation failed", error=e)
    raise
```

### Resource Leaks

Opening resources without ensuring cleanup:

```
# Risky: connection stays open if processing fails
conn = open_connection()
process(conn)
conn.close()

# Better: use language-appropriate cleanup (try-finally, using, defer, with, etc.)
with open_connection() as conn:
    process(conn)
```
