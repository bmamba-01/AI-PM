# Coding Agent 3 — Task 4: Approval Queue Runtime Foundation

> **Date:** 2026-06-19  
> **Requested by:** Orchestrator  
> **Priority:** Critical — core runtime for approval gate  
> **Depends on:** Agent 4 schemas (completed), Agent 5 test plan (completed), Agent 1 MCP/CLI repair (completed)  
> **Blocks:** Task 5 (Schema Validation), approval CLI implementation  
> **Type:** 🖥️ CODING TASK — requires `pnpm install`, `pnpm build`, `pnpm test`

---

## Task Contract

```yaml
task_id: agent-3-approval-queue
project_id: ai-pm-toolkit
requested_by: orchestrator
assigned_agent: developer
objective: |
  Implement the approval queue runtime foundation in packages/core.
  Create a file-backed approval queue with create, list, approve, reject,
  and request-revision operations. Follow the data model from the runtime
  contract and the test plan from Agent 5.
context:
  methodology: hybrid
  project_type: product_delivery
  source_refs:
    - type: file
      id: docs/architecture/approval-queue-runtime-contract.md
      description: Full data model (ApprovalItem, state machine, API)
    - type: file
      id: docs/product/approval-queue-test-plan.md
      description: 51 test scenarios — focus on must-have (33 scenarios)
    - type: file
      id: schemas/approval/approval-item.schema.json
      description: Schema for field validation reference
    - type: file
      id: packages/core/src/runtime/localProjectStore.ts
      description: Existing runtime pattern (file-backed store)
    - type: file
      id: packages/core/src/runtime/localProjectStore.test.ts
      description: Existing test pattern
    - type: file
      id: packages/core/src/runtime/index.ts
      description: Runtime barrel export — add approvalQueue export
    - type: file
      id: docs/superpowers/plans/2026-06-19-next-runtime-functions.md
      description: Task 4 specification
constraints:
  - Do NOT modify packages/mcp/ or packages/desktop/ or packages/mobile/
  - File-backed store only (.ai-pm/approvals.json) — no HTTP server yet
  - No external mutations — approval queue is local-first
  - Tests must use temp directories (follow existing test pattern)
  - Build must pass: pnpm --filter @ai-pm/core build
  - Tests must pass: pnpm --filter @ai-pm/core test -- src/runtime/approvalQueue.test.ts
  - Focus on must-have scenarios from test plan (33 scenarios)
required_outputs:
  - name: approval-queue-runtime
    format: typescript
  - name: tests
    format: typescript
quality_gate:
  checklist_id: approval-queue-gate
  approval_required: false
deadline: critical
```

---

## Prompt

```text
You are a Coding Agent working on the AI-PM Toolkit repository.
Your task is to implement the approval queue runtime foundation.

## Step 0: Setup

```bash
cd /path/to/AI-PM
pnpm install
```

Read these files first:

1. docs/architecture/approval-queue-runtime-contract.md (§3 Data Model, §3.2 State Machine)
2. docs/product/approval-queue-test-plan.md (§2 Test Scenarios — focus on AQ-001 through AQ-027)
3. schemas/approval/approval-item.schema.json
4. packages/core/src/runtime/localProjectStore.ts
5. packages/core/src/runtime/localProjectStore.test.ts
6. packages/core/src/runtime/index.ts

## Step 1: Create approvalQueue.ts

Create `packages/core/src/runtime/approvalQueue.ts`.

### Types (based on runtime contract §3.1):

```typescript
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';

export type ApprovalStatus =
  | 'draft' | 'pending' | 'revision_requested' | 'approved'
  | 'rejected' | 'cancelled' | 'expired' | 'executing'
  | 'executed' | 'execution_failed';

export type ApprovalDecision = 'approve' | 'reject' | 'revision_requested' | 'cancel';

export interface ApprovalItem {
  approval_id: string;
  project_id: string;
  action_type: string;
  target_system: string;
  target_id: string;
  workflow_id: string;
  run_id: string;
  requested_by_agent: string;
  requested_by_role: string;
  title: string;
  description: string;
  summary_diff: string;
  confidence: number;
  source_refs: Array<{ type: string; id: string; title?: string; accessed_at?: string }>;
  priority: 'critical' | 'high' | 'medium' | 'low';
  status: ApprovalStatus;
  revision_round: number;
  deadline: string | null;
  ttl_seconds: number | null;
  assigned_approvers: string[];
  created_at: string;
  updated_at: string;
  decided_at: string | null;
  decided_by: string | null;
  decision: ApprovalDecision | null;
  rejection_reason: string | null;
  revision_notes: string | null;
  delegated_to: string | null;
  execution_status: 'pending' | 'executing' | 'executed' | 'execution_failed';
  execution_error: string | null;
  execution_target_response: string | null;
  retry_count: number;
  policy_rule_id: string | null;
}

export interface ApprovalAuditEntry {
  approval_id: string;
  event_type: string;
  actor: string;
  actor_type: 'human' | 'agent' | 'system';
  timestamp: string;
  details: Record<string, unknown>;
  previous_status: ApprovalStatus | null;
  new_status: ApprovalStatus | null;
}

export interface DecidePayload {
  decided_by: string;
  decision: ApprovalDecision;
  reason?: string;
  notes?: string;
}
```

### Valid transitions (based on runtime contract §3.2):

```typescript
const VALID_TRANSITIONS: Record<ApprovalStatus, ApprovalStatus[]> = {
  draft: ['pending', 'cancelled'],
  pending: ['approved', 'rejected', 'revision_requested', 'expired', 'cancelled'],
  revision_requested: ['pending', 'cancelled'],
  approved: ['executing'],
  rejected: [],
  cancelled: [],
  expired: [],
  executing: ['executed', 'execution_failed'],
  executed: [],
  execution_failed: ['pending', 'cancelled'],
};
```

### Store class:

```typescript
export class ApprovalQueue {
  private filePath: string;

  constructor(projectRoot: string) {
    this.filePath = path.join(projectRoot, '.ai-pm', 'approvals.json');
  }

  private async ensureDir(): Promise<void> {
    await mkdir(path.dirname(this.filePath), { recursive: true });
  }

  private async readAll(): Promise<ApprovalItem[]> {
    try {
      const raw = await readFile(this.filePath, 'utf-8');
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch (error: any) {
      if (error.code === 'ENOENT') return [];
      throw error;
    }
  }

  private async writeAll(items: ApprovalItem[]): Promise<void> {
    await this.ensureDir();
    await writeFile(this.filePath, JSON.stringify(items, null, 2), 'utf-8');
  }

  async createItem(input: {
    project_id: string;
    action_type: string;
    target_system: string;
    target_id: string;
    workflow_id: string;
    run_id: string;
    requested_by_agent: string;
    requested_by_role: string;
    title: string;
    description: string;
    summary_diff: string;
    confidence: number;
    source_refs: ApprovalItem['source_refs'];
    priority: ApprovalItem['priority'];
    deadline?: string | null;
    ttl_seconds?: number | null;
    assigned_approvers?: string[];
  }): Promise<ApprovalItem> {
    const now = new Date().toISOString();
    const item: ApprovalItem = {
      approval_id: randomUUID(),
      ...input,
      status: 'pending',
      revision_round: 0,
      deadline: input.deadline ?? null,
      ttl_seconds: input.ttl_seconds ?? null,
      assigned_approvers: input.assigned_approvers ?? [],
      created_at: now,
      updated_at: now,
      decided_at: null,
      decided_by: null,
      decision: null,
      rejection_reason: null,
      revision_notes: null,
      delegated_to: null,
      execution_status: 'pending',
      execution_error: null,
      execution_target_response: null,
      retry_count: 0,
      policy_rule_id: null,
    };

    // Validate required fields
    if (!item.title || !item.project_id || !item.action_type || !item.target_system || !item.target_id) {
      throw new Error('Missing required fields: title, project_id, action_type, target_system, target_id');
    }
    if (item.confidence < 0 || item.confidence > 100) {
      throw new Error('confidence must be between 0 and 100');
    }

    const items = await this.readAll();
    items.push(item);
    await this.writeAll(items);
    return item;
  }

  async getItem(id: string): Promise<ApprovalItem | null> {
    const items = await this.readAll();
    return items.find(i => i.approval_id === id) ?? null;
  }

  async listItems(filter?: { status?: string; priority?: string }): Promise<ApprovalItem[]> {
    const items = await this.readAll();
    let result = items;
    if (filter?.status) result = result.filter(i => i.status === filter.status);
    if (filter?.priority) result = result.filter(i => i.priority === filter.priority);
    // Sort: priority (critical > high > medium > low), then oldest first
    const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    result.sort((a, b) => {
      const pa = priorityOrder[a.priority as keyof typeof priorityOrder] ?? 4;
      const pb = priorityOrder[b.priority as keyof typeof priorityOrder] ?? 4;
      if (pa !== pb) return pa - pb;
      return a.created_at.localeCompare(b.created_at);
    });
    return result;
  }

  async decide(id: string, payload: DecidePayload): Promise<ApprovalItem> {
    const items = await this.readAll();
    const idx = items.findIndex(i => i.approval_id === id);
    if (idx === -1) throw new Error(`Approval item ${id} not found`);

    const item = items[idx];
    const allowed = VALID_TRANSITIONS[item.status] ?? [];
    const nextStatus = payload.decision === 'approve' ? 'approved'
      : payload.decision === 'reject' ? 'rejected'
      : payload.decision === 'revision_requested' ? 'revision_requested'
      : 'cancelled';

    if (!allowed.includes(nextStatus)) {
      throw new Error(`Cannot ${payload.decision} item in '${item.status}' status`);
    }

    if (payload.decision === 'reject' && (!payload.reason || payload.reason.length < 10)) {
      throw new Error('Rejection reason is required (min 10 characters)');
    }
    if (payload.decision === 'revision_requested' && (!payload.notes || payload.notes.length < 10)) {
      throw new Error('Revision notes are required (min 10 characters)');
    }

    const now = new Date().toISOString();
    item.status = nextStatus;
    item.decision = payload.decision;
    item.decided_by = payload.decided_by;
    item.decided_at = now;
    item.updated_at = now;
    item.rejection_reason = payload.reason ?? null;
    item.revision_notes = payload.notes ?? null;

    items[idx] = item;
    await this.writeAll(items);
    return item;
  }

  async resubmit(id: string, summary_diff: string): Promise<ApprovalItem> {
    const items = await this.readAll();
    const idx = items.findIndex(i => i.approval_id === id);
    if (idx === -1) throw new Error(`Approval item ${id} not found`);

    const item = items[idx];
    if (item.status !== 'revision_requested') {
      throw new Error(`Can only resubmit items in 'revision_requested' status, current: '${item.status}'`);
    }
    if (item.revision_round >= 3) {
      throw new Error(`Revision limit (3 rounds) reached. Item escalated to PM Commander.`);
    }

    const now = new Date().toISOString();
    item.status = 'pending';
    item.revision_round += 1;
    item.summary_diff = summary_diff;
    item.updated_at = now;

    items[idx] = item;
    await this.writeAll(items);
    return item;
  }

  async getCounts(): Promise<Record<string, number>> {
    const items = await this.readAll();
    const counts: Record<string, number> = {};
    for (const item of items) {
      counts[item.status] = (counts[item.status] || 0) + 1;
    }
    return counts;
  }
}
```

## Step 2: Export from runtime index

Edit `packages/core/src/runtime/index.ts`:

```typescript
export * from './localProjectStore.js';
export * from './approvalQueue.js';
```

## Step 3: Create tests

Create `packages/core/src/runtime/approvalQueue.test.ts`:

Focus on the 33 must-have scenarios from the test plan (AQ-001 through AQ-027, AQ-028-AQ-040 for core logic):

```typescript
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { ApprovalQueue, type ApprovalItem } from './approvalQueue.js';

const tempRoots: string[] = [];

async function tempRoot(): Promise<string> {
  const root = await mkdtemp(path.join(tmpdir(), 'ai-pm-approval-'));
  tempRoots.push(root);
  return root;
}

afterEach(async () => {
  await Promise.all(tempRoots.splice(0).map(root => rm(root, { recursive: true, force: true })));
});

function baseInput() {
  return {
    project_id: 'proj-001',
    action_type: 'jira_issue_create',
    target_system: 'jira',
    target_id: 'PROJ-123',
    workflow_id: 'daily-briefing',
    run_id: 'run-001',
    requested_by_agent: 'test-agent',
    requested_by_role: 'pm_commander',
    title: 'Create follow-up task',
    description: 'After meeting, create a follow-up task.',
    summary_diff: 'Will create Jira issue PROJ-123.',
    confidence: 85,
    source_refs: [{ type: 'transcript', id: 'mtg-001', title: 'Standup' }],
    priority: 'high' as const,
  };
}

describe('ApprovalQueue', () => {
  it('creates item with all required fields', async () => {
    const root = await tempRoot();
    const queue = new ApprovalQueue(root);
    const item = await queue.createItem(baseInput());

    expect(item.approval_id).toBeDefined();
    expect(item.status).toBe('pending');
    expect(item.revision_round).toBe(0);
    expect(item.project_id).toBe('proj-001');
    expect(item.title).toBe('Create follow-up task');
    expect(item.confidence).toBe(85);
    expect(item.created_at).toBeDefined();
    expect(item.updated_at).toBeDefined();
  });

  it('rejects item missing required field', async () => {
    const root = await tempRoot();
    const queue = new ApprovalQueue(root);
    await expect(queue.createItem({ ...baseInput(), title: '' }))
      .rejects.toThrow('Missing required fields');
  });

  it('rejects confidence > 100', async () => {
    const root = await tempRoot();
    const queue = new ApprovalQueue(root);
    await expect(queue.createItem({ ...baseInput(), confidence: 101 }))
      .rejects.toThrow('confidence must be between 0 and 100');
  });

  it('reads item by ID', async () => {
    const root = await tempRoot();
    const queue = new ApprovalQueue(root);
    const created = await queue.createItem(baseInput());
    const found = await queue.getItem(created.approval_id);
    expect(found).not.toBeNull();
    expect(found!.approval_id).toBe(created.approval_id);
  });

  it('returns null for non-existent item', async () => {
    const root = await tempRoot();
    const queue = new ApprovalQueue(root);
    const found = await queue.getItem('non-existent');
    expect(found).toBeNull();
  });

  it('returns empty list when no items', async () => {
    const root = await tempRoot();
    const queue = new ApprovalQueue(root);
    const items = await queue.listItems();
    expect(items).toEqual([]);
  });

  it('returns empty list when file does not exist', async () => {
    const root = await tempRoot();
    const queue = new ApprovalQueue(root);
    const items = await queue.listItems();
    expect(items).toEqual([]);
  });

  // State machine tests
  it('approves pending item', async () => {
    const root = await tempRoot();
    const queue = new ApprovalQueue(root);
    const item = await queue.createItem(baseInput());
    const decided = await queue.decide(item.approval_id, {
      decided_by: 'pm-user-01',
      decision: 'approve',
    });
    expect(decided.status).toBe('approved');
    expect(decided.decision).toBe('approve');
    expect(decided.decided_by).toBe('pm-user-01');
    expect(decided.decided_at).toBeDefined();
  });

  it('rejects pending item with reason', async () => {
    const root = await tempRoot();
    const queue = new ApprovalQueue(root);
    const item = await queue.createItem(baseInput());
    const decided = await queue.decide(item.approval_id, {
      decided_by: 'pm-user-01',
      decision: 'reject',
      reason: 'Title is too vague, needs specifics',
    });
    expect(decided.status).toBe('rejected');
    expect(decided.rejection_reason).toBe('Title is too vague, needs specifics');
  });

  it('reject without reason fails', async () => {
    const root = await tempRoot();
    const queue = new ApprovalQueue(root);
    const item = await queue.createItem(baseInput());
    await expect(queue.decide(item.approval_id, {
      decided_by: 'pm-user-01',
      decision: 'reject',
    })).rejects.toThrow('Rejection reason is required');
  });

  it('requests revision with notes', async () => {
    const root = await tempRoot();
    const queue = new ApprovalQueue(root);
    const item = await queue.createItem(baseInput());
    const decided = await queue.decide(item.approval_id, {
      decided_by: 'pm-user-01',
      decision: 'revision_requested',
      notes: 'Add budget impact analysis',
    });
    expect(decided.status).toBe('revision_requested');
    expect(decided.revision_notes).toBe('Add budget impact analysis');
  });

  it('revision without notes fails', async () => {
    const root = await tempRoot();
    const queue = new ApprovalQueue(root);
    const item = await queue.createItem(baseInput());
    await expect(queue.decide(item.approval_id, {
      decided_by: 'pm-user-01',
      decision: 'revision_requested',
    })).rejects.toThrow('Revision notes are required');
  });

  it('cannot reject approved item', async () => {
    const root = await tempRoot();
    const queue = new ApprovalQueue(root);
    const item = await queue.createItem(baseInput());
    await queue.decide(item.approval_id, { decided_by: 'pm', decision: 'approve' });
    await expect(queue.decide(item.approval_id, {
      decided_by: 'pm',
      decision: 'reject',
      reason: 'Changed my mind for testing',
    })).rejects.toThrow('Cannot reject item in');
  });

  it('resubmit after revision increments round', async () => {
    const root = await tempRoot();
    const queue = new ApprovalQueue(root);
    const item = await queue.createItem(baseInput());
    await queue.decide(item.approval_id, {
      decided_by: 'pm', decision: 'revision_requested', notes: 'Fix title please',
    });
    const resubmitted = await queue.resubmit(item.approval_id, 'Updated title');
    expect(resubmitted.status).toBe('pending');
    expect(resubmitted.revision_round).toBe(1);
    expect(resubmitted.summary_diff).toBe('Updated title');
  });

  it('max 3 revision rounds', async () => {
    const root = await tempRoot();
    const queue = new ApprovalQueue(root);
    const item = await queue.createItem(baseInput());

    for (let i = 0; i < 3; i++) {
      await queue.decide(item.approval_id, {
        decided_by: 'pm', decision: 'revision_requested', notes: `Revision ${i + 1} needed`,
      });
      await queue.resubmit(item.approval_id, `Updated v${i + 1}`);
    }

    // 4th revision should fail
    await queue.decide(item.approval_id, {
      decided_by: 'pm', decision: 'revision_requested', notes: 'One more revision',
    });
    await expect(queue.resubmit(item.approval_id, 'Updated v4'))
      .rejects.toThrow('Revision limit');
  });

  it('resubmit on non-revision item fails', async () => {
    const root = await tempRoot();
    const queue = new ApprovalQueue(root);
    const item = await queue.createItem(baseInput());
    await expect(queue.resubmit(item.approval_id, 'Updated'))
      .rejects.toThrow('Can only resubmit');
  });

  it('returns counts by status', async () => {
    const root = await tempRoot();
    const queue = new ApprovalQueue(root);
    await queue.createItem(baseInput());
    await queue.createItem({ ...baseInput(), title: 'Second item' });
    const item = await queue.createItem({ ...baseInput(), title: 'Third item' });
    await queue.decide(item.approval_id, { decided_by: 'pm', decision: 'approve' });

    const counts = await queue.getCounts();
    expect(counts.pending).toBe(2);
    expect(counts.approved).toBe(1);
  });

  it('lists items sorted by priority then created_at', async () => {
    const root = await tempRoot();
    const queue = new ApprovalQueue(root);
    await queue.createItem({ ...baseInput(), priority: 'low', title: 'Low first' });
    await queue.createItem({ ...baseInput(), priority: 'critical', title: 'Critical' });
    await queue.createItem({ ...baseInput(), priority: 'medium', title: 'Medium' });

    const items = await queue.listItems();
    expect(items[0].priority).toBe('critical');
    expect(items[1].priority).toBe('medium');
    expect(items[2].priority).toBe('low');
  });

  it('filters by status', async () => {
    const root = await tempRoot();
    const queue = new ApprovalQueue(root);
    const item1 = await queue.createItem(baseInput());
    await queue.createItem({ ...baseInput(), title: 'Item 2' });
    await queue.decide(item1.approval_id, { decided_by: 'pm', decision: 'approve' });

    const pending = await queue.listItems({ status: 'pending' });
    expect(pending).toHaveLength(1);
    const approved = await queue.listItems({ status: 'approved' });
    expect(approved).toHaveLength(1);
  });
});
```

## Step 4: Build and verify

```bash
pnpm --filter @ai-pm/core test -- src/runtime/approvalQueue.test.ts
pnpm --filter @ai-pm/core build
pnpm --filter @ai-pm/core test  # all core tests
pnpm build  # full build
```

## Step 5: Report

```yaml
task_id: agent-3-approval-queue
status: completed | blocked | failed
summary: one-line description
findings:
  - severity: info
    title: what you implemented
    detail: files created/modified, tests added, verification results
    source_ref: packages/core/src/runtime/
recommendations:
  - action: main thread can proceed to Task 5 (Schema Validation)
    owner: main_thread
    priority: medium
artifacts:
  - path_or_url: packages/core/src/runtime/approvalQueue.ts
    type: file
  - path_or_url: packages/core/src/runtime/approvalQueue.test.ts
    type: file
confidence: 0-100
open_questions: []
audit:
  sources_used:
    - list of files read
  assumptions:
    - file-backed store only, no HTTP server
    - approval_id is UUID v4
    - file path: .ai-pm/approvals.json
  approvals_required: []
  next_agent_suggested: >
    Task 5 (Workflow Schema Validation) can begin next.
```

## Critical reminders

- 🖥️ CODING task — run `pnpm install`, `pnpm build`, `pnpm test`
- Do NOT modify packages/mcp/, packages/desktop/, or packages/mobile/
- File-backed store: .ai-pm/approvals.json
- No external mutations
- Focus on the 33 must-have test scenarios from the test plan
- Every state transition must be validated
- Missing approval file must return empty list, not throw
- After build, run all core tests to ensure no regression
```
