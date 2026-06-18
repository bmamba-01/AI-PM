# Local Memory MCP Contract

## Purpose

Normalize local project memory from files, SQLite, audit logs, cached snapshots, and manual imports.

## Entities

```yaml
memory_entry:
  id: string
  project_id: string
  type: decision|assumption|risk|meeting_note|report|agent_output|context_snapshot|approval
  content: string
  source_ref: string
  created_at: string
  updated_at: string
  tags:
    - string
```

```yaml
workflow_run:
  id: string
  workflow_id: string
  trigger: string
  started_at: string
  completed_at: string
  status: completed|blocked|failed
  output_ref: string
```

## Read Operations

- read project memory
- search local files
- read workflow runs
- read audit logs
- read cached MCP snapshots

## Mutations

Local mutations are allowed when they are private project records. Approval is required when the local mutation represents an external decision, approval, or published artifact.

## Degraded Mode

Local memory is the minimum viable data source. If both local memory and online connectors are unavailable, the agent must ask for user-provided context.

