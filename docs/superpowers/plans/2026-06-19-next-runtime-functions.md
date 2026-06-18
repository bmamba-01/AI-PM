# Next Runtime Functions Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Define the next runtime functions after Daily Briefing: project scan, audit inspection, approval queue, and workflow schema adoption.

**Architecture:** Keep runtime execution in `packages/core` and `packages/cli`, with UI and MCP integration layered on later. Do not start new runtime implementation until the current MCP/CLI WIP is repaired, because `packages/mcp` and `packages/cli` are currently red from agent changes.

**Tech Stack:** TypeScript, Vitest, Commander, local `.ai-pm/` file store, future SQLite, JSON Schema.

---

## Current Verification State

Last verified on 2026-06-19:

```text
pnpm --filter @ai-pm/core test -- src/runtime/localProjectStore.test.ts src/workflows/dailyBriefing.test.ts
Result: PASS, 2 files, 3 tests

pnpm --filter @ai-pm/core build
Result: PASS

pnpm --filter @ai-pm/mcp build
Result: FAIL due current MCP WIP

pnpm --filter @ai-pm/cli build
Result: FAIL because CLI imports current MCP WIP
```

Known blockers from current working tree:

- `packages/cli/src/commands/mcp.ts` no longer exports `mcpCommand`.
- `packages/mcp/src/registry/configValidator.ts` references missing `validateSeverities`.
- `packages/mcp/src/registry/configLoader.ts` resolves registry path to `C:\mcp\registry.yaml`.
- `packages/mcp/src/registry/configValidator.test.ts` is included in package build and currently has duplicate imports/type errors.
- Extra runtime files under root `mcp/src/` and `mcp/serverRegistry.ts` are outside package boundaries.

Do not start package-wide runtime work until this is repaired or isolated.

## Delegated Work In Flight

These tasks are already delegated and must not be duplicated:

- Agent 1: repair/clarify MCP registry/CLI WIP after scope mismatch.
- Agent 2: move and clean PM templates into `C:\Works\AI-PM\templates`.
- Agent 3: MCP registry/profile validation layer.
- Agent 4: workflow JSON schemas under `schemas/workflows/`.
- Agent 5: approval queue UX/runtime contract docs.
- Agent 6: desktop read-only Daily Briefing panel.

## Next Main-Thread Sequence

### Task 1: Stabilization Gate

**Files:** none unless repairing own code.

- [ ] Confirm Agent 1/MCP WIP is either fixed or reverted by the assigned agent.
- [ ] Run `pnpm --filter @ai-pm/mcp build`.
- [ ] Run `pnpm --filter @ai-pm/cli build`.
- [ ] Run `pnpm build`.
- [ ] Do not merge any dependent runtime plan until these pass.

### Task 2: Audit Inspection CLI

**Files:**
- Modify: `packages/core/src/runtime/localProjectStore.ts`
- Test: `packages/core/src/runtime/localProjectStore.test.ts`
- Modify: `packages/cli/src/commands/daily.ts` or create `packages/cli/src/commands/audit.ts`
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

Prerequisite:

- Agent 4 completes `schemas/workflows/`.

Files:

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

