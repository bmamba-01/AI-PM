import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { ApprovalQueue, type ApprovalItem } from '@ai-pm/core/runtime';

const tempRoots: string[] = [];

async function tempRoot(): Promise<string> {
  const root = await mkdtemp(path.join(tmpdir(), 'ai-pm-approval-cli-'));
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
    source_refs: [{ type: 'transcript', id: 'mtg-001', title: 'Standup' }] as ApprovalItem['source_refs'],
    priority: 'high' as const,
  };
}

describe('approval CLI — store layer', () => {
  it('empty store returns empty list', async () => {
    const root = await tempRoot();
    const queue = new ApprovalQueue(root);
    const items = await queue.listItems();
    expect(items).toEqual([]);
  });

  it('empty store returns empty counts', async () => {
    const root = await tempRoot();
    const queue = new ApprovalQueue(root);
    const counts = await queue.getCounts();
    expect(counts).toEqual({});
  });

  it('list with status filter works', async () => {
    const root = await tempRoot();
    const queue = new ApprovalQueue(root);
    await queue.createItem(baseInput());
    const item2 = await queue.createItem({ ...baseInput(), title: 'Second' });
    await queue.decide(item2.approval_id, { decided_by: 'pm', decision: 'approve' });

    const pending = await queue.listItems({ status: 'pending' });
    expect(pending).toHaveLength(1);
    expect(pending[0].status).toBe('pending');

    const approved = await queue.listItems({ status: 'approved' });
    expect(approved).toHaveLength(1);
    expect(approved[0].status).toBe('approved');
  });

  it('list with priority filter works', async () => {
    const root = await tempRoot();
    const queue = new ApprovalQueue(root);
    await queue.createItem({ ...baseInput(), priority: 'critical', title: 'Critical' });
    await queue.createItem({ ...baseInput(), priority: 'low', title: 'Low' });

    const critical = await queue.listItems({ priority: 'critical' });
    expect(critical).toHaveLength(1);
    expect(critical[0].priority).toBe('critical');

    const low = await queue.listItems({ priority: 'low' });
    expect(low).toHaveLength(1);
    expect(low[0].priority).toBe('low');
  });

  it('counts reflect actual statuses', async () => {
    const root = await tempRoot();
    const queue = new ApprovalQueue(root);
    await queue.createItem(baseInput());
    await queue.createItem({ ...baseInput(), title: 'Second' });
    const item3 = await queue.createItem({ ...baseInput(), title: 'Third' });
    await queue.decide(item3.approval_id, { decided_by: 'pm', decision: 'approve' });

    const counts = await queue.getCounts();
    expect(counts.pending).toBe(2);
    expect(counts.approved).toBe(1);
  });

  it('json output is valid JSON', async () => {
    const root = await tempRoot();
    const queue = new ApprovalQueue(root);
    await queue.createItem(baseInput());

    const items = await queue.listItems();
    const json = JSON.stringify({ items, total: items.length }, null, 2);
    const parsed = JSON.parse(json);
    expect(parsed.items).toHaveLength(1);
    expect(parsed.total).toBe(1);
  });

  it('approve item changes status', async () => {
    const root = await tempRoot();
    const queue = new ApprovalQueue(root);
    const item = await queue.createItem(baseInput());
    const decided = await queue.decide(item.approval_id, { decided_by: 'pm', decision: 'approve' });
    expect(decided.status).toBe('approved');
    expect(decided.decision).toBe('approve');
    expect(decided.decided_by).toBe('pm');
    expect(decided.decided_at).toBeDefined();
  });

  it('reject item with reason', async () => {
    const root = await tempRoot();
    const queue = new ApprovalQueue(root);
    const item = await queue.createItem(baseInput());
    const decided = await queue.decide(item.approval_id, {
      decided_by: 'pm',
      decision: 'reject',
      reason: 'Title is too vague, needs specifics',
    });
    expect(decided.status).toBe('rejected');
    expect(decided.rejection_reason).toBe('Title is too vague, needs specifics');
  });

  it('request revision with notes', async () => {
    const root = await tempRoot();
    const queue = new ApprovalQueue(root);
    const item = await queue.createItem(baseInput());
    const decided = await queue.decide(item.approval_id, {
      decided_by: 'pm',
      decision: 'revision_requested',
      notes: 'Add budget impact analysis',
    });
    expect(decided.status).toBe('revision_requested');
    expect(decided.revision_notes).toBe('Add budget impact analysis');
  });

  it('cannot decide on terminal status', async () => {
    const root = await tempRoot();
    const queue = new ApprovalQueue(root);
    const item = await queue.createItem(baseInput());
    await queue.decide(item.approval_id, { decided_by: 'pm', decision: 'approve' });
    await expect(
      queue.decide(item.approval_id, { decided_by: 'pm', decision: 'reject', reason: 'Changed my mind for testing' })
    ).rejects.toThrow('Cannot');
  });

  it('reject without reason fails', async () => {
    const root = await tempRoot();
    const queue = new ApprovalQueue(root);
    const item = await queue.createItem(baseInput());
    await expect(
      queue.decide(item.approval_id, { decided_by: 'pm', decision: 'reject' })
    ).rejects.toThrow('Rejection reason is required');
  });

  it('revision without notes fails', async () => {
    const root = await tempRoot();
    const queue = new ApprovalQueue(root);
    const item = await queue.createItem(baseInput());
    await expect(
      queue.decide(item.approval_id, { decided_by: 'pm', decision: 'revision_requested' })
    ).rejects.toThrow('Revision notes are required');
  });

  it('createItem rejects empty title', async () => {
    const root = await tempRoot();
    const queue = new ApprovalQueue(root);
    await expect(queue.createItem({ ...baseInput(), title: '' })).rejects.toThrow('Missing required fields');
  });

  it('createItem rejects confidence < 0', async () => {
    const root = await tempRoot();
    const queue = new ApprovalQueue(root);
    await expect(queue.createItem({ ...baseInput(), confidence: -1 })).rejects.toThrow('confidence must be between');
  });

  it('createItem rejects confidence > 100', async () => {
    const root = await tempRoot();
    const queue = new ApprovalQueue(root);
    await expect(queue.createItem({ ...baseInput(), confidence: 101 })).rejects.toThrow('confidence must be between');
  });

  it('getItem returns null for non-existent ID', async () => {
    const root = await tempRoot();
    const queue = new ApprovalQueue(root);
    const found = await queue.getItem('nonexistent-uuid');
    expect(found).toBeNull();
  });

  it('decide on non-existent item throws', async () => {
    const root = await tempRoot();
    const queue = new ApprovalQueue(root);
    await expect(
      queue.decide('nonexistent-uuid', { decided_by: 'pm', decision: 'approve' })
    ).rejects.toThrow('not found');
  });

  it('reject with short reason fails (< 10 chars)', async () => {
    const root = await tempRoot();
    const queue = new ApprovalQueue(root);
    const item = await queue.createItem(baseInput());
    await expect(
      queue.decide(item.approval_id, { decided_by: 'pm', decision: 'reject', reason: 'too short' })
    ).rejects.toThrow('Rejection reason is required');
  });

  it('revision with short notes fails (< 10 chars)', async () => {
    const root = await tempRoot();
    const queue = new ApprovalQueue(root);
    const item = await queue.createItem(baseInput());
    await expect(
      queue.decide(item.approval_id, { decided_by: 'pm', decision: 'revision_requested', notes: 'short' })
    ).rejects.toThrow('Revision notes are required');
  });

  it('resubmit after revision increments round', async () => {
    const root = await tempRoot();
    const queue = new ApprovalQueue(root);
    const item = await queue.createItem(baseInput());
    await queue.decide(item.approval_id, { decided_by: 'pm', decision: 'revision_requested', notes: 'Add context to the task' });
    const resubmitted = await queue.resubmit(item.approval_id, 'Updated with context');
    expect(resubmitted.status).toBe('pending');
    expect(resubmitted.revision_round).toBe(1);
  });

  it('max 3 revision rounds enforced', async () => {
    const root = await tempRoot();
    const queue = new ApprovalQueue(root);
    const item = await queue.createItem(baseInput());

    for (let i = 0; i < 3; i++) {
      await queue.decide(item.approval_id, { decided_by: 'pm', decision: 'revision_requested', notes: `Revision ${i + 1} needed` });
      await queue.resubmit(item.approval_id, `Updated v${i + 1}`);
    }

    await queue.decide(item.approval_id, { decided_by: 'pm', decision: 'revision_requested', notes: 'One more revision' });
    await expect(queue.resubmit(item.approval_id, 'Attempt v4')).rejects.toThrow('Revision limit');
  });

  it('resubmit on pending item fails', async () => {
    const root = await tempRoot();
    const queue = new ApprovalQueue(root);
    const item = await queue.createItem(baseInput());
    await expect(queue.resubmit(item.approval_id, 'Cannot resubmit pending')).rejects.toThrow('Can only resubmit');
  });

  it('resubmit on approved item fails', async () => {
    const root = await tempRoot();
    const queue = new ApprovalQueue(root);
    const item = await queue.createItem(baseInput());
    await queue.decide(item.approval_id, { decided_by: 'pm', decision: 'approve' });
    await expect(queue.resubmit(item.approval_id, 'Cannot resubmit approved')).rejects.toThrow('Can only resubmit');
  });

  it('different priorities are created with correct values', async () => {
    const root = await tempRoot();
    const queue = new ApprovalQueue(root);
    const critical = await queue.createItem({ ...baseInput(), priority: 'critical', title: 'Critical' });
    const high = await queue.createItem({ ...baseInput(), priority: 'high', title: 'High' });
    const medium = await queue.createItem({ ...baseInput(), priority: 'medium', title: 'Medium' });
    const low = await queue.createItem({ ...baseInput(), priority: 'low', title: 'Low' });

    expect(critical.priority).toBe('critical');
    expect(high.priority).toBe('high');
    expect(medium.priority).toBe('medium');
    expect(low.priority).toBe('low');
  });

  it('created_at and updated_at are ISO strings', async () => {
    const root = await tempRoot();
    const queue = new ApprovalQueue(root);
    const item = await queue.createItem(baseInput());

    expect(new Date(item.created_at).toISOString()).toBe(item.created_at);
    expect(new Date(item.updated_at).toISOString()).toBe(item.updated_at);
  });

  it('decide updates updated_at', async () => {
    const root = await tempRoot();
    const queue = new ApprovalQueue(root);
    const item = await queue.createItem(baseInput());

    await new Promise(r => setTimeout(r, 10));
    const decided = await queue.decide(item.approval_id, { decided_by: 'pm', decision: 'approve' });
    expect(decided.updated_at).not.toBe(item.updated_at);
  });

  it('pending items have no decision fields', async () => {
    const root = await tempRoot();
    const queue = new ApprovalQueue(root);
    const item = await queue.createItem(baseInput());

    expect(item.decided_at).toBeNull();
    expect(item.decided_by).toBeNull();
    expect(item.decision).toBeNull();
    expect(item.rejection_reason).toBeNull();
    expect(item.revision_notes).toBeNull();
  });

  it('multiple items with same priority sorted by created_at', async () => {
    const root = await tempRoot();
    const queue = new ApprovalQueue(root);
    const i1 = await queue.createItem({ ...baseInput(), priority: 'high', title: 'First' });
    await new Promise(r => setTimeout(r, 5));
    const i2 = await queue.createItem({ ...baseInput(), priority: 'high', title: 'Second' });
    await new Promise(r => setTimeout(r, 5));
    const i3 = await queue.createItem({ ...baseInput(), priority: 'high', title: 'Third' });

    const items = await queue.listItems({ priority: 'high' });
    expect(items).toHaveLength(3);
    expect(items[0].approval_id).toBe(i1.approval_id);
    expect(items[1].approval_id).toBe(i2.approval_id);
    expect(items[2].approval_id).toBe(i3.approval_id);
  });

  it('combined status and priority filter works', async () => {
    const root = await tempRoot();
    const queue = new ApprovalQueue(root);
    await queue.createItem({ ...baseInput(), priority: 'critical', title: 'Crit pending' });
    await queue.createItem({ ...baseInput(), priority: 'high', title: 'High pending' });
    const crit = await queue.createItem({ ...baseInput(), priority: 'critical', title: 'Crit to approve' });
    await queue.decide(crit.approval_id, { decided_by: 'pm', decision: 'approve' });

    const critPending = await queue.listItems({ status: 'pending', priority: 'critical' });
    expect(critPending).toHaveLength(1);
    expect(critPending[0].title).toBe('Crit pending');

    const highPending = await queue.listItems({ status: 'pending', priority: 'high' });
    expect(highPending).toHaveLength(1);
    expect(highPending[0].title).toBe('High pending');
  });
});
