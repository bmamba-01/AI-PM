# Coding Agent 1 — Task 5: Schema Validation Runtime

> **Type:** 🖥️ CODING TASK

## Task

Create `packages/core/src/workflows/schemaValidation.ts` — load JSON schemas and validate workflow outputs before audit persistence.

## Files to create/modify

- Create: `packages/core/src/workflows/schemaValidation.ts`
- Create: `packages/core/src/workflows/schemaValidation.test.ts`

## What to implement

1. `loadWorkflowSchema(workflowId: string)` — load schema from `schemas/workflows/{workflowId}.output.schema.json`
2. `validateWorkflowOutput(workflowId: string, output: unknown)` — validate output against schema using ajv
3. Return `ValidationResult { valid: boolean, errors: string[] }`
4. Graceful fallback: if schema file not found, return valid with warning
5. Start with Daily Briefing output only

## Key constraints

- Use ajv (already in package.json devDeps)
- Import schemas as JSON (`import schema from '../../schemas/workflows/...'`)
- Do NOT modify packages/mcp/ or packages/cli/
- Test with valid and invalid daily briefing output fixtures from `schemas/fixtures/workflows/`
- `pnpm --filter @ai-pm/core build` and `pnpm --filter @ai-pm/core test` must pass

## Context files to read

1. packages/core/src/workflows/dailyBriefing.ts
2. packages/core/src/workflows/dailyBriefing.test.ts
3. schemas/workflows/daily-briefing.output.schema.json
4. schemas/fixtures/workflows/daily-briefing.output.valid.json
5. schemas/fixtures/workflows/daily-briefing.output.invalid.json
