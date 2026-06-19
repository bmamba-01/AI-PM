# Approval Queue Runtime Contract

**Date:** 2026-06-19  
**Status:** Design draft  
**Audience:** Runtime implementers (packages/core, packages/agents, packages/desktop, packages/mobile, packages/cli), local server  
**References:** [approval-queue-ux.md](../product/approval-queue-ux.md), [approval-policy.md](../operating-model/approval-policy.md), [mcp-implementation-matrix.md](mcp-implementation-matrix.md), [design spec §10.2–10.3, §14.4](../superpowers/specs/2026-06-18-ai-pm-toolkit-design.md)

## 1. Purpose

Define the runtime API, data model, state machine, and integration points for the approval queue as a shared service consumed by the local server, desktop app, mobile app, and chat gateway. All surfaces interact with the same queue through the local server API — no surface maintains its own approval state.

## 2. Architectural Position

```text
┌─────────────────────────────────────────────────────────┐
│                    Local Server                         │
│                                                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │ Workflow      │  │ Agent        │  │ Audit        │  │
│  │ Engine        │  │ Orchestrator │  │ Logger       │  │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘  │
│         │                 │                  │           │
│         └─────────┬───────┘                  │           │
│                   ▼                          │           │
│         ┌─────────────────┐                  │           │
│         │ Approval Queue  │◄─────────────────┘           │
│         │ Service         │                              │
│         └────────┬────────┘                              │
│                  │                                        │
│    ┌─────────────┼──────────────┐                        │
│    ▼             ▼              ▼                        │
│  Desktop      Mobile        Chat                         │
│  Renderer     Renderer      Adapter                      │
│  (React)      (React Nav)   (Telegram/Slack/etc)         │
└─────────────────────────────────────────────────────────┘
```

The approval queue service lives inside the local server. Desktop and mobile communicate with it via the local HTTP API. Chat gateway adapters communicate with it via the same API. No surface writes to the approval store directly.

## 3. Data Model

### 3.1 ApprovalItem

This is the canonical entity. All surfaces read from and write decisions to this model.

```typescript
interface ApprovalItem {
  // Identity
  approval_id: string;              // UUID v4, immutable
  project_id: string;               // project scope

  // Origin
  item_type: ApprovalItemType;      // enum of action categories
  workflow_id: string;              // originating workflow
  run_id: string;                   // workflow run ID
  requested_by_agent: string;       // agent ID
  requested_by_role: AgentRole;     // pm_commander | reporting | meeting | code_quality_guard | risk | delivery | ba | qa | dev | tech_lead | stakeholder

  // Content
  title: string;                    // human-readable, max 200 chars
  description: string;              // detailed action, max 2000 chars
  summary_diff: string;             // what will change, max 4000 chars
  confidence: number;               // 0–100
  source_refs: SourceRef[];         // data used to prepare the action
  priority: ApprovalPriority;       // critical | high | medium | low

  // Target
  target_system: string;            // jira | github | gmail | confluence | notion | local_file | ...
  target_id: string;                // entity ID in target system

  // State
  status: ApprovalStatus;           // see §3.2
  revision_round: number;           // 0 on first submission, increments on each revision
  deadline: string | null;          // ISO-8601, optional hard deadline
  ttl_seconds: number | null;       // optional auto-expiry from created_at
  assigned_approvers: string[];     // user IDs who may decide (empty = any authenticated user)

  // Timestamps
  created_at: string;               // ISO-8601
  updated_at: string;               // ISO-8601
  decided_at: string | null;
  executed_at: string | null;

  // Decision
  decision: ApprovalDecision | null;
  decided_by: string | null;
  rejection_reason: string | null;
  revision_notes: string | null;
  delegated_to: string | null;

  // Execution
  execution_status: ExecutionStatus;
  execution_error: string | null;
  execution_target_response: string | null;
  retry_count: number;

  // Policy
  policy_rule_id: string | null;
}

type ApprovalItemType =
  | 'email_send'
  | 'chat_message_send'
  | 'meeting_mom_publish'
  | 'report_publish'
  | 'jira_issue_create'
  | 'jira_issue_update'
  | 'jira_issue_transition'
  | 'jira_issue_assign'
  | 'jira_issue_close'
  | 'github_pr_comment'
  | 'github_pr_approve'
  | 'github_pr_merge'
  | 'github_issue_create'
  | 'github_issue_update'
  | 'confluence_page_create'
  | 'confluence_page_update'
  | 'notion_page_create'
  | 'notion_page_update'
  | 'scope_baseline_change'
  | 'milestone_date_change'
  | 'budget_forecast_change'
  | 'risk_close'
  | 'requirement_approval'
  | 'local_file_write'
  | 'custom';

type ApprovalStatus =
  | 'draft'
  | 'pending'
  | 'revision_requested'
  | 'approved'
  | 'rejected'
  | 'cancelled'
  | 'expired'
  | 'executing'
  | 'executed'
  | 'execution_failed';

type ApprovalPriority = 'critical' | 'high' | 'medium' | 'low';

type ApprovalDecision = 'approve' | 'reject' | 'revision_requested' | 'cancel';

type ExecutionStatus = 'pending' | 'executing' | 'executed' | 'execution_failed';

interface SourceRef {
  type: string;                     // jira | github | email | calendar | file | transcript | ...
  id: string;
  title: string;
  accessed_at: string;              // ISO-8601
}

interface AgentRole {
  // As defined in the agent operating model
  // pm_commander | reporting | meeting | code_quality_guard | risk | delivery | ba | qa | dev | tech_lead | stakeholder
}
```

### 3.2 Status State Machine

```
                    ┌──────────┐
                    │  draft   │
                    └────┬─────┘
                         │ submit
                         ▼
                    ┌──────────┐     deadline/TTL     ┌─────────┐
               ┌────│ pending  │──────────────────────►│ expired │
               │    └────┬─────┘                       └─────────┘
               │         │ decide
               │    ┌────┴────────────────────┐
               │    │         │        │       │
               │    ▼         ▼        ▼       ▼
          ┌────┘ ┌──────────┐ ┌─────┐ ┌────┐ ┌──────────┐
          │      │ approved │ │rejec│ │canc│ │ revision │
          │      └────┬─────┘ │tion │ │ell │ │_requested│
          │           │       └─────┘ └────┘ └────┬─────┘
          │           │ execute                    │ re-submit
          │           ▼                            │
          │    ┌─────────────┐                     │
          │    │  executing  │                     │
          │    └──┬──────┬───┘                     │
          │       │      │                         │
          │       ▼      ▼                         │
          │  ┌────────┐ ┌───────────────┐          │
          │  │executed│ │execution_failed│         │
          │  └────────┘ └───────┬───────┘          │
          │                     │ retry            │
          │                     └──────────────────┘
          │
          └── (cancelled from draft or pending)
```

### 3.3 ApprovalPolicyRule

Rules created by the "Approve & Remember" action:

```typescript
interface ApprovalPolicyRule {
  rule_id: string;                  // UUID
  project_id: string;               // project scope
  created_by: string;               // user ID
  created_at: string;               // ISO-8601

  // Pattern
  item_type: ApprovalItemType | '*';
  target_system: string | '*';
  requested_by_role: string | '*';
  workflow_id: string | '*';

  // Scope
  scope: 'once' | 'similar_actions' | 'workflow_run';

  // Constraints
  max_uses: number | null;          // null = unlimited
  use_count: number;
  expires_at: string | null;        // ISO-8601
  priority_ceiling: ApprovalPriority; // max priority this rule auto-approves (never auto-approve critical)
  active: boolean;
}
```

### 3.4 Audit Record

Every state transition creates an append-only audit record:

```typescript
interface ApprovalAuditRecord {
  record_id: string;                // UUID
  approval_id: string;              // FK to ApprovalItem
  event_type: 'created' | 'submitted' | 'decided' | 'revision_requested' | 're_submitted' | 'approved' | 'rejected' | 'cancelled' | 'expired' | 'execution_started' | 'execution_completed' | 'execution_failed' | 'policy_matched' | 'delegated';
  actor: string;                    // user ID or agent ID
  actor_type: 'human' | 'agent' | 'system';
  timestamp: string;                // ISO-8601
  details: Record<string, unknown>; // event-specific payload
  previous_status: ApprovalStatus | null;
  new_status: ApprovalStatus | null;
}
```

## 4. Local Server API

### 4.1 Queue Endpoints

| Method | Path | Description | Auth |
|---|---|---|---|
| `POST` | `/api/approvals` | Create a new approval item (agent-facing) | Agent token |
| `GET` | `/api/approvals` | List approval items with filters | User session |
| `GET` | `/api/approvals/:id` | Get single item detail | User session |
| `POST` | `/api/approvals/:id/decide` | Submit a decision (approve/reject/revision/cancel) | User session |
| `POST` | `/api/approvals/:id/delegate` | Delegate to another approver | User session |
| `POST` | `/api/approvals/:id/re-submit` | Re-submit after revision (agent-facing) | Agent token |
| `GET` | `/api/approvals/:id/audit` | Get audit trail for an item | User session |
| `GET` | `/api/approvals/count` | Get count by status (for badges) | User session |

### 4.2 Policy Rule Endpoints

| Method | Path | Description | Auth |
|---|---|---|---|
| `POST` | `/api/approval-policies` | Create a policy rule | User session |
| `GET` | `/api/approval-policies` | List policy rules for project | User session |
| `DELETE` | `/api/approval-policies/:id` | Revoke a policy rule | User session |
| `GET` | `/api/approval-policies/match` | Check if a pending item matches any active rules | System (internal) |

### 4.3 Request/Response Shapes

#### POST /api/approvals

```json
{
  "project_id": "uuid",
  "item_type": "jira_issue_create",
  "workflow_id": "meeting-intelligence",
  "run_id": "uuid",
  "requested_by_agent": "meeting-intel-agent-001",
  "requested_by_role": "meeting",
  "title": "Create Jira issue: Follow-up on database migration decision",
  "description": "After meeting on 2026-06-19, the team decided to proceed with the phased migration approach. A follow-up issue is needed to track the migration plan.",
  "summary_diff": "Will create Jira issue PROJ-5678: 'Phased DB Migration Plan' assigned to @alex, priority High, sprint backlog.",
  "confidence": 92,
  "source_refs": [
    { "type": "transcript", "id": "meeting-2026-06-19-arch", "title": "Architecture Review Meeting", "accessed_at": "2026-06-19T16:30:00Z" },
    { "type": "jira", "id": "PROJ-1234", "title": "Database Migration Risk", "accessed_at": "2026-06-19T16:00:00Z" }
  ],
  "target_system": "jira",
  "target_id": "PROJ-5678",
  "priority": "high",
  "deadline": "2026-06-19T18:00:00Z",
  "ttl_seconds": 14400,
  "assigned_approvers": ["pm-user-001"]
}
```

#### POST /api/approvals/:id/decide

```json
{
  "decision": "approve",
  "reason": null,
  "revision_notes": null
}
```

```json
{
  "decision": "reject",
  "reason": "The issue title is too vague. Please include the specific migration phases and timeline.",
  "revision_notes": null
}
```

```json
{
  "decision": "revision_requested",
  "reason": null,
  "revision_notes": "Add a dependency on PROJ-1234 and include the phased timeline from the meeting notes."
}
```

#### Response: GET /api/approvals (list)

```json
{
  "items": [ApprovalItem],
  "total": 12,
  "counts": {
    "pending": 5,
    "revision_requested": 2,
    "expired": 1,
    "approved": 3,
    "executed": 1
  },
  "filters": {
    "status": "pending",
    "priority": null,
    "project_id": "uuid"
  }
}
```

### 4.4 WebSocket / Server-Sent Events

For real-time sync across surfaces:

| Event | Payload | Trigger |
|---|---|---|
| `approval:created` | `ApprovalItem` | New item enters queue |
| `approval:decided` | `{ approval_id, decision, decided_by }` | Any decision |
| `approval:status_changed` | `{ approval_id, old_status, new_status }` | Any state transition |
| `approval:expired` | `{ approval_id }` | TTL/deadline expiry |
| `approval:execution_completed` | `{ approval_id, execution_status }` | Mutation finished |
| `approval:count_updated` | `{ project_id, counts }` | Badge count change |

## 5. Agent Integration

### 5.1 Agent Creates Approval Item

When an agent determines that a workflow action requires human approval:

1. The agent calls `POST /api/approvals` with the full item payload.
2. The runtime checks active `ApprovalPolicyRule` entries for auto-approval:
   - Match against `item_type`, `target_system`, `requested_by_role`, `workflow_id`
   - Check `priority_ceiling` — never auto-approve items above the ceiling
   - Check `max_uses` and `expires_at`
   - If a rule matches: auto-approve the item, record `policy_matched` audit event, proceed to execution
   - If no rule matches: item enters `pending` state
3. The runtime sends `approval:created` event to all connected surfaces.
4. The runtime checks if the originating workflow run should block on this approval:
   - If the workflow requires the approval before the next step, the workflow pauses.
   - If the workflow can continue in parallel (e.g., generating a report draft while waiting for publish approval), it continues.

### 5.2 Agent Re-Submits After Revision

1. The agent calls `POST /api/approvals/:id/re-submit` with updated content fields.
2. The runtime verifies:
   - The item is in `revision_requested` status
   - `revision_round` < 3
   - The content fields have changed (diff check on `summary_diff`)
3. The runtime increments `revision_round`, updates content, transitions to `pending`.
4. The runtime sends `approval:status_changed` event.

### 5.3 Agent Receives Decision

When a decision is made:

1. The runtime records the decision in the approval item and audit log.
2. If `approved`: the runtime triggers execution via the appropriate MCP connector or local action.
3. If `rejected`: the runtime notifies the originating agent with the rejection reason. The agent may not retry the same action.
4. If `revision_requested`: the runtime notifies the originating agent with revision notes.
5. The workflow engine resumes if it was blocked on this approval.

### 5.4 Agent Escalation (Revision Limit)

After the 3rd revision round:

1. The runtime transitions the item to `revision_requested` but sets a flag `escalation_pending`.
2. The runtime creates a new escalation `ApprovalItem`:
   - `item_type`: `custom`
   - `title`: `Escalation: [original title]`
   - `description`: Includes the revision history and both perspectives.
   - `priority`: same as original or upgraded by one level
   - `requested_by_agent`: `pm_commander`
   - `assigned_approvers`: PM owner or designated escalation contact
3. The original item remains in `revision_requested` state until the escalation is resolved.

## 6. Desktop Integration

### 6.1 State Management

The desktop app fetches approval state from the local server API. It does not maintain a local approval store — the server is the source of truth.

- `GET /api/approvals/count` is polled every 30 seconds or triggered by WebSocket events.
- `GET /api/approvals` is fetched when the user navigates to the Approvals view.
- `GET /api/approvals/:id` is fetched when the user selects an item.
- `POST /api/approvals/:id/decide` is called when the user acts.

### 6.2 Sidebar Integration

The `ActiveView` type in the desktop store must include `"approvals"` as a valid view. The sidebar navigation sections must add an "Approvals" item under Operations with a live badge component.

### 6.3 Daily Brief Integration

The "Pending Approvals" card in `DailyBriefTab` links to the approvals view and passes a filter for `pending` status items.

## 7. Mobile Integration

### 7.1 State Management

Same as desktop — the mobile app reads from the local server API. Offline mode caches the last-fetched `pending` items in the device's encrypted local storage.

### 7.2 ApprovalsScreen Replacement

The current `ApprovalsScreen` mock data must be replaced with real API integration. The screen must support:
- Pull-to-refresh
- Swipe actions (approve/reject)
- Push notification deep-linking
- Offline indicator

### 7.3 Push Notifications

The mobile app must register for push notifications and subscribe to:
- `approval:created` events where `priority` is `critical` or `high`
- `approval:status_changed` events where the item was previously assigned to the current user

## 8. Chat Gateway Integration

### 8.1 Approval Card Format

The chat gateway translates `ApprovalItem` into a platform-specific interactive message:

**Slack:**
```json
{
  "blocks": [
    {
      "type": "section",
      "text": {
        "type": "mrkdwn",
        "text": "*Approval Required*\n*Title:* Create Jira issue: Follow-up on database migration\n*Workflow:* Meeting Intelligence\n*Priority:* High\n*Confidence:* 92%\n*Target:* Jira PROJ-5678"
      }
    },
    {
      "type": "actions",
      "elements": [
        { "type": "button", "text": { "type": "plain_text", "text": "Approve" }, "style": "primary", "action_id": "approve_{approval_id}" },
        { "type": "button", "text": { "type": "plain_text", "text": "Reject" }, "style": "danger", "action_id": "reject_{approval_id}" },
        { "type": "button", "text": { "type": "plain_text", "text": "Details" }, "action_id": "details_{approval_id}" }
      ]
    }
  ]
}
```

**Telegram:**
```json
{
  "text": "Approval Required\n\nTitle: Create Jira issue: Follow-up on database migration\nWorkflow: Meeting Intelligence\nPriority: High\nConfidence: 92%\nTarget: Jira PROJ-5678",
  "reply_markup": {
    "inline_keyboard": [
      [
        { "text": "Approve", "callback_data": "approve_{approval_id}" },
        { "text": "Reject", "callback_data": "reject_{approval_id}" },
        { "text": "Details", "callback_data": "details_{approval_id}" }
      ]
    ]
  }
}
```

### 8.2 Identity Verification

The chat gateway must:
1. Map the chat platform user ID to an internal user ID via a configured mapping.
2. Verify the responding user is in the `assigned_approvers` list.
3. Reject decisions from unauthorized users with a message: "You are not designated to approve this item."

### 8.3 Concurrency Handling

For multi-approver items:
- The gateway tracks individual approval responses.
- A running tally is displayed in a thread or reply chain.
- Execution is triggered when the threshold is met.
- If a reject comes in before the threshold is met, the item is rejected (any single reject blocks the item).

## 9. SQLite Schema

### 9.1 approval_items

```sql
CREATE TABLE approval_items (
  approval_id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  item_type TEXT NOT NULL,
  workflow_id TEXT NOT NULL,
  run_id TEXT NOT NULL,
  requested_by_agent TEXT NOT NULL,
  requested_by_role TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  summary_diff TEXT NOT NULL,
  confidence INTEGER NOT NULL CHECK (confidence BETWEEN 0 AND 100),
  source_refs TEXT NOT NULL,         -- JSON array
  priority TEXT NOT NULL CHECK (priority IN ('critical', 'high', 'medium', 'low')),
  target_system TEXT NOT NULL,
  target_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft',
  revision_round INTEGER NOT NULL DEFAULT 0,
  deadline TEXT,
  ttl_seconds INTEGER,
  assigned_approvers TEXT NOT NULL DEFAULT '[]',  -- JSON array
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  decided_at TEXT,
  executed_at TEXT,
  decision TEXT,
  decided_by TEXT,
  rejection_reason TEXT,
  revision_notes TEXT,
  delegated_to TEXT,
  execution_status TEXT NOT NULL DEFAULT 'pending',
  execution_error TEXT,
  execution_target_response TEXT,
  retry_count INTEGER NOT NULL DEFAULT 0,
  policy_rule_id TEXT,
  summary_diff_hash TEXT            -- SHA-256 of summary_diff for tamper detection
);

CREATE INDEX idx_approval_items_project_status ON approval_items(project_id, status);
CREATE INDEX idx_approval_items_status_priority ON approval_items(status, priority);
CREATE INDEX idx_approval_items_deadline ON approval_items(deadline) WHERE deadline IS NOT NULL AND status = 'pending';
CREATE INDEX idx_approval_items_assigned ON approval_items(assigned_approvers);
```

### 9.2 approval_audit_log

```sql
CREATE TABLE approval_audit_log (
  record_id TEXT PRIMARY KEY,
  approval_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  actor TEXT NOT NULL,
  actor_type TEXT NOT NULL CHECK (actor_type IN ('human', 'agent', 'system')),
  timestamp TEXT NOT NULL,
  details TEXT NOT NULL DEFAULT '{}',   -- JSON
  previous_status TEXT,
  new_status TEXT,
  FOREIGN KEY (approval_id) REFERENCES approval_items(approval_id)
);

CREATE INDEX idx_approval_audit_approval ON approval_audit_log(approval_id);
CREATE INDEX idx_approval_audit_timestamp ON approval_audit_log(timestamp);
```

### 9.3 approval_policy_rules

```sql
CREATE TABLE approval_policy_rules (
  rule_id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL,
  item_type TEXT NOT NULL DEFAULT '*',
  target_system TEXT NOT NULL DEFAULT '*',
  requested_by_role TEXT NOT NULL DEFAULT '*',
  workflow_id TEXT NOT NULL DEFAULT '*',
  scope TEXT NOT NULL CHECK (scope IN ('once', 'similar_actions', 'workflow_run')),
  max_uses INTEGER,
  use_count INTEGER NOT NULL DEFAULT 0,
  expires_at TEXT,
  priority_ceiling TEXT NOT NULL DEFAULT 'high',
  active INTEGER NOT NULL DEFAULT 1
);

CREATE INDEX idx_approval_policy_project ON approval_policy_rules(project_id, active);
```

## 10. Security Constraints Summary

| Constraint | Implementation |
|---|---|
| Append-only audit | SQLite WAL mode + application-level enforcement: no UPDATE/DELETE on `approval_audit_log` |
| Tamper detection | `summary_diff_hash` stored at creation; re-computed and verified at decision time |
| Offline encryption | Mobile queue encrypted with device keychain; server rejects items with `created_at` older than 24 hours |
| Rate limiting | 60 decisions/minute/user enforced at the API layer |
| Max revision rounds | 3, enforced at the `re-submit` endpoint |
| Auto-approval ceiling | Policy rules cannot auto-approve `critical` priority items |
| Identity verification | Chat gateway maps platform IDs to internal IDs; desktop/mobile use session tokens |
| No secrets in items | Validation layer rejects items where `description` or `summary_diff` contains patterns matching API keys, tokens, or passwords |
| Concurrent decision resolution | First-write-wins at the database level using optimistic concurrency control (check `updated_at` hasn't changed since read) |

## 11. Open Questions

1. Should the SQLite schema use soft-delete for revoked policy rules, or is `active = 0` sufficient?
2. Should the WebSocket event system use Server-Sent Events (simpler, unidirectional) or WebSocket (bidirectional, more complex)? Recommendation: SSE for desktop/mobile, WebSocket for chat gateway.
3. Should the `approval_items` table support a `metadata` JSON column for workflow-specific extra fields, or should each workflow use a separate `approval_extras` table?
4. How should the server handle a race condition where the mobile app and desktop app both attempt to decide the same item simultaneously? Current design uses optimistic concurrency, but should the UI also lock the item when one surface opens the detail view?
5. Should policy rules support a `blacklist` pattern (auto-reject matching items) in addition to auto-approve?
6. What is the retention policy for `approval_audit_log` entries? Current design assumes indefinite retention, but disk usage may require archival after N years.
