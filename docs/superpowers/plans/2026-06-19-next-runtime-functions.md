# Runtime Functions Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` or `superpowers:executing-plans` before implementation. Track tasks with checkbox syntax and report using `docs/operating-model/subagent-protocol.md`.

**Goal:** Keep the runtime layer green while moving from local approval/memory primitives toward a project-scoped PM Orchestrator that can serve CLI, desktop, mobile, chat, and later Hermes/OpenClaw-style command gateways.

**Architecture:** Durable PM logic belongs in `packages/core`. CLI, Electron IPC, local server APIs, desktop UI, and mobile UI consume runtime contracts. UI packages must not reimplement approval, memory, schema, or workflow business rules.

---

## Current Verification State

Verified on 2026-06-20 from `C:\Works\AI-PM`:

```text
pnpm test                                      PASS
pnpm build                                     PASS
pnpm --filter @ai-pm/core test                 PASS (11 files, 137 tests)
pnpm --filter @ai-pm/mcp test                  PASS (1 file, 26 tests)
pnpm --filter @ai-pm/cli test                  PASS (4 files, 71 tests)
pnpm --filter @ai-pm/server test               PASS (1 file, 17 tests)
pnpm --filter @ai-pm/desktop build             PASS
pnpm --filter @ai-pm/mobile build              PASS
node packages/cli/bin/ai-pm.js --help          PASS
node packages/cli/bin/ai-pm.js approval count --json PASS
node packages/cli/bin/ai-pm.js memory summary --json PASS
node schemas/validate-fixtures.mjs             PASS (30/30)
```

Known non-blocking warning:

- Desktop Vite still logs Electron `fs` and `path` browser externalization warnings during build. Build passes. Renderer approval data is IPC-backed; remaining warning should be handled during desktop runtime lifecycle hardening.

## Completed Runtime Work

| Area | Status | Evidence |
|---|---|---|
| Approval Queue Runtime | Complete | `packages/core/src/runtime/approvalQueue.ts`, unit and integration tests pass |
| Schema Validation Runtime | Complete | `packages/core/src/workflows/schemaValidation.ts`, edge/integration tests pass |
| Ajv Format Hardening | Complete | no current `date-time` warning in test output |
| Approval CLI | Complete | `packages/cli/src/commands/approval.ts`, CLI tests pass |
| Memory Runtime | Complete | `packages/core/src/runtime/memory.ts`, core memory tests pass |
| Memory CLI | Complete | `packages/cli/src/commands/memory.ts`, CLI tests pass |
| Init Runtime Bootstrap | Partially complete | creates `.ai-pm/` runtime dirs; project scaffold still needs operating-layer completeness |
| Local Server API | Partial | approval and memory routes exist; approval integration tests pass; memory route integration tests still needed |
| Desktop Approval Runtime Wiring | Partial complete | renderer store uses Electron IPC; desktop server lifecycle/status hardening still needed |
| Mobile Approval API Client | Partial complete | local-server client and mock fallback exist; configuration UX and pairing docs still needed |
| Test Harness | Complete | no-test packages use `vitest run --passWithNoTests`; `pnpm test` passes |

## Current Gaps

### Gap 1: Project Bootstrap Is Not Yet a Full Agent-Readable Project

`ai-pm init` must create a usable project workspace for Codex, Claude Code, Claude Cowork, Hermes-style agents, and future chat/mobile commands. The scaffold must include the operating-layer entrypoints, project profile, runtime directories, memory/audit/approval seeds, and clear next commands.

### Gap 2: Local Server API Needs Contract Tests Beyond Approvals

Approval routes have integration coverage. Memory routes and route naming must be tested and aligned with `docs/architecture/local-server-api-surface.md`.

### Gap 3: Schema Validation Has Runtime But No CLI Surface

Agents and PM users need `ai-pm schema list` and `ai-pm schema validate` to validate workflow outputs before handoff.

### Gap 4: Desktop and Mobile Need Runtime Status UX

Desktop should expose local server lifecycle/status through IPC. Mobile should let the PM configure the laptop local server URL, detect fallback mode, and avoid silently treating mock data as runtime truth.

### Gap 5: PM Automation Needs the First Real Orchestrated Workflow Slice

Weekly report is the best first slice because it exercises project scope, evidence collection, templates, artifact persistence, approval gate, and later Google Drive/Sheets publication.

## Next Work Sequence

### Phase 6a: Runtime Surface Hardening

1. Init Bootstrap Agent: make `ai-pm init` produce a complete AI-readable project scaffold.
2. Schema CLI Agent: add `ai-pm schema list` and `ai-pm schema validate`.
3. Server/API Agent: add memory route integration tests and align API docs/routes.

### Phase 6b: Desktop/Mobile Runtime UX

4. Desktop Runtime Agent: harden local server lifecycle/status IPC and renderer status display.
5. Mobile Runtime Agent: add local server configuration, health check, and explicit fallback UX.

### Phase 6c: First PM Workflow Slice

6. Weekly Report Workflow Agent: implement the first local weekly report draft workflow using templates, memory/audit, and approval handoff. No external publication yet.

## Active Prompt Set

Use this file for the next wave:

- `docs/agent-delegation/2026-06-20-wave6-assignment.md`

Do not use these older prompt sets for new work unless explicitly instructed:

- `docs/agent-delegation/2026-06-19-runtime-hardening-agent-prompts.md`
- `docs/agent-delegation/2026-06-20-phase5-task-assignment.md`

## Non-Negotiable Boundaries

- UI agents must not reimplement approval or memory state transitions.
- Server/API agents must not redesign desktop or mobile UI.
- CLI agents must keep outputs scriptable with `--json` where appropriate.
- Workflow agents must validate outputs against schema/template contracts before marking complete.
- No external mutation is allowed without approval: email, chat, Jira, Linear, GitHub, Confluence, Notion, Drive, calendar, PR comments, or issue updates.
- All project data must remain project-scoped under `.ai-pm/` or explicit artifact directories.

## Completion Gate

Before claiming Phase 6 complete, run:

```bash
pnpm test
pnpm build
node packages/cli/bin/ai-pm.js --help
node packages/cli/bin/ai-pm.js approval count --json
node packages/cli/bin/ai-pm.js memory summary --json
node schemas/validate-fixtures.mjs
rg -n "UNRESOLVED_|TODO_AGENT|PLACEHOLDER" AGENTS.md README.md docs playbooks workflows mcp templates packages --glob "!docs/superpowers/plans/*.md"
```
