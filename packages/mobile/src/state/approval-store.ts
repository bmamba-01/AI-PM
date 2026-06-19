import { create } from 'zustand';
import type { ApprovalItem, DecidePayload } from '@ai-pm/core/runtime';

// Mobile cannot use node:fs/promises. This store mirrors the ApprovalQueue
// API using in-memory state (populated from mock data for MVP).
// In production, this would sync with the local server API.

type ApprovalPriority = 'critical' | 'high' | 'medium' | 'low';
type ApprovalStatus =
  | 'pending' | 'revision_requested' | 'approved' | 'rejected'
  | 'cancelled' | 'expired' | 'executing' | 'executed' | 'execution_failed';

interface ApprovalState {
  items: ApprovalItem[];
  counts: Record<string, number>;
  isLoading: boolean;

  loadItems: (filter?: { status?: string; priority?: string }) => Promise<void>;
  loadCounts: () => Promise<void>;
  decide: (id: string, payload: DecidePayload) => Promise<ApprovalItem>;
  refresh: () => Promise<void>;
}

const PRIORITY_ORDER = { critical: 0, high: 1, medium: 2, low: 3 };

function sortByPriority(items: ApprovalItem[]): ApprovalItem[] {
  return [...items].sort((a, b) => {
    const pa = PRIORITY_ORDER[a.priority as keyof typeof PRIORITY_ORDER] ?? 4;
    const pb = PRIORITY_ORDER[b.priority as keyof typeof PRIORITY_ORDER] ?? 4;
    if (pa !== pb) return pa - pb;
    return a.created_at.localeCompare(b.created_at);
  });
}

function computeCounts(items: ApprovalItem[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const item of items) {
    counts[item.status] = (counts[item.status] || 0) + 1;
  }
  return counts;
}

// Seed data — aligned with the approval queue runtime contract.
// This is the initial dataset the mobile app shows.
const SEED_ITEMS: ApprovalItem[] = [
  {
    approval_id: 'a1d5b4c6-7f9c-4d8a-b1e2-3f4a5b6c7d8e',
    project_id: 'proj-001',
    action_type: 'report_publish',
    target_system: 'gmail',
    target_id: 'msg-stakeholder-weekly-20260619',
    workflow_id: 'wf-reporting-weekly',
    run_id: 'run-20260619-001',
    requested_by_agent: 'agent-reporting',
    requested_by_role: 'reporting',
    title: 'Publish weekly stakeholder report',
    description: 'Send the generated weekly status report to the stakeholder distribution list via Gmail.',
    summary_diff: 'Adds section 4 (risks), updates burndown chart, and sends to 8 recipients.',
    confidence: 84,
    source_refs: [
      { type: 'transcript', id: 'mtg-20260619-standup', title: 'Daily standup transcript', accessed_at: '2026-06-19T07:55:00Z' },
    ],
    priority: 'high',
    status: 'pending',
    revision_round: 0,
    deadline: '2026-06-19T14:00:00Z',
    ttl_seconds: 3600,
    assigned_approvers: [],
    created_at: '2026-06-19T08:05:00Z',
    updated_at: '2026-06-19T08:05:00Z',
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
  },
  {
    approval_id: 'b2e6c5d7-8a0d-4e9f-a2f3-4g5h6i7j8k9l',
    project_id: 'proj-001',
    action_type: 'jira_issue_update',
    target_system: 'jira',
    target_id: 'PROJ-247',
    workflow_id: 'wf-risk-monitoring',
    run_id: 'run-20260619-002',
    requested_by_agent: 'agent-risk',
    requested_by_role: 'risk',
    title: 'Close resolved risk PROJ-247',
    description: 'Mark risk PROJ-247 as mitigated and update the risk register with the mitigation evidence.',
    summary_diff: 'Changes risk status from Open to Closed, attaches mitigation log, updates risk score to 2.',
    confidence: 71,
    source_refs: [
      { type: 'jira', id: 'PROJ-247', title: 'Integration timeout risk', accessed_at: '2026-06-19T07:30:00Z' },
    ],
    priority: 'medium',
    status: 'revision_requested',
    revision_round: 1,
    deadline: null,
    ttl_seconds: 14400,
    assigned_approvers: [],
    created_at: '2026-06-19T07:45:00Z',
    updated_at: '2026-06-19T08:12:00Z',
    decided_at: '2026-06-19T08:12:00Z',
    decision: 'revision_requested',
    decided_by: 'pm-user-01',
    rejection_reason: null,
    revision_notes: 'Attach the mitigation evidence note before closing.',
    delegated_to: null,
    execution_status: 'pending',
    execution_error: null,
    execution_target_response: null,
    retry_count: 0,
    policy_rule_id: null,
  },
  {
    approval_id: 'c3f7d6e8-9b1e-4f0g-b3g4-5h6i7j8k9l0m',
    project_id: 'proj-001',
    action_type: 'scope_baseline_change',
    target_system: 'notion',
    target_id: 'req-phase2-v3.2',
    workflow_id: 'wf-change-control',
    run_id: 'run-20260619-003',
    requested_by_agent: 'agent-pm-commander',
    requested_by_role: 'pm_commander',
    title: 'Adjust scope baseline for Phase 2',
    description: "Update the approved scope baseline to reflect the negotiated requirement change from yesterday's client review.",
    summary_diff: 'Baseline revised from v3.1 to v3.2, adds two non-functional requirements, removes unused integration spike.',
    confidence: 90,
    source_refs: [
      { type: 'notion', id: 'req-phase2-v3.2', title: 'Phase 2 requirements page', accessed_at: '2026-06-19T06:50:00Z' },
    ],
    priority: 'critical',
    status: 'approved',
    revision_round: 0,
    deadline: '2026-06-19T09:00:00Z',
    ttl_seconds: null,
    assigned_approvers: [],
    created_at: '2026-06-19T06:30:00Z',
    updated_at: '2026-06-19T08:45:00Z',
    decided_at: '2026-06-19T08:45:00Z',
    decision: 'approve',
    decided_by: 'pm-user-01',
    rejection_reason: null,
    revision_notes: null,
    delegated_to: null,
    execution_status: 'pending',
    execution_error: null,
    execution_target_response: null,
    retry_count: 0,
    policy_rule_id: null,
  },
  {
    approval_id: 'd4g8e7f9-0c2f-4g1h-c4h5-6i7j8k9l0m1n',
    project_id: 'proj-001',
    action_type: 'github_pr_merge',
    target_system: 'github',
    target_id: 'PR-234',
    workflow_id: 'wf-code-quality-guard',
    run_id: 'run-20260619-004',
    requested_by_agent: 'agent-code-quality',
    requested_by_role: 'code_quality_guard',
    title: 'Merge PR #234 — fix auth redirect loop',
    description: 'Merge the hotfix branch after automated checks pass and the security review is complete.',
    summary_diff: 'Merges hotfix/auth-redirect-loop into main, updates auth middleware, adds regression test.',
    confidence: 62,
    source_refs: [
      { type: 'github', id: '234', title: 'PR #234 fix auth redirect loop', accessed_at: '2026-06-19T07:20:00Z' },
    ],
    priority: 'high',
    status: 'execution_failed',
    revision_round: 0,
    deadline: null,
    ttl_seconds: null,
    assigned_approvers: [],
    created_at: '2026-06-19T07:00:00Z',
    updated_at: '2026-06-19T09:10:00Z',
    decided_at: '2026-06-19T09:00:00Z',
    decision: 'approve',
    decided_by: 'pm-user-01',
    rejection_reason: null,
    revision_notes: null,
    delegated_to: null,
    execution_status: 'execution_failed',
    execution_error: 'GitHub API returned 403: token lacks merge permission on repo.',
    execution_target_response: null,
    retry_count: 1,
    policy_rule_id: null,
  },
];

const VALID_TRANSITIONS: Record<string, string[]> = {
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

// In-memory store — populated with seed data on first load.
let memoryItems: ApprovalItem[] | null = null;

function getItems(): ApprovalItem[] {
  if (!memoryItems) {
    memoryItems = [...SEED_ITEMS];
  }
  return memoryItems;
}

export const useApprovalStore = create<ApprovalState>()((set) => ({
  items: [],
  counts: {},
  isLoading: false,

  loadItems: async (filter?) => {
    set({ isLoading: true });
    try {
      const all = getItems();
      let result = sortByPriority(all);
      if (filter?.status) result = result.filter(i => i.status === filter.status);
      if (filter?.priority) result = result.filter(i => i.priority === filter.priority);
      set({ items: result, counts: computeCounts(all), isLoading: false });
    } catch (error) {
      console.warn('[approval-store] loadItems failed:', error);
      set({ isLoading: false });
    }
  },

  loadCounts: async () => {
    try {
      const all = getItems();
      set({ counts: computeCounts(all) });
    } catch (error) {
      console.warn('[approval-store] loadCounts failed:', error);
    }
  },

  decide: async (id: string, payload: DecidePayload) => {
    const items = getItems();
    const idx = items.findIndex(i => i.approval_id === id || i.approval_id.startsWith(id));
    if (idx === -1) throw new Error(`Approval item ${id} not found`);

    const item = items[idx];

    const nextStatus =
      payload.decision === 'approve' ? 'approved' :
      payload.decision === 'reject' ? 'rejected' :
      payload.decision === 'revision_requested' ? 'revision_requested' :
      'cancelled';

    const allowed = VALID_TRANSITIONS[item.status] ?? [];
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
    item.status = nextStatus as ApprovalItem['status'];
    item.decision = payload.decision;
    item.decided_by = payload.decided_by;
    item.decided_at = now;
    item.updated_at = now;
    item.rejection_reason = payload.reason ?? null;
    item.revision_notes = payload.notes ?? null;

    items[idx] = item;

    set({ counts: computeCounts(items) });
    return item;
  },

  refresh: async () => {
    const all = getItems();
    set({ items: sortByPriority(all), counts: computeCounts(all) });
  },
}));
