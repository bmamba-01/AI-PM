# Chat Command Gateway

**Date:** 2026-06-21  
**Status:** Implemented  
**Audience:** Chat adapter implementers (Hermes, OpenClaw, Telegram, Slack, Teams)  
**References:** `packages/server/src/routes/chatGateway.ts`, `docs/architecture/local-server-api-surface.md`, `docs/product/approval-queue-ux.md`

## 1. Purpose

Define the read-only HTTP API that a chat adapter (Hermes/OpenClaw-style) can call for PM queries. The gateway returns structured JSON only — it never sends outbound chat messages. The chat adapter is responsible for formatting and delivering responses to the user.

## 2. Design Principles

1. **Read-only by default.** All query endpoints return data without side effects.
2. **Mutations rejected.** Any write command returns `403` with `approval_required: true` and a suggestion to create an approval item first.
3. **Structured JSON.** Every response is a JSON object with a `command` field echoing the request, plus command-specific payload and an `assumptions` array.
4. **Graceful degradation.** If data is missing (empty store, no MCP), the endpoint returns empty results with assumptions explaining what data sources were unavailable.
5. **Project-root scoped.** All data comes from the server's `PROJECT_ROOT` config. No cross-project data leaks.

## 3. Endpoints

### GET `/api/chat/commands`

List available chat commands.

**Response:** `200 OK`

```json
{
  "commands": [
    {
      "id": "daily_brief",
      "name": "Daily Brief",
      "description": "Summarize today's priorities, blockers, approvals, and upcoming meetings.",
      "read_only": true,
      "parameters": [
        { "name": "date", "type": "string", "required": false, "description": "ISO date string (default: today)" }
      ]
    },
    ...
  ],
  "total": 4
}
```

### POST `/api/chat/query`

Execute a chat command.

**Request body:**

```json
{
  "command": "daily_brief",
  "params": {
    "date": "2026-06-21"
  }
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `command` | string | yes | Command ID |
| `params` | object | no | Command-specific parameters |

**Response (read commands):** `200 OK`

```json
{
  "command": "daily_brief",
  "date": "2026-06-21",
  "project_summary": { "totalTasks": 12, "completedTasks": 5, ... },
  "pending_approvals": [ ... ],
  "today_activity": { "tasks_updated": 3, "pending_tasks": 8, "completed_tasks": 5 },
  "assumptions": ["Data from local project memory and approval queue."]
}
```

**Response (mutation commands):** `403 Forbidden`

```json
{
  "command": "create_task",
  "approval_required": true,
  "error": "Command 'create_task' is a mutation. Approval required via /api/approvals.",
  "suggestion": "Create an approval item first, then execute after human approval."
}
```

## 4. Commands

### Read-Only (executed directly)

| Command | Description | Parameters |
|---|---|---|
| `daily_brief` | Today's priorities, blockers, approvals, activity | `date` (optional) |
| `weekly_status` | Past week summary: tasks, approvals, artifacts | `date` (optional) |
| `risk_summary` | Failed tasks, stale artifacts as risk signals | — |
| `pending_approvals` | Approval items awaiting human decision | — |

### Mutation (rejected with 403)

| Command | Rejection reason |
|---|---|
| `create_task` | Approval required |
| `complete_task` | Approval required |
| `archive_artifact` | Approval required |
| `decide_approval` | Approval required |
| `create_approval` | Approval required |
| `send_email` | Approval required |
| `publish_report` | Approval required |

Mutations are rejected at the gateway level. The chat adapter should route these through the approval queue (`POST /api/approvals`) instead.

## 5. Error Responses

| Status | Condition | Body shape |
|---|---|---|
| `400` | Missing `command` field or invalid JSON | `{ "error": "..." }` |
| `403` | Mutation command | `{ "command": "...", "approval_required": true, "error": "...", "suggestion": "..." }` |
| `404` | Unknown command ID | `{ "error": "Unknown command '...'. Available: ..." }` |
| `500` | Internal error during execution | `{ "error": "Command '...' failed: ..." }` |

## 6. Implementation Notes

- **No authentication in Phase 1** (localhost only). Phase 2 adds bearer token.
- **No outbound messages.** The gateway is purely a data API. The chat adapter handles message formatting and delivery.
- **Read executors are async functions** that compose `ApprovalQueue` and `MemoryStore` calls. Adding a new read command requires only a new executor function and registering it in `READ_EXECUTORS`.
- **Adding a mutation command** requires only adding its ID to `MUTATION_COMMANDS`. The gateway rejects it automatically.

## 7. Chat Adapter Integration Pattern

```text
User message in chat
  → Chat adapter parses intent
  → POST /api/chat/query { command: "daily_brief" }
  → JSON response
  → Chat adapter formats into chat message
  → Delivers to user
```

For mutations:

```text
User message in chat
  → Chat adapter parses intent (e.g., "create a task for X")
  → POST /api/chat/query { command: "create_task" }
  → 403 response with approval_required: true
  → Chat adapter creates approval: POST /api/approvals { ... }
  → Chat adapter notifies user: "Approval item created. Awaiting PM review."
```
