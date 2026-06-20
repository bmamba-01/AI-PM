# Coding Agent 6 — Weekly CLI Wiring + Next Workflow Slice

> **Type:** 🖥️ CODING TASK
> **Priority:** High — weekly report needs CLI entry point to be usable
> **Depends on:** Agent 6's weeklyReport.ts + weekly.ts (completed but unwired)
> **Blocks:** Nothing — enables PM to run weekly reports from terminal

## Task

Wire the weekly report CLI command into the CLI entry point, then start the next workflow slice: daily briefing runtime integration.

## Part 1: Wire weekly command (fix incomplete wiring)

### Files to modify:

- `packages/cli/src/index.ts` — add weeklyCommand export
- `packages/cli/bin/ai-pm.js` — import and register weeklyCommand

### What to add to packages/cli/src/index.ts:

```typescript
export { weeklyCommand } from './commands/weekly.js';
```

### What to add to packages/cli/bin/ai-pm.js:

```typescript
import { weeklyCommand } from '../dist/commands/weekly.js';
// ...
program.addCommand(weeklyCommand);
// ...
console.log(chalk.gray('  weekly report          Generate weekly status report draft'));
```

### Verify:

```bash
pnpm --filter @ai-pm/cli build
node packages/cli/bin/ai-pm.js weekly --help
node packages/cli/bin/ai-pm.js weekly --json
```

## Part 2: Daily Briefing Runtime Integration

The daily briefing currently uses hardcoded mock data in `daily.ts`. Wire it to use the runtime.

### Files to modify:

- `packages/cli/src/commands/daily.ts` — use real project data from `LocalProjectStore`

### What to do:

1. Load project data from `.ai-pm/` using `LocalProjectStore`
2. Load approval queue pending items using `ApprovalQueue`
3. Load memory tasks using `MemoryStore`
4. Combine into a daily briefing output
5. Persist audit record using `LocalProjectStore.appendWorkflowAudit()`
6. Keep bilingual EN/VI output

### What NOT to do:

- Do NOT call external APIs
- Do NOT modify `packages/core/`
- Do NOT modify `packages/desktop/` or `packages/mobile/`

## Key constraints

- `pnpm --filter @ai-pm/cli test` must pass
- `pnpm --filter @ai-pm/cli build` must pass
- `pnpm --filter @ai-pm/core test` must pass

## Context files to read

1. packages/cli/src/commands/weekly.ts
2. packages/cli/src/commands/daily.ts
3. packages/cli/src/index.ts
4. packages/cli/bin/ai-pm.js
5. packages/core/src/workflows/weeklyReport.ts
6. packages/core/src/runtime/localProjectStore.ts
7. packages/core/src/runtime/approvalQueue.ts
8. packages/core/src/runtime/memory.ts

## Verification

```bash
pnpm --filter @ai-pm/cli test
pnpm --filter @ai-pm/cli build
pnpm --filter @ai-pm/core test
pnpm build
node packages/cli/bin/ai-pm.js weekly --help
node packages/cli/bin/ai-pm.js daily --help
```
