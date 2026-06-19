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
      const state = await store.getState();
      expect(state.tasks.length).toBe(1);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});
