import { mkdtemp, rm, writeFile, mkdir, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { ApprovalQueue, type ApprovalItem } from './approvalQueue.js';

const tempRoots: string[] = [];

async function tempRoot(): Promise<string> {
  const root = await mkdtemp(path.join(tmpdir(), 'ai-pm-approval-integration-'));
  tempRoots.push(root);
  return root;
}

afterEach(async () => {
  await Promise.all(tempRoots.splice(0).map(root => rm(root, { recursive: true, force: true })));
});

function baseInput(overrides?: Partial<Parameters<ApprovalQueue['createItem']>[0]>) {
  return {
    project_id: 'proj-integration',
    action_type: 'jira_issue_create',
    target_system: 'jira',
    target_id: 'PROJ-INT-001',
    workflow_id: 'daily-briefing',
    run_id: 'run-int-001',
    requested_by_agent: 'test-agent',
    requested_by_role: 'pm_commander',
    title: 'Create follow-up task',
    description: 'After meeting, create a follow-up task.',
    summary_diff: 'Will create Jira issue PROJ-INT-001.',
    confidence: 85,
    source_refs: [{ type: 'transcript', id: 'mtg-001', title: 'Standup' }] as ApprovalItem['source_refs'],
    priority: 'high' as const,
    ...overrides,
  };
}

describe('ApprovalQueue — integration', () => {
  it('full lifecycle: create → filter → decide → resubmit → verify counts and revision rounds', async () => {
    const root = await tempRoot();
    const queue = new ApprovalQueue(root);

    // 1. Create 3 items with different priorities and workflows
    const itemCritical = await queue.createItem({
      ...baseInput(),
      priority: 'critical',
      title: 'Fix production outage',
      workflow_id: 'incident-response',
      action_type: 'jira_issue_create',
      target_system: 'jira',
      target_id: 'INC-001',
    });

    const itemHigh = await queue.createItem({
      ...baseInput(),
      priority: 'high',
      title: 'Publish weekly report',
      workflow_id: 'reporting',
      action_type: 'report_publish',
      target_system: 'confluence',
      target_id: 'RPT-001',
    });

    const itemLow = await queue.createItem({
      ...baseInput(),
      priority: 'low',
      title: 'Update sprint metrics',
      workflow_id: 'daily-briefing',
      action_type: 'jira_issue_update',
      target_system: 'jira',
      target_id: 'MET-001',
    });

    // 2. Verify all 3 created as pending
    let all = await queue.listItems();
    expect(all).toHaveLength(3);
    all.forEach(i => expect(i.status).toBe('pending'));

    // 3. Verify sort order: critical first, then high, then low
    expect(all[0].priority).toBe('critical');
    expect(all[1].priority).toBe('high');
    expect(all[2].priority).toBe('low');

    // 4. Filter by status
    const pending = await queue.listItems({ status: 'pending' });
    expect(pending).toHaveLength(3);

    const approved = await queue.listItems({ status: 'approved' });
    expect(approved).toHaveLength(0);

    // 5. Filter by priority
    const criticalOnly = await queue.listItems({ priority: 'critical' });
    expect(criticalOnly).toHaveLength(1);
    expect(criticalOnly[0].approval_id).toBe(itemCritical.approval_id);

    // 6. Decide: approve the critical item
    await queue.decide(itemCritical.approval_id, {
      decided_by: 'pm-user-01',
      decision: 'approve',
    });

    // 7. Decide: reject the high item with reason
    await queue.decide(itemHigh.approval_id, {
      decided_by: 'pm-user-02',
      decision: 'reject',
      reason: 'Report format needs significant revisions before publishing',
    });

    // 8. Decide: request revision on the low item
    await queue.decide(itemLow.approval_id, {
      decided_by: 'pm-user-01',
      decision: 'revision_requested',
      notes: 'Include velocity trend data for last 3 sprints',
    });

    // 9. Verify counts after decisions
    const counts = await queue.getCounts();
    expect(counts.approved).toBe(1);
    expect(counts.rejected).toBe(1);
    expect(counts.revision_requested).toBe(1);
    expect(counts.pending).toBeUndefined(); // no more pending

    // 10. Verify each item's state
    const readCritical = await queue.getItem(itemCritical.approval_id);
    expect(readCritical!.status).toBe('approved');
    expect(readCritical!.decided_by).toBe('pm-user-01');

    const readHigh = await queue.getItem(itemHigh.approval_id);
    expect(readHigh!.status).toBe('rejected');
    expect(readHigh!.rejection_reason).toBe('Report format needs significant revisions before publishing');

    const readLow = await queue.getItem(itemLow.approval_id);
    expect(readLow!.status).toBe('revision_requested');
    expect(readLow!.revision_notes).toBe('Include velocity trend data for last 3 sprints');

    // 11. Resubmit the revised item
    const resubmitted = await queue.resubmit(itemLow.approval_id, 'Updated metrics with velocity trend data');
    expect(resubmitted.status).toBe('pending');
    expect(resubmitted.revision_round).toBe(1);
    expect(resubmitted.summary_diff).toBe('Updated metrics with velocity trend data');

    // 12. Verify counts again
    const countsAfterResubmit = await queue.getCounts();
    expect(countsAfterResubmit.pending).toBe(1);
    expect(countsAfterResubmit.revision_requested).toBeUndefined();

    // 13. Verify the list now has 1 pending
    const pendingAfter = await queue.listItems({ status: 'pending' });
    expect(pendingAfter).toHaveLength(1);
    expect(pendingAfter[0].approval_id).toBe(itemLow.approval_id);

    // 14. Resubmit again (revision round 2)
    await queue.decide(itemLow.approval_id, {
      decided_by: 'pm-user-01',
      decision: 'revision_requested',
      notes: 'Also add risk section to metrics',
    });
    await queue.resubmit(itemLow.approval_id, 'Updated with velocity trends and risk section');

    const readLowRound2 = await queue.getItem(itemLow.approval_id);
    expect(readLowRound2!.revision_round).toBe(2);
    expect(readLowRound2!.status).toBe('pending');

    // 15. Third revision round — should succeed
    await queue.decide(itemLow.approval_id, {
      decided_by: 'pm-user-01',
      decision: 'revision_requested',
      notes: 'Final polish on formatting',
    });
    await queue.resubmit(itemLow.approval_id, 'Final version with all revisions applied');

    const readLowRound3 = await queue.getItem(itemLow.approval_id);
    expect(readLowRound3!.revision_round).toBe(3);

    // 16. Fourth revision attempt — should fail (max 3)
    await queue.decide(itemLow.approval_id, {
      decided_by: 'pm-user-01',
      decision: 'revision_requested',
      notes: 'One more change',
    });
    await expect(queue.resubmit(itemLow.approval_id, 'Attempt v4')).rejects.toThrow('Revision limit');
  });

  it('concurrent read/write: no data loss', async () => {
    const root = await tempRoot();
    const queue = new ApprovalQueue(root);

    // Create 10 items sequentially
    const items: ApprovalItem[] = [];
    for (let i = 0; i < 10; i++) {
      items.push(await queue.createItem({
        ...baseInput(),
        title: `Item ${i}`,
        target_id: `CONC-${i}`,
        priority: (['critical', 'high', 'medium', 'low'] as const)[i % 4],
      }));
    }

    // Read all back and verify none are lost
    const all = await queue.listItems();
    expect(all).toHaveLength(10);

    // Decide on some items
    await queue.decide(items[0].approval_id, { decided_by: 'pm', decision: 'approve' });
    await queue.decide(items[3].approval_id, { decided_by: 'pm', decision: 'reject', reason: 'Not needed after review, sufficient detail provided' });
    await queue.decide(items[5].approval_id, { decided_by: 'pm', decision: 'revision_requested', notes: 'Needs more detail in summary, at least 10 chars required' });

    // Verify counts
    const counts = await queue.getCounts();
    expect(counts.pending).toBe(7);
    expect(counts.approved).toBe(1);
    expect(counts.rejected).toBe(1);
    expect(counts.revision_requested).toBe(1);

    // Verify all items still have unique IDs
    const ids = new Set(all.map(i => i.approval_id));
    expect(ids.size).toBe(10);
  });

  it('missing file returns empty list (not error)', async () => {
    const root = await tempRoot();
    const queue = new ApprovalQueue(root);

    // No items created yet — file doesn't exist
    const items = await queue.listItems();
    expect(items).toEqual([]);

    const counts = await queue.getCounts();
    expect(counts).toEqual({});

    // getItem should return null
    expect(await queue.getItem('non-existent')).toBeNull();
  });

  it('invalid JSON in file is handled gracefully', async () => {
    const root = await tempRoot();
    const queue = new ApprovalQueue(root);

    // Manually write invalid JSON
    const approvalsDir = path.join(root, '.ai-pm');
    await mkdir(approvalsDir, { recursive: true });
    await writeFile(path.join(approvalsDir, 'approvals.json'), '{ broken json !!!', 'utf-8');

    // Should throw on parse error (not ENOENT)
    await expect(queue.listItems()).rejects.toThrow();
  });

  it('multiple queues in different directories do not interfere', async () => {
    const root1 = await tempRoot();
    const root2 = await tempRoot();
    const queue1 = new ApprovalQueue(root1);
    const queue2 = new ApprovalQueue(root2);

    await queue1.createItem(baseInput({ title: 'Queue 1 item', target_id: 'Q1-001' }));
    await queue2.createItem(baseInput({ title: 'Queue 2 item', target_id: 'Q2-001' }));

    const list1 = await queue1.listItems();
    const list2 = await queue2.listItems();

    expect(list1).toHaveLength(1);
    expect(list1[0].title).toBe('Queue 1 item');
    expect(list2).toHaveLength(1);
    expect(list2[0].title).toBe('Queue 2 item');
  });

  it('sort order: oldest first within same priority', async () => {
    const root = await tempRoot();
    const queue = new ApprovalQueue(root);

    // Create 3 items with same priority but different creation order
    const first = await queue.createItem(baseInput({ priority: 'high', title: 'First', target_id: 'SRT-1' }));
    await new Promise(r => setTimeout(r, 10)); // ensure different timestamps
    const second = await queue.createItem(baseInput({ priority: 'high', title: 'Second', target_id: 'SRT-2' }));
    await new Promise(r => setTimeout(r, 10));
    const third = await queue.createItem(baseInput({ priority: 'high', title: 'Third', target_id: 'SRT-3' }));

    const items = await queue.listItems({ priority: 'high' });
    expect(items).toHaveLength(3);
    expect(items[0].approval_id).toBe(first.approval_id);
    expect(items[1].approval_id).toBe(second.approval_id);
    expect(items[2].approval_id).toBe(third.approval_id);
  });

  it('cannot decide on non-existent item', async () => {
    const root = await tempRoot();
    const queue = new ApprovalQueue(root);

    await expect(queue.decide('fake-id', {
      decided_by: 'pm',
      decision: 'approve',
    })).rejects.toThrow('not found');
  });

  it('cannot resubmit on non-revision item', async () => {
    const root = await tempRoot();
    const queue = new ApprovalQueue(root);
    const item = await queue.createItem(baseInput());

    await expect(queue.resubmit(item.approval_id, 'Updated')).rejects.toThrow('Can only resubmit');
  });

  it('approved item cannot be rejected', async () => {
    const root = await tempRoot();
    const queue = new ApprovalQueue(root);
    const item = await queue.createItem(baseInput());

    await queue.decide(item.approval_id, { decided_by: 'pm', decision: 'approve' });
    await expect(queue.decide(item.approval_id, {
      decided_by: 'pm',
      decision: 'reject',
      reason: 'Changed mind, need at least 10 chars',
    })).rejects.toThrow('Cannot');
  });
});
