import { create } from "zustand";

// This store delegates all file-backed operations to the Electron main
// process via IPC. The renderer never imports ApprovalQueue or node:fs.

// Types mirror the IPC contract from global.d.ts — no @ai-pm/core/runtime import.
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
  priority: "critical" | "high" | "medium" | "low";
  status: string;
  revision_round: number;
  deadline: string | null;
  ttl_seconds: number | null;
  assigned_approvers: string[];
  created_at: string;
  updated_at: string;
  decided_at: string | null;
  decided_by: string | null;
  decision: string | null;
  rejection_reason: string | null;
  revision_notes: string | null;
  delegated_to: string | null;
  execution_status: string;
  execution_error: string | null;
  execution_target_response: string | null;
  retry_count: number;
  policy_rule_id: string | null;
}

export interface DecidePayload {
  decided_by: string;
  decision: "approve" | "reject" | "revision_requested" | "cancel";
  reason?: string;
  notes?: string;
}

export type CreateApprovalPayload = {
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
  priority: "critical" | "high" | "medium" | "low";
  deadline?: string | null;
  ttl_seconds?: number | null;
  assigned_approvers?: string[];
};

interface ApprovalState {
  items: ApprovalItem[];
  counts: Record<string, number>;
  isLoading: boolean;
  error: string | null;

  // Actions
  loadItems: (filter?: { status?: string; priority?: string }) => Promise<void>;
  loadCounts: () => Promise<void>;
  decide: (id: string, payload: DecidePayload) => Promise<ApprovalItem>;
  create: (input: CreateApprovalPayload) => Promise<ApprovalItem>;
  resubmit: (id: string, summary_diff: string) => Promise<ApprovalItem>;
  refresh: () => Promise<void>;
  clearError: () => void;
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

export const useApprovalStore = create<ApprovalState>()((set) => ({
  items: [],
  counts: {},
  isLoading: false,
  error: null,

  loadItems: async (filter?) => {
    set({ isLoading: true, error: null });
    try {
      const items = await window.electronAPI.approvals.list(filter);
      set({ items: sortByPriority(items), isLoading: false, error: null });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to load approvals";
      console.warn("[approval-store] loadItems failed:", err);
      set({ items: [], isLoading: false, error: msg });
    }
  },

  loadCounts: async () => {
    try {
      const counts = await window.electronAPI.approvals.count();
      set({ counts });
    } catch (error) {
      console.warn("[approval-store] loadCounts failed:", error);
    }
  },

  decide: async (id: string, payload: DecidePayload) => {
    try {
      const item = await window.electronAPI.approvals.decide(id, payload);
      const counts = await window.electronAPI.approvals.count();
      set({ counts, error: null });
      return item;
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Decision failed";
      set({ error: msg });
      throw err;
    }
  },

  create: async (input: CreateApprovalPayload) => {
    const item = await window.electronAPI.approvals.create(input);
    const counts = await window.electronAPI.approvals.count();
    set((state) => ({
      items: sortByPriority([...state.items, item]),
      counts,
      error: null,
    }));
    return item;
  },

  resubmit: async (id: string, summary_diff: string) => {
    const item = await window.electronAPI.approvals.resubmit(id, summary_diff);
    const counts = await window.electronAPI.approvals.count();
    set((state) => ({
      items: sortByPriority(state.items.map(i => i.approval_id === id ? item : i)),
      counts,
      error: null,
    }));
    return item;
  },

  refresh: async () => {
    try {
      const [items, counts] = await Promise.all([
        window.electronAPI.approvals.list(),
        window.electronAPI.approvals.count(),
      ]);
      set({ items: sortByPriority(items), counts, error: null });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to refresh";
      console.warn("[approval-store] refresh failed:", err);
      set({ error: msg });
    }
  },

  clearError: () => set({ error: null }),
}));
