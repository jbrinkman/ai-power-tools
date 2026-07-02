# ElastiCache Status Reports

A grouped set of skills for managing weekly Amazon ElastiCache Agentic status reports in the `Bit-Quill/customer-reports` repository.

## Workflow

```
new-status-report → add-status-label (×N) → generate-weekly-summary → review-status-report → finalize-status-report
```

| Step | Skill | Purpose |
|------|-------|---------|
| 1 | new-status-report | Create a new report from the previous week's template |
| 2 | add-status-label | Add/update status badges on items (repeat as needed) |
| 3 | generate-weekly-summary | Generate the intro and This Week's Progress from detail sections |
| 4 | review-status-report | Pre-PR review catching common issues one at a time |
| 5 | finalize-status-report | Commit, push, and create the PR |

## Prerequisites

- `gh` CLI installed and authenticated (`gh auth status`)
- Write access to `Bit-Quill/customer-reports`
- Reports live in `amazon-elasticache-agentic/YYYY-status-reports/`

## Installation

Symlink all skills into your workspace:

```bash
for skill in new-status-report add-status-label generate-weekly-summary review-status-report finalize-status-report; do
  ln -s /path/to/ai-power-tools/skills/elasticache-status-reports/$skill \
    /path/to/workspace/.kiro/skills/$skill
done
```
