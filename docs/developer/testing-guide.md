# Testing Guide

## Quick Start

```bash
# Run all tests
pnpm test

# Run tests for a specific package
pnpm --filter @ai-pm/core test
pnpm --filter @ai-pm/mcp test

# Run a specific test file
pnpm --filter @ai-pm/core test -- src/runtime/memory.test.ts

# Run tests in watch mode
pnpm --filter @ai-pm/core test:watch
```

## Test Structure

Tests use [Vitest](https://vitest.dev/) with the project's TypeScript configuration.

```
packages/core/src/runtime/
├── approvalQueue.test.ts           # Unit tests for ApprovalQueue
├── approvalQueue.integration.test.ts # Cross-module integration tests
├── memory.test.ts                  # Unit tests for MemoryStore
├── memory.edge.test.ts             # Edge case tests for MemoryStore
├── localProjectStore.test.ts       # Unit tests for LocalProjectStore
├── projectScanner.test.ts          # Unit tests for scanProject()
└── smoke.test.ts                   # Smoke tests for core exports
```

## Writing Tests

### Pattern: Temp directories

All file-backed stores use temp directories to avoid polluting the project:

```typescript
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

const tempRoots: string[] = [];

async function tempRoot(): Promise<string> {
  const root = await mkdtemp(path.join(tmpdir(), 'ai-pm-test-'));
  tempRoots.push(root);
  return root;
}

afterEach(async () => {
  await Promise.all(
    tempRoots.splice(0).map(root => rm(root, { recursive: true, force: true }))
  );
});
```

### Pattern: Testing a store

```typescript
import { ApprovalQueue } from './approvalQueue.js';

describe('ApprovalQueue', () => {
  it('creates item with all required fields', async () => {
    const root = await tempRoot();
    const queue = new ApprovalQueue(root);
    const item = await queue.createItem(baseInput());

    expect(item.approval_id).toBeDefined();
    expect(item.status).toBe('pending');
    expect(item.project_id).toBe('proj-001');
  });

  it('rejects item missing required field', async () => {
    const root = await tempRoot();
    const queue = new ApprovalQueue(root);
    await expect(
      queue.createItem({ ...baseInput(), title: '' })
    ).rejects.toThrow('Missing required fields');
  });
});
```

### Pattern: State transition tests

```typescript
it('approves pending item', async () => {
  const root = await tempRoot();
  const queue = new ApprovalQueue(root);
  const item = await queue.createItem(baseInput());
  const decided = await queue.decide(item.approval_id, {
    decided_by: 'pm-user-01',
    decision: 'approve',
  });

  expect(decided.status).toBe('approved');
  expect(decided.decided_by).toBe('pm-user-01');
  expect(decided.decided_at).toBeDefined();
});

it('cannot reject approved item', async () => {
  const root = await tempRoot();
  const queue = new ApprovalQueue(root);
  const item = await queue.createItem(baseInput());
  await queue.decide(item.approval_id, { decided_by: 'pm', decision: 'approve' });
  await expect(
    queue.decide(item.approval_id, {
      decided_by: 'pm', decision: 'reject', reason: 'Changed my mind for testing',
    })
  ).rejects.toThrow('Cannot');
});
```

## Test Categories

### Unit Tests
Individual function/class tests. Fast, isolated, no external dependencies.

### Integration Tests (`*.integration.test.ts`)
Cross-module tests that exercise multiple components together. Example: testing that approval creation affects audit records.

### Smoke Tests (`smoke.test.ts`)
Verify that all expected exports are available from the package. Run on every build.

## CI Verification

Before merging, all of these must pass:

```bash
pnpm --filter @ai-pm/core test       # Core runtime tests
pnpm --filter @ai-pm/mcp test        # MCP tests
pnpm --filter @ai-pm/cli build       # CLI builds
pnpm --filter @ai-pm/desktop build   # Desktop builds
pnpm --filter @ai-pm/mobile build    # Mobile builds
pnpm build                           # Full monorepo build
```

## Coverage

Vitest collects coverage when configured. Check `vitest.config.ts` in each package for coverage settings.

## Common Patterns

- **Missing file returns empty, not error**: All stores handle `ENOENT` gracefully
- **Validation throws**: Required field and range validation throw `Error` with descriptive messages
- **JSONL for append-only data**: Audit logs use JSONL format for efficient append and streaming reads
- **Priority ordering**: Items sorted critical > high > medium > low, then by created_at
