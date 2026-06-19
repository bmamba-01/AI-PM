# Coding Agent 4 — Integration Testing

> **Type:** 🖥️ CODING TASK
> **Depends on:** Tasks 2, 3, 4, 5 all completed
> **Blocks:** Nothing — final quality gate

## Task

Create integration tests that exercise the full approval queue flow end-to-end, plus schema validation against real workflow outputs.

## Files to create

- Create: `packages/core/src/runtime/approvalQueue.integration.test.ts`
- Create: `packages/core/src/workflows/schemaValidation.integration.test.ts`

## What to test

### approvalQueue.integration.test.ts

Full lifecycle test:
1. Create 3 approval items (different priorities, workflows, statuses)
2. List and verify filtering by status, priority
3. Decide: approve one, reject one with reason, request revision on third
4. Resubmit the revised item
5. Verify revision_round increments correctly
6. Verify counts change after each operation
7. Verify sort order (critical first, then high, medium, low; oldest first within priority)
8. Test concurrent read/write: create item, read, update, verify no data loss
9. Test missing file returns empty list (not error)
10. Test invalid JSON in file is handled gracefully (if possible with manual file tamper)

### schemaValidation.integration.test.ts

1. Load each of the 6 workflow output schemas
2. Validate valid fixtures against their schemas — all must pass
3. Validate invalid fixtures against their schemas — all must fail
4. Test with real daily briefing output from `generateDailyBriefing()`
5. Test graceful fallback when schema file is missing
6. Verify validation result structure matches expected shape

## Key constraints

- Use temp directories for all file operations
- Do NOT modify packages/mcp/ or packages/desktop/ or packages/mobile/
- These are integration tests — they test multiple components working together
- `pnpm --filter @ai-pm/core test` must pass (all tests, not just new ones)
- `pnpm build` must pass (full build, no regressions)

## Context files to read

1. packages/core/src/runtime/approvalQueue.ts
2. packages/core/src/runtime/approvalQueue.test.ts
3. packages/core/src/workflows/schemaValidation.ts (if exists)
4. packages/core/src/workflows/dailyBriefing.ts
5. schemas/fixtures/workflows/daily-briefing.output.valid.json

## Verification

```bash
pnpm --filter @ai-pm/core test
pnpm --filter @ai-pm/core build
pnpm build
```
