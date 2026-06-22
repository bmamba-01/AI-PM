# Wave 18 Tracking Skills Assignment

> Status: ready for delegation  
> Created: 2026-06-22  
> Plan: `docs/superpowers/plans/2026-06-22-tracking-skills-implementation.md`  
> Goal: build the built-in orchestrator and agent skills that force every delegated task to be tracked in the project-selected tool.

## Required Reading For Every Agent

1. `AGENTS.md`
2. `docs/superpowers/plans/2026-06-19-pm-orchestrator-master-plan.md`
3. `docs/superpowers/plans/2026-06-22-tracking-skills-implementation.md`
4. `docs/operating-model/tracking-tool-contract.md`
5. `docs/operating-model/subagent-protocol.md`
6. `examples/ai-pm-tm-test-project/.ai-pm/profile.yaml`

## Agent 1: Core Tracking Types And Profile Validation

**Objective:** Add typed tracking contracts and profile validation.

**Scope:**

- `packages/core/src/tracking/types.ts`
- `packages/core/src/runtime/projectProfile.ts`
- `packages/core/src/tracking/types.test.ts`
- `packages/core/src/runtime/projectProfile.test.ts`

**Acceptance:**

- Valid tracking systems: `notion`, `jira`, `linear`, `github`, `excel`, `local_memory`.
- Valid tracking modes: `live`, `dry_run`, `local_import`, `manual`.
- Invalid tracking system fails validation.

**Verification:**

```bash
corepack pnpm@9.4.0 --filter @ai-pm/core test -- src/runtime/projectProfile.test.ts src/tracking/types.test.ts
corepack pnpm@9.4.0 --filter @ai-pm/core build
```

## Agent 2: Adapter Registry And Local Memory Adapter

**Objective:** Build the adapter interface and local memory implementation.

**Scope:**

- `packages/core/src/tracking/registry.ts`
- `packages/core/src/tracking/localMemoryAdapter.ts`
- `packages/core/src/tracking/registry.test.ts`

**Acceptance:**

- Resolver reads project profile and returns the correct adapter.
- Missing tracking config defaults to `local_memory`.
- Local memory adapter can create, complete, block, and verify a task.

**Verification:**

```bash
corepack pnpm@9.4.0 --filter @ai-pm/core test -- src/tracking/registry.test.ts
```

## Agent 3: Notion And Excel Dry-Run Adapters

**Objective:** Make Notion/Excel usable as project trackers without live mutation.

**Scope:**

- `packages/core/src/tracking/notionAdapter.ts`
- `packages/core/src/tracking/excelAdapter.ts`
- `packages/core/src/tracking/notionAdapter.test.ts`
- `packages/core/src/tracking/excelAdapter.test.ts`
- `examples/ai-pm-tm-test-project/integrations/notion/issues.csv`

**Acceptance:**

- Notion local-import mode creates/updates rows in `issues.csv`.
- Excel adapter supports CSV-compatible rows.
- Both adapters return external task id/url and `dry_run_only` when not live.

**Verification:**

```bash
corepack pnpm@9.4.0 --filter @ai-pm/core test -- src/tracking/notionAdapter.test.ts src/tracking/excelAdapter.test.ts
```

## Agent 4: Orchestrator Lifecycle Integration

**Objective:** Force orchestrated work to create/bind a tracker task before agent assignment and verify tracker completion afterward.

**Scope:**

- `packages/core/src/tracking/taskLifecycle.ts`
- `packages/core/src/orchestrator/orchestratorRun.ts`
- `packages/core/src/orchestrator/executionRecord.ts`
- `packages/core/src/tracking/taskLifecycle.test.ts`
- `packages/core/src/orchestrator/orchestratorRun.test.ts`

**Acceptance:**

- Execution records store `tracking.tool`, `external_task_id`, `external_task_url`, and local memory mirror id.
- Completed agent output is rejected when `tracking_update` is missing or mismatched.
- Dry-run completion is allowed only when the task contract allows dry-run/local-import mode.

**Verification:**

```bash
corepack pnpm@9.4.0 --filter @ai-pm/core test -- src/tracking/taskLifecycle.test.ts src/orchestrator/orchestratorRun.test.ts
```

## Agent 5: CLI Tracking Commands

**Objective:** Expose the tracker lifecycle as scriptable CLI commands.

**Scope:**

- `packages/cli/src/commands/tracking.ts`
- `packages/cli/src/index.ts`
- `packages/cli/bin/ai-pm.js`
- `packages/cli/src/commands/tracking.test.ts`
- `packages/cli/src/commands/json-regression.test.ts`

**Acceptance:**

- `ai-pm tracking resolve --json`
- `ai-pm tracking create --title ... --agent ... --workflow ... --json`
- `ai-pm tracking complete <external_task_id> --status done --report <path> --json`
- `ai-pm tracking verify <external_task_id> --json`
- All `--json` outputs are parseable JSON only.

**Verification:**

```bash
corepack pnpm@9.4.0 --filter @ai-pm/cli test -- src/commands/tracking.test.ts src/commands/json-regression.test.ts
corepack pnpm@9.4.0 --filter @ai-pm/cli build
```

## Agent 6: Built-In Skill Docs And Self-Test Wiring

**Objective:** Package the built-in orchestrator/agent skill instructions and wire the self-test project to use them.

**Scope:**

- `docs/skills/tracking/orchestrator.md`
- `docs/skills/tracking/agent-completion.md`
- `docs/skills/tracking/notion.md`
- `docs/skills/tracking/jira.md`
- `docs/skills/tracking/linear.md`
- `docs/skills/tracking/excel.md`
- `docs/skills/tracking/local-memory.md`
- `docs/operating-model/agent-operating-model.md`
- `examples/ai-pm-tm-test-project/.ai-pm/profile.yaml`
- `examples/ai-pm-tm-test-project/reports/tracking-skills-smoke-2026-06-22.md`

**Acceptance:**

- Skill docs define orchestrator task creation and agent completion update behavior.
- Self-test profile has explicit Notion tracking mode/status mapping.
- Smoke report records a dry-run Notion task create/complete cycle.

**Verification:**

```bash
rg -n "tracking.resolve_project_tracker|tracking.create_task|tracking.complete_task|external_task_id|tracking_update" docs/skills docs/operating-model examples/ai-pm-tm-test-project
```

## Final Gate For Wave 18

After all agents finish:

```bash
corepack pnpm@9.4.0 -r run build
corepack pnpm@9.4.0 -r run test
node schemas/validate-fixtures.mjs
```

Also run the standard unresolved-marker scan from the master plan.

## Boundary

No agent may perform live Notion/Jira/Linear/GitHub mutation unless an approval item exists and the PM explicitly approves it. Dry-run/local-import updates are allowed when the project profile says so.
