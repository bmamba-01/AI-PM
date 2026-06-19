# Approval Queue Test Plan

**Date:** 2026-06-19  
**Status:** Design draft  
**Audience:** Main thread Task 4 implementer, QA  
**References:** [approval-queue-runtime-contract.md](../architecture/approval-queue-runtime-contract.md), [approval-queue-ux.md](approval-queue-ux.md), [approval-queue-cli-spec.md](approval-queue-cli-spec.md), [approval-item.schema.json](../../schemas/approval/approval-item.schema.json)

---

## 1. Scope

This test plan covers the **Approval Queue Runtime Foundation** defined in Task 4 of the implementation plan. It validates the core approval queue logic in `packages/core/src/runtime/approvalQueue.ts` and its file-backed store under `.ai-pm/approvals.json`.

### What Is Tested

| Area | Coverage |
|---|---|
| **ApprovalItem data model** | Create, read, update. Field validation, type coercion, required/optional fields. |
| **State machine transitions** | All 10 states and every valid/invalid transition per the state diagram. |
| **API endpoints** | 8 queue endpoints + 4 policy endpoints (happy path, auth, validation, not-found, rate-limit). |
| **Policy rule matching** | Pattern match on item_type, target_system, role. Wildcards, expiry, max_uses, revocation. |
| **Revision flow** | Max 3 rounds, diff check on re-submit, escalation to PM Commander. |
| **Expiry and TTL** | Deadline-based expiry, TTL-based expiry, expired-item visibility. |
| **Error handling** | 7 categories from CLI spec: connection, not-found, invalid-state, validation, unauthorized, rate-limit, JSON error shape. |
| **Audit trail** | Append-only records, tamper detection, hash integrity, trail completeness. |

### What Is NOT Tested (Out of Scope for Task 4)

- Desktop UI rendering (Agent 6 scope)
- Mobile React Native components
- Chat gateway integration
- External MCP connector execution (Jira, GitHub, Gmail)
- SQLite migration (file-backed store only in Task 4)
- Multi-user concurrent access beyond optimistic concurrency
- Push notification delivery

---

## 2. Test Scenarios

### 2.1 Data Model Tests

#### AQ-001: Create approval item with all required fields

| Field | Value |
|---|---|
| **Precondition** | Clean approval store (empty `.ai-pm/approvals.json` or nonexistent file) |
| **Steps** | 1. Call `createApprovalItem()` with all required fields (project_id, item_type, workflow_id, run_id, requested_by_agent, requested_by_role, title, description, summary_diff, confidence, source_refs, priority, target_system, target_id) |
| **Expected** | Item created with generated `approval_id` (UUID v4), `status` = `pending`, `revision_round` = 0, `created_at` and `updated_at` set to current ISO-8601, `execution_status` = `pending`, `retry_count` = 0 |
| **Spec ref** | Runtime contract §3.1 (ApprovalItem fields), Task 4 acceptance (audit-friendly fields) |

#### AQ-002: Create approval item with optional fields

| Field | Value |
|---|---|
| **Precondition** | Clean approval store |
| **Steps** | 1. Call `createApprovalItem()` with all required fields plus optional: `deadline`, `ttl_seconds`, `assigned_approvers`, `policy_rule_id` |
| **Expected** | Item created with all optional fields stored. `deadline` = provided ISO-8601, `ttl_seconds` = provided number, `assigned_approvers` = provided array, `policy_rule_id` = provided string |
| **Spec ref** | Runtime contract §3.1 (optional fields: deadline, ttl_seconds, assigned_approvers, policy_rule_id) |

#### AQ-003: Reject item missing required field (validation error)

| Field | Value |
|---|---|
| **Precondition** | Clean approval store |
| **Steps** | 1. Call `createApprovalItem()` omitting `title` (required field) |
| **Expected** | Throws validation error: `"title is required"` or equivalent. Item not created. Store unchanged. |
| **Spec ref** | CLI spec §5.4 (validation errors), Runtime contract §3.1 (required fields) |

#### AQ-004: Reject item with confidence > 100

| Field | Value |
|---|---|
| **Precondition** | Clean approval store |
| **Steps** | 1. Call `createApprovalItem()` with `confidence: 101` |
| **Expected** | Throws validation error: `"confidence must be between 0 and 100"`. Item not created. |
| **Spec ref** | Runtime contract §3.1 (confidence: 0–100) |

#### AQ-005: Reject item with invalid status enum

| Field | Value |
|---|---|
| **Precondition** | Clean approval store |
| **Steps** | 1. Attempt to create item with `status: "invalid_status"` directly (bypassing the state machine) |
| **Expected** | Throws validation error: `"invalid_status is not a valid ApprovalStatus"`. Item not created. |
| **Spec ref** | Runtime contract §3.1 (ApprovalStatus enum), UX spec §2.1 (valid states) |

#### AQ-006: Read item by ID

| Field | Value |
|---|---|
| **Precondition** | Store contains one item with known `approval_id` |
| **Steps** | 1. Call `getApprovalItem(approval_id)` |
| **Expected** | Returns the complete `ApprovalItem` object with all fields matching what was stored |
| **Spec ref** | Runtime contract §3.1, CLI spec §3.2 (show command) |

#### AQ-007: Read non-existent item (404)

| Field | Value |
|---|---|
| **Precondition** | Clean approval store |
| **Steps** | 1. Call `getApprovalItem("non-existent-uuid")` |
| **Expected** | Returns `null` or throws error with code `ITEM_NOT_FOUND`. Does not crash. |
| **Spec ref** | CLI spec §5.2 (item not found error) |

#### AQ-008: Update item status

| Field | Value |
|---|---|
| **Precondition** | Store contains one item in `pending` status |
| **Steps** | 1. Call `updateApprovalItem(id, { status: "approved", decided_by: "pm-user-001", decided_at: "..." })` |
| **Expected** | Item updated: `status` = `approved`, `decided_by` = `pm-user-001`, `decided_at` set, `updated_at` refreshed. Other fields unchanged. |
| **Spec ref** | Runtime contract §3.1 (state fields), UX spec §2.2 (transition rules) |

#### AQ-009: Update item with concurrent conflict (optimistic concurrency)

| Field | Value |
|---|---|
| **Precondition** | Store contains one item in `pending` status, version = 1 |
| **Steps** | 1. Read item (version = 1) in "session A" 2. Read item (version = 1) in "session B" 3. Session A: approve item (writes version 2) 4. Session B: approve item (writes, but version is now 2) |
| **Expected** | Session B gets a conflict error: `"item was modified by another operation"`. Session A's write is preserved. |
| **Spec ref** | UX spec §9.3 (concurrent decisions, first-write-wins) |

---

### 2.2 State Machine Tests

#### AQ-010: draft → pending (submit)

| Field | Value |
|---|---|
| **Precondition** | Item in `draft` status |
| **Steps** | 1. Call `submitApproval(id)` |
| **Expected** | Status changes to `pending`. `created_at` and `updated_at` updated. Item appears in list queries. |
| **Spec ref** | Runtime contract §3.2 (state diagram: draft → pending), UX spec §2.1 (draft → pending) |

#### AQ-011: pending → approved (approve)

| Field | Value |
|---|---|
| **Precondition** | Item in `pending` status |
| **Steps** | 1. Call `decideApproval(id, "approve", { decided_by: "pm-user-001" })` |
| **Expected** | Status changes to `approved`. `decided_at` set. `decision` = `"approve"`. `decided_by` = `pm-user-001`. `execution_status` remains `pending` (awaiting execution). |
| **Spec ref** | Runtime contract §3.2 (pending → approved), UX spec §2.1 (approved state) |

#### AQ-012: pending → rejected (reject with reason)

| Field | Value |
|---|---|
| **Precondition** | Item in `pending` status |
| **Steps** | 1. Call `decideApproval(id, "reject", { decided_by: "pm-user-001", reason: "Title is too vague, needs specifics" })` |
| **Expected** | Status changes to `rejected`. `decided_at` set. `decision` = `"reject"`. `rejection_reason` = provided reason. Terminal state. |
| **Spec ref** | Runtime contract §3.2 (pending → rejected), UX spec §7.1 (rejection flow) |

#### AQ-013: pending → revision_requested (request revision with notes)

| Field | Value |
|---|---|
| **Precondition** | Item in `pending` status |
| **Steps** | 1. Call `decideApproval(id, "revision_requested", { decided_by: "pm-user-001", notes: "Add budget impact analysis and timeline" })` |
| **Expected** | Status changes to `revision_requested`. `revision_notes` = provided notes. `revision_round` remains 0 (not incremented until re-submit). |
| **Spec ref** | Runtime contract §3.2 (pending → revision_requested), UX spec §7.2 (revision request) |

#### AQ-014: pending → expired (TTL elapses)

| Field | Value |
|---|---|
| **Precondition** | Item in `pending` status with `ttl_seconds: 1` (1 second) or `deadline` set to 1 second in the future |
| **Steps** | 1. Wait for TTL/deadline to elapse (or mock time) 2. Call `checkExpiredItems()` or equivalent |
| **Expected** | Status changes to `expired`. Terminal state. Item no longer appears in `pending` filter but appears in `expired` filter. |
| **Spec ref** | Runtime contract §3.2 (pending → expired), UX spec §2.2 (expired transition), UX spec §7.3 (expiry flow) |

#### AQ-015: pending → cancelled (cancel)

| Field | Value |
|---|---|
| **Precondition** | Item in `pending` status |
| **Steps** | 1. Call `cancelApproval(id)` |
| **Expected** | Status changes to `cancelled`. Terminal state. |
| **Spec ref** | Runtime contract §3.2 (draft/pending → cancelled), UX spec §2.1 (cancelled state) |

#### AQ-016: revision_requested → pending (re-submit after revision)

| Field | Value |
|---|---|
| **Precondition** | Item in `revision_requested` status, `revision_round` = 0 |
| **Steps** | 1. Call `resubmitApproval(id, { summary_diff: "Updated with budget analysis and timeline" })` |
| **Expected** | Status changes to `pending`. `revision_round` increments to 1. `summary_diff` updated. `updated_at` refreshed. |
| **Spec ref** | Runtime contract §3.2 (revision_requested → pending), UX spec §7.2 (re-submit) |

#### AQ-017: approved → executing (execution starts)

| Field | Value |
|---|---|
| **Precondition** | Item in `approved` status |
| **Steps** | 1. Call `startExecution(id)` |
| **Expected** | Status changes to `executing`. `execution_status` = `executing`. `execution_started_at` set. |
| **Spec ref** | Runtime contract §3.2 (approved → executing), UX spec §2.1 (executing state) |

#### AQ-018: executing → executed (execution succeeds)

| Field | Value |
|---|---|
| **Precondition** | Item in `executing` status |
| **Steps** | 1. Call `completeExecution(id, { target_response: "Jira issue PROJ-5678 created" })` |
| **Expected** | Status changes to `executed`. `execution_status` = `executed`. `execution_completed_at` set. `execution_target_response` = provided response. Terminal state. |
| **Spec ref** | Runtime contract §3.2 (executing → executed), UX spec §2.1 (executed state) |

#### AQ-019: executing → execution_failed (execution fails)

| Field | Value |
|---|---|
| **Precondition** | Item in `executing` status |
| **Steps** | 1. Call `failExecution(id, { error: "GitHub API returned 403: token lacks merge permission" })` |
| **Expected** | Status changes to `execution_failed`. `execution_status` = `execution_failed`. `execution_error` = provided error. `retry_count` incremented. |
| **Spec ref** | Runtime contract §3.2 (executing → execution_failed), UX spec §2.1 (execution_failed state) |

#### AQ-020: execution_failed → pending (retry)

| Field | Value |
|---|---|
| **Precondition** | Item in `execution_failed` status |
| **Steps** | 1. Call `retryExecution(id)` |
| **Expected** | Status changes to `pending`. `execution_status` resets to `pending`. `execution_error` cleared. Item re-enters the queue. |
| **Spec ref** | Runtime contract §3.2 (execution_failed → pending), UX spec §2.1 (retry from execution_failed) |

#### AQ-021: Invalid transition: approved → rejected (should fail)

| Field | Value |
|---|---|
| **Precondition** | Item in `approved` status |
| **Steps** | 1. Call `decideApproval(id, "reject", ...)` |
| **Expected** | Throws error: `"cannot reject item in 'approved' status"`. Item status unchanged. |
| **Spec ref** | Runtime contract §3.2 (state diagram — no arrow from approved to rejected) |

#### AQ-022: Invalid transition: executed → pending (should fail)

| Field | Value |
|---|---|
| **Precondition** | Item in `executed` status |
| **Steps** | 1. Call `decideApproval(id, "approve", ...)` or `submitApproval(id)` |
| **Expected** | Throws error: `"cannot transition item in 'executed' status"`. Item status unchanged. Terminal state. |
| **Spec ref** | Runtime contract §3.2 (executed is terminal), UX spec §2.1 (executed next states: Terminal) |

#### AQ-023: Invalid transition: rejected → approved (should fail)

| Field | Value |
|---|---|
| **Precondition** | Item in `rejected` status |
| **Steps** | 1. Call `decideApproval(id, "approve", ...)` |
| **Expected** | Throws error: `"cannot approve item in 'rejected' status"`. Item status unchanged. Terminal state. |
| **Spec ref** | Runtime contract §3.2 (rejected is terminal), UX spec §2.1 (rejected next states: Terminal) |

---

### 2.3 Revision Flow Tests

#### AQ-024: Revision round increments on re-submit

| Field | Value |
|---|---|
| **Precondition** | Item in `revision_requested` status, `revision_round` = 0 |
| **Steps** | 1. Call `resubmitApproval(id, { summary_diff: "Revised content" })` 2. Call `decideApproval(id, "revision_requested", { notes: "Still needs work" })` 3. Call `resubmitApproval(id, { summary_diff: "Further revised" })` |
| **Expected** | After step 1: `revision_round` = 1. After step 3: `revision_round` = 2. Each re-submit increments the round. |
| **Spec ref** | UX spec §7.2 ("preserves the original approval_id but increments a revision_round counter") |

#### AQ-025: Revision requires content change (diff check)

| Field | Value |
|---|---|
| **Precondition** | Item in `revision_requested` status with `summary_diff` = "Original content" |
| **Steps** | 1. Call `resubmitApproval(id, { summary_diff: "Original content" })` (same content) |
| **Expected** | Throws error: `"re-submit must include substantive content changes"`. Item stays in `revision_requested`. |
| **Spec ref** | UX spec §2.2 ("must not be re-submitted by the agent without substantive content changes") |

#### AQ-026: Max 3 revision rounds — escalation after 3rd

| Field | Value |
|---|---|
| **Precondition** | Item in `revision_requested` status, `revision_round` = 2 (already revised twice) |
| **Steps** | 1. Call `resubmitApproval(id, { summary_diff: "Third revision" })` 2. Call `decideApproval(id, "revision_requested", { notes: "Still not right" })` 3. Call `resubmitApproval(id, { summary_diff: "Fourth attempt" })` |
| **Expected** | After step 3: System detects `revision_round` would exceed max (3). Item is escalated — a new escalation approval item is created and assigned to PM Commander. Original item may be marked `cancelled` or retained for audit. |
| **Spec ref** | UX spec §7.2 ("Maximum revision rounds: 3. After the 3rd revision, the item is escalated to PM Commander"), Runtime contract §8.4 (per-item re-queue limit: 3) |

#### AQ-027: Escalation creates new approval item

| Field | Value |
|---|---|
| **Precondition** | Item escalated after 3rd revision (from AQ-026) |
| **Steps** | 1. Query list for items with `workflow_id` containing "escalation" or check `item_type` = `"custom"` |
| **Expected** | New escalation item exists with: reference to original `approval_id`, `requested_by_role` = `"pm_commander"`, title referencing the original action, status = `pending`, description includes escalation reason and revision history. |
| **Spec ref** | UX spec §7.2 ("a new escalation item is created") |

---

### 2.4 API Endpoint Tests

Each endpoint test assumes the HTTP server is running. Tests use `fetch()` against `http://localhost:3847`.

#### AQ-028: POST /api/approvals — create item

| Field | Value |
|---|---|
| **Precondition** | Server running, authenticated |
| **Steps** | 1. POST `/api/approvals` with valid `ApprovalItem` body 2. Verify response status 201 3. Verify response body contains `approval_id`, `status: "pending"` |
| **Expected** | 201 Created. Body includes generated `approval_id`. Item stored in file. |
| **Spec ref** | Runtime contract §4 (API endpoints) |

#### AQ-029: GET /api/approvals — list with filters

| Field | Value |
|---|---|
| **Precondition** | Store contains 5 items: 3 `pending`, 1 `approved`, 1 `rejected` |
| **Steps** | 1. GET `/api/approvals` — should return all 5 2. GET `/api/approvals?status=pending` — should return 3 3. GET `/api/approvals?priority=critical` — should filter by priority 4. GET `/api/approvals?limit=2` — should return max 2 |
| **Expected** | Each filter correctly narrows results. Default sort: priority descending, then `created_at` ascending. |
| **Spec ref** | CLI spec §3.1 (list command filters), Runtime contract §4 (GET /api/approvals) |

#### AQ-030: GET /api/approvals/:id — get detail

| Field | Value |
|---|---|
| **Precondition** | Store contains item with known `approval_id` |
| **Steps** | 1. GET `/api/approvals/{id}` |
| **Expected** | 200 OK. Full `ApprovalItem` object returned. All fields present and correct. |
| **Spec ref** | CLI spec §3.2 (show command), Runtime contract §4 (GET /api/approvals/:id) |

#### AQ-031: POST /api/approvals/:id/decide — approve

| Field | Value |
|---|---|
| **Precondition** | Item in `pending` status |
| **Steps** | 1. POST `/api/approvals/{id}/decide` with `{ "decision": "approve" }` |
| **Expected** | 200 OK. Item status = `approved`. `decided_at` set. Audit record created. |
| **Spec ref** | CLI spec §3.3 (decide command), Runtime contract §4 (POST /api/approvals/:id/decide) |

#### AQ-032: POST /api/approvals/:id/decide — reject

| Field | Value |
|---|---|
| **Precondition** | Item in `pending` status |
| **Steps** | 1. POST `/api/approvals/{id}/decide` with `{ "decision": "reject", "reason": "Title too vague, needs specifics on migration phases" }` |
| **Expected** | 200 OK. Item status = `rejected`. `rejection_reason` stored. |
| **Spec ref** | CLI spec §3.3 (decide reject), UX spec §7.1 (rejection flow) |

#### AQ-033: POST /api/approvals/:id/decide — revision

| Field | Value |
|---|---|
| **Precondition** | Item in `pending` status |
| **Steps** | 1. POST `/api/approvals/{id}/decide` with `{ "decision": "revision_requested", "notes": "Add budget impact analysis and timeline details" }` |
| **Expected** | 200 OK. Item status = `revision_requested`. `revision_notes` stored. |
| **Spec ref** | CLI spec §3.3 (decide revision), UX spec §7.2 (revision request) |

#### AQ-034: POST /api/approvals/:id/delegate

| Field | Value |
|---|---|
| **Precondition** | Item in `pending` status |
| **Steps** | 1. POST `/api/approvals/{id}/delegate` with `{ "user_id": "maria-santos", "note": "Please review scope before approving" }` |
| **Expected** | 200 OK. `delegated_to` = `maria-santos`. `assigned_approvers` updated to include `maria-santos`. Audit record created. |
| **Spec ref** | CLI spec §3.4 (delegate command), UX spec §3.3 (Delegate button) |

#### AQ-035: POST /api/approvals/:id/re-submit

| Field | Value |
|---|---|
| **Precondition** | Item in `revision_requested` status, `revision_round` = 0 |
| **Steps** | 1. POST `/api/approvals/{id}/re-submit` with `{ "summary_diff": "Updated with budget analysis" }` |
| **Expected** | 200 OK. Item status = `pending`. `revision_round` = 1. `summary_diff` updated. |
| **Spec ref** | UX spec §7.2 (re-submit), Runtime contract §3.2 (revision_requested → pending) |

#### AQ-036: GET /api/approvals/:id/audit

| Field | Value |
|---|---|
| **Precondition** | Item has been created and decided (at least 2 audit records) |
| **Steps** | 1. GET `/api/approvals/{id}/audit` |
| **Expected** | 200 OK. Array of audit records. Records ordered chronologically. Each record has `timestamp`, `event_type`, `actor`, `from_status`, `to_status`. |
| **Spec ref** | CLI spec §3.2 (--audit flag), Runtime contract §3.5 (audit trail), UX spec §6 (audit fields) |

#### AQ-037: GET /api/approvals/count

| Field | Value |
|---|---|
| **Precondition** | Store contains 5 items: 3 `pending`, 1 `approved`, 1 `rejected` |
| **Steps** | 1. GET `/api/approvals/count` |
| **Expected** | 200 OK. `{ "pending": 3, "approved": 1, "rejected": 1, "total": 5 }` (or similar per-status breakdown). |
| **Spec ref** | CLI spec §3.5 (count command), Runtime contract §4 (GET /api/approvals/count) |

#### AQ-038: POST /api/approval-policies — create rule

| Field | Value |
|---|---|
| **Precondition** | Server running |
| **Steps** | 1. POST `/api/approval-policies` with `{ "item_type": "jira_issue_create", "target_system": "jira", "max_priority": "medium", "scope": "similar_actions" }` |
| **Expected** | 201 Created. Rule stored with generated `rule_id`. `use_count` = 0. `created_at` set. |
| **Spec ref** | Runtime contract §3.3 (ApprovalPolicyRule), Runtime contract §4 (POST /api/approval-policies) |

#### AQ-039: GET /api/approval-policies — list rules

| Field | Value |
|---|---|
| **Precondition** | 2 policy rules exist |
| **Steps** | 1. GET `/api/approval-policies` |
| **Expected** | 200 OK. Array of `ApprovalPolicyRule` objects. |
| **Spec ref** | CLI spec §3.6 (policy list command), Runtime contract §4 (GET /api/approval-policies) |

#### AQ-040: DELETE /api/approval-policies/:id — revoke rule

| Field | Value |
|---|---|
| **Precondition** | Policy rule exists with known `rule_id` |
| **Steps** | 1. DELETE `/api/approval-policies/{rule_id}` |
| **Expected** | 200 OK. Rule removed or marked revoked. Subsequent GET excludes it. Items previously auto-approved by this rule retain their `policy_rule_id` reference. |
| **Spec ref** | CLI spec §3.7 (policy revoke command), Runtime contract §4 (DELETE /api/approval-policies/:id) |

---

### 2.5 Policy Rule Tests

#### AQ-041: Auto-approve when rule matches (item_type + target_system + role)

| Field | Value |
|---|---|
| **Precondition** | Policy rule exists: `item_type: "jira_issue_create"`, `target_system: "jira"`, `requested_by_role: "meeting"`, `max_priority: "high"` |
| **Steps** | 1. Create item: `item_type: "jira_issue_create"`, `target_system: "jira"`, `requested_by_role: "meeting"`, `priority: "medium"` |
| **Expected** | Item is auto-approved: `status` = `approved`, `policy_rule_id` = rule's `rule_id`. Rule's `use_count` incremented. No human decision required. |
| **Spec ref** | Runtime contract §3.3 (ApprovalPolicyRule matching), UX spec §3.3 (Approve & Remember) |

#### AQ-042: No auto-approve when priority exceeds ceiling

| Field | Value |
|---|---|
| **Precondition** | Policy rule exists: `max_priority: "medium"` |
| **Steps** | 1. Create item: `priority: "critical"` matching other rule fields |
| **Expected** | Item is NOT auto-approved. Status = `pending`. Rule does not match because priority exceeds ceiling. |
| **Spec ref** | Runtime contract §3.3 (max_priority field) |

#### AQ-043: No auto-approve when rule is expired

| Field | Value |
|---|---|
| **Precondition** | Policy rule exists with `expires_at` set to 1 hour in the past |
| **Steps** | 1. Create item matching all other rule fields |
| **Expected** | Item is NOT auto-approved. Status = `pending`. Rule skipped because expired. |
| **Spec ref** | Runtime contract §3.3 (expires_at field) |

#### AQ-044: No auto-approve when max_uses reached

| Field | Value |
|---|---|
| **Precondition** | Policy rule exists with `max_uses: 2` and `use_count: 2` |
| **Steps** | 1. Create item matching all other rule fields |
| **Expected** | Item is NOT auto-approved. Status = `pending`. Rule exhausted. |
| **Spec ref** | Runtime contract §3.3 (max_uses field) |

#### AQ-045: Wildcard matching (item_type = '*')

| Field | Value |
|---|---|
| **Precondition** | Policy rule exists: `item_type: "*"`, `target_system: "jira"` |
| **Steps** | 1. Create `jira_issue_create` item → should match 2. Create `jira_issue_update` item → should match 3. Create `github_pr_merge` item → should NOT match (different target_system) |
| **Expected** | Items 1 and 2 auto-approved. Item 3 stays `pending`. Wildcard matches any item_type within the same target_system. |
| **Spec ref** | Runtime contract §3.3 (wildcard matching) |

#### AQ-046: Policy rule use_count increments

| Field | Value |
|---|---|
| **Precondition** | Policy rule exists with `use_count: 0` |
| **Steps** | 1. Create matching item (auto-approved) 2. Read rule: `use_count` should be 1 3. Create another matching item (auto-approved) 4. Read rule: `use_count` should be 2 |
| **Expected** | `use_count` accurately tracks number of auto-approvals. |
| **Spec ref** | Runtime contract §3.3 (use_count field) |

#### AQ-047: Revoked rule no longer matches

| Field | Value |
|---|---|
| **Precondition** | Policy rule exists and has matched items before |
| **Steps** | 1. Revoke the rule via DELETE 2. Create new item matching the revoked rule's pattern |
| **Expected** | New item is NOT auto-approved. Status = `pending`. Revoked rule is excluded from matching. |
| **Spec ref** | CLI spec §3.7 (policy revoke), Runtime contract §4 (DELETE /api/approval-policies/:id) |

---

### 2.6 Audit Trail Tests

#### AQ-048: Every state transition creates audit record

| Field | Value |
|---|---|
| **Precondition** | Item in `draft` status |
| **Steps** | 1. Submit (draft → pending) — check audit 2. Approve (pending → approved) — check audit 3. Start execution (approved → executing) — check audit 4. Complete execution (executing → executed) — check audit |
| **Expected** | 4 audit records exist. Each has: `timestamp`, `event_type` (created/submitted/approved/executing/executed), `actor`, `from_status`, `to_status`, `item_id`. |
| **Spec ref** | Runtime contract §3.5 (audit trail), UX spec §6.1 (item-level audit), UX spec §6.2 (decision audit) |

#### AQ-049: Audit records are append-only (no UPDATE/DELETE)

| Field | Value |
|---|---|
| **Precondition** | Item has 3 audit records |
| **Steps** | 1. Attempt to UPDATE an existing audit record (modify timestamp or event_type) 2. Attempt to DELETE an audit record |
| **Expected** | Both operations fail or are no-ops. Audit store only supports `append()`. No UPDATE/DELETE SQL/API exposed. |
| **Spec ref** | UX spec §8.5 ("The approval record is append-only. No field may be modified after recording.") |

#### AQ-050: summary_diff_hash matches at creation and decision time

| Field | Value |
|---|---|
| **Precondition** | Item created with `summary_diff: "Will create Jira issue PROJ-5678"` |
| **Steps** | 1. Read item: compute SHA-256 of `summary_diff` 2. Compare with stored `summary_diff_hash` (if implemented) or verify hash is recorded at creation 3. After decision, re-read: hash should still match original |
| **Expected** | Hash is computed at creation time and stored. It remains unchanged after decision. If `summary_diff` is modified during revision, a new hash is computed. |
| **Spec ref** | UX spec §8.3 ("Hash the full diff and store the hash; store a human-readable summary.") |

#### AQ-051: Audit trail returned by GET /api/approvals/:id/audit

| Field | Value |
|---|---|
| **Precondition** | Item has gone through create → submit → approve → execute lifecycle |
| **Steps** | 1. GET `/api/approvals/{id}/audit` |
| **Expected** | Response contains ordered array of audit records. Each record includes: `audit_id`, `approval_id`, `event_type`, `actor`, `from_status`, `to_status`, `metadata` (optional), `timestamp`. Records are immutable and ordered by timestamp. |
| **Spec ref** | CLI spec §3.2 (--audit flag shows audit trail), Runtime contract §3.5 (audit trail) |

---

## 3. Test Data Fixtures

### 3.1 Minimal Valid ApprovalItem

All required fields only. Used for AQ-001.

```json
{
  "project_id": "proj-001",
  "item_type": "jira_issue_create",
  "workflow_id": "wf-meeting-intelligence",
  "run_id": "run-20260619-001",
  "requested_by_agent": "agent-meeting-001",
  "requested_by_role": "meeting",
  "title": "Create follow-up issue for migration plan",
  "description": "After meeting, create Jira issue to track phased migration.",
  "summary_diff": "Will create Jira issue PROJ-5678: Phased DB Migration Plan",
  "confidence": 85,
  "source_refs": [
    {
      "type": "transcript",
      "id": "mtg-20260619-standup",
      "title": "Daily standup transcript",
      "accessed_at": "2026-06-19T07:55:00Z"
    }
  ],
  "priority": "medium",
  "target_system": "jira",
  "target_id": "PROJ-5678"
}
```

### 3.2 Full Valid ApprovalItem

All fields populated. Used for AQ-002.

```json
{
  "approval_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "project_id": "proj-001",
  "item_type": "github_pr_merge",
  "workflow_id": "wf-code-quality-guard",
  "run_id": "run-20260619-004",
  "requested_by_agent": "agent-code-quality",
  "requested_by_role": "code_quality_guard",
  "title": "Merge PR #234 — fix auth redirect loop",
  "description": "Merge hotfix branch after automated checks pass and security review complete.",
  "summary_diff": "Merges hotfix/auth-redirect-loop into main, updates auth middleware, adds regression test.",
  "confidence": 92,
  "source_refs": [
    {
      "type": "github",
      "id": "234",
      "title": "PR #234 fix auth redirect loop",
      "accessed_at": "2026-06-19T07:20:00Z"
    }
  ],
  "priority": "high",
  "target_system": "github",
  "target_id": "PR-234",
  "status": "pending",
  "revision_round": 0,
  "deadline": "2026-06-19T14:00:00Z",
  "ttl_seconds": 3600,
  "assigned_approvers": ["pm-user-001", "tech-lead-001"],
  "created_at": "2026-06-19T08:05:00Z",
  "updated_at": "2026-06-19T08:05:00Z",
  "decided_at": null,
  "executed_at": null,
  "decision": null,
  "decided_by": null,
  "rejection_reason": null,
  "revision_notes": null,
  "delegated_to": null,
  "execution_status": "pending",
  "execution_error": null,
  "execution_target_response": null,
  "retry_count": 0,
  "policy_rule_id": null
}
```

### 3.3 Approval Items by State

One fixture per status, all sharing the same `project_id` for filter testing.

#### pending

```json
{
  "approval_id": "state-pending-001",
  "project_id": "proj-state-test",
  "item_type": "report_publish",
  "workflow_id": "wf-reporting",
  "run_id": "run-state-001",
  "requested_by_agent": "agent-reporting",
  "requested_by_role": "reporting",
  "title": "Publish weekly client report",
  "description": "Send weekly status report to client distribution list.",
  "summary_diff": "Report covers timeline, scope, risk, budget status.",
  "confidence": 88,
  "source_refs": [],
  "priority": "high",
  "target_system": "gmail",
  "target_id": "msg-weekly-001",
  "status": "pending",
  "revision_round": 0,
  "created_at": "2026-06-19T08:00:00Z",
  "updated_at": "2026-06-19T08:00:00Z",
  "execution_status": "pending",
  "retry_count": 0
}
```

#### approved

```json
{
  "approval_id": "state-approved-001",
  "project_id": "proj-state-test",
  "item_type": "jira_issue_create",
  "workflow_id": "wf-meeting",
  "run_id": "run-state-002",
  "requested_by_agent": "agent-meeting",
  "requested_by_role": "meeting",
  "title": "Create sprint retrospective action items",
  "description": "Create Jira issues for retrospective action items.",
  "summary_diff": "3 action items to be created in PROJ sprint backlog.",
  "confidence": 90,
  "source_refs": [],
  "priority": "medium",
  "target_system": "jira",
  "target_id": "PROJ-BACKLOG",
  "status": "approved",
  "revision_round": 0,
  "created_at": "2026-06-19T07:00:00Z",
  "updated_at": "2026-06-19T09:00:00Z",
  "decided_at": "2026-06-19T09:00:00Z",
  "decision": "approve",
  "decided_by": "pm-user-001",
  "execution_status": "pending",
  "retry_count": 0
}
```

#### rejected

```json
{
  "approval_id": "state-rejected-001",
  "project_id": "proj-state-test",
  "item_type": "scope_baseline_change",
  "workflow_id": "wf-change-control",
  "run_id": "run-state-003",
  "requested_by_agent": "agent-pm-commander",
  "requested_by_role": "pm_commander",
  "title": "Add feature X to scope baseline",
  "description": "Add Feature X to v2 scope baseline per client request.",
  "summary_diff": "Baseline v3.1 → v3.2, adds Feature X (est. 40 pts).",
  "confidence": 75,
  "source_refs": [],
  "priority": "high",
  "target_system": "notion",
  "target_id": "req-baseline-v3.2",
  "status": "rejected",
  "revision_round": 0,
  "created_at": "2026-06-19T06:00:00Z",
  "updated_at": "2026-06-19T08:30:00Z",
  "decided_at": "2026-06-19T08:30:00Z",
  "decision": "reject",
  "decided_by": "pm-user-001",
  "rejection_reason": "Feature X requires separate change request process per contract.",
  "execution_status": "pending",
  "retry_count": 0
}
```

#### revision_requested

```json
{
  "approval_id": "state-revision-001",
  "project_id": "proj-state-test",
  "item_type": "confluence_page_update",
  "workflow_id": "wf-meeting",
  "run_id": "run-state-004",
  "requested_by_agent": "agent-meeting",
  "requested_by_role": "meeting",
  "title": "Update meeting minutes for client sync",
  "description": "Update Confluence page with latest meeting minutes.",
  "summary_diff": "Adds decisions from 2026-06-19 client sync meeting.",
  "confidence": 80,
  "source_refs": [],
  "priority": "medium",
  "target_system": "confluence",
  "target_id": "CONF-MOM-20260619",
  "status": "revision_requested",
  "revision_round": 1,
  "created_at": "2026-06-19T07:30:00Z",
  "updated_at": "2026-06-19T10:00:00Z",
  "decided_at": "2026-06-19T10:00:00Z",
  "decision": "revision_requested",
  "decided_by": "pm-user-001",
  "revision_notes": "Missing the budget discussion section. Add it before re-submitting.",
  "execution_status": "pending",
  "retry_count": 0
}
```

#### expired

```json
{
  "approval_id": "state-expired-001",
  "project_id": "proj-state-test",
  "item_type": "email_send",
  "workflow_id": "wf-reporting",
  "run_id": "run-state-005",
  "requested_by_agent": "agent-reporting",
  "requested_by_role": "reporting",
  "title": "Send daily status email to stakeholder",
  "description": "Send daily project status update email.",
  "summary_diff": "Daily status: 3 tasks done, 2 in progress, 1 blocked.",
  "confidence": 70,
  "source_refs": [],
  "priority": "low",
  "target_system": "gmail",
  "target_id": "msg-daily-001",
  "status": "expired",
  "revision_round": 0,
  "deadline": "2026-06-19T12:00:00Z",
  "created_at": "2026-06-19T08:00:00Z",
  "updated_at": "2026-06-19T12:00:00Z",
  "execution_status": "pending",
  "retry_count": 0
}
```

#### executed

```json
{
  "approval_id": "state-executed-001",
  "project_id": "proj-state-test",
  "item_type": "jira_issue_create",
  "workflow_id": "wf-risk",
  "run_id": "run-state-006",
  "requested_by_agent": "agent-risk",
  "requested_by_role": "risk",
  "title": "Log risk: third-party API deprecation",
  "description": "Create Jira issue for third-party API deprecation risk.",
  "summary_diff": "Risk PROJ-301: API deprecation in Q3, mitigation plan needed.",
  "confidence": 95,
  "source_refs": [],
  "priority": "high",
  "target_system": "jira",
  "target_id": "PROJ-301",
  "status": "executed",
  "revision_round": 0,
  "created_at": "2026-06-19T06:00:00Z",
  "updated_at": "2026-06-19T09:30:00Z",
  "decided_at": "2026-06-19T08:00:00Z",
  "decision": "approve",
  "decided_by": "pm-user-001",
  "executed_at": "2026-06-19T08:05:00Z",
  "execution_status": "executed",
  "execution_target_response": "PROJ-301 created successfully",
  "retry_count": 0
}
```

#### execution_failed

```json
{
  "approval_id": "state-failed-001",
  "project_id": "proj-state-test",
  "item_type": "github_pr_merge",
  "workflow_id": "wf-code-quality",
  "run_id": "run-state-007",
  "requested_by_agent": "agent-code-quality",
  "requested_by_role": "code_quality_guard",
  "title": "Merge PR #234 hotfix",
  "description": "Merge hotfix after security review.",
  "summary_diff": "Merges hotfix/auth-redirect into main.",
  "confidence": 62,
  "source_refs": [],
  "priority": "high",
  "target_system": "github",
  "target_id": "PR-234",
  "status": "execution_failed",
  "revision_round": 0,
  "created_at": "2026-06-19T07:00:00Z",
  "updated_at": "2026-06-19T09:10:00Z",
  "decided_at": "2026-06-19T09:00:00Z",
  "decision": "approve",
  "decided_by": "pm-user-001",
  "executed_at": "2026-06-19T09:05:00Z",
  "execution_status": "execution_failed",
  "execution_error": "GitHub API 403: token lacks merge permission on repo",
  "retry_count": 1
}
```

### 3.4 Policy Rule Fixtures

#### Wildcard rule

```json
{
  "rule_id": "rule-wildcard-001",
  "item_type": "*",
  "target_system": "jira",
  "requested_by_role": "meeting",
  "max_priority": "high",
  "scope": "similar_actions",
  "use_count": 0,
  "max_uses": null,
  "expires_at": null,
  "created_at": "2026-06-19T08:00:00Z",
  "created_by": "pm-user-001"
}
```

#### Specific rule

```json
{
  "rule_id": "rule-specific-001",
  "item_type": "jira_issue_create",
  "target_system": "jira",
  "requested_by_role": "risk",
  "max_priority": "medium",
  "scope": "similar_actions",
  "use_count": 3,
  "max_uses": 10,
  "expires_at": null,
  "created_at": "2026-06-18T10:00:00Z",
  "created_by": "pm-user-001"
}
```

#### Expired rule

```json
{
  "rule_id": "rule-expired-001",
  "item_type": "report_publish",
  "target_system": "confluence",
  "requested_by_role": "reporting",
  "max_priority": "medium",
  "scope": "workflow_run",
  "use_count": 2,
  "max_uses": null,
  "expires_at": "2026-06-19T00:00:00Z",
  "created_at": "2026-06-17T08:00:00Z",
  "created_by": "pm-user-001"
}
```

#### Max-uses-reached rule

```json
{
  "rule_id": "rule-maxuses-001",
  "item_type": "jira_issue_update",
  "target_system": "jira",
  "requested_by_role": "delivery",
  "max_priority": "low",
  "scope": "once",
  "use_count": 1,
  "max_uses": 1,
  "expires_at": null,
  "created_at": "2026-06-19T07:00:00Z",
  "created_by": "pm-user-001"
}
```

### 3.5 Audit Record Fixtures

#### Created event

```json
{
  "audit_id": "audit-001",
  "approval_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "event_type": "created",
  "actor": "agent-meeting-001",
  "from_status": null,
  "to_status": "draft",
  "timestamp": "2026-06-19T08:05:00Z",
  "metadata": {
    "workflow_id": "wf-meeting-intelligence",
    "run_id": "run-20260619-001"
  }
}
```

#### Submitted event

```json
{
  "audit_id": "audit-002",
  "approval_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "event_type": "submitted",
  "actor": "system",
  "from_status": "draft",
  "to_status": "pending",
  "timestamp": "2026-06-19T08:05:01Z",
  "metadata": {
    "policy_check": "no_match"
  }
}
```

#### Decided event

```json
{
  "audit_id": "audit-003",
  "approval_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "event_type": "decided",
  "actor": "pm-user-001",
  "from_status": "pending",
  "to_status": "approved",
  "timestamp": "2026-06-19T09:00:00Z",
  "metadata": {
    "decision": "approve",
    "reason": null,
    "notes": null
  }
}
```

#### Execution events

```json
{
  "audit_id": "audit-004",
  "approval_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "event_type": "execution_started",
  "actor": "system",
  "from_status": "approved",
  "to_status": "executing",
  "timestamp": "2026-06-19T09:00:05Z",
  "metadata": {
    "target_system": "github",
    "target_id": "PR-234"
  }
}
```

```json
{
  "audit_id": "audit-005",
  "approval_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "event_type": "execution_completed",
  "actor": "system",
  "from_status": "executing",
  "to_status": "executed",
  "timestamp": "2026-06-19T09:00:10Z",
  "metadata": {
    "target_response": "PR #234 merged successfully",
    "duration_ms": 5000
  }
}
```

---

## 4. Acceptance Criteria

Mapped directly from Task 4 of the implementation plan (`docs/superpowers/plans/2026-06-19-next-runtime-functions.md`).

| # | Criterion | Test scenarios | Status |
|---|---|---|---|
| AC-1 | Approval item states: `pending`, `approved`, `rejected`, `revision_requested` | AQ-010 through AQ-023 | ☐ |
| AC-2 | Audit-friendly fields: `approvalId`, `projectId`, `actionType`, `targetSystem`, `summary`, `requestedBy`, `createdAt`, `updatedAt` | AQ-001, AQ-002 | ☐ |
| AC-3 | No external mutation occurs | AQ-001 through AQ-051 (all tests use file-backed store only) | ☐ |
| AC-4 | Missing approval file returns empty list, not error | AQ-007 (adapted: list from empty store) | ☐ |
| AC-5 | Invalid data rejected with clear error messages | AQ-003, AQ-004, AQ-005 | ☐ |
| AC-6 | State transitions enforced (no invalid transitions) | AQ-021, AQ-022, AQ-023 | ☐ |
| AC-7 | Revision limit enforced (max 3 rounds) | AQ-026, AQ-027 | ☐ |
| AC-8 | Policy rules match correctly | AQ-041 through AQ-047 | ☐ |
| AC-9 | Audit trail is append-only | AQ-048, AQ-049 | ☐ |
| AC-10 | All tests pass: `pnpm --filter @ai-pm/core test` | Full test suite | ☐ |

### Additional Quality Criteria

| # | Criterion | Test scenarios | Status |
|---|---|---|---|
| QC-1 | Short ID resolution (8+ char prefix matches) | AQ-006 (adapted) | ☐ |
| QC-2 | Priority sort order in list (critical > high > medium > low, then oldest first) | AQ-029 | ☐ |
| QC-3 | Concurrent decision conflict (first-write-wins) | AQ-009 | ☐ |
| QC-4 | Revision requires substantive content change | AQ-025 | ☐ |
| QC-5 | TTL-based expiry works | AQ-014 | ☐ |
| QC-6 | Policy rule use_count tracking | AQ-046 | ☐ |
| QC-7 | Delegation updates assigned_approvers | AQ-034 | ☐ |

---

## 5. Traceability Matrix

| Test ID | Title | Spec document | Spec section | Code file | Priority |
|---|---|---|---|---|---|
| AQ-001 | Create item (required fields) | Runtime contract | §3.1 ApprovalItem | `packages/core/src/runtime/approvalQueue.ts` | **Must-have** |
| AQ-002 | Create item (optional fields) | Runtime contract | §3.1 ApprovalItem | `packages/core/src/runtime/approvalQueue.ts` | **Must-have** |
| AQ-003 | Reject missing required field | CLI spec | §5.4 Validation errors | `packages/core/src/runtime/approvalQueue.ts` | **Must-have** |
| AQ-004 | Reject confidence > 100 | Runtime contract | §3.1 confidence range | `packages/core/src/runtime/approvalQueue.ts` | **Must-have** |
| AQ-005 | Reject invalid status enum | Runtime contract | §3.1 ApprovalStatus | `packages/core/src/runtime/approvalQueue.ts` | **Must-have** |
| AQ-006 | Read item by ID | CLI spec | §3.2 show command | `packages/core/src/runtime/approvalQueue.ts` | **Must-have** |
| AQ-007 | Read non-existent item | CLI spec | §5.2 Item not found | `packages/core/src/runtime/approvalQueue.ts` | **Must-have** |
| AQ-008 | Update item status | Runtime contract | §3.1 state fields | `packages/core/src/runtime/approvalQueue.ts` | **Must-have** |
| AQ-009 | Concurrent conflict | UX spec | §9.3 First-write-wins | `packages/core/src/runtime/approvalQueue.ts` | Nice-to-have |
| AQ-010 | draft → pending | Runtime contract | §3.2 State diagram | `packages/core/src/runtime/approvalQueue.ts` | **Must-have** |
| AQ-011 | pending → approved | Runtime contract | §3.2 State diagram | `packages/core/src/runtime/approvalQueue.ts` | **Must-have** |
| AQ-012 | pending → rejected | Runtime contract | §3.2 State diagram | `packages/core/src/runtime/approvalQueue.ts` | **Must-have** |
| AQ-013 | pending → revision_requested | Runtime contract | §3.2 State diagram | `packages/core/src/runtime/approvalQueue.ts` | **Must-have** |
| AQ-014 | pending → expired (TTL) | Runtime contract | §3.2 State diagram | `packages/core/src/runtime/approvalQueue.ts` | **Must-have** |
| AQ-015 | pending → cancelled | Runtime contract | §3.2 State diagram | `packages/core/src/runtime/approvalQueue.ts` | **Must-have** |
| AQ-016 | revision_requested → pending | Runtime contract | §3.2 State diagram | `packages/core/src/runtime/approvalQueue.ts` | **Must-have** |
| AQ-017 | approved → executing | Runtime contract | §3.2 State diagram | `packages/core/src/runtime/approvalQueue.ts` | **Must-have** |
| AQ-018 | executing → executed | Runtime contract | §3.2 State diagram | `packages/core/src/runtime/approvalQueue.ts` | **Must-have** |
| AQ-019 | executing → execution_failed | Runtime contract | §3.2 State diagram | `packages/core/src/runtime/approvalQueue.ts` | **Must-have** |
| AQ-020 | execution_failed → pending (retry) | Runtime contract | §3.2 State diagram | `packages/core/src/runtime/approvalQueue.ts` | **Must-have** |
| AQ-021 | Invalid: approved → rejected | Runtime contract | §3.2 State diagram | `packages/core/src/runtime/approvalQueue.ts` | **Must-have** |
| AQ-022 | Invalid: executed → pending | Runtime contract | §3.2 State diagram | `packages/core/src/runtime/approvalQueue.ts` | **Must-have** |
| AQ-023 | Invalid: rejected → approved | Runtime contract | §3.2 State diagram | `packages/core/src/runtime/approvalQueue.ts` | **Must-have** |
| AQ-024 | Revision round increments | UX spec | §7.2 Revision round | `packages/core/src/runtime/approvalQueue.ts` | **Must-have** |
| AQ-025 | Revision requires content change | UX spec | §2.2 Substantive changes | `packages/core/src/runtime/approvalQueue.ts` | Nice-to-have |
| AQ-026 | Max 3 revision rounds | UX spec | §7.2 Max rounds | `packages/core/src/runtime/approvalQueue.ts` | **Must-have** |
| AQ-027 | Escalation creates new item | UX spec | §7.2 Escalation | `packages/core/src/runtime/approvalQueue.ts` | Nice-to-have |
| AQ-028 | POST /api/approvals | Runtime contract | §4 API endpoints | `packages/core/src/runtime/approvalQueue.ts` | **Must-have** |
| AQ-029 | GET /api/approvals (filters) | CLI spec | §3.1 list command | `packages/core/src/runtime/approvalQueue.ts` | **Must-have** |
| AQ-030 | GET /api/approvals/:id | CLI spec | §3.2 show command | `packages/core/src/runtime/approvalQueue.ts` | **Must-have** |
| AQ-031 | POST /api/approvals/:id/decide (approve) | CLI spec | §3.3 decide command | `packages/core/src/runtime/approvalQueue.ts` | **Must-have** |
| AQ-032 | POST /api/approvals/:id/decide (reject) | CLI spec | §3.3 decide command | `packages/core/src/runtime/approvalQueue.ts` | **Must-have** |
| AQ-033 | POST /api/approvals/:id/decide (revision) | CLI spec | §3.3 decide command | `packages/core/src/runtime/approvalQueue.ts` | **Must-have** |
| AQ-034 | POST /api/approvals/:id/delegate | CLI spec | §3.4 delegate command | `packages/core/src/runtime/approvalQueue.ts` | Nice-to-have |
| AQ-035 | POST /api/approvals/:id/re-submit | UX spec | §7.2 Re-submit | `packages/core/src/runtime/approvalQueue.ts` | **Must-have** |
| AQ-036 | GET /api/approvals/:id/audit | CLI spec | §3.2 --audit flag | `packages/core/src/runtime/approvalQueue.ts` | **Must-have** |
| AQ-037 | GET /api/approvals/count | CLI spec | §3.5 count command | `packages/core/src/runtime/approvalQueue.ts` | **Must-have** |
| AQ-038 | POST /api/approval-policies | Runtime contract | §3.3 ApprovalPolicyRule | `packages/core/src/runtime/approvalQueue.ts` | Nice-to-have |
| AQ-039 | GET /api/approval-policies | CLI spec | §3.6 policy list | `packages/core/src/runtime/approvalQueue.ts` | Nice-to-have |
| AQ-040 | DELETE /api/approval-policies/:id | CLI spec | §3.7 policy revoke | `packages/core/src/runtime/approvalQueue.ts` | Nice-to-have |
| AQ-041 | Auto-approve (rule matches) | Runtime contract | §3.3 Policy matching | `packages/core/src/runtime/approvalQueue.ts` | Nice-to-have |
| AQ-042 | No auto-approve (priority ceiling) | Runtime contract | §3.3 max_priority | `packages/core/src/runtime/approvalQueue.ts` | Nice-to-have |
| AQ-043 | No auto-approve (rule expired) | Runtime contract | §3.3 expires_at | `packages/core/src/runtime/approvalQueue.ts` | Nice-to-have |
| AQ-044 | No auto-approve (max_uses) | Runtime contract | §3.3 max_uses | `packages/core/src/runtime/approvalQueue.ts` | Nice-to-have |
| AQ-045 | Wildcard matching | Runtime contract | §3.3 Wildcard | `packages/core/src/runtime/approvalQueue.ts` | Nice-to-have |
| AQ-046 | use_count increments | Runtime contract | §3.3 use_count | `packages/core/src/runtime/approvalQueue.ts` | Nice-to-have |
| AQ-047 | Revoked rule no match | CLI spec | §3.7 Policy revoke | `packages/core/src/runtime/approvalQueue.ts` | Nice-to-have |
| AQ-048 | Audit per transition | UX spec | §6 Audit fields | `packages/core/src/runtime/approvalQueue.ts` | **Must-have** |
| AQ-049 | Audit append-only | UX spec | §8.5 Tamper prevention | `packages/core/src/runtime/approvalQueue.ts` | **Must-have** |
| AQ-050 | summary_diff_hash integrity | UX spec | §8.3 Hash storage | `packages/core/src/runtime/approvalQueue.ts` | Future |
| AQ-051 | Audit trail API | CLI spec | §3.2 --audit flag | `packages/core/src/runtime/approvalQueue.ts` | **Must-have** |

### Priority Summary

| Priority | Count | Scenarios |
|---|---|---|
| **Must-have** | 33 | AQ-001–008, AQ-010–024, AQ-026, AQ-028–033, AQ-035–037, AQ-048–049, AQ-051 |
| **Nice-to-have** | 15 | AQ-009, AQ-025, AQ-027, AQ-034, AQ-038–047 |
| **Future** | 1 | AQ-050 |

### Test Execution Order

Recommended order for Task 4 implementation:

1. **Data model + validation** (AQ-001 through AQ-005) — foundation
2. **CRUD operations** (AQ-006 through AQ-008) — basic store
3. **State machine transitions** (AQ-010 through AQ-023) — core logic
4. **Revision flow** (AQ-024 through AQ-027) — revision logic
5. **API endpoints** (AQ-028 through AQ-037) — HTTP layer
6. **Audit trail** (AQ-048 through AQ-051) — observability
7. **Policy rules** (AQ-038 through AQ-047) — auto-approval (nice-to-have)
8. **Concurrency** (AQ-009) — robustness (nice-to-have)
