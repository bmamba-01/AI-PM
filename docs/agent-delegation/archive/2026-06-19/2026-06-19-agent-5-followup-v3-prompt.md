# Agent 5 Follow-up v3 — Approval Queue Test Plan

> **Date:** 2026-06-19  
> **Requested by:** Orchestrator  
> **Priority:** Medium — directly supports main thread Task 4 implementation  
> **Depends on:** Agent 5's full approval queue spec layer (5 documents, all completed)  
> **Blocks:** Main-thread Task 4 (Approval Queue Runtime) — test plan defines acceptance criteria

---

## Task Contract

```yaml
task_id: agent-5-approval-test-plan
project_id: ai-pm-toolkit
requested_by: orchestrator
assigned_agent: developer
objective: |
  Create a comprehensive test plan for the approval queue runtime.
  This defines test scenarios, test data, and acceptance criteria that
  the main thread will use when implementing Task 4 (Approval Queue
  Runtime Foundation). The test plan covers the data model, state
  transitions, API endpoints, policy rules, and error handling.
context:
  methodology: hybrid
  project_type: product_delivery
  source_refs:
    - type: file
      id: docs/architecture/approval-queue-runtime-contract.md
      description: Full runtime contract with data model, API, state machine
    - type: file
      id: docs/product/approval-queue-ux.md
      description: UX spec with states, rejection/revision flows
    - type: file
      id: docs/product/approval-queue-cli-spec.md
      description: CLI spec with error cases
    - type: file
      id: schemas/approval/approval-item.schema.json
      description: Approval item schema for validation
    - type: file
      id: docs/superpowers/plans/2026-06-19-next-runtime-functions.md
      description: Task 4 acceptance criteria
constraints:
  - Work only inside docs/ — do not modify packages/ code
  - Create the test plan as a markdown document
  - Each test scenario must be traceable to a spec section
  - Include both happy-path and error-path scenarios
  - Include data fixtures (JSON) as part of the test plan
required_outputs:
  - name: test-plan-doc
    format: markdown
quality_gate:
  checklist_id: approval-test-plan-gate
  approval_required: false
deadline: medium-priority
```

---

## Prompt

```text
You are Agent 5 working on the AI-PM Toolkit repository.
You previously created 5 approval queue specification documents.
This task creates the test plan for the runtime implementation.

## Step 0: Read context files

1. docs/architecture/approval-queue-runtime-contract.md (§3 Data Model, §4 API, §5 Agent Integration)
2. docs/product/approval-queue-ux.md (§2 States, §7 Rejection/Revision)
3. docs/product/approval-queue-cli-spec.md (§5 Error Handling)
4. schemas/approval/approval-item.schema.json
5. docs/superpowers/plans/2026-06-19-next-runtime-functions.md (Task 4)

## Step 1: Create test plan

Create docs/product/approval-queue-test-plan.md with these sections:

### Section 1: Scope

Define what is tested:
- ApprovalItem data model (create, read, update)
- State machine transitions (all 10 states)
- API endpoints (8 queue + 4 policy)
- Policy rule matching and auto-approval
- Revision flow (max 3 rounds, escalation)
- Expiry and TTL
- Error handling (7 categories from CLI spec)
- Audit trail (append-only, tamper detection)

### Section 2: Test Scenarios

Organize by feature area. Each scenario has:
- ID (e.g., AQ-001)
- Title
- Precondition
- Steps
- Expected result
- Spec reference (which spec section this tests)

#### 2.1 Data Model Tests

- AQ-001: Create approval item with all required fields
- AQ-002: Create approval item with optional fields
- AQ-003: Reject item missing required field (validation error)
- AQ-004: Reject item with confidence > 100
- AQ-005: Reject item with invalid status enum
- AQ-006: Read item by ID
- AQ-007: Read non-existent item (404)
- AQ-008: Update item status
- AQ-009: Update item with concurrent conflict (optimistic concurrency)

#### 2.2 State Machine Tests

- AQ-010: draft → pending (submit)
- AQ-011: pending → approved (approve)
- AQ-012: pending → rejected (reject with reason)
- AQ-013: pending → revision_requested (request revision with notes)
- AQ-014: pending → expired (TTL elapses)
- AQ-015: pending → cancelled (cancel)
- AQ-016: revision_requested → pending (re-submit after revision)
- AQ-017: approved → executing (execution starts)
- AQ-018: executing → executed (execution succeeds)
- AQ-019: executing → execution_failed (execution fails)
- AQ-020: execution_failed → pending (retry)
- AQ-021: Invalid transition: approved → rejected (should fail)
- AQ-022: Invalid transition: executed → pending (should fail)
- AQ-023: Invalid transition: rejected → approved (should fail)

#### 2.3 Revision Flow Tests

- AQ-024: Revision round increments on re-submit
- AQ-025: Revision requires content change (diff check)
- AQ-026: Max 3 revision rounds — escalation after 3rd
- AQ-027: Escalation creates new approval item

#### 2.4 API Endpoint Tests

For each endpoint, test:
- Happy path (200/201)
- Missing auth (401)
- Invalid params (400)
- Not found (404)
- Rate limited (429)

Specific scenarios:
- AQ-028: POST /api/approvals — create item
- AQ-029: GET /api/approvals — list with filters
- AQ-030: GET /api/approvals/:id — get detail
- AQ-031: POST /api/approvals/:id/decide — approve
- AQ-032: POST /api/approvals/:id/decide — reject
- AQ-033: POST /api/approvals/:id/decide — revision
- AQ-034: POST /api/approvals/:id/delegate
- AQ-035: POST /api/approvals/:id/re-submit
- AQ-036: GET /api/approvals/:id/audit
- AQ-037: GET /api/approvals/count
- AQ-038: POST /api/approval-policies — create rule
- AQ-039: GET /api/approval-policies — list rules
- AQ-040: DELETE /api/approval-policies/:id — revoke rule

#### 2.5 Policy Rule Tests

- AQ-041: Auto-approve when rule matches (item_type + target_system + role)
- AQ-042: No auto-approve when priority exceeds ceiling
- AQ-043: No auto-approve when rule is expired
- AQ-044: No auto-approve when max_uses reached
- AQ-045: Wildcard matching (item_type = '*')
- AQ-046: Policy rule use_count increments
- AQ-047: Revoked rule no longer matches

#### 2.6 Audit Trail Tests

- AQ-048: Every state transition creates audit record
- AQ-049: Audit records are append-only (no UPDATE/DELETE)
- AQ-050: summary_diff_hash matches at creation and decision time
- AQ-051: Audit trail returned by GET /api/approvals/:id/audit

### Section 3: Test Data Fixtures

Provide JSON fixtures for:

1. **Minimal valid ApprovalItem** — all required fields only
2. **Full valid ApprovalItem** — all fields populated
3. **Approval item in each state** — one fixture per status
4. **Policy rule fixtures** — wildcard, specific, expired, max-uses-reached
5. **Audit record fixtures** — created, decided, execution events

### Section 4: Acceptance Criteria

Map directly from Task 4 in the plan:

- [ ] Approval item states: pending, approved, rejected, revision_requested
- [ ] Audit-friendly fields: approvalId, projectId, actionType, targetSystem, summary, requestedBy, createdAt, updatedAt
- [ ] No external mutation occurs
- [ ] Missing approval file returns empty list, not error
- [ ] Invalid data rejected with clear error messages
- [ ] State transitions enforced (no invalid transitions)
- [ ] Revision limit enforced (max 3 rounds)
- [ ] Policy rules match correctly
- [ ] Audit trail is append-only
- [ ] All tests pass: pnpm --filter @ai-pm/core test

### Section 5: Traceability Matrix

A table mapping each test scenario to:
- Spec section (which document and section)
- Code file (which file will implement this)
- Priority (must-have for Task 4, nice-to-have, future)

## Step 2: Verify

```bash
# 1. Confirm file created
ls docs/product/approval-queue-test-plan.md

# 2. Confirm test scenarios documented
rg -n "AQ-0[0-9][0-9]" docs/product/approval-queue-test-plan.md | wc -l
# Should be 51+

# 3. Confirm traceability
rg -n "Spec reference|Traceability" docs/product/approval-queue-test-plan.md

# 4. No modifications outside docs/
git diff --name-only docs/
```

## Step 3: Report

```yaml
task_id: agent-5-approval-test-plan
status: completed | blocked | failed
summary: one-line description
findings:
  - severity: info
    title: what you created
    detail: test scenarios, fixtures, acceptance criteria
    source_ref: docs/product/approval-queue-test-plan.md
recommendations:
  - action: main thread Task 4 can now implement with clear acceptance criteria
    owner: main_thread
    priority: medium
artifacts:
  - path_or_url: docs/product/approval-queue-test-plan.md
    type: report
confidence: 0-100
open_questions: []
audit:
  sources_used:
    - list of files read
  assumptions:
    - test scenarios cover all state transitions
    - fixtures are valid JSON matching approval-item schema
  approvals_required: []
  next_agent_suggested: >
    Agent 5 has completed the full approval queue specification
    and test plan layer (6 documents). Main thread Task 4
    can begin implementation.
```
