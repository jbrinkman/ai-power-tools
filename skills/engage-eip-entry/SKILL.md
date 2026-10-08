---
name: engage-eip-entry
description: >-
  Log a user's EIP (Engagement, Involvement & Participation) activities into
  Improving's Engage portal (engage.improving.com, Involvement tab) from a calendar
  or activity spreadsheet. STRONGLY PREFER this skill whenever the user wants to
  record, log, submit, enter, or bulk-add their involvement activities, EIP points,
  or calendar events into Engage, OR to map/classify spreadsheet rows into Engage
  activity Categories and Types — even when they do not say "skill" and even when
  they only describe the outcome (e.g. "get my involvement hours into engage",
  "enter my Q3 EIP points from this calendar export", "register each entry in the
  portal", "put these meetings in the involvement tab", "classify my EIP calendar
  into the right categories"). Each spreadsheet row becomes one Engage activity
  filed under the reporting period matching its date; runs in two phases —
  (1) classify rows into Category + Type + Quantity in a reviewable worksheet,
  (2) drive the Engage "Add Activity" form with Playwright to enter each confirmed
  row. Do NOT trigger for: summarizing or reading a calendar, entering data into
  OTHER systems (Jira, Concur, timesheets, Google Forms), merely reading Engage
  (e.g. leaderboard standings), generic spreadsheet edits unrelated to Engage, or
  writing prose about one's involvement.
---

# Engage EIP Entry

Turn a spreadsheet of calendar/involvement events into Engage EIP activity entries.

The work splits into two phases on purpose. Classification needs human judgement
(the same event subject can map to different Categories/Types and point values
depending on whether you attended, presented, or led). Data entry is mechanical
but must land each row under the right reporting period. Keeping them separate
means the user reviews and fixes the mapping ONCE, in a worksheet, before any
irreversible writes happen in the portal.

**Never drop rows.** The input spreadsheet is already the eligible set — the user
filtered it when they created it. Every row must be mapped and entered. When a row
is ambiguous, surface it for review; do not silently skip or omit it.

## Prerequisites

- The user must be logged in to https://engage.improving.com in the browser you
  drive (SSO + MFA — the user does this themselves; do not attempt their login).
- Interactive browsing must be authorized for this session (the message carries
  `[BROWSE]`). Without it you can still run Phase 1 (classification is offline).
- Python with `openpyxl` for reading `.xlsx`.

## Reference files (bundled — do not re-scrape)

Read these instead of re-deriving them from the live site:

- `references/category-type-map.json` — every Engage Activity **Category** → the
  valid **Types** under it. The Type dropdown is dependent: a Type is only valid
  under its parent Category. Use this to validate any proposed mapping.
- `references/catalog.json` — the full Catalog: each Type with its **Description**,
  **Point value**, and **Guidance**. This is the rubric for classification — read a
  Type's Description/Guidance to decide whether an event fits it, and to decide the
  quantity convention (hours vs per-occurrence count).
- `references/type-reference.json` — flattened `{category, type, points,
  quantity_convention, description, guidance}` per Type, for quick lookup.

These reflect the Catalog as of client v10.5.0 (2026). If the portal's categories
or point values look different, re-scrape the Catalog tab (see "Re-scraping" below)
and refresh these files.

---

## Phase 1 — Classify

Goal: add a **`Classification` sheet** into the same `.xlsx` workbook, with one
row per spreadsheet row, each carrying a best-guess `category`, `type`,
`quantity`, a `confidence`, a `needs_review` flag, and a `reason`. Keeping the
classification in the same file keeps all the data together. The user edits the
`Classification` sheet in place; only rows with `status=confirmed` proceed to
Phase 2.

### Steps

1. **Read the spreadsheet.** Identify the data sheet (commonly `EIP Entries`) and
   its columns (Subject, Start/Date, Duration). The header row may not be row 1.

2. **Generate the Classification sheet** with the bundled helper:

   ```bash
   cd <skill-dir>
   python3 scripts/build_worksheet.py <workbook.xlsx> --source-sheet "EIP Entries"
   ```

   This edits the workbook IN PLACE, adding (or replacing, on re-run) a
   `Classification` sheet and leaving the source data sheet untouched. Pass
   `--out <other.xlsx>` to write a copy instead. The helper applies a conservative
   keyword rule table (subject → Category/Type/quantity mode). Confident matches are
   written `status=confirmed, needs_review=no`. Everything else — especially internal
   recurring meetings (huddles, 1:1s, syncs, exec meetings) whose EIP eligibility and
   type only the user knows — is written with a best guess (or blank), highlighted
   amber, and `needs_review=yes` plus a `reason`. The `status` column has a dropdown
   (needs-review / confirmed / skip).

3. **Derive reporting period** from each row's date: `YYYY-Qn` where
   Jan–Mar→Q1, Apr–Jun→Q2, Jul–Sep→Q3, Oct–Dec→Q4. The helper does this.

4. **Quantity convention** (per Type, from the catalog). The Quantity field is
   **integer-only** — it does not accept decimals, so hours are rounded to the
   nearest whole number (min 1).
   - *hours-based* Types (ImprovingU delivery/attendance/prep, billable weeks) →
     quantity = round(event duration in hours). A 1.5h session becomes 2. State the
     raw duration in the sheet (`duration_hours` column) so the user can override
     (e.g. force 1) during review.
   - *count-based* Types (attendance, meeting, per-occurrence) → quantity = 1.
   - *tier/count* Types (contracts, certifications) → not applicable to calendar
     events; leave for manual entry if they ever appear.

5. **Ask the user about genuinely uncertain rows.** For clusters the rules cannot
   confidently map (the `needs_review=yes, category=""` rows), do NOT guess. Either
   leave them blank in the worksheet with a clear `reason`, or — if a whole cluster
   is unclear and blocks progress — ask the user directly (one question per cluster,
   referencing the catalog Types that could apply). Respect: "if you are uncertain,
   ask me."

6. **Hand the Classification sheet to the user to review.** Tell them to open the
   `Classification` sheet in the workbook and:
   - Fix any `category`/`type` (must be a valid pair per `category-type-map.json`).
   - Adjust `quantity` and `notes` as desired (notes default to the event subject).
   - Set `status` to `confirmed` for every row they want entered. (All rows should
     end up confirmed — nothing is dropped — but the user may want to correct a
     mapping first.)
   Wait for them to say the sheet is ready before Phase 2.

### Validate the edited sheet

Before Phase 2, re-read the `Classification` sheet and check every row:
- `category` + `type` is a valid pair in `category-type-map.json` (reject typos).
- `quantity` is a positive number.
- `reporting_period` matches `YYYY-Qn`.
- `date` is `MM/DD/YYYY`.
Report any invalid rows back to the user; do not enter them until fixed.

---

## Phase 2 — Enter into Engage

Goal: for each confirmed row in the `Classification` sheet, add the activity under
the correct reporting period via the Engage "Add Activity" form. Requires
`[BROWSE]` and a logged-in session.

### Form contract (confirmed live; selectors are stable)

Form URL: `https://engage.improving.com/app/main/involvement/activity`

| Field | Selector / handle | Notes |
|---|---|---|
| Reporting Period | `select[name="selectedTimePeriod"]` | **Select by option TEXT** (`YYYY-Qn`) — the option `value` is a numeric id. **No Filter-button click is needed** to make a new entry attach to the chosen period. **Changing the period CLEARS the Date field**, so set the period BEFORE the date. |
| Activity Category | `select[name="QuickAddActivityCategory"]` | Native select; setting it fires a change handler that repopulates Type. Changing category does NOT clear the date. |
| Activity Type | `select[name="QuickAddActivityDefinition"]` | Dependent — valid Types appear only after the Category change settles (~300ms). |
| Date | `input[name="Activity_OccuranceDate"]` | **Masked text input (MM/DD/YYYY).** See the critical note below. |
| Quantity | `input[name="Activity_Quantity"]` | Number, integer-only. |
| Notes | `textarea[name="Notes"]` | **Required** — the submit button stays disabled while Notes is empty. |
| Submit | `button` whose text matches `Add N points` | Points are computed by the portal (Type's catalog value × quantity); you only set Quantity. |

**After a successful submit, Category / Type / Date persist and only Notes clears** — so consecutive rows with the same category/type/date only need a new Notes + submit.

### ⚠️ The Date field — must use REAL keystrokes

The Date field is an ngx-mask text input. **Every JavaScript method of setting it fails** — assigning `.value`, dispatching `input`/`change`, or `document.execCommand('insertText')` all leave the field empty or collapse it to the 1st of the month, which silently enters the wrong date. The ONLY reliable method is real keyboard events:

1. Focus + clear it via evaluate: `el.focus(); el.select(); document.execCommand('delete')`.
2. Type with Playwright's real keystrokes: `locator('[name="Activity_OccuranceDate"]').pressSequentially('MM/DD/YYYY')`.
3. **Verify** the field reads back exactly the intended date before submitting.

A batch that set dates via JS injection corrupted ~57 entries (all collapsed to the month's 1st). Do not take the shortcut.

### Required extra fields per Category/Type (see `references/extra-fields-matrix.json`)

Most combos have no extra fields. The exceptions (all required):

| Category / Type | Extra field | How to set |
|---|---|---|
| Improving Cares / Community Service | **Organization URL** (text, no `name`) | Locate by label: xpath `//label[.="Organization URL"]/following::input[1]`; real-type the URL. |
| Networking / **Improving Event Attendance** | **Attendance Type** (Virtual / In Person) | select by label. NOTE: Networking/**Meeting** does NOT have this field. |
| Industry Contribution/Leadership / Presentation - Major | **Topic Area** (Technology/Business/Process/Management/UX / Design/Other) + **Attendance** (number) | select + number |
| Industry Contribution/Leadership / Presentation - User Group | same as above | |

The classification worksheet should carry an `org_url` column (and any other extra-field value) so these are known before entry. If a confirmed row needs an extra field whose value is missing, ask the user.

### Steps

1. **Confirm authorization and login.** Ensure `[BROWSE]`. Navigate to the form URL and snapshot. If it redirects to `/account/login`, stop and ask the user to log in (SSO/MFA is theirs) — do not attempt it.

2. **Set the Current Activities pager to a large page size** (its PrimeNG rows-per-page dropdown offers up to 500) so verification and dedup see every row, not just page 1.

3. **Dedup first.** Read the current period's Current Activities table and skip any confirmed row that already exists (match Category + Type + Date + Notes). Re-running must not create duplicates.

4. **Enter each confirmed row** (bundled runner: `scripts/enter_activities.js`, run via Playwright MCP `browser_run_code_unsafe` against the authenticated page — this is the ONLY way to get real keystrokes for the date across a large batch without hundreds of individual tool calls). Per row:
   1. Set Reporting Period (by text) if it changed — this clears the date.
   2. Set Category if changed; then Type (wait for repopulate).
   3. Set Quantity + Notes (native setters are fine for these).
   4. Set any required extra field (Organization URL, etc.) — real-type text fields.
   5. Clear + real-keystroke-type the Date; verify it reads back correctly and the period matches the date's quarter.
   6. Click "Add N points"; wait for the Total Points to increase (per-row success check).

5. **Final reconciliation.** Dump the full table and compare as a multiset against the confirmed worksheet (normalise whitespace in notes, and dates to M/D/YYYY). Report any extras (delete the surplus) or missing (re-enter). Delete a row via its red Delete button (`btn-danger`) → confirm the SweetAlert (`.swal2-confirm`, "Yes").

6. **Report** a summary: records entered, final Total Points, and the per-category breakdown.

### Driving the form reliably

- Prefer the stable `name=` selectors above. The reporting-period select is `selectedTimePeriod`; the Add Activity category/type are `QuickAddActivity*`. (The page also has list-filter selects `ActivityCategoryNameFilter` / `ActivityDefinitionNameFilter` and a pager dropdown — don't confuse them with the form's selects.)
- Element refs go stale after each period change / submit; re-query by `name` rather than reusing an old ref.
- `require`/filesystem are NOT available inside `browser_run_code_unsafe`; embed the row data inline in the script.

---

## Re-scraping the Catalog (if references go stale)

On the Involvement → Catalog tab, the table is a paginated PrimeNG datatable
(10/page). Page through with the `.p-paginator-next:not(.p-disabled)` control,
accumulating rows (Category, Name, Description, Point value, Guidance), and dedupe
by `Category|Name`. For the Category→Type map, on the Add Activity form iterate the
`QuickAddActivityCategory` options by index, dispatch `change`, wait ~350ms, and
read `QuickAddActivityDefinition` option **text** (not value) each time.

## Safety

- These writes affect the user's real EIP record. Default to fill-and-pause on the
  first entry of a run; never bulk-submit without the user having seen the pattern.
- Never drop rows. Never invent a Category/Type not in the reference files.
- Do not attempt the user's SSO login or touch credentials.
