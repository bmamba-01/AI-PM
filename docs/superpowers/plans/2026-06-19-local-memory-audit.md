# Local Memory and Audit Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make `ai-pm daily brief` read local project memory and write an audit record for each workflow run.

**Architecture:** Add a small file-backed runtime store under `.ai-pm/` for the first local-first slice. The CLI remains deterministic and works without online MCP. Later phases can replace or mirror this file store with SQLite without changing the CLI command contract.

**Tech Stack:** TypeScript, Node filesystem APIs, Vitest, Commander, pnpm workspaces.

---

## Delegated Work Excluded

This plan does not include the tasks assigned in:

- `docs/agent-delegation/2026-06-18-agent-prompts.md`
- `docs/agent-delegation/2026-06-19-agent-prompts.md`

## Files

- `packages/core/src/runtime/localProjectStore.ts`: file-backed local memory and audit store.
- `packages/core/src/runtime/localProjectStore.test.ts`: behavior tests for loading local daily items and appending audit records.
- `packages/core/src/runtime/index.ts`: runtime exports.
- `packages/core/package.json`: runtime subpath export.
- `packages/cli/src/commands/daily.ts`: read local daily items and write audit log.
- `docs/superpowers/plans/2026-06-19-local-memory-audit.md`: this plan.

## Tasks

### Task 1: Local Store

- [x] Write failing tests for reading `.ai-pm/daily-items.json` and appending `.ai-pm/audit/workflow-runs.jsonl`.
- [x] Implement `LocalProjectStore`.
- [x] Export runtime APIs from core.
- [x] Run focused runtime tests.

### Task 2: CLI Integration

- [x] Update `ai-pm daily brief` to load local memory items.
- [x] Keep fallback item when local memory file is missing or empty.
- [x] Append audit record after each briefing.
- [x] Add `auditRef` to CLI JSON output without changing core workflow output shape.

### Task 3: Verification

- [x] `pnpm --filter @ai-pm/core test -- src/runtime/localProjectStore.test.ts`
- [x] `pnpm --filter @ai-pm/core test -- src/workflows/dailyBriefing.test.ts`
- [x] `pnpm build`
- [x] `node packages/cli/bin/ai-pm.js daily brief --project alpha --json`

## Local File Contracts

Daily items:

```json
[
  {
    "source": "local-memory",
    "type": "blocker",
    "title": "Example blocker",
    "priority": "high"
  }
]
```

Audit log line:

```json
{"runId":"...","workflowId":"daily-briefing","projectId":"alpha","status":"completed","startedAt":"...","completedAt":"...","outputSummary":"...","sourceCoverage":["local-memory"]}
```
