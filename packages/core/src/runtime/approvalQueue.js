import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
const VALID_TRANSITIONS = {
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
    projectRoot;
    filePath;
    constructor(projectRoot) {
        this.projectRoot = projectRoot;
        this.filePath = path.join(projectRoot, '.ai-pm', 'approvals.json');
    }
    async ensureDir() {
        await mkdir(path.dirname(this.filePath), { recursive: true });
    }
    async readAll() {
        try {
            const raw = await readFile(this.filePath, 'utf-8');
            const parsed = JSON.parse(raw);
            return Array.isArray(parsed) ? parsed : [];
        }
        catch (error) {
            const nodeError = error;
            if (nodeError.code === 'ENOENT')
                return [];
            throw error;
        }
    }
    async writeAll(items) {
        await this.ensureDir();
        await writeFile(this.filePath, JSON.stringify(items, null, 2), 'utf-8');
    }
    async createItem(input) {
        if (!input.title || !input.project_id || !input.action_type || !input.target_system || !input.target_id) {
            throw new Error('Missing required fields: title, project_id, action_type, target_system, target_id');
        }
        if (input.confidence < 0 || input.confidence > 100) {
            throw new Error('confidence must be between 0 and 100');
        }
        const now = new Date().toISOString();
        const item = {
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
    async getItem(id) {
        const items = await this.readAll();
        return items.find(i => i.approval_id === id) ?? null;
    }
    async listItems(filter) {
        const items = await this.readAll();
        let result = items;
        if (filter?.status)
            result = result.filter(i => i.status === filter.status);
        if (filter?.priority)
            result = result.filter(i => i.priority === filter.priority);
        const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
        result.sort((a, b) => {
            const pa = priorityOrder[a.priority] ?? 4;
            const pb = priorityOrder[b.priority] ?? 4;
            if (pa !== pb)
                return pa - pb;
            return a.created_at.localeCompare(b.created_at);
        });
        return result;
    }
    async decide(id, payload) {
        const items = await this.readAll();
        const idx = items.findIndex(i => i.approval_id === id);
        if (idx === -1)
            throw new Error(`Approval item ${id} not found`);
        const item = items[idx];
        const allowed = VALID_TRANSITIONS[item.status] ?? [];
        const nextStatus = payload.decision === 'approve'
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
    async resubmit(id, summary_diff) {
        const items = await this.readAll();
        const idx = items.findIndex(i => i.approval_id === id);
        if (idx === -1)
            throw new Error(`Approval item ${id} not found`);
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
    async getCounts() {
        const items = await this.readAll();
        const counts = {};
        for (const item of items) {
            counts[item.status] = (counts[item.status] || 0) + 1;
        }
        return counts;
    }
}
//# sourceMappingURL=approvalQueue.js.map