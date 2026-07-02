---
name: add-status-label
description: >
  Add a new status label to a task in a status report. Use when asked to
  add status, update status, change status, set status, mark as, or add label
  for a task. Supports statuses: Not Started, In Progress, In Review, Submitted,
  Done, Blocked, Paused.
---

Add a new status label to an existing task line in a status report markdown file.

## Available Statuses

| Status | Span Class | Label |
|--------|-----------|-------|
| Not Started | `gray` | Not Started |
| In Progress | `green` | In Progress |
| In Review | `green` | In Review |
| Submitted | `green` | Submitted |
| Done | `green` | Done |
| Awaiting Merge | `green` | Awaiting Merge |
| Merged | `green` | Merged |
| Blocked | `red` | Blocked |
| Paused | `red` | Paused |
| Closed | `gray` | Closed |
| Not a Bug | `gray` | Not a Bug |

## Step 1: Identify the Task and Status

1. Determine which task the user wants to update. The user will reference a task by its name or description.
2. Determine which status to add. Match the user's request to one of the available statuses above.
3. Identify which status report file to modify. If not specified, use the most recent report in the latest year directory.

## Step 2: Locate the Task Line

1. Read the target status report file.
2. Find the task line that matches the user's description. Task lines are markdown list items (`-`) that contain `<span>` status labels.
3. If the task cannot be found, inform the user and list similar task names.

## Step 3: Add the New Status Label

Construct the new `<span>` element for the requested status using the class and label from the table above:

```
<span class="CLASS">LABEL</span>
```

Insert the new status after the last existing `<span>...</span>` status label on the task line, separated by ` &rarr; `:

- Find the last `</span>` on the line that is part of a status label.
- Insert `&rarr; <span class="CLASS">LABEL</span>` immediately after that `</span>`.
- Any text that follows the last status span (explanations, links, dates, etc.) must remain after the newly inserted status.

Example transformation:

Before:

```
- `FT.ALIASADD` Command - <span class="green">Not Started</span> Some explanation here.
```

After adding "In Progress":

```
- **New** `FT.ALIASADD` Command - <span class="green">Not Started</span> &rarr; <span class="green">In Progress</span> Some explanation here.
```

## Step 4: Add the New Marker

Add `**New**` at the beginning of the task text, after the markdown list marker (`-`) and any indentation:

- If the line starts with `-`, insert `**New**` right after `-`.
- If the line starts with ` - ` (indented), insert `**New**` right after ` - `.
- If `**New**` already exists on the line, do not add a duplicate.

## Step 5: Write the Changes

1. Apply the edit to the file using a precise string replacement.
2. Confirm the change to the user by showing the before and after lines.

## Important Rules

- Never remove or modify existing status labels on the line.
- The `&rarr;` separator and new status must be inserted before any trailing explanation text.
- Preserve all other content on the line exactly as-is (links, dates, descriptions).
- Only modify the single task line identified. Do not change any other lines.
