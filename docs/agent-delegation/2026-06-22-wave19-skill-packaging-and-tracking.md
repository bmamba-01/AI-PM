# Wave 19: Skill Packaging And Tracking Surface

## Objective

Close the remaining gap between tracking contracts and actual delegation runtime usage.

Wave 18 produced tracking core code and documentation contracts, but verification showed three missing pieces:

1. no packaged runtime skills under `.ai-pm-skills/`
2. no `ai-pm tracking` CLI surface
3. no common `skills` status surface for CLI, desktop, and chat/mobile

Wave 19 must fix those gaps. All tasks remain project-scoped and must follow `AGENTS.md`, the master plan, `docs/operating-model/subagent-protocol.md`, `docs/operating-model/tracking-tool-contract.md`, and `docs/operating-model/skill-packaging-contract.md`.

## Shared Acceptance Criteria

- A delegated task can be traced by tracker and by skill.
- The orchestrator can tell which tool created the task and which tool must close it.
- Agents can load short packaged instructions instead of relying on long prompt prose.
- `ai-pm skills ...` becomes the canonical runtime status surface.
- `/skills` can reuse the same registry payload later in chat/mobile.

## Agent 1 — Green Gate Repair And Tracking Contract Audit

**Scope**

- Verify wave 18 tracking/profile tests and fix only tracking-contract regressions.
- Re-run the targeted core test gate.
- Audit whether `packages/core/src/tracking/*` matches `docs/operating-model/tracking-tool-contract.md`.

**Files**

- `packages/core/src/runtime/profile.test.ts`
- `packages/core/src/runtime/projectProfile.ts`
- `packages/core/src/tracking/*`
- `docs/operating-model/tracking-tool-contract.md`

**Deliverables**

- concise verification report
- list of mismatches between code and tracking contract
- only minimal code fixes needed to keep the targeted gate green

**Verify**

```bash
corepack pnpm@9.4.0 --filter @ai-pm/core test -- src/runtime/profile.test.ts src/tracking/types.test.ts src/tracking/registry.test.ts src/tracking/notionAdapter.test.ts src/tracking/excelAdapter.test.ts src/tracking/taskLifecycle.test.ts
```

## Agent 2 — Tracking CLI Commands

**Scope**

- Implement `ai-pm tracking resolve|create|complete|verify`.
- Keep `--json` output parseable and consistent with existing CLI conventions.
- Add regression coverage.

**Files**

- `packages/cli/src/commands/tracking.ts`
- `packages/cli/src/index.ts`
- `packages/cli/bin/ai-pm.js`
- `packages/cli/src/commands/tracking.test.ts`
- `packages/cli/src/commands/json-regression.test.ts`

**Verify**

```bash
corepack pnpm@9.4.0 --filter @ai-pm/cli test -- src/commands/tracking.test.ts src/commands/json-regression.test.ts
corepack pnpm@9.4.0 --filter @ai-pm/cli build
```

## Agent 3 — Packaged Runtime Skills

**Scope**

- Create actual packaged runtime skills under `.ai-pm-skills/`.
- Convert tracking docs into loadable `skill.json` + `instructions.md`.
- Keep ids aligned with `tracking-tool-contract.md`.

**Files**

- `.ai-pm-skills/tracking.resolve_project_tracker/skill.json`
- `.ai-pm-skills/tracking.resolve_project_tracker/instructions.md`
- `.ai-pm-skills/tracking.create_task/*`
- `.ai-pm-skills/tracking.prepare_agent_contract/*`
- `.ai-pm-skills/tracking.complete_task/*`
- `.ai-pm-skills/tracking.block_task/*`
- `.ai-pm-skills/tracking.verify_completion/*`
- `.ai-pm-skills/tracking.sync_local_mirror/*`
- `docs/skills/tracking/*`

**Deliverables**

- packaged skill directories
- docs mirror for human browsing
- evidence that `SkillLoader` can discover them from `.ai-pm-skills/`

**Verify**

```bash
rg -n "\"id\": \"tracking\\.|tracking\\." .ai-pm-skills docs/skills
```

## Agent 4 — Skills Registry And Status Surface

**Scope**

- Add runtime and CLI status surface for skills.
- Implement `ai-pm skills list`, `ai-pm skills status`, `ai-pm skills show <id>`.
- Make payloads suitable for later desktop/chat reuse.

**Files**

- `packages/core/src/skills/*`
- `packages/cli/src/commands/skills.ts`
- `packages/cli/src/index.ts`
- `packages/cli/bin/ai-pm.js`
- tests under `packages/cli/src/commands/`

**Required output fields**

- `skill_id`
- `owner`
- `category`
- `project_id`
- `tracking_tool`
- `active_task_count`
- `pending_approval_count`
- `tasks`

**Verify**

```bash
node packages/cli/bin/ai-pm.js skills list --json
node packages/cli/bin/ai-pm.js skills status --json
```

## Agent 5 — Orchestrator Enforcement

**Scope**

- Wire tracker lifecycle into orchestrator assignment/completion flow.
- Ensure delegated tasks store `skill_required.orchestrator_create` and `skill_required.agent_complete`.
- Reject completions with mismatched or missing `tracking_update`.

**Files**

- `packages/core/src/orchestrator/orchestratorRun.ts`
- related dispatch/execution record files
- `packages/core/src/tracking/taskLifecycle.ts`
- orchestrator tests

**Verify**

```bash
corepack pnpm@9.4.0 --filter @ai-pm/core test -- src/tracking/taskLifecycle.test.ts src/orchestrator/orchestratorRun.test.ts
```

## Agent 6 — Self-Test Project And `/skills` Read Model

**Scope**

- Use the self-test project to prove one full loop:
  - resolve Notion local-import tracker
  - create task
  - complete task
  - verify completion
  - expose status through `skills status`
- Prepare read model fields needed later for desktop/chat `/skills`.

**Files**

- `examples/ai-pm-tm-test-project/.ai-pm/profile.yaml`
- `examples/ai-pm-tm-test-project/.ai-pm/memory/*`
- `examples/ai-pm-tm-test-project/integrations/notion/*`
- `examples/ai-pm-tm-test-project/reports/wave19-skills-smoke-2026-06-22.md`

**Verify**

```bash
node packages/cli/bin/ai-pm.js tracking resolve --json
node packages/cli/bin/ai-pm.js tracking create --title "wave19 smoke" --agent reporting --workflow weekly-report --json
node packages/cli/bin/ai-pm.js skills status --json
```

## Review Rule

No agent may claim completion based only on docs or unit tests. Each report must show whether the feature is:

- packaged
- discoverable
- callable
- trackable

If one of those four is missing, report `blocked` or `partial`, not `completed`.
