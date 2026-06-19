# Delegation Forecast

> **Last updated:** 2026-06-19 after runtime verification and CLI smoke fix.

## Verified Current State

The repo is green by build/test/smoke evidence:

| Check | Status |
|---|---|
| `pnpm --filter @ai-pm/core test` | PASS, 95 tests |
| `pnpm --filter @ai-pm/mcp test` | PASS, 26 tests |
| `pnpm --filter @ai-pm/cli build` | PASS |
| `pnpm --filter @ai-pm/desktop build` | PASS |
| `pnpm --filter @ai-pm/mobile build` | PASS |
| `pnpm build` | PASS |
| `node packages/cli/bin/ai-pm.js approval --help` | PASS |
| `node schemas/validate-fixtures.mjs` | PASS, 30/30 |

## Completed Or Ready-To-Accept Work

| Area | Status | Notes |
|---|---|---|
| Schema Validation Runtime | Complete | Runtime validates workflow outputs; schema tests pass |
| Approval CLI | Complete | Runtime smoke issue fixed by registering `approvalCommand` in bin |
| Core Approval Integration Tests | Complete | Unit + integration flow tests pass |
| Runtime Memory System | Complete in core | File-backed `MemoryStore` implemented and exported |
| Housekeeping Archive | Complete locally | Old prompt files moved to dated archive |

## Important Caveats

- Approval UI is an MVP only. Desktop uses localStorage; mobile uses in-memory seed data. Neither is a true runtime-backed approval queue yet.
- `.ai-pm/memory/*.yaml` is ignored by git. That is correct for local runtime data, but `ai-pm init` and docs must describe/bootstrap it.
- Schema validation passes, but Ajv ignores `format: date-time` until `ajv-formats` is added.

## Next Delegation Wave

Use: `docs/agent-delegation/2026-06-19-runtime-hardening-agent-prompts.md`

### Parallel Group A

| Agent | Task | Depends On | Scope |
|---|---|---|---|
| Schema Agent | Ajv format hardening | Current schema runtime | `packages/core`, `package.json`, lockfile |
| DB/Memory Agent | Memory CLI + init bootstrap | Current `MemoryStore` | `packages/core`, `packages/cli`, docs |
| API/IPC Agent | Desktop approval IPC bridge | Current `ApprovalQueue` | Electron main/preload/global types only |

### Group B After API/IPC Agent

| Agent | Task | Depends On | Scope |
|---|---|---|---|
| Desktop UI Agent | Replace localStorage approval store with IPC-backed store | API/IPC Agent | Desktop renderer state + approval tab |

### Group C After API Contract Is Stable

| Agent | Task | Depends On | Scope |
|---|---|---|---|
| Mobile UI/API Agent | Local-server approval client with mock fallback | API/IPC/local-server contract | Mobile state + docs/product API note |

### Final Verification Agent

| Agent | Task | Depends On | Scope |
|---|---|---|---|
| Integration Test Agent | CLI smoke + runtime boundary tests | All above | Tests only unless a narrow fix is proven |

## Hold Back For Later

- Google Workspace publication.
- Chat/Hermes/OpenClaw gateway.
- Jira/GitHub write mutations.
- SQLite migration.
- Full local HTTP server.

These need the runtime boundary cleaned first.
