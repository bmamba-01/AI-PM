# Next Runtime Functions Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Define the next runtime functions after Daily Briefing: project scan, audit inspection, approval queue, and workflow schema adoption.

**Architecture:** Keep runtime execution in `packages/core` and `packages/cli`, with UI and MCP integration layered on later. Do not start new runtime implementation until the current MCP/CLI WIP is repaired, because `packages/mcp` and `packages/cli` are currently red from agent changes.

**Tech Stack:** TypeScript, Vitest, Commander, local `.ai-pm/` file store, future SQLite, JSON Schema.

---

## Current Verification State

Last verified on 2026-06-19 (post Agent 1 repair):

```text
pnpm --filter @ai-pm/core test
Result: PASS, 3 tests

pnpm --filter @ai-pm/core build
Result: PASS

pnpm --filter @ai-pm/mcp build
Result: PASS (repaired by Agent 1)

pnpm --filter @ai-pm/cli build
Result: PASS (repaired by Agent 1)

pnpm build
Result: PASS (all 7 packages)
```

**Status: REPO IS GREEN.** All blockers from Agent 1 repair are resolved.

## Completed Delegated Work

| Agent | Task | Status | Output |
|---|---|---|---|
| Agent 1 | Repair MCP/CLI WIP | ✅ Done | `packages/mcp` and `packages/cli` build again |
| Agent 2 | Move/clean PM templates | ✅ Done | 9 templates in `templates/` (README needs trim) |
| Agent 3 | MCP registry/profile validation | ✅ Done | `ai-pm mcp validate` works, docs in `docs/architecture/` |
| Agent 4 | Workflow JSON schemas (7) | ✅ Done | `schemas/workflows/` — 7 input/output schemas + README |
| Agent 4 | Schema expansion (4) | ✅ Done | `schemas/audit/`, `schemas/approval/`, `schemas/subagent/` |
| Agent 4 | Schema hardening + fixtures | ✅ Done | 3 fields patched, 20 test fixtures created |
| Agent 5 | Approval queue UX spec | ✅ Done | `docs/product/approval-queue-ux.md` (346 lines) |
| Agent 5 | Approval queue runtime contract | ✅ Done | `docs/architecture/approval-queue-runtime-contract.md` (618 lines) |
| Agent 5 | Approval queue CLI spec | ✅ Done | `docs/product/approval-queue-cli-spec.md` |

## Next Main-Thread Sequence

### Task 1: Stabilization Gate

**Status: ✅ COMPLETE**

- [x] Agent 1 repaired MCP/CLI WIP
- [x] `pnpm --filter @ai-pm/mcp build` passes
- [x] `pnpm --filter @ai-pm/cli build` passes
- [x] `pnpm build` passes (all 7 packages)
- [x] `pnpm --filter @ai-pm/core test` passes

### Task 2: Audit Inspection CLI

**Files:**
- Modify: `packages/core/src/runtime/localProjectStore.ts`
- Test: `packages/core/src/runtime/localProjectStore.test.ts`
- Create: `packages/cli/src/commands/audit.ts`
- Modify: `packages/cli/src/index.ts`
- Modify: `packages/cli/bin/ai-pm.js`

Purpose:

- Add `ai-pm audit list`.
- Read `.ai-pm/audit/workflow-runs.jsonl`.
- Print latest workflow runs as table or JSON.

Acceptance:

- Missing audit file returns empty list, not error.
- Invalid JSON lines are reported as warnings and skipped.
- JSON output includes `runId`, `workflowId`, `projectId`, `status`, `startedAt`, `completedAt`.

Verification:

```bash
pnpm --filter @ai-pm/core test -- src/runtime/localProjectStore.test.ts
pnpm --filter @ai-pm/cli build
node packages/cli/bin/ai-pm.js audit list --json
```

### Task 3: Project Scan CLI

**Files:**
- Create: `packages/core/src/runtime/projectScanner.ts`
- Test: `packages/core/src/runtime/projectScanner.test.ts`
- Create: `packages/cli/src/commands/project.ts`
- Modify: `packages/cli/src/index.ts`
- Modify: `packages/cli/bin/ai-pm.js`

Purpose:

- Add `ai-pm project scan`.
- Detect operating-layer readiness in a project folder.
- Report missing required files: `AGENTS.md`, `README.md`, active design spec, active plan, workflows, playbooks, MCP registry.

Acceptance:

- Returns structured readiness result.
- Supports `--json`.
- Does not mutate files.

Verification:

```bash
pnpm --filter @ai-pm/core test -- src/runtime/projectScanner.test.ts
pnpm --filter @ai-pm/cli build
node packages/cli/bin/ai-pm.js project scan --json
```

### Task 4: Approval Queue Runtime Foundation

**Files:**
- Create: `packages/core/src/runtime/approvalQueue.ts`
- Test: `packages/core/src/runtime/approvalQueue.test.ts`
- Modify: `packages/core/src/runtime/index.ts`

Purpose:

- Add local approval item model and file-backed queue under `.ai-pm/approvals.json`.
- Support create, list, approve, reject, request revision.

Acceptance:

- Approval item states: `pending`, `approved`, `rejected`, `revision_requested`.
- Audit-friendly fields: `approvalId`, `projectId`, `actionType`, `targetSystem`, `summary`, `requestedBy`, `createdAt`, `updatedAt`.
- No external mutation occurs.

Verification:

```bash
pnpm --filter @ai-pm/core test -- src/runtime/approvalQueue.test.ts
pnpm --filter @ai-pm/core build
```

### Task 5: Workflow Schema Adoption

**Prerequisites: ✅ MET** — Agent 4 completed all schemas + fixtures.

**Files:**
- Create: `packages/core/src/workflows/schemaValidation.ts`
- Test: `packages/core/src/workflows/schemaValidation.test.ts`

Purpose:

- Load workflow JSON schemas.
- Validate workflow output before audit persistence.
- Start with Daily Briefing output only.

Acceptance:

- Invalid workflow output returns validation issues.
- Valid daily briefing output passes.
- Runtime can be used without schema files by returning a clear warning.

## Main Thread Ownership

Main thread should own:

- Runtime contract correctness.
- Core tests.
- CLI commands that exercise already-stable core behavior.
- Final integration decisions after delegated agents return.

Delegated agents should own:

- Docs/templates/specs.
- Isolated UI panels.
- Schema files.
- MCP validation repair unless main thread explicitly takes it over.
