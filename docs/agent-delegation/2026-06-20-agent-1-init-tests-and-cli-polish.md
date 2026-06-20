# Coding Agent 1 — Init Tests + CLI Polish

> **Type:** 🖥️ CODING TASK
> **Priority:** Medium — init hardening needs tests; CLI needs polish
> **Depends on:** Agent 1's init bootstrap (completed)
> **Blocks:** Nothing — standalone

## Task

Two parts: (1) add tests for the rewritten init command, (2) polish CLI help text and error messages across all commands.

## Part 1: Init Tests

Create `packages/cli/src/commands/init.test.ts`:

Test cases:
- Creates `.ai-pm/memory/` directory
- Creates `.ai-pm/audit/` directory
- Creates `.ai-pm/approvals/` directory
- Creates `AGENTS.md` with content
- Creates `CODEX.md` with content
- Creates `CLAUDE.md` with content
- Creates `profile.yaml` with project name
- Creates `.ai-pm/memory/memory-state.json`
- Creates `.gitignore` with `.ai-pm/` exclusions
- Does not overwrite existing files
- Handles existing directory gracefully
- Test with custom project name

Use temp directories for all tests (same pattern as other CLI tests).

## Part 2: CLI Polish

Across all CLI commands:
- Ensure `--help` output is consistent and clear
- Add Chinese/English bilingual error messages where missing
- Ensure `--json` output is valid JSON in all commands
- Add `--help` to all subcommands
- Standardize error exit codes: 0=success, 1=error, 2=usage

Files to check and polish:
- `packages/cli/src/commands/approval.ts`
- `packages/cli/src/commands/audit.ts`
- `packages/cli/src/commands/memory.ts`
- `packages/cli/src/commands/project.ts`
- `packages/cli/src/commands/schema.ts` (if exists)

## Key constraints

- Do NOT modify packages/core/ or packages/desktop/
- Tests must use temp directories
- `pnpm --filter @ai-pm/cli test` must pass
- `pnpm --filter @ai-pm/cli build` must pass

## Verification

```bash
pnpm --filter @ai-pm/cli test
pnpm --filter @ai-pm/cli build
node packages/cli/bin/ai-pm.js --help
node packages/cli/bin/ai-pm.js init --help
node packages/cli/bin/ai-pm.js approval --help
```
