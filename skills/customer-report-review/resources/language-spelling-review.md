# Language and Spelling Review Criteria

This file contains criteria for reviewing language quality, spelling, grammar, and consistent terminology in customer status reports.

## Spelling and Grammar

### Basic Checks
- **Check**: Run spell check on all report content
- **Check**: Verify proper grammar and sentence structure
- **Check**: Check for common typos and homophone errors (their/there/they're, its/it's, etc.)
- **Check**: Verify proper punctuation usage
- **Severity**: Warning for spelling, Info for minor grammar

### Technical Terms
- **Check**: Technical terms are spelled consistently throughout the report
- **Check**: Acronyms are defined on first use (if customer-facing)
- **Check**: Industry-standard terminology is used correctly
- **Severity**: Warning

## Overstated Completion and Accuracy

### Completion Language vs Actual Status

**What to check:**
- Words implying finality ("addressed", "completed", "resolved", "done", "finished")
- Check if the actual status contradicts the completion claim
- Look for qualifiers later in the text that undermine the claim

**Common patterns to flag:**
- ✗ "We have addressed the AppSec findings" followed by "pending verification"
  - Should be: "We have addressed the AppSec findings, which are now pending verification"
- ✗ "Issue resolved" when status is "In Review" or "Testing"
- ✗ "Feature completed" when work is still "pending approval" or "awaiting release"
- ✗ "All tasks done" but status span shows `<span class="green">In Progress</span>`

**What to flag:**
- Completion verbs ("addressed", "resolved", "completed") when status is still pending/in-progress (severity: warning)
- Executive summary claims that overstate the detailed status (severity: warning)
- Claims that omit critical qualifiers present in the details section (severity: warning)

**Suggested fix:**
- Add the qualifier upfront: "addressed and pending verification"
- Use accurate status: "in progress" instead of "completed"
- Match summary precision to detailed status

**Severity**: Warning (can mislead stakeholders about actual progress)

---

## Capitalization Consistency

### Company Names
Check for consistent capitalization of company names:

- **Improving** (not "improving" or "IMPROVING")
- **Bit Quill** (not "BitQuill" or "bit quill")
- Customer company names (verify against previous reports or external sources)

**Severity**: Warning

### Product and Project Names

For each product or project name mentioned:

1. **Identify all project/product references** in the report
2. **Check for inconsistent capitalization** across mentions
3. **Common patterns to check**:
   - AWS services: Amazon S3, Amazon EC2, AWS Lambda (not "aws lambda", "s3", "Ec2")
   - Microsoft products: Azure, Microsoft 365, SharePoint (not "azure", "sharepoint")
   - Google products: Google Cloud, BigQuery, Pub/Sub (not "google cloud", "bigquery")
   - Database names: PostgreSQL, MySQL, MongoDB (not "postgres", "Postgres", "mongo")
   - Programming languages: JavaScript, TypeScript, Python (not "Javascript", "javascript")

4. **Reference external sources if needed**:
   - Check official product documentation
   - Review previous reports for the same project
   - Search GitHub repositories if project-specific

5. **Flag inconsistencies**:
   ```
   Issue: Inconsistent capitalization of "TypeScript"
   Found: "typescript" (line 45), "Typescript" (line 67), "TypeScript" (line 89)
   Suggestion: Use "TypeScript" consistently throughout
   ```

**Severity**: Warning

### Proper Nouns
- **Check**: Customer names, team names, and people names are capitalized properly
- **Check**: Location names are capitalized correctly
- **Severity**: Warning

## Terminology Consistency

### Status Terminology
- **Check**: Status terms are used consistently (don't mix "On Track" with "on track" in prose)
- **Check**: When referring to statuses in text, use the same terminology as the status indicators
- **Severity**: Info

### Project-Specific Terms
- **Check**: Project-specific terms are used consistently throughout
- **Check**: Feature names and milestone names match across the report
- **Check**: No mixing of different names for the same feature/milestone
- **Severity**: Warning

### Date Format Consistency
- **Check**: Date formats are consistent within prose sections
- **Check**: When writing dates in sentences, use consistent format (e.g., "July 20, 2026" vs "20 July 2026")
- **Severity**: Info

## Professional Language

### Tone and Style
- **Check**: Report maintains professional business tone
- **Check**: No colloquialisms or slang
- **Check**: No overly casual language (e.g., "super easy", "pretty good")
- **Check**: No emotional or subjective language without business context
- **Severity**: Warning for unprofessional tone, Info for minor style issues

### Clarity and Precision
- **Check**: Sentences are clear and unambiguous
- **Check**: Avoid vague terms like "soon", "later", "multiple" without specifics
- **Check**: Use specific numbers and dates instead of relative terms
- **Check**: Active voice preferred over passive voice
- **Severity**: Info

### Conciseness
- **Check**: No redundant phrases (e.g., "advance planning", "past history")
- **Check**: No unnecessarily wordy constructions
- **Check**: Summary section is appropriately concise
- **Severity**: Info

## Common Mistakes

### Abbreviations and Acronyms
- **Check**: Consistent use of abbreviations throughout report
- **Check**: Don't switch between "Q1" and "Quarter 1" randomly
- **Check**: Technical abbreviations are capitalized correctly (API, REST, JSON, XML)
- **Severity**: Info

### Numbers and Units
- **Check**: Numbers below 10 spelled out in prose (unless technical/metric)
- **Check**: Consistent number formatting in lists and tables
- **Check**: Units are included with measurements (hours, days, tickets, etc.)
- **Severity**: Info

### Tense Consistency
- **Check**: Past accomplishments use past tense
- **Check**: Current status uses present tense
- **Check**: Future goals use future tense
- **Check**: No unnecessary tense shifts within a section
- **Severity**: Info

## Cross-Reference Validation

### Internal References
- **Check**: References to other sections are accurate (e.g., "as mentioned above")
- **Check**: Milestone numbers/names match across sections
- **Check**: Action items referenced in text match Actions section
- **Severity**: Warning

### External References
- **Check**: Any referenced ticket numbers, document links, or external resources are formatted correctly
- **Check**: Email addresses are properly formatted
- **Severity**: Info

## Special Characters and Formatting

### HTML Entities
- **Check**: Special characters are properly escaped if needed
- **Check**: Em dashes (—) and en dashes (–) are used appropriately
- **Check**: Quotation marks are straight quotes in markdown (not curly quotes from Word)
- **Severity**: Info

### List Formatting
- **Check**: Bullet points are formatted consistently
- **Check**: Nested lists have proper indentation
- **Check**: List items have consistent punctuation (all with periods, or all without)
- **Severity**: Info

## Language Patterns to Flag

### Weak Language
Flag weak or uncertain language that reduces confidence:
- "We think...", "We believe...", "Probably...", "Maybe..."
- "Hopefully...", "Should be able to..."
- Better alternatives: "We will...", "The plan is...", "Expected to..."
- **Severity**: Info

### Negative Framing
Flag unnecessarily negative framing:
- "We failed to..." → "We were unable to... and are addressing by..."
- "The problem is..." → "The challenge we're addressing is..."
- **Severity**: Info

### Missing Context
Flag statements that lack necessary context:
- References to unnamed individuals ("he said", "they decided")
- Undefined acronyms or project codes
- Vague references ("the issue", "that problem")
- **Severity**: Warning

## Project Name Validation Strategy

### Step 1: Extract Project/Product Names
Identify likely project and product names by:
- Capitalized multi-word phrases
- References to known technology brands
- Customer-specific project names
- Internal milestone/feature names

### Step 2: Check for Variations
For each identified name, search the entire document for:
- Different capitalization patterns
- Abbreviations vs full names
- Plural vs singular forms

### Step 3: Validate Against External Sources
If a name appears to be a known product/service:
1. Check if it's a well-known tech brand (AWS, Azure, Google, etc.)
2. Reference official product documentation for correct spelling
3. Note the correct spelling in the finding

If it's a customer-specific project:
1. Look for the most common spelling in the report
2. Check previous reports for the same customer (if available)
3. Flag inconsistencies for user review

### Step 4: Report Findings
For each inconsistency found:
```json
{
  "file": "path/to/report.md",
  "line": [line numbers where variations appear],
  "severity": "warning",
  "category": "language-spelling",
  "issue": "Inconsistent capitalization of '{project_name}'",
  "suggestion": "Use '{correct_spelling}' consistently. Found variations: {list_variations}",
  "context": "Based on [official docs|previous reports|most common usage in this report]"
}
```

## Output Format

For each finding in this phase, structure as:

```json
{
  "file": "path/to/report.md",
  "line": 42,
  "severity": "error|warning|info",
  "category": "language-spelling",
  "issue": "Clear description of the language/spelling issue",
  "suggestion": "Specific recommendation to fix",
  "context": "Relevant text snippet showing the issue"
}
```

## Integration with Other Phases

- Coordinate with Guidelines Review for status indicator terminology
- Coordinate with Date Validation for date format consistency
- Use Historical Review data to validate project name consistency across weeks
