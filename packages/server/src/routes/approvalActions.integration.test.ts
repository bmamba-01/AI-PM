import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createServer, request as httpRequest, type IncomingMessage, type ServerResponse } from 'node:http';
import { describe, expect, it } from 'vitest';
import { ApprovalQueue } from '@ai-pm/core/runtime';
import { approvalActionRoutes } from './approvalActions.js';

const tempRoots: string[] = [];

async function tempRoot(): Promise<string> {
  const root = await mkdtemp(path.join(tmpdir(), 'ai-pm-action-test-'));
  tempRoots.push(root);
  return root;
}

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

async function setupServer(): Promise<{ port: number; queue: ApprovalQueue; cleanup: () => Promise<void> }> {
  const root = await tempRoot();
  const queue = new ApprovalQueue(root);

  type Route = typeof approvalActionRoutes[number];
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
    const matched = approvalActionRoutes.find(r => matchRoute(r, req.method!, url.pathname));
    if (!matched) {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Not found' }));
      return;
    }
    try {
      const params = matchRoute(matched, req.method!, url.pathname)!;
      await matched.handler(req, res, params, queue);
    } catch (e: unknown) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: e instanceof Error ? e.message : 'internal error' }));
    }
  });

  await new Promise<void>(resolve => { server.listen(0, '127.0.0.1', () => resolve()); });
  const addr = server.address();
  const port = typeof addr === 'object' && addr ? addr.port : 3999;

  return {
    port,
    queue,
    cleanup: async () => { await new Promise<void>(resolve => server.close(() => resolve())); },
  };
}

function basePropose() {
  return {
    project_id: 'proj-test',
    action_type: 'jira_issue_create',
    target_system: 'jira',
    target_id: 'PROJ-1',
    workflow_id: 'test-wf',
    title: 'Test action',
    description: 'A test action',
    summary_diff: 'Creates Jira issue',
    confidence: 85,
    source_refs: [{ type: 'transcript', id: 'mtg-001', title: 'Test meeting' }],
    priority: 'high' as const,
    requested_by_agent: 'chat-agent',
    requested_by_role: 'pm_commander',
  };
}

describe('Approval Actions API', () => {
  describe('POST /api/approval-actions/propose', () => {
    it('creates a pending approval item', async () => {
      const s = await setupServer();
      try {
        const res = await fetchJson(s.port, '/api/approval-actions/propose', {
          method: 'POST',
          body: JSON.stringify(basePropose()),
        });
        expect(res.status).toBe(201);
        expect(res.body.approval_id).toBeDefined();
        expect(res.body.status).toBe('pending');
        expect(res.body.message).toContain('queued');
      } finally { await s.cleanup(); }
    });

    it('rejects invalid propose (missing title)', async () => {
      const s = await setupServer();
      try {
        const res = await fetchJson(s.port, '/api/approval-actions/propose', {
          method: 'POST',
          body: JSON.stringify({ title: '' }),
        });
        expect(res.status).toBe(400);
      } finally { await s.cleanup(); }
    });
  });

  describe('POST /api/approval-actions/:id/approve', () => {
    it('approves a pending item', async () => {
      const s = await setupServer();
      try {
        const created = await s.queue.createItem(basePropose());
        const res = await fetchJson(s.port, `/api/approval-actions/${created.approval_id}/approve`, {
          method: 'POST',
          body: JSON.stringify({ decided_by: 'chat-user' }),
        });
        expect(res.status).toBe(200);
        expect(res.body.status).toBe('approved');
        expect(res.body.decision).toBe('approve');
      } finally { await s.cleanup(); }
    });

    it('cannot approve non-existent item', async () => {
      const s = await setupServer();
      try {
        const res = await fetchJson(s.port, '/api/approval-actions/fake-id/approve', {
          method: 'POST',
          body: JSON.stringify({ decided_by: 'chat-user' }),
        });
        expect(res.status).toBe(400);
      } finally { await s.cleanup(); }
    });
  });

  describe('POST /api/approval-actions/:id/reject', () => {
    it('rejects a pending item with reason', async () => {
      const s = await setupServer();
      try {
        const created = await s.queue.createItem(basePropose());
        const res = await fetchJson(s.port, `/api/approval-actions/${created.approval_id}/reject`, {
          method: 'POST',
          body: JSON.stringify({ decided_by: 'chat-user', reason: 'Not needed right now' }),
        });
        expect(res.status).toBe(200);
        expect(res.body.status).toBe('rejected');
      } finally { await s.cleanup(); }
    });

    it('rejects without reason still works (chat can provide default)', async () => {
      const s = await setupServer();
      try {
        const created = await s.queue.createItem(basePropose());
        const res = await fetchJson(s.port, `/api/approval-actions/${created.approval_id}/reject`, {
          method: 'POST',
          body: JSON.stringify({ decided_by: 'chat-user' }),
        });
        expect(res.status).toBe(200);
        expect(res.body.status).toBe('rejected');
      } finally { await s.cleanup(); }
    });
  });

  describe('POST /api/approval-actions/:id/revision', () => {
    it('requests revision with notes', async () => {
      const s = await setupServer();
      try {
        const created = await s.queue.createItem(basePropose());
        const res = await fetchJson(s.port, `/api/approval-actions/${created.approval_id}/revision`, {
          method: 'POST',
          body: JSON.stringify({ decided_by: 'chat-user', notes: 'Add more detail to the summary' }),
        });
        expect(res.status).toBe(200);
        expect(res.body.status).toBe('revision_requested');
      } finally { await s.cleanup(); }
    });
  });

  describe('404 handling', () => {
    it('returns 404 for unknown route', async () => {
      const s = await setupServer();
      try {
        const res = await fetchJson(s.port, '/api/approval-actions/unknown-route');
        expect(res.status).toBe(404);
      } finally { await s.cleanup(); }
    });
  });
});
