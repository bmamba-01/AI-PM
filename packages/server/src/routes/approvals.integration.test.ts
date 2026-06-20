import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createServer, request as httpRequest, type IncomingMessage, type ServerResponse } from 'node:http';
import { describe, expect, it } from 'vitest';
import { ApprovalQueue, type ApprovalItem } from '@ai-pm/core/runtime';
import { approvalRoutes } from './approvals.js';

const tempRoots: string[] = [];

async function tempRoot(): Promise<string> {
  const root = await mkdtemp(path.join(tmpdir(), 'ai-pm-server-approval-test-'));
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

function baseInput(overrides?: Partial<typeof defaultInput>) {
  return { ...defaultInput, ...overrides };
}

const defaultInput = {
  project_id: 'proj-test',
  action_type: 'jira_issue_create',
  target_system: 'jira',
  target_id: 'PROJ-1',
  workflow_id: 'test-workflow',
  run_id: 'run-001',
  requested_by_agent: 'agent-test',
  requested_by_role: 'pm_commander',
  title: 'Test approval item',
  description: 'A test item for the server.',
  summary_diff: 'Creates Jira issue.',
  confidence: 85,
  source_refs: [{ type: 'transcript', id: 'mtg-001', title: 'Test meeting' }] as ApprovalItem['source_refs'],
  priority: 'high' as const,
};

type ServerHandle = { port: number; queue: ApprovalQueue; cleanup: () => Promise<void> };

async function setupServer(): Promise<ServerHandle> {
  const root = await tempRoot();
  const queue = new ApprovalQueue(root);

  type Route = typeof approvalRoutes[number];
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
    const matched = approvalRoutes.find(r => matchRoute(r, req.method!, url.pathname));
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

  await new Promise<void>(resolve => {
    server.listen(0, '127.0.0.1', () => { resolve(); });
  });

  const addr = server.address();
  const port = typeof addr === 'object' && addr ? addr.port : 3999;

  return {
    port,
    queue,
    cleanup: async () => {
      await new Promise<void>(resolve => server.close(() => resolve()));
    },
  };
}

// ── Tests ───────────────────────────────────────────────────────────────────

describe('Approval API routes', () => {
  // ─── CRUD: List ────────────────────────────────────────────────────────

  describe('GET /api/approvals', () => {
    it('returns empty array for empty store', async () => {
      const s = await setupServer();
      try {
        const res = await fetchJson(s.port, '/api/approvals');
        expect(res.status).toBe(200);
        expect(Array.isArray(res.body)).toBe(true);
        expect(res.body).toHaveLength(0);
      } finally { await s.cleanup(); }
    });

    it('returns all items after creating them', async () => {
      const s = await setupServer();
      try {
        await s.queue.createItem(baseInput({ title: 'Item A' }));
        await s.queue.createItem(baseInput({ title: 'Item B' }));

        const res = await fetchJson(s.port, '/api/approvals');
        expect(res.status).toBe(200);
        expect(res.body).toHaveLength(2);
        expect(res.body.every((i: any) => i.title === 'Item A' || i.title === 'Item B')).toBe(true);
      } finally { await s.cleanup(); }
    });

    it('returns items sorted by priority (critical > high > medium > low)', async () => {
      const s = await setupServer();
      try {
        await s.queue.createItem(baseInput({ priority: 'low', title: 'Low' }));
        await s.queue.createItem(baseInput({ priority: 'critical', title: 'Critical' }));
        await s.queue.createItem(baseInput({ priority: 'medium', title: 'Medium' }));
        await s.queue.createItem(baseInput({ priority: 'high', title: 'High' }));

        const res = await fetchJson(s.port, '/api/approvals');
        expect(res.status).toBe(200);
        expect(res.body).toHaveLength(4);
        expect(res.body[0].priority).toBe('critical');
        expect(res.body[1].priority).toBe('high');
        expect(res.body[2].priority).toBe('medium');
        expect(res.body[3].priority).toBe('low');
      } finally { await s.cleanup(); }
    });

    it('filters by status', async () => {
      const s = await setupServer();
      try {
        const item = await s.queue.createItem(baseInput({ title: 'Pending' }));
        await s.queue.createItem(baseInput({ title: 'Also Pending' }));
        await s.queue.decide(item.approval_id, { decided_by: 'pm', decision: 'approve' });

        const res = await fetchJson(s.port, '/api/approvals?status=pending');
        expect(res.status).toBe(200);
        expect(res.body).toHaveLength(1);
        expect(res.body[0].title).toBe('Also Pending');
        expect(res.body[0].status).toBe('pending');
      } finally { await s.cleanup(); }
    });

    it('filters by priority', async () => {
      const s = await setupServer();
      try {
        await s.queue.createItem(baseInput({ priority: 'critical', title: 'Critical' }));
        await s.queue.createItem(baseInput({ priority: 'low', title: 'Low' }));
        await s.queue.createItem(baseInput({ priority: 'critical', title: 'Critical 2' }));

        const res = await fetchJson(s.port, '/api/approvals?priority=critical');
        expect(res.status).toBe(200);
        expect(res.body).toHaveLength(2);
        expect(res.body.every((i: any) => i.priority === 'critical')).toBe(true);
      } finally { await s.cleanup(); }
    });
  });

  // ─── CRUD: Counts ──────────────────────────────────────────────────────

  describe('GET /api/approvals/counts', () => {
    it('returns empty object for empty store', async () => {
      const s = await setupServer();
      try {
        const res = await fetchJson(s.port, '/api/approvals/counts');
        expect(res.status).toBe(200);
        expect(res.body).toEqual({});
      } finally { await s.cleanup(); }
    });

    it('returns correct counts after creates and decides', async () => {
      const s = await setupServer();
      try {
        const i1 = await s.queue.createItem(baseInput({ title: 'A' }));
        const i2 = await s.queue.createItem(baseInput({ title: 'B' }));
        await s.queue.createItem(baseInput({ title: 'C' }));
        await s.queue.decide(i1.approval_id, { decided_by: 'pm', decision: 'approve' });
        await s.queue.decide(i2.approval_id, { decided_by: 'pm', decision: 'reject', reason: 'Not needed for production use' });

        const res = await fetchJson(s.port, '/api/approvals/counts');
        expect(res.status).toBe(200);
        expect(res.body.pending).toBe(1);
        expect(res.body.approved).toBe(1);
        expect(res.body.rejected).toBe(1);
      } finally { await s.cleanup(); }
    });

    it('GET /api/approvals/count is alias for /api/approvals/counts', async () => {
      const s = await setupServer();
      try {
        await s.queue.createItem(baseInput({ title: 'Count item' }));
        const counts1 = await fetchJson(s.port, '/api/approvals/counts');
        const counts2 = await fetchJson(s.port, '/api/approvals/count');
        expect(counts1.body).toEqual(counts2.body);
        expect(counts1.body.pending).toBeGreaterThanOrEqual(1);
      } finally { await s.cleanup(); }
    });
  });

  // ─── CRUD: Get single ──────────────────────────────────────────────────

  describe('GET /api/approvals/:id', () => {
    it('returns single item by ID', async () => {
      const s = await setupServer();
      try {
        const item = await s.queue.createItem(baseInput({ title: 'Find me' }));
        const res = await fetchJson(s.port, `/api/approvals/${item.approval_id}`);
        expect(res.status).toBe(200);
        expect(res.body.approval_id).toBe(item.approval_id);
        expect(res.body.title).toBe('Find me');
      } finally { await s.cleanup(); }
    });

    it('returns 404 for non-existent ID', async () => {
      const s = await setupServer();
      try {
        const res = await fetchJson(s.port, '/api/approvals/nonexistent-id');
        expect(res.status).toBe(404);
      } finally { await s.cleanup(); }
    });
  });

  // ─── CRUD: Create ──────────────────────────────────────────────────────

  describe('POST /api/approvals', () => {
    it('creates item with all required fields', async () => {
      const s = await setupServer();
      try {
        const res = await fetchJson(s.port, '/api/approvals', {
          method: 'POST',
          body: JSON.stringify(baseInput()),
        });
        expect(res.status).toBe(201);
        expect(res.body.approval_id).toBeDefined();
        expect(res.body.status).toBe('pending');
        expect(res.body.title).toBe('Test approval item');
        expect(res.body.priority).toBe('high');
        expect(res.body.confidence).toBe(85);
        expect(res.body.created_at).toBeDefined();
        expect(res.body.updated_at).toBeDefined();
      } finally { await s.cleanup(); }
    });

    it('returns 400 for missing required fields', async () => {
      const s = await setupServer();
      try {
        const res = await fetchJson(s.port, '/api/approvals', {
          method: 'POST',
          body: JSON.stringify({ title: '' }),
        });
        expect(res.status).toBe(400);
      } finally { await s.cleanup(); }
    });

    it('returns 400 for invalid confidence (>100)', async () => {
      const s = await setupServer();
      try {
        const res = await fetchJson(s.port, '/api/approvals', {
          method: 'POST',
          body: JSON.stringify(baseInput({ confidence: 101 })),
        });
        expect(res.status).toBe(400);
      } finally { await s.cleanup(); }
    });

    it('returns 400 for empty body', async () => {
      const s = await setupServer();
      try {
        const res = await fetchJson(s.port, '/api/approvals', {
          method: 'POST',
          body: '',
        });
        expect(res.status).toBe(400);
      } finally { await s.cleanup(); }
    });

    it('persists and can be retrieved', async () => {
      const s = await setupServer();
      try {
        const createRes = await fetchJson(s.port, '/api/approvals', {
          method: 'POST',
          body: JSON.stringify(baseInput({ title: 'Persisted' })),
        });
        expect(createRes.status).toBe(201);

        const getRes = await fetchJson(s.port, `/api/approvals/${createRes.body.approval_id}`);
        expect(getRes.status).toBe(200);
        expect(getRes.body.title).toBe('Persisted');
      } finally { await s.cleanup(); }
    });
  });

  // ─── Decision: Approve ─────────────────────────────────────────────────

  describe('POST /api/approvals/:id/decide — approve', () => {
    it('approves pending item', async () => {
      const s = await setupServer();
      try {
        const item = await s.queue.createItem(baseInput({ title: 'Approve me' }));
        const res = await fetchJson(s.port, `/api/approvals/${item.approval_id}/decide`, {
          method: 'POST',
          body: JSON.stringify({ decided_by: 'api-user', decision: 'approve' }),
        });
        expect(res.status).toBe(200);
        expect(res.body.status).toBe('approved');
        expect(res.body.decided_by).toBe('api-user');
        expect(res.body.decided_at).toBeDefined();
        expect(res.body.decision).toBe('approve');
      } finally { await s.cleanup(); }
    });

    it('persists approval — item reflects in store', async () => {
      const s = await setupServer();
      try {
        const item = await s.queue.createItem(baseInput({ title: 'Persist approve' }));
        await fetchJson(s.port, `/api/approvals/${item.approval_id}/decide`, {
          method: 'POST',
          body: JSON.stringify({ decided_by: 'pm', decision: 'approve' }),
        });

        const getRes = await fetchJson(s.port, `/api/approvals/${item.approval_id}`);
        expect(getRes.body.status).toBe('approved');
        expect(getRes.body.decision).toBe('approve');
      } finally { await s.cleanup(); }
    });
  });

  // ─── Decision: Reject ──────────────────────────────────────────────────

  describe('POST /api/approvals/:id/decide — reject', () => {
    it('rejects item with reason', async () => {
      const s = await setupServer();
      try {
        const item = await s.queue.createItem(baseInput({ title: 'Reject me' }));
        const res = await fetchJson(s.port, `/api/approvals/${item.approval_id}/decide`, {
          method: 'POST',
          body: JSON.stringify({ decided_by: 'api-user', decision: 'reject', reason: 'Not good enough for production' }),
        });
        expect(res.status).toBe(200);
        expect(res.body.status).toBe('rejected');
        expect(res.body.rejection_reason).toBe('Not good enough for production');
        expect(res.body.decision).toBe('reject');
      } finally { await s.cleanup(); }
    });

    it('rejects with short reason returns 400', async () => {
      const s = await setupServer();
      try {
        const item = await s.queue.createItem(baseInput({ title: 'Short reason' }));
        const res = await fetchJson(s.port, `/api/approvals/${item.approval_id}/decide`, {
          method: 'POST',
          body: JSON.stringify({ decided_by: 'api-user', decision: 'reject', reason: 'short' }),
        });
        expect(res.status).toBe(400);
      } finally { await s.cleanup(); }
    });

    it('rejects without reason returns 400', async () => {
      const s = await setupServer();
      try {
        const item = await s.queue.createItem(baseInput({ title: 'No reason' }));
        const res = await fetchJson(s.port, `/api/approvals/${item.approval_id}/decide`, {
          method: 'POST',
          body: JSON.stringify({ decided_by: 'api-user', decision: 'reject' }),
        });
        expect(res.status).toBe(400);
      } finally { await s.cleanup(); }
    });
  });

  // ─── Decision: Revision ────────────────────────────────────────────────

  describe('POST /api/approvals/:id/decide — revision', () => {
    it('requests revision with notes', async () => {
      const s = await setupServer();
      try {
        const item = await s.queue.createItem(baseInput({ title: 'Revise me' }));
        const res = await fetchJson(s.port, `/api/approvals/${item.approval_id}/decide`, {
          method: 'POST',
          body: JSON.stringify({ decided_by: 'api-user', decision: 'revision_requested', notes: 'Add more detail to the summary' }),
        });
        expect(res.status).toBe(200);
        expect(res.body.status).toBe('revision_requested');
        expect(res.body.revision_notes).toBe('Add more detail to the summary');
      } finally { await s.cleanup(); }
    });

    it('revision without notes returns 400', async () => {
      const s = await setupServer();
      try {
        const item = await s.queue.createItem(baseInput({ title: 'Revise no notes' }));
        const res = await fetchJson(s.port, `/api/approvals/${item.approval_id}/decide`, {
          method: 'POST',
          body: JSON.stringify({ decided_by: 'api-user', decision: 'revision_requested' }),
        });
        expect(res.status).toBe(400);
      } finally { await s.cleanup(); }
    });
  });

  // ─── Decision: Invalid transitions ─────────────────────────────────────

  describe('POST /api/approvals/:id/decide — invalid transitions', () => {
    it('reject already-approved item returns 400', async () => {
      const s = await setupServer();
      try {
        const item = await s.queue.createItem(baseInput({ title: 'Already approved' }));
        await s.queue.decide(item.approval_id, { decided_by: 'pm', decision: 'approve' });

        const res = await fetchJson(s.port, `/api/approvals/${item.approval_id}/decide`, {
          method: 'POST',
          body: JSON.stringify({ decided_by: 'pm', decision: 'reject', reason: 'Changed my mind for testing' }),
        });
        expect(res.status).toBe(400);
        expect(typeof res.body.error).toBe('string');
        expect(res.body.error).toContain('Cannot');
      } finally { await s.cleanup(); }
    });

    it('approve already-rejected item returns 400', async () => {
      const s = await setupServer();
      try {
        const item = await s.queue.createItem(baseInput({ title: 'Already rejected' }));
        await s.queue.decide(item.approval_id, { decided_by: 'pm', decision: 'reject', reason: 'Rejected for testing purposes' });

        const res = await fetchJson(s.port, `/api/approvals/${item.approval_id}/decide`, {
          method: 'POST',
          body: JSON.stringify({ decided_by: 'pm', decision: 'approve' }),
        });
        expect(res.status).toBe(400);
      } finally { await s.cleanup(); }
    });

    it('decide on non-existent item returns 404', async () => {
      const s = await setupServer();
      try {
        const res = await fetchJson(s.port, '/api/approvals/nonexistent/decide', {
          method: 'POST',
          body: JSON.stringify({ decided_by: 'api-user', decision: 'approve' }),
        });
        expect(res.status).toBe(404);
      } finally { await s.cleanup(); }
    });
  });

  // ─── Resubmit ──────────────────────────────────────────────────────────

  describe('POST /api/approvals/:id/resubmit', () => {
    it('resubmit after revision increments round', async () => {
      const s = await setupServer();
      try {
        const item = await s.queue.createItem(baseInput({ title: 'Resubmit me' }));
        await s.queue.decide(item.approval_id, { decided_by: 'pm', decision: 'revision_requested', notes: 'Need changes before approving' });

        const res = await fetchJson(s.port, `/api/approvals/${item.approval_id}/resubmit`, {
          method: 'POST',
          body: JSON.stringify({ summary_diff: 'Updated with requested changes' }),
        });
        expect(res.status).toBe(200);
        expect(res.body.status).toBe('pending');
        expect(res.body.revision_round).toBe(1);
        expect(res.body.summary_diff).toBe('Updated with requested changes');
      } finally { await s.cleanup(); }
    });

    it('resubmit on non-revision item returns 400', async () => {
      const s = await setupServer();
      try {
        const item = await s.queue.createItem(baseInput({ title: 'Not revisable' }));
        const res = await fetchJson(s.port, `/api/approvals/${item.approval_id}/resubmit`, {
          method: 'POST',
          body: JSON.stringify({ summary_diff: 'Attempt resubmit' }),
        });
        expect(res.status).toBe(400);
        expect(res.body.error).toContain('revision_requested');
      } finally { await s.cleanup(); }
    });

    it('resubmit on non-existent item returns 404', async () => {
      const s = await setupServer();
      try {
        const res = await fetchJson(s.port, '/api/approvals/nonexistent/resubmit', {
          method: 'POST',
          body: JSON.stringify({ summary_diff: 'Does not exist' }),
        });
        expect(res.status).toBe(404);
      } finally { await s.cleanup(); }
    });

    it('multiple revision rounds track correctly', async () => {
      const s = await setupServer();
      try {
        const item = await s.queue.createItem(baseInput({ title: 'Multi-revise' }));

        // Round 1
        await s.queue.decide(item.approval_id, { decided_by: 'pm', decision: 'revision_requested', notes: 'Round 1 notes' });
        const r1 = await fetchJson(s.port, `/api/approvals/${item.approval_id}/resubmit`, {
          method: 'POST',
          body: JSON.stringify({ summary_diff: 'Revision 1' }),
        });
        expect(r1.body.revision_round).toBe(1);
        expect(r1.body.status).toBe('pending');

        // Round 2
        await s.queue.decide(item.approval_id, { decided_by: 'pm', decision: 'revision_requested', notes: 'Round 2 notes' });
        const r2 = await fetchJson(s.port, `/api/approvals/${item.approval_id}/resubmit`, {
          method: 'POST',
          body: JSON.stringify({ summary_diff: 'Revision 2' }),
        });
        expect(r2.body.revision_round).toBe(2);
        expect(r2.body.summary_diff).toBe('Revision 2');
      } finally { await s.cleanup(); }
    });
  });

  // ─── Edge cases ────────────────────────────────────────────────────────

  describe('Edge cases', () => {
    it('invalid JSON body returns 400', async () => {
      const s = await setupServer();
      try {
        const res = await new Promise<{ status: number; body: any }>((resolve, reject) => {
          const req = httpRequest(`http://127.0.0.1:${s.port}/api/approvals`, {
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
        expect(res.status).toBe(400);
      } finally { await s.cleanup(); }
    });

    it('unknown route returns 404', async () => {
      const s = await setupServer();
      try {
        const res = await fetchJson(s.port, '/api/approvals/unknown-path');
        expect(res.status).toBe(404);
      } finally { await s.cleanup(); }
    });

    it('multiple creates → correct counts', async () => {
      const s = await setupServer();
      try {
        await s.queue.createItem(baseInput({ title: 'A' }));
        await s.queue.createItem(baseInput({ title: 'B' }));
        await s.queue.createItem(baseInput({ title: 'C' }));

        const countsRes = await fetchJson(s.port, '/api/approvals/counts');
        expect(countsRes.body.pending).toBe(3);

        const listRes = await fetchJson(s.port, '/api/approvals');
        expect(listRes.body).toHaveLength(3);
      } finally { await s.cleanup(); }
    });

    it('create → decide → verify full lifecycle state', async () => {
      const s = await setupServer();
      try {
        // Create
        const createRes = await fetchJson(s.port, '/api/approvals', {
          method: 'POST',
          body: JSON.stringify(baseInput({ title: 'Lifecycle test' })),
        });
        expect(createRes.status).toBe(201);
        const id = createRes.body.approval_id;
        expect(createRes.body.status).toBe('pending');

        // Approve
        const decideRes = await fetchJson(s.port, `/api/approvals/${id}/decide`, {
          method: 'POST',
          body: JSON.stringify({ decided_by: 'pm', decision: 'approve' }),
        });
        expect(decideRes.status).toBe(200);
        expect(decideRes.body.status).toBe('approved');
        expect(decideRes.body.decided_at).toBeDefined();
        expect(decideRes.body.decision).toBe('approve');

        // Verify persisted
        const getRes = await fetchJson(s.port, `/api/approvals/${id}`);
        expect(getRes.body.status).toBe('approved');
        expect(getRes.body.decided_by).toBe('pm');

        // Counts updated
        const countsRes = await fetchJson(s.port, '/api/approvals/counts');
        expect(countsRes.body.approved).toBe(1);
        expect(countsRes.body.pending ?? 0).toBe(0);
      } finally { await s.cleanup(); }
    });

    it('create → reject → verify lifecycle with rejection reason', async () => {
      const s = await setupServer();
      try {
        const createRes = await fetchJson(s.port, '/api/approvals', {
          method: 'POST',
          body: JSON.stringify(baseInput({ title: 'Reject lifecycle' })),
        });
        const id = createRes.body.approval_id;

        const decideRes = await fetchJson(s.port, `/api/approvals/${id}/decide`, {
          method: 'POST',
          body: JSON.stringify({ decided_by: 'pm', decision: 'reject', reason: 'Does not meet quality bar for production deployment' }),
        });
        expect(decideRes.status).toBe(200);
        expect(decideRes.body.status).toBe('rejected');
        expect(decideRes.body.rejection_reason).toBe('Does not meet quality bar for production deployment');

        // Cannot decide again
        const retryRes = await fetchJson(s.port, `/api/approvals/${id}/decide`, {
          method: 'POST',
          body: JSON.stringify({ decided_by: 'pm', decision: 'approve' }),
        });
        expect(retryRes.status).toBe(400);
      } finally { await s.cleanup(); }
    });

    it('create → revision → resubmit → approve full revision cycle', async () => {
      const s = await setupServer();
      try {
        const createRes = await fetchJson(s.port, '/api/approvals', {
          method: 'POST',
          body: JSON.stringify(baseInput({ title: 'Revision cycle' })),
        });
        const id = createRes.body.approval_id;

        // Request revision
        const revRes = await fetchJson(s.port, `/api/approvals/${id}/decide`, {
          method: 'POST',
          body: JSON.stringify({ decided_by: 'pm', decision: 'revision_requested', notes: 'Needs more detail on migration steps' }),
        });
        expect(revRes.body.status).toBe('revision_requested');

        // Resubmit
        const resubmitRes = await fetchJson(s.port, `/api/approvals/${id}/resubmit`, {
          method: 'POST',
          body: JSON.stringify({ summary_diff: 'Added detailed migration steps and rollback plan' }),
        });
        expect(resubmitRes.body.status).toBe('pending');
        expect(resubmitRes.body.revision_round).toBe(1);

        // Now approve
        const approveRes = await fetchJson(s.port, `/api/approvals/${id}/decide`, {
          method: 'POST',
          body: JSON.stringify({ decided_by: 'pm', decision: 'approve' }),
        });
        expect(approveRes.body.status).toBe('approved');

        // Verify full state
        const getRes = await fetchJson(s.port, `/api/approvals/${id}`);
        expect(getRes.body.status).toBe('approved');
        expect(getRes.body.revision_round).toBe(1);
        expect(getRes.body.summary_diff).toBe('Added detailed migration steps and rollback plan');
      } finally { await s.cleanup(); }
    });

    it('confidence boundary: 0 and 100 are valid', async () => {
      const s = await setupServer();
      try {
        const res0 = await fetchJson(s.port, '/api/approvals', {
          method: 'POST',
          body: JSON.stringify(baseInput({ confidence: 0, title: 'Zero confidence' })),
        });
        expect(res0.status).toBe(201);
        expect(res0.body.confidence).toBe(0);

        const res100 = await fetchJson(s.port, '/api/approvals', {
          method: 'POST',
          body: JSON.stringify(baseInput({ confidence: 100, title: 'Max confidence' })),
        });
        expect(res100.status).toBe(201);
        expect(res100.body.confidence).toBe(100);
      } finally { await s.cleanup(); }
    });

    it('confidence boundary: -1 and 101 are invalid', async () => {
      const s = await setupServer();
      try {
        const resNeg = await fetchJson(s.port, '/api/approvals', {
          method: 'POST',
          body: JSON.stringify(baseInput({ confidence: -1 })),
        });
        expect(resNeg.status).toBe(400);

        const resOver = await fetchJson(s.port, '/api/approvals', {
          method: 'POST',
          body: JSON.stringify(baseInput({ confidence: 101 })),
        });
        expect(resOver.status).toBe(400);
      } finally { await s.cleanup(); }
    });

    it('empty approval list with status filter returns empty', async () => {
      const s = await setupServer();
      try {
        const res = await fetchJson(s.port, '/api/approvals?status=executed');
        expect(res.status).toBe(200);
        expect(res.body).toEqual([]);
      } finally { await s.cleanup(); }
    });

    it('all terminal states reject further decisions', async () => {
      const s = await setupServer();
      try {
        // Rejected is terminal
        const rejected = await s.queue.createItem(baseInput({ title: 'Terminal rejected' }));
        await s.queue.decide(rejected.approval_id, { decided_by: 'pm', decision: 'reject', reason: 'Rejected for testing terminal state' });
        const r1 = await fetchJson(s.port, `/api/approvals/${rejected.approval_id}/decide`, {
          method: 'POST',
          body: JSON.stringify({ decided_by: 'pm', decision: 'approve' }),
        });
        expect(r1.status).toBe(400);

        // Approved → executing → executed is terminal
        const approved = await s.queue.createItem(baseInput({ title: 'Terminal executed' }));
        await s.queue.decide(approved.approval_id, { decided_by: 'pm', decision: 'approve' });
        const r2 = await fetchJson(s.port, `/api/approvals/${approved.approval_id}/decide`, {
          method: 'POST',
          body: JSON.stringify({ decided_by: 'pm', decision: 'reject', reason: 'Testing terminal executed state' }),
        });
        expect(r2.status).toBe(400);
      } finally { await s.cleanup(); }
    });
  });
});
