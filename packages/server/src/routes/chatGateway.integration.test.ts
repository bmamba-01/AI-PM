import { mkdtemp, rm, readFile, writeFile, mkdir } from 'node:fs/promises';
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

type Services = { queue: ApprovalQueue; memory: MemoryStore; projectRoot: string };

type ServerHandle = {
  port: number;
  queue: ApprovalQueue;
  memory: MemoryStore;
  projectRoot: string;
  cleanup: () => Promise<void>;
};

async function setupServer(): Promise<ServerHandle> {
  const root = await tempRoot();
  const queue = new ApprovalQueue(root);
  const memory = new MemoryStore(root);
  const services: Services = { queue, memory, projectRoot: root };

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
    projectRoot: root,
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

  // ── GET /api/chat/history ─────────────────────────────────────────────

  describe('GET /api/chat/history', () => {
    it('returns empty history from clean store', async () => {
      const s = await setupServer();
      try {
        const res = await fetchJson(s.port, '/api/chat/history');
        expect(res.status).toBe(200);
        expect(Array.isArray(res.body.records)).toBe(true);
        expect(res.body.total).toBe(0);
      } finally { await s.cleanup(); }
    });

    it('records history after query commands', async () => {
      const s = await setupServer();
      try {
        await fetchJson(s.port, '/api/chat/query', {
          method: 'POST',
          body: JSON.stringify({ command: 'daily_brief' }),
        });

        const res = await fetchJson(s.port, '/api/chat/history');
        expect(res.status).toBe(200);
        expect(res.body.records).toHaveLength(1);
        expect(res.body.records[0].command).toBe('daily_brief');
        expect(res.body.records[0].type).toBe('query');
        expect(res.body.records[0].status).toBe('success');
        expect(res.body.records[0].timestamp).toBeDefined();
      } finally { await s.cleanup(); }
    });

    it('records history after action proposals', async () => {
      const s = await setupServer();
      try {
        await fetchJson(s.port, '/api/chat/action', {
          method: 'POST',
          body: JSON.stringify({ action: 'draft_weekly_report' }),
        });

        const res = await fetchJson(s.port, '/api/chat/history');
        expect(res.status).toBe(200);
        expect(res.body.records).toHaveLength(1);
        expect(res.body.records[0].command).toBe('draft_weekly_report');
        expect(res.body.records[0].type).toBe('action');
        expect(res.body.records[0].status).toBe('approval_required');
      } finally { await s.cleanup(); }
    });

    it('records rejected mutation commands', async () => {
      const s = await setupServer();
      try {
        await fetchJson(s.port, '/api/chat/query', {
          method: 'POST',
          body: JSON.stringify({ command: 'send_email' }),
        });

        const res = await fetchJson(s.port, '/api/chat/history');
        expect(res.status).toBe(200);
        expect(res.body.records).toHaveLength(1);
        expect(res.body.records[0].status).toBe('rejected');
        expect(res.body.records[0].result_summary).toContain('rejected');
      } finally { await s.cleanup(); }
    });

    it('history records are ordered most-recent-first', async () => {
      const s = await setupServer();
      try {
        await fetchJson(s.port, '/api/chat/query', {
          method: 'POST',
          body: JSON.stringify({ command: 'risk_summary' }),
        });
        await fetchJson(s.port, '/api/chat/query', {
          method: 'POST',
          body: JSON.stringify({ command: 'daily_brief' }),
        });

        const res = await fetchJson(s.port, '/api/chat/history');
        expect(res.body.records).toHaveLength(2);
        expect(res.body.records[0].command).toBe('daily_brief');
        expect(res.body.records[1].command).toBe('risk_summary');
      } finally { await s.cleanup(); }
    });

    it('respects limit parameter', async () => {
      const s = await setupServer();
      try {
        for (let i = 0; i < 5; i++) {
          await fetchJson(s.port, '/api/chat/query', {
            method: 'POST',
            body: JSON.stringify({ command: 'daily_brief' }),
          });
        }

        const res = await fetchJson(s.port, '/api/chat/history?limit=3');
        expect(res.status).toBe(200);
        expect(res.body.records).toHaveLength(3);
      } finally { await s.cleanup(); }
    });

    it('persisted to .ai-pm/chat/history.jsonl', async () => {
      const s = await setupServer();
      try {
        await fetchJson(s.port, '/api/chat/query', {
          method: 'POST',
          body: JSON.stringify({ command: 'daily_brief' }),
        });

        const historyPath = path.join(s.projectRoot, '.ai-pm', 'chat', 'history.jsonl');
        const raw = await readFile(historyPath, 'utf-8');
        const lines = raw.trim().split('\n').filter(Boolean);
        expect(lines.length).toBe(1);
        const record = JSON.parse(lines[0]);
        expect(record.command).toBe('daily_brief');
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
        await s.memory.createTask({ project_id: 'proj', name: 'Failing task', description: 'test', status: 'pending', assigned_to: 'agent', completed_at: null, dependencies: [], artifacts: [], tags: [] });
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
        const beforeRes = await fetchJson(s.port, '/api/chat/query', {
          method: 'POST',
          body: JSON.stringify({ command: 'daily_brief' }),
        });
        const beforeTasks = beforeRes.body.project_summary.totalTasks;

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

  // ── POST /api/chat/action — action proposals ──────────────────────────

  describe('POST /api/chat/action — draft_weekly_report', () => {
    it('returns draft without publishing', async () => {
      const s = await setupServer();
      try {
        const res = await fetchJson(s.port, '/api/chat/action', {
          method: 'POST',
          body: JSON.stringify({ action: 'draft_weekly_report' }),
        });
        expect(res.status).toBe(200);
        expect(res.body.action).toBe('draft_weekly_report');
        expect(res.body.approval_required).toBe(true);
        expect(res.body.side_effects).toEqual([]);
        expect(res.body.draft).toBeDefined();
        expect(res.body.draft.title).toContain('Weekly Status Report');
        expect(res.body.suggested_approval).toBeDefined();
        expect(res.body.suggested_approval.action_type).toBe('report_publish');
        expect(Array.isArray(res.body.assumptions)).toBe(true);
      } finally { await s.cleanup(); }
    });

    it('includes project data in draft', async () => {
      const s = await setupServer();
      try {
        await s.memory.createTask({ project_id: 'proj', name: 'Draft task', description: 'test', status: 'completed', assigned_to: 'agent', completed_at: null, dependencies: [], artifacts: [], tags: [] });

        const res = await fetchJson(s.port, '/api/chat/action', {
          method: 'POST',
          body: JSON.stringify({ action: 'draft_weekly_report' }),
        });
        expect(res.status).toBe(200);
        expect(res.body.draft.project_summary.totalTasks).toBe(1);
        expect(res.body.draft.total_completed).toBe(1);
      } finally { await s.cleanup(); }
    });

    it('records in history', async () => {
      const s = await setupServer();
      try {
        await fetchJson(s.port, '/api/chat/action', {
          method: 'POST',
          body: JSON.stringify({ action: 'draft_weekly_report' }),
        });

        const res = await fetchJson(s.port, '/api/chat/history');
        expect(res.body.records).toHaveLength(1);
        expect(res.body.records[0].type).toBe('action');
        expect(res.body.records[0].status).toBe('approval_required');
      } finally { await s.cleanup(); }
    });
  });

  describe('POST /api/chat/action — create_traceability_matrix', () => {
    it('returns matrix from empty stores', async () => {
      const s = await setupServer();
      try {
        const res = await fetchJson(s.port, '/api/chat/action', {
          method: 'POST',
          body: JSON.stringify({ action: 'create_traceability_matrix' }),
        });
        expect(res.status).toBe(200);
        expect(res.body.action).toBe('create_traceability_matrix');
        expect(res.body.approval_required).toBe(true);
        expect(res.body.side_effects).toEqual([]);
        expect(Array.isArray(res.body.matrix)).toBe(true);
        expect(res.body.summary).toBeDefined();
        expect(Array.isArray(res.body.assumptions)).toBe(true);
      } finally { await s.cleanup(); }
    });

    it('maps tasks to artifacts', async () => {
      const s = await setupServer();
      try {
        const task = await s.memory.createTask({ project_id: 'proj', name: 'Task with artifact', description: 'test', status: 'pending', assigned_to: 'agent', completed_at: null, dependencies: [], artifacts: [], tags: [] });
        const art = await s.memory.createArtifact({ project_id: 'proj', name: 'code.ts', path: 'src/code.ts', type: 'code', status: 'active', archived_at: null, archive_reason: null, task_id: task.task_id });
        // Link artifact to task
        await s.memory.updateTask(task.task_id, { artifacts: [art.artifact_id] });

        const res = await fetchJson(s.port, '/api/chat/action', {
          method: 'POST',
          body: JSON.stringify({ action: 'create_traceability_matrix' }),
        });
        expect(res.status).toBe(200);
        expect(res.body.matrix).toHaveLength(1);
        expect(res.body.matrix[0].linked_artifacts).toHaveLength(1);
        expect(res.body.matrix[0].linked_artifacts[0].artifact_id).toBe(art.artifact_id);
      } finally { await s.cleanup(); }
    });
  });

  describe('POST /api/chat/action — run_code_quality_review', () => {
    it('returns review findings without side effects', async () => {
      const s = await setupServer();
      try {
        const res = await fetchJson(s.port, '/api/chat/action', {
          method: 'POST',
          body: JSON.stringify({ action: 'run_code_quality_review' }),
        });
        expect(res.status).toBe(200);
        expect(res.body.action).toBe('run_code_quality_review');
        expect(res.body.approval_required).toBe(true);
        expect(res.body.side_effects).toEqual([]);
        expect(Array.isArray(res.body.findings)).toBe(true);
        expect(res.body.summary).toBeDefined();
        expect(res.body.summary.confidence).toBeDefined();
        expect(Array.isArray(res.body.assumptions)).toBe(true);
      } finally { await s.cleanup(); }
    });

    it('flags stale code artifacts', async () => {
      const s = await setupServer();
      try {
        const art = await s.memory.createArtifact({ project_id: 'proj', name: 'old.ts', path: 'src/old.ts', type: 'code', status: 'active', archived_at: null, archive_reason: null, task_id: null });
        // Backdate the artifact's updated_at to 31 days ago so it qualifies as stale
        await s.memory.updateArtifact(art.artifact_id, { name: 'old.ts' });
        // Manually backdate the file (updateArtifact sets updated_at to now, so we need to read and write directly)
        const state = await s.memory.getState();
        const idx = state.artifacts.findIndex(a => a.artifact_id === art.artifact_id);
        state.artifacts[idx].updated_at = new Date(Date.now() - 31 * 24 * 60 * 60 * 1000).toISOString();
        const { writeFile: wf } = await import('node:fs/promises');
        const fp = path.join(s.projectRoot, '.ai-pm', 'memory', 'state.json');
        await wf(fp, JSON.stringify(state, null, 2), 'utf-8');

        const res = await fetchJson(s.port, '/api/chat/action', {
          method: 'POST',
          body: JSON.stringify({ action: 'run_code_quality_review' }),
        });
        expect(res.status).toBe(200);
        expect(res.body.findings.length).toBeGreaterThan(0);
        expect(res.body.findings[0].type).toBe('stale_code');
        expect(res.body.findings[0].severity).toBe('warning');
      } finally { await s.cleanup(); }
    });
  });

  describe('POST /api/chat/action — request_publication_approval', () => {
    it('returns proposed approval without creating it', async () => {
      const s = await setupServer();
      try {
        const res = await fetchJson(s.port, '/api/chat/action', {
          method: 'POST',
          body: JSON.stringify({ action: 'request_publication_approval', params: { title: 'Weekly client report' } }),
        });
        expect(res.status).toBe(200);
        expect(res.body.action).toBe('request_publication_approval');
        expect(res.body.approval_required).toBe(true);
        expect(res.body.side_effects).toEqual([]);
        expect(res.body.proposed_approval).toBeDefined();
        expect(res.body.proposed_approval.title).toBe('Weekly client report');
        expect(res.body.proposed_approval.action_type).toBe('report_publish');
        expect(res.body.proposed_approval.target_system).toBe('gmail');
        expect(res.body.instructions).toBeDefined();
        expect(Array.isArray(res.body.assumptions)).toBe(true);
      } finally { await s.cleanup(); }
    });

    it('returns error for missing title', async () => {
      const s = await setupServer();
      try {
        const res = await fetchJson(s.port, '/api/chat/action', {
          method: 'POST',
          body: JSON.stringify({ action: 'request_publication_approval' }),
        });
        expect(res.status).toBe(200);
        expect(res.body.error).toContain('title');
      } finally { await s.cleanup(); }
    });

    it('does not create an approval item', async () => {
      const s = await setupServer();
      try {
        const before = await s.queue.listItems();
        expect(before).toHaveLength(0);

        await fetchJson(s.port, '/api/chat/action', {
          method: 'POST',
          body: JSON.stringify({ action: 'request_publication_approval', params: { title: 'Test pub' } }),
        });

        const after = await s.queue.listItems();
        expect(after).toHaveLength(0);
      } finally { await s.cleanup(); }
    });
  });

  // ── POST /api/chat/action — error handling ────────────────────────────

  describe('POST /api/chat/action — error handling', () => {
    it('missing action field returns 400', async () => {
      const s = await setupServer();
      try {
        const res = await fetchJson(s.port, '/api/chat/action', {
          method: 'POST',
          body: JSON.stringify({}),
        });
        expect(res.status).toBe(400);
        expect(res.body.error).toContain('action');
      } finally { await s.cleanup(); }
    });

    it('unknown action returns 404 with available list', async () => {
      const s = await setupServer();
      try {
        const res = await fetchJson(s.port, '/api/chat/action', {
          method: 'POST',
          body: JSON.stringify({ action: 'nonexistent_action' }),
        });
        expect(res.status).toBe(404);
        expect(res.body.error).toContain('nonexistent_action');
        expect(res.body.error).toContain('Available:');
      } finally { await s.cleanup(); }
    });

    it('invalid JSON body returns 400', async () => {
      const s = await setupServer();
      try {
        const res = await new Promise<{ status: number; body: any }>((resolve, reject) => {
          const req = httpRequest(`http://127.0.0.1:${s.port}/api/chat/action`, {
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
  });

  // ── POST /api/chat/action — side-effects check ────────────────────────

  describe('POST /api/chat/action — side-effects guarantee', () => {
    it('all actions return side_effects: []', async () => {
      const s = await setupServer();
      try {
        const actions = ['draft_weekly_report', 'create_traceability_matrix', 'run_code_quality_review', 'request_publication_approval'];
        for (const action of actions) {
          const res = await fetchJson(s.port, '/api/chat/action', {
            method: 'POST',
            body: JSON.stringify({ action, params: { title: 'test' } }),
          });
          expect(res.status).toBe(200);
          expect(res.body.approval_required).toBe(true);
          expect(res.body.side_effects).toEqual([]);
        }
      } finally { await s.cleanup(); }
    });

    it('no data mutations after action execution', async () => {
      const s = await setupServer();
      try {
        const beforeTasks = (await s.memory.listTasks()).length;
        const beforeArts = (await s.memory.listArtifacts()).length;
        const beforeApprovals = (await s.queue.listItems()).length;

        await fetchJson(s.port, '/api/chat/action', {
          method: 'POST',
          body: JSON.stringify({ action: 'draft_weekly_report' }),
        });

        expect((await s.memory.listTasks()).length).toBe(beforeTasks);
        expect((await s.memory.listArtifacts()).length).toBe(beforeArts);
        expect((await s.queue.listItems()).length).toBe(beforeApprovals);
      } finally { await s.cleanup(); }
    });
  });

  // ── History pruning ────────────────────────────────────────────────────

  describe('History pruning', () => {
    it('prunes history when file exceeds 500 lines', async () => {
      const s = await setupServer();
      try {
        // Create directory and history file with 502 lines
        const historyDir = path.join(s.projectRoot, '.ai-pm', 'chat');
        await mkdir(historyDir, { recursive: true });
        const historyPath = path.join(historyDir, 'history.jsonl');
        const lines: string[] = [];
        for (let i = 0; i < 502; i++) {
          lines.push(JSON.stringify({
            id: `old-${i}`, type: 'query', command: 'daily_brief', params: {},
            status: 'success', result_summary: `Record ${i}`, timestamp: new Date().toISOString(),
          }));
        }
        await writeFile(historyPath, lines.join('\n') + '\n');

        // Trigger a new append which should prune
        await fetchJson(s.port, '/api/chat/query', {
          method: 'POST',
          body: JSON.stringify({ command: 'daily_brief' }),
        });

        const raw = await readFile(historyPath, 'utf-8');
        const kept = raw.trim().split('\n').filter(Boolean);
        expect(kept.length).toBeLessThanOrEqual(500);
      } finally { await s.cleanup(); }
    });

    it('does not prune when under 500 lines', async () => {
      const s = await setupServer();
      try {
        // Create directory and history file with 10 lines
        const historyDir = path.join(s.projectRoot, '.ai-pm', 'chat');
        await mkdir(historyDir, { recursive: true });
        const historyPath = path.join(historyDir, 'history.jsonl');
        const lines: string[] = [];
        for (let i = 0; i < 10; i++) {
          lines.push(JSON.stringify({
            id: `rec-${i}`, type: 'query', command: 'daily_brief', params: {},
            status: 'success', result_summary: `Record ${i}`, timestamp: new Date().toISOString(),
          }));
        }
        await writeFile(historyPath, lines.join('\n') + '\n');

        await fetchJson(s.port, '/api/chat/query', {
          method: 'POST',
          body: JSON.stringify({ command: 'daily_brief' }),
        });

        const raw = await readFile(historyPath, 'utf-8');
        const kept = raw.trim().split('\n').filter(Boolean);
        // 10 original + 1 new = 11 (well under 500)
        expect(kept.length).toBe(11);
      } finally { await s.cleanup(); }
    });
  });
});
