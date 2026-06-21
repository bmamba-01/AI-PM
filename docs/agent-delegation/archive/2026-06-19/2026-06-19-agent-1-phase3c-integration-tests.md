# Coding Agent 1 — Phase 3c: Integration Test + Smoke Verification

> **Type:** 🖥️ CODING TASK  
> **Priority:** High — final quality gate for Phase 3  
> **Depends on:** Phase 3a + 3b all completed  
> **Blocks:** Phase 4 can start in parallel

## Task

Add CLI smoke tests and verify all runtime boundaries are clean. Run the full verification gate from the master plan.

## Files to create/modify

- Create: `packages/core/src/runtime/smoke.test.ts`
- Modify: `packages/cli/src/commands/approval.ts` (if smoke issues found)

## What to do

### Step 1: Run full verification gate

```bash
pnpm --filter @ai-pm/core test
pnpm --filter @ai-pm/mcp test
pnpm --filter @ai-pm/cli build
pnpm --filter @ai-pm/desktop build
pnpm --filter @ai-pm/mobile build
pnpm build
node packages/cli/bin/ai-pm.js --help
node packages/cli/bin/ai-pm.js approval --help
node packages/cli/bin/ai-pm.js approval count --json
node packages/cli/bin/ai-pm.js memory --help
node packages/cli/bin/ai-pm.js memory summary --json
node schemas/validate-fixtures.mjs
```

Document pass/fail for each command.

### Step 2: Check runtime boundaries

```bash
# Desktop renderer must NOT import Node-backed runtime
rg -n "ApprovalQueue|node:fs|localStorage" packages/desktop/src/state/ packages/desktop/src/components/tabs/ApprovalsTab.tsx

# Mobile store must have explicit mock fallback
rg -n "mock fallback|local server|dataSource" packages/mobile/src/state/approval-store.ts

# Memory CLI must exist and work
node packages/cli/bin/ai-pm.js memory summary --json
```

### Step 3: Create smoke test

Create `packages/core/src/runtime/smoke.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { ApprovalQueue } from './approvalQueue.js';
import { MemoryStore } from './memory.js';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

describe('runtime smoke', () => {
  it('ApprovalQueue creates and lists items', async () => {
    const root = await mkdtemp(path.join(tmpdir(), 'smoke-'));
    try {
      const queue = new ApprovalQueue(root);
      const item = await queue.createItem({
        project_id: 'smoke-test',
        action_type: 'test',
        target_system: 'test',
        target_id: 'T-001',
        workflow_id: 'test',
        run_id: 'run-001',
        requested_by_agent: 'smoke-agent',
        requested_by_role: 'developer',
        title: 'Smoke test item',
        description: 'Automated smoke test',
        summary_diff: 'Test creation',
        confidence: 80,
        source_refs: [],
        priority: 'medium',
      });
      expect(item.approval_id).toBeDefined();
      const list = await queue.listItems();
      expect(list.length).toBe(1);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it('MemoryStore creates and lists tasks', async () => {
    const root = await mkdtemp(path.join(tmpdir(), 'smoke-mem-'));
    try {
      const store = new MemoryStore(root);
      const task = await store.createTask({
        project_id: 'smoke-test',
        name: 'Smoke memory task',
        description: 'Test',
        status: 'pending',
        assigned_to: 'smoke',
        dependencies: [],
        artifacts: [],
        tags: [],
      });
      expect(task.task_id).toBeDefined();
      const tasks = await store.listTasks();
      expect(tasks.length).toBe(1);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});
```

### Step 4: Fix any issues found

If any verification step fails:
- Fix the narrow issue (don't rewrite)
- Re-run verification
- Document what was broken and what was fixed

## Key constraints

- Only modify implementation if a failing test/smoke proves a defect
- Keep fixes minimal and scoped
- `pnpm build` must pass at end
- Do NOT modify packages/mcp/

## Verification

```bash
pnpm --filter @ai-pm/core test
pnpm build
node packages/cli/bin/ai-pm.js approval count --json
node packages/cli/bin/ai-pm.js memory summary --json
```
