import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createServer, request as httpRequest, type IncomingMessage, type ServerResponse } from 'node:http';
import { afterEach, describe, expect, it } from 'vitest';
import { MemoryStore, type MemoryTask, type MemoryArtifact } from '@ai-pm/core/runtime';
import { memoryRoutes } from './memory.js';

const tempRoots: string[] = [];

async function tempRoot(): Promise<string> {
  const root = await mkdtemp(path.join(tmpdir(), 'ai-pm-server-mem-test-'));
  tempRoots.push(root);
  return root;
}

afterEach(async () => {
  await Promise.all(tempRoots.splice(0).map(root => rm(root, { recursive: true, force: true })));
});

// ── Helpers ─────────────────────────────────────────────────────────────────

function fetchJson(port: number, urlPath: string, init?: { method?: string; body?: string }): Promise<{ status: number; body: any }> {
  return new Promise((resolve, reject) => {
    const method = init?.method ?? 'GET';
    const body = init?.body ?? undefined;

    const req = httpRequest(`http://127.0.0.1:${port}${urlPath}`, { method, headers: { 'Content-Type': 'application/json' } }, (res: any) => {
      let data = '';
      res.on('data', (chunk: string) => { data += chunk; });
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(data) });
        } catch {
          resolve({ status: res.statusCode, body: data });
        }
      });
    });
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

function baseTask(overrides?: Partial<Omit<MemoryTask, 'task_id' | 'created_at' | 'updated_at'>>): Omit<MemoryTask, 'task_id' | 'created_at' | 'updated_at'> {
  return {
    project_id: 'proj-test',
    name: 'Test task',
    description: 'A test task for memory API.',
    status: 'pending',
    assigned_to: 'agent-test',
    completed_at: null,
    dependencies: [],
    artifacts: [],
    tags: ['test'],
    ...overrides,
  };
}

function baseArtifact(overrides?: Partial<Omit<MemoryArtifact, 'artifact_id' | 'created_at' | 'updated_at' | 'version'>>): Omit<MemoryArtifact, 'artifact_id' | 'created_at' | 'updated_at' | 'version'> {
  return {
    project_id: 'proj-test',
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

type ServerHandle = { port: number; store: MemoryStore; cleanup: () => Promise<void> };

async function setupServer(): Promise<ServerHandle> {
  const root = await tempRoot();
  const store = new MemoryStore(root);

  type Route = typeof memoryRoutes[number];
  function matchRoute(route: Route, method: string, pathname: string): Record<string, string> | null {
    if (route.method !== method) return null;
    const m = route.pattern.exec(pathname);
    if (!m) return null;
    const params: Record<string, string> = {};
    route.keys.forEach((k, i) => { params[k] = decodeURIComponent(m[i + 1]); });
    return params;
  }

  const server = createServer(async (req: IncomingMessage, res: ServerResponse) => {
    const url = new URL(req.url!, `http://${req.headers.host}`);
    const matched = memoryRoutes.find(r => matchRoute(r, req.method!, url.pathname));
    if (!matched) {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Not found' }));
      return;
    }
    try {
      const params = matchRoute(matched, req.method!, url.pathname)!;
      await matched.handler(req, res, params, store);
    } catch (e: unknown) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: e instanceof Error ? e.message : 'internal error' }));
    }
  });

  await new Promise<void>(resolve => {
    server.listen(0, '127.0.0.1', () => { resolve(); });
  });

  const addr = server.address();
  const port = typeof addr === 'object' && addr ? addr.port : 3999;

  return {
    port,
    store,
    cleanup: async () => {
      await new Promise<void>(resolve => server.close(() => resolve()));
    },
  };
}

// ── Tests ───────────────────────────────────────────────────────────────────

describe('Memory API routes', () => {
  // ─── Summary ────────────────────────────────────────────────────────────

  describe('GET /api/memory/summary', () => {
    it('returns zero counts for empty store', async () => {
      const s = await setupServer();
      try {
        const res = await fetchJson(s.port, '/api/memory/summary');
        expect(res.status).toBe(200);
        expect(res.body.totalTasks).toBe(0);
        expect(res.body.completedTasks).toBe(0);
        expect(res.body.totalArtifacts).toBe(0);
        expect(res.body.archivedArtifacts).toBe(0);
        expect(res.body.staleArtifacts).toBe(0);
      } finally { await s.cleanup(); }
    });

    it('reflects actual task and artifact counts', async () => {
      const s = await setupServer();
      try {
        await s.store.createTask(baseTask({ name: 'Task A' }));
        const t2 = await s.store.createTask(baseTask({ name: 'Task B' }));
        await s.store.completeTask(t2.task_id);
        await s.store.createArtifact(baseArtifact({ name: 'doc-1.md' }));
        const art2 = await s.store.createArtifact(baseArtifact({ name: 'doc-2.md' }));
        await s.store.archiveArtifact(art2.artifact_id, 'Old version');

        const res = await fetchJson(s.port, '/api/memory/summary');
        expect(res.status).toBe(200);
        expect(res.body.totalTasks).toBe(2);
        expect(res.body.completedTasks).toBe(1);
        expect(res.body.totalArtifacts).toBe(2);
        expect(res.body.archivedArtifacts).toBe(1);
      } finally { await s.cleanup(); }
    });
  });

  // ─── Tasks ──────────────────────────────────────────────────────────────

  describe('GET /api/memory/tasks', () => {
    it('returns { tasks: [], total: 0 } for empty store', async () => {
      const s = await setupServer();
      try {
        const res = await fetchJson(s.port, '/api/memory/tasks');
        expect(res.status).toBe(200);
        expect(res.body.tasks).toEqual([]);
        expect(res.body.total).toBe(0);
      } finally { await s.cleanup(); }
    });

    it('returns all tasks without filter', async () => {
      const s = await setupServer();
      try {
        await s.store.createTask(baseTask({ name: 'Task A' }));
        await s.store.createTask(baseTask({ name: 'Task B' }));

        const res = await fetchJson(s.port, '/api/memory/tasks');
        expect(res.status).toBe(200);
        expect(res.body.tasks).toHaveLength(2);
        expect(res.body.total).toBe(2);
      } finally { await s.cleanup(); }
    });

    it('filters by status', async () => {
      const s = await setupServer();
      try {
        await s.store.createTask(baseTask({ name: 'Pending' }));
        const t2 = await s.store.createTask(baseTask({ name: 'Done' }));
        await s.store.completeTask(t2.task_id);

        const res = await fetchJson(s.port, '/api/memory/tasks?status=pending');
        expect(res.status).toBe(200);
        expect(res.body.tasks).toHaveLength(1);
        expect(res.body.tasks[0].name).toBe('Pending');
        expect(res.body.total).toBe(1);
      } finally { await s.cleanup(); }
    });

    it('returns empty for non-matching status filter', async () => {
      const s = await setupServer();
      try {
        await s.store.createTask(baseTask({ name: 'Pending' }));

        const res = await fetchJson(s.port, '/api/memory/tasks?status=completed');
        expect(res.status).toBe(200);
        expect(res.body.tasks).toEqual([]);
        expect(res.body.total).toBe(0);
      } finally { await s.cleanup(); }
    });
  });

  describe('POST /api/memory/tasks', () => {
    it('creates a task and returns it with 201', async () => {
      const s = await setupServer();
      try {
        const res = await fetchJson(s.port, '/api/memory/tasks', {
          method: 'POST',
          body: JSON.stringify({
            project_id: 'proj-001',
            name: 'New task via API',
            description: 'Created through the HTTP API',
            status: 'pending',
            assigned_to: 'agent-api',
            tags: ['api-test'],
          }),
        });
        expect(res.status).toBe(201);
        expect(res.body.task_id).toBeDefined();
        expect(res.body.name).toBe('New task via API');
        expect(res.body.project_id).toBe('proj-001');
        expect(res.body.status).toBe('pending');
        expect(res.body.created_at).toBeDefined();
        expect(res.body.updated_at).toBeDefined();
      } finally { await s.cleanup(); }
    });

    it('returns 400 for missing required fields', async () => {
      const s = await setupServer();
      try {
        const res = await fetchJson(s.port, '/api/memory/tasks', {
          method: 'POST',
          body: JSON.stringify({ description: 'No name or project' }),
        });
        expect(res.status).toBe(400);
      } finally { await s.cleanup(); }
    });

    it('returns 400 for empty name', async () => {
      const s = await setupServer();
      try {
        const res = await fetchJson(s.port, '/api/memory/tasks', {
          method: 'POST',
          body: JSON.stringify({ project_id: 'proj-001', name: '' }),
        });
        expect(res.status).toBe(400);
      } finally { await s.cleanup(); }
    });

    it('returns 400 for empty body', async () => {
      const s = await setupServer();
      try {
        const res = await fetchJson(s.port, '/api/memory/tasks', {
          method: 'POST',
          body: '',
        });
        expect(res.status).toBe(400);
      } finally { await s.cleanup(); }
    });

    it('persists created task — can retrieve via GET', async () => {
      const s = await setupServer();
      try {
        const createRes = await fetchJson(s.port, '/api/memory/tasks', {
          method: 'POST',
          body: JSON.stringify({
            project_id: 'proj-001',
            name: 'Persisted task',
            description: 'Check persistence',
            status: 'in_progress',
            assigned_to: 'agent-1',
          }),
        });
        expect(createRes.status).toBe(201);
        const taskId = createRes.body.task_id;

        const getRes = await fetchJson(s.port, `/api/memory/tasks/${taskId}`);
        expect(getRes.status).toBe(200);
        expect(getRes.body.name).toBe('Persisted task');
        expect(getRes.body.status).toBe('in_progress');
      } finally { await s.cleanup(); }
    });

    it('writes only to project-scoped directory', async () => {
      const s = await setupServer();
      try {
        await fetchJson(s.port, '/api/memory/tasks', {
          method: 'POST',
          body: JSON.stringify({
            project_id: 'proj-001',
            name: 'Scope check',
            description: '',
            status: 'pending',
            assigned_to: 'agent-1',
          }),
        });

        const state = await s.store.getState();
        expect(state.tasks.length).toBeGreaterThanOrEqual(1);
        for (const task of state.tasks) {
          expect(task.project_id).toBe('proj-001');
        }
      } finally { await s.cleanup(); }
    });
  });

  describe('GET /api/memory/tasks/:id', () => {
    it('returns task by ID', async () => {
      const s = await setupServer();
      try {
        const task = await s.store.createTask(baseTask({ name: 'Find me' }));
        const res = await fetchJson(s.port, `/api/memory/tasks/${task.task_id}`);
        expect(res.status).toBe(200);
        expect(res.body.task_id).toBe(task.task_id);
        expect(res.body.name).toBe('Find me');
      } finally { await s.cleanup(); }
    });

    it('returns 404 for non-existent task', async () => {
      const s = await setupServer();
      try {
        const res = await fetchJson(s.port, '/api/memory/tasks/nonexistent-id');
        expect(res.status).toBe(404);
      } finally { await s.cleanup(); }
    });
  });

  describe('PUT /api/memory/tasks/:id/complete', () => {
    it('completes a task', async () => {
      const s = await setupServer();
      try {
        const task = await s.store.createTask(baseTask({ name: 'Complete me' }));
        const res = await fetchJson(s.port, `/api/memory/tasks/${task.task_id}/complete`, {
          method: 'PUT',
        });
        expect(res.status).toBe(200);
        expect(res.body.status).toBe('completed');
        expect(res.body.completed_at).toBeDefined();
        expect(res.body.completed_at).not.toBeNull();
      } finally { await s.cleanup(); }
    });

    it('returns 404 for non-existent task', async () => {
      const s = await setupServer();
      try {
        const res = await fetchJson(s.port, '/api/memory/tasks/nonexistent/complete', {
          method: 'PUT',
        });
        expect(res.status).toBe(404);
      } finally { await s.cleanup(); }
    });

    it('persists completion — summary reflects it', async () => {
      const s = await setupServer();
      try {
        const task = await s.store.createTask(baseTask({ name: 'Complete persist' }));
        await fetchJson(s.port, `/api/memory/tasks/${task.task_id}/complete`, { method: 'PUT' });

        const summaryRes = await fetchJson(s.port, '/api/memory/summary');
        expect(summaryRes.body.completedTasks).toBeGreaterThanOrEqual(1);
      } finally { await s.cleanup(); }
    });
  });

  // ─── Artifacts ──────────────────────────────────────────────────────────

  describe('GET /api/memory/artifacts', () => {
    it('returns { artifacts: [], total: 0 } for empty store', async () => {
      const s = await setupServer();
      try {
        const res = await fetchJson(s.port, '/api/memory/artifacts');
        expect(res.status).toBe(200);
        expect(res.body.artifacts).toEqual([]);
        expect(res.body.total).toBe(0);
      } finally { await s.cleanup(); }
    });

    it('returns all artifacts without filter', async () => {
      const s = await setupServer();
      try {
        await s.store.createArtifact(baseArtifact({ name: 'doc-a.md', type: 'doc' }));
        await s.store.createArtifact(baseArtifact({ name: 'schema-a.json', type: 'schema' }));

        const res = await fetchJson(s.port, '/api/memory/artifacts');
        expect(res.status).toBe(200);
        expect(res.body.artifacts).toHaveLength(2);
        expect(res.body.total).toBe(2);
      } finally { await s.cleanup(); }
    });

    it('filters by status', async () => {
      const s = await setupServer();
      try {
        await s.store.createArtifact(baseArtifact({ name: 'active.md', status: 'active' }));
        const art2 = await s.store.createArtifact(baseArtifact({ name: 'archived.md', status: 'active' }));
        await s.store.archiveArtifact(art2.artifact_id, 'Old');

        const res = await fetchJson(s.port, '/api/memory/artifacts?status=active');
        expect(res.status).toBe(200);
        expect(res.body.artifacts).toHaveLength(1);
        expect(res.body.artifacts[0].name).toBe('active.md');
        expect(res.body.total).toBe(1);
      } finally { await s.cleanup(); }
    });

    it('filters by type', async () => {
      const s = await setupServer();
      try {
        await s.store.createArtifact(baseArtifact({ name: 'doc.md', type: 'doc' }));
        await s.store.createArtifact(baseArtifact({ name: 'schema.json', type: 'schema' }));
        await s.store.createArtifact(baseArtifact({ name: 'doc2.md', type: 'doc' }));

        const res = await fetchJson(s.port, '/api/memory/artifacts?type=doc');
        expect(res.status).toBe(200);
        expect(res.body.artifacts).toHaveLength(2);
        expect(res.body.artifacts.every((a: any) => a.type === 'doc')).toBe(true);
        expect(res.body.total).toBe(2);
      } finally { await s.cleanup(); }
    });

    it('filters by both status and type', async () => {
      const s = await setupServer();
      try {
        await s.store.createArtifact(baseArtifact({ name: 'a.md', type: 'doc', status: 'active' }));
        await s.store.createArtifact(baseArtifact({ name: 'b.md', type: 'doc', status: 'draft' }));
        await s.store.createArtifact(baseArtifact({ name: 'c.json', type: 'schema', status: 'active' }));

        const res = await fetchJson(s.port, '/api/memory/artifacts?status=active&type=doc');
        expect(res.status).toBe(200);
        expect(res.body.artifacts).toHaveLength(1);
        expect(res.body.artifacts[0].name).toBe('a.md');
      } finally { await s.cleanup(); }
    });
  });

  describe('POST /api/memory/artifacts/:id/archive', () => {
    it('archives an artifact', async () => {
      const s = await setupServer();
      try {
        const art = await s.store.createArtifact(baseArtifact({ name: 'archive-me.md' }));
        const res = await fetchJson(s.port, `/api/memory/artifacts/${art.artifact_id}/archive`, {
          method: 'POST',
          body: JSON.stringify({ reason: 'Superseded by v2' }),
        });
        expect(res.status).toBe(200);
        expect(res.body.status).toBe('archived');
        expect(res.body.archived_at).toBeDefined();
        expect(res.body.archive_reason).toBe('Superseded by v2');
      } finally { await s.cleanup(); }
    });

    it('uses default reason when body is empty', async () => {
      const s = await setupServer();
      try {
        const art = await s.store.createArtifact(baseArtifact({ name: 'default-reason.md' }));
        const res = await fetchJson(s.port, `/api/memory/artifacts/${art.artifact_id}/archive`, {
          method: 'POST',
          body: '',
        });
        expect(res.status).toBe(200);
        expect(res.body.status).toBe('archived');
        expect(res.body.archive_reason).toBe('Archived via API');
      } finally { await s.cleanup(); }
    });

    it('returns 404 for non-existent artifact', async () => {
      const s = await setupServer();
      try {
        const res = await fetchJson(s.port, '/api/memory/artifacts/nonexistent/archive', {
          method: 'POST',
          body: JSON.stringify({ reason: 'Test' }),
        });
        expect(res.status).toBe(404);
      } finally { await s.cleanup(); }
    });

    it('persists archive — artifact shows as archived in list', async () => {
      const s = await setupServer();
      try {
        const art = await s.store.createArtifact(baseArtifact({ name: 'persist-archive.md' }));
        await fetchJson(s.port, `/api/memory/artifacts/${art.artifact_id}/archive`, {
          method: 'POST',
          body: JSON.stringify({ reason: 'Old version' }),
        });

        const listRes = await fetchJson(s.port, '/api/memory/artifacts?status=archived');
        expect(listRes.body.artifacts.some((a: any) => a.name === 'persist-archive.md')).toBe(true);
      } finally { await s.cleanup(); }
    });

    it('does not affect other artifacts', async () => {
      const s = await setupServer();
      try {
        const art1 = await s.store.createArtifact(baseArtifact({ name: 'keep.md' }));
        const art2 = await s.store.createArtifact(baseArtifact({ name: 'archive-this.md' }));

        await fetchJson(s.port, `/api/memory/artifacts/${art2.artifact_id}/archive`, {
          method: 'POST',
          body: JSON.stringify({ reason: 'Test' }),
        });

        const activeRes = await fetchJson(s.port, '/api/memory/artifacts?status=active');
        expect(activeRes.body.artifacts.some((a: any) => a.name === 'keep.md')).toBe(true);
        expect(activeRes.body.artifacts.some((a: any) => a.name === 'archive-this.md')).toBe(false);
      } finally { await s.cleanup(); }
    });
  });

  // ─── Backward-compatible alias ──────────────────────────────────────────

  describe('POST /api/memory/artifacts/archive/:id (backward compat)', () => {
    it('works via the legacy path', async () => {
      const s = await setupServer();
      try {
        const art = await s.store.createArtifact(baseArtifact({ name: 'legacy-path.md' }));
        const res = await fetchJson(s.port, `/api/memory/artifacts/archive/${art.artifact_id}`, {
          method: 'POST',
          body: JSON.stringify({ reason: 'Legacy path test' }),
        });
        expect(res.status).toBe(200);
        expect(res.body.status).toBe('archived');
        expect(res.body.archive_reason).toBe('Legacy path test');
      } finally { await s.cleanup(); }
    });

    it('returns 404 for non-existent artifact via legacy path', async () => {
      const s = await setupServer();
      try {
        const res = await fetchJson(s.port, '/api/memory/artifacts/archive/nonexistent', {
          method: 'POST',
          body: JSON.stringify({ reason: 'Test' }),
        });
        expect(res.status).toBe(404);
      } finally { await s.cleanup(); }
    });
  });

  // ─── Error handling ─────────────────────────────────────────────────────

  describe('Error handling', () => {
    it('unknown route returns 404', async () => {
      const s = await setupServer();
      try {
        const res = await fetchJson(s.port, '/api/memory/unknown');
        expect(res.status).toBe(404);
      } finally { await s.cleanup(); }
    });

    it('invalid JSON body returns error', async () => {
      const s = await setupServer();
      try {
        const res = await new Promise<{ status: number; body: any }>((resolve, reject) => {
          const req = httpRequest(`http://127.0.0.1:${s.port}/api/memory/tasks`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
          }, (r: any) => {
            let data = '';
            r.on('data', (c: string) => { data += c; });
            r.on('end', () => {
              try {
                resolve({ status: r.statusCode, body: JSON.parse(data) });
              } catch {
                resolve({ status: r.statusCode, body: data });
              }
            });
          });
          req.on('error', reject);
          req.write('{ bad json');
          req.end();
        });
        expect(res.status).toBeGreaterThanOrEqual(400);
      } finally { await s.cleanup(); }
    });
  });

  // ─── Project scoping ────────────────────────────────────────────────────

  describe('Project scoping', () => {
    it('all writes are scoped to the project root', async () => {
      const s = await setupServer();
      try {
        await fetchJson(s.port, '/api/memory/tasks', {
          method: 'POST',
          body: JSON.stringify({
            project_id: 'proj-scoped',
            name: 'Scoped task',
            description: '',
            status: 'pending',
            assigned_to: 'agent-1',
          }),
        });

        await s.store.createArtifact(baseArtifact({
          name: 'scoped-doc.md',
          project_id: 'proj-scoped',
        }));

        const state = await s.store.getState();
        expect(state.tasks.every(t => t.project_id === 'proj-scoped')).toBe(true);
        expect(state.artifacts.every(a => a.project_id === 'proj-scoped')).toBe(true);
      } finally { await s.cleanup(); }
    });
  });
});
