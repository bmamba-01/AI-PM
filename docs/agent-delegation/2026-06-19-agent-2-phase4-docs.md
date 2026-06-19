# Coding Agent 2 — Phase 4: Developer Documentation

> **Type:** 🖥️ CODING TASK (docs + light code)
> **Priority:** Medium — enables onboarding and future development
> **Depends on:** Phase 3 runtime complete
> **Blocks:** Nothing — standalone documentation

## Task

Write developer-facing documentation for the AI-PM Toolkit runtime system. The code is functional but undocumented.

## Files to create

1. `docs/product/memory-cli-spec.md` — Memory CLI command reference
2. `docs/product/mobile-approval-api-client.md` — Mobile API client architecture
3. `docs/architecture/local-server-api-surface.md` — API surface for future local server
4. `docs/developer/runtime-architecture.md` — Developer guide to the runtime layer

## What to document

### 1. Memory CLI Spec (`docs/product/memory-cli-spec.md`)

Based on `packages/cli/src/commands/memory.ts`:
- `ai-pm memory summary` — project memory overview
- `ai-pm memory tasks list` — list tasks with filters
- `ai-pm memory artifacts list` — list artifacts with filters
- `ai-pm memory artifacts archive` — archive an artifact
- `ai-pm memory tasks create` — create a task
- `ai-pm memory tasks complete` — complete a task

Include: description, options, JSON output shape, examples.

### 2. Mobile API Client (`docs/product/mobile-approval-api-client.md`)

Based on `packages/mobile/src/state/approval-store.ts`:
- `setApprovalBaseUrl(url)` configuration
- Local server mode vs mock fallback mode
- `dataSource` indicator (local_server / mock_fallback)
- API endpoints consumed
- Error handling and degradation behavior
- How to connect to a local server

### 3. Local Server API Surface (`docs/architecture/local-server-api-surface.md`)

Design the future local HTTP server API that mobile and chat will use:
- GET/POST /api/approvals
- POST /api/approvals/:id/decide
- GET /api/approvals/count
- POST /api/approvals (create)
- POST /api/approvals/:id/resubmit
- Auth model (local trust)
- Response shapes (reference approval-item.schema.json)

### 4. Runtime Architecture (`docs/developer/runtime-architecture.md`)

Explain how the runtime is structured:
- `packages/core/src/runtime/` — file-backed stores (ApprovalQueue, MemoryStore, LocalProjectStore)
- `packages/core/src/workflows/` — schema validation, daily briefing
- `packages/cli/` — CLI commands using core runtime
- `packages/desktop/` — Electron IPC bridge (main process owns runtime)
- `packages/mobile/` — fetch-based client with mock fallback
- Data flow: CLI → core → .ai-pm/ files
- Data flow: Desktop → IPC → main process → core → .ai-pm/ files
- Data flow: Mobile → fetch → local server → core → .ai-pm/ files

## Key constraints

- Only create docs — do NOT modify any code
- Reference actual file paths and function names from codebase
- Keep docs concise but complete
- Use Markdown with code examples

## Verification

```bash
ls docs/product/memory-cli-spec.md
ls docs/product/mobile-approval-api-client.md
ls docs/architecture/local-server-api-surface.md
ls docs/developer/runtime-architecture.md
```
