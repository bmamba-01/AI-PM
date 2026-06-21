# Chat Command Gateway

**Date:** 2026-06-21  
**Status:** Implemented  
**Audience:** Chat adapter implementers (Hermes, OpenClaw, Telegram, Slack, Teams)  
**References:** `packages/server/src/routes/chatGateway.ts`, `docs/architecture/local-server-api-surface.md`, `docs/product/approval-queue-ux.md`

## 1. Purpose

Define the read-only HTTP API that a chat adapter (Hermes/OpenClaw-style) can call for PM queries and action proposals. The gateway returns structured JSON only — it never sends outbound chat messages. The chat adapter is responsible for formatting and delivering responses to the user.

## 2. Design Principles

1. **Read-only by default.** All query endpoints return data without side effects.
2. **Action proposals are approval-safe.** Action endpoints return structured JSON with `approval_required: true` and `side_effects: []`. No external mutations are executed.
3. **Mutations rejected.** Any write command returns `403` with `approval_required: true` and a suggestion to create an approval item first.
4. **Structured JSON.** Every response is a JSON object with a `command`/`action` field echoing the request, plus command-specific payload and an `assumptions` array.
5. **Command history persisted locally.** All queries and action proposals are logged to `.ai-pm/chat/history.jsonl` for audit and replay.
6. **Graceful degradation.** If data is missing (empty store, no MCP), the endpoint returns empty results with assumptions explaining what data sources were unavailable.
7. **Project-root scoped.** All data comes from the server's `PROJECT_ROOT` config. No cross-project data leaks.

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

### GET `/api/chat/history`

Return recent local command/query/action records for audit and replay.

**Query Parameters:**

| Parameter | Type | Default | Description |
|---|---|---|---|
| `limit` | integer | 50 | Max records to return (most recent first) |

**Response:** `200 OK`

```json
{
  "records": [
    {
      "id": "uuid",
      "type": "query",
      "command": "daily_brief",
      "params": {},
      "status": "success",
      "result_summary": "Query 'daily_brief' executed successfully",
      "timestamp": "2026-06-21T10:30:00.000Z"
    }
  ],
  "total": 1
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

### POST `/api/chat/action`

Propose an action without executing it. Returns structured JSON with `approval_required: true` and `side_effects: []`. No external systems are touched.

**Request body:**

```json
{
  "action": "draft_weekly_report",
  "params": {
    "date": "2026-06-21"
  }
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `action` | string | yes | Action ID |
| `params` | object | no | Action-specific parameters |

**Response:** `200 OK`

```json
{
  "action": "draft_weekly_report",
  "approval_required": true,
  "side_effects": [],
  "draft": { ... },
  "suggested_approval": {
    "title": "Publish weekly report: ...",
    "action_type": "report_publish",
    "target_system": "gmail",
    "priority": "high"
  },
  "assumptions": ["Draft generated from local project memory.", "Draft is not published — approval required first."]
}
```

## 4. Commands (read-only, executed via `/api/chat/query`)

| Command | Description | Parameters |
|---|---|---|
| `daily_brief` | Today's priorities, blockers, approvals, activity | `date` (optional) |
| `weekly_status` | Past week summary: tasks, approvals, artifacts | `date` (optional) |
| `risk_summary` | Failed tasks, stale artifacts as risk signals | — |
| `pending_approvals` | Approval items awaiting human decision | — |

## 5. Actions (proposal-only, executed via `/api/chat/action`)

| Action | Description | Parameters |
|---|---|---|
| `draft_weekly_report` | Generate a draft weekly report from local data | `date` (optional) |
| `create_traceability_matrix` | Map requirements to tasks and artifacts | — |
| `run_code_quality_review` | Review local code artifacts for quality signals | — |
| `request_publication_approval` | Create an approval proposal for external publication | `title` (required), `target_system` (optional, default: gmail) |

All actions return `approval_required: true` and `side_effects: []`. They never execute mutations.

## 6. Mutations (rejected with 403 via `/api/chat/query`)

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

## 7. Error Responses

| Status | Condition | Body shape |
|---|---|---|
| `400` | Missing `command`/`action` field or invalid JSON | `{ "error": "..." }` |
| `403` | Mutation command | `{ "command": "...", "approval_required": true, "error": "...", "suggestion": "..." }` |
| `404` | Unknown command/action ID | `{ "error": "Unknown command '...'. Available: ..." }` |
| `500` | Internal error during execution | `{ "error": "Command/Action '...' failed: ..." }` |

## 8. Command History

All queries, action proposals, and rejected mutations are persisted to `.ai-pm/chat/history.jsonl` (one JSON object per line). History records include:

- `id` — UUID
- `type` — `query` or `action`
- `command` — command/action ID
- `params` — request parameters
- `status` — `success`, `error`, `approval_required`, or `rejected`
- `result_summary` — human-readable outcome
- `timestamp` — ISO-8601

History is best-effort: write failures do not affect the response.

## 9. Implementation Notes

- **No authentication in Phase 1** (localhost only). Phase 2 adds bearer token.
- **No outbound messages.** The gateway is purely a data API. The chat adapter handles message formatting and delivery.
- **Read executors** compose `ApprovalQueue` and `MemoryStore` calls. Adding a new read command requires a new executor function and registering it in `READ_EXECUTORS`.
- **Action executors** follow the same pattern but always return `approval_required: true` and never execute mutations.
- **Adding a mutation command** requires only adding its ID to `MUTATION_COMMANDS`. The gateway rejects it automatically.

## 10. Chat Adapter Integration Pattern

### Read-only query

```text
User message in chat
  → Chat adapter parses intent
  → POST /api/chat/query { command: "daily_brief" }
  → JSON response
  → Chat adapter formats into chat message
  → Delivers to user
```

### Action proposal

```text
User message in chat: "Draft a weekly report"
  → Chat adapter parses intent
  → POST /api/chat/action { action: "draft_weekly_report" }
  → JSON response with draft + suggested_approval
  → Chat adapter formats draft into chat message
  → Chat adapter asks: "Create approval to publish?"
  → If yes: POST /api/approvals { ...suggested_approval }
```

### Mutation (rejected)

```text
User message in chat: "Create a task for X"
  → Chat adapter parses intent
  → POST /api/chat/query { command: "create_task" }
  → 403 response with approval_required: true
  → Chat adapter creates approval: POST /api/approvals { ... }
  → Chat adapter notifies user: "Approval item created. Awaiting PM review."
```
