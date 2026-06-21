# Coding Agent 3 — Approval Queue Server Integration Tests

> **Type:** 🖥️ CODING TASK
> **Priority:** High — approval routes need same test coverage as memory
> **Depends on:** Agent 3's memory API tests (completed)
> **Blocks:** Nothing — standalone

## Task

The memory routes now have 32 integration tests. The approval routes only have basic smoke tests. Bring approval route integration tests to the same quality level.

## Files to create/modify

- Create: `packages/server/src/routes/approvals.integration.test.ts`
- Modify: `packages/server/src/routes/approvals.ts` (if error handling gaps found)

## What to test (target: 30+ scenarios)

### CRUD Tests
- `GET /api/approvals` — empty store returns `{ items: [], total: 0, counts: {} }`
- `GET /api/approvals` — after creating items, returns all items sorted by priority
- `GET /api/approvals?status=pending` — filter by status works
- `GET /api/approvals?priority=critical` — filter by priority works
- `GET /api/approvals/count` — returns status counts
- `GET /api/approvals/:id` — returns single item by ID
- `GET /api/approvals/:id` — returns 404 for non-existent ID
- `POST /api/approvals` — creates item with all required fields
- `POST /api/approvals` — returns 400 for missing required fields
- `POST /api/approvals` — returns 400 for invalid confidence (>100)

### Decision Tests
- `POST /api/approvals/:id/decide` — approve transitions status to "approved"
- `POST /api/approvals/:id/decide` — reject transitions to "rejected" with reason
- `POST /api/approvals/:id/decide` — reject without reason returns 400
- `POST /api/approvals/:id/decide` — revision_requested transitions to "revision_requested"
- `POST /api/approvals/:id/decide` — revision without notes returns 400
- `POST /api/approvals/:id/decide` — invalid transition returns 400 (e.g., reject already-approved)
- `POST /api/approvals/:id/decide` — 404 for non-existent ID

### Resubmit Tests
- `POST /api/approvals/:id/resubmit` — resubmit after revision increments round
- `POST /api/approvals/:id/resubmit` — 404 for non-existent ID
- `POST /api/approvals/:id/resubmit` — rejects if not in revision_requested status

### Edge Cases
- Empty request body on POST /api/approvals → 400
- Invalid JSON body → 400
- Unknown route → 404
- Multiple creates → correct counts
- Create + decide + verify audit trail state

## Key constraints

- Per-test isolation: each test creates its own ApprovalQueue + HTTP server
- Do NOT modify packages/core/ or packages/desktop/
- Follow same test pattern as `memory.integration.test.ts`
- `pnpm --filter @ai-pm/server test` must pass (all 49 existing + new tests)
- `pnpm --filter @ai-pm/server build` must pass

## Context files to read

1. packages/server/src/routes/approvals.ts
2. packages/server/src/routes/memory.integration.test.ts (test pattern reference)
3. packages/core/src/runtime/approvalQueue.ts (state machine)
4. packages/core/src/runtime/approvalQueue.test.ts (valid transitions reference)

## Verification

```bash
pnpm --filter @ai-pm/server test
pnpm --filter @ai-pm/server build
pnpm build
```
