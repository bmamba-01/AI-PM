# Wave 6 Assignment — Verified Runtime Next Slice

> **Date:** 2026-06-20  
> **Status:** Ready for six parallel agents after runtime verification.  
> **Canonical plan:** `docs/superpowers/plans/2026-06-19-pm-orchestrator-master-plan.md`  
> **Runtime plan:** `docs/superpowers/plans/2026-06-19-next-runtime-functions.md`

## Verified Baseline

Run completed from `C:\Works\AI-PM` before this assignment:

```text
pnpm test                                      PASS
pnpm build                                     PASS
pnpm --filter @ai-pm/core test                 PASS (137 tests)
pnpm --filter @ai-pm/mcp test                  PASS (26 tests)
pnpm --filter @ai-pm/cli test                  PASS (71 tests)
pnpm --filter @ai-pm/server test               PASS (17 tests)
node schemas/validate-fixtures.mjs             PASS (30/30)
```

Every agent must read `AGENTS.md`, the canonical plan, the runtime plan, and only then inspect the files in its scope.

Every response must include:

- objective handled
- sources inspected
- changes made
- assumptions and risks
- verification performed
- next recommended action

## Agent 1 — Init Bootstrap Hardening

**Objective:** Make `ai-pm init` create a complete project scaffold that another AI agent can open and understand without extra context.

**Scope:**

- `packages/cli/src/commands/init.ts`
- `packages/cli/src/commands/init.test.ts` if tests already exist, otherwise create focused CLI tests
- root operating-layer templates only if `init.ts` needs tracked source templates
- docs only if command behavior changes

**Required behavior:**

- Create `.ai-pm/memory/`, `.ai-pm/audit/`, `.ai-pm/approvals/`, and seed files expected by runtime stores.
- Create or copy agent entrypoints: `AGENTS.md`, `CODEX.md`, and `CLAUDE.md`.
- Create a project-scoped profile file with project name, methodology, project type, local artifact paths, and connector placeholders.
- Ensure `.gitignore` excludes local runtime state but keeps reusable templates/config committed.
- Print next commands after init, including scan, memory summary, approval count, and MCP validate if available.
- Do not copy unrelated build output, `node_modules`, or local `.ai-pm/` data from the toolkit repo.

**Verification:**

```bash
pnpm --filter @ai-pm/cli test
pnpm --filter @ai-pm/cli build
node packages/cli/bin/ai-pm.js init "Wave6 Smoke Project" --help
```

## Agent 2 — Schema Validation CLI

**Objective:** Expose the existing schema validation runtime through a CLI command so agents can validate workflow outputs before handoff.

**Scope:**

- create `packages/cli/src/commands/schema.ts`
- modify `packages/cli/src/index.ts`
- modify `packages/cli/bin/ai-pm.js`
- create or extend CLI tests

**Required behavior:**

- `ai-pm schema list`
- `ai-pm schema validate --workflow <workflow-id> --input <file.json>`
- `--json` output for automation
- Human-readable validation errors with JSON pointer/path when available
- Use `validateWorkflowOutput` or the existing exported core workflow validator.
- Do not duplicate schemas inside CLI.

**Verification:**

```bash
pnpm --filter @ai-pm/cli test
pnpm --filter @ai-pm/cli build
node packages/cli/bin/ai-pm.js schema --help
```

## Agent 3 — Server Memory API Tests and Contract Alignment

**Objective:** Make the local server memory API reliable enough for desktop, mobile, and future chat gateways.

**Scope:**

- `packages/server/src/routes/memory.ts`
- create `packages/server/src/routes/memory.integration.test.ts`
- `docs/architecture/local-server-api-surface.md`

**Required behavior:**

- Add integration tests for memory summary, task list/create/complete, artifact list, and artifact archive.
- Align implemented route paths with docs. If a route path has already shipped, keep backward-compatible aliases rather than breaking callers.
- Validate bad inputs and missing IDs with stable non-2xx responses.
- Confirm all writes are project-root scoped and do not touch global data.

**Verification:**

```bash
pnpm --filter @ai-pm/server test
pnpm --filter @ai-pm/server build
```

## Agent 4 — Desktop Runtime Lifecycle and Status

**Objective:** Make desktop clearly expose whether the local runtime server is available and which project root it serves.

**Scope:**

- `packages/desktop/main.ts`
- `packages/desktop/preload.ts`
- `packages/desktop/src/global.d.ts`
- one focused desktop component or store for runtime status
- `run-desktop-app.md` if startup instructions change

**Required behavior:**

- Main process owns server lifecycle and shuts it down cleanly on app quit.
- Expose read-only IPC for runtime server status: running, host, port, projectRoot, health.
- Renderer displays runtime status without importing Node APIs or server internals.
- Do not change approval business logic; approval data remains behind IPC/runtime APIs.

**Verification:**

```bash
pnpm --filter @ai-pm/desktop build
rg -n "node:fs|node:path|@ai-pm/server|@ai-pm/core/runtime" packages/desktop/src
```

## Agent 5 — Mobile Local Server Configuration UX

**Objective:** Let the PM configure and verify the laptop local server from mobile while keeping mock fallback explicit.

**Scope:**

- `packages/mobile/src/state/approval-store.ts`
- `packages/mobile/src/screens/ApprovalsScreen.tsx`
- `packages/mobile/src/screens/ApprovalDetailScreen.tsx`
- create a focused settings/config component if needed
- `docs/product/mobile-approval-api-client.md`

**Required behavior:**

- Add UI/state for local server base URL.
- Add a health check against the local server before showing runtime mode.
- Clearly label `local_server` vs `mock_fallback`.
- Avoid silent fallback after write operations; failed write should surface an error.
- Keep offline/mock data visually separated from real project runtime data.

**Verification:**

```bash
pnpm --filter @ai-pm/mobile build
```

## Agent 6 — Weekly Report First Workflow Slice

**Objective:** Build the first local-only weekly report workflow slice, without external publication.

**Scope:**

- `packages/core/src/workflows/`
- `packages/cli/src/commands/` only if adding a narrow CLI entrypoint is necessary
- `templates/reports/weekly-status.md`
- relevant workflow docs under `workflows/reporting/`

**Required behavior:**

- Generate a weekly report draft from local/project-scoped inputs.
- Use the existing weekly report template instead of inventing a new format.
- Persist draft artifact metadata to memory.
- Queue an approval item for publication/review, but do not publish externally.
- Record audit assumptions when connectors are unavailable.
- Keep all outputs local and project-scoped.

**Verification:**

```bash
pnpm --filter @ai-pm/core test
pnpm --filter @ai-pm/cli test
pnpm build
```

## Parallel Execution Map

These tasks can run in parallel because their scopes are separated:

```text
Agent 1: CLI init bootstrap
Agent 2: CLI schema validation
Agent 3: Server memory API tests
Agent 4: Desktop runtime status
Agent 5: Mobile local server UX
Agent 6: Weekly report workflow slice
```

Conflict rule: if two agents need the same file unexpectedly, the agent must stop and report the conflict instead of broadening scope.
