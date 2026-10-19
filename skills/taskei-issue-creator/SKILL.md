---
name: taskei-issue-creator
description: >-
  Create and update Taskei tasks (SIM issues) using the builder-mcp Taskei tools.
  Use when asked to "create a Taskei task", "create a Taskei story", "draft a
  Taskei issue", "file a task in Taskei", "add a story to Taskei", "create a SIM
  issue", "update Taskei task TASK-N", or when the user mentions Taskei task or
  story creation, a Taskei room/sprint, or issue updates in Taskei/SIM.
  Guides through interactive requirements gathering, generates professional task
  content with acceptance criteria, and creates/updates tasks via the credentialed
  TaskeiCreateTask / TaskeiUpdateTask tools.
---

<!--
Companion to the github-issue-creator skill by Joe Brinkman.
Mirrors that skill's interactive flow, but writes to Taskei (SIM) through the
credentialed builder-mcp tools instead of the GitHub CLI.
-->

# Taskei Issue Creator

Create and update Taskei tasks (also called SIM issues) using the credentialed
builder-mcp Taskei tools. This skill guides you through an interactive workflow:
gather requirements, generate professional task content, review it, and create
or update the task in Taskei.

Taskei writes run **on the user's behalf** through MCP — there is no CLI and no
`~/.midway/cookie` handoff. Use these tools and only these tools for the write:

- `TaskeiGetRooms` — list the user's writable rooms (resolve a room name to its UUID).
- `TaskeiGetRoomResources` — fetch a room's `Labels`, `Sprints`, `KanbanBoards`,
  `WorkflowSteps`, `Folders`, and `CustomAttributes` (resolve names to UUIDs).
- `TaskeiListTasks` — look up existing tasks (used in update mode and for context).
- `TaskeiCreateTask` — create a new task.
- `TaskeiUpdateTask` — update an existing task.

## Step 1: Verify Prerequisites

Before doing anything else, confirm the environment is ready.

### 1a. Confirm Taskei access

Call `TaskeiGetRooms` (optionally with `nameContains` once the target room is
known) to confirm the Taskei tools are reachable and the user has writable rooms.

**If it returns one or more rooms**: continue to 1b.

**If it returns no rooms or errors**:

1. Tell the user that no writable Taskei rooms were found, or that the Taskei
   tools are not reachable.
2. Ask them to confirm their Taskei/Midway access and the room they expect to
   write to.
3. **Stop the workflow.** Do not proceed until access is confirmed and you
   re-verify with `TaskeiGetRooms`.

### 1b. Resolve the target room

Once you know the target room (from the user's request or from Step 2):

1. Match it against the `TaskeiGetRooms` results to get the room **UUID**. Prefer
   an exact name match; if `nameContains` returns several candidates, present them
   and ask the user to pick one.
2. Record the resolved `roomId` (UUID) for use in the create/update call.

**If the room cannot be resolved**:

1. Tell the user the room was not found among their writable rooms.
2. Ask them to verify the room name.
3. **Stop the workflow.** Do not proceed until the room is confirmed.

> **Guard — do not bulk-load a `<team>: Tickets` room.** A room named
> `<team>: Tickets` is usually a resolver group's live SIM-T customer-ticket
> intake queue, not a planning room. Writing planning tasks there trips SLA /
> auto-SIM bots and pollutes ticket metrics. If the resolved room name ends in
> `: Tickets`, warn the user and confirm the target is really a planning room
> before writing.

## Step 2: Determine Workflow Mode

Determine whether this is a **create** or **update** operation.

### Update mode

If the user references an existing task (e.g., "update TASK-123", "edit that
story", or a Taskei task URL/UUID):

1. Fetch the existing task with `TaskeiListTasks` (filter by name/room) or by the
   task ID the user supplied, to read its current title, description, type,
   priority, labels, sprints, and assignee.
2. Treat the existing task content as the template.
3. Skip the standard information-gathering questions in Step 3.
4. Ask only clarifying questions needed to resolve ambiguity in the update request.
5. Proceed to Step 5 (Review) with the proposed changes shown as a diff against
   the current content.

### Create mode

Proceed to Step 3 for full information gathering.

## Step 3: Gather Information

Collect requirements to build the task. The questions you ask depend on whether
the user provided a template, guidelines, or neither.

### 3a. Check for user-provided structure

Ask: *"Do you have a template or guidelines for how this task should be
structured? This can be a URL to a template file (e.g. a one-pager or design
doc), or you can describe the structure/sections you want. Otherwise I'll use a
standard format with user story, overview, and acceptance criteria."*

- **If the user provides a URL**: fetch it and use that structure to drive the
  remaining questions.
- **If the user provides inline guidelines**: use those to determine what sections
  and information are needed, then ask questions to fill them in.
- **If the user says no or uses the default**: proceed with the standard questions
  below.

### 3b. Standard information gathering

Ask questions **one at a time**. Wait for each answer before asking the next.
Adapt questions based on what the user already provided in their initial prompt —
acknowledge extracted information but still confirm.

1. **Room** — If not already resolved in Step 1b, ask:
   *"Which Taskei room should this task be created in? (room name — I'll resolve
   it to the room UUID)"*

2. **Task type** — Ask:
   *"What type of task is this? (GOAL, INITIATIVE, EPIC, STORY, TASK, SUBTASK, or
   BUG — default: STORY)"*

3. **User Story / Problem Statement** — Ask:
   *"Describe what you need. You can use a user story format ('As a [role], I want
   [action], so that [benefit]') or simply describe the problem you want to solve."*

4. **Reference URLs** — Ask:
   *"Are there reference links I should review for context? These could be design
   docs (Quip/Wiki), one-pagers, related tasks, or examples. (provide URLs with
   brief labels, or 'none')"*

5. **Technical constraints** — Ask:
   *"Are there specific technical constraints or requirements I should know about?
   (e.g., must use a specific API, backward compatibility needs, performance
   requirements, or 'none')"*

6. **Additional context** — Ask:
   *"Any other context I should factor in? (e.g., related tasks, deadlines,
   non-functional requirements, or 'none')"*

7. **Priority** — Ask:
   *"What priority? (High, Medium, Low, or 'none')"*

8. **Labels** — Ask:
   *"Any labels to apply? (comma-separated label names — I'll resolve them to
   label UUIDs for the room, or 'none')"*

9. **Sprint** — Ask:
   *"Should this go in a sprint? (sprint name — I'll resolve it to the sprint
   UUID, or 'none')"*

10. **Assignee** — Ask:
    *"Any assignee? (Amazon username without the @ANT.AMAZON.COM suffix, 'me' for
    yourself, or 'none')"*

11. **Estimate / Need-by date** — Ask:
    *"An effort estimate (points) or a need-by date? (provide either, or 'none')"*

### 3c. Template-driven information gathering

When the user provides a template or guidelines, derive your questions from the
required sections. For each section or field in the template:

1. Check if the user already provided the information.
2. If not, ask a focused question to gather what's needed.
3. Adapt your language to match the template's terminology.

### Checkpoint

After all questions are answered, present a brief summary:

```text
Here's what I have:
- Room: [room name] ([roomId])
- Type: [task type]
- Problem/Story: [brief summary]
- References: [URLs or none]
- Constraints: [value or none]
- Additional context: [value or none]
- Priority: [value or none]
- Labels: [values or none]
- Sprint: [value or none]
- Assignee: [value or none]
- Estimate / Need-by: [value or none]

Does this look complete, or would you like to add or change anything?
```

**Do NOT proceed to Step 4 until the user confirms.**

## Step 4: Analyze Content

1. Fetch **ALL** URLs provided by the user. For each URL:
   - Fetch to extract content (use the appropriate internal-website reader for
     amazon.com / amazon.dev / quip / wiki links).
   - Extract relevant context, technical details, and examples the user wants to
     reference or emulate.

2. Resolve names to UUIDs for the target room using `TaskeiGetRoomResources`:
   - **Labels** → match each requested label name to its UUID.
   - **Sprints** → match the requested sprint name to its UUID.
   - If a requested label or sprint does not exist in the room, tell the user and
     ask whether to drop it or pick an existing one. Do not invent UUIDs.

3. If the fetched content reveals ambiguity or raises new questions, ask the user
   for clarification BEFORE proceeding to Step 5.

4. Synthesize findings into a coherent understanding of what the task needs to
   communicate.

## Step 5: Generate the Task

Compose the task using either the user's template/guidelines or the default
structure below.

### Default structure

#### Name (title)

- Short, action-oriented, under 12 words.
- Examples: "Add API rate limiting to REST endpoints", "Fix memory leak in
  WebSocket handler"

#### Description

Taskei descriptions accept Markdown. Structure with these sections:

- **User Story** (if applicable): `As a [role], I want [action] so that [benefit]`
- **Overview**: Brief background (2-3 sentences)
- **Problem/Need**: What challenge this addresses (2-3 sentences)
- **Proposed Solution**: How this could be solved (3-4 sentences)
- **Value/Impact**: Expected benefits (2-3 sentences)
- **Acceptance Criteria**: 3-5 specific, testable criteria as a Markdown task list
- **References**: Links with descriptive labels

Format acceptance criteria as Markdown task lists:

```markdown
## Acceptance Criteria

- [ ] Criterion 1
- [ ] Criterion 2
- [ ] Criterion 3
```

### Custom template structure

When using a user-provided template or guidelines, follow their structure
exactly. Map the gathered information to the appropriate sections. If the template
has sections you lack information for, ask the user or mark them as TBD.

## Step 6: Review and Approve

Present the complete task to the user:

```text
Here's the proposed Taskei task:

**Room**: [room name] ([roomId])

**Type**: [task type]

**Name**: [title]

**Description**:
[full markdown description]

**Priority**: [priority or none]
**Labels**: [labels (names) or none]
**Sprint**: [sprint name or none]
**Assignee**: [assignee or none]
**Estimate / Need-by**: [value or none]

Please review and let me know if you'd like any changes, or approve to create.
```

Wait for explicit approval before proceeding. If the user requests changes, revise
and present again.

## Step 7: Create or Update the Task

### Create a new task

Call `TaskeiCreateTask` with the resolved values:

- `name` — the title.
- `description` — the full Markdown description.
- `roomId` — the resolved room UUID (required).
- `type` — the task type (default STORY). Pass the type the user named, or the
  Step 3 default of STORY, as one of GOAL / INITIATIVE / EPIC / STORY / TASK /
  SUBTASK / BUG. Always pass a `type` on a create: a planning task is a STORY
  unless the user said otherwise.
- `priority` — High / Medium / Low, if provided.
- `labels` — array of label UUIDs resolved from `TaskeiGetRoomResources`, if any.
- `sprints` — array of sprint UUIDs, if any.
- `assignee` — the username (send `"currentUser"` when the user asked for
  themselves), if any.
- `estimate` — effort in points, if provided.
- `needByDate` — ISO datetime, if provided.

### Update an existing task

Call `TaskeiUpdateTask` with the task `id` and only the fields that change:

- `name`, `description`, `type`, `priority`, `assignee`, `estimate`, `needByDate`.
- `addLabels` / `removeLabels` — label UUID arrays.
- `addSprints` / `removeSprints` — sprint UUID arrays.
- `status` — Open / Closed, if the user asked to open or close the task.
- `postCommentMessage` — add an update comment (Markdown) when appropriate.

### Handle errors gracefully

| Error | Action |
|-------|--------|
| Room UUID not resolved | Re-run Step 1b; re-verify the room name with the user |
| Label name not in room | Re-fetch room Labels; drop or re-pick with the user, never invent a UUID |
| Sprint name not in room | Re-fetch room Sprints; drop or re-pick with the user, never invent a UUID |
| Invalid assignee | Omit the assignee and inform the user it was not set |
| Taskei tools unreachable | Re-run Step 1a |

When an optional field (label, sprint, assignee, estimate, need-by) cannot be set,
retry the create/update without that field rather than failing entirely, and inform
the user which fields could not be set.

### Confirm creation/update

Report the result from the tool response. Present:

```text
Task created successfully!
ID: [task id]
Room: [room name]
URL: https://taskei.amazon.dev/tasks/[task id]
```

Or for updates:

```text
Task updated successfully!
ID: [task id]
URL: https://taskei.amazon.dev/tasks/[task id]
```

## Quick Reference: Taskei tools

| Task | Tool |
|------|------|
| List writable rooms / resolve room UUID | `TaskeiGetRooms` (filter with `nameContains`) |
| Resolve label / sprint / folder UUIDs | `TaskeiGetRoomResources` (`Labels`, `Sprints`, `Folders`, ...) |
| Look up / read existing tasks | `TaskeiListTasks` |
| Create a task | `TaskeiCreateTask` |
| Update a task | `TaskeiUpdateTask` |
