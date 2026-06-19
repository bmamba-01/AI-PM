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
    source_refs: [{ type: 'transcript', id: 'mtg-001', title: 'Standup' }] as ApprovalItem['source_refs'],
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
    await expect(queue.createItem({ ...baseInput(), title: '' })).rejects.toThrow('Missing required fields');
  });

  it('rejects confidence > 100', async () => {
    const root = await tempRoot();
    const queue = new ApprovalQueue(root);
    await expect(queue.createItem({ ...baseInput(), confidence: 101 })).rejects.toThrow('confidence must be between 0 and 100');
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

  it('approves pending item', async () => {
    const root = await tempRoot();
    const queue = new ApprovalQueue(root);
    const item = await queue.createItem(baseInput());
    const decided = await queue.decide(item.approval_id, { decided_by: 'pm-user-01', decision: 'approve' });
    expect(decided.status).toBe('approved');
    expect(decided.decision).toBe('approve');
    expect(decided.decided_by).toBe('pm-user-01');
    expect(decided.decided_at).toBeDefined();
  });

  it('rejects pending item with reason', async () => {
    const root = await tempRoot();
    const queue = new ApprovalQueue(root);
    const item = await queue.createItem(baseInput());
    const decided = await queue.decide(item.approval_id, { decided_by: 'pm-user-01', decision: 'reject', reason: 'Title is too vague, needs specifics' });
    expect(decided.status).toBe('rejected');
    expect(decided.rejection_reason).toBe('Title is too vague, needs specifics');
  });

  it('reject without reason fails', async () => {
    const root = await tempRoot();
    const queue = new ApprovalQueue(root);
    const item = await queue.createItem(baseInput());
    await expect(queue.decide(item.approval_id, { decided_by: 'pm-user-01', decision: 'reject' })).rejects.toThrow('Rejection reason is required');
  });

  it('requests revision with notes', async () => {
    const root = await tempRoot();
    const queue = new ApprovalQueue(root);
    const item = await queue.createItem(baseInput());
    const decided = await queue.decide(item.approval_id, { decided_by: 'pm-user-01', decision: 'revision_requested', notes: 'Add budget impact analysis' });
    expect(decided.status).toBe('revision_requested');
    expect(decided.revision_notes).toBe('Add budget impact analysis');
  });

  it('revision without notes fails', async () => {
    const root = await tempRoot();
    const queue = new ApprovalQueue(root);
    const item = await queue.createItem(baseInput());
    await expect(queue.decide(item.approval_id, { decided_by: 'pm-user-01', decision: 'revision_requested' })).rejects.toThrow('Revision notes are required');
  });

  it('cannot reject approved item', async () => {
    const root = await tempRoot();
    const queue = new ApprovalQueue(root);
    const item = await queue.createItem(baseInput());
    await queue.decide(item.approval_id, { decided_by: 'pm', decision: 'approve' });
    await expect(queue.decide(item.approval_id, { decided_by: 'pm', decision: 'reject', reason: 'Changed my mind for testing' })).rejects.toThrow('Cannot');
  });

  it('resubmit after revision increments round', async () => {
    const root = await tempRoot();
    const queue = new ApprovalQueue(root);
    const item = await queue.createItem(baseInput());
    await queue.decide(item.approval_id, { decided_by: 'pm', decision: 'revision_requested', notes: 'Fix title please' });
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
      await queue.decide(item.approval_id, { decided_by: 'pm', decision: 'revision_requested', notes: `Revision ${i + 1} needed` });
      await queue.resubmit(item.approval_id, `Updated v${i + 1}`);
    }

    await queue.decide(item.approval_id, { decided_by: 'pm', decision: 'revision_requested', notes: 'One more revision' });
    await expect(queue.resubmit(item.approval_id, 'Updated v4')).rejects.toThrow('Revision limit');
  });

  it('resubmit on non-revision item fails', async () => {
    const root = await tempRoot();
    const queue = new ApprovalQueue(root);
    const item = await queue.createItem(baseInput());
    await expect(queue.resubmit(item.approval_id, 'Updated')).rejects.toThrow('Can only resubmit');
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
