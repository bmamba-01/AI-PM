# Local Server API Reference

The local server provides a shared HTTP API consumed by the desktop, mobile, and chat surfaces.

## Overview

The local server runs inside the Electron main process (or standalone) on port 3847. It wraps the `@ai-pm/core/runtime` classes and exposes them as HTTP endpoints.

## Architecture

```
┌─────────────────────────────────────────────┐
│                Local Server                 │
│                                             │
│  ┌──────────────┐  ┌──────────────────────┐ │
│  │ Approval     │  │ Memory Store         │ │
│  │ Queue        │  │ (future)             │ │
│  └──────┬───────┘  └──────────┬───────────┘ │
│         │                     │             │
│         └─────────┬───────────┘             │
│                   ▼                         │
│         ┌─────────────────┐                 │
│         │  HTTP API       │                 │
│         └────────┬────────┘                 │
│                  │                          │
│    ┌─────────────┼──────────────┐           │
│    ▼             ▼              ▼           │
│  Desktop      Mobile        Chat           │
│  (IPC→API)   (fetch)       (adapter)       │
└─────────────────────────────────────────────┘
```

## Endpoints

### Approvals

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/approvals` | List approval items (optional `?status=&priority=`) |
| `GET` | `/api/approvals/counts` | Get status counts |
| `GET` | `/api/approvals/:id` | Get single item |
| `POST` | `/api/approvals/:id/decide` | Submit decision |
| `POST` | `/api/approvals` | Create new approval item |
| `POST` | `/api/approvals/:id/resubmit` | Resubmit after revision |

### Decision Request Body

```json
{
  "decided_by": "user-id",
  "decision": "approve | reject | revision_requested | cancel",
  "reason": "optional — required for reject (min 10 chars)",
  "notes": "optional — required for revision (min 10 chars)"
}
```

### Create Request Body

```json
{
  "project_id": "proj-001",
  "action_type": "report_publish",
  "target_system": "gmail",
  "target_id": "msg-001",
  "workflow_id": "wf-reporting",
  "run_id": "run-001",
  "requested_by_agent": "agent-reporting",
  "requested_by_role": "reporting",
  "title": "Publish weekly report",
  "description": "...",
  "summary_diff": "...",
  "confidence": 84,
  "source_refs": [{ "type": "transcript", "id": "mtg-001" }],
  "priority": "high"
}
```

### Server Management

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/server/status` | Server health check |

## Desktop Integration

The desktop app communicates with the local server via IPC bridges in `main.ts` → `preload.ts`. The renderer never calls the HTTP API directly — it uses `window.electronAPI.approvals.*` which routes through IPC to the `ApprovalQueue` instance in the main process.

## Mobile Integration

The mobile app communicates via `fetch()` to the local server URL (configured via `setApprovalBaseUrl()`). When no URL is configured, it falls back to mock data.

See [mobile-approval-api-client.md](./mobile-approval-api-client.md) for details.

## Chat Integration

Chat adapters (Telegram, Slack, Teams, Discord) communicate through the same HTTP API via the chat gateway layer.

## State Management

All surfaces share the same canonical state through the local server. No surface maintains its own approval state independently — the server is the single source of truth.

**Concurrency resolution**: First-write-wins for decisions on the same item from different surfaces.
