# Work Tracker MCP Contract

## Purpose

Normalize Jira, Linear, GitHub Issues, and similar work tracking systems.

## Entities

```yaml
issue:
  id: string
  key: string
  title: string
  description: string
  status: string
  priority: string
  assignee: string
  reporter: string
  labels:
    - string
  parent_id: string
  sprint_or_cycle: string
  estimate: number|string
  due_date: string
  updated_at: string
  url: string
```

## Read Operations

- search issues
- read issue detail
- read comments
- read sprint or cycle
- read epic or project
- read status history

## Mutations

All mutations require approval:

- create issue
- update issue
- transition issue
- assign issue
- add comment
- close issue

## Degraded Mode

If no work tracker is connected, workflows must use local files, cached exports, or manual input and mark work-tracker coverage as unavailable.

