# Coding Agent 2 — Schema CLI Tests + Hardening

> **Type:** 🖥️ CODING TASK
> **Priority:** High — schema CLI exists but has no tests
> **Depends on:** Agent 2's schema CLI (completed, 181 lines)
> **Blocks:** Nothing — standalone

## Task

The schema CLI command was created but has no test file. Add comprehensive tests and harden error handling.

## Files to create/modify

- Create: `packages/cli/src/commands/schema.test.ts`
- Review: `packages/cli/src/commands/schema.ts` (fix any issues found)

## Test cases to create

### Schema List Tests
- `schema list` with all schemas available → returns list of 16 schemas
- `schema list --json` → valid JSON array output
- Empty schemas directory → graceful empty list (not crash)

### Schema Validate Tests
- Valid daily briefing output → passes validation
- Invalid daily briefing output (missing required field) → fails with error message
- `--json` output → valid JSON with `valid: boolean` and `errors: string[]`
- Unknown workflow ID → error: "No schema found for workflow: xyz"
- Non-existent input file → error: "File not found: xyz.json"
- Invalid JSON in input file → error: "Invalid JSON"
- `--workflow daily-briefing --input valid.json` → success
- `--workflow daily-briefing --input invalid.json` → failure with specific error

### Edge Cases
- `schema` without subcommand → shows help
- `schema validate` without --workflow → error: "workflow is required"
- `schema validate` without --input → error: "input is required"
- `schema list --nonexistent-flag` → graceful handling

## What to verify in schema.ts

- Read the file and check for:
  - Missing error handling paths
  - Missing `--help` on subcommands
  - Consistent bilingual messages (EN/VI)
  - Consistent exit codes

## Key constraints

- Do NOT modify packages/core/ or packages/desktop/
- Use existing fixture files from `schemas/fixtures/workflows/` for test data
- `pnpm --filter @ai-pm/cli test` must pass
- `pnpm --filter @ai-pm/cli build` must pass

## Context files to read

1. packages/cli/src/commands/schema.ts
2. packages/cli/src/commands/approval.test.ts (test pattern)
3. packages/cli/src/commands/memory.test.ts (test pattern)
4. schemas/fixtures/workflows/daily-briefing.output.valid.json
5. schemas/fixtures/workflows/daily-briefing.output.invalid.json
6. packages/core/src/workflows/schemaValidation.ts

## Verification

```bash
pnpm --filter @ai-pm/cli test
pnpm --filter @ai-pm/cli build
node packages/cli/bin/ai-pm.js schema list
node packages/cli/bin/ai-pm.js schema validate --help
```
