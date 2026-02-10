# AI Power Tools

A collection of Kiro Powers for enhancing productivity with the Kiro IDE and Kiro CLI.

## Available Powers

### Jira Story Wizard

Interactive wizard for creating well-structured Jira stories with user story best practices, acceptance criteria, and optional screenshots for visual context.

**Installation:**

```
https://github.com/jbrinkman/ai-power-tools/powers/jira-story-wizard
```

**Features:**

- Interactive story creation workflow
- Automatic Epic linking
- Screenshot capture support
- Best practice formatting
- Acceptance criteria generation

**Requirements:**

- Active Atlassian/Jira account
- Kiro IDE with Powers support

### Review Valkey Narrative

Evaluate Valkey integration narratives in Confluence against standard criteria. Provides structured feedback on completeness, technical approach, and problem articulation for framework integration projects.

**Installation:**

```
https://github.com/jbrinkman/ai-power-tools/powers/review-valkey-narrative
```

**Features:**

- Access and read narratives from Confluence
- Evaluate narratives against standard technical criteria
- Provide structured feedback with specific comments
- Interactive comment approval workflow
- Adaptive evaluation for non-standard narratives

**Requirements:**

- Access to Confluence space (AMZ)
- Authenticated Jira SSE MCP server connection

## How to Install Powers

1. Open Kiro Powers UI
2. Click "Add Custom Power"
3. Select "Git Repository"
4. Enter the installation URL for the desired power (see above)

## Project Structure

```
ai-power-tools/
├── powers/
│   ├── jira-story-wizard/
│   │   ├── POWER.md
│   │   ├── mcp.json
│   │   ├── Jira-Wizard.png
│   │   └── steering/
│   │       └── workflow.md
│   └── review-valkey-narrative/
│       ├── POWER.md
│       └── mcp.json
├── CHANGELOG.md
├── LICENSE
└── README.md
```

## Contributing

Contributions are welcome! Please ensure all commits follow conventional commit standards and include DCO signoff.

## License

See LICENSE file for details.
