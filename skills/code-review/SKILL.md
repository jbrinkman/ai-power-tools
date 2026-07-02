---
name: code-review
description: Perform thorough code reviews across any language or framework. Use when reviewing pull requests, examining code changes, or providing feedback on code quality. Covers correctness, security, performance, testing, and design review.
---

# Code Review

Follow these guidelines when reviewing code, regardless of language or framework.

## Review Checklist

### Correctness

- **Runtime errors**: Null/nil dereferences, index out of bounds, unhandled exceptions, type mismatches
- **Edge cases**: Empty inputs, zero values, negative numbers, Unicode, concurrent access
- **Error handling**: Are errors caught, propagated, and reported appropriately? Are resources cleaned up on failure?
- **Logic errors**: Off-by-one mistakes, incorrect boolean logic, wrong operator precedence

### Performance

- **Algorithmic complexity**: O(n²) or worse where n is unbounded or user-controlled
- **N+1 data fetching**: Querying or calling a service inside a loop instead of batching
- **Unbounded results**: Queries or API calls without pagination or limits
- **Unnecessary work**: Redundant allocations, repeated computation, over-serialization
- **Concurrency pitfalls**: Blocking calls in async contexts, lock contention, missing synchronization
- **Resource leaks**: Unclosed connections, file handles, subscriptions, or timers

### Security

- **Injection**: SQL, command, template, or expression injection from unsanitized input
- **Prompt injection**: User-controlled or externally-sourced content (search results, cached values, tool outputs) passed into LLM prompts without sanitization, boundary enforcement, or output validation
- **Authentication and authorization**: Missing or incorrect access control checks
- **Secrets exposure**: Credentials, tokens, or keys hardcoded or logged
- **Input validation**: Untrusted data accepted without validation or sanitization
- **Dependency risk**: New dependencies that are unmaintained, unfamiliar, or unpinned

### Design

- Does the change fit the existing architecture and conventions of the project?
- Are responsibilities clearly separated? Could any new logic be extracted or reused?
- Are public APIs (functions, endpoints, contracts) clear, minimal, and backwards-compatible?
- Are breaking changes documented with a migration path?

### Test Coverage

- Are there tests covering the new or changed behavior?
- Do tests verify actual requirements and edge cases, not just the happy path?
- Are tests readable and free of unnecessary branching or looping?
- Is access control and permission logic tested?

### Long-Term Impact

Flag for senior review when changes involve:

- Database schema or data model changes
- Public API or contract changes
- New framework, library, or tool adoption
- Performance-critical or security-sensitive code paths

## Feedback Guidelines

### Tone

- Be polite and constructive — assume the author has done their homework
- Provide actionable suggestions, not vague criticism
- Phrase as questions when uncertain: "Have you considered...?"
- Avoid accusatory language ("You should have done X")

### Severity

Indicate how important each comment is:

- **nit**: Minor style or preference issue. Optional to address.
- **suggestion**: Worth considering and usually worth fixing.
- **blocking**: Must be resolved before merging.

### Pragmatism

- The goal is risk reduction, not perfect code
- Approve when only minor nits remain — don't block for stylistic preferences
- Every round of changes adds delay, so weigh the cost of each request
- Shipping in stages is fine; commit to improving things later
- Large architectural proposals belong in design discussions, not PR comments

## Tools

This skill uses the following CLI tools:

- **GitHub CLI (`gh`)**: Used to fetch PR details, diffs, and post review comments. Required for all reviews.
- **Atlassian CLI (`acli`)**: Used to fetch Jira issue details (user story, acceptance criteria). Only required when a Jira issue is referenced in the PR or provided by the user.

### Posting Review Comments

**Never use `gh pr review --comment`** unless the user explicitly asks for a single top-level comment.
All review comments must be submitted as inline comments with file and line references, batched
into a single review submission.

#### Accumulating comments

As the user approves each finding, accumulate them internally as a list of objects:

```json
[
  {"path": "src/file.ts", "line": 42, "body": "The comment text"},
  {"path": "src/other.ts", "line": 10, "body": "Another comment"}
]
```

Do NOT post anything to GitHub until Step 6 (Submit the review).

#### Determining line numbers

Parse the diff hunk headers to map findings to line numbers on the HEAD (right) side of the diff.
Hunk headers look like: `@@ -old_start,old_count +new_start,new_count @@`

Count lines from `new_start` within each hunk (skipping lines starting with `-`) to determine
the correct `line` value for each comment. The `line` parameter refers to the line number in the
file after the PR's changes are applied.

#### Submitting the review

Submit all accumulated comments as a single review using `gh api`:

```bash
gh api repos/{owner}/{repo}/pulls/{pr_number}/reviews \
  --method POST \
  -f event="APPROVE" \
  -f body="Overall review summary" \
  --input comments.json
```

Where `comments.json` contains:

```json
{
  "event": "APPROVE",
  "body": "Overall review summary",
  "comments": [
    {"path": "src/file.ts", "line": 42, "body": "Comment text"},
    {"path": "src/other.ts", "line": 10, "body": "Another comment"}
  ]
}
```

The `event` field maps to the user's choice in Step 6:
- Approve → `"APPROVE"` (include `:shipit:` emoji in the review body)
- Request changes → `"REQUEST_CHANGES"`
- Comment → `"COMMENT"`

For cross-repo PRs, always include `--repo owner/repo` or use the full API path.

## Review Workflow

When performing a code review on a GitHub pull request, follow this human-in-the-loop workflow.
Do not batch comments or submit them all at once. Each finding is reviewed individually with the
user before anything is posted to GitHub.

### Step 0: Validate tools

Before starting the review, verify that the required CLI tools are installed and authenticated.

1. **Always**: Run `gh auth status` to confirm the GitHub CLI is installed and authenticated.
   If it fails, stop and ask the user to install (`brew install gh`) and authenticate (`gh auth login`).
2. **If a Jira issue is referenced or provided**: Run `acli jira --action getServerInfo` to confirm
   the Atlassian CLI is installed and authenticated. If it fails, stop and tell the user — but only
   if Jira context is actually needed. Do not validate `acli` when no Jira issue is involved.

### Step 1: Gather context

- Use `gh pr view <number> --json title,body,baseRefName,headRefName` to fetch PR metadata.
- Use `gh pr diff <number>` to fetch the full diff.
- If a GitHub issue is referenced anywhere in the PR (title, body, or branch name — e.g., `#123`),
  use `gh issue view <number>` to fetch the issue title, body, and labels. Use this context to
  understand what the PR is trying to accomplish and evaluate whether the changes address the
  issue's requirements. If the PR uses closing language (e.g., `Fixes #123`, `Closes #123`,
  `Resolves #123`), all requirements in the issue must be satisfied or explicitly documented as
  not needing changes — unaddressed items are blocking. If the PR indicates a partial fix
  (e.g., "partially addresses #123"), note remaining gaps as non-blocking findings so the work
  can be tracked separately.
- If a Jira issue is referenced anywhere in the PR (title, body, or branch name — e.g., `PROJ-123`),
  or if the user provides one, use `acli jira --action getIssue --issue <key>` to fetch the
  user story, description, and acceptance criteria. Use this context to understand what the PR
  is trying to accomplish and evaluate whether the changes address the stated requirements.
  Apply the same blocking/non-blocking criteria: if the PR claims to fully resolve the issue,
  all acceptance criteria must be met; if it's a partial fix, note gaps as non-blocking.
- Review the changes against the full Review Checklist above.
- Compile an internal list of findings, but do not present them yet.

### Step 2: Check CI/CD status

Verify that all CI/CD checks are passing on the PR.

1. Run `gh pr checks <number>` to list all status checks and their results.
2. If all checks pass, note this and proceed to the next step.
3. If any checks are failing:
   - For each failing check, retrieve the run logs using `gh run view <run_id> --log-failed` to get the relevant failure output.
   - If `--log-failed` produces no output (e.g., for non-GitHub-Actions checks), try `gh run view <run_id> --log` and look for error patterns.
   - Analyze the logs to identify the root cause — don't just report "build failed." Determine whether it's a compilation error, test failure, linting violation, dependency issue, timeout, etc.
   - For test failures: identify the specific test(s) failing and the assertion or error message.
   - For build failures: identify the file and error (e.g., type error, missing import, syntax error).
   - For linting/formatting: identify the rule violation and location.
   - Record each failing check as a **blocking** finding with:
     - The check name
     - Root cause analysis from the logs
     - Specific file/line if identifiable from the error output
     - A suggested fix if the cause is clear from the logs

These CI/CD findings will be presented to the user alongside code review findings in Step 4.

### Step 3: Summarize the issue and PR

Before presenting any findings, provide a brief summary to orient the user:

1. **Issue summary**: What problem is being solved? Summarize the linked issue (GitHub or Jira) in 2–3 sentences — the problem, the proposed fix, and any key acceptance criteria.
2. **PR approach**: How does this PR address it? Summarize the implementation approach and scope of changes in 2–3 sentences.

Present this summary and then proceed to findings.

### Step 4: Present findings one at a time

For each finding, present the following to the user:

- **File and line**: Where the issue is
- **Severity**: nit, suggestion, or blocking
- **Category**: Which checklist area it falls under (correctness, performance, security, etc.)
- **Finding**: A clear description of the problem
- **Suggested comment**: The single best recommendation. Commit to one clear action — do not
  present multiple options joined by "or" / "alternatively" / "either...or". This is the exact
  text that would be posted as a review comment if the user chooses "Post".
- **Alternate suggestions** (optional): If other viable approaches exist, list them here as
  brief bullet points. These are shown only to help the user decide whether to edit the
  suggested comment — they are never included in the GitHub comment.

Then ask the user for a decision:

- **Post**: Add the suggested comment to the pending review (accumulate internally — do NOT post to GitHub yet)
- **Skip**: Discard this finding and move on
- **Edit**: Let the user revise the comment text before posting (they may incorporate an alternate suggestion)

Wait for the user's response before moving to the next finding. Do not present the next finding
until the current one is resolved.

### Step 5: Repeat until all findings are reviewed

Continue through each finding one at a time. After the last finding, summarize what was posted
and what was skipped.

### Step 6: Submit the review

Once all findings have been reviewed, ask the user for the overall review action:

- **Approve**: Approve the PR (with any posted comments as minor notes)
- **Request changes**: Request changes on the PR
- **Comment**: Submit comments without an explicit approval or rejection

Only submit the review to GitHub after the user confirms the action. Use the `gh api` batch
submission method described in the Tools section above. All accumulated comments are submitted
as a single review with inline line references — never as individual top-level comments.

## References

- #[[file:code-review-guidelines.md]]
