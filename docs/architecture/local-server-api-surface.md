# Local Server API Surface

**Date:** 2026-06-19  
**Status:** Design specification (not yet implemented)  
**Audience:** Backend developers, mobile/desktop integrators  
**References:** [packages/core/src/runtime/approvalQueue.ts](../../packages/core/src/runtime/approvalQueue.ts), [schemas/approval/approval-item.schema.json](../../schemas/approval/approval-item.schema.json)

## 1. Purpose

Define the HTTP API surface for a future local server that exposes the AI-PM runtime (approval queue, memory store, workflows) to mobile, desktop, and chat clients. This server will run on the user's laptop and serve as the single source of truth for project runtime state.

## 2. Architecture

```text
┌────────────────────────────────────────────────────┐
│                 AI-PM Local Server                  │
│                 http://localhost:3100               │
│                                                      │
│  ┌─────────────────────────────────────────────┐   │
│  │           HTTP API Layer (Express)          │   │
│  └─────────────────┬───────────────────────────┘   │
│                    │                                │
│  ┌─────────────────▼───────────────────────────┐   │
│  │        Runtime Layer (@ai-pm/core)          │   │
│  │  ┌──────────────┐  ┌──────────────┐         │   │
│  │  │ApprovalQueue │  │ MemoryStore  │         │   │
│  │  └──────────────┘  └──────────────┘         │   │
│  └─────────────────┬───────────────────────────┘   │
│                    │                                │
│  ┌─────────────────▼───────────────────────────┐   │
│  │         File-backed Storage                  │   │
│  │         .ai-pm/approvals.json                │   │
│  │         .ai-pm/memory/state.json             │   │
│  └──────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────┘
         │                    │                  │
         ▼                    ▼                  ▼
   ┌──────────┐         ┌──────────┐      ┌──────────┐
   │  Mobile  │         │ Desktop  │      │   Chat   │
   │   App    │         │   App    │      │   Bot    │
   └──────────┘         └──────────┘      └──────────┘
```

## 3. Base URL

**Development:** `http://localhost:3100`  
**Production (same machine):** `http://localhost:3100`  
**Network access:** `http://<laptop-ip>:3100` (e.g., `http://192.168.1.100:3100`)

## 4. Authentication Model

### 4.1 Local Trust (Phase 1)

When the server binds to `localhost` only, no authentication is required:

- Requests from `localhost` are trusted
- No `Authorization` header needed
- No CORS headers (same-origin)

### 4.2 Network Access (Phase 2)

When the server accepts connections from the local network (mobile devices):

- Use a time-limited token generated at server startup
- Token displayed in server logs and CLI output
- Mobile app prompts user to enter token on first connection
- Token stored in device secure storage

**Future enhancement:** mTLS with device-specific certificates.

## 5. API Endpoints

### 5.1 Approval Queue

#### GET `/api/approvals`

List approval items with optional filters.

**Query Parameters:**

| Parameter | Type | Description | Example |
|---|---|---|---|
| `status` | string | Filter by status | `?status=pending` |
| `priority` | string | Filter by priority | `?priority=high` |

**Response:** `200 OK`

```json
[
  {
    "approval_id": "a1d5b4c6-7f9c-4d8a-b1e2-3f4a5b6c7d8e",
    "project_id": "proj-001",
    "action_type": "report_publish",
    "target_system": "gmail",
    "target_id": "msg-stakeholder-weekly-20260619",
    "workflow_id": "wf-reporting-weekly",
    "run_id": "run-20260619-001",
    "requested_by_agent": "agent-reporting",
    "requested_by_role": "reporting",
    "title": "Publish weekly stakeholder report",
    "description": "Send the generated weekly status report...",
    "summary_diff": "Adds section 4 (risks), updates burndown chart...",
    "confidence": 84,
    "source_refs": [
      {
        "type": "transcript",
        "id": "mtg-20260619-standup",
        "title": "Daily standup transcript",
        "accessed_at": "2026-06-19T07:55:00Z"
      }
    ],
    "priority": "high",
    "status": "pending",
    "revision_round": 0,
    "deadline": "2026-06-19T14:00:00Z",
    "ttl_seconds": 3600,
    "assigned_approvers": [],
    "created_at": "2026-06-19T08:05:00Z",
    "updated_at": "2026-06-19T08:05:00Z",
    "decided_at": null,
    "decided_by": null,
    "decision": null,
    "rejection_reason": null,
    "revision_notes": null,
    "delegated_to": null,
    "execution_status": "pending",
    "execution_error": null,
    "execution_target_response": null,
    "retry_count": 0,
    "policy_rule_id": null
  }
]
```

**Implementation:** Calls `ApprovalQueue.listItems(filter)` from `@ai-pm/core/runtime`.

---

#### GET `/api/approvals/counts`

Get approval status counts.

**Response:** `200 OK`

```json
{
  "pending": 3,
  "approved": 5,
  "rejected": 1,
  "revision_requested": 2,
  "cancelled": 0,
  "expired": 0,
  "executing": 1,
  "executed": 12,
  "execution_failed": 1
}
```

**Implementation:** Calls `ApprovalQueue.getCounts()`.

---

#### GET `/api/approvals/:id`

Get a single approval item by ID.

**Path Parameters:**

| Parameter | Type | Description |
|---|---|---|
| `id` | string | Approval ID (full UUID) |

**Response:** `200 OK` (same shape as list endpoint, single object)

**Error Responses:**

- `404 Not Found` — approval item not found

```json
{
  "error": {
    "code": "NOT_FOUND",
    "message": "Approval item a1d5b4c6-... not found"
  }
}
```

**Implementation:** Calls `ApprovalQueue.getItem(id)`.

---

#### POST `/api/approvals/:id/decide`

Make an approval decision.

**Path Parameters:**

| Parameter | Type | Description |
|---|---|---|
| `id` | string | Approval ID (full UUID) |

**Request Body:**

```json
{
  "decided_by": "pm-user-01",
  "decision": "approve",
  "reason": "LGTM, mitigation evidence is complete",
  "notes": "Please update the risk register after execution"
}
```

**Fields:**

| Field | Type | Required | Description |
|---|---|---|---|
| `decided_by` | string | Yes | User ID or name making the decision |
| `decision` | string | Yes | One of: `approve`, `reject`, `revision_requested`, `cancel` |
| `reason` | string | Conditional | Required for `reject` (min 10 chars) |
| `notes` | string | Conditional | Required for `revision_requested` (min 10 chars) |

**Response:** `200 OK` (returns updated approval item)

**Error Responses:**

- `400 Bad Request` — invalid state transition or missing required fields

```json
{
  "error": {
    "code": "INVALID_TRANSITION",
    "message": "Cannot approve item in 'approved' status"
  }
}
```

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Rejection reason is required (min 10 characters)"
  }
}
```

- `404 Not Found` — approval item not found

**Implementation:** Calls `ApprovalQueue.decide(id, payload)`.

**Valid state transitions:**

```text
draft             → pending, cancelled
pending           → approved, rejected, revision_requested, expired, cancelled
revision_requested → pending, cancelled
approved          → executing
executing         → executed, execution_failed
execution_failed  → pending, cancelled
```

---

#### POST `/api/approvals/:id/resubmit`

Resubmit an approval item after addressing revision requests.

**Path Parameters:**

| Parameter | Type | Description |
|---|---|---|
| `id` | string | Approval ID (full UUID) |

**Request Body:**

```json
{
  "summary_diff": "Updated mitigation evidence note as requested"
}
```

**Response:** `200 OK` (returns updated approval item with incremented `revision_round`)

**Error Responses:**

- `400 Bad Request` — item is not in `revision_requested` status
- `400 Bad Request` — revision limit (3 rounds) reached

**Implementation:** Calls `ApprovalQueue.resubmit(id, summary_diff)`.

---

#### POST `/api/approvals`

Create a new approval item.

**Request Body:**

```json
{
  "project_id": "proj-001",
  "action_type": "report_publish",
  "target_system": "gmail",
  "target_id": "msg-stakeholder-weekly",
  "workflow_id": "wf-reporting",
  "run_id": "run-20260619-001",
  "requested_by_agent": "agent-reporting",
  "requested_by_role": "reporting",
  "title": "Publish weekly report",
  "description": "Send the generated report...",
  "summary_diff": "Adds section 4, updates chart",
  "confidence": 84,
  "source_refs": [
    {
      "type": "transcript",
      "id": "mtg-001",
      "title": "Standup",
      "accessed_at": "2026-06-19T07:55:00Z"
    }
  ],
  "priority": "high",
  "deadline": "2026-06-19T14:00:00Z",
  "ttl_seconds": 3600,
  "assigned_approvers": []
}
```

**Response:** `201 Created` (returns created approval item with generated `approval_id`)

**Error Responses:**

- `400 Bad Request` — missing required fields or invalid confidence

**Implementation:** Calls `ApprovalQueue.createItem(input)`.

---

### 5.2 Memory Store

#### GET `/api/memory/summary`

Get memory summary counts.

**Response:** `200 OK`

```json
{
  "totalTasks": 5,
  "completedTasks": 2,
  "totalArtifacts": 8,
  "archivedArtifacts": 1,
  "staleArtifacts": 3
}
```

**Implementation:** Calls `MemoryStore.getSummary()`.

---

#### GET `/api/memory/tasks`

List memory tasks with optional status filter.

**Query Parameters:**

| Parameter | Type | Description | Example |
|---|---|---|---|
| `status` | string | Filter by status | `?status=pending` |

**Response:** `200 OK`

```json
{
  "tasks": [
    {
      "task_id": "480fc327-...",
      "project_id": "proj-001",
      "name": "Update risk register",
      "description": "Review and update Q2 risks",
      "status": "in_progress",
      "assigned_to": "agent-risk",
      "created_at": "2026-06-18T10:00:00Z",
      "updated_at": "2026-06-19T08:00:00Z",
      "completed_at": null,
      "dependencies": [],
      "artifacts": ["art-001"],
      "tags": ["risk", "quarterly"]
    }
  ],
  "total": 1
}
```

**Implementation:** Calls `MemoryStore.listTasks(filter)`.

---

#### GET `/api/memory/artifacts`

List memory artifacts with optional filters.

**Query Parameters:**

| Parameter | Type | Description | Example |
|---|---|---|---|
| `status` | string | Filter by status | `?status=active` |
| `type` | string | Filter by type | `?type=doc` |

**Response:** `200 OK`

```json
{
  "artifacts": [
    {
      "artifact_id": "art-001",
      "project_id": "proj-001",
      "name": "Q2 Risk Register",
      "path": "docs/risk-register-q2.md",
      "type": "doc",
      "status": "active",
      "created_at": "2026-04-01T10:00:00Z",
      "updated_at": "2026-06-19T08:00:00Z",
      "archived_at": null,
      "archive_reason": null,
      "task_id": "480fc327-...",
      "version": 3
    }
  ],
  "total": 1
}
```

**Implementation:** Calls `MemoryStore.listArtifacts(filter)`.

---

#### POST `/api/memory/artifacts/:id/archive`

Archive a memory artifact.

**Path Parameters:**

| Parameter | Type | Description |
|---|---|---|
| `id` | string | Artifact ID (full UUID or prefix) |

**Request Body:**

```json
{
  "reason": "Superseded by v4"
}
```

**Response:** `200 OK` (returns updated artifact with `archived` status)

**Implementation:** Calls `MemoryStore.archiveArtifact(id, reason)`.

---

## 6. Error Response Format

All error responses follow this structure:

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "details": {}
  }
}
```

**Common error codes:**

| Code | HTTP Status | Description |
|---|---|---|---|
| `NOT_FOUND` | 404 | Resource not found |
| `VALIDATION_ERROR` | 400 | Invalid request payload |
| `INVALID_TRANSITION` | 400 | Invalid state transition |
| `AMBIGUOUS_ID` | 400 | ID prefix matches multiple items |
| `UNAUTHORIZED` | 401 | Missing or invalid auth token (Phase 2) |
| `FORBIDDEN` | 403 | Operation not allowed |
| `INTERNAL_ERROR` | 500 | Server error |

## 7. Response Headers

### 7.1 CORS (for network access)

When accepting connections from non-localhost:

```text
Access-Control-Allow-Origin: *
Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS
Access-Control-Allow-Headers: Content-Type, Authorization
```

### 7.2 Cache Control

```text
Cache-Control: no-cache, no-store, must-revalidate
```

All runtime data is mutable and should not be cached.

### 7.3 Content Type

```text
Content-Type: application/json; charset=utf-8
```

## 8. Request Validation

### 8.1 Content-Type Check

All `POST`/`PUT` requests must have `Content-Type: application/json`.

**Error on mismatch:** `400 Bad Request`

```json
{
  "error": {
    "code": "INVALID_CONTENT_TYPE",
    "message": "Expected Content-Type: application/json"
  }
}
```

### 8.2 JSON Parsing

Invalid JSON payloads return `400 Bad Request`:

```json
{
  "error": {
    "code": "INVALID_JSON",
    "message": "Failed to parse request body as JSON"
  }
}
```

### 8.3 Schema Validation

Request payloads are validated against JSON schemas before processing.

**Error on validation failure:** `400 Bad Request`

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Missing required field: title",
    "details": {
      "field": "title",
      "rule": "required"
    }
  }
}
```

## 9. Rate Limiting

### 9.1 Phase 1 (localhost only)

No rate limiting — trusted local access.

### 9.2 Phase 2 (network access)

- 100 requests per minute per client IP
- 429 Too Many Requests on limit exceeded

```json
{
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Too many requests. Retry after 30 seconds.",
    "retryAfter": 30
  }
}
```

**Response Headers:**

```text
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 1718801940
Retry-After: 30
```

## 10. Health Check

#### GET `/health`

Server health and readiness check.

**Response:** `200 OK`

```json
{
  "status": "ok",
  "version": "0.1.0",
  "uptime": 3600,
  "dataPath": "/Users/pm/.ai-pm",
  "timestamp": "2026-06-19T08:30:00Z"
}
```

**Use case:** Mobile app checks server availability before switching from mock fallback mode.

## 11. Implementation Notes

### 11.1 Server Stack

- **Framework:** Express.js
- **Validation:** JSON Schema + Ajv (reuse `@ai-pm/core` schemas)
- **Logging:** Winston or Pino (structured JSON logs)
- **Process Management:** PM2 or systemd

### 11.2 File Locking

When multiple clients connect:

- Use file-level locking (e.g., `lockfile` npm package) to prevent race conditions
- Write operations acquire an exclusive lock on `.ai-pm/approvals.json`
- Read operations use a shared lock

### 11.3 WebSocket Support (Future)

For real-time updates:

- `ws://localhost:3100/ws`
- Clients subscribe to `approval:created`, `approval:updated` events
- Server broadcasts changes to all connected clients

**Example event:**

```json
{
  "event": "approval:updated",
  "data": {
    "approval_id": "a1d5b4c6-...",
    "status": "approved"
  }
}
```

## 12. Security Considerations

1. **Localhost binding:** Default to `127.0.0.1` only, not `0.0.0.0`
2. **Token rotation:** Phase 2 tokens expire after 7 days
3. **Input sanitization:** Validate all user input, reject script tags in text fields
4. **Path traversal:** Reject artifact paths containing `..`
5. **SQL injection:** N/A (file-backed storage, no SQL)
6. **Audit logging:** Log all mutations (creates, decides, archives) to `.ai-pm/audit/`

## 13. Deployment

### 13.1 Start Server

```bash
ai-pm server start --port 3100
```

### 13.2 Stop Server

```bash
ai-pm server stop
```

### 13.3 Server Logs

```bash
ai-pm server logs
```

### 13.4 Auto-start on Boot

```bash
ai-pm server enable
```

Installs a systemd service (Linux), launchd agent (macOS), or Task Scheduler task (Windows).

## 14. Testing Strategy

1. **Unit tests:** Validate request/response shapes against schemas
2. **Integration tests:** Test full request → runtime → response cycle
3. **Load tests:** Ensure server handles 100 req/min per client
4. **Security tests:** Attempt path traversal, XSS, CSRF
5. **Network tests:** Mobile device connecting from local network

## 15. Future Enhancements

- **GraphQL endpoint:** `/graphql` for complex queries
- **Server-Sent Events (SSE):** Alternative to WebSocket for mobile
- **Batch operations:** `/api/approvals/batch` for bulk decisions
- **Pagination:** `?limit=50&offset=0` for large lists
- **Filtering DSL:** `?filter=status:pending AND priority:high`
- **Audit trail endpoint:** `GET /api/audit/:approval_id`
- **Export endpoint:** `GET /api/approvals/export?format=json|csv`
