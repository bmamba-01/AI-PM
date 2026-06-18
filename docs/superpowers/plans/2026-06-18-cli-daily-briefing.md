# CLI Daily Briefing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the first executable runtime vertical slice: `ai-pm daily brief`.

**Architecture:** The CLI calls a deterministic core workflow function in `@ai-pm/core/workflows`. The first slice uses local fallback context only and marks online MCP coverage unavailable, so it does not overlap with delegated MCP implementation-matrix work.

**Tech Stack:** TypeScript, Vitest, Commander, pnpm workspaces.

---

## Delegated Work Excluded

The tasks in `docs/agent-delegation/2026-06-18-agent-prompts.md` are excluded from this plan:

- operating-layer consistency review
- PM template library baseline
- MCP implementation matrix docs

## Files

- `packages/core/src/workflows/dailyBriefing.ts`: deterministic daily briefing generator.
- `packages/core/src/workflows/dailyBriefing.test.ts`: behavior test for briefing prioritization and source coverage.
- `packages/core/src/workflows/index.ts`: workflow exports.
- `packages/core/package.json`: workflow subpath export.
- `packages/cli/src/commands/daily.ts`: CLI command.
- `packages/cli/src/index.ts`: CLI library export.
- `packages/cli/bin/ai-pm.js`: executable command registration.
- `packages/mcp/package.json`: `connectionManager` subpath export required by existing CLI MCP command.
- `packages/cli/src/commands/mcp.ts`: MCP import path aligned to package export.
- `packages/cli/src/commands/methodology.ts`: methodology import path aligned to package export.

## Tasks

### Task 1: Core Daily Briefing

- [x] Write failing test for local daily briefing prioritization.
- [x] Run test and confirm missing module failure.
- [x] Implement `generateDailyBriefing`.
- [x] Export workflows from core.
- [x] Run focused core test.

### Task 2: CLI Command

- [x] Add `daily brief` command.
- [x] Register command in CLI bin.
- [x] Print JSON when `--json` is passed.
- [x] Print human-readable fallback output otherwise.

### Task 3: Package Boundary Fixes

- [x] Export `@ai-pm/core/workflows`.
- [x] Export `@ai-pm/mcp/connectionManager`.
- [x] Align CLI imports with package exports.
- [x] Fix ESM relative exports needed by runtime command path.

### Task 4: Verification

- [x] `pnpm --filter @ai-pm/core test -- src/workflows/dailyBriefing.test.ts`
- [x] `pnpm --filter @ai-pm/core build`
- [x] `pnpm --filter @ai-pm/mcp build`
- [x] `pnpm --filter @ai-pm/cli build`
- [x] `node packages/cli/bin/ai-pm.js daily brief --project alpha --json`

## Next Steps

- Load local project memory instead of hardcoded fallback items.
- Add audit log persistence.
- Connect MCP source summaries after Agent 3 completes MCP implementation matrix.
- Add desktop read-only Daily Brief view after CLI workflow stabilizes.

