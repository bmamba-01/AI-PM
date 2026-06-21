# Remaining Master Plan Assignments — Wave 10 To Release

> **Date:** 2026-06-21  
> **Status:** Active remaining-work backlog after Wave 9 review.  
> **Canonical plan:** `docs/superpowers/plans/2026-06-19-pm-orchestrator-master-plan.md`  
> **Runtime plan:** `docs/superpowers/plans/2026-06-19-next-runtime-functions.md`

## Baseline Verified

```text
corepack pnpm@9.4.0 -r run build             PASS
corepack pnpm@9.4.0 -r run test              PASS
packages/core   (19 files, 244 tests)        PASS
packages/server (3 files, 121 tests)          PASS
packages/cli    (8 files, 128 tests)          PASS
packages/mcp    (1 file, 26 tests)           PASS
packages/mobile (1 file, 10 tests)           PASS
node schemas/validate-fixtures.mjs           PASS (30/30)
```

Every agent must read `AGENTS.md`, the canonical plan, and the relevant workflow/playbook before editing. Use `docs/operating-model/subagent-protocol.md` for final reports.

All external mutations remain approval-gated. No agent may send email/chat, update Jira/Linear/GitHub/Notion/Confluence/Drive, publish reports, or merge code.

## Execution Policy

Run waves in order. Within each wave, agents may run in parallel unless a dependency is named. The PM Commander should review and make the repo green after every wave before assigning the next one.

Completion gate after every wave:

```bash
corepack pnpm@9.4.0 -r run build
corepack pnpm@9.4.0 -r run test
node schemas/validate-fixtures.mjs
Run the unresolved-marker scan across AGENTS.md, README.md, docs, playbooks, workflows, mcp, templates, and packages, excluding historical plan files and dist output.
```

---

# Wave 10 — Profile, Capabilities, MCP Doctor, Template Tables, Init Hardening, Completion Gate

**Theme:** Make project metadata machine-readable and CLI inspectable.

---

## Agent 1 — Project Profile Schema Runtime

**Objective:** Implement a formal project profile schema consumed by CLI, orchestrator, server, desktop, and mobile.

**Scope:**

- Create: `schemas/project/profile.schema.json`
- Create: `schemas/fixtures/project/valid-profile.json`
- Create: `schemas/fixtures/project/invalid-profile-missing-name.json`
- Modify: `packages/core/src/runtime/localProjectStore.ts` (add profile load/validate)
- Create: `packages/core/src/runtime/profile.test.ts`
- Modify: `packages/cli/src/commands/project.ts` (add `profile validate` subcommand)
- Modify: `packages/cli/src/commands/project.test.ts`

**Required behavior:**

- Define schema for: `project_id`, `name`, `root`, `methodology`, `project_type`, `commercial_model`, `timezone`, `source_systems`, `local_artifact_directories`, `approval_policy`, `connector_profile`.
- Add `ai-pm project profile validate --json` that reads `.ai-pm/profile.yaml` and validates against schema.
- Add graceful defaults for missing profile fields (null → "unknown", missing arrays → []).
- Add test for missing profile file (returns warning, not error).
- Do not change desktop/mobile UI.

**Context files to read:**

1. packages/cli/src/commands/init.ts (existing profile template)
2. packages/core/src/runtime/localProjectStore.ts
3. docs/superpowers/specs/2026-06-18-ai-pm-toolkit-design.md (project model section)
4. docs/operating-model/agent-operating-model.md

**Verification:**

```bash
corepack pnpm@9.4.0 --filter @ai-pm/core test -- src/runtime/profile.test.ts
corepack pnpm@9.4.0 --filter @ai-pm/cli test
node packages/cli/bin/ai-pm.js project profile validate --json
```

---

## Agent 2 — Agent Capability Registry Runtime

**Objective:** Replace static `agent status` with a registry of PM/BA/QA/Tech Lead/Code Quality/Reporting/Meeting/Risk agents and supported workflows.

**Scope:**

- Create: `packages/core/src/orchestrator/capabilityRegistry.ts`
- Create: `packages/core/src/orchestrator/capabilityRegistry.test.ts`
- Modify: `packages/cli/src/commands/orchestrator.ts` (add `agent route`)
- Modify: `packages/cli/src/commands/orchestrator.test.ts`
- Modify: `docs/operating-model/agent-operating-model.md` (update if needed)

**Required behavior:**

- Define static capability registry for 10+ agent roles: pm_commander, ba, qa, developer, tech_lead, code_quality_guard, reporting, meeting, risk, delivery_control.
- Each role defines: supported workflows, required inputs, output formats, approval boundaries, MCP capabilities needed.
- Add `ai-pm agent status --json` with role, workflows, inputs, outputs, approval boundaries.
- Add `ai-pm agent route --workflow <id> --json` that returns which agent should handle a workflow.
- Do not change desktop/mobile UI.

**Context files to read:**

1. docs/operating-model/agent-operating-model.md
2. docs/operating-model/subagent-protocol.md
3. packages/core/src/orchestrator/ (existing state machine)
4. packages/cli/src/commands/orchestrator.ts

**Verification:**

```bash
corepack pnpm@9.4.0 --filter @ai-pm/core test -- src/orchestrator/
corepack pnpm@9.4.0 --filter @ai-pm/cli test
node packages/cli/bin/ai-pm.js agent status --json
node packages/cli/bin/ai-pm.js agent route --workflow daily-briefing --json
```

---

## Agent 3 — MCP CLI Doctor And Validate

**Objective:** Make MCP setup inspectable from CLI without calling vendor APIs.

**Scope:**

- Modify: `packages/cli/src/commands/mcp.ts` (add `doctor` subcommand)
- Modify: `packages/cli/src/commands/mcp.test.ts` (add doctor tests)
- Create: `mcp/fixtures/doctor-missing-env.yaml` (test fixture)
- Create: `mcp/fixtures/doctor-disabled-connectors.yaml` (test fixture)

**Required behavior:**

- Add/complete `ai-pm mcp validate --json` (verify it works end-to-end).
- Add `ai-pm mcp doctor --profile <name> --json` that reports:
  - Missing env vars (per connector)
  - Disabled connectors and why
  - Mutation approval requirements per connector
  - Degraded workflows when connectors are unavailable
  - Overall health score (percentage of required connectors available)
- Add `ai-pm mcp doctor --all` to check all profiles.
- Do not call any external APIs — validate locally only.

**Context files to read:**

1. packages/cli/src/commands/mcp.ts
2. packages/mcp/src/registry/configValidator.ts
3. packages/mcp/src/registry/configLoader.ts
4. mcp/registry.yaml
5. mcp/profiles/default.yaml
6. mcp/profiles/offline-local.yaml

**Verification:**

```bash
corepack pnpm@9.4.0 --filter @ai-pm/mcp test
corepack pnpm@9.4.0 --filter @ai-pm/cli test
node packages/cli/bin/ai-pm.js mcp validate --json
node packages/cli/bin/ai-pm.js mcp doctor --json
node packages/cli/bin/ai-pm.js mcp doctor --profile default --json
```

---

## Agent 4 — Template Table Schemas

**Objective:** Add CSV/XLSX-compatible data contracts for WBS, traceability, risk, issue log, budget/burn, milestone plan, UAT sign-off, and release readiness.

**Scope:**

- Create: `schemas/artifacts/wbs.schema.json`
- Create: `schemas/artifacts/traceability-matrix.schema.json`
- Create: `schemas/artifacts/risk-register.schema.json`
- Create: `schemas/artifacts/issue-log.schema.json`
- Create: `schemas/artifacts/budget-burn.schema.json`
- Create: `schemas/artifacts/milestone-plan.schema.json`
- Create: `schemas/artifacts/uat-signoff.schema.json`
- Create: `schemas/artifacts/release-readiness.schema.json`
- Create: `schemas/fixtures/artifacts/valid-wbs.json`
- Create: `schemas/fixtures/artifacts/valid-traceability.json`
- Create: `schemas/fixtures/artifacts/valid-risk-register.json`
- Modify: `packages/core/src/artifacts/` (add table schema validation)
- Create: `packages/core/src/artifacts/tableSchema.test.ts`

**Required behavior:**

- Each schema defines: columns, types, required columns, optional columns, example values.
- `validateArtifactTable(schemaId, data)` validates table data against column schemas.
- CSV-compatible: column names are lowercase_snake_case, no special characters.
- Do not generate real `.xlsx` yet; output CSV-compatible JSON/table metadata.
- Do not change CLI, desktop, or mobile.

**Context files to read:**

1. packages/core/src/artifacts/ (existing artifact factory)
2. templates/templates.yaml (template metadata)
3. schemas/approval/approval-item.schema.json (pattern reference)
4. templates/risks/risk-register.md (risk template format)
5. templates/requirements/acceptance-criteria.md (traceability format)

**Verification:**

```bash
corepack pnpm@9.4.0 --filter @ai-pm/core test -- src/artifacts/
ls schemas/artifacts/
```

---

## Agent 5 — Init Setup Wizard Hardening

**Objective:** Make `ai-pm init` create a usable local-first PM project with profile, MCP profile, memory/audit/approvals, agent docs, and sample artifacts.

**Scope:**

- Modify: `packages/cli/src/commands/init.ts` (expand seed content)
- Modify: `packages/cli/src/commands/init.test.ts` (update/add tests)

**Required behavior:**

- Seed `.ai-pm/profile.yaml` with project profile schema fields (methodology, project_type as null, source_systems placeholder).
- Seed `.claude/.mcp.json` with codebase-memory-mcp (already done) — verify it works.
- Seed `reports/`, `artifacts/`, `requirements/`, `risks/`, `meetings/` directories.
- Create `.ai-pm/audit/workflow-runs.jsonl` as empty file.
- Create `.ai-pm/memory/state.json` with correct version and empty tasks/artifacts.
- Create `.ai-pm/approvals.json` as empty array.
- Add `--methodology scrum|kanban|waterfall|hybrid` flag to init command.
- Print post-init readiness: `ai-pm project scan --json` should show > 80% readiness after init.

**Context files to read:**

1. packages/cli/src/commands/init.ts (current implementation)
2. packages/cli/src/commands/init.test.ts
3. packages/cli/src/commands/project.ts (scan command for reference)
4. schemas/project/profile.schema.json (if Agent 1 created it)

**Verification:**

```bash
corepack pnpm@9.4.0 --filter @ai-pm/cli test
corepack pnpm@9.4.0 --filter @ai-pm/cli build
node packages/cli/bin/ai-pm.js init "TestInit" --methodology scrum --help
```

---

## Agent 6 — Completion Gate Finalization

**Objective:** Make the completion gate cover all Wave 10 surfaces and prevent stale dist/import regressions.

**Scope:**

- Modify: `packages/cli/src/commands/completion-gate.test.ts`
- Modify: `docs/superpowers/plans/2026-06-19-next-runtime-functions.md` (update gate section)

**Required behavior:**

- Add smoke checks for: `project profile validate --json`, `mcp doctor --json`, `mcp validate --json`, `agent route --workflow daily-briefing --json`, `agent status --json`.
- Verify that `corepack pnpm@9.4.0 -r run test` covers all new test files.
- Document build-before-test requirement because CLI subprocess tests import `dist`.
- Update the completion gate section in the runtime plan.

**Context files to read:**

1. packages/cli/src/commands/completion-gate.test.ts
2. docs/superpowers/plans/2026-06-19-next-runtime-functions.md

**Verification:**

```bash
corepack pnpm@9.4.0 --filter @ai-pm/cli test
corepack pnpm@9.4.0 -r run test
corepack pnpm@9.4.0 -r run build
```

---

# Wave 11 — Daily And Weekly Full Orchestration

**Theme:** Make the orchestrator dispatch real workflows and produce artifacts.

---

## Agent 1 — Orchestrator Workflow Dispatch

**Objective:** Replace the CLI narrow adapter with core orchestrator workflow dispatch that finalizes execution records.

**Scope:**

- Modify: `packages/core/src/orchestrator/` (add dispatch logic)
- Create: `packages/core/src/orchestrator/dispatch.test.ts`
- Modify: `packages/cli/src/commands/orchestrator.ts` (wire to real dispatch)

**Required behavior:**

- `ai-pm orchestrator run daily-briefing` → dispatches to daily briefing workflow via core
- `ai-pm orchestrator run weekly-report` → dispatches to weekly report workflow via core
- `ai-pm orchestrator run risk-control` → dispatches to risk control workflow via core
- `ai-pm orchestrator run traceability` → dispatches to scope traceability workflow
- `ai-pm orchestrator run code-quality` → dispatches to code quality workflow
- Each run persists an execution record to memory/audit.
- Each run produces an artifact reference via artifact factory.
- No placeholder dispatch — real workflow invocation.

**Context files to read:**

1. packages/core/src/orchestrator/ (current state machine)
2. packages/core/src/workflows/dailyBriefing.ts
3. packages/core/src/workflows/weeklyReport.ts
4. packages/core/src/workflows/riskControl.ts
5. packages/core/src/workflows/traceability.ts
6. packages/core/src/workflows/codeQuality.ts
7. packages/cli/src/commands/orchestrator.ts

**Verification:**

```bash
corepack pnpm@9.4.0 --filter @ai-pm/core test -- src/orchestrator/
corepack pnpm@9.4.0 --filter @ai-pm/cli test
```

---

## Agent 2 — Daily Briefing Context Upgrade

**Objective:** Upgrade daily briefing to use project profile, MCP context snapshot, memory, approvals, risks, and local schedule placeholders.

**Scope:**

- Modify: `packages/core/src/workflows/dailyBriefing.ts`
- Modify: `packages/core/src/workflows/dailyBriefing.test.ts`
- Modify: `packages/cli/src/commands/daily.ts` (if CLI output changes)

**Required behavior:**

- Load project profile for methodology and project type.
- Load MCP context snapshot for available connectors.
- Load approval queue pending items.
- Load memory tasks and artifacts.
- Load risk register items.
- Combine into structured daily briefing output.
- Track source coverage (which sources were available vs unavailable).
- Record degraded sources explicitly.
- Persist audit record via LocalProjectStore.
- No placeholder live-data assumptions unless connector genuinely unavailable.

**Context files to read:**

1. packages/core/src/workflows/dailyBriefing.ts (current implementation)
2. packages/core/src/runtime/localProjectStore.ts
3. packages/core/src/runtime/approvalQueue.ts
4. packages/core/src/runtime/memory.ts
5. packages/core/src/orchestrator/mcpContextSnapshot.ts
6. templates/reports/daily-briefing.md

**Verification:**

```bash
corepack pnpm@9.4.0 --filter @ai-pm/core test -- src/workflows/dailyBriefing.test.ts
corepack pnpm@9.4.0 --filter @ai-pm/cli test
```

---

## Agent 3 — Weekly Report Artifact Adoption

**Objective:** Make weekly report generate Markdown, HTML, and JSON metadata through artifact factory and persist artifact refs.

**Scope:**

- Modify: `packages/core/src/workflows/weeklyReport.ts`
- Modify: `packages/core/src/workflows/weeklyReport.test.ts`
- Modify: `packages/core/src/artifacts/` (weekly report template registration)

**Required behavior:**

- Use artifact factory to render weekly report as Markdown.
- Generate HTML version of the same report.
- Generate JSON metadata (template_id, project_id, generated_at, source_coverage, approval_required).
- Persist artifact references in memory store.
- Queue an approval item for publication/review.
- No external publication — local draft only.

**Context files to read:**

1. packages/core/src/workflows/weeklyReport.ts
2. packages/core/src/artifacts/ (factory, renderers)
3. templates/reports/weekly-status.md
4. packages/core/src/runtime/memory.ts
5. packages/core/src/runtime/approvalQueue.ts

**Verification:**

```bash
corepack pnpm@9.4.0 --filter @ai-pm/core test -- src/workflows/weeklyReport.test.ts
corepack pnpm@9.4.0 --filter @ai-pm/core test -- src/artifacts/
```

---

## Agent 4 — Reporting CLI Enhancements

**Objective:** Add scriptable reporting commands for daily and weekly drafts.

**Scope:**

- Modify: `packages/cli/src/commands/daily.ts`
- Modify: `packages/cli/src/commands/weekly.ts`
- Modify: `packages/cli/src/commands/daily.test.ts` (add output format tests)
- Modify: `packages/cli/src/commands/weekly.test.ts` (add output format tests)

**Required behavior:**

- `--json` outputs valid JSON.
- `--format markdown|html|json` controls output format.
- `--output <dir>` writes draft files to specified directory.
- Degraded source summary printed when sources unavailable.
- Bilingual EN/VI error messages preserved.

**Context files to read:**

1. packages/cli/src/commands/daily.ts
2. packages/cli/src/commands/weekly.ts
3. packages/cli/src/commands/approval.ts (pattern reference for output formatting)

**Verification:**

```bash
corepack pnpm@9.4.0 --filter @ai-pm/cli test
corepack pnpm@9.4.0 --filter @ai-pm/cli build
```

---

## Agent 5 — Desktop Reporting Surface

**Objective:** Wire desktop command center/report tabs to real daily/weekly execution records and artifacts.

**Scope:**

- Modify: `packages/desktop/src/components/tabs/DailyBriefTab.tsx`
- Modify: `packages/desktop/src/components/tabs/ReportsTab.tsx` (if exists)
- Modify: `packages/desktop/src/state/` (add reporting state if needed)

**Required behavior:**

- Show generated artifacts from daily/weekly runs.
- Show approval status for pending publication items.
- Show source coverage (available vs degraded sources).
- Handle no-data state gracefully (empty artifacts, no crash).
- All data via IPC — no direct Node imports in renderer.

**Context files to read:**

1. packages/desktop/src/components/tabs/DailyBriefTab.tsx
2. packages/desktop/src/components/tabs/ReportsTab.tsx
3. packages/desktop/src/state/approval-store.ts (IPC pattern reference)
4. packages/desktop/preload.ts

**Verification:**

```bash
corepack pnpm@9.4.0 --filter @ai-pm/desktop build
```

---

## Agent 6 — Reporting Integration Tests

**Objective:** Add integration coverage for daily/weekly orchestrated runs from CLI to memory/audit/artifacts.

**Scope:**

- Create: `packages/core/src/workflows/dailyBriefing.integration.test.ts`
- Create: `packages/core/src/workflows/weeklyReport.integration.test.ts`
- Modify: `packages/core/src/workflows/index.ts` (if exports needed)

**Required behavior:**

- Test full daily briefing run: create temp project → load context → generate briefing → verify audit record → verify artifact reference.
- Test full weekly report run: create temp project → generate report → verify memory artifact → verify approval item queued.
- All tests use temp directories, no external credentials, deterministic.
- Verify source coverage tracking works.

**Context files to read:**

1. packages/core/src/runtime/approvalQueue.integration.test.ts (test pattern reference)
2. packages/core/src/workflows/dailyBriefing.ts
3. packages/core/src/workflows/weeklyReport.ts
4. packages/core/src/runtime/localProjectStore.ts

**Verification:**

```bash
corepack pnpm@9.4.0 --filter @ai-pm/core test -- src/workflows/
```

---

# Wave 12 — Planning, Scope, Cost, And Acceptance Control

**Theme:** Implement project planning, scope verification, cost tracking, and acceptance workflows.

---

## Agent 1 — WBS And Project Plan Workflow

**Objective:** Implement WBS/project plan generation for Waterfall/Hybrid/Fixed Cost and Agile/T&M.

**Scope:**

- Create: `packages/core/src/workflows/wbs.ts`
- Create: `packages/core/src/workflows/wbs.test.ts`
- Create: `templates/project-plan/wbs-template.md`
- Modify: `packages/core/src/workflows/index.ts`
- Modify: `packages/cli/src/commands/` (add `wbs` command if needed)

**Required behavior:**

- Generate WBS rows with: id, name, description, owner, status, dependencies, estimated_effort, actual_effort.
- Support Waterfall/Hybrid/Fixed Cost (phase-based) and Agile/T&M (sprint-based).
- Include milestone plan with dependencies and critical path.
- Include owner matrix (role → task mapping).
- Include assumptions and change warnings.
- Output as structured JSON (for schema validation) and Markdown (for human reading).
- Persist artifacts via artifact factory.
- Do not change desktop/mobile UI.

**Context files to read:**

1. packages/core/src/artifacts/ (factory pattern)
2. templates/project-plan/ (if exists)
3. docs/superpowers/specs/2026-06-18-ai-pm-toolkit-design.md (WBS section)
4. playbooks/methodologies/waterfall.md
5. playbooks/project-types/fixed-cost.md

**Verification:**

```bash
corepack pnpm@9.4.0 --filter @ai-pm/core test -- src/workflows/wbs.test.ts
```

---

## Agent 2 — Milestone And Gantt Data Workflow

**Objective:** Generate Gantt-compatible milestone/dependency data.

**Scope:**

- Create: `packages/core/src/workflows/milestonePlan.ts`
- Create: `packages/core/src/workflows/milestonePlan.test.ts`
- Modify: `packages/core/src/workflows/index.ts`
- Create: `schemas/artifacts/milestone-gantt.schema.json`

**Required behavior:**

- Generate milestone data with: id, name, start_date, end_date, dependencies, status, owner, critical_path.
- Output CSV-compatible JSON for Gantt chart import.
- Include overdue/degraded flags for milestones past their date.
- Calculate critical path from dependency graph.
- Do not change CLI/desktop/mobile.

**Context files to read:**

1. packages/core/src/workflows/wbs.ts (dependency structure)
2. packages/core/src/artifacts/ (factory pattern)
3. schemas/artifacts/milestone-plan.schema.json (if Agent 4 created it)

**Verification:**

```bash
corepack pnpm@9.4.0 --filter @ai-pm/core test -- src/workflows/milestonePlan.test.ts
```

---

## Agent 3 — Budget And Burn Tracker

**Objective:** Add cost/budget/burn workflow for T&M and fixed cost margin visibility.

**Scope:**

- Create: `packages/core/src/workflows/budgetBurn.ts`
- Create: `packages/core/src/workflows/budgetBurn.test.ts`
- Modify: `packages/core/src/workflows/index.ts`
- Create: `schemas/artifacts/budget-tracker.schema.json`
- Create: `templates/finance/budget-tracker.md` (if needed)

**Required behavior:**

- Track planned vs actual cost by period.
- Calculate burn rate and forecast completion date.
- For fixed cost: track margin risk and cost baseline changes.
- Queue approval when cost baseline changes by > 10%.
- Output as structured JSON and Markdown.
- Do not change CLI/desktop/mobile.

**Context files to read:**

1. packages/core/src/finance/ (existing finance module)
2. packages/core/src/artifacts/ (factory pattern)
3. playbooks/project-types/fixed-cost.md
4. playbooks/project-types/tm.md

**Verification:**

```bash
corepack pnpm@9.4.0 --filter @ai-pm/core test -- src/workflows/budgetBurn.test.ts
```

---

## Agent 4 — Scope Verification Strict Mode

**Objective:** Upgrade traceability into strict scope verification with ambiguity/change-request outputs.

**Scope:**

- Modify: `packages/core/src/workflows/traceability.ts` (add strict mode)
- Modify: `packages/core/src/workflows/traceability.test.ts`
- Create: `schemas/artifacts/scope-verification.schema.json`
- Create: `schemas/fixtures/artifacts/valid-scope-verification.json`

**Required behavior:**

- Strict mode outputs: requirement gaps, AC gaps, test gaps, owner gaps, change request draft, UAT readiness.
- Each gap includes: requirement_id, gap_type, severity, description, recommended_action.
- Change request draft follows `templates/requirements/change-request.md` format.
- UAT readiness score based on AC coverage and test evidence.
- Do not change CLI/desktop/mobile.

**Context files to read:**

1. packages/core/src/workflows/traceability.ts
2. templates/requirements/change-request.md
3. templates/requirements/acceptance-criteria.md
4. schemas/artifacts/traceability-matrix.schema.json

**Verification:**

```bash
corepack pnpm@9.4.0 --filter @ai-pm/core test -- src/workflows/traceability.test.ts
```

---

## Agent 5 — UAT And Acceptance Docs

**Objective:** Add acceptance document and user guide templates plus artifact rendering.

**Scope:**

- Create: `templates/qa/uat-signoff.md`
- Create: `templates/qa/user-guide.md`
- Create: `templates/qa/handover-checklist.md`
- Create: `schemas/artifacts/uat-signoff.schema.json`
- Create: `schemas/artifacts/user-guide.schema.json`
- Modify: `packages/core/src/artifacts/` (register new templates)

**Required behavior:**

- UAT sign-off template with: scope, test results, defects summary, approval signatures, go/no-go decision.
- User guide template with: overview, setup, usage, troubleshooting.
- Handover checklist template with: deliverables, documentation, access, training, support.
- Artifact factory can render each as Markdown and JSON.
- Do not change CLI/desktop/mobile.

**Context files to read:**

1. packages/core/src/artifacts/ (template registry pattern)
2. templates/qa/test-plan.md (existing QA template pattern)
3. schemas/artifacts/uat-signoff.schema.json (if Agent 4 created it)

**Verification:**

```bash
corepack pnpm@9.4.0 --filter @ai-pm/core test -- src/artifacts/
```

---

## Agent 6 — Planning UI/API Integration

**Objective:** Expose planning/scope/cost outputs through server API and desktop/mobile read-only views.

**Scope:**

- Modify: `packages/server/src/routes/` (add planning routes)
- Create: `packages/server/src/routes/planning.ts`
- Modify: `packages/desktop/src/components/tabs/` (add planning tab or wire to existing)
- `docs/architecture/local-server-api-surface.md` (document new endpoints)

**Required behavior:**

- Server endpoints: `GET /api/planning/wbs`, `GET /api/planning/milestones`, `GET /api/planning/budget`, `GET /api/planning/scope-verification`.
- All read-only; mutations approval-gated.
- Desktop shows read-only views of WBS, milestones, budget, scope status.
- All data via IPC/server — no direct Node imports in renderer.

**Context files to read:**

1. packages/server/src/routes/approvals.ts (route pattern reference)
2. packages/desktop/src/state/approval-store.ts (IPC pattern reference)
3. packages/core/src/workflows/wbs.ts (data shape)
4. packages/core/src/workflows/budgetBurn.ts (data shape)

**Verification:**

```bash
corepack pnpm@9.4.0 --filter @ai-pm/server test
corepack pnpm@9.4.0 --filter @ai-pm/desktop build
```

---

# Wave 13 — Meeting Intelligence, DevOps, And Code Quality Supervision

**Theme:** Implement remaining core workflows and operational views.

---

## Agent 1 — Meeting Intelligence Workflow

**Objective:** Implement agenda, transcript/notes import, minutes, decisions, actions, risks, and follow-up drafts.

**Scope:**

- Create: `packages/core/src/workflows/meetingIntelligence.ts`
- Create: `packages/core/src/workflows/meetingIntelligence.test.ts`
- Modify: `packages/core/src/workflows/index.ts`
- Create: `templates/meetings/meeting-brief.md` (pre-meeting template)
- Register with artifact factory.

**Required behavior:**

- Pre-meeting: generate agenda from objectives, related issues, and open actions.
- Post-meeting: parse transcript/notes → extract decisions, action items, risks, open questions.
- Generate MoM draft using `templates/meetings/minutes-of-meeting.md`.
- Queue approval for MoM publication.
- Track source coverage (transcript available, calendar data, issues).
- No sending calendar/chat/email — publication approval only.

**Context files to read:**

1. workflows/meeting-intelligence/README.md
2. templates/meetings/agenda.md
3. templates/meetings/minutes-of-meeting.md
4. packages/core/src/artifacts/ (factory pattern)
5. packages/core/src/runtime/approvalQueue.ts

**Verification:**

```bash
corepack pnpm@9.4.0 --filter @ai-pm/core test -- src/workflows/meetingIntelligence.test.ts
```

---

## Agent 2 — DevOps Release Readiness Workflow

**Objective:** Add release readiness, CI/CD health, environment blockers, incident risk, rollback checklist.

**Scope:**

- Create: `packages/core/src/workflows/devopsRelease.ts`
- Create: `packages/core/src/workflows/devopsRelease.test.ts`
- Modify: `packages/core/src/workflows/index.ts`
- Create: `templates/devops/release-readiness.md`
- Create: `templates/devops/rollback-checklist.md`
- Create: `schemas/artifacts/release-readiness.schema.json`

**Required behavior:**

- Generate release readiness report: deployment status, CI/CD health, environment blockers, incident risk.
- Generate rollback checklist with: trigger conditions, rollback steps, verification, communication plan.
- Track source coverage (CI logs, deployment status, environment checks).
- Queue approval for release decision.
- Local/imported evidence first; external CI read through MCP later.

**Context files to read:**

1. packages/core/src/workflows/ (existing workflow pattern)
2. packages/core/src/artifacts/ (factory pattern)
3. templates/qa/test-plan.md (QA pattern reference)
4. mcp/registry.yaml (CI/CD connectors if any)

**Verification:**

```bash
corepack pnpm@9.4.0 --filter @ai-pm/core test -- src/workflows/devopsRelease.test.ts
```

---

## Agent 3 — Code Quality Guard PR/CI Inputs

**Objective:** Upgrade code-quality guard to consume local git diff, test evidence, CI summaries, requirement IDs, and architecture rules.

**Scope:**

- Modify: `packages/core/src/workflows/codeQuality.ts`
- Modify: `packages/core/src/workflows/codeQuality.test.ts`
- Create: `schemas/artifacts/code-review.schema.json`

**Required behavior:**

- Accept local git diff as input (file changes, insertions, deletions).
- Map changed files to requirements using traceability matrix.
- Check test evidence: coverage thresholds, test pass/fail, missing tests for changed files.
- Check architecture rules: dependency violations, circular imports.
- Generate merge readiness determination: ready, not_ready, needs_human_decision.
- Output structured findings: critical, high, medium severity with file/line references.
- Do not call external CI — use local evidence.

**Context files to read:**

1. packages/core/src/workflows/codeQuality.ts
2. packages/core/src/workflows/traceability.ts (requirement mapping)
3. schemas/artifacts/code-review.schema.json (if exists)
4. playbooks/quality/code-quality-guard.md

**Verification:**

```bash
corepack pnpm@9.4.0 --filter @ai-pm/core test -- src/workflows/codeQuality.test.ts
```

---

## Agent 4 — Automation Test Integration Contract

**Objective:** Define and implement local contract for Playwright/automation test summaries.

**Scope:**

- Create: `schemas/artifacts/test-evidence.schema.json`
- Create: `schemas/fixtures/artifacts/valid-test-evidence.json`
- Create: `packages/core/src/workflows/testEvidence.ts`
- Create: `packages/core/src/workflows/testEvidence.test.ts`

**Required behavior:**

- Define schema for JUnit/JSON test summaries: test_name, status, duration, error_message, file, line.
- Parse JSON and JUnit-like XML summaries into normalized format.
- Calculate pass rate, failure rate, duration stats.
- Output test evidence report with: total, passed, failed, skipped, duration, failure_details.
- No browser execution required — parse existing results only.

**Context files to read:**

1. packages/core/src/artifacts/ (factory pattern)
2. schemas/artifacts/test-evidence.schema.json (if exists)
3. playbooks/quality/testing-strategy.md

**Verification:**

```bash
corepack pnpm@9.4.0 --filter @ai-pm/core test -- src/workflows/testEvidence.test.ts
```

---

## Agent 5 — Desktop QA/DevOps Views

**Objective:** Add operational QA/code-quality/release-readiness UI views.

**Scope:**

- Modify: `packages/desktop/src/components/tabs/` (add QA tab or extend existing)
- Create: `packages/desktop/src/components/tabs/QATab.tsx` (if new)

**Required behavior:**

- Show code quality findings from last review run (severity, file, line, category).
- Show test evidence summary (pass/fail counts, duration).
- Show release readiness status (ready/not_ready with blockers list).
- Dense list layout with evidence links.
- Approval state for each finding.
- No duplicated business logic — data via IPC.

**Context files to read:**

1. packages/desktop/src/components/tabs/ (existing tab pattern)
2. packages/desktop/src/state/ (IPC store pattern)
3. packages/desktop/preload.ts (IPC API surface)

**Verification:**

```bash
corepack pnpm@9.4.0 --filter @ai-pm/desktop build
```

---

## Agent 6 — Meeting/DevOps Integration Tests

**Objective:** Add deterministic fixtures and tests for meeting, DevOps, code-quality, automation evidence.

**Scope:**

- Create: `packages/core/src/workflows/meetingIntelligence.integration.test.ts`
- Create: `packages/core/src/workflows/devopsRelease.integration.test.ts`
- Create: `packages/core/src/workflows/testEvidence.integration.test.ts`
- Create: `schemas/fixtures/workflows/meeting-intelligence.input.valid.json` (if not exists)
- Create: `schemas/fixtures/artifacts/valid-release-readiness.json`
- Create: `schemas/fixtures/artifacts/valid-test-evidence.json`

**Required behavior:**

- Integration test for meeting: create temp project → load transcript → generate MoM → verify artifact → verify approval queued.
- Integration test for DevOps: create temp project → generate release readiness → verify artifact → verify source coverage.
- Integration test for test evidence: parse test summary → verify output structure.
- All tests use temp directories, deterministic, no external calls.

**Context files to read:**

1. packages/core/src/workflows/ (integration test pattern)
2. packages/core/src/workflows/meetingIntelligence.ts
3. packages/core/src/workflows/devopsRelease.ts
4. packages/core/src/workflows/testEvidence.ts

**Verification:**

```bash
corepack pnpm@9.4.0 --filter @ai-pm/core test -- src/workflows/
```

---

# Wave 14 — Chat Adapter, Identity, And Approval Actions

**Theme:** Make chat/mobile command gateway functional with identity and approval actions.

---

## Agent 1 — Chat Adapter Contract Package

**Objective:** Create a thin adapter contract for Hermes/OpenClaw/Telegram-style clients.

**Scope:**

- Create: `packages/server/src/chat/adapterContract.ts`
- Create: `packages/server/src/chat/adapterContract.test.ts`
- Create: `docs/architecture/chat-adapter-contract.md`

**Required behavior:**

- Define adapter interface: parseIntent, callLocalServer, formatResponse.
- Define intent types: query, action_proposal, approval_request, status_check.
- Define response types: text, card, approval_card, error.
- Adapter must not directly mutate PM data — all mutations go through approval queue.
- Document contract for future adapter implementations.

**Context files to read:**

1. packages/server/src/routes/ (existing server pattern)
2. docs/architecture/approval-queue-runtime-contract.md (approval flow)
3. docs/product/approval-queue-ux.md (chat approval section)

**Verification:**

```bash
corepack pnpm@9.4.0 --filter @ai-pm/server test -- src/chat/
```

---

## Agent 2 — Hermes/OpenClaw Local Adapter Prototype

**Objective:** Add a local adapter prototype that can run against laptop-hosted server.

**Scope:**

- Create: `packages/server/src/chat/hermesAdapter.ts`
- Create: `packages/server/src/chat/hermesAdapter.test.ts`

**Required behavior:**

- Parse natural language intents into structured commands.
- Map intents to local server API calls.
- Format responses as text cards.
- Read-only commands and action proposals only.
- Token configured via env var (`HERMES_TOKEN`).
- No default external send — all mutations approval-gated.
- Handle graceful fallback when server is unreachable.

**Context files to read:**

1. packages/server/src/chat/adapterContract.ts (interface to implement)
2. packages/server/src/routes/ (API surface)
3. docs/product/mobile-approval-api-client.md (fallback pattern reference)

**Verification:**

```bash
corepack pnpm@9.4.0 --filter @ai-pm/server test -- src/chat/
```

---

## Agent 3 — Chat Identity And Authorization

**Objective:** Add identity model for chat/mobile actions.

**Scope:**

- Create: `packages/server/src/middleware/auth.ts`
- Create: `packages/server/src/middleware/auth.test.ts`
- Modify: `packages/server/src/index.ts` (apply auth middleware)
- Create: `docs/architecture/auth-model.md`

**Required behavior:**

- Local token auth via `X-PM-Token` header or `PM_TOKEN` env var.
- Allowed user IDs configurable in server startup.
- Audit actor recorded for every mutation.
- Unauthorized requests rejected with 401 + clear message.
- Desktop/local trust: no auth required for localhost connections.
- Chat/mobile: token required for all write operations.

**Context files to read:**

1. packages/server/src/index.ts
2. packages/server/src/routes/approvals.ts (mutation endpoints)
3. docs/operating-model/approval-policy.md
4. docs/architecture/auth-model.md (if exists)

**Verification:**

```bash
corepack pnpm@9.4.0 --filter @ai-pm/server test -- src/middleware/
```

---

## Agent 4 — Approval Action Callback Flow

**Objective:** Allow approved chat/mobile actions to map to approval queue decisions safely.

**Scope:**

- Create: `packages/server/src/routes/approvalActions.ts`
- Create: `packages/server/src/routes/approvalActions.test.ts`
- Modify: `packages/server/src/index.ts` (register routes)

**Required behavior:**

- `POST /api/approval-actions/propose` — agent proposes an action, returns approval_id.
- `POST /api/approval-actions/:id/approve` — PM approves, triggers execution.
- `POST /api/approval-actions/:id/reject` — PM rejects with reason.
- `POST /api/approval-actions/:id/revision` — PM requests revision with notes.
- All actions go through approval queue — no direct external publish.
- Audit record created for every action.

**Context files to read:**

1. packages/server/src/routes/approvals.ts (existing approval API)
2. packages/core/src/runtime/approvalQueue.ts (queue operations)
3. docs/architecture/approval-queue-runtime-contract.md (action flow)

**Verification:**

```bash
corepack pnpm@9.4.0 --filter @ai-pm/server test -- src/routes/approvalActions.test.ts
```

---

## Agent 5 — Mobile Approval Action UX

**Objective:** Add mobile screens for action proposal details and approval decisions.

**Scope:**

- Modify: `packages/mobile/src/screens/ApprovalDetailScreen.tsx` (expand with action proposals)
- Create: `packages/mobile/src/screens/ActionProposalScreen.tsx`
- Modify: `packages/mobile/src/state/approval-store.ts` (add action proposal state)
- Modify: `packages/mobile/src/App.tsx` (register new screen)

**Required behavior:**

- Show action proposal details: what will happen, target system, confidence, source references.
- Approve/reject/revision buttons wired to store actions.
- Offline queue for actions taken without server connection.
- Sync retry with exponential backoff.
- Clear audit trail visible in detail view.

**Context files to read:**

1. packages/mobile/src/screens/ApprovalDetailScreen.tsx (existing pattern)
2. packages/mobile/src/state/approval-store.ts (store pattern)
3. docs/product/approval-queue-mobile-components.md (component spec)

**Verification:**

```bash
corepack pnpm@9.4.0 --filter @ai-pm/mobile build
```

---

## Agent 6 — Security Review And Threat Model

**Objective:** Document and test auth/approval boundaries for local server, chat, mobile, and desktop.

**Scope:**

- Create: `docs/security/threat-model.md`
- Create: `docs/security/auth-boundaries.md`
- Modify: `packages/server/src/middleware/auth.test.ts` (add edge case tests)

**Required behavior:**

- Document threat model: local trust, chat token auth, mobile device token, desktop IPC trust.
- Document auth boundaries: who can approve what, rate limits, token expiry.
- Test edge cases: expired tokens, missing tokens, wrong user IDs, concurrent approvals.
- Document data exposure rules: no secrets in approval items, no raw API responses in audit.
- Document offline security: encrypted local queue, sync TTL, stale action rejection.

**Context files to read:**

1. docs/operating-model/approval-policy.md
2. packages/server/src/middleware/auth.ts (if Agent 3 created it)
3. packages/mobile/src/state/approval-store.ts (offline queue pattern)
4. docs/product/approval-queue-ux.md (security section)

**Verification:**

```bash
ls docs/security/threat-model.md docs/security/auth-boundaries.md
```

---

# Wave 15 — External Connector Sync Behind Approval

**Theme:** Connect to real external systems through approval-gated sync.

---

## Agent 1 — Google Workspace Draft Sync

**Objective:** Add approved draft sync contracts for Gmail/Drive/Docs/Sheets without auto-send/publish.

**Scope:**

- Create: `packages/core/src/connectors/googleWorkspace.ts`
- Create: `packages/core/src/connectors/googleWorkspace.test.ts`
- Create: `packages/mcp/contracts/google-workspace-sync.md`

**Required behavior:**

- Define sync contracts for: Gmail draft, Drive upload, Docs create, Sheets update.
- All operations produce proposed actions — no auto-execution.
- Sync only runs when an approval item is approved.
- Support dry-run mode that shows what would happen without executing.
- Track sync status: pending, synced, failed.
- Do not call real Google APIs in tests — use fixture/mock mode.

**Context files to read:**

1. mcp/registry.yaml (google_gmail, google_drive, google_calendar)
2. mcp/contracts/communication.md
3. mcp/contracts/documentation.md
4. packages/server/src/routes/approvalActions.ts (approval flow)

**Verification:**

```bash
corepack pnpm@9.4.0 --filter @ai-pm/core test -- src/connectors/googleWorkspace.test.ts
```

---

## Agent 2 — Jira/Linear/GitHub Read Context

**Objective:** Normalize read-only issue/PR/milestone/check summaries for orchestrator context packs.

**Scope:**

- Create: `packages/core/src/connectors/issueTracker.ts`
- Create: `packages/core/src/connectors/issueTracker.test.ts`
- Create: `schemas/connectors/issue-summary.schema.json`

**Required behavior:**

- Define normalized schema for issues: id, title, status, priority, assignee, labels, created_at, updated_at.
- Define normalized schema for PRs: id, title, status, author, reviewers, checks, mergeable.
- Support imported/local fixture mode for testing.
- No live API calls in tests — use fixture data.
- Context pack format: array of normalized items + metadata (source, count, last_synced).

**Context files to read:**

1. mcp/contracts/work-tracker.md
2. mcp/registry.yaml (jira, linear, github)
3. packages/core/src/orchestrator/mcpContextSnapshot.ts

**Verification:**

```bash
corepack pnpm@9.4.0 --filter @ai-pm/core test -- src/connectors/issueTracker.test.ts
```

---

## Agent 3 — Notion/Confluence/Figma Context

**Objective:** Add project docs/design context contracts.

**Scope:**

- Create: `packages/core/src/connectors/docContext.ts`
- Create: `packages/core/src/connectors/docContext.test.ts`
- Create: `schemas/connectors/doc-summary.schema.json`

**Required behavior:**

- Define normalized schema for docs: id, title, url, content_summary, last_updated, author.
- Define normalized schema for designs: id, title, url, thumbnail, last_updated, author.
- Support imported/local fixture mode.
- Read-only context — no mutations.
- Degraded behavior when connector unavailable.

**Context files to read:**

1. mcp/contracts/documentation.md
2. mcp/registry.yaml (notion, confluence, google_drive)

**Verification:**

```bash
corepack pnpm@9.4.0 --filter @ai-pm/core test -- src/connectors/docContext.test.ts
```

---

## Agent 4 — Approved External Mutation Queue

**Objective:** Implement mutation execution skeleton that only runs when an approval item is approved.

**Scope:**

- Create: `packages/core/src/connectors/mutationExecutor.ts`
- Create: `packages/core/src/connectors/mutationExecutor.test.ts`
- Create: `schemas/connectors/mutation-result.schema.json`

**Required behavior:**

- Define mutation executor interface: execute(mutation, approvalItem) → result.
- Dry-run default — show what would happen without executing.
- No vendor calls without explicit connector adapter and approved approval item.
- Track execution status: pending, executing, completed, failed.
- Record execution result in audit log.
- Support retry with exponential backoff for transient failures.

**Context files to read:**

1. packages/core/src/runtime/approvalQueue.ts (approval state machine)
2. packages/server/src/routes/approvalActions.ts (action flow)
3. docs/architecture/approval-queue-runtime-contract.md (execution section)

**Verification:**

```bash
corepack pnpm@9.4.0 --filter @ai-pm/core test -- src/connectors/mutationExecutor.test.ts
```

---

## Agent 5 — Connector Setup Wizard

**Objective:** Add interactive/noninteractive setup checks for popular MCP connectors.

**Scope:**

- Modify: `packages/cli/src/commands/mcp.ts` (add `setup` subcommand)
- Modify: `packages/cli/src/commands/mcp.test.ts`

**Required behavior:**

- `ai-pm mcp setup --connector github` — interactive setup flow.
- `ai-pm mcp setup --connector github --token <token>` — noninteractive.
- Check required env vars and prompt for missing values.
- Generate profile entry for the connector.
- Validate setup with `ai-pm mcp doctor` after completion.
- Support: github, jira, linear, google_gmail, google_calendar, google_drive, slack.

**Context files to read:**

1. packages/cli/src/commands/mcp.ts (existing MCP commands)
2. mcp/registry.yaml (connector definitions)
3. mcp/profiles/default.yaml (profile structure)

**Verification:**

```bash
corepack pnpm@9.4.0 --filter @ai-pm/cli test
node packages/cli/bin/ai-pm.js mcp setup --help
```

---

## Agent 6 — Connector Integration Fixtures

**Objective:** Add fixture-based tests for Google/Jira/Linear/GitHub/Notion/Figma connector context.

**Scope:**

- Create: `schemas/fixtures/connectors/github-issues.json`
- Create: `schemas/fixtures/connectors/jira-issues.json`
- Create: `schemas/fixtures/connectors/linear-issues.json`
- Create: `schemas/fixtures/connectors/notion-pages.json`
- Create: `packages/core/src/connectors/connectorFixtures.test.ts`

**Required behavior:**

- Fixture data covers: happy path, empty results, partial failures, degraded mode.
- Each fixture validates against its connector schema.
- Tests verify that context packs can be built from fixtures.
- No live API calls — pure fixture-based testing.

**Context files to read:**

1. schemas/connectors/ (all connector schemas)
2. packages/core/src/connectors/ (all connector modules)
3. packages/core/src/orchestrator/mcpContextSnapshot.ts

**Verification:**

```bash
corepack pnpm@9.4.0 --filter @ai-pm/core test -- src/connectors/
```

---

# Wave 16 — Release Hardening, Packaging, And PM Acceptance

**Theme:** Make the toolkit release-ready for real PM use.

---

## Agent 1 — End-To-End PM Scenario

**Objective:** Create a sample project and E2E script: init, scan, daily, weekly, traceability, code-quality, approval, chat query.

**Scope:**

- Create: `examples/sample-project/` (init'd project with sample data)
- Create: `examples/e2e-pm-scenario.md` (step-by-step walkthrough)
- Create: `examples/run-e2e.sh` (automated E2E script)

**Required behavior:**

- Sample project has: profile, memory state, approval queue, audit trail, artifacts.
- E2E script runs: `ai-pm init` → `ai-pm project scan` → `ai-pm daily brief` → `ai-pm weekly report` → `ai-pm traceability build` → `ai-pm code-quality review` → `ai-pm approval list` → `ai-pm schema validate`.
- Script verifies each step exits 0 and produces expected output.
- Script is documented and reproducible.

**Context files to read:**

1. packages/cli/bin/ai-pm.js (all available commands)
2. packages/cli/src/commands/ (all command files)
3. docs/superpowers/plans/2026-06-19-next-runtime-functions.md (completion gate)

**Verification:**

```bash
corepack pnpm@9.4.0 -r run build
bash examples/run-e2e.sh
```

---

## Agent 2 — Desktop Smoke And Runtime Start

**Objective:** Add desktop smoke for production Electron startup with missing Ollama and local server status.

**Scope:**

- Create: `packages/desktop/scripts/smoke-test.sh` (or .ps1)
- Create: `packages/desktop/src/smoke.test.ts` (if Vitest can test Electron)
- Modify: `packages/desktop/main.ts` (add startup logging)

**Required behavior:**

- Smoke test: app starts, window appears, local server starts on :3847, dashboard loads.
- Verify: no crash when Ollama is missing (warning log only).
- Verify: server status shows in dashboard.
- Verify: approval queue tab is accessible.
- Document smoke test commands in README.

**Context files to read:**

1. packages/desktop/main.ts
2. packages/desktop/src/components/tabs/DashboardTab.tsx
3. packages/desktop/src/state/approval-store.ts

**Verification:**

```bash
corepack pnpm@9.4.0 --filter @ai-pm/desktop build
# Desktop smoke requires running Electron — document only
```

---

## Agent 3 — Mobile Local Export Smoke

**Objective:** Keep Expo/React Native build/export smoke documented and runnable.

**Scope:**

- Modify: `packages/mobile/package.json` (verify scripts)
- Create: `packages/mobile/SMOKE-TEST.md` (documentation)

**Required behavior:**

- Document: `pnpm --filter @ai-pm/mobile build` (TypeScript compilation).
- Document: `pnpm --filter @ai-pm/mobile build:local` (Expo export).
- Document: manual smoke on simulator/device.
- Verify no TypeScript errors in mobile package.
- Document any known deprecation warnings and workarounds.

**Context files to read:**

1. packages/mobile/package.json
2. packages/mobile/App.tsx
3. packages/mobile/index.js

**Verification:**

```bash
corepack pnpm@9.4.0 --filter @ai-pm/mobile build
ls packages/mobile/SMOKE-TEST.md
```

---

## Agent 4 — Documentation Pack

**Objective:** Produce PM user guide, agent guide, setup guide, MCP guide, mobile/chat guide, troubleshooting.

**Scope:**

- Create: `docs/user/getting-started.md`
- Create: `docs/user/pm-user-guide.md`
- Create: `docs/user/agent-guide.md`
- Create: `docs/user/mcp-setup-guide.md`
- Create: `docs/user/mobile-chat-guide.md`
- Create: `docs/user/troubleshooting.md`
- Modify: `README.md` (update with links to user guides)

**Required behavior:**

- Getting started: installation, first init, first scan, first daily brief.
- PM user guide: daily workflow, approval queue, weekly reports, risk management.
- Agent guide: how agents read AGENTS.md, use CLI, respect approval gates.
- MCP setup guide: connector setup, doctor commands, profile management.
- Mobile/chat guide: server configuration, offline mode, approval actions.
- Troubleshooting: common errors, build failures, test failures, connectivity issues.
- All guides are concise but complete — no filler.

**Context files to read:**

1. README.md (current state)
2. AGENTS.md
3. packages/cli/bin/ai-pm.js (all commands)
4. docs/architecture/local-server-api-surface.md
5. docs/product/mobile-approval-api-client.md

**Verification:**

```bash
ls docs/user/getting-started.md docs/user/pm-user-guide.md docs/user/agent-guide.md docs/user/mcp-setup-guide.md docs/user/mobile-chat-guide.md docs/user/troubleshooting.md
```

---

## Agent 5 — Release Checklist And Acceptance Matrix

**Objective:** Define final acceptance criteria against the original business case.

**Scope:**

- Create: `docs/product/release-checklist.md`
- Create: `docs/product/acceptance-matrix.md`
- Modify: `docs/superpowers/specs/2026-06-18-ai-pm-toolkit-design.md` (add acceptance section if needed)

**Required behavior:**

- Release checklist: every item that must be true before v1.0 release.
- Acceptance matrix: map each business case requirement to test evidence.
- Cover: local-first, approval gates, audit trail, workflow coverage, CLI/desktop/mobile surfaces, MCP integration, chat gateway.
- Include known limitations and deferred features.

**Context files to read:**

1. docs/superpowers/specs/2026-06-18-ai-pm-toolkit-design.md (business case)
2. docs/superpowers/plans/2026-06-19-next-runtime-functions.md (completion gate)
3. packages/cli/src/commands/completion-gate.test.ts (current gate)

**Verification:**

```bash
ls docs/product/release-checklist.md docs/product/acceptance-matrix.md
```

---

## Agent 6 — Final Repository Green Gate

**Objective:** Run and document final green verification and residual risk list.

**Scope:**

- Modify: `docs/superpowers/plans/2026-06-19-next-runtime-functions.md` (update verification state)
- Create: `docs/superpowers/plans/final-green-gate.md`

**Required behavior:**

- Run and document full verification gate:

```text
corepack pnpm@9.4.0 -r run build
corepack pnpm@9.4.0 -r run test
node schemas/validate-fixtures.mjs
Desktop smoke (document)
Mobile build/export smoke (document)
Marker scan (no unresolved markers)
```

- Document residual risk list (known limitations, deferred features).
- Update runtime plan verification state to reflect final status.
- Create final-green-gate.md with pass/fail for every check.

**Context files to read:**

1. docs/superpowers/plans/2026-06-19-next-runtime-functions.md
2. packages/cli/src/commands/completion-gate.test.ts
3. docs/product/release-checklist.md

**Verification:**

```bash
corepack pnpm@9.4.0 -r run build
corepack pnpm@9.4.0 -r run test
node schemas/validate-fixtures.mjs
ls docs/superpowers/plans/final-green-gate.md
```
