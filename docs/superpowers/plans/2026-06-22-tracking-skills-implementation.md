# Tracking Skills Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build built-in tracking skills so the PM Commander and delegated agents always create, update, and verify tasks in the project-selected tracking tool.

**Architecture:** Tracker selection comes from `.ai-pm/profile.yaml`. Core owns the tracker contract and adapters; CLI exposes deterministic commands; orchestrator uses tracker skills before and after delegation; subagents receive task prompts that include external task id/url and required completion skill. External tracker mutations are approval-gated, with dry-run/local-import fallback when a connector is unavailable.

**Tech Stack:** TypeScript, `packages/core`, `packages/cli`, `packages/server`, local `.ai-pm/memory`, project profile YAML, CSV/Excel-compatible artifacts, MCP connector contracts.

---

## File Structure

- Create `packages/core/src/tracking/types.ts` — shared tracking payloads, statuses, adapter result types.
- Create `packages/core/src/tracking/registry.ts` — resolves tracker adapter from project profile.
- Create `packages/core/src/tracking/localMemoryAdapter.ts` — baseline local adapter.
- Create `packages/core/src/tracking/notionAdapter.ts` — Notion dry-run/local-import adapter first, live later.
- Create `packages/core/src/tracking/excelAdapter.ts` — CSV/XLSX-row contract adapter first.
- Create `packages/core/src/tracking/taskLifecycle.ts` — create/bind/complete/verify lifecycle helpers used by orchestrator.
- Modify `packages/core/src/runtime/projectProfile.ts` — validate `tracking.system`, `tracking.mode`, status field mapping.
- Modify `packages/core/src/orchestrator/orchestratorRun.ts` and related dispatch files — create tracking task before assignment and verify after completion.
- Modify `packages/cli/src/commands/` — add `ai-pm tracking ...` commands.
- Modify `docs/operating-model/subagent-protocol.md` — already extended with tracking fields; keep aligned with code.
- Create `docs/skills/tracking/` — built-in skill instructions for orchestrator and agents.

## Required Built-In Skills

| Skill | Used by | Required behavior |
|---|---|---|
| `tracking.resolve_project_tracker` | Orchestrator | Read project profile and select `notion`, `jira`, `linear`, `github`, `excel`, or `local_memory` |
| `tracking.create_task` | Orchestrator | Create/bind task in selected tracker and local memory mirror before delegation |
| `tracking.prepare_agent_contract` | Orchestrator | Inject tracker id/url, done status, and completion skill into subagent task |
| `tracking.complete_task` | Agent | Update the selected tracker with done/blocked/failed and report/evidence refs |
| `tracking.verify_completion` | Orchestrator | Re-read tracker state and verify the agent truly updated the right item |
| `tracking.sync_local_mirror` | Orchestrator | Sync local memory with external tracker state |

## Task 1: Tracking Types And Profile Validation

**Files:**

- Create: `packages/core/src/tracking/types.ts`
- Modify: `packages/core/src/runtime/projectProfile.ts`
- Test: `packages/core/src/tracking/types.test.ts`
- Test: `packages/core/src/runtime/projectProfile.test.ts`

- [ ] **Step 1: Define tracker types**

Create `TrackingTool`, `TrackingMode`, `TrackingTaskPayload`, `TrackingTaskRef`, `TrackingCompletionPayload`, and `TrackingUpdateResult`.

- [ ] **Step 2: Extend project profile validation**

Accept:

```yaml
tracking:
  system: notion|jira|linear|github|excel|local_memory
  mode: live|dry_run|local_import|manual
  status_field: string
  done_status: string
```

Reject unknown tracker systems.

- [ ] **Step 3: Add tests**

Test valid Notion, Jira, Linear, Excel, and local memory profiles. Test invalid tracker system fails validation.

- [ ] **Step 4: Verify**

```bash
corepack pnpm@9.4.0 --filter @ai-pm/core test -- src/runtime/projectProfile.test.ts src/tracking/types.test.ts
corepack pnpm@9.4.0 --filter @ai-pm/core build
```

## Task 2: Tracker Adapter Registry

**Files:**

- Create: `packages/core/src/tracking/registry.ts`
- Create: `packages/core/src/tracking/localMemoryAdapter.ts`
- Test: `packages/core/src/tracking/registry.test.ts`

- [ ] **Step 1: Define adapter interface**

Each adapter must implement:

```ts
createTask(payload)
getTask(ref)
updateStatus(ref, completion)
attachReport(ref, report)
addComment(ref, comment)
listProjectTasks(projectId)
```

- [ ] **Step 2: Implement local memory adapter**

Use `MemoryStore` to create/update `.ai-pm/memory` tasks and artifact refs.

- [ ] **Step 3: Implement registry resolver**

Resolve adapter by `tracking.system`, defaulting to `local_memory` when tracking config is missing.

- [ ] **Step 4: Verify**

```bash
corepack pnpm@9.4.0 --filter @ai-pm/core test -- src/tracking/registry.test.ts
```

## Task 3: Notion And Excel Dry-Run Adapters

**Files:**

- Create: `packages/core/src/tracking/notionAdapter.ts`
- Create: `packages/core/src/tracking/excelAdapter.ts`
- Test: `packages/core/src/tracking/notionAdapter.test.ts`
- Test: `packages/core/src/tracking/excelAdapter.test.ts`
- Modify: `examples/ai-pm-tm-test-project/integrations/notion/issues.csv`

- [ ] **Step 1: Implement Notion dry-run/local-import adapter**

When mode is `local_import`, append/update rows in `integrations/notion/issues.csv` and return:

```json
{
  "tool": "notion",
  "mode": "local_import",
  "external_task_id": "notion-local:<slug-or-row-id>",
  "external_task_url": "file://integrations/notion/issues.csv",
  "result": "dry_run_only"
}
```

- [ ] **Step 2: Implement Excel adapter contract**

Support CSV-compatible row updates first. XLSX can be added later through the spreadsheet runtime.

- [ ] **Step 3: Add tests**

Test create, complete, blocked, and attach report flows for Notion local import and Excel CSV.

- [ ] **Step 4: Verify**

```bash
corepack pnpm@9.4.0 --filter @ai-pm/core test -- src/tracking/notionAdapter.test.ts src/tracking/excelAdapter.test.ts
```

## Task 4: Orchestrator Tracking Lifecycle

**Files:**

- Create: `packages/core/src/tracking/taskLifecycle.ts`
- Modify: `packages/core/src/orchestrator/orchestratorRun.ts`
- Modify: `packages/core/src/orchestrator/executionRecord.ts`
- Test: `packages/core/src/tracking/taskLifecycle.test.ts`
- Test: `packages/core/src/orchestrator/orchestratorRun.test.ts`

- [ ] **Step 1: Create task before assignment**

Before `agent_assignment`, call `tracking.create_task` and store `external_task_id`, `external_task_url`, `tracking.tool`, and local memory id in the execution record.

- [ ] **Step 2: Prepare agent contract**

Every subagent task must include:

```yaml
tracking:
  tool: notion
  external_task_id: notion-local:...
  external_task_url: ...
  update_required_on_completion: true
  skill_required:
    agent_complete: tracking.complete_task
```

- [ ] **Step 3: Verify completion**

Reject completed agent output when tracker id is missing, mismatched, or not updated.

- [ ] **Step 4: Verify**

```bash
corepack pnpm@9.4.0 --filter @ai-pm/core test -- src/tracking/taskLifecycle.test.ts src/orchestrator/orchestratorRun.test.ts
```

## Task 5: CLI Tracking Commands

**Files:**

- Create: `packages/cli/src/commands/tracking.ts`
- Modify: `packages/cli/src/index.ts`
- Modify: `packages/cli/bin/ai-pm.js`
- Test: `packages/cli/src/commands/tracking.test.ts`
- Modify: `packages/cli/src/commands/json-regression.test.ts`

- [ ] **Step 1: Add commands**

Commands:

```bash
ai-pm tracking resolve --json
ai-pm tracking create --title "..." --agent reporting --workflow weekly-report --json
ai-pm tracking complete <external_task_id> --status done --report <path> --json
ai-pm tracking verify <external_task_id> --json
```

- [ ] **Step 2: Enforce JSON cleanliness**

All tracking commands with `--json` must emit parseable JSON only.

- [ ] **Step 3: Verify**

```bash
corepack pnpm@9.4.0 --filter @ai-pm/cli test -- src/commands/tracking.test.ts src/commands/json-regression.test.ts
corepack pnpm@9.4.0 --filter @ai-pm/cli build
```

## Task 6: Built-In Skill Instructions

**Files:**

- Create: `docs/skills/tracking/orchestrator.md`
- Create: `docs/skills/tracking/agent-completion.md`
- Create: `docs/skills/tracking/notion.md`
- Create: `docs/skills/tracking/jira.md`
- Create: `docs/skills/tracking/linear.md`
- Create: `docs/skills/tracking/excel.md`
- Create: `docs/skills/tracking/local-memory.md`
- Modify: `docs/operating-model/agent-operating-model.md`

- [ ] **Step 1: Write orchestrator skill**

Must instruct PM Commander to resolve project tracker, create/bind external task, mirror local memory, and inject tracking metadata into the agent prompt.

- [ ] **Step 2: Write agent completion skill**

Must instruct agents to update the tracker before returning completed status, or return blocked/dry-run output.

- [ ] **Step 3: Write tool-specific skill pages**

Each page defines required fields, status mapping, completion update, and dry-run fallback.

- [ ] **Step 4: Verify**

```bash
rg -n "tracking.resolve_project_tracker|tracking.create_task|tracking.complete_task|external_task_id|tracking_update" docs/skills docs/operating-model
```

## Task 7: Self-Test Project Wiring

**Files:**

- Modify: `examples/ai-pm-tm-test-project/.ai-pm/profile.yaml`
- Modify: `examples/ai-pm-tm-test-project/integrations/notion/issues.csv`
- Modify: `examples/ai-pm-tm-test-project/.ai-pm/memory/state.json`
- Create: `examples/ai-pm-tm-test-project/reports/tracking-skills-smoke-2026-06-22.md`

- [ ] **Step 1: Add explicit tracking status mapping**

Add:

```yaml
tracking:
  system: "notion"
  mode: "local_import"
  status_field: "Status"
  done_status: "Done"
```

- [ ] **Step 2: Run CLI smoke**

Create and complete one dry-run Notion task through the tracking CLI.

- [ ] **Step 3: Write smoke report**

Record command outputs, created task id, local import row, memory mirror id, and verification status.

## Task 8: Completion Gate

**Files:**

- Modify: `packages/cli/src/commands/completion-gate.test.ts`
- Modify: `docs/superpowers/plans/final-green-gate.md`

- [ ] **Step 1: Add tracking command checks**

Add smoke coverage for:

```bash
ai-pm tracking resolve --json
ai-pm tracking create --title smoke --agent reporting --workflow weekly-report --json
ai-pm tracking verify <id> --json
```

- [ ] **Step 2: Run full gate**

```bash
corepack pnpm@9.4.0 -r run build
corepack pnpm@9.4.0 -r run test
node schemas/validate-fixtures.mjs
```

Also run the standard unresolved-marker scan from the master plan.

## Acceptance Criteria

- The orchestrator cannot delegate a task without a tracker reference unless tracking system is explicitly `local_memory`.
- Agent prompts include tracker tool, external task id/url, done status, and required completion skill.
- Agent output contract includes `tracking_update`.
- Completion is rejected when tracker update is missing or mismatched.
- Notion self-test works in local-import/dry-run mode.
- Jira, Linear, Excel, and local memory have adapter contracts and skill instructions.
- No live external mutation occurs without an approval item.
