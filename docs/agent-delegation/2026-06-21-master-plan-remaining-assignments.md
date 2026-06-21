# Remaining Master Plan Assignments — Wave 10 To Release

> **Date:** 2026-06-21  
> **Status:** Active remaining-work backlog after Wave 9 review.  
> **Canonical plan:** `docs/superpowers/plans/2026-06-19-pm-orchestrator-master-plan.md`  
> **Runtime plan:** `docs/superpowers/plans/2026-06-19-next-runtime-functions.md`

## Baseline Verified Before This Assignment Set

```text
corepack pnpm@9.4.0 -r run build             PASS
corepack pnpm@9.4.0 -r run test              PASS
corepack pnpm@9.4.0 --filter @ai-pm/cli test PASS (8 files, 128 tests)
packages/core                                PASS (19 files, 244 tests)
packages/server                              PASS (3 files, 121 tests)
packages/mobile                              PASS (1 file, 10 tests)
packages/mcp                                 PASS (1 file, 26 tests)
node schemas/validate-fixtures.mjs           PASS (30/30)
marker scan                                  PASS (no required marker matches)
```

Every agent must read:

- `AGENTS.md`
- `docs/superpowers/specs/2026-06-18-ai-pm-toolkit-design.md`
- `docs/superpowers/plans/2026-06-19-pm-orchestrator-master-plan.md`
- `docs/superpowers/plans/2026-06-19-next-runtime-functions.md`
- the relevant workflow/playbook named in the task
- `docs/operating-model/subagent-protocol.md` for final reporting

All external mutations remain approval-gated. No agent may send email/chat, update Jira/Linear/GitHub/Notion/Confluence/Drive, publish reports, or merge code.

## Review Findings From Wave 9

- Wave 9 added core execution records, MCP context snapshots, chat action proposals/history, desktop command center, mobile command center, and expanded command-center mobile tests.
- Build initially failed because `@ai-pm/core/orchestrator` was not exported. Fixed in `packages/core/package.json`.
- Completion gate initially missed the new command smoke checks. Fixed in `packages/cli/src/commands/completion-gate.test.ts`.
- Remaining weak points are intentional next work: CLI orchestrator still uses a narrow adapter, weekly/daily still use placeholder local items, real connector sync is not implemented, and chat adapters are not yet wired.

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

# Wave 10 — Profile, Capabilities, MCP Doctor, And Template Tables

## Agent 1 — Project Profile Schema Runtime

**Objective:** Implement a formal project profile schema consumed by CLI, orchestrator, server, desktop, and mobile.

**Scope:**

- `schemas/`
- `fixtures/`
- `packages/core/src/runtime/`
- `packages/cli/src/commands/project.ts`
- tests in core/CLI

**Required behavior:**

- Define schema for `project_id`, name, root, methodology, project type, commercial model, timezone, source systems, local artifact directories, approval policy, and connector profile.
- Add `ai-pm project profile validate --json`.
- Add graceful defaults for missing profile fields.
- Do not change desktop/mobile UI.

**Verification:** core test, CLI test, schema fixtures.

## Agent 2 — Agent Capability Registry Runtime

**Objective:** Replace static `agent status` with a registry of PM/BA/QA/Tech Lead/Code Quality/Reporting/Meeting/Risk agents and supported workflows.

**Scope:**

- `docs/operating-model/agent-operating-model.md`
- `docs/operating-model/subagent-protocol.md`
- `packages/core/src/orchestrator/`
- `packages/cli/src/commands/orchestrator.ts`
- CLI tests

**Required behavior:**

- Add local capability registry data.
- Add `ai-pm agent status --json` with role, workflows, inputs, outputs, approval boundaries.
- Add `ai-pm agent route --workflow <id> --json`.

**Verification:** core/CLI tests and `node packages/cli/bin/ai-pm.js agent status --json`.

## Agent 3 — MCP CLI Doctor And Validate

**Objective:** Make MCP setup inspectable from CLI without calling vendor APIs.

**Scope:**

- `packages/cli/src/commands/mcp.ts`
- `packages/mcp/src/registry/`
- `mcp/registry.yaml`
- `mcp/profiles/`
- tests

**Required behavior:**

- Add/complete `ai-pm mcp validate --json`.
- Add `ai-pm mcp doctor --profile <name> --json`.
- Report missing env vars, disabled connectors, mutation approval requirements, degraded workflows.

**Verification:** MCP tests, CLI tests, build.

## Agent 4 — Template Table Schemas

**Objective:** Add CSV/XLSX-compatible data contracts for WBS, traceability, risk, issue log, budget/burn, milestone plan, UAT sign-off, and release readiness.

**Scope:**

- `templates/templates.yaml`
- `templates/**`
- `schemas/artifacts/`
- `packages/core/src/artifacts/`
- artifact tests

**Required behavior:**

- Add machine-readable table schemas.
- Add artifact factory validation for required columns.
- Do not generate real `.xlsx` yet; output CSV-compatible JSON/table metadata.

**Verification:** core artifact tests and schema fixtures.

## Agent 5 — Init Setup Wizard Hardening

**Objective:** Make `ai-pm init` create a usable local-first PM project with profile, MCP profile, memory/audit/approvals, agent docs, and sample artifacts.

**Scope:**

- `packages/cli/src/commands/init.ts`
- init tests
- generated template docs only

**Required behavior:**

- Seed `.ai-pm/profile.yaml` with project profile schema fields.
- Seed `.claude/.mcp.json` only when explicitly local and safe.
- Seed `reports/`, `artifacts/`, `requirements/`, `risks/`, `meetings/`.
- No credentials.

**Verification:** CLI init tests.

## Agent 6 — Completion Gate Finalization

**Objective:** Make the completion gate cover all Wave 10 surfaces and prevent stale dist/import regressions.

**Scope:**

- `packages/cli/src/commands/completion-gate.test.ts`
- docs runtime plan gate section

**Required behavior:**

- Add smoke checks for `project profile validate`, `mcp doctor`, `mcp validate`, `agent route`.
- Document build-before-test requirement because CLI subprocess tests import `dist`.

**Verification:** CLI test, recursive build/test.

---

# Wave 11 — Daily And Weekly Full Orchestration

## Agent 1 — Orchestrator Workflow Dispatch

**Objective:** Replace the CLI narrow adapter with core orchestrator workflow dispatch that finalizes execution records.

**Scope:** `packages/core/src/orchestrator/`, `packages/cli/src/commands/orchestrator.ts`, tests.

**Required behavior:** run daily, weekly, risk, traceability, code-quality through core dispatcher; persist execution records; produce audit records.

## Agent 2 — Daily Briefing Context Upgrade

**Objective:** Upgrade daily briefing to use project profile, MCP context snapshot, memory, approvals, risks, and local schedule placeholders.

**Scope:** `packages/core/src/workflows/dailyBriefing.ts`, CLI/server consumers, tests.

**Required behavior:** no placeholder live-data assumptions unless connector unavailable; output source coverage and degraded sources.

## Agent 3 — Weekly Report Artifact Adoption

**Objective:** Make weekly report generate Markdown, HTML, and JSON metadata through artifact factory and persist artifact refs.

**Scope:** `packages/core/src/workflows/weeklyReport.ts`, `packages/core/src/artifacts/`, CLI tests.

**Required behavior:** local draft first; publication approval item only, no external publish.

## Agent 4 — Reporting CLI Enhancements

**Objective:** Add scriptable reporting commands for daily and weekly drafts.

**Scope:** `packages/cli/src/commands/daily.ts`, `weekly.ts`, tests.

**Required behavior:** `--json`, `--format markdown|html|json`, `--output <dir>`, degraded source summary.

## Agent 5 — Desktop Reporting Surface

**Objective:** Wire desktop command center/report tabs to real daily/weekly execution records and artifacts.

**Scope:** `packages/desktop/src/`, IPC only if needed.

**Required behavior:** show generated artifacts, approval status, source coverage, and no-crash offline state.

## Agent 6 — Reporting Integration Tests

**Objective:** Add integration coverage for daily/weekly orchestrated runs from CLI to memory/audit/artifacts.

**Scope:** CLI/core tests and fixtures.

**Required behavior:** no external credentials, deterministic temp project roots.

---

# Wave 12 — Planning, Scope, Cost, And Acceptance Control

## Agent 1 — WBS And Project Plan Workflow

**Objective:** Implement WBS/project plan generation for Waterfall/Hybrid/Fixed Cost and Agile/T&M.

**Scope:** `packages/core/src/workflows/`, `templates/project-plan/`, schemas, CLI.

**Required behavior:** WBS rows, milestones, dependencies, owner matrix, assumptions, change warnings.

## Agent 2 — Milestone And Gantt Data Workflow

**Objective:** Generate Gantt-compatible milestone/dependency data.

**Scope:** core workflow, CLI command, desktop Gantt tab wiring.

**Required behavior:** CSV/JSON output, critical dependencies, overdue/degraded flags.

## Agent 3 — Budget And Burn Tracker

**Objective:** Add cost/budget/burn workflow for T&M and fixed cost margin visibility.

**Scope:** `packages/core/src/finance/`, workflow, CLI, templates.

**Required behavior:** planned vs actual, burn rate, forecast, fixed-cost margin risk, approval when cost baseline changes.

## Agent 4 — Scope Verification Strict Mode

**Objective:** Upgrade traceability into strict scope verification with ambiguity/change-request outputs.

**Scope:** traceability workflow, scope-control schemas, templates.

**Required behavior:** requirement gaps, AC gaps, test gaps, owner gaps, change request draft, UAT readiness.

## Agent 5 — UAT And Acceptance Docs

**Objective:** Add acceptance document and user guide templates plus artifact rendering.

**Scope:** templates, schemas, artifact factory tests.

**Required behavior:** UAT sign-off, acceptance checklist, user guide template, handover checklist.

## Agent 6 — Planning UI/API Integration

**Objective:** Expose planning/scope/cost outputs through server API and desktop/mobile read-only views.

**Scope:** server routes, desktop tabs, mobile screens.

**Required behavior:** read-only views first; mutations approval-gated.

---

# Wave 13 — Meeting Intelligence, DevOps, And Code Quality Supervision

## Agent 1 — Meeting Intelligence Workflow

**Objective:** Implement agenda, transcript/notes import, minutes, decisions, actions, risks, and follow-up drafts.

**Scope:** `workflows/meeting-intelligence/`, core workflow, CLI, templates.

**Required behavior:** no sending calendar/chat/email; publication approval only.

## Agent 2 — DevOps Release Readiness Workflow

**Objective:** Add release readiness, CI/CD health, environment blockers, incident risk, rollback checklist.

**Scope:** `packages/core/src/workflows/`, templates/devops, schemas, CLI.

**Required behavior:** local/imported evidence first; external CI read through MCP later.

## Agent 3 — Code Quality Guard PR/CI Inputs

**Objective:** Upgrade code-quality guard to consume local git diff, test evidence, CI summaries, requirement IDs, and architecture rules.

**Scope:** code quality workflow/CLI/tests.

**Required behavior:** merge readiness, missing tests, requirement mismatch, risk findings, reviewer action list.

## Agent 4 — Automation Test Integration Contract

**Objective:** Define and implement local contract for Playwright/automation test summaries.

**Scope:** schemas, templates, code-quality/devops workflows.

**Required behavior:** parse JSON/JUnit-like summaries; no browser execution required.

## Agent 5 — Desktop QA/DevOps Views

**Objective:** Add operational QA/code-quality/release-readiness UI views.

**Scope:** desktop tabs only.

**Required behavior:** dense lists, evidence links, approval state, no duplicated business logic.

## Agent 6 — Meeting/DevOps Integration Tests

**Objective:** Add deterministic fixtures and tests for meeting, DevOps, code-quality, automation evidence.

**Scope:** core/CLI/server tests.

---

# Wave 14 — Chat Adapter, Identity, And Approval Actions

## Agent 1 — Chat Adapter Contract Package

**Objective:** Create a thin adapter contract for Hermes/OpenClaw/Telegram-style clients.

**Scope:** `packages/agents/` or `packages/server/src/chat/`, docs.

**Required behavior:** parse intent, call local server, format response, no direct PM data mutation.

## Agent 2 — Hermes/OpenClaw Local Adapter Prototype

**Objective:** Add a local adapter prototype that can run against laptop-hosted server.

**Scope:** adapter package/scripts/docs.

**Required behavior:** read-only commands and action proposals only; token configured via env; no default external send.

## Agent 3 — Chat Identity And Authorization

**Objective:** Add identity model for chat/mobile actions.

**Scope:** server auth middleware, config docs, tests.

**Required behavior:** local token, allowed user ids, audit actor, rejected unauthorized requests.

## Agent 4 — Approval Action Callback Flow

**Objective:** Allow approved chat/mobile actions to map to approval queue decisions safely.

**Scope:** server approval routes, chat gateway docs/tests.

**Required behavior:** approve/reject/revision through approval queue only; no external publish.

## Agent 5 — Mobile Approval Action UX

**Objective:** Add mobile screens for action proposal details and approval decisions.

**Scope:** mobile screens/state/tests.

**Required behavior:** offline queue, sync retry, clear audit trail.

## Agent 6 — Security Review And Threat Model

**Objective:** Document and test auth/approval boundaries for local server, chat, mobile, and desktop.

**Scope:** docs/security, server tests.

---

# Wave 15 — External Connector Sync Behind Approval

## Agent 1 — Google Workspace Draft Sync

**Objective:** Add approved draft sync contracts for Gmail/Drive/Docs/Sheets without auto-send/publish.

**Scope:** MCP profiles/contracts, server/core sync abstractions, docs.

**Required behavior:** proposed actions only unless approval id is approved.

## Agent 2 — Jira/Linear/GitHub Read Context

**Objective:** Normalize read-only issue/PR/milestone/check summaries for orchestrator context packs.

**Scope:** MCP contracts, context snapshot, workflow inputs.

**Required behavior:** support imported/local fixture mode; no live calls in tests.

## Agent 3 — Notion/Confluence/Figma Context

**Objective:** Add project docs/design context contracts.

**Scope:** MCP contracts/profiles/docs.

**Required behavior:** read-only context and degraded behavior.

## Agent 4 — Approved External Mutation Queue

**Objective:** Implement mutation execution skeleton that only runs when an approval item is approved.

**Scope:** core/server approval executor abstractions, tests.

**Required behavior:** dry-run default; no vendor calls without explicit connector adapter and approval.

## Agent 5 — Connector Setup Wizard

**Objective:** Add interactive/noninteractive setup checks for popular MCP connectors.

**Scope:** CLI mcp/init docs.

**Required behavior:** env var checklist, profile generation, doctor summary.

## Agent 6 — Connector Integration Fixtures

**Objective:** Add fixture-based tests for Google/Jira/Linear/GitHub/Notion/Figma connector context.

**Scope:** fixtures, schemas, core/mcp tests.

---

# Wave 16 — Release Hardening, Packaging, And PM Acceptance

## Agent 1 — End-To-End PM Scenario

**Objective:** Create a sample project and E2E script: init, scan, daily, weekly, traceability, code-quality, approval, chat query.

**Scope:** `examples/`, CLI tests/docs.

## Agent 2 — Desktop Smoke And Runtime Start

**Objective:** Add desktop smoke for production Electron startup with missing Ollama and local server status.

**Scope:** desktop scripts/tests/docs.

## Agent 3 — Mobile Local Export Smoke

**Objective:** Keep Expo/React Native build/export smoke documented and runnable.

**Scope:** mobile package scripts/docs.

## Agent 4 — Documentation Pack

**Objective:** Produce PM user guide, agent guide, setup guide, MCP guide, mobile/chat guide, troubleshooting.

**Scope:** `docs/user/`, `README.md`, `AGENTS.md` links.

## Agent 5 — Release Checklist And Acceptance Matrix

**Objective:** Define final acceptance criteria against the original business case.

**Scope:** docs/product, templates/uat, schemas.

## Agent 6 — Final Repository Green Gate

**Objective:** Run and document final green verification and residual risk list.

**Scope:** docs/superpowers/plans runtime status, completion gate tests.

**Required final evidence:**

```text
corepack pnpm@9.4.0 -r run build
corepack pnpm@9.4.0 -r run test
node schemas/validate-fixtures.mjs
desktop smoke
mobile build/export smoke
marker scan
```
