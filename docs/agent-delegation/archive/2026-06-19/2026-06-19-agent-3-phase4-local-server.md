# Coding Agent 3 — Phase 4: Local Server Foundation

> **Type:** 🖥️ CODING TASK
> **Priority:** Medium — foundation for mobile real connectivity
> **Depends on:** Phase 3 complete (ApprovalQueue, MemoryStore ready)
> **Blocks:** Future mobile real-server mode, chat gateway

## Task

Create the foundation for a local HTTP server that exposes the approval queue and memory system to mobile and future chat adapters.

## Files to create

- Create: `packages/server/src/index.ts` — Express/Hono server entry
- Create: `packages/server/src/routes/approvals.ts` — approval queue endpoints
- Create: `packages/server/src/routes/memory.ts` — memory endpoints
- Create: `packages/server/package.json`
- Create: `packages/server/tsconfig.json`

## What to implement

### Server entry (`packages/server/src/index.ts`)

```typescript
// Simple HTTP server exposing runtime APIs
// Default port: 3847 (matches mobile client default)
// Auth: local trust (no auth for localhost)
// CORS: allow localhost origins
```

### Approval endpoints (`packages/server/src/routes/approvals.ts`)

| Method | Path | Description |
|--------|------|-------------|
| GET | /api/approvals | List items (query: status, priority, project_id) |
| GET | /api/approvals/count | Count by status |
| GET | /api/approvals/:id | Get single item |
| POST | /api/approvals | Create item |
| POST | /api/approvals/:id/decide | Decide (approve/reject/revision) |
| POST | /api/approvals/:id/resubmit | Resubmit after revision |

All endpoints use `ApprovalQueue` from `@ai-pm/core/runtime`.

### Memory endpoints (`packages/server/src/routes/memory.ts`)

| Method | Path | Description |
|--------|------|-------------|
| GET | /api/memory/summary | Project memory summary |
| GET | /api/memory/tasks | List tasks |
| POST | /api/memory/tasks | Create task |
| PUT | /api/memory/tasks/:id/complete | Complete task |
| GET | /api/memory/artifacts | List artifacts |
| POST | /api/memory/artifacts/archive/:id | Archive artifact |

All endpoints use `MemoryStore` from `@ai-pm/core/runtime`.

## Key constraints

- Use `@ai-pm/core/runtime` for all business logic — server is thin wrapper
- Default port 3847 (matches mobile client `DEFAULT_BASE_URL`)
- No auth for localhost (local trust model)
- CORS allow localhost origins
- No new dependencies if possible (use Node built-in `http` + manual routing, or add express minimally)
- `pnpm --filter @ai-pm/core test` must still pass
- Server is a new package: `packages/server/`

## Context files to read

1. packages/core/src/runtime/approvalQueue.ts
2. packages/core/src/runtime/memory.ts
3. packages/mobile/src/state/approval-store.ts (check API contract)
4. docs/architecture/approval-queue-runtime-contract.md (§4 API)
5. packages/server/ (will be created — check if exists)

## Verification

```bash
# Create package
ls packages/server/package.json

# Server compiles
pnpm --filter @ai-pm/server build 2>&1 | tail -5

# Core still passes
pnpm --filter @ai-pm/core test

# Full build
pnpm build
```
