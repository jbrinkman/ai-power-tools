# GitHub Issue Creator — Update Flow

You are continuing the `github-issue-creator` skill in **update mode**
(Steps 1-2, prerequisites and mode detection, are already complete, and the
existing issue has already been fetched via `gh issue view`). Follow the
steps below — do not use any of the standard create-mode information-gathering
questions (issue type, user story format, reference URLs, technical
constraints, labels, assignees, milestone); the existing issue content is
already the baseline for all of those fields.

## Step 3: Clarify the Requested Change

Treat the fetched issue content (title, body, labels, assignees, milestone) as
the current baseline / template.

Ask only clarifying questions needed to resolve ambiguity in the substance of
the user's update request itself (e.g., "What are the new rate limiting
requirements?", "Which endpoints does this affect?"). **Do NOT ask the
standard Step 3 questions from create mode**, including but not limited to:
"Are there any reference URLs/links?", "What type of issue is this?", "Any
labels/assignees/milestone?". Carry references, labels, assignees, and
milestone over **unchanged** from the existing issue unless the user's
request explicitly says they need to change.

It is also acceptable to ask no questions at all and proceed directly to
drafting proposed changes, if the user's request already contains enough
detail to do so.

## Step 4: Analyze Content (only if the user provided URLs)

If — and only if — the user's update request includes reference URLs:

1. Fetch each URL using web_fetch to extract content.
2. Extract relevant technical details or context needed for the update.
3. If the fetched content reveals ambiguity, ask the user for clarification
   before proceeding to Step 5.

Otherwise, skip straight to Step 5.

## Step 5: Draft the Updated Content

Based on the existing issue content and the user's requested change, draft
the updated title/body/labels/assignees/milestone. Only change what the
user's request actually implies should change — leave everything else
identical to the existing issue.

## Step 6: Review and Approve

Present the proposed changes as a **diff against the current issue
content** — not just the final version. For each changed field, show what
is being removed and what is being added; call out unchanged fields
briefly instead of repeating them in full:

```text
Here's the proposed update to issue #[number]:

**Title**:
- (unchanged) [current title]
  -- or, if changed --
- ~~[old title]~~ → **[new title]**

**Body changes**:
~~[old text being removed]~~
**[new text being added]**
(repeat for each changed section; note unchanged sections as "(unchanged)")

**Labels**: ~~[old]~~ → [new], or "(unchanged) [current labels or none]"
**Assignees**: (unchanged) [current assignees or none]
**Milestone**: (unchanged) [current milestone or none]

Please review and let me know if you'd like any changes, or approve to update.
```

Wait for explicit approval before proceeding. If the user requests changes,
revise and present again.

## Step 7: Update the Issue

Build and execute the `gh issue edit` command:

```bash
gh issue edit <number> \
  --repo "<owner/repo>" \
  --title "<new title>" \
  --body "<new body>" \
  [--add-label "<label>"] \
  [--add-assignee "<user>"] \
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

### Confirm update

Parse the output to extract the issue URL. Present:

```text
Issue updated successfully!
Number: #[number]
URL: [full URL]
```

## Quick Reference: Useful gh Commands

| Task | Command |
|------|---------|
| Check auth | `gh auth status` |
| View repo | `gh repo view owner/repo` |
| View issue | `gh issue view N --repo owner/repo` |
| Edit issue | `gh issue edit N --repo owner/repo --title "..." --body "..."` |
| List labels | `gh label list --repo owner/repo` |
| List milestones | `gh api repos/owner/repo/milestones --jq '.[].title'` |
