# MCP Setup Guide

Connector setup, doctor commands, and profile management.

## What Are MCP Connectors?

MCP (Model Context Protocol) connectors allow the toolkit to read from and write to external systems: Jira, GitHub, Gmail, Google Calendar, Notion, Confluence, Slack, and more.

## Setup

### List Available Connectors

```bash
ai-pm mcp list --json
```

### Add a Connector

```bash
ai-pm mcp add github --token ghp_xxxx --org my-org
ai-pm mcp add jira --email me@company.com --token xxx --url https://company.atlassian.net
```

### Enable/Disable

```bash
ai-pm mcp enable github
ai-pm mcp disable jira
```

## Doctor

Check connector health without calling external APIs:

```bash
ai-pm mcp doctor --json
ai-pm mcp doctor --profile default --json
ai-pm mcp doctor --all --json
```

Doctor reports:
- Missing environment variables
- Disabled connectors
- Mutation approval requirements per connector
- Degraded workflows when connectors unavailable
- Overall health score (percentage of required connectors)

### Validate

```bash
ai-pm mcp validate --json
```

Validates current configuration against the registry schema.

### Notion Connector

The Notion connector enables tracking issues/features in a Notion database.

#### Setup

```bash
# Set environment variables
export NOTION_API_TOKEN=ntn_xxxxx
export NOTION_DATABASE_ID=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# Enable connector
ai-pm mcp enable notion
```

#### What It Does

- Read issues/features from Notion database
- Track sync status (synced, pending, failed, manual_only)
- Map Notion database properties to AI-PM issue format
- Validate import from `issues.csv`

#### What It Does NOT Do

- Auto-create Notion pages (requires approval)
- Auto-update Notion database entries (requires approval)
- Publish reports to Notion (requires approval)

All Notion mutations are approval-gated. The connector operates in read-only mode by default.

## Profiles

Profiles group connectors by use case:

| Profile | Connectors |
|---------|------------|
| `offline-local` | None — local-only mode |
| `default` | GitHub, Jira, Gmail, Calendar |
| `full` | All available connectors |

### Switch Profiles

```bash
ai-pm mcp profile use default
ai-pm mcp profile list --json
```

## Environment Variables

Most connectors require environment variables:

```bash
export GITHUB_TOKEN=ghp_xxxx
export JIRA_EMAIL=me@company.com
export JIRA_TOKEN=xxx
export JIRA_URL=https://company.atlassian.net
export GOOGLE_APPLICATION_CREDENTIALS=/path/to/creds.json
```

## Troubleshooting

### "Connector not found"

Run `ai-pm mcp list --json` to see available connectors.

### "Missing env vars"

Run `ai-pm mcp doctor --json` to see which variables are required.

### "Health: degraded"

Some connectors are unavailable. Workflows will use degraded mode with local fallback data.
