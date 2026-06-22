import { describe, expect, it, afterEach } from 'vitest';
import { mkdtemp, rm, readFile, mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { NotionAdapter } from './notionAdapter.js';
import type { CreateTaskInput } from './types.js';

const tempRoots: string[] = [];

async function tempRoot(): Promise<string> {
  const root = await mkdtemp(path.join(tmpdir(), 'ai-pm-notion-'));
  tempRoots.push(root);
  return root;
}

afterEach(async () => {
  await Promise.all(tempRoots.splice(0).map(root => rm(root, { recursive: true, force: true })));
});

function baseInput(overrides?: Partial<CreateTaskInput>): CreateTaskInput {
  return {
    project_id: 'proj-001',
    title: 'Test task',
    description: 'A test task',
    assigned_agent: 'agent-1',
    workflow_id: 'daily-briefing',
    priority: 'high',
    status: 'ready',
    due_date: '2026-06-25',
    acceptance_criteria: ['Criteria 1', 'Criteria 2'],
    verification_commands: ['pnpm test'],
    source_refs: ['local-memory'],
    ...overrides,
  };
}

describe('NotionAdapter', () => {
  it('createTask in local_import mode writes CSV row', async () => {
    const root = await tempRoot();
    const adapter = new NotionAdapter(root, 'local_import');
    const task = await adapter.createTask(baseInput());

    expect(task.external_task_id).toContain('notion-page-');
    expect(task.external_task_url).toContain('notion.so/');
    expect(task.status).toBe('ready');
    expect(task.title).toBe('Test task');

    const csvPath = path.join(root, 'integrations', 'notion', 'issues.csv');
    const content = await readFile(csvPath, 'utf-8');
    expect(content).toContain('Test task');
    expect(content).toContain('notion-page-');
  });

  it('createTask in dry_run mode writes CSV row', async () => {
    const root = await tempRoot();
    const adapter = new NotionAdapter(root, 'dry_run');
    const task = await adapter.createTask(baseInput());

    const csvPath = path.join(root, 'integrations', 'notion', 'issues.csv');
    const content = await readFile(csvPath, 'utf-8');
    expect(content).toContain('Test task');
    expect(task.external_task_id).toContain('notion-page-');
  });

  it('createTask returns stable external_task_id format', async () => {
    const root = await tempRoot();
    const adapter = new NotionAdapter(root, 'local_import');
    const task = await adapter.createTask(baseInput());

    expect(task.external_task_id).toMatch(/^notion-page-[a-z0-9]+$/);
    expect(task.external_task_url).toMatch(/^https:\/\/notion\.so\//);
  });

  it('updateStatus in dry_run returns updated task', async () => {
    const root = await tempRoot();
    const adapter = new NotionAdapter(root, 'dry_run');

    // Create task first so getTask can find it
    const created = await adapter.createTask(baseInput());
    const updated = await adapter.updateStatus(created.external_task_id, 'done', 'report attached');

    expect(updated.status).toBe('done');
    expect(updated.external_task_id).toBe(created.external_task_id);
  });

  it('verifyCompletion checks task status', async () => {
    const root = await tempRoot();
    const adapter = new NotionAdapter(root, 'dry_run');
    const created = await adapter.createTask(baseInput());

    // Not done yet
    const result1 = await adapter.verifyCompletion(created.external_task_id);
    expect(result1.complete).toBe(false);

    // Mark as done
    await adapter.updateStatus(created.external_task_id, 'done');
    const result2 = await adapter.verifyCompletion(created.external_task_id);
    expect(result2.complete).toBe(true);
  });

  it('listTasks reads from CSV', async () => {
    const root = await tempRoot();
    const adapter = new NotionAdapter(root, 'local_import');

    await adapter.createTask(baseInput({ title: 'Task A' }));
    await adapter.createTask(baseInput({ title: 'Task B' }));

    const tasks = await adapter.listTasks('proj-001');
    expect(tasks).toHaveLength(2);
    expect(tasks[0].title).toBe('Task A');
    expect(tasks[1].title).toBe('Task B');
    expect(tasks[0].external_task_url).toContain('notion.so/');
  });

  it('listTasks returns empty for missing CSV', async () => {
    const root = await tempRoot();
    const adapter = new NotionAdapter(root, 'local_import');
    const tasks = await adapter.listTasks('proj-001');
    expect(tasks).toEqual([]);
  });

  it('live mode throws on createTask', async () => {
    const root = await tempRoot();
    const adapter = new NotionAdapter(root, 'live');
    await expect(adapter.createTask(baseInput())).rejects.toThrow('Live Notion not implemented');
  });

  it('live mode throws on updateStatus', async () => {
    const root = await tempRoot();
    const adapter = new NotionAdapter(root, 'live');
    await expect(adapter.updateStatus('abc', 'done')).rejects.toThrow('Live Notion not implemented');
  });

  it('multiple createTask calls append to same CSV', async () => {
    const root = await tempRoot();
    const adapter = new NotionAdapter(root, 'local_import');

    await adapter.createTask(baseInput({ title: 'First' }));
    await adapter.createTask(baseInput({ title: 'Second' }));
    await adapter.createTask(baseInput({ title: 'Third' }));

    const csvPath = path.join(root, 'integrations', 'notion', 'issues.csv');
    const content = await readFile(csvPath, 'utf-8');
    const lines = content.trim().split('\n');
    expect(lines.length).toBe(3);
    expect(lines[0]).toContain('First');
    expect(lines[1]).toContain('Second');
    expect(lines[2]).toContain('Third');
  });

  it('priority mapping works correctly', async () => {
    const root = await tempRoot();
    const adapter = new NotionAdapter(root, 'local_import');

    await adapter.createTask(baseInput({ priority: 'critical' }));
    await adapter.createTask(baseInput({ priority: 'low' }));

    const csvPath = path.join(root, 'integrations', 'notion', 'issues.csv');
    const content = await readFile(csvPath, 'utf-8');
    expect(content).toContain('Critical');
    expect(content).toContain('Low');
  });

  it('getTask returns null for non-existent task', async () => {
    const root = await tempRoot();
    const adapter = new NotionAdapter(root, 'local_import');
    const task = await adapter.getTask('nonexistent-id');
    expect(task).toBeNull();
  });

  it('getTask finds task by external ID', async () => {
    const root = await tempRoot();
    const adapter = new NotionAdapter(root, 'local_import');
    const created = await adapter.createTask(baseInput());
    const found = await adapter.getTask(created.external_task_id);
    expect(found).not.toBeNull();
    expect(found!.external_task_id).toBe(created.external_task_id);
    expect(found!.title).toBe('Test task');
  });
});
