# Changelog

All notable changes to the Jira Story Wizard power will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.9.0] - 2026-01-07 (Beta Release)

### Added

- Interactive wizard workflow for creating well-structured Jira stories
- Integration with Atlassian Jira MCP server for story creation
- Puppeteer integration for screenshot capture functionality
- Automatic Epic linking support
- User story best practices formatting
- Acceptance criteria generation based on story context
- URL analysis for GitHub repositories and documentation
- Comprehensive steering workflow with 5-phase process
- Standard label system for consistent story categorization
- Extensive documentation with troubleshooting guide
- Auto-approval configuration for seamless workflow

### Features

- **Story Creation**: Complete interactive workflow from requirements gathering to Jira story creation
- **Screenshot Support**: Capture and reference screenshots for visual context
- **Epic Integration**: Automatic linking to parent Epics
- **URL Analysis**: Fetch and analyze GitHub repos and documentation for context
- **Best Practices**: Enforces user story format and acceptance criteria standards
- **Workflow Guidance**: Step-by-step steering through story creation process

### Technical Details

- **MCP Servers**: jira-sse (remote SSE), puppeteer (local STDIO)
- **Auto-approved Tools**: Core Jira and screenshot tools for smooth workflow
- **Security**: Disabled form interaction tools, keeping only essential functionality
- **Documentation**: Comprehensive POWER.md with examples and troubleshooting

### Known Limitations

- Screenshots must be manually attached to Jira stories (MCP API limitation)
- Sprint assignment requires manual action in Jira UI (API limitation)
- Some websites may block headless browser screenshot capture

### Requirements

- Active Atlassian/Jira account with story creation permissions
- Kiro IDE with Powers support
- Node.js (for Puppeteer functionality)

---

**Note**: This is a beta release. We welcome feedback and suggestions for improvements. Please report issues or feature requests through the GitHub repository.
