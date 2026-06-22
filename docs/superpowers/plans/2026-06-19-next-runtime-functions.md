# Runtime Functions Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` or `superpowers:executing-plans` before implementation. Track tasks with checkbox syntax and report using `docs/operating-model/subagent-protocol.md`.

**Goal:** Keep the runtime layer green while moving from local approval/memory/workflow primitives toward a project-scoped PM Orchestrator that can serve CLI, desktop, mobile, chat, and later Hermes/OpenClaw-style command gateways.

**Architecture:** Durable PM logic belongs in `packages/core`. CLI, Electron IPC, local server APIs, desktop UI, and mobile UI consume runtime contracts. UI packages must not reimplement approval, memory, schema, or workflow business rules.

---

## Current Verification State

Verified on 2026-06-22 from `C:\Works\AI-PM` after reviewing the completed self-test agent wave:

```text
corepack pnpm@9.4.0 -r run build             PASS
corepack pnpm@9.4.0 -r run test              PASS
packages/core test                           PASS (35 files, 429 tests)
packages/mcp test                            PASS (2 files, 36 tests)
packages/server test                         PASS (6 files, 157 tests)
packages/cli test                            PASS (12 files, 215 tests)
packages/desktop test                        PASS (2 files, 9 tests)
packages/mobile test                         PASS (1 file, 10 tests)
node schemas/validate-fixtures.mjs           PASS (32/32)
standard unresolved-marker scan              PASS (no matches)
```

Self-test project verification on 2026-06-22 from `examples/ai-pm-tm-test-project`:

```text
setup doctor                                 PASS (score 100, 0 blocking)
project scan                                 PASS (score 100, ready true)
memory summary                               PASS (5 tasks, 1 completed, 3 artifacts)
daily --json                                 PASS (project_id ai-pm-tm-test, Scrum, T&M)
mcp doctor --json                            PASS as parseable JSON; health degraded until live connectors are configured
approval count                               PASS (1 pending approval)
```

New finding:

- The generated weekly report approval item is still scoped to `project_id: local-project` instead of `ai-pm-tm-test`. This violates the project-scoped non-negotiable and is Wave 17 priority 1.

Verified on 2026-06-21 from `C:\Works\AI-PM` after completed agent wave review and toolkit self-use hardening:

```text
corepack pnpm@9.4.0 -r run build             PASS
corepack pnpm@9.4.0 -r run test              PASS
packages/core test                           PASS (35 files, 429 tests)
packages/mcp test                            PASS (2 files, 36 tests)
packages/server test                         PASS (5 files, 132 tests)
packages/cli test                            PASS (11 files, 185 tests)
packages/mobile test                         PASS (1 file, 10 tests)
node schemas/validate-fixtures.mjs           PASS (32/32)
setup doctor on this repo                    PASS (score 100)
project scan on this repo                    PASS (score 100, ready true)
daily --json on this repo                    PASS (local-first fallback)
mcp validate --json                          PASS
marker scan                                  PASS (no active unresolved markers)
```

Additional self-test project verification on 2026-06-21:

```text
Self-test project root                       examples/ai-pm-tm-test-project
Commercial model                             T&M / time_and_material
Role model                                   one PM role
Primary chat channel                         Discord via Hermes Agent Bot
Tracker                                      Notion local import artifacts
Target completion date                       2026-06-28
setup doctor                                 PASS (score 100)
project scan                                 PASS (score 100, ready true)
project profile validate                     PASS
memory summary                               PASS (4 tasks, 2 artifacts)
daily --json                                 PASS (project profile + memory loaded)
mcp doctor --json                            PASS as parseable JSON; health degraded until live connectors are configured
```

Notes:

- In the current sandbox, `pnpm` is not on `PATH`; use `corepack pnpm@9.4.0 ...` for verification if direct `pnpm` is unavailable.
- Desktop Vite no longer shows the earlier Electron `fs`/`path` browser externalization warning after the renderer/main/preload build split.
- `.claude/settings.local.json` exists as local agent tooling state. Treat it as local config unless the PM explicitly wants it committed.

## Completed Runtime Work

| Area | Status | Evidence |
|---|---|---|
| Approval Queue Runtime | Complete | core approval queue unit + integration tests pass |
| Approval CLI | Complete | CLI approval tests pass |
| Desktop Approval Runtime Wiring | Complete first slice | renderer uses Electron IPC; desktop build passes |
| Mobile Approval API Client | Complete first slice | local server client, mock fallback, offline queue; mobile build passes |
| Memory Runtime | Complete | core memory tests pass |
| Memory CLI | Complete | CLI memory tests pass |
| Init Runtime Bootstrap | Complete first slice | init tests pass; project scaffold creates agent docs and `.ai-pm/` seeds |
| Schema Validation Runtime | Complete | schema validation edge/integration tests pass |
| Schema CLI | Complete first slice | `schema list`, `validate`, `--json-string`, stdin path, and `inspect` tests pass |
| Local Server API | Complete first slice | approval + memory integration tests pass; OpenAPI doc exists |
| Weekly Report Workflow | Complete first slice | core weekly tests pass; CLI command registered |
| Risk Control Workflow | Complete first slice | core risk tests pass; CLI command registered; build fixed |
| Desktop Runtime App | Complete smoke | production Electron app can start without Ollama installed |
| Test Harness | Complete | no-test packages use `vitest run --passWithNoTests`; recursive tests pass |
| Core Orchestrator State Machine | Complete first slice | `packages/core/src/orchestrator/`; core tests pass |
| CLI Orchestrator Commands | Complete first slice | `ai-pm orchestrator`, `ai-pm agent status`; CLI tests pass |
| Read-Only Chat Gateway API | Complete first slice | `/api/chat/commands`, `/api/chat/query`; server tests pass |
| Artifact Factory | Complete first slice | template registry validation and Markdown/HTML/JSON renderers; core tests pass |
| Scope Traceability Runtime | Complete first slice | core workflow and `ai-pm traceability build`; tests/build pass |
| Code Quality Guard Runtime | Complete first slice | core workflow and `ai-pm code-quality review`; tests/build pass |
| Orchestrator Execution Records | Complete first slice | project-scoped execution records and audit log; core tests pass |
| MCP Context Snapshot | Complete first slice | local registry/profile snapshot; core tests pass |
| Chat Action Protocol | Complete first slice | read-only query, action proposal, history; server tests pass |
| Desktop Command Center | Complete first slice | desktop build passes |
| Mobile Command Center | Complete first slice | mobile state/screen and tests pass |
| Setup Core Contract | Complete first slice | `packages/core/src/setup`; core tests pass |
| Setup CLI Doctor/Repair | Complete first slice | `ai-pm setup doctor/repair`; self-use score 100 |
| Existing Project Adoption CLI | Partial | `adopt --json` reports readiness; actual writes are performed by `setup repair` |
| Desktop Setup Gateway | Complete build slice | setup gateway/wizards/guide dialogs build; manual Electron click-through still needed |
| Mobile Setup Status | Complete build slice | `SetupStatusScreen`; mobile build passes |
| Meeting Intelligence Workflow | Complete | `meetingIntelligence.ts` + unit/integration tests pass |
| DevOps Release Workflow | Complete | `devopsRelease.ts` + unit/integration tests pass |
| Auth Middleware | Complete | `packages/server/src/middleware/auth.ts` + tests pass |
| Security Documentation | Complete | `docs/security/threat-model.md`, `docs/security/auth-boundaries.md` |
| Connector Fixtures | Complete | `schemas/fixtures/connectors/*.json` + `connectorFixtures.test.ts` pass |
| Final Acceptance Matrix | Complete | `docs/superpowers/plans/final-green-gate.md` updated |

## Acceptance Status By Wave

| Wave | Area | Status | Gaps |
|---|---|---|---|
| Wave 10 | CLI smoke + setup docs | Complete | — |
| Wave 13 | Meeting/DevOps workflows | Complete | — |
| Wave 14 | Auth + security | Complete | — |
| Wave 15 | Connector fixtures | Complete | Live sync not implemented |
| Wave 16 | Final acceptance | Complete | Needs 2026-06-22 status refresh |
| Wave 17 | Self-test continuation | Active | Weekly approval project scope, live connectors, Electron smoke, release packaging |

## Review Findings From Wave 7

- Agent 2 left `schema validate --json-string` broken due CLI option mismatch and invalid test fixture. Fixed in `packages/cli/src/commands/schema.ts` and `schema.test.ts`.
- Agent 6 left TypeScript build failures in risk workflow exports, memory artifact metadata, and weekly test casting. Fixed in `packages/core/src/workflows/index.ts`, `riskControl.ts`, `weeklyReport.test.ts`, and `runtime/memory.ts`.
- Root `pnpm test` / `pnpm build` can fail in this sandbox due package manager PATH/version handling. The reliable gate is `corepack pnpm@9.4.0 -r run test` and `corepack pnpm@9.4.0 -r run build`.

## Review Findings From Wave 8

- Agent 4 left an artifact factory test that contradicted the Wave 8 requirement for Markdown, HTML, and JSON default rendering. The test was corrected to match the product requirement.
- Agent 5 left traceability TypeScript build errors: nullable baseline input and missing `MemoryArtifact` archive fields. Fixed in `packages/core/src/workflows/traceability.ts`.
- Agent 6 implemented the core code quality guard but missed the required CLI command. Added `packages/cli/src/commands/code-quality.ts` and registered it in the CLI entrypoint.
- CLI entrypoint had `riskCommand` exported but not registered in `packages/cli/bin/ai-pm.js`; fixed during Wave 8 review.

## Review Findings From Wave 9

- Wave 9 added execution records, MCP context snapshots, chat history/action proposals, desktop command center, and mobile command center.
- Build initially failed because `@ai-pm/core/orchestrator` was imported by CLI but not exported by `packages/core/package.json`. Fixed by adding the `./orchestrator` export.
- Completion gate initially missed the new CLI smoke checks. Added checks for `orchestrator --help`, `agent status --json`, `traceability build --help`, and `code-quality review --help`.

## Review Findings From Setup/Wave 10 Prep

- Removed stale `packages/core/src/workflows/weeklyReport.js` that shadowed the `.ts` source and broke artifact assembly, so `generateWeeklyReportForProject` now returns `artifacts` again.
- Added Wave 10 smoke checks to `packages/cli/src/commands/completion-gate.test.ts`: `project profile validate --json`, `mcp validate --json`, `mcp doctor --json`, `agent route --workflow daily-briefing --json`.
- Added user setup docs: `docs/user/getting-started.md`, `docs/user/setup-existing-project.md`.
- Updated README to pin `corepack pnpm@9.4.0` and link user guides.

## Current Gaps

### Gap 0: Setup Gateway Needs Manual Smoke

The setup gateway builds and desktop unit tests pass. Remaining setup hardening is narrower:

- Run real Electron click-through smoke for New Project, Adopt Existing Project, and Demo Project.
- Add mobile setup status device/simulator smoke.
- Keep the automated desktop test aligned with actual setup copy.

Detailed plan:

- `docs/superpowers/plans/2026-06-21-setup-onboarding-gateway.md`

### Gap 1: Weekly And Orchestrator Outputs Need Strict Project Scope

The repo now has a state machine, execution records, audit records, context snapshots, and CLI commands. Daily briefing is profile-aware, but the weekly report approval item observed in the self-test project still uses `local-project`. Weekly reports, approval items, audit records, memory artifacts, and orchestrator records must all resolve the active project profile.

### Gap 2: Chat/Mobile Gateway Needs Identity And Real Adapter

Server has read-only commands, action proposals, and history. It still needs identity/auth, Hermes/OpenClaw/Telegram-style adapter packaging, and safe approval callback flows.

### Gap 3: Artifact Factory Needs Full Workflow Adoption

The central renderer exists. Weekly, risk, traceability, code-quality, meeting, and DevOps workflows still need to consume it consistently and persist artifact references in memory/audit.

### Gap 4: Planning, Cost, Meeting, DevOps, And Release Workflows Remain

WBS/project plan, milestone/Gantt, budget/burn, strict scope verification, UAT/user guide, meeting intelligence, DevOps/release readiness, and stronger code-quality supervision remain to be implemented.

### Gap 5: External Connector Sync Is Still Contract-Only

MCP registry/profiles/contracts and context snapshots exist, but approved external sync for Google Workspace, Jira, Linear, GitHub, Notion, Confluence, Slack/Teams, and Figma is still not implemented.

### Gap 6: Self-Test Project Needs Live Notion And Discord/Hermes Wiring

`examples/ai-pm-tm-test-project` is now the project used to test AI-PM against itself. The local project setup is ready, but live external integration is still intentionally degraded:

- Notion tracking exists as `integrations/notion/issues.csv` and `notion-database-schema.md`; live Notion sync requires a Notion MCP/API profile and approval-gated mutation path.
- Discord/Hermes is the configured communication channel, but the runtime adapter must remain read-only until identity, approval callback, and audit are verified.
- MCP doctor reports degraded health until connector credentials and live profiles are configured.

## Next Work Sequence

Use the remaining master plan assignment set, adjusted by verified state:

- Setup hardening: desktop click-through smoke, adopt/write consolidation, JSON stdout regression tests, mobile setup smoke.
- Wave 10: profile, capability registry, MCP doctor, template tables, init hardening, completion gate.
- Wave 11: daily/weekly full orchestration and artifact adoption.
- Wave 12: WBS, project plan, milestones, cost, strict scope, UAT/user guide.
- Wave 13: meeting intelligence, DevOps, code-quality supervision, automation test evidence.
- Wave 14: chat adapter, identity, approval actions, mobile approval UX, security.
- Wave 15: approved external connector sync and setup wizard.
- Wave 16: release hardening, packaging, documentation, final acceptance.

## Active Prompt Set

Use these files for the next wave:

- `docs/agent-delegation/2026-06-22-wave17-self-test-continuation.md`
- `docs/agent-delegation/2026-06-21-ai-pm-self-test-wave.md`
- `docs/agent-delegation/2026-06-21-master-plan-remaining-assignments.md`

Historical prompt sets are reference only unless explicitly reactivated:

- `docs/agent-delegation/2026-06-20-wave7-assignment.md`
- `docs/agent-delegation/2026-06-20-wave6-assignment.md`
- `docs/agent-delegation/2026-06-20-phase5-task-assignment.md`

## Non-Negotiable Boundaries

- UI agents must not reimplement approval, memory, schema, or workflow state transitions.
- Server/API agents must not redesign desktop or mobile UI.
- CLI agents must keep outputs scriptable with `--json` where appropriate.
- Workflow agents must validate outputs against schema/template contracts before marking complete.
- No external mutation is allowed without approval: email, chat, Jira, Linear, GitHub, Confluence, Notion, Drive, calendar, PR comments, or issue updates.
- All project data must remain project-scoped under `.ai-pm/` or explicit artifact directories.

## Completion Gate

Before claiming Phase 9 complete, run:

```bash
corepack pnpm@9.4.0 -r run test
corepack pnpm@9.4.0 -r run build
node packages/cli/bin/ai-pm.js --help
node packages/cli/bin/ai-pm.js approval count --json
node packages/cli/bin/ai-pm.js memory summary --json
node packages/cli/bin/ai-pm.js schema list --json
node packages/cli/bin/ai-pm.js weekly --help
node packages/cli/bin/ai-pm.js risk --help
node packages/cli/bin/ai-pm.js traceability build --help
node packages/cli/bin/ai-pm.js code-quality review --help
node schemas/validate-fixtures.mjs
rg -n "UNRESOLVED_|TODO_AGENT|PLACEHOLDER" AGENTS.md README.md docs playbooks workflows mcp templates packages --glob "!docs/superpowers/plans/*.md" --glob "!**/dist/**"
```
