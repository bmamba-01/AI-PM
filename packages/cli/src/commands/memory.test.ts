import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { MemoryStore, type TaskStatus, type ArtifactStatus } from '@ai-pm/core/runtime';

const tempRoots: string[] = [];

async function tempRoot(): Promise<string> {
  const root = await mkdtemp(path.join(tmpdir(), 'ai-pm-memory-cli-'));
  tempRoots.push(root);
  return root;
}

afterEach(async () => {
  await Promise.all(tempRoots.splice(0).map(root => rm(root, { recursive: true, force: true })));
});

function baseTask(overrides?: Partial<{ name: string; status: TaskStatus; assigned_to: string }>) {
  return {
    project_id: 'proj-001',
    name: 'Test task',
    description: 'Test description',
    status: 'pending' as TaskStatus,
    assigned_to: 'agent-1',
    completed_at: null,
    dependencies: [] as string[],
    artifacts: [] as string[],
    tags: [] as string[],
    ...overrides,
  };
}

function baseArtifact(overrides?: Partial<{ name: string; type: string; status: ArtifactStatus }>) {
  return {
    project_id: 'proj-001',
    name: 'test-doc.md',
    path: 'docs/test.md',
    type: 'doc',
    status: 'active' as ArtifactStatus,
    archived_at: null,
    archive_reason: null,
    task_id: null as string | null,
    ...overrides,
  };
}

describe('memory CLI — summary', () => {
  it('empty store returns zero summary', async () => {
    const root = await tempRoot();
    const store = new MemoryStore(root);
    const summary = await store.getSummary();
    expect(summary.totalTasks).toBe(0);
    expect(summary.totalArtifacts).toBe(0);
  });

  it('summary reflects tasks and artifacts', async () => {
    const root = await tempRoot();
    const store = new MemoryStore(root);
    const t1 = await store.createTask(baseTask({ name: 'Task 1' }));
    await store.createTask(baseTask({ name: 'Task 2' }));
    await store.completeTask(t1.task_id);
    await store.createArtifact(baseArtifact({ name: 'doc-1.md' }));

    const summary = await store.getSummary();
    expect(summary.totalTasks).toBe(2);
    expect(summary.completedTasks).toBe(1);
    expect(summary.totalArtifacts).toBe(1);
    expect(summary.archivedArtifacts).toBe(0);
  });

  it('summary output is valid JSON', async () => {
    const root = await tempRoot();
    const store = new MemoryStore(root);
    const summary = await store.getSummary();
    const json = JSON.stringify(summary, null, 2);
    const parsed = JSON.parse(json);
    expect(typeof parsed.totalTasks).toBe('number');
    expect(typeof parsed.totalArtifacts).toBe('number');
    expect(typeof parsed.staleArtifacts).toBe('number');
  });
});

describe('memory CLI — tasks', () => {
  it('empty store returns empty task list', async () => {
    const root = await tempRoot();
    const store = new MemoryStore(root);
    const tasks = await store.listTasks();
    expect(tasks).toEqual([]);
  });

  it('lists all tasks without filter', async () => {
    const root = await tempRoot();
    const store = new MemoryStore(root);
    await store.createTask(baseTask({ name: 'A' }));
    await store.createTask(baseTask({ name: 'B' }));
    const tasks = await store.listTasks();
    expect(tasks).toHaveLength(2);
  });

  it('filters by in_progress status', async () => {
    const root = await tempRoot();
    const store = new MemoryStore(root);
    const t1 = await store.createTask(baseTask({ name: 'A', status: 'pending' }));
    await store.createTask(baseTask({ name: 'B', status: 'in_progress' }));
    await store.completeTask(t1.task_id);

    const inProgress = await store.listTasks({ status: 'in_progress' });
    expect(inProgress).toHaveLength(1);
    expect(inProgress[0].name).toBe('B');
  });

  it('filters by completed status', async () => {
    const root = await tempRoot();
    const store = new MemoryStore(root);
    const t1 = await store.createTask(baseTask({ name: 'A' }));
    await store.completeTask(t1.task_id);
    await store.createTask(baseTask({ name: 'B' }));

    const completed = await store.listTasks({ status: 'completed' });
    expect(completed).toHaveLength(1);
    expect(completed[0].name).toBe('A');
  });

  it('rejects missing name', async () => {
    const root = await tempRoot();
    const store = new MemoryStore(root);
    await expect(store.createTask({ ...baseTask(), name: '' })).rejects.toThrow('Missing required fields');
  });

  it('rejects missing project_id', async () => {
    const root = await tempRoot();
    const store = new MemoryStore(root);
    await expect(store.createTask({ ...baseTask(), project_id: '' })).rejects.toThrow('Missing required fields');
  });

  it('updateTask does not allow changing task_id', async () => {
    const root = await tempRoot();
    const store = new MemoryStore(root);
    const task = await store.createTask(baseTask());
    const updated = await store.updateTask(task.task_id, { name: 'Changed' });
    expect(updated.task_id).toBe(task.task_id);
    expect(updated.name).toBe('Changed');
  });

  it('updateTask on non-existent throws', async () => {
    const root = await tempRoot();
    const store = new MemoryStore(root);
    await expect(store.updateTask('non-existent', { name: 'X' })).rejects.toThrow('not found');
  });
});

describe('memory CLI — artifacts', () => {
  it('empty store returns empty artifact list', async () => {
    const root = await tempRoot();
    const store = new MemoryStore(root);
    const arts = await store.listArtifacts();
    expect(arts).toEqual([]);
  });

  it('creates artifact and retrieves it', async () => {
    const root = await tempRoot();
    const store = new MemoryStore(root);
    const art = await store.createArtifact(baseArtifact({ name: 'design.md' }));
    expect(art.artifact_id).toBeDefined();
    expect(art.name).toBe('design.md');
    expect(art.version).toBe(1);

    const found = await store.getArtifact(art.artifact_id);
    expect(found).not.toBeNull();
    expect(found!.name).toBe('design.md');
  });

  it('rejects missing name', async () => {
    const root = await tempRoot();
    const store = new MemoryStore(root);
    await expect(store.createArtifact({ ...baseArtifact(), name: '' })).rejects.toThrow('Missing required fields');
  });

  it('archiveArtifact works', async () => {
    const root = await tempRoot();
    const store = new MemoryStore(root);
    const art = await store.createArtifact(baseArtifact());
    const archived = await store.archiveArtifact(art.artifact_id, 'Old');
    expect(archived.status).toBe('archived');
    expect(archived.archive_reason).toBe('Old');
  });

  it('archiveArtifact on non-existent throws', async () => {
    const root = await tempRoot();
    const store = new MemoryStore(root);
    await expect(store.archiveArtifact('non-existent', 'reason')).rejects.toThrow('not found');
  });

  it('listArtifacts filters by type', async () => {
    const root = await tempRoot();
    const store = new MemoryStore(root);
    await store.createArtifact(baseArtifact({ name: 'doc.md', type: 'doc' }));
    await store.createArtifact(baseArtifact({ name: 'schema.json', type: 'schema' }));

    const docs = await store.listArtifacts({ type: 'doc' });
    expect(docs).toHaveLength(1);
    expect(docs[0].type).toBe('doc');
  });

  it('listArtifacts filters by status', async () => {
    const root = await tempRoot();
    const store = new MemoryStore(root);
    const a1 = await store.createArtifact(baseArtifact({ name: 'active.md' }));
    await store.archiveArtifact(a1.artifact_id, 'Done');

    const archived = await store.listArtifacts({ status: 'archived' });
    expect(archived).toHaveLength(1);
    expect(archived[0].name).toBe('active.md');
  });

  it('updateArtifact increments version', async () => {
    const root = await tempRoot();
    const store = new MemoryStore(root);
    const art = await store.createArtifact(baseArtifact());
    const v2 = await store.updateArtifact(art.artifact_id, { name: 'v2.md' });
    expect(v2.version).toBe(2);
    const v3 = await store.updateArtifact(art.artifact_id, { name: 'v3.md' });
    expect(v3.version).toBe(3);
  });

  it('getArtifact returns null for non-existent', async () => {
    const root = await tempRoot();
    const store = new MemoryStore(root);
    const art = await store.getArtifact('non-existent');
    expect(art).toBeNull();
  });
});
