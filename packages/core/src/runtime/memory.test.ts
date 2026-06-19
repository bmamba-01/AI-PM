import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { MemoryStore, type MemoryTask, type MemoryArtifact } from './memory.js';

const tempRoots: string[] = [];

async function tempRoot(): Promise<string> {
  const root = await mkdtemp(path.join(tmpdir(), 'ai-pm-memory-'));
  tempRoots.push(root);
  return root;
}

afterEach(async () => {
  await Promise.all(tempRoots.splice(0).map(root => rm(root, { recursive: true, force: true })));
});

function baseTask(overrides?: Partial<Omit<MemoryTask, 'task_id' | 'created_at' | 'updated_at'>>): Omit<MemoryTask, 'task_id' | 'created_at' | 'updated_at'> {
  return {
    project_id: 'proj-001',
    name: 'Design memory schema',
    description: 'Define the core memory data model',
    status: 'pending',
    assigned_to: 'agent-5',
    completed_at: null,
    dependencies: [],
    artifacts: [],
    tags: ['design'],
    ...overrides,
  };
}

function baseArtifact(overrides?: Partial<Omit<MemoryArtifact, 'artifact_id' | 'created_at' | 'updated_at' | 'version'>>): Omit<MemoryArtifact, 'artifact_id' | 'created_at' | 'updated_at' | 'version'> {
  return {
    project_id: 'proj-001',
    name: 'memory-design.md',
    path: 'docs/architecture/memory-design.md',
    type: 'doc',
    status: 'active',
    archived_at: null,
    archive_reason: null,
    task_id: null,
    ...overrides,
  };
}

describe('MemoryStore', () => {
  // --- Task tests ---

  it('creates and retrieves a task', async () => {
    const root = await tempRoot();
    const store = new MemoryStore(root);
    const task = await store.createTask(baseTask());

    expect(task.task_id).toBeDefined();
    expect(task.name).toBe('Design memory schema');
    expect(task.status).toBe('pending');
    expect(task.created_at).toBeDefined();

    const found = await store.getTask(task.task_id);
    expect(found).not.toBeNull();
    expect(found!.task_id).toBe(task.task_id);
  });

  it('rejects task missing required fields', async () => {
    const root = await tempRoot();
    const store = new MemoryStore(root);
    await expect(store.createTask({ ...baseTask(), name: '' })).rejects.toThrow('Missing required fields');
  });

  it('completes a task — status changes and completed_at set', async () => {
    const root = await tempRoot();
    const store = new MemoryStore(root);
    const task = await store.createTask(baseTask());

    const completed = await store.completeTask(task.task_id);
    expect(completed.status).toBe('completed');
    expect(completed.completed_at).toBeDefined();
    expect(completed.completed_at).not.toBeNull();
  });

  it('completeTask fails for non-existent task', async () => {
    const root = await tempRoot();
    const store = new MemoryStore(root);
    await expect(store.completeTask('non-existent')).rejects.toThrow('not found');
  });

  it('updates a task', async () => {
    const root = await tempRoot();
    const store = new MemoryStore(root);
    const task = await store.createTask(baseTask());

    const updated = await store.updateTask(task.task_id, { status: 'in_progress', tags: ['design', 'core'] });
    expect(updated.status).toBe('in_progress');
    expect(updated.tags).toEqual(['design', 'core']);
    expect(updated.task_id).toBe(task.task_id);
  });

  it('lists tasks with optional status filter', async () => {
    const root = await tempRoot();
    const store = new MemoryStore(root);
    await store.createTask(baseTask({ name: 'Task A' }));
    const taskB = await store.createTask(baseTask({ name: 'Task B' }));
    await store.completeTask(taskB.task_id);

    const all = await store.listTasks();
    expect(all).toHaveLength(2);

    const pending = await store.listTasks({ status: 'pending' });
    expect(pending).toHaveLength(1);
    expect(pending[0].name).toBe('Task A');

    const completed = await store.listTasks({ status: 'completed' });
    expect(completed).toHaveLength(1);
    expect(completed[0].name).toBe('Task B');
  });

  // --- Artifact tests ---

  it('creates an artifact linked to a task', async () => {
    const root = await tempRoot();
    const store = new MemoryStore(root);
    const task = await store.createTask(baseTask());
    const art = await store.createArtifact(baseArtifact({ task_id: task.task_id }));

    expect(art.artifact_id).toBeDefined();
    expect(art.version).toBe(1);
    expect(art.task_id).toBe(task.task_id);

    const taskArtifacts = await store.getTaskArtifacts(task.task_id);
    expect(taskArtifacts).toHaveLength(1);
    expect(taskArtifacts[0].artifact_id).toBe(art.artifact_id);
  });

  it('archives an artifact — status changes and archived_at set', async () => {
    const root = await tempRoot();
    const store = new MemoryStore(root);
    const art = await store.createArtifact(baseArtifact());

    const archived = await store.archiveArtifact(art.artifact_id, 'No longer needed');
    expect(archived.status).toBe('archived');
    expect(archived.archived_at).toBeDefined();
    expect(archived.archived_at).not.toBeNull();
    expect(archived.archive_reason).toBe('No longer needed');
  });

  it('updateArtifact increments version', async () => {
    const root = await tempRoot();
    const store = new MemoryStore(root);
    const art = await store.createArtifact(baseArtifact());

    const updated = await store.updateArtifact(art.artifact_id, { name: 'updated-doc.md' });
    expect(updated.version).toBe(2);
    expect(updated.name).toBe('updated-doc.md');
  });

  it('lists artifacts with optional status and type filter', async () => {
    const root = await tempRoot();
    const store = new MemoryStore(root);
    await store.createArtifact(baseArtifact({ name: 'doc-a.md', type: 'doc', status: 'active' }));
    await store.createArtifact(baseArtifact({ name: 'schema-a.json', type: 'schema', status: 'active' }));
    const archived = await store.createArtifact(baseArtifact({ name: 'doc-b.md', type: 'doc', status: 'active' }));
    await store.archiveArtifact(archived.artifact_id, 'Old');

    const allActive = await store.listArtifacts({ status: 'active' });
    expect(allActive).toHaveLength(2);

    const allArchived = await store.listArtifacts({ status: 'archived' });
    expect(allArchived).toHaveLength(1);

    const docs = await store.listArtifacts({ type: 'doc' });
    expect(docs).toHaveLength(2); // one active, one archived
  });

  // --- Lifecycle tests ---

  it('auto-archives artifacts of completed tasks older than N days', async () => {
    const root = await tempRoot();
    const store = new MemoryStore(root);

    // Create a task and its artifact
    const task = await store.createTask(baseTask({ name: 'Old task' }));
    await store.createArtifact(baseArtifact({ task_id: task.task_id }));

    // Manually backdate the task's completed_at to 10 days ago
    const oldDate = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString();
    await store.updateTask(task.task_id, { status: 'completed', completed_at: oldDate });

    const archived = await store.autoArchiveCompleted(7);
    expect(archived).toHaveLength(1);

    // Verify the artifact is now archived
    const art = await store.getArtifact(archived[0].artifact_id);
    expect(art!.status).toBe('archived');
    expect(art!.archive_reason).toContain('Auto-archived');
  });

  it('does not auto-archive recent completed task artifacts', async () => {
    const root = await tempRoot();
    const store = new MemoryStore(root);

    const task = await store.createTask(baseTask({ name: 'Recent task' }));
    await store.createArtifact(baseArtifact({ task_id: task.task_id }));
    await store.completeTask(task.task_id); // completed just now

    const archived = await store.autoArchiveCompleted(7);
    expect(archived).toHaveLength(0);
  });

  it('detects stale artifacts not updated in N days', async () => {
    const root = await tempRoot();
    const store = new MemoryStore(root);

    const oldArt = await store.createArtifact(baseArtifact({ name: 'stale-doc.md' }));
    const freshArt = await store.createArtifact(baseArtifact({ name: 'fresh-doc.md' }));

    // Backdate the old artifact's updated_at
    await store.updateArtifact(oldArt.artifact_id, { name: 'stale-doc.md' }); // now version 2
    // Manually backdate by re-reading state
    const state = await store.getState();
    const staleIdx = state.artifacts.findIndex(a => a.artifact_id === oldArt.artifact_id);
    state.artifacts[staleIdx].updated_at = new Date(Date.now() - 31 * 24 * 60 * 60 * 1000).toISOString();
    const { writeFile } = await import('node:fs/promises');
    await writeFile(path.join(root, '.ai-pm', 'memory', 'state.json'), JSON.stringify(state, null, 2), 'utf-8');

    const stale = await store.getStaleArtifacts(30);
    expect(stale).toHaveLength(1);
    expect(stale[0].artifact_id).toBe(oldArt.artifact_id);
  });

  it('excludes archived and deleted artifacts from stale detection', async () => {
    const root = await tempRoot();
    const store = new MemoryStore(root);

    const art = await store.createArtifact(baseArtifact({ name: 'archived-stale.md' }));
    await store.archiveArtifact(art.artifact_id, 'Old');

    // Even if updated_at is old, archived artifacts should not be "stale"
    const stale = await store.getStaleArtifacts(0);
    expect(stale).toHaveLength(0);
  });

  // --- Summary test ---

  it('returns correct summary counts', async () => {
    const root = await tempRoot();
    const store = new MemoryStore(root);

    const t1 = await store.createTask(baseTask({ name: 'Task 1' }));
    await store.createTask(baseTask({ name: 'Task 2' }));
    await store.completeTask(t1.task_id);

    await store.createArtifact(baseArtifact({ name: 'doc-1.md' }));
    const art2 = await store.createArtifact(baseArtifact({ name: 'doc-2.md' }));
    await store.archiveArtifact(art2.artifact_id, 'Old');

    const summary = await store.getSummary();
    expect(summary.totalTasks).toBe(2);
    expect(summary.completedTasks).toBe(1);
    expect(summary.totalArtifacts).toBe(2);
    expect(summary.archivedArtifacts).toBe(1);
    expect(summary.staleArtifacts).toBe(0);
  });

  // --- Edge cases ---

  it('missing file returns empty state (not error)', async () => {
    const root = await tempRoot();
    const store = new MemoryStore(root);
    const state = await store.getState();
    expect(state.tasks).toEqual([]);
    expect(state.artifacts).toEqual([]);
    expect(state.version).toBe(1);
  });

  it('sequential operations maintain consistent state', async () => {
    const root = await tempRoot();
    const store = new MemoryStore(root);

    const t1 = await store.createTask(baseTask({ name: 'Sequential 1' }));
    const t2 = await store.createTask(baseTask({ name: 'Sequential 2' }));
    const t3 = await store.createTask(baseTask({ name: 'Sequential 3' }));

    const all = await store.listTasks();
    expect(all).toHaveLength(3);

    const a1 = await store.createArtifact(baseArtifact({ name: 'art-1.md', task_id: t1.task_id }));
    const a2 = await store.createArtifact(baseArtifact({ name: 'art-2.md', task_id: t2.task_id }));
    const a3 = await store.createArtifact(baseArtifact({ name: 'art-3.md', task_id: t3.task_id }));

    const allArts = await store.listArtifacts();
    expect(allArts).toHaveLength(3);

    const t1Arts = await store.getTaskArtifacts(t1.task_id);
    expect(t1Arts).toHaveLength(1);
    expect(t1Arts[0].artifact_id).toBe(a1.artifact_id);
  });

  it('concurrent writes do not corrupt the file', async () => {
    const root = await tempRoot();
    const store = new MemoryStore(root);

    // Parallel writes may lose data (last-write-wins) but must not corrupt the store
    await Promise.all([
      store.createTask(baseTask({ name: 'Concurrent 1' })),
      store.createTask(baseTask({ name: 'Concurrent 2' })),
      store.createTask(baseTask({ name: 'Concurrent 3' })),
    ]);

    // Store must remain readable and valid
    const state = await store.getState();
    expect(state.tasks.length).toBeGreaterThanOrEqual(1);
    expect(state.tasks.length).toBeLessThanOrEqual(3);

    // Subsequent sequential writes must work correctly
    const t = await store.createTask(baseTask({ name: 'After concurrent' }));
    const all = await store.listTasks();
    expect(all.some(task => task.task_id === t.task_id)).toBe(true);
  });
});
