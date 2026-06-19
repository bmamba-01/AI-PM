# Approval Queue UX Specification

**Date:** 2026-06-19  
**Status:** Design draft  
**Audience:** Runtime implementers (desktop, mobile, chat gateway), PM owner  
**References:** [approval-policy.md](../operating-model/approval-policy.md), [design spec §14.4](../superpowers/specs/2026-06-18-ai-pm-toolkit-design.md), [mcp-implementation-matrix.md](../architecture/mcp-implementation-matrix.md)

## 1. Purpose

Define a consistent approval queue experience across desktop, mobile, and chat surfaces so that every external mutation routed through PM Commander, role agents, or specialist agents follows a single human-gate before execution.

This document covers the item model, view requirements per surface, the chat inline flow, audit expectations, rejection/revision handling, and security constraints. It does not prescribe implementation packages — those belong in the runtime contract.

## 2. Approval Item States

Every approval item moves through a deterministic state machine. No state may be skipped.

### 2.1 States

| State | Meaning | Next states |
|---|---|---|
| `draft` | Agent prepared the action but it has not yet entered the queue. | `pending`, `cancelled` |
| `pending` | Awaiting human decision. Visible in the approval queue on all surfaces. | `approved`, `rejected`, `revision_requested`, `expired` |
| `revision_requested` | Human requested a change. Agent must revise and re-submit. | `pending` (re-submitted), `cancelled` |
| `approved` | Human approved the action. Runtime may now execute the mutation. | Terminal (for this cycle) |
| `rejected` | Human rejected the action without requesting revision. | Terminal |
| `cancelled` | Agent or human cancelled the item before decision. | Terminal |
| `expired` | Item exceeded its deadline or TTL without decision. | Terminal |
| `executing` | Approved mutation is in-flight against the target system. | `executed`, `execution_failed` |
| `executed` | Mutation completed successfully. | Terminal |
| `execution_failed` | Mutation attempted but failed (network, auth, target error). | `pending` (retry), `cancelled` |

### 2.2 State Transition Rules

- An item in `draft` must not appear in any queue view. It is internal to the agent.
- `pending` items are ordered by priority (critical > high > medium > low) then by `created_at` ascending (oldest first).
- An item in `revision_requested` must not be re-submitted by the agent without substantive content changes. The runtime should verify that the draft diff is non-empty.
- `expired` items are auto-transitioned by the runtime when `deadline` or `ttl_seconds` elapses. They appear in a separate "Expired" filter but remain auditable.
- `executing` state is visible only on surfaces that can track async status (desktop full view, chat). On mobile, `approved` transitions directly to a "sent" indicator once the runtime confirms execution.

### 2.3 Priority Levels

Derived from the originating workflow and action type:

| Priority | Typical sources | SLA guidance |
|---|---|---|
| `critical` | Risk escalation, production incident response, emergency scope change | 15 minutes |
| `high` | Client report publish, PR merge approval, milestone date change | 1 hour |
| `medium` | Meeting MoM publish, Jira issue create/update, budget forecast update | 4 hours |
| `low` | Draft report review, low-risk scope clarification, non-urgent PR comment | 24 hours |

SLA is guidance for urgency display, not hard enforcement. Only `deadline` field triggers `expired` transition.

## 3. Desktop View Requirements

### 3.1 Entry Points

The desktop approval queue is accessible from three locations:

1. **Sidebar navigation** — a dedicated "Approvals" item under the Operations section, with a live badge showing the count of `pending` items.
2. **Daily Brief "Pending Approvals" card** — the existing card in [DailyBriefTab.tsx](../../packages/desktop/src/components/tabs/DailyBriefTab.tsx:87) becomes a link to the full approvals view, not just a "Review" ghost button.
3. **Global notification bell** — the header area shows a pulsing indicator when critical or high-priority items are pending.

### 3.2 Queue View Layout

The approvals view uses a three-column layout on desktop:

**Left panel — Queue list (filterable)**
- Filter tabs: All | Pending | Revision Requested | Expired | Completed
- Each row shows: priority badge, title (truncated), source workflow label, age, requester agent name
- Clicking a row opens the detail in the center panel
- Bulk selection checkbox for batch approve/reject (same workflow, same target system only)

**Center panel — Item detail**
- Title and description (the proposed action in plain language)
- Source workflow badge (e.g., "Meeting Intelligence", "Reporting", "Code Quality Guard")
- Requesting agent name and role
- Target system and target ID (e.g., "Jira — PROJ-1234", "GitHub PR #234")
- Confidence score (color-coded: green ≥80, amber 60–79, red <60)
- Human-readable summary of what will change
- Diff preview or form preview when available (PR comment draft, email body, Jira field changes)
- Source references and audit trail (which MCP data was used)
- Action buttons at the bottom

**Right panel — Audit context (collapsible)**
- Approval record history for this item (previous revision rounds if any)
- Related approval items from the same workflow run
- Link to the originating audit log entry

### 3.3 Action Buttons

| Button | Behavior |
|---|---|
| **Approve** | Transitions to `approved`. Runtime executes the mutation. Button disabled until detail is fully loaded. |
| **Approve & Remember** | Transitions to `approved` and creates a policy rule: future similar actions from the same agent/workflow/target pattern are auto-approved (subject to per-connector policy). Shows a confirmation modal explaining the scope of the remembered rule. |
| **Reject** | Transitions to `rejected`. Opens a required reason field (min 10 chars). Agent receives rejection reason in its context. |
| **Request Revision** | Transitions to `revision_requested`. Opens a required comment field describing what needs to change (min 10 chars). Agent receives revision instructions and re-submits through the queue. |
| **Delegate** | Transfers the item to another human approver. Requires target user selection and optional note. Audit records the transfer. |

### 3.4 Keyboard Shortcuts

- `A` — Approve selected item
- `R` — Reject selected item
- `V` — Request revision
- `D` — Delegate
- `↑/↓` — Navigate queue list
- `Enter` — Open detail of selected item
- `Esc` — Close detail panel

### 3.5 Visual Requirements

- Priority colors: critical = red pulse, high = orange, medium = amber, low = gray
- Status badges match the approval-policy color language
- Confidence score uses a filled arc indicator (green/amber/red)
- Approval action buttons use the existing glass-card style from the desktop app
- Expired items are dimmed but not hidden

## 4. Mobile View Requirements

### 4.1 Entry Points

Mobile does not mirror the desktop sidebar. Approval access comes from:

1. **Bottom tab bar** — "Approvals" tab with a count badge (replaces the current placeholder in [ApprovalsScreen.tsx](../../packages/mobile/src/screens/ApprovalsScreen.tsx)).
2. **Push notification** — critical and high-priority items trigger a push notification. Tapping opens the detail screen for that item.
3. **Dashboard card** — the mobile dashboard shows a "Pending Approvals" summary card (max 3 items, "See all" link).

### 4.2 Queue View Layout

Mobile uses a single-column stacked list:

- **Filter chips** at the top: All | Pending | Urgent | Done
- Each list item shows: priority dot, title, source workflow, age, and a quick-action area
- Swipe-right reveals Approve action (green background)
- Swipe-left reveals Reject action (red background)
- Tap opens the full detail screen

### 4.3 Detail Screen

The mobile detail screen is a scrollable full-screen view:

- Title and description
- Source workflow badge
- Target system and target ID
- Confidence score (compact arc)
- Change preview (collapsible, defaults to collapsed on mobile to save space)
- Source references (collapsible)
- Action buttons at the bottom (fixed position):
  - **Approve** (primary, green)
  - **Reject** (destructive, red, opens reason input sheet)
  - **Request Revision** (secondary, opens comment input sheet)
  - **Delegate** (tertiary link)

### 4.4 Offline Behavior

- Mobile must display locally cached `pending` items when offline.
- Approve/Reject/Revision actions are queued and synced when connectivity resumes.
- Visual indicator shows "Queued — will sync when online" on actions taken offline.
- No mutation is executed against external systems while offline.

## 5. Chat Approval Flow

### 5.1 Surfaces

Chat approval applies to Telegram, Slack, Teams, Discord, and web chat adapters through the chat gateway.

### 5.2 Inline Approval

When an agent queues an approval item and the user is in a chat context:

1. The agent sends an approval request card/message to the chat surface containing:
   - Action title
   - One-line summary of what will happen
   - Source workflow
   - Confidence score
   - Target system and ID
   - Inline buttons: **Approve** | **Reject** | **Details**

2. Tapping **Approve** executes the mutation and sends a confirmation message.
3. Tapping **Reject** opens a reply prompt for the rejection reason (required, min 10 chars).
4. Tapping **Details** sends a longer-form message with the full change preview, source references, and audit context.

### 5.3 Ephemeral Messages

- Approval request messages in Slack and Teams should use ephemeral messages visible only to the approver when possible.
- Telegram and Discord do not support ephemeral messages — approval requests use the channel/thread the agent is operating in, with a note that only the designated approver should act.
- All chat surfaces must include the approval item ID in the message so the runtime can correlate the response.

### 5.4 Multi-Approver

- By default, a single designated approver receives the chat approval message.
- For high-risk items (critical priority or mutations against production systems), the agent can request multi-approval — requiring N of M designated approvers to approve before execution.
- The chat gateway must track individual approvals and only execute when the threshold is met.

### 5.5 Timeout

- Chat approval items have a configurable TTL (default 4 hours for medium, 1 hour for high, 15 minutes for critical).
- On expiry, a follow-up message is sent: "Approval for [title] expired without decision. Item moved to expired state."
- Expired items can be re-activated from desktop or mobile by re-queuing.

## 6. Audit Fields

Every approval item must carry these audit fields from creation through execution:

### 6.1 Item-Level Audit

```yaml
approval_id: string              # UUID, immutable
item_type: string                # email_send | jira_issue | pr_comment | report_publish | scope_change | budget_change | risk_close | ...
workflow_id: string              # originating workflow
run_id: string                   # workflow run ID
project_id: string               # project scope
requested_by_agent: string       # agent ID that prepared the action
requested_by_role: string        # agent role (pm_commander, reporting, code_quality_guard, ...)
requested_at: ISO-8601           # when the item entered the queue
priority: critical|high|medium|low
title: string                    # human-readable action title
description: string              # detailed action description
summary_diff: string             # what will change (plain text or markdown)
confidence: 0-100                # agent confidence in the action
source_refs:                     # which data the agent used
  - type: jira|github|email|calendar|file|transcript|notion|confluence
    id: string
    accessed_at: ISO-8601
target_system: string            # jira|github|gmail|confluence|notion|local_file
target_id: string                # entity ID in the target system
```

### 6.2 Decision Audit

```yaml
decision: approve|reject|revision_requested|cancel
decided_by: string               # human user ID
decided_at: ISO-8601
reason: string                   # required for reject and revision_requested (min 10 chars)
revision_notes: string           # optional additional context for revision
delegated_to: string|null        # if delegated, target user
delegated_at: ISO-8601|null
```

### 6.3 Execution Audit

```yaml
execution_started_at: ISO-8601|null
execution_completed_at: ISO-8601|null
execution_status: pending|executing|executed|execution_failed
execution_error: string|null     # error message if execution_failed
execution_target_response: string|null  # target system response/reference
retry_count: integer
```

### 6.4 Policy Rule Audit (for "Approve & Remember")

```yaml
policy_rule_id: string|null
policy_scope: once|similar_actions|workflow_run
policy_pattern: string|null      # machine-readable pattern (agent + workflow + target_system + action_type)
policy_created_at: ISO-8601|null
policy_created_by: string|null
```

## 7. Rejection and Revision Flow

### 7.1 Rejection

1. Human selects Reject and provides a reason (min 10 chars).
2. Item transitions to `rejected` and becomes terminal.
3. The rejection reason is recorded in the decision audit.
4. The originating agent receives the rejection context in its task output.
5. The agent may propose an alternative only if there is a materially different approach — it must not retry the same action unchanged.
6. A rejected item cannot be re-opened. A new item must be submitted if the agent revises the approach.

### 7.2 Revision Request

1. Human selects Request Revision and provides change instructions (min 10 chars).
2. Item transitions to `revision_requested`.
3. The originating agent receives the revision instructions and must:
   - Modify the draft/action to address the instructions
   - Re-submit through the queue (item transitions back to `pending`)
   - The re-submitted item preserves the original `approval_id` but increments a `revision_round` counter
4. The queue view shows the revision history: original submission → revision 1 → revision 2, etc.
5. Maximum revision rounds: 3. After the 3rd revision, the item is escalated to PM Commander for manual resolution (a new escalation item is created).

### 7.3 Expiry

1. When the item's `deadline` or TTL elapses, the runtime transitions it to `expired`.
2. The agent is notified: the action will not be executed.
3. The expired item remains in the audit log.
4. To re-activate, a human must manually re-queue the item from the desktop or mobile approvals view.

## 8. Security Constraints

### 8.1 Authentication

- Desktop: the local server trusts the local user session. No additional auth needed for the approval action itself, but the session must be valid.
- Mobile: the mobile app authenticates against the local server with a device token. Approval actions require the device token to be valid and not revoked.
- Chat: the chat gateway authenticates the user via the chat platform's identity provider (OAuth or platform token). Only the designated approver(s) may act on an approval item.

### 8.2 Authorization

- An approval item can only be decided by the user(s) designated in its `assigned_approvers` field (set by the originating agent or by policy).
- Desktop allows any logged-in user to approve unless the item has restricted approvers.
- Mobile requires the device to be registered and the user to be authenticated.
- Chat requires the responding user to match the `assigned_approvers` list. The chat gateway must verify identity before executing.

### 8.3 Data Exposure

- Approval items must not include raw secrets, tokens, or credentials in their description or diff preview.
- Source references must use IDs and titles, not raw API responses with embedded tokens.
- The diff preview may contain business-sensitive data (code diffs, email drafts) — it must not be logged in plaintext in the audit log beyond what is necessary for the approval record. Hash the full diff and store the hash; store a human-readable summary.
- Chat approval messages must not expose internal system details beyond what is necessary for the human to make a decision.

### 8.4 Rate Limiting

- Per-user approval action rate limit: 60 actions per minute per user.
- Per-item re-queue limit: 3 revision rounds (see §7.2).
- Per-session concurrent approval items: 50 max visible in queue; older items are paginated.

### 8.5 Tamper Prevention

- The approval record (approval_id, decided_by, decided_at, decision) is append-only. No field may be modified after recording.
- Execution audit fields are append-only.
- The runtime must sign or hash-link audit records to prevent silent modification.

### 8.6 Offline Security

- Offline approval actions on mobile are queued locally and must be encrypted at rest using the device's secure enclave or OS keychain.
- On sync, the queued action is replayed against the server with a timestamp. The server may reject stale actions (e.g., if the item has already expired or been decided by another path).
- Offline queue TTL: 24 hours. After 24 hours without sync, queued actions are discarded and the user is notified.

## 9. Cross-Surface Consistency Rules

1. The approval item model is identical across desktop, mobile, and chat. The runtime contract (see `docs/architecture/approval-queue-runtime-contract.md`) defines the canonical schema.
2. A decision made on any surface is immediately reflected on all other surfaces via the local server's state sync.
3. Concurrent decisions on different surfaces for the same item are resolved by first-write-wins: the first decision recorded by the server is authoritative. The losing surface receives a conflict notification.
4. The queue count badge on all surfaces must be consistent within 5 seconds of a state change (target; degraded to 30 seconds under heavy load).
5. All surfaces must display the same item ordering for the same filter view.

## 10. Open Questions

1. Should "Approve & Remember" policy rules be per-project or global? The current design assumes per-project, but a PM managing multiple projects may want cross-project rules.
2. Should the desktop view support keyboard-only approval workflows (full vim-style navigation)?
3. How should the chat gateway handle approval items that are generated while the user is offline in chat? Should the agent hold the item indefinitely or fall back to desktop/mobile notification?
4. Should the mobile detail screen show the full code diff for code-quality-guard PR approvals, or only a summary with a "View full diff" deep link to desktop?
5. What is the maximum number of policy rules a user can create? Should there be a governance review for rules that auto-approve critical-priority items?
6. Should multi-approver chat flows require sequential or parallel approval? (Current design assumes parallel.)
