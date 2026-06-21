# Wave 8 Assignment — Orchestrator And PM Governance Runtime

> **Date:** 2026-06-20  
> **Status:** Ready after Wave 7 review and green verification.  
> **Canonical plan:** `docs/superpowers/plans/2026-06-19-pm-orchestrator-master-plan.md`  
> **Runtime plan:** `docs/superpowers/plans/2026-06-19-next-runtime-functions.md`

## Verified Baseline

Verified before this assignment:

```text
corepack pnpm@9.4.0 -r run test     PASS
corepack pnpm@9.4.0 -r run build    PASS
packages/core                       PASS (146 tests)
packages/server                     PASS (71 tests)
packages/cli                        PASS (111 tests)
schemas/validate-fixtures.mjs        PASS (30/30)
```

Every agent must read `AGENTS.md`, the canonical plan, the runtime plan, and the relevant workflow/playbook before editing.

Every response must include:

- objective handled
- sources inspected
- changes made
- assumptions and risks
- verification performed
- next recommended action

## Agent 1 — Core Orchestrator State Machine

**Objective:** Implement the first local PM Orchestrator run state machine in `packages/core` without external MCP calls.

**Scope:**

- create `packages/core/src/orchestrator/`
- modify `packages/core/src/index.ts` only for exports
- create focused tests under `packages/core/src/orchestrator/`
- docs only if needed under `docs/architecture/`

**Required behavior:**

- Define orchestrator run states: `intake`, `project_resolution`, `context_pack`, `workflow_selection`, `agent_assignment`, `validation`, `approval_gate`, `artifact_persistence`, `completion_report`, `audit_write`, `failed`.
- Define a `ProjectContextPack` type with project id, project root, methodology, project type, connector availability, memory summary, pending approvals, and assumptions.
- Implement a pure/local `createOrchestratorRun()` and `advanceOrchestratorRun()` API.
- Write audit-compatible run output metadata, but do not call external systems.
- Keep it deterministic and testable.

**Verification:**

```bash
corepack pnpm@9.4.0 --filter @ai-pm/core test
corepack pnpm@9.4.0 --filter @ai-pm/core build
```

## Agent 2 — CLI Orchestrator Commands

**Objective:** Add CLI access to the orchestrator without duplicating core state machine logic.

**Depends on:** Agent 1 core exports. If Agent 1 is not merged yet, create the CLI file with a narrow adapter and clearly mark integration assumptions.

**Scope:**

- create `packages/cli/src/commands/orchestrator.ts`
- modify `packages/cli/src/index.ts`
- modify `packages/cli/bin/ai-pm.js`
- add CLI tests

**Required behavior:**

- `ai-pm orchestrator run --workflow weekly-report --json`
- `ai-pm orchestrator run --workflow risk-control --json`
- `ai-pm orchestrator status <runId> --json` for local run records when available
- `ai-pm project use <path-or-id>` if project command already has a suitable extension point; otherwise document why deferred.
- `ai-pm agent status --json` may be a lightweight static capability report for now.
- All commands must degrade gracefully when `.ai-pm/` is absent.

**Verification:**

```bash
corepack pnpm@9.4.0 --filter @ai-pm/cli test
corepack pnpm@9.4.0 --filter @ai-pm/cli build
node packages/cli/bin/ai-pm.js orchestrator --help
```

## Agent 3 — Read-Only Chat Gateway API

**Objective:** Add local-server endpoints that a Hermes/OpenClaw-style chat adapter can call for read-only PM commands.

**Scope:**

- `packages/server/src/routes/`
- `packages/server/src/index.ts`
- server integration tests
- `docs/architecture/chat-command-gateway.md`

**Required behavior:**

- Add read-only endpoints:
  - `GET /api/chat/commands`
  - `POST /api/chat/query` with command ids: `daily_brief`, `weekly_status`, `risk_summary`, `pending_approvals`
- Return structured JSON only. No outbound chat messages.
- Require a project root from server config/request context. If missing, return a clear degraded response.
- All mutation commands must be rejected with `approval_required: true` and no side effects.

**Verification:**

```bash
corepack pnpm@9.4.0 --filter @ai-pm/server test
corepack pnpm@9.4.0 --filter @ai-pm/server build
```

## Agent 4 — Artifact Factory And Template Registry Validation

**Objective:** Centralize local artifact rendering so weekly/risk/scope/code-quality workflows do not each invent output formatting.

**Scope:**

- create `packages/core/src/artifacts/`
- `templates/templates.yaml`
- focused core tests
- docs under `docs/architecture/`

**Required behavior:**

- Load template catalog from `templates/templates.yaml`.
- Validate required template families exist for daily, weekly, risk, scope, traceability, code review, test plan, UAT, user guide, and DevOps readiness.
- Render local artifacts in Markdown, HTML, and JSON metadata.
- No Google Drive/Sheets sync yet. Output local files only.

**Verification:**

```bash
corepack pnpm@9.4.0 --filter @ai-pm/core test
corepack pnpm@9.4.0 --filter @ai-pm/core build
```

## Agent 5 — Scope Traceability First Runtime Slice

**Objective:** Implement first local scope/traceability workflow for strict scope verification.

**Scope:**

- create `packages/core/src/workflows/traceability.ts`
- create tests
- create `packages/cli/src/commands/traceability.ts`
- register CLI command
- use existing templates under `templates/requirements/` or add narrowly scoped missing template references

**Required behavior:**

- `ai-pm traceability build --input <requirements.json> --json`
- Produce requirement ids, acceptance criteria refs, test refs, owner, status, gaps, and assumptions.
- Queue approval only for scope baseline changes, not for read-only matrix generation.
- Persist output as local artifact metadata through MemoryStore when a project root is available.

**Verification:**

```bash
corepack pnpm@9.4.0 --filter @ai-pm/core test
corepack pnpm@9.4.0 --filter @ai-pm/cli test
corepack pnpm@9.4.0 --filter @ai-pm/cli build
```

## Agent 6 — Code Quality Guard First Runtime Slice

**Objective:** Implement a local code quality guard command for PM-level review of AI-generated/human code before merge.

**Scope:**

- create or extend `packages/core/src/workflows/codeQualityGuard.ts`
- create tests
- create `packages/cli/src/commands/code-quality.ts`
- register CLI command
- use `playbooks/quality/` and `templates/code-review/merge-readiness.md`

**Required behavior:**

- `ai-pm code-quality review --diff <file> --requirements <file> --json`
- Local-only analysis inputs: diff text, requirements ids, test evidence, known risks.
- Output merge readiness, missing tests, requirement mismatches, risk findings, and reviewer actions.
- No PR comments, GitHub mutations, or CI calls.
- Queue approval item only if command proposes an external mutation.

**Verification:**

```bash
corepack pnpm@9.4.0 --filter @ai-pm/core test
corepack pnpm@9.4.0 --filter @ai-pm/cli test
corepack pnpm@9.4.0 --filter @ai-pm/cli build
```

## Execution Map

```text
Agent 1: Core orchestrator state machine
Agent 2: CLI orchestrator commands (integrates after Agent 1 export if available)
Agent 3: Read-only chat gateway API
Agent 4: Artifact factory and template validation
Agent 5: Scope traceability workflow slice
Agent 6: Code quality guard workflow slice
```

Conflict rule: if an agent needs to edit a file outside its scope, it must stop and report the conflict instead of broadening the task.
