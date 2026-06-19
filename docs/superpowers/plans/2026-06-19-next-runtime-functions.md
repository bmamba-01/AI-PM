# Next Runtime Functions Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stabilize the Phase 2 runtime layer, then move from local MVP stores toward real project-scoped runtime bridges for CLI, desktop, mobile, memory, and future chat orchestration.

**Architecture:** Keep durable PM workflow logic in `packages/core`; expose it through CLI, Electron IPC, and later local-server APIs. UI packages must not own business rules. Mobile must call a local-server API when available and keep mock/fallback data clearly separated from runtime truth.

**Tech Stack:** TypeScript, Vitest, Commander, Electron IPC, React/Zustand, React Native/Zustand, file-backed `.ai-pm/` runtime state, JSON Schema/Ajv, future SQLite/local server.

---

## Current Verification State

Verified on 2026-06-19 from `C:\Works\AI-PM`:

```text
pnpm --filter @ai-pm/core test                 PASS (8 files, 95 tests)
pnpm --filter @ai-pm/mcp test                  PASS (1 file, 26 tests)
pnpm --filter @ai-pm/cli build                 PASS
pnpm --filter @ai-pm/desktop build             PASS
pnpm --filter @ai-pm/mobile build              PASS
pnpm build                                     PASS
node packages/cli/bin/ai-pm.js --help          PASS
node packages/cli/bin/ai-pm.js approval --help PASS
node packages/cli/bin/ai-pm.js approval count --json PASS
node schemas/validate-fixtures.mjs             PASS (30/30)
```

Known non-blocking warnings:

- Ajv currently logs `unknown format "date-time" ignored`; schema tests pass, but date-time validation is not strict yet.
- Desktop Vite logs Electron `fs` and `path` browser externalization warnings; build passes, but desktop runtime hardening should move Node-backed work behind IPC.

## Completed Runtime Work

| Task | Status | Evidence |
|---|---|---|
| Audit Inspection CLI | Complete | `packages/cli/src/commands/audit.ts`, core tests pass |
| Project Scan CLI | Complete | `packages/cli/src/commands/project.ts`, core tests pass |
| Approval Queue Runtime | Complete | `packages/core/src/runtime/approvalQueue.ts`, unit + integration tests pass |
| Schema Validation Runtime | Complete | `packages/core/src/workflows/schemaValidation.ts`, 38 schema tests pass |
| Approval CLI | Complete after smoke fix | `approvalCommand` registered in `packages/cli/bin/ai-pm.js`; CLI smoke tests pass |
| Approval UI MVP | Partially complete | Desktop/mobile panels build, but use localStorage/in-memory stores rather than shared runtime |
| Integration Tests | Complete for core runtime | `approvalQueue.integration.test.ts`, `schemaValidation.integration.test.ts` pass |
| Housekeeping + Archive | Complete locally | Active prompts reduced; older prompts moved to `docs/agent-delegation/archive/2026-06-19/` |
| Runtime Memory System | Complete in core | `packages/core/src/runtime/memory.ts`, `memory.test.ts` pass |

## Current Gaps

### Gap 1: UI Is Not Truly Wired To Runtime

Desktop approval UI uses `packages/desktop/src/state/approval-store.ts` with localStorage. Mobile approval UI uses `packages/mobile/src/state/approval-store.ts` with in-memory seed data. Both mirror runtime behavior but do not call `ApprovalQueue` as the source of truth.

Required split:

- API/IPC Agent owns the runtime bridge.
- Desktop UI Agent owns the desktop store and components.
- Mobile UI/API Agent owns local-server client and mock fallback.

### Gap 2: `.ai-pm/memory/` Is Local Data And Ignored

Housekeeping created `.ai-pm/memory/*.yaml`, but `.ai-pm/` is ignored by `.gitignore`. That is correct for user-specific runtime state, but the setup behavior must be encoded in tracked code/docs.

Required split:

- DB/Memory Agent owns `ai-pm memory` CLI and `ai-pm init` memory bootstrap.
- Documentation Agent may add memory setup docs, but should not edit runtime code.

### Gap 3: Schema Date-Time Validation Is Too Loose

Ajv validates structure but ignores `format: date-time` until `ajv-formats` is installed and registered.

Required split:

- Schema Hardening Agent owns `ajv-formats` dependency, validator wiring, and warning-free schema tests.

## Next Work Sequence

### Phase 3a: Runtime Hardening

1. Schema Hardening Agent: add strict date-time validation and remove Ajv format warnings.
2. DB/Memory Agent: expose memory store through CLI and init bootstrap.
3. API/IPC Agent: expose approval queue through Electron IPC and define local-server API surface.

### Phase 3b: UI Wiring

4. Desktop UI Agent: replace localStorage approval store with Electron IPC-backed store.
5. Mobile UI/API Agent: create local-server approval client with explicit mock fallback.

### Phase 3c: Verification

6. Integration Test Agent: add CLI smoke tests and UI-store contract tests where runtime boundaries are mocked.

## Active Prompt Set

Use this file for the next wave:

- `docs/agent-delegation/2026-06-19-runtime-hardening-agent-prompts.md`

## Non-Negotiable Boundaries

- UI agents must not reimplement approval state transitions.
- API/IPC agent must not redesign UI.
- DB/Memory agent must not move archived docs.
- Schema agent must not change workflow schemas beyond what is needed for date-time validation.
- Integration test agent must not rewrite implementation unless a failing test proves the defect and the fix is tightly scoped.

## Completion Gate

Before claiming Phase 3 complete, run:

```bash
pnpm --filter @ai-pm/core test
pnpm --filter @ai-pm/mcp test
pnpm --filter @ai-pm/cli build
pnpm --filter @ai-pm/desktop build
pnpm --filter @ai-pm/mobile build
pnpm build
node packages/cli/bin/ai-pm.js --help
node packages/cli/bin/ai-pm.js approval --help
node packages/cli/bin/ai-pm.js approval count --json
node schemas/validate-fixtures.mjs
```
