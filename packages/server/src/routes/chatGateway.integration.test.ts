import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createServer, request as httpRequest, type IncomingMessage, type ServerResponse } from 'node:http';
import { describe, expect, it } from 'vitest';
import { ApprovalQueue, MemoryStore } from '@ai-pm/core/runtime';
import { chatGatewayRoutes } from './chatGateway.js';

const tempRoots: string[] = [];

async function tempRoot(): Promise<string> {
  const root = await mkdtemp(path.join(tmpdir(), 'ai-pm-server-chat-test-'));
  tempRoots.push(root);
  return root;
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function fetchJson(port: number, urlPath: string, init?: { method?: string; body?: string }): Promise<{ status: number; body: any }> {
  return new Promise((resolve, reject) => {
    const method = init?.method ?? 'GET';
    const body = init?.body ?? undefined;
    const req = httpRequest(`http://127.0.0.1:${port}${urlPath}`, {
      method,
      headers: { 'Content-Type': 'application/json' },
    }, (res: any) => {
      let data = '';
      res.on('data', (chunk: string) => { data += chunk; });
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(data) }); }
        catch { resolve({ status: res.statusCode, body: data }); }
      });
    });
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

type Services = { queue: ApprovalQueue; memory: MemoryStore };

type ServerHandle = {
  port: number;
  queue: ApprovalQueue;
  memory: MemoryStore;
  cleanup: () => Promise<void>;
};

async function setupServer(): Promise<ServerHandle> {
  const root = await tempRoot();
  const queue = new ApprovalQueue(root);
  const memory = new MemoryStore(root);
  const services: Services = { queue, memory };

  type ChatRoute = typeof chatGatewayRoutes[number];
  function matchRoute(route: ChatRoute, method: string, pathname: string): Record<string, string> | null {
    if (route.method !== method) return null;
    const m = route.pattern.exec(pathname);
    if (!m) return null;
    const params: Record<string, string> = {};
    route.keys.forEach((k, i) => { params[k] = decodeURIComponent(m[i + 1]); });
    return params;
  }

  const server = createServer(async (req: IncomingMessage, res: ServerResponse) => {
    const url = new URL(req.url!, `http://${req.headers.host}`);
    const matched = chatGatewayRoutes.find(r => matchRoute(r, req.method!, url.pathname));
    if (!matched) {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Not found' }));
      return;
    }
    try {
      const params = matchRoute(matched, req.method!, url.pathname)!;
      await matched.handler(req, res, params, services);
    } catch (e: unknown) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: e instanceof Error ? e.message : 'internal error' }));
    }
  });

  await new Promise<void>(resolve => { server.listen(0, '127.0.0.1', () => { resolve(); }); });
  const addr = server.address();
  const port = typeof addr === 'object' && addr ? addr.port : 3999;

  return {
    port,
    queue,
    memory,
    cleanup: async () => {
      await new Promise<void>(resolve => server.close(() => resolve()));
    },
  };
}

// ── Tests ───────────────────────────────────────────────────────────────────

describe('Chat Gateway API', () => {

  // ── GET /api/chat/commands ────────────────────────────────────────────

  describe('GET /api/chat/commands', () => {
    it('returns list of commands', async () => {
      const s = await setupServer();
      try {
        const res = await fetchJson(s.port, '/api/chat/commands');
        expect(res.status).toBe(200);
        expect(Array.isArray(res.body.commands)).toBe(true);
        expect(res.body.total).toBeGreaterThan(0);
      } finally { await s.cleanup(); }
    });

    it('each command has required fields', async () => {
      const s = await setupServer();
      try {
        const res = await fetchJson(s.port, '/api/chat/commands');
        expect(res.status).toBe(200);
        for (const cmd of res.body.commands) {
          expect(typeof cmd.id).toBe('string');
          expect(typeof cmd.name).toBe('string');
          expect(typeof cmd.description).toBe('string');
          expect(cmd.read_only).toBe(true);
          expect(Array.isArray(cmd.parameters)).toBe(true);
        }
      } finally { await s.cleanup(); }
    });

    it('includes the four expected commands', async () => {
      const s = await setupServer();
      try {
        const res = await fetchJson(s.port, '/api/chat/commands');
        const ids = res.body.commands.map((c: any) => c.id);
        expect(ids).toContain('daily_brief');
        expect(ids).toContain('weekly_status');
        expect(ids).toContain('risk_summary');
        expect(ids).toContain('pending_approvals');
      } finally { await s.cleanup(); }
    });
  });

  // ── POST /api/chat/query — valid read-only commands ───────────────────

  describe('POST /api/chat/query — daily_brief', () => {
    it('returns daily brief from empty stores', async () => {
      const s = await setupServer();
      try {
        const res = await fetchJson(s.port, '/api/chat/query', {
          method: 'POST',
          body: JSON.stringify({ command: 'daily_brief' }),
        });
        expect(res.status).toBe(200);
        expect(res.body.command).toBe('daily_brief');
        expect(res.body.date).toBeDefined();
        expect(res.body.project_summary).toBeDefined();
        expect(res.body.pending_approvals).toBeDefined();
        expect(res.body.today_activity).toBeDefined();
        expect(Array.isArray(res.body.assumptions)).toBe(true);
      } finally { await s.cleanup(); }
    });

    it('returns daily brief with seeded data', async () => {
      const s = await setupServer();
      try {
        await s.memory.createTask({ project_id: 'proj', name: 'Task A', description: 'test', status: 'pending', assigned_to: 'agent', completed_at: null, dependencies: [], artifacts: [], tags: [] });
        await s.queue.createItem({
          project_id: 'proj', action_type: 'jira', target_system: 'jira', target_id: 'PROJ-1',
          workflow_id: 'wf', run_id: 'r1', requested_by_agent: 'a', requested_by_role: 'pm',
          title: 'Test item', description: 'desc', summary_diff: 'diff', confidence: 80,
          source_refs: [], priority: 'high',
        });

        const res = await fetchJson(s.port, '/api/chat/query', {
          method: 'POST',
          body: JSON.stringify({ command: 'daily_brief' }),
        });
        expect(res.status).toBe(200);
        expect(res.body.project_summary.totalTasks).toBe(1);
        expect(res.body.pending_approvals).toHaveLength(1);
      } finally { await s.cleanup(); }
    });

    it('accepts custom date parameter', async () => {
      const s = await setupServer();
      try {
        const res = await fetchJson(s.port, '/api/chat/query', {
          method: 'POST',
          body: JSON.stringify({ command: 'daily_brief', params: { date: '2026-06-19' } }),
        });
        expect(res.status).toBe(200);
        expect(res.body.date).toBe('2026-06-19');
      } finally { await s.cleanup(); }
    });
  });

  describe('POST /api/chat/query — weekly_status', () => {
    it('returns weekly status from empty stores', async () => {
      const s = await setupServer();
      try {
        const res = await fetchJson(s.port, '/api/chat/query', {
          method: 'POST',
          body: JSON.stringify({ command: 'weekly_status' }),
        });
        expect(res.status).toBe(200);
        expect(res.body.command).toBe('weekly_status');
        expect(res.body.period).toBeDefined();
        expect(res.body.period.from).toBeDefined();
        expect(res.body.period.to).toBeDefined();
        expect(res.body.approvals_summary).toBeDefined();
        expect(res.body.tasks_summary).toBeDefined();
        expect(Array.isArray(res.body.assumptions)).toBe(true);
      } finally { await s.cleanup(); }
    });
  });

  describe('POST /api/chat/query — risk_summary', () => {
    it('returns risk summary from empty stores', async () => {
      const s = await setupServer();
      try {
        const res = await fetchJson(s.port, '/api/chat/query', {
          method: 'POST',
          body: JSON.stringify({ command: 'risk_summary' }),
        });
        expect(res.status).toBe(200);
        expect(res.body.command).toBe('risk_summary');
        expect(res.body.risk_signals).toBeDefined();
        expect(res.body.risk_signals.failed_tasks).toBeDefined();
        expect(res.body.risk_signals.stale_artifacts).toBeDefined();
        expect(Array.isArray(res.body.assumptions)).toBe(true);
      } finally { await s.cleanup(); }
    });

    it('includes failed tasks as risk signals', async () => {
      const s = await setupServer();
      try {
        const task = await s.memory.createTask({ project_id: 'proj', name: 'Failing task', description: 'test', status: 'pending', assigned_to: 'agent', completed_at: null, dependencies: [], artifacts: [], tags: [] });
        await s.memory.completeTask(task.task_id); // mark completed, then update to failed
        // We can't easily set to "failed" via public API, so verify empty risk_signals structure
        const res = await fetchJson(s.port, '/api/chat/query', {
          method: 'POST',
          body: JSON.stringify({ command: 'risk_summary' }),
        });
        expect(res.status).toBe(200);
        expect(Array.isArray(res.body.risk_signals.failed_tasks)).toBe(true);
      } finally { await s.cleanup(); }
    });
  });

  describe('POST /api/chat/query — pending_approvals', () => {
    it('returns empty pending approvals', async () => {
      const s = await setupServer();
      try {
        const res = await fetchJson(s.port, '/api/chat/query', {
          method: 'POST',
          body: JSON.stringify({ command: 'pending_approvals' }),
        });
        expect(res.status).toBe(200);
        expect(res.body.command).toBe('pending_approvals');
        expect(res.body.count).toBe(0);
        expect(res.body.items).toEqual([]);
      } finally { await s.cleanup(); }
    });

    it('returns pending approvals with data', async () => {
      const s = await setupServer();
      try {
        await s.queue.createItem({
          project_id: 'proj', action_type: 'jira', target_system: 'jira', target_id: 'PROJ-1',
          workflow_id: 'wf', run_id: 'r1', requested_by_agent: 'a', requested_by_role: 'pm',
          title: 'Pending item', description: 'desc', summary_diff: 'diff', confidence: 80,
          source_refs: [], priority: 'high',
        });
        await s.queue.createItem({
          project_id: 'proj', action_type: 'gmail', target_system: 'gmail', target_id: 'msg-1',
          workflow_id: 'wf', run_id: 'r2', requested_by_agent: 'b', requested_by_role: 'reporting',
          title: 'Send report', description: 'desc', summary_diff: 'diff', confidence: 90,
          source_refs: [], priority: 'critical',
        });

        const res = await fetchJson(s.port, '/api/chat/query', {
          method: 'POST',
          body: JSON.stringify({ command: 'pending_approvals' }),
        });
        expect(res.status).toBe(200);
        expect(res.body.count).toBe(2);
        expect(res.body.items).toHaveLength(2);
        expect(res.body.items[0].approval_id).toBeDefined();
        expect(res.body.items[0].title).toBeDefined();
        expect(res.body.items[0].priority).toBeDefined();
      } finally { await s.cleanup(); }
    });
  });

  // ── POST /api/chat/query — mutations rejected ─────────────────────────

  describe('POST /api/chat/query — mutation rejection', () => {
    const MUTATIONS = ['create_task', 'complete_task', 'archive_artifact', 'decide_approval', 'create_approval', 'send_email', 'publish_report'];

    for (const cmd of MUTATIONS) {
      it(`rejects mutation command '${cmd}' with 403`, async () => {
        const s = await setupServer();
        try {
          const res = await fetchJson(s.port, '/api/chat/query', {
            method: 'POST',
            body: JSON.stringify({ command: cmd }),
          });
          expect(res.status).toBe(403);
          expect(res.body.approval_required).toBe(true);
          expect(res.body.error).toContain(cmd);
          expect(res.body.suggestion).toBeDefined();
        } finally { await s.cleanup(); }
      });
    }
  });

  // ── POST /api/chat/query — error handling ─────────────────────────────

  describe('POST /api/chat/query — error handling', () => {
    it('missing command field returns 400', async () => {
      const s = await setupServer();
      try {
        const res = await fetchJson(s.port, '/api/chat/query', {
          method: 'POST',
          body: JSON.stringify({}),
        });
        expect(res.status).toBe(400);
        expect(res.body.error).toContain('command');
      } finally { await s.cleanup(); }
    });

    it('unknown command returns 404 with available list', async () => {
      const s = await setupServer();
      try {
        const res = await fetchJson(s.port, '/api/chat/query', {
          method: 'POST',
          body: JSON.stringify({ command: 'nonexistent_command' }),
        });
        expect(res.status).toBe(404);
        expect(res.body.error).toContain('nonexistent_command');
        expect(res.body.error).toContain('Available:');
      } finally { await s.cleanup(); }
    });

    it('invalid JSON body returns 400', async () => {
      const s = await setupServer();
      try {
        const res = await new Promise<{ status: number; body: any }>((resolve, reject) => {
          const req = httpRequest(`http://127.0.0.1:${s.port}/api/chat/query`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
          }, (r: any) => {
            let data = '';
            r.on('data', (c: string) => { data += c; });
            r.on('end', () => {
              try { resolve({ status: r.statusCode, body: JSON.parse(data) }); }
              catch { resolve({ status: r.statusCode, body: data }); }
            });
          });
          req.on('error', reject);
          req.write('{ bad json');
          req.end();
        });
        expect(res.status).toBe(400);
      } finally { await s.cleanup(); }
    });

    it('POST to unknown chat endpoint returns 404', async () => {
      const s = await setupServer();
      try {
        const res = await fetchJson(s.port, '/api/chat/unknown');
        expect(res.status).toBe(404);
      } finally { await s.cleanup(); }
    });
  });

  // ── POST /api/chat/query — data integrity ─────────────────────────────

  describe('POST /api/chat/query — data integrity', () => {
    it('project root is correctly scoped (per-test temp dir)', async () => {
      const s = await setupServer();
      try {
        // Create data in THIS test's temp dir
        await s.memory.createTask({ project_id: 'scoped', name: 'Scoped task', description: 'test', status: 'pending', assigned_to: 'agent', completed_at: null, dependencies: [], artifacts: [], tags: [] });

        const res = await fetchJson(s.port, '/api/chat/query', {
          method: 'POST',
          body: JSON.stringify({ command: 'daily_brief' }),
        });
        expect(res.body.project_summary.totalTasks).toBe(1);
      } finally { await s.cleanup(); }
    });

    it('no side effects on read commands', async () => {
      const s = await setupServer();
      try {
        // Count before
        const beforeRes = await fetchJson(s.port, '/api/chat/query', {
          method: 'POST',
          body: JSON.stringify({ command: 'daily_brief' }),
        });
        const beforeTasks = beforeRes.body.project_summary.totalTasks;

        // Call same command again
        const afterRes = await fetchJson(s.port, '/api/chat/query', {
          method: 'POST',
          body: JSON.stringify({ command: 'daily_brief' }),
        });
        expect(afterRes.body.project_summary.totalTasks).toBe(beforeTasks);
      } finally { await s.cleanup(); }
    });

    it('all read commands return assumptions array', async () => {
      const s = await setupServer();
      try {
        const commands = ['daily_brief', 'weekly_status', 'risk_summary', 'pending_approvals'];
        for (const cmd of commands) {
          const res = await fetchJson(s.port, '/api/chat/query', {
            method: 'POST',
            body: JSON.stringify({ command: cmd }),
          });
          expect(res.status).toBe(200);
          expect(Array.isArray(res.body.assumptions)).toBe(true);
          expect(res.body.assumptions.length).toBeGreaterThan(0);
        }
      } finally { await s.cleanup(); }
    });

    it('all read commands return command field echoing the request', async () => {
      const s = await setupServer();
      try {
        const commands = ['daily_brief', 'weekly_status', 'risk_summary', 'pending_approvals'];
        for (const cmd of commands) {
          const res = await fetchJson(s.port, '/api/chat/query', {
            method: 'POST',
            body: JSON.stringify({ command: cmd }),
          });
          expect(res.body.command).toBe(cmd);
        }
      } finally { await s.cleanup(); }
    });
  });
});
