# Coding Agent 1 — Audit CLI Expansion

> **Type:** 🖥️ CODING TASK
> **Priority:** High — audit trail is core to PM governance
> **Depends on:** Agent 1's init + CLI polish (completed)
> **Blocks:** Nothing — enables PM to inspect full audit trail

## Task

Expand the audit CLI to show detailed workflow run history, not just list. Add filtering, search, and export capabilities.

## Files to modify

- `packages/cli/src/commands/audit.ts` — expand subcommands
- `packages/cli/src/commands/audit.test.ts` — add tests

## What to implement

### 1. Expand `ai-pm audit list`

Add filters:
- `--workflow <id>` — filter by workflow name
- `--status <status>` — filter by status (completed, failed, blocked)
- `--from <YYYY-MM-DD>` — filter by date range start
- `--to <YYYY-MM-DD>` — filter by date range end
- `--limit <n>` — max items (default 20)
- `--json` — JSON output

### 2. Add `ai-pm audit show <runId>`

Show full detail of a single audit run:
- All fields from the audit record
- Source coverage list
- Assumptions list
- Confidence score with color

### 3. Add `ai-pm audit export`

Export audit records to JSON file:
- `ai-pm audit export --output audit-export.json`
- `ai-pm audit export --format csv` (future)

## Key constraints

- Read from `.ai-pm/audit/workflow-runs.jsonl` using `LocalProjectStore.loadWorkflowAuditRecords()`
- Do NOT modify packages/core/ or packages/desktop/
- Bilingual EN/VI
- `pnpm --filter @ai-pm/cli test` must pass
- `pnpm --filter @ai-pm/cli build` must pass

## Context files to read

1. packages/cli/src/commands/audit.ts
2. packages/cli/src/commands/audit.test.ts
3. packages/core/src/runtime/localProjectStore.ts

## Verification

```bash
pnpm --filter @ai-pm/cli test
pnpm --filter @ai-pm/cli build
node packages/cli/bin/ai-pm.js audit --help
node packages/cli/bin/ai-pm.js audit list --json
```
