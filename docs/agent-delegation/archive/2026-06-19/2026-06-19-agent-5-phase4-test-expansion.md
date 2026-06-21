# Coding Agent 5 — Phase 4: Test Coverage Expansion

> **Type:** 🖥️ CODING TASK
> **Priority:** Medium — test quality gate
> **Depends on:** All runtime code stable
> **Blocks:** Nothing — standalone

## Task

Expand test coverage for CLI commands, edge cases, and workflow validation. Focus on gaps in existing test suites.

## Files to create/modify

- Create: `packages/cli/src/commands/audit.test.ts` — audit CLI command tests
- Create: `packages/cli/src/commands/project.test.ts` — project scan CLI tests
- Create: `packages/cli/src/commands/approval.test.ts` — approval CLI tests
- Create: `packages/core/src/workflows/schemaValidation.edge.test.ts` — schema edge cases

## What to test

### 1. CLI command tests

For each CLI command, test:
- `audit list` — empty store returns empty list, not error
- `audit list --json` — valid JSON output
- `project scan` — empty dir returns score 0, full project returns score 100
- `project scan --json` — valid JSON output
- `approval list` — empty store returns empty list
- `approval count` — returns counts object
- `approval list --status pending` — filter works

Use the existing CLI test pattern from `packages/cli/src/commands/` if any tests exist, or create minimal test files that import and call the command action logic directly.

### 2. Schema edge cases

Create `packages/core/src/workflows/schemaValidation.edge.test.ts`:
- Empty output object → validation fails (missing required fields)
- Output with extra fields → passes (additionalProperties: false should reject, but verify)
- Schema file not found → returns valid with warning
- Invalid JSON in schema file → returns error
- Multiple schema validation in batch

### 3. Memory store edge cases

Add to existing memory tests or create new file:
- Complete task → verify completed_at is set
- Archive artifact → verify archived_at and archive_reason are set
- Auto-archive with 0 day threshold → archives everything
- Stale detection with 0 day threshold → returns all artifacts
- Summary counts match after operations

## Key constraints

- Do NOT modify production code — only test files
- Tests must use temp directories
- `pnpm --filter @ai-pm/core test` must pass
- `pnpm build` must pass

## Context files to read

1. packages/core/src/runtime/approvalQueue.test.ts (test pattern)
2. packages/core/src/workflows/schemaValidation.test.ts (schema test pattern)
3. packages/core/src/workflows/schemaValidation.ts
4. packages/cli/src/commands/audit.ts
5. packages/cli/src/commands/project.ts
6. packages/cli/src/commands/approval.ts

## Verification

```bash
pnpm --filter @ai-pm/core test
pnpm build
# Count total tests — should increase
pnpm --filter @ai-pm/core test 2>&1 | grep -E "Tests|test files"
```
