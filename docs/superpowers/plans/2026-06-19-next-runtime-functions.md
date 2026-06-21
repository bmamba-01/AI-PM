# Runtime Functions Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` or `superpowers:executing-plans` before implementation. Track tasks with checkbox syntax and report using `docs/operating-model/subagent-protocol.md`.

**Goal:** Keep the runtime layer green while moving from local approval/memory/workflow primitives toward a project-scoped PM Orchestrator that can serve CLI, desktop, mobile, chat, and later Hermes/OpenClaw-style command gateways.

**Architecture:** Durable PM logic belongs in `packages/core`. CLI, Electron IPC, local server APIs, desktop UI, and mobile UI consume runtime contracts. UI packages must not reimplement approval, memory, schema, or workflow business rules.

---

## Current Verification State

Verified on 2026-06-21 from `C:\Works\AI-PM` after Wave 8 review:

```text
corepack pnpm@9.4.0 -r run test              PASS
corepack pnpm@9.4.0 -r run build             PASS
packages/core test                           PASS (17 files, 213 tests)
packages/mcp test                            PASS (1 file, 26 tests)
packages/server test                         PASS (3 files, 97 tests)
packages/cli test                            PASS (8 files, 124 tests)
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

## Review Findings From Wave 7

- Agent 2 left `schema validate --json-string` broken due CLI option mismatch and invalid test fixture. Fixed in `packages/cli/src/commands/schema.ts` and `schema.test.ts`.
- Agent 6 left TypeScript build failures in risk workflow exports, memory artifact metadata, and weekly test casting. Fixed in `packages/core/src/workflows/index.ts`, `riskControl.ts`, `weeklyReport.test.ts`, and `runtime/memory.ts`.
- Root `pnpm test` / `pnpm build` can fail in this sandbox due package manager PATH/version handling. The reliable gate is `corepack pnpm@9.4.0 -r run test` and `corepack pnpm@9.4.0 -r run build`.

## Review Findings From Wave 8

- Agent 4 left an artifact factory test that contradicted the Wave 8 requirement for Markdown, HTML, and JSON default rendering. The test was corrected to match the product requirement.
- Agent 5 left traceability TypeScript build errors: nullable baseline input and missing `MemoryArtifact` archive fields. Fixed in `packages/core/src/workflows/traceability.ts`.
- Agent 6 implemented the core code quality guard but missed the required CLI command. Added `packages/cli/src/commands/code-quality.ts` and registered it in the CLI entrypoint.
- CLI entrypoint had `riskCommand` exported but not registered in `packages/cli/bin/ai-pm.js`; fixed during Wave 8 review.

## Current Gaps

### Gap 1: Orchestrator Loop Is Executable But Not Yet Driving Real Multi-Agent Work

The repo now has a first local orchestrator state machine and CLI. The next gap is connecting that loop to workflow execution, audit persistence, artifact factory output, approval queue decisions, and future specialist-agent dispatch records.

### Gap 2: Chat/Mobile Command Gateway Is Read-Only Only

Server has read-only chat command endpoints. The next gap is a safe command-action protocol for approval-protected actions and mobile/chat surfaces that can show command history, pending approvals, and degraded source coverage.

### Gap 3: Artifact Factory Needs Workflow Adoption

The central renderer exists. Weekly, risk, traceability, code-quality, meeting, and DevOps workflows still need to consume it consistently and persist artifact references in memory/audit.

### Gap 4: Desktop And Mobile Need Runtime Surfaces For New Capabilities

Desktop and mobile currently expose only earlier runtime slices. They need panels/screens for orchestrator runs, chat command queries, traceability matrices, code quality findings, and artifact outputs without duplicating core rules.

### Gap 5: MCP Gateway Is Documented But Not Yet Feeding Context Packs

MCP registry/profiles/contracts exist, but orchestrated workflows do not yet consume a normalized connector availability/context pack.

## Next Work Sequence

### Phase 9a: Make Orchestrator Runs Useful

1. Core Runtime Agent: connect orchestrator runs to audit/memory/artifact records.
2. MCP/DB Agent: add connector availability snapshot and local SQLite-ready project context query layer.

### Phase 9b: Make Remote Control Practical

3. Server/API Agent: add approval-safe chat action protocol and command history endpoints.
4. Desktop UI Agent: add orchestrator/chat/artifact runtime panels backed by server/core APIs.
5. Mobile UI Agent: add mobile command center for read-only chat queries and pending approvals.

### Phase 9c: Make It Release-Ready For PM Use

6. QA/Integration Agent: add end-to-end smoke coverage for CLI, server, desktop build, mobile build, and command contracts.

## Active Prompt Set

Use this file for the next wave:

- `docs/agent-delegation/2026-06-21-wave9-assignment.md`

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
