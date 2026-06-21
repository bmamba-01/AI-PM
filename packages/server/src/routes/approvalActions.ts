import { type IncomingMessage, type ServerResponse } from 'node:http';
import { ApprovalQueue, type ApprovalDecision } from '@ai-pm/core/runtime';
import { readJSON, json, err } from '../helpers.js';

type Route = {
  method: string;
  pattern: RegExp;
  keys: string[];
  handler: (req: IncomingMessage, res: ServerResponse, params: Record<string, string>, queue: ApprovalQueue) => Promise<void>;
};

function route(method: string, pattern: string, handler: Route['handler']): Route {
  const keys: string[] = [];
  const re = new RegExp(
    '^' + pattern.replace(/:(\w+)/g, (_, k) => { keys.push(k); return '([^/]+)'; }) + '$',
  );
  return { method, pattern: re, keys, handler };
}

function match(r: Route, method: string, pathname: string): Record<string, string> | null {
  if (r.method !== method) return null;
  const m = r.pattern.exec(pathname);
  if (!m) return null;
  const params: Record<string, string> = {};
  r.keys.forEach((k, i) => { params[k] = decodeURIComponent(m[i + 1]); });
  return params;
}

// ── POST /api/approval-actions/propose ───────────────────────────────────────

const POST_PROPOSE = route('POST', '/api/approval-actions/propose', async (req, res, _p, queue) => {
  const body = await readJSON(req) as Record<string, string | number | boolean | null | unknown[] | undefined>;
  try {
    const item = await queue.createItem({
      project_id: String(body.project_id ?? 'unknown'),
      action_type: String(body.action_type ?? 'custom'),
      target_system: String(body.target_system ?? 'unknown'),
      target_id: String(body.target_id ?? 'pending'),
      workflow_id: String(body.workflow_id ?? 'chat-adapter'),
      run_id: String(body.run_id ?? `chat-${Date.now()}`),
      requested_by_agent: String(body.requested_by_agent ?? 'chat-user'),
      requested_by_role: String(body.requested_by_role ?? 'pm_commander'),
      title: String(body.title ?? 'Untitled action'),
      description: String(body.description ?? ''),
      summary_diff: String(body.summary_diff ?? ''),
      confidence: typeof body.confidence === 'number' ? body.confidence : 80,
      source_refs: (body.source_refs as any) ?? [],
      priority: (String(body.priority ?? 'medium') as any),
      deadline: (body.deadline as string | null) ?? null,
      ttl_seconds: (typeof body.ttl_seconds === 'number' ? body.ttl_seconds : null) ?? null,
    });

    json(res, {
      approval_id: item.approval_id,
      status: item.status,
      message: 'Action proposed and queued for approval',
    }, 201);
  } catch (e: unknown) {
    err(res, 400, e instanceof Error ? e.message : 'propose failed');
  }
});

// ── POST /api/approval-actions/:id/approve ───────────────────────────────────

const POST_APPROVE = route('POST', '/api/approval-actions/:id/approve', async (req, res, params, queue) => {
  const body = await readJSON(req) as Record<string, string | number | undefined>;
  try {
    const item = await queue.decide(params.id, {
      decided_by: String(body.decided_by ?? 'chat-user'),
      decision: 'approve',
    });
    json(res, {
      approval_id: item.approval_id,
      status: item.status,
      decision: item.decision,
      message: 'Action approved',
    });
  } catch (e: unknown) {
    err(res, 400, e instanceof Error ? e.message : 'approve failed');
  }
});

// ── POST /api/approval-actions/:id/reject ────────────────────────────────────

const POST_REJECT = route('POST', '/api/approval-actions/:id/reject', async (req, res, params, queue) => {
  const body = await readJSON(req) as Record<string, string | number | undefined>;
  try {
    const item = await queue.decide(params.id, {
      decided_by: String(body.decided_by ?? 'chat-user'),
      decision: 'reject',
      reason: String(body.reason ?? 'Rejected via chat'),
    });
    json(res, {
      approval_id: item.approval_id,
      status: item.status,
      decision: item.decision,
      message: 'Action rejected',
    });
  } catch (e: unknown) {
    err(res, 400, e instanceof Error ? e.message : 'reject failed');
  }
});

// ── POST /api/approval-actions/:id/revision ──────────────────────────────────

const POST_REVISION = route('POST', '/api/approval-actions/:id/revision', async (req, res, params, queue) => {
  const body = await readJSON(req) as Record<string, string | number | undefined>;
  try {
    const item = await queue.decide(params.id, {
      decided_by: String(body.decided_by ?? 'chat-user'),
      decision: 'revision_requested',
      notes: String(body.notes ?? 'Revision requested via chat'),
    });
    json(res, {
      approval_id: item.approval_id,
      status: item.status,
      decision: item.decision,
      message: 'Revision requested',
    });
  } catch (e: unknown) {
    err(res, 400, e instanceof Error ? e.message : 'revision failed');
  }
});

export const approvalActionRoutes: Route[] = [
  POST_PROPOSE,
  POST_APPROVE,
  POST_REJECT,
  POST_REVISION,
];

export { match };
