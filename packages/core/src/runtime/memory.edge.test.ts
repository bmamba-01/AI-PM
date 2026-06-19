import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { MemoryStore, type MemoryTask, type MemoryArtifact } from './memory.js';

const tempRoots: string[] = [];

async function tempRoot(): Promise<string> {
  const root = await mkdtemp(path.join(tmpdir(), 'ai-pm-memory-edge-'));
  tempRoots.push(root);
  return root;
}

afterEach(async () => {
  await Promise.all(tempRoots.splice(0).map(root => rm(root, { recursive: true, force: true })));
});

function baseTask(overrides?: Partial<Omit<MemoryTask, 'task_id' | 'created_at' | 'updated_at'>>): Omit<MemoryTask, 'task_id' | 'created_at' | 'updated_at'> {
  return {
    project_id: 'proj-001',
    name: 'Test task',
    description: 'Test description',
    status: 'pending',
    assigned_to: 'agent-1',
    completed_at: null,
    dependencies: [],
    artifacts: [],
    tags: [],
    ...overrides,
  };
}

function baseArtifact(overrides?: Partial<Omit<MemoryArtifact, 'artifact_id' | 'created_at' | 'updated_at' | 'version'>>): Omit<MemoryArtifact, 'artifact_id' | 'created_at' | 'updated_at' | 'version'> {
  return {
    project_id: 'proj-001',
    name: 'test-doc.md',
    path: 'docs/test.md',
    type: 'doc',
    status: 'active',
    archived_at: null,
    archive_reason: null,
    task_id: null,
    ...overrides,
  };
}

describe('MemoryStore — edge cases', () => {
  // --- Task edge cases ---

  it('completeTask sets completed_at to ISO string', async () => {
    const root = await tempRoot();
    const store = new MemoryStore(root);
    const task = await store.createTask(baseTask());
    expect(task.completed_at).toBeNull();

    const completed = await store.completeTask(task.task_id);
    expect(completed.status).toBe('completed');
    expect(completed.completed_at).not.toBeNull();
    expect(new Date(completed.completed_at!).toISOString()).toBe(completed.completed_at);
  });

  it('completeTask updates updated_at', async () => {
    const root = await tempRoot();
    const store = new MemoryStore(root);
    const task = await store.createTask(baseTask());
    const beforeComplete = task.updated_at;

    // Small delay to ensure timestamp difference
    await new Promise(r => setTimeout(r, 10));

    const completed = await store.completeTask(task.task_id);
    expect(completed.updated_at).not.toBe(beforeComplete);
  });

  it('updateTask preserves task_id and created_at', async () => {
    const root = await tempRoot();
    const store = new MemoryStore(root);
    const task = await store.createTask(baseTask());
    const originalId = task.task_id;
    const originalCreated = task.created_at;

    const updated = await store.updateTask(task.task_id, { name: 'Updated name' });
    expect(updated.task_id).toBe(originalId);
    expect(updated.created_at).toBe(originalCreated);
    expect(updated.name).toBe('Updated name');
  });

  // --- Artifact edge cases ---

  it('archiveArtifact sets archived_at and archive_reason', async () => {
    const root = await tempRoot();
    const store = new MemoryStore(root);
    const art = await store.createArtifact(baseArtifact());
    expect(art.archived_at).toBeNull();
    expect(art.archive_reason).toBeNull();

    const archived = await store.archiveArtifact(art.artifact_id, 'No longer needed');
    expect(archived.status).toBe('archived');
    expect(archived.archived_at).not.toBeNull();
    expect(new Date(archived.archived_at!).toISOString()).toBe(archived.archived_at);
    expect(archived.archive_reason).toBe('No longer needed');
  });

  it('updateArtifact increments version', async () => {
    const root = await tempRoot();
    const store = new MemoryStore(root);
    const art = await store.createArtifact(baseArtifact());
    expect(art.version).toBe(1);

    const v2 = await store.updateArtifact(art.artifact_id, { name: 'updated-v2.md' });
    expect(v2.version).toBe(2);
    expect(v2.name).toBe('updated-v2.md');

    const v3 = await store.updateArtifact(art.artifact_id, { name: 'updated-v3.md' });
    expect(v3.version).toBe(3);
  });

  it('archiveArtifact preserves version', async () => {
    const root = await tempRoot();
    const store = new MemoryStore(root);
    const art = await store.createArtifact(baseArtifact());
    await store.updateArtifact(art.artifact_id, { name: 'v2.md' });

    const archived = await store.archiveArtifact(art.artifact_id, 'Old');
    expect(archived.version).toBe(2); // version preserved, not incremented
  });

  // --- Auto-archive edge cases ---

  it('autoArchiveCompleted with 0 days archives everything completed', async () => {
    const root = await tempRoot();
    const store = new MemoryStore(root);

    // Create task completed just now
    const task = await store.createTask(baseTask({ name: 'Just completed' }));
    await store.createArtifact(baseArtifact({ task_id: task.task_id }));
    await store.completeTask(task.task_id);

    // 0-day threshold means even "just now" is old enough
    const archived = await store.autoArchiveCompleted(0);
    expect(archived).toHaveLength(1);
    expect(archived[0].status).toBe('archived');
  });

  it('autoArchiveCompleted skips non-completed tasks', async () => {
    const root = await tempRoot();
    const store = new MemoryStore(root);

    const task = await store.createTask(baseTask({ name: 'Still pending' }));
    await store.createArtifact(baseArtifact({ task_id: task.task_id }));
    // Don't complete the task

    const archived = await store.autoArchiveCompleted(0);
    expect(archived).toHaveLength(0);
  });

  it('autoArchiveCompleted skips already archived artifacts', async () => {
    const root = await tempRoot();
    const store = new MemoryStore(root);

    const task = await store.createTask(baseTask({ name: 'Old task' }));
    const art = await store.createArtifact(baseArtifact({ task_id: task.task_id }));
    await store.completeTask(task.task_id);
    await store.archiveArtifact(art.artifact_id, 'Already archived');

    const archived = await store.autoArchiveCompleted(0);
    expect(archived).toHaveLength(0);
  });

  // --- Stale detection edge cases ---

  it('getStaleArtifacts with 0 days returns all active artifacts', async () => {
    const root = await tempRoot();
    const store = new MemoryStore(root);

    await store.createArtifact(baseArtifact({ name: 'art-1.md' }));
    await store.createArtifact(baseArtifact({ name: 'art-2.md' }));
    await store.createArtifact(baseArtifact({ name: 'art-3.md' }));

    const stale = await store.getStaleArtifacts(0);
    expect(stale).toHaveLength(3);
  });

  it('getStaleArtifacts excludes archived artifacts', async () => {
    const root = await tempRoot();
    const store = new MemoryStore(root);

    const art = await store.createArtifact(baseArtifact({ name: 'active.md' }));
    await store.createArtifact(baseArtifact({ name: 'archived.md', status: 'archived', archived_at: new Date().toISOString(), archive_reason: 'Old' }));

    const stale = await store.getStaleArtifacts(0);
    expect(stale).toHaveLength(1);
    expect(stale[0].name).toBe('active.md');
  });

  it('getStaleArtifacts excludes deleted artifacts', async () => {
    const root = await tempRoot();
    const store = new MemoryStore(root);

    await store.createArtifact(baseArtifact({ name: 'active.md' }));
    await store.createArtifact(baseArtifact({ name: 'deleted.md', status: 'deleted' }));

    const stale = await store.getStaleArtifacts(0);
    expect(stale).toHaveLength(1);
    expect(stale[0].name).toBe('active.md');
  });

  // --- Summary edge cases ---

  it('summary counts match after operations', async () => {
    const root = await tempRoot();
    const store = new MemoryStore(root);

    // Empty state
    let summary = await store.getSummary();
    expect(summary.totalTasks).toBe(0);
    expect(summary.totalArtifacts).toBe(0);

    // Add tasks
    const t1 = await store.createTask(baseTask({ name: 'Task 1' }));
    await store.createTask(baseTask({ name: 'Task 2' }));
    await store.completeTask(t1.task_id);

    summary = await store.getSummary();
    expect(summary.totalTasks).toBe(2);
    expect(summary.completedTasks).toBe(1);

    // Add artifacts
    await store.createArtifact(baseArtifact({ name: 'doc-1.md' }));
    const art2 = await store.createArtifact(baseArtifact({ name: 'doc-2.md' }));
    await store.archiveArtifact(art2.artifact_id, 'Old');

    summary = await store.getSummary();
    expect(summary.totalArtifacts).toBe(2);
    expect(summary.archivedArtifacts).toBe(1);
  });

  it('summary with all tasks completed and all artifacts archived', async () => {
    const root = await tempRoot();
    const store = new MemoryStore(root);

    const t1 = await store.createTask(baseTask({ name: 'Task 1' }));
    const t2 = await store.createTask(baseTask({ name: 'Task 2' }));
    await store.completeTask(t1.task_id);
    await store.completeTask(t2.task_id);

    const a1 = await store.createArtifact(baseArtifact({ name: 'doc-1.md', task_id: t1.task_id }));
    const a2 = await store.createArtifact(baseArtifact({ name: 'doc-2.md', task_id: t2.task_id }));
    await store.archiveArtifact(a1.artifact_id, 'Done');
    await store.archiveArtifact(a2.artifact_id, 'Done');

    const summary = await store.getSummary();
    expect(summary.totalTasks).toBe(2);
    expect(summary.completedTasks).toBe(2);
    expect(summary.totalArtifacts).toBe(2);
    expect(summary.archivedArtifacts).toBe(2);
  });

  // --- Concurrent operations ---

  it('concurrent task creation does not corrupt store', async () => {
    const root = await tempRoot();
    const store = new MemoryStore(root);

    await Promise.all([
      store.createTask(baseTask({ name: 'Concurrent 1' })),
      store.createTask(baseTask({ name: 'Concurrent 2' })),
      store.createTask(baseTask({ name: 'Concurrent 3' })),
    ]);

    const state = await store.getState();
    expect(state.tasks.length).toBeGreaterThanOrEqual(1);
    expect(state.tasks.length).toBeLessThanOrEqual(3);

    // Subsequent writes must work
    const t = await store.createTask(baseTask({ name: 'After concurrent' }));
    const all = await store.listTasks();
    expect(all.some(task => task.task_id === t.task_id)).toBe(true);
  });

  // --- Missing file handling ---

  it('getState on missing file returns valid empty state', async () => {
    const root = await tempRoot();
    const store = new MemoryStore(root);
    const state = await store.getState();
    expect(state.version).toBe(1);
    expect(state.tasks).toEqual([]);
    expect(state.artifacts).toEqual([]);
    expect(state.updated_at).toBeDefined();
  });

  it('getSummary on missing file returns zero counts', async () => {
    const root = await tempRoot();
    const store = new MemoryStore(root);
    const summary = await store.getSummary();
    expect(summary.totalTasks).toBe(0);
    expect(summary.completedTasks).toBe(0);
    expect(summary.totalArtifacts).toBe(0);
    expect(summary.archivedArtifacts).toBe(0);
    expect(summary.staleArtifacts).toBe(0);
  });

  // --- Task-artifact linking ---

  it('createArtifact links to task when task_id provided', async () => {
    const root = await tempRoot();
    const store = new MemoryStore(root);
    const task = await store.createTask(baseTask());
    const art = await store.createArtifact(baseArtifact({ task_id: task.task_id }));

    const taskArts = await store.getTaskArtifacts(task.task_id);
    expect(taskArts).toHaveLength(1);
    expect(taskArts[0].artifact_id).toBe(art.artifact_id);
  });

  it('getTaskArtifacts returns empty for non-existent task', async () => {
    const root = await tempRoot();
    const store = new MemoryStore(root);
    const arts = await store.getTaskArtifacts('non-existent');
    expect(arts).toEqual([]);
  });

  it('multiple artifacts linked to same task', async () => {
    const root = await tempRoot();
    const store = new MemoryStore(root);
    const task = await store.createTask(baseTask());

    await store.createArtifact(baseArtifact({ name: 'art-1.md', task_id: task.task_id }));
    await store.createArtifact(baseArtifact({ name: 'art-2.md', task_id: task.task_id }));
    await store.createArtifact(baseArtifact({ name: 'art-3.md', task_id: task.task_id }));

    const taskArts = await store.getTaskArtifacts(task.task_id);
    expect(taskArts).toHaveLength(3);
  });
});
