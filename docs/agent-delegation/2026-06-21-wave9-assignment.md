# Wave 9 Assignment — Orchestrator Execution And PM Control Surfaces

> **Date:** 2026-06-21  
> **Status:** Ready after Wave 8 review and green verification.  
> **Canonical plan:** `docs/superpowers/plans/2026-06-19-pm-orchestrator-master-plan.md`  
> **Runtime plan:** `docs/superpowers/plans/2026-06-19-next-runtime-functions.md`

## Verified Baseline

Verified before this assignment:

```text
corepack pnpm@9.4.0 -r run build    PASS
corepack pnpm@9.4.0 -r run test     PASS
packages/core                       PASS (17 files, 213 tests)
packages/server                     PASS (3 files, 97 tests)
packages/cli                        PASS (8 files, 124 tests)
packages/mcp                        PASS (1 file, 26 tests)
```

Every agent must read `AGENTS.md`, the canonical plan, this runtime plan, and the relevant workflow/playbook before editing. Use `docs/operating-model/subagent-protocol.md` for the final report format.

## Agent 1 — Core Orchestrator Execution Records

**Assigned role:** Core Runtime Agent  
**Objective:** Make orchestrator runs produce durable project-scoped records: audit entry, memory task, artifact references, and approval state summary.

**Scope:**

- `packages/core/src/orchestrator/`
- `packages/core/src/runtime/`
- `packages/core/src/artifacts/` only for consuming existing artifact APIs
- tests under `packages/core/src/orchestrator/`

**Required behavior:**

- Add a core API such as `finalizeOrchestratorRun()` or extend `advanceOrchestratorRun()` to accept execution outputs.
- Persist run metadata under project-scoped local runtime state, not global state.
- Link generated artifacts by id/path when a workflow returns artifact outputs.
- Include audit-ready fields: workflow id, trigger, project id, source coverage, assumptions, approval ids, started/completed timestamps, and final status.
- Do not call external agents, chat apps, MCP tools, Jira, GitHub, Drive, or email.

**Do not touch:**

- Desktop UI, mobile UI, server routes, MCP registry.

**Verification:**

```bash
corepack pnpm@9.4.0 --filter @ai-pm/core test
corepack pnpm@9.4.0 --filter @ai-pm/core build
```

## Agent 2 — MCP/DB Context Snapshot

**Assigned role:** MCP + DB Agent  
**Objective:** Create a local, queryable connector availability snapshot that the orchestrator can use to build project context packs without hitting external systems.

**Scope:**

- `packages/core/src/orchestrator/` for context pack consumption
- `packages/mcp/src/` for registry/profile validation helpers if needed
- `mcp/profiles/` only for example or test fixtures
- tests under `packages/core` or `packages/mcp`
- docs under `docs/architecture/`

**Required behavior:**

- Read existing MCP registry/profile files and produce a normalized snapshot:
  - connector id
  - enabled/disabled
  - health/degraded/unknown
  - read capabilities
  - mutation capabilities
  - approval requirement
  - degraded workflow behavior
- Expose a pure/local API for orchestrator context packs.
- Add a SQLite-ready data shape in docs, but do not require SQLite runtime dependency unless already present.
- Keep all connector access read-only; do not authenticate or call vendor APIs.

**Do not touch:**

- Desktop/mobile UI.
- Chat gateway mutations.

**Verification:**

```bash
corepack pnpm@9.4.0 --filter @ai-pm/core test
corepack pnpm@9.4.0 --filter @ai-pm/mcp test
corepack pnpm@9.4.0 -r run build
```

## Agent 3 — Server Chat Action Protocol

**Assigned role:** Server/API Agent  
**Objective:** Extend the chat gateway from read-only query to approval-safe action proposal, so Hermes/OpenClaw-style adapters can ask for actions without causing side effects.

**Scope:**

- `packages/server/src/routes/chatGateway.ts`
- `packages/server/src/routes/chatGateway.integration.test.ts`
- server route registration only if needed
- `docs/architecture/chat-command-gateway.md`

**Required behavior:**

- Add `GET /api/chat/history` returning recent local command/query records.
- Add `POST /api/chat/action` for action proposals such as:
  - `draft_weekly_report`
  - `create_traceability_matrix`
  - `run_code_quality_review`
  - `request_publication_approval`
- For every action proposal, return structured JSON with `approval_required`, `side_effects: []`, and no external mutation.
- If an action would publish/send/update external systems, create only an approval proposal or return `approval_required: true`; do not execute.
- Persist command history locally when project root is available; degrade clearly when unavailable.

**Do not touch:**

- Desktop/mobile UI.
- Core workflow implementation beyond imported APIs.

**Verification:**

```bash
corepack pnpm@9.4.0 --filter @ai-pm/server test
corepack pnpm@9.4.0 --filter @ai-pm/server build
```

## Agent 4 — Desktop PM Command Center

**Assigned role:** Desktop UI Agent  
**Objective:** Add desktop UI surfaces for orchestrator runs, chat queries, artifact outputs, traceability, and code-quality summaries using existing runtime/server APIs.

**Scope:**

- `packages/desktop/src/`
- `packages/desktop/main.ts` and `packages/desktop/preload.ts` only for IPC bridges
- desktop types under `packages/desktop/src/global.d.ts`

**Required behavior:**

- Add a PM command center view or tab that shows:
  - recent orchestrator runs
  - pending approvals count/list link
  - read-only chat query buttons: daily brief, weekly status, risk summary, pending approvals
  - recent artifacts
  - traceability/code-quality summary placeholders backed by available local APIs
- Do not duplicate core business rules in React components.
- If server APIs are unavailable, show degraded local/offline state instead of crashing.
- Keep the UI dense and operational, not a marketing page.

**Do not touch:**

- Core workflow logic.
- Server route behavior except IPC consumption if absolutely required.

**Verification:**

```bash
corepack pnpm@9.4.0 --filter @ai-pm/desktop build
corepack pnpm@9.4.0 --filter @ai-pm/desktop test
```

## Agent 5 — Mobile Command Center

**Assigned role:** Mobile UI Agent  
**Objective:** Add a mobile companion command center for laptop-hosted server queries and approval awareness.

**Scope:**

- `packages/mobile/src/`
- mobile state/API helpers only
- docs only if needed under `docs/architecture/`

**Required behavior:**

- Add mobile state helpers for:
  - listing supported chat commands
  - sending read-only chat queries
  - showing pending approvals
  - queuing actions offline when the laptop server is unreachable
- Add a screen/component for daily brief, weekly status, risk summary, pending approvals.
- Do not add external chat adapter code yet.
- Keep all mutations approval-gated and offline-safe.

**Do not touch:**

- Desktop UI.
- Server route implementation unless reporting a missing contract.

**Verification:**

```bash
corepack pnpm@9.4.0 --filter @ai-pm/mobile build
corepack pnpm@9.4.0 --filter @ai-pm/mobile test
```

## Agent 6 — Integration And Completion Gate Expansion

**Assigned role:** QA/Integration Agent  
**Objective:** Expand the completion gate so future waves cannot pass while CLI commands, server contracts, desktop build, or mobile build are broken.

**Scope:**

- `packages/cli/src/commands/completion-gate.test.ts`
- package scripts only if needed
- `docs/superpowers/plans/2026-06-19-next-runtime-functions.md` only to update gate commands
- small fixtures under `packages/cli/src/commands/__fixtures__/` if needed

**Required behavior:**

- Add smoke checks for:
  - `ai-pm orchestrator --help`
  - `ai-pm agent status --json`
  - `ai-pm traceability build --help`
  - `ai-pm code-quality review --help`
  - server chat gateway command contract, either via integration test or documented smoke command
- Ensure tests do not require external MCP credentials, network APIs, desktop GUI, or mobile device.
- Document exact gate command order: build first, then recursive test, then schema fixtures and marker scan.

**Do not touch:**

- Core workflow algorithms.
- UI implementation.

**Verification:**

```bash
corepack pnpm@9.4.0 --filter @ai-pm/cli test
corepack pnpm@9.4.0 -r run build
corepack pnpm@9.4.0 -r run test
node schemas/validate-fixtures.mjs
```

## Execution Map

```text
Agent 1: Core orchestrator execution records
Agent 2: MCP/DB context snapshot
Agent 3: Server chat action protocol
Agent 4: Desktop PM command center
Agent 5: Mobile command center
Agent 6: Integration/completion gate expansion
```

Conflict rule: if an agent needs to edit outside its scope, it must stop and report the conflict instead of broadening the task.
