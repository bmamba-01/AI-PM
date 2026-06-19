# Next Runtime Functions Implementation Plan

> **Last updated:** 2026-06-19 (post Coding Agent 2 Task 3 completion)

**Goal:** Define the next runtime functions after Daily Briefing: project scan, audit inspection, approval queue, and workflow schema adoption.

**Architecture:** Keep runtime execution in `packages/core` and `packages/cli`, with UI and MCP integration layered on later.

**Tech Stack:** TypeScript, Vitest, Commander, local `.ai-pm/` file store, future SQLite, JSON Schema.

---

## Current Verification State

```text
pnpm --filter @ai-pm/core build          PASS
pnpm --filter @ai-pm/core test           PASS (11+ tests across 3+ files)
pnpm --filter @ai-pm/mcp build           PASS (repaired by Agent 1)
pnpm --filter @ai-pm/cli build           PASS (repaired by Agent 1)
pnpm build                               PASS (all 7 packages)
```

**Status: REPO IS GREEN.**

## Completed Delegated Work

### Wave 1 — Operating Layer & Specs (all complete)

| Agent | Task | Status | Output |
|---|---|---|---|
| Agent 1 | Repair MCP/CLI WIP | ✅ | `packages/mcp` and `packages/cli` build again |
| Agent 2 | Move/clean PM templates | ✅ | 9 templates in `templates/` |
| Agent 2 | Trim templates README | ✅ | README matches 9 actual templates |
| Agent 2 | Template index | ✅ | `templates/templates.yaml` with metadata |
| Agent 3 | MCP registry/profile validation | ✅ | configTypes, configLoader, configValidator, 26 tests |
| Agent 5 | MCP validation hardening | ✅ | 6 invalid fixtures, 18 new test cases |
| Agent 4 | Workflow JSON schemas (7) | ✅ | `schemas/workflows/` — 7 input/output schemas |
| Agent 4 | Schema expansion (4) | ✅ | `schemas/audit/`, `schemas/approval/`, `schemas/subagent/` |
| Agent 4 | Schema hardening + fixtures | ✅ | 3 fields patched, 30 test fixtures |
| Agent 4 | Schema consistency audit | ✅ | `schemas/CONSISTENCY-AUDIT.md`, `validate-fixtures.mjs` |
| Agent 4 | Input schemas (5) | ✅ | All 6 workflows have both input and output schemas |
| Agent 5 | Approval queue UX spec | ✅ | `docs/product/approval-queue-ux.md` (346 lines) |
| Agent 5 | Approval queue runtime contract | ✅ | `docs/architecture/approval-queue-runtime-contract.md` (618 lines) |
| Agent 5 | Approval queue CLI spec | ✅ | `docs/product/approval-queue-cli-spec.md` (749 lines) |
| Agent 5 | Desktop component spec | ✅ | `docs/product/approval-queue-desktop-components.md` |
| Agent 5 | Mobile component spec | ✅ | `docs/product/approval-queue-mobile-components.md` |
| Agent 5 | Approval queue test plan | ✅ | `docs/product/approval-queue-test-plan.md` (48.5K, 51 scenarios) |

### Wave 2 — Runtime Implementation (in progress)

| Agent | Task | Status | Output |
|---|---|---|---|
| Coding Agent 1 | Task 2: Audit Inspection CLI | ✅ | `audit.ts` (102 lines), `loadWorkflowAuditRecords()`, 3+ tests |
| Coding Agent 2 | Task 3: Project Scan CLI | ✅ | `projectScanner.ts` (74 lines), `project.ts` (92 lines), 5 tests |
| Coding Agent 3 | Task 4: Approval Queue Runtime | 🔄 In progress | `approvalQueue.ts` (263 lines), `approvalQueue.test.ts` (217 lines, 23 tests) |
| Agent 6 | Daily Briefing panel (desktop) | ✅ | `DashboardTab.tsx` Daily Briefing section |
| Agent 6 | daily.ts regression fix | ✅ | Runtime logic restored, bilingual + output formats kept |
| Agent 6 | Approval queue desktop panel | ✅ | `ApprovalsTab.tsx` (303 lines), sidebar + ProjectView wired |
| Agent 6 | Approval queue mobile screens | ✅ | `ApprovalsScreen.tsx` (595 lines), `ApprovalDetailScreen.tsx` (796 lines) |

## Main Thread — Task Status

### Task 1: Stabilization Gate — ✅ COMPLETE

### Task 2: Audit Inspection CLI — ✅ COMPLETE

- [x] `loadWorkflowAuditRecords()` added to LocalProjectStore
- [x] Tests for empty file, load records, skip malformed lines
- [x] `ai-pm audit list` CLI command with bilingual, --json, --limit
- [x] Registered in index.ts and bin/ai-pm.js

### Task 3: Project Scan CLI — ✅ COMPLETE

- [x] `scanProject()` with 12 readiness checks (7 required, 5 optional)
- [x] 5 tests using temp directories
- [x] `ai-pm project scan` CLI command with --json, --path
- [x] Registered in index.ts and bin/ai-pm.js

### Task 4: Approval Queue Runtime Foundation — 🔄 IN PROGRESS (Coding Agent 3)

- [x] `approvalQueue.ts` (263 lines) with create, getItem, listItems, decide, resubmit, getCounts
- [x] `approvalQueue.test.ts` (217 lines, 23 test cases)
- [x] Exported from runtime/index.ts
- [ ] Needs verification: build pass, all tests pass, full coverage check

### Task 5: Workflow Schema Adoption — NEXT

**Prerequisites: ✅ All met**

- Schemas complete (16 schemas, 30 fixtures)
- Validation script created
- Runtime code ready (approvalQueue validates against schema fields)

**Files:**
- Create: `packages/core/src/workflows/schemaValidation.ts`
- Test: `packages/core/src/workflows/schemaValidation.test.ts`

**Purpose:**
- Load workflow JSON schemas
- Validate workflow output before audit persistence
- Start with Daily Briefing output only

## Next Agent Assignments

| Agent | Next Task | Priority | Status |
|---|---|---|---|
| Coding Agent 3 | Verify Task 4 completion | High | Pending review |
| Any Coding Agent | Task 5: Schema Validation Runtime | Medium | Ready to start |
| Agent 6 | Wire desktop/mobile to runtime | Low | After Task 4 complete |
| Agent 5 | No more tasks — fully completed | — | Released |
| Agent 2 | No more template tasks — fully completed | — | Released |
| Agent 4 | No more schema tasks — fully completed | — | Released |
