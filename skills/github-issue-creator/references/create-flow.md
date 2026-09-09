# GitHub Issue Creator — Create Flow

You are continuing the `github-issue-creator` skill in **create mode**
(Steps 1-2, prerequisites and mode detection, are already complete). Follow
the steps below to gather requirements, draft the issue, and create it.

## Step 3: Gather Information

Collect requirements to build the issue. The questions you ask depend on whether
the user provided a template, guidelines, or neither.

### 3a. Check for user-provided structure

Ask: *"Do you have a template or guidelines for how this issue should be
structured? This can be a URL to a template file, or you can describe the
structure/sections you want. Otherwise I'll use a standard format with user
story, overview, and acceptance criteria."*

- **If the user provides a URL**: fetch it and use that structure to drive
  the remaining questions.
- **If the user provides inline guidelines**: use those to determine what
  sections and information are needed, then ask questions to fill them in.
- **If the user says no or uses the default**: proceed with the standard
  questions below.

### 3b. Standard information gathering

Ask questions **one at a time**. Wait for each answer before asking the next.
Adapt questions based on what the user already provided in their initial prompt —
acknowledge extracted information but still confirm.

**Do not invent or assume answers ("reasonable defaults") for information the
user has not provided**, even if you believe you can proceed without asking.
If a question genuinely cannot be answered by the user in this context, ask it
anyway and explicitly note that you are proceeding with an unconfirmed default,
rather than silently fabricating a value and skipping the question.

1. **Repository** — If not already known, ask:
   *"What repository should this issue be created in? (e.g., owner/repo)"*

2. **Issue type** — Ask:
   *"What type of issue is this? (Feature request, Bug report, Task,
   Documentation, or describe your own — default: Feature request)"*

3. **User Story / Problem Statement** — Ask:
   *"Describe what you need. You can use a user story format ('As a [role],
   I want [action], so that [benefit]') or simply describe the problem you
   want to solve."*

4. **Reference URLs** — Ask:
   *"Are there reference links I should review for context? These could be
   documentation, examples of how other projects solve this, related
   discussions, or design specs. (provide URLs with brief labels, or 'none')"*

5. **Technical constraints** — Ask:
   *"Are there specific technical constraints or requirements I should know
   about? (e.g., must use a specific API, backward compatibility needs,
   performance requirements, or 'none')"*

6. **Additional context** — Ask:
   *"Any other context I should factor in? (e.g., related issues, deadlines,
   non-functional requirements, or 'none')"*

7. **Labels** — Ask:
   *"Any labels to apply? (comma-separated, or 'none' — note: you need
   appropriate permissions for this)"*

8. **Assignees** — Ask:
   *"Any assignees? (comma-separated GitHub usernames, or 'none' — note:
   you need appropriate permissions for this)"*

9. **Milestone** — Ask:
   *"Should this be added to a milestone? (milestone name, or 'none')"*

### 3c. Template-driven information gathering

When the user provides a template or guidelines, derive your questions from
the required sections. For each section or field in the template:

1. Check if the user already provided the information.
2. If not, ask a focused question to gather what's needed.
3. Adapt your language to match the template's terminology.

### Checkpoint

After all questions are answered, present a brief summary:

```text
Here's what I have:
- Repository: [owner/repo]
- Type: [issue type]
- Problem/Story: [brief summary]
- References: [URLs or none]
- Constraints: [value or none]
- Additional context: [value or none]
- Labels: [values or none]
- Assignees: [values or none]
- Milestone: [value or none]

Does this look complete, or would you like to add or change anything?
```

**Do NOT proceed to Step 4 until the user confirms.**

## Step 4: Analyze Content

1. Fetch **ALL** URLs provided by the user. For each URL:
   - Fetch using web_fetch to extract content
   - For GitHub URLs, use the raw content when possible

2. For each fetched page, extract:
   - Relevant context for the issue being created
   - Technical details, architecture, or API information
   - Examples or patterns the user wants to reference or emulate

3. If the fetched content reveals ambiguity or raises new questions, ask the
   user for clarification BEFORE proceeding to Step 5.

4. Synthesize findings into a coherent understanding of what the issue needs
   to communicate.

5. **Preserve every URL exactly.** Keep a complete list of every URL the user
   provided. Every one of them MUST appear verbatim in the References section
   of the generated issue. Do not omit, summarize, or paraphrase any URL.

## Step 5: Generate the Issue

Compose the issue using either the user's template/guidelines or the default
structure below.

### Default structure

#### Title

- Short, action-oriented, under 12 words.
- Examples: "Add API rate limiting to REST endpoints", "Fix memory leak in
  WebSocket handler"

#### Body

Structure with these sections:

- **User Story** (if applicable): `As a [role], I want [action] so that [benefit]`
- **Overview**: Brief background (2-3 sentences)
- **Problem/Need**: What challenge this addresses (2-3 sentences)
- **Proposed Solution**: How this could be solved (3-4 sentences)
- **Value/Impact**: Expected benefits (2-3 sentences)
- **Acceptance Criteria**: 3-5 specific, testable criteria as a task list
- **References**: Every URL the user provided, listed verbatim with descriptive
  labels. **Do not omit any URL.** If the user provided multiple links, every
  one must appear here exactly as given.

Format acceptance criteria as GitHub task lists:

```markdown
## Acceptance Criteria

- [ ] Criterion 1
- [ ] Criterion 2
- [ ] Criterion 3
```

### Custom template structure

When using a user-provided template or guidelines, follow their structure
exactly. Map the gathered information to the appropriate sections. If the
template has sections you lack information for, ask the user or mark them
as TBD.

## Step 6: Review and Approve

Present the complete issue to the user:

```text
Here's the proposed GitHub issue:

**Repository**: [owner/repo]

**Title**: [title]

**Body**:
[full markdown body]

**Labels**: [labels or none]
**Assignees**: [assignees or none]
**Milestone**: [milestone or none]

Please review and let me know if you'd like any changes, or approve to create.
```

Wait for explicit approval before proceeding. If the user requests changes,
revise and present again.

## Step 7: Create the Issue

Build and execute the `gh issue create` command:

```bash
gh issue create \
  --repo "<owner/repo>" \
  --title "<title>" \
  --body "<body>" \
  [--label "<label1>" --label "<label2>"] \
  [--assignee "<user1>" --assignee "<user2>"] \
  [--milestone "<milestone>"]
```

### Handle errors gracefully

| Error | Action |
|-------|--------|
| Permission denied on labels | Skip labels, inform user they were not applied |
| Permission denied on assignees | Skip assignees, inform user they were not applied |
| Permission denied on milestone | Skip milestone, inform user it was not applied |
| Repository not found | Re-verify repo name with user |
| Authentication expired | Re-run Step 1 |
| Network error | Retry once, then inform user |

When a permission error occurs for optional fields (labels, assignees,
milestone), retry the command without those fields rather than failing entirely.
Inform the user which fields could not be set.

### Confirm creation

Parse the output to extract the issue URL. Present:

```text
Issue created successfully!
Number: #[number]
URL: [full URL]
```

## Quick Reference: Useful gh Commands

| Task | Command |
|------|---------|
| Check auth | `gh auth status` |
| View repo | `gh repo view owner/repo` |
| Create issue | `gh issue create --repo owner/repo --title "..." --body "..."` |
| List issues | `gh issue list --repo owner/repo` |
| List labels | `gh label list --repo owner/repo` |
| List milestones | `gh api repos/owner/repo/milestones --jq '.[].title'` |
| Search issues | `gh issue list --repo owner/repo --search "query"` |
