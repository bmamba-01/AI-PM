import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { resolveTrackingAdapter, getTrackingConfig } from './registry.js';
import { LocalMemoryAdapter } from './localMemoryAdapter.js';

describe('Tracking Registry', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await mkdtemp(path.join(tmpdir(), 'tracking-registry-test-'));
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  describe('resolveTrackingAdapter', () => {
    it('returns LocalMemoryAdapter for local_memory profile', () => {
      const adapter = resolveTrackingAdapter(
        { tracking: { system: 'local_memory', mode: 'manual' } },
        tempDir,
      );
      expect(adapter).toBeInstanceOf(LocalMemoryAdapter);
      expect(adapter.adapter_id).toBe('local_memory');
    });

    it('defaults to local_memory when no tracking config', () => {
      const adapter = resolveTrackingAdapter({}, tempDir);
      expect(adapter).toBeInstanceOf(LocalMemoryAdapter);
      expect(adapter.adapter_id).toBe('local_memory');
    });

    it('defaults to local_memory when tracking is undefined', () => {
      const adapter = resolveTrackingAdapter({ tracking: undefined }, tempDir);
      expect(adapter).toBeInstanceOf(LocalMemoryAdapter);
      expect(adapter.adapter_id).toBe('local_memory');
    });

    it('returns LocalMemoryAdapter for notion profile (fallback)', () => {
      const adapter = resolveTrackingAdapter(
        { tracking: { system: 'notion', mode: 'local_import' } },
        tempDir,
      );
      expect(adapter).toBeInstanceOf(LocalMemoryAdapter);
      expect(adapter.adapter_id).toBe('local_memory');
    });

    it('returns LocalMemoryAdapter for jira profile (fallback)', () => {
      const adapter = resolveTrackingAdapter(
        { tracking: { system: 'jira', mode: 'dry_run' } },
        tempDir,
      );
      expect(adapter).toBeInstanceOf(LocalMemoryAdapter);
    });

    it('returns LocalMemoryAdapter for excel profile', () => {
      const adapter = resolveTrackingAdapter(
        { tracking: { system: 'excel', mode: 'local_import' } },
        tempDir,
      );
      expect(adapter).toBeInstanceOf(LocalMemoryAdapter);
    });
  });

  describe('getTrackingConfig', () => {
    it('returns config from profile', () => {
      const config = getTrackingConfig({
        tracking: {
          system: 'notion',
          mode: 'local_import',
          database_name: 'My DB',
          done_status: 'Done',
        },
      });
      expect(config.system).toBe('notion');
      expect(config.mode).toBe('local_import');
      expect(config.database_name).toBe('My DB');
      expect(config.done_status).toBe('Done');
    });

    it('defaults system to local_memory', () => {
      const config = getTrackingConfig({});
      expect(config.system).toBe('local_memory');
      expect(config.mode).toBe('manual');
    });
  });

  describe('LocalMemoryAdapter', () => {
    it('creates a task', async () => {
      const adapter = new LocalMemoryAdapter(tempDir);
      const task = await adapter.createTask({
        project_id: 'test-project',
        title: 'Test task',
        description: 'A test task',
        assigned_agent: 'test-agent',
        workflow_id: 'test-workflow',
        priority: 'high',
        status: 'ready',
      });
      expect(task.task_id).toBeDefined();
      expect(task.title).toBe('Test task');
      expect(task.status).toBe('ready');
      expect(task.external_task_id).toBe(task.task_id);
      expect(task.local_memory_task_id).toBe(task.task_id);
    });

    it('gets a task by ID', async () => {
      const adapter = new LocalMemoryAdapter(tempDir);
      const created = await adapter.createTask({
        project_id: 'test-project',
        title: 'Find me',
        description: 'desc',
        assigned_agent: 'agent',
        workflow_id: 'wf',
        priority: 'medium',
        status: 'in_progress',
      });
      const found = await adapter.getTask(created.task_id);
      expect(found).not.toBeNull();
      expect(found!.title).toBe('Find me');
    });

    it('returns null for unknown task', async () => {
      const adapter = new LocalMemoryAdapter(tempDir);
      const found = await adapter.getTask('nonexistent');
      expect(found).toBeNull();
    });

    it('updates task status', async () => {
      const adapter = new LocalMemoryAdapter(tempDir);
      const created = await adapter.createTask({
        project_id: 'p1',
        title: 'Block me',
        description: 'desc',
        assigned_agent: 'agent',
        workflow_id: 'wf',
        priority: 'low',
        status: 'in_progress',
      });
      const updated = await adapter.updateStatus(created.task_id, 'blocked');
      expect(updated.status).toBe('blocked');
      expect(updated.updated_at).not.toBe(created.updated_at);
    });

    it('throws for unknown task on update', async () => {
      const adapter = new LocalMemoryAdapter(tempDir);
      await expect(adapter.updateStatus('nonexistent', 'done')).rejects.toThrow('Task not found');
    });

    it('verifies completion of done task', async () => {
      const adapter = new LocalMemoryAdapter(tempDir);
      const created = await adapter.createTask({
        project_id: 'p1',
        title: 'Complete me',
        description: 'desc',
        assigned_agent: 'agent',
        workflow_id: 'wf',
        priority: 'high',
        status: 'ready',
      });
      const before = await adapter.verifyCompletion(created.task_id);
      expect(before.complete).toBe(false);
      await adapter.updateStatus(created.task_id, 'done');
      const after = await adapter.verifyCompletion(created.task_id);
      expect(after.complete).toBe(true);
      expect(after.evidence.length).toBeGreaterThan(0);
    });

    it('returns failure evidence for unknown task', async () => {
      const adapter = new LocalMemoryAdapter(tempDir);
      const result = await adapter.verifyCompletion('nonexistent');
      expect(result.complete).toBe(false);
      expect(result.evidence[0]).toContain('not found');
    });

    it('persists tasks across adapter instances', async () => {
      const adapter1 = new LocalMemoryAdapter(tempDir);
      const created = await adapter1.createTask({
        project_id: 'p1',
        title: 'Persistent',
        description: 'desc',
        assigned_agent: 'agent',
        workflow_id: 'wf',
        priority: 'medium',
        status: 'ready',
      });
      const adapter2 = new LocalMemoryAdapter(tempDir);
      const found = await adapter2.getTask(created.task_id);
      expect(found).not.toBeNull();
      expect(found!.title).toBe('Persistent');
    });
  });
});