import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';

export type ApprovalStatus =
  | 'draft'
  | 'pending'
  | 'revision_requested'
  | 'approved'
  | 'rejected'
  | 'cancelled'
  | 'expired'
  | 'executing'
  | 'executed'
  | 'execution_failed';

export type ApprovalDecision = 'approve' | 'reject' | 'revision_requested' | 'cancel';

export interface ApprovalItem {
  approval_id: string;
  project_id: string;
  action_type: string;
  target_system: string;
  target_id: string;
  workflow_id: string;
  run_id: string;
  requested_by_agent: string;
  requested_by_role: string;
  title: string;
  description: string;
  summary_diff: string;
  confidence: number;
  source_refs: Array<{ type: string; id: string; title?: string; accessed_at?: string }>;
  priority: 'critical' | 'high' | 'medium' | 'low';
  status: ApprovalStatus;
  revision_round: number;
  deadline: string | null;
  ttl_seconds: number | null;
  assigned_approvers: string[];
  created_at: string;
  updated_at: string;
  decided_at: string | null;
  decided_by: string | null;
  decision: ApprovalDecision | null;
  rejection_reason: string | null;
  revision_notes: string | null;
  delegated_to: string | null;
  execution_status: 'pending' | 'executing' | 'executed' | 'execution_failed';
  execution_error: string | null;
  execution_target_response: string | null;
  retry_count: number;
  policy_rule_id: string | null;
}

export interface ApprovalAuditEntry {
  approval_id: string;
  event_type: string;
  actor: string;
  actor_type: 'human' | 'agent' | 'system';
  timestamp: string;
  details: Record<string, unknown>;
  previous_status: ApprovalStatus | null;
  new_status: ApprovalStatus | null;
}

export interface DecidePayload {
  decided_by: string;
  decision: ApprovalDecision;
  reason?: string;
  notes?: string;
}

const VALID_TRANSITIONS: Record<ApprovalStatus, ApprovalStatus[]> = {
  draft: ['pending', 'cancelled'],
  pending: ['approved', 'rejected', 'revision_requested', 'expired', 'cancelled'],
  revision_requested: ['pending', 'cancelled'],
  approved: ['executing'],
  rejected: [],
  cancelled: [],
  expired: [],
  executing: ['executed', 'execution_failed'],
  executed: [],
  execution_failed: ['pending', 'cancelled'],
};

export class ApprovalQueue {
  private readonly filePath: string;

  constructor(private readonly projectRoot: string) {
    this.filePath = path.join(projectRoot, '.ai-pm', 'approvals.json');
  }

  private async ensureDir(): Promise<void> {
    await mkdir(path.dirname(this.filePath), { recursive: true });
  }

  private async readAll(): Promise<ApprovalItem[]> {
    try {
      const raw = await readFile(this.filePath, 'utf-8');
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch (error: unknown) {
      const nodeError = error as NodeJS.ErrnoException;
      if (nodeError.code === 'ENOENT') return [];
      throw error;
    }
  }

  private async writeAll(items: ApprovalItem[]): Promise<void> {
    await this.ensureDir();
    await writeFile(this.filePath, JSON.stringify(items, null, 2), 'utf-8');
  }

  async createItem(input: {
    project_id: string;
    action_type: string;
    target_system: string;
    target_id: string;
    workflow_id: string;
    run_id: string;
    requested_by_agent: string;
    requested_by_role: string;
    title: string;
    description: string;
    summary_diff: string;
    confidence: number;
    source_refs: ApprovalItem['source_refs'];
    priority: ApprovalItem['priority'];
    deadline?: string | null;
    ttl_seconds?: number | null;
    assigned_approvers?: string[];
  }): Promise<ApprovalItem> {
    if (!input.title || !input.project_id || !input.action_type || !input.target_system || !input.target_id) {
      throw new Error('Missing required fields: title, project_id, action_type, target_system, target_id');
    }
    if (input.confidence < 0 || input.confidence > 100) {
      throw new Error('confidence must be between 0 and 100');
    }

    const now = new Date().toISOString();
    const item: ApprovalItem = {
      approval_id: randomUUID(),
      ...input,
      status: 'pending',
      revision_round: 0,
      deadline: input.deadline ?? null,
      ttl_seconds: input.ttl_seconds ?? null,
      assigned_approvers: input.assigned_approvers ?? [],
      created_at: now,
      updated_at: now,
      decided_at: null,
      decided_by: null,
      decision: null,
      rejection_reason: null,
      revision_notes: null,
      delegated_to: null,
      execution_status: 'pending',
      execution_error: null,
      execution_target_response: null,
      retry_count: 0,
      policy_rule_id: null,
    };

    const items = await this.readAll();
    items.push(item);
    await this.writeAll(items);
    return item;
  }

  async getItem(id: string): Promise<ApprovalItem | null> {
    const items = await this.readAll();
    return items.find(i => i.approval_id === id) ?? null;
  }

  async listItems(filter?: { status?: string; priority?: string }): Promise<ApprovalItem[]> {
    const items = await this.readAll();
    let result = items;
    if (filter?.status) result = result.filter(i => i.status === filter.status);
    if (filter?.priority) result = result.filter(i => i.priority === filter.priority);
    const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    result.sort((a, b) => {
      const pa = priorityOrder[a.priority as keyof typeof priorityOrder] ?? 4;
      const pb = priorityOrder[b.priority as keyof typeof priorityOrder] ?? 4;
      if (pa !== pb) return pa - pb;
      return a.created_at.localeCompare(b.created_at);
    });
    return result;
  }

  async decide(id: string, payload: DecidePayload): Promise<ApprovalItem> {
    const items = await this.readAll();
    const idx = items.findIndex(i => i.approval_id === id);
    if (idx === -1) throw new Error(`Approval item ${id} not found`);

    const item = items[idx];
    const allowed = VALID_TRANSITIONS[item.status] ?? [];
    const nextStatus =
      payload.decision === 'approve'
        ? 'approved'
        : payload.decision === 'reject'
        ? 'rejected'
        : payload.decision === 'revision_requested'
        ? 'revision_requested'
        : 'cancelled';

    if (!allowed.includes(nextStatus)) {
      throw new Error(`Cannot ${payload.decision} item in '${item.status}' status`);
    }

    if (payload.decision === 'reject' && (!payload.reason || payload.reason.length < 10)) {
      throw new Error('Rejection reason is required (min 10 characters)');
    }
    if (payload.decision === 'revision_requested' && (!payload.notes || payload.notes.length < 10)) {
      throw new Error('Revision notes are required (min 10 characters)');
    }

    const now = new Date().toISOString();
    item.status = nextStatus;
    item.decision = payload.decision;
    item.decided_by = payload.decided_by;
    item.decided_at = now;
    item.updated_at = now;
    item.rejection_reason = payload.reason ?? null;
    item.revision_notes = payload.notes ?? null;

    items[idx] = item;
    await this.writeAll(items);
    return item;
  }

  async resubmit(id: string, summary_diff: string): Promise<ApprovalItem> {
    const items = await this.readAll();
    const idx = items.findIndex(i => i.approval_id === id);
    if (idx === -1) throw new Error(`Approval item ${id} not found`);

    const item = items[idx];
    if (item.status !== 'revision_requested') {
      throw new Error(`Can only resubmit items in 'revision_requested' status, current: '${item.status}'`);
    }
    if (item.revision_round >= 3) {
      throw new Error(`Revision limit (3 rounds) reached. Item escalated to PM Commander.`);
    }

    const now = new Date().toISOString();
    item.status = 'pending';
    item.revision_round += 1;
    item.summary_diff = summary_diff;
    item.updated_at = now;

    items[idx] = item;
    await this.writeAll(items);
    return item;
  }

  async getCounts(): Promise<Record<string, number>> {
    const items = await this.readAll();
    const counts: Record<string, number> = {};
    for (const item of items) {
      counts[item.status] = (counts[item.status] || 0) + 1;
    }
    return counts;
  }
}
