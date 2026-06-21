# Phase 2 Coding Agent Delegation Plan

> **Date:** 2026-06-19  
> **Requested by:** Orchestrator  
> **Scope:** Assign 4 coding agents to parallel runtime tasks

---

## Current State Summary

### Completed (Wave 1 + Wave 2 partial)

| Task | Agent | Status |
|------|-------|--------|
| Task 1: Stabilization Gate | Agent 1 | ✅ |
| Task 2: Audit Inspection CLI | Coding Agent 1 | ✅ |
| Task 3: Project Scan CLI | Coding Agent 2 | ✅ |
| Task 4: Approval Queue Runtime | Coding Agent 3 | ✅ Code (263+217 lines, 23 tests) |
| Daily Briefing panel | Agent 6 | ✅ |
| daily.ts fix | Agent 6 | ✅ |
| Approval desktop panel | Agent 6 | ✅ |
| Approval mobile screens | Agent 6 | ✅ |

### Remaining Tasks

| Task | Depends on | Priority |
|------|-----------|----------|
| Task 5: Schema Validation Runtime | Task 4 (done) | High |
| Approval Queue CLI commands | Task 4 (done) | High |
| Wire approval UI to runtime | Task 4 (done) + CLI | Medium |
| Integration testing | All above | Low |

---

## Dependency Graph

```
Task 4 (Approval Queue Runtime) ✅ DONE
    ├──→ Task 5: Schema Validation Runtime [Coding Agent 1]
    └──→ Approval Queue CLI Commands [Coding Agent 2]
              └──→ Wire UI to Runtime [Coding Agent 3]
                        └──→ Integration Tests [Coding Agent 4]
```

## Parallel Assignment

### Coding Agent 1 → Task 5: Schema Validation Runtime

**What:** Create `packages/core/src/workflows/schemaValidation.ts`
- Load JSON schemas from `schemas/workflows/`
- Validate workflow output against schema before audit persistence
- Start with Daily Briefing output only
- Runtime can work without schema files (clear warning)
- 100% test coverage on validation logic

**Why Agent 1:** Already familiar with core runtime patterns (Task 2: audit CLI)

**Prompt file:** `docs/agent-delegation/2026-06-19-agent-1-task5-prompt.md` (to create)

---

### Coding Agent 2 → Approval Queue CLI Commands

**What:** Create `packages/cli/src/commands/approval.ts`
- `ai-pm approval list` (filters: status, priority, workflow)
- `ai-pm approval show <id>` (detail + audit trail)
- `ai-pm approval decide <id> <decision>` (approve/reject/revision)
- `ai-pm approval delegate <id> <user>`
- `ai-pm approval count`
- `ai-pm approval policy list`
- `ai-pm approval policy revoke <id>`
- All commands: bilingual EN/VI, --json output, confirmation prompts
- HTTP client to local server API (or direct store for MVP)

**Why Agent 2:** Already familiar with CLI patterns (Task 3: project scan CLI)

**Prompt file:** `docs/agent-delegation/2026-06-19-agent-2-task4-cli-prompt.md` (to create)

---

### Coding Agent 3 → Wire Approval UI to Runtime

**What:** Connect existing desktop + mobile approval panels to the approval queue runtime
- Desktop `ApprovalsTab.tsx`: replace mock data with API calls to approval queue
- Mobile `ApprovalsScreen.tsx`: replace mock data with API calls
- Desktop `ApprovalDetailScreen`: wire approve/reject/revision/delegate actions
- Mobile `ApprovalDetailScreen`: wire approve/reject/revision/delegate actions
- Create shared approval store or fetch utility

**Why Agent 3:** Familiar with the approval queue runtime (Task 4: built it)

**Depends on:** Coding Agent 2 completing CLI commands (shared API patterns)

**Prompt file:** `docs/agent-delegation/2026-06-19-agent-3-task4-wire-prompt.md` (to create)

---

### Coding Agent 4 → Integration Testing + E2E

**What:** Create integration tests that exercise the full approval queue flow
- Create `packages/core/src/runtime/approvalQueue.integration.test.ts`
- Test full flow: create → list → decide → resubmit → execute
- Test CLI commands against real store
- Test schema validation against real workflow outputs
- Verify no regressions in existing tests

**Why Agent 4:** Fresh perspective, no context from building individual pieces

**Depends on:** Tasks 5 and CLI commands being complete

**Prompt file:** `docs/agent-delegation/2026-06-19-agent-4-integration-test-prompt.md` (to create)

---

## Execution Order

```
Phase 2a (parallel, no dependencies):
  ├── Coding Agent 1: Task 5 (Schema Validation)
  └── Coding Agent 2: Approval Queue CLI

Phase 2b (after Phase 2a):
  └── Coding Agent 3: Wire UI to Runtime

Phase 2c (after Phase 2b):
  └── Coding Agent 4: Integration Tests
```

## Files to Create

| File | Purpose |
|------|---------|
| `docs/agent-delegation/2026-06-19-agent-1-task5-prompt.md` | Schema Validation prompt |
| `docs/agent-delegation/2026-06-19-agent-2-task4-cli-prompt.md` | Approval CLI prompt |
| `docs/agent-delegation/2026-06-19-agent-3-task4-wire-prompt.md` | UI wiring prompt |
| `docs/agent-delegation/2026-06-19-agent-4-integration-test-prompt.md` | Integration test prompt |
| `docs/superpowers/plans/2026-06-19-next-runtime-functions.md` | Updated master plan |
| `docs/agent-delegation/2026-06-19-delegation-forecast.md` | Updated forecast |
