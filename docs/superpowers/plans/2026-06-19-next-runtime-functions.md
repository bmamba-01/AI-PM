# Runtime Functions Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` or `superpowers:executing-plans` before implementation. Track tasks with checkbox syntax and report using `docs/operating-model/subagent-protocol.md`.

**Goal:** Keep the runtime layer green while moving from local approval/memory/workflow primitives toward a project-scoped PM Orchestrator that can serve CLI, desktop, mobile, chat, and later Hermes/OpenClaw-style command gateways.

**Architecture:** Durable PM logic belongs in `packages/core`. CLI, Electron IPC, local server APIs, desktop UI, and mobile UI consume runtime contracts. UI packages must not reimplement approval, memory, schema, or workflow business rules.

---

## Current Verification State

Verified on 2026-06-21 from `C:\Works\AI-PM` after Wave 9 review:

```text
corepack pnpm@9.4.0 -r run test              PASS
corepack pnpm@9.4.0 -r run build             PASS
packages/core test                           PASS (19 files, 244 tests)
packages/mcp test                            PASS (1 file, 26 tests)
packages/server test                         PASS (3 files, 121 tests)
packages/cli test                            PASS (8 files, 128 tests)
packages/mobile test                         PASS (1 file, 10 tests)
node schemas/validate-fixtures.mjs           PASS (30/30)
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

## Current Gaps

### Gap 1: Orchestrator Loop Still Needs Full Workflow Dispatch

The repo now has a state machine, execution records, audit records, context snapshots, and CLI commands. The CLI workflow adapter still uses narrow placeholder dispatch for daily/weekly/risk and must be replaced by full core orchestrated workflow dispatch.

### Gap 2: Chat/Mobile Gateway Needs Identity And Real Adapter

Server has read-only commands, action proposals, and history. It still needs identity/auth, Hermes/OpenClaw/Telegram-style adapter packaging, and safe approval callback flows.

### Gap 3: Artifact Factory Needs Full Workflow Adoption

The central renderer exists. Weekly, risk, traceability, code-quality, meeting, and DevOps workflows still need to consume it consistently and persist artifact references in memory/audit.

### Gap 4: Planning, Cost, Meeting, DevOps, And Release Workflows Remain

WBS/project plan, milestone/Gantt, budget/burn, strict scope verification, UAT/user guide, meeting intelligence, DevOps/release readiness, and stronger code-quality supervision remain to be implemented.

### Gap 5: External Connector Sync Is Still Contract-Only

MCP registry/profiles/contracts and context snapshots exist, but approved external sync for Google Workspace, Jira, Linear, GitHub, Notion, Confluence, Slack/Teams, and Figma is still not implemented.

## Next Work Sequence

Use the remaining master plan assignment set:

- Wave 10: profile, capability registry, MCP doctor, template tables, init hardening, completion gate.
- Wave 11: daily/weekly full orchestration and artifact adoption.
- Wave 12: WBS, project plan, milestones, cost, strict scope, UAT/user guide.
- Wave 13: meeting intelligence, DevOps, code-quality supervision, automation test evidence.
- Wave 14: chat adapter, identity, approval actions, mobile approval UX, security.
- Wave 15: approved external connector sync and setup wizard.
- Wave 16: release hardening, packaging, documentation, final acceptance.

## Active Prompt Set

Use this file for the next wave:

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
