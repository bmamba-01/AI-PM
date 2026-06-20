import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';

// Local types — no @ai-pm/core/runtime import in renderer.
// These mirror the approval queue runtime contract for the mobile surface.

export type ApprovalPriority = 'critical' | 'high' | 'medium' | 'low';
export type ApprovalStatus =
  | 'draft' | 'pending' | 'revision_requested' | 'approved' | 'rejected'
  | 'cancelled' | 'expired' | 'executing' | 'executed' | 'execution_failed';

export interface ApprovalItem {
  approval_id: string;
  project_id: string;
  action_type: string;
  workflow_id: string;
  run_id: string;
  requested_by_agent: string;
  requested_by_role: string;
  title: string;
  description: string;
  summary_diff: string;
  confidence: number;
  source_refs: Array<{ type: string; id: string; title: string; accessed_at: string }>;
  priority: ApprovalPriority;
  target_system: string;
  target_id: string;
  status: ApprovalStatus;
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
  decision: 'approve' | 'reject' | 'revision_requested' | 'cancel';
  reason?: string;
  notes?: string;
}

export type DataSource = 'local_server' | 'mock_fallback';

// ---------------------------------------------------------------------------
// API client
// ---------------------------------------------------------------------------

const URL_STORAGE_KEY = 'ai-pm-server-url';

let _baseUrl: string | null = null;
let _urlLoaded = false;

/**
 * Load persisted server URL from SecureStore on first access.
 * Returns the loaded URL (or null).
 */
export async function loadPersistedUrl(): Promise<string | null> {
  if (_urlLoaded) return _baseUrl;
  try {
    const stored = await SecureStore.getItemAsync(URL_STORAGE_KEY);
    if (stored) _baseUrl = stored;
  } catch {
    // SecureStore may fail in some environments — ignore
  }
  _urlLoaded = true;
  return _baseUrl;
}

/**
 * Configure the local server base URL for approval queue requests.
 * Persists to SecureStore so it survives app restarts.
 * Pass `null` to revert to mock fallback.
 */
export async function setApprovalBaseUrl(url: string | null): Promise<void> {
  _baseUrl = url;
  try {
    if (url) {
      await SecureStore.setItemAsync(URL_STORAGE_KEY, url);
    } else {
      await SecureStore.deleteItemAsync(URL_STORAGE_KEY);
    }
  } catch {
    // best-effort persistence
  }
}

export function getApprovalBaseUrl(): string | null {
  return _baseUrl;
}

export type ServerStatus = 'unknown' | 'connected' | 'unreachable';

/**
 * Health check against the local server.
 * Returns the server status and updates the store.
 */
export async function checkServerHealth(baseUrl: string): Promise<ServerStatus> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    const res = await fetch(`${baseUrl}/api/approvals`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
    });
    clearTimeout(timeout);
    if (res.ok || res.status === 404) return 'connected'; // 404 = server alive, endpoint missing
    return 'unreachable';
  } catch {
    return 'unreachable';
  }
}

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  if (!_baseUrl) throw new Error('No server configured');
  const res = await fetch(`${_baseUrl}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...init,
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`API ${res.status}: ${body || res.statusText}`);
  }
  return res.json() as Promise<T>;
}

// ---------------------------------------------------------------------------
// Mock data — seed dataset aligned with the approval queue runtime contract.
// Used when no local server URL is configured.
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// In-memory mock store (used when no server is configured)
// ---------------------------------------------------------------------------

let memoryItems: ApprovalItem[] | null = null;

function getMockItems(): ApprovalItem[] {
  if (!memoryItems) memoryItems = [...SEED_ITEMS];
  return memoryItems;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const PRIORITY_ORDER: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };

function sortByPriority(items: ApprovalItem[]): ApprovalItem[] {
  return [...items].sort((a, b) => {
    const pa = PRIORITY_ORDER[a.priority] ?? 4;
    const pb = PRIORITY_ORDER[b.priority] ?? 4;
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

function filterBySearch(items: ApprovalItem[], query: string): ApprovalItem[] {
  if (!query.trim()) return items;
  const q = query.toLowerCase();
  return items.filter(
    i =>
      i.title.toLowerCase().includes(q) ||
      i.description.toLowerCase().includes(q) ||
      i.approval_id.toLowerCase().includes(q) ||
      i.target_system.toLowerCase().includes(q) ||
      i.target_id.toLowerCase().includes(q) ||
      i.requested_by_role.toLowerCase().includes(q),
  );
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

interface ApprovalState {
  items: ApprovalItem[];
  counts: Record<string, number>;
  isLoading: boolean;
  error: string | null;
  dataSource: DataSource;
  serverStatus: ServerStatus;
  searchQuery: string;
  activeFilter: string;
  isRefreshing: boolean;

  loadItems: (filter?: { status?: string; priority?: string }) => Promise<void>;
  loadCounts: () => Promise<void>;
  decide: (id: string, payload: DecidePayload) => Promise<ApprovalItem>;
  create: (input: Omit<ApprovalItem, 'approval_id' | 'created_at' | 'updated_at' | 'revision_round' | 'decided_at' | 'decided_by' | 'decision' | 'rejection_reason' | 'revision_notes' | 'delegated_to' | 'execution_status' | 'execution_error' | 'execution_target_response' | 'retry_count' | 'policy_rule_id'>) => Promise<ApprovalItem>;
  refresh: () => Promise<void>;
  configureServer: (url: string | null) => Promise<void>;
  setSearchQuery: (query: string) => void;
  setActiveFilter: (filter: string) => void;
  getFilteredItems: () => ApprovalItem[];
  getPendingCount: () => number;
  exportToJson: () => string;
}

export const useApprovalStore = create<ApprovalState>()((set, get) => ({
  items: [],
  counts: {},
  isLoading: false,
  error: null,
  dataSource: 'mock_fallback',
  serverStatus: 'unknown',
  searchQuery: '',
  activeFilter: 'all',
  isRefreshing: false,

  loadItems: async (filter?) => {
    set({ isLoading: true, error: null });
    try {
      if (_baseUrl) {
        const params = new URLSearchParams();
        if (filter?.status) params.set('status', filter.status);
        if (filter?.priority) params.set('priority', filter.priority);
        const qs = params.toString();
        const items = await apiFetch<ApprovalItem[]>(`/api/approvals${qs ? `?${qs}` : ''}`);
        set({ items: sortByPriority(items), dataSource: 'local_server', isLoading: false });
      } else {
        const all = getMockItems();
        let result = sortByPriority(all);
        if (filter?.status) result = result.filter(i => i.status === filter.status);
        if (filter?.priority) result = result.filter(i => i.priority === filter.priority);
        set({ items: result, dataSource: 'mock_fallback', isLoading: false });
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.warn('[approval-store] loadItems failed:', msg);
      const all = getMockItems();
      let result = sortByPriority(all);
      if (filter?.status) result = result.filter(i => i.status === filter.status);
      if (filter?.priority) result = result.filter(i => i.priority === filter.priority);
      set({ items: result, dataSource: 'mock_fallback', isLoading: false, error: msg });
    }
  },

  loadCounts: async () => {
    try {
      if (_baseUrl) {
        const counts = await apiFetch<Record<string, number>>('/api/approvals/counts');
        set({ counts, dataSource: 'local_server' });
      } else {
        const all = getMockItems();
        set({ counts: computeCounts(all), dataSource: 'mock_fallback' });
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.warn('[approval-store] loadCounts failed:', msg);
      const all = getMockItems();
      set({ counts: computeCounts(all), dataSource: 'mock_fallback', error: msg });
    }
  },

  decide: async (id: string, payload: DecidePayload) => {
    if (_baseUrl) {
      try {
        const item = await apiFetch<ApprovalItem>(`/api/approvals/${id}/decide`, {
          method: 'POST',
          body: JSON.stringify(payload),
        });
        const counts = await apiFetch<Record<string, number>>('/api/approvals/counts').catch(() => null);
        const items = await apiFetch<ApprovalItem[]>('/api/approvals').catch(() => []);
        set({ counts: counts ?? computeCounts(items), items: sortByPriority(items), error: null });
        return item;
      } catch (err) {
        // Write operations must surface errors — do NOT silently fall back to mock
        const msg = err instanceof Error ? err.message : String(err);
        set({ error: msg, serverStatus: 'unreachable' });
        throw new Error(`Server write failed: ${msg}`);
      }
    }

    const items = getMockItems();
    const idx = items.findIndex(i => i.approval_id === id || i.approval_id.startsWith(id));
    if (idx === -1) throw new Error(`Approval item ${id} not found`);

    const item = items[idx];
    const nextStatus =
      payload.decision === 'approve' ? 'approved' :
      payload.decision === 'reject' ? 'rejected' :
      payload.decision === 'revision_requested' ? 'revision_requested' :
      'cancelled';

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

  create: async (input) => {
    const now = new Date().toISOString();
    const newItem: ApprovalItem = {
      ...input,
      approval_id: crypto.randomUUID(),
      created_at: now,
      updated_at: now,
      revision_round: 0,
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

    if (_baseUrl) {
      try {
        const item = await apiFetch<ApprovalItem>('/api/approvals', {
          method: 'POST',
          body: JSON.stringify(newItem),
        });
        const items = await apiFetch<ApprovalItem[]>('/api/approvals').catch(() => []);
        const counts = await apiFetch<Record<string, number>>('/api/approvals/counts').catch(() => null);
        set({ items: sortByPriority(items), counts: counts ?? computeCounts(items), error: null });
        return item;
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        set({ error: msg, serverStatus: 'unreachable' });
        throw new Error(`Server write failed: ${msg}`);
      }
    }

    const items = getMockItems();
    items.push(newItem);
    set({ items: sortByPriority([...items]), counts: computeCounts(items) });
    return newItem;
  },

  refresh: async () => {
    set({ isRefreshing: true });
    try {
      if (_baseUrl) {
        const [items, counts] = await Promise.all([
          apiFetch<ApprovalItem[]>('/api/approvals'),
          apiFetch<Record<string, number>>('/api/approvals/counts'),
        ]);
        set({ items: sortByPriority(items), counts, dataSource: 'local_server', error: null, isRefreshing: false });
      } else {
        const all = getMockItems();
        set({ items: sortByPriority(all), counts: computeCounts(all), dataSource: 'mock_fallback', error: null, isRefreshing: false });
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.warn('[approval-store] refresh failed:', msg);
      const all = getMockItems();
      set({ items: sortByPriority(all), counts: computeCounts(all), dataSource: 'mock_fallback', error: msg, isRefreshing: false });
    }
  },

  setSearchQuery: (query: string) => set({ searchQuery: query }),

  setActiveFilter: (filter: string) => set({ activeFilter: filter }),

  configureServer: async (url: string | null) => {
    await setApprovalBaseUrl(url);
    if (url) {
      set({ isLoading: true, error: null });
      const status = await checkServerHealth(url);
      set({ serverStatus: status });
      if (status === 'connected') {
        // Load real data from server
        try {
          const [items, counts] = await Promise.all([
            apiFetch<ApprovalItem[]>('/api/approvals'),
            apiFetch<Record<string, number>>('/api/approvals/counts'),
          ]);
          set({ items: sortByPriority(items), counts, dataSource: 'local_server', isLoading: false });
        } catch {
          set({ dataSource: 'mock_fallback', isLoading: false });
        }
      } else {
        // Server unreachable — fall back to mock with clear error
        const all = getMockItems();
        set({
          items: sortByPriority(all),
          counts: computeCounts(all),
          dataSource: 'mock_fallback',
          isLoading: false,
          error: `Server at ${url} is unreachable. Using mock data.`,
        });
      }
    } else {
      // Cleared URL — revert to mock
      const all = getMockItems();
      set({
        items: sortByPriority(all),
        counts: computeCounts(all),
        dataSource: 'mock_fallback',
        serverStatus: 'unknown',
        error: null,
      });
    }
  },

  getFilteredItems: () => {
    const { items, searchQuery, activeFilter } = get();
    let result = items;
    // Apply status filter
    switch (activeFilter) {
      case 'pending':
        result = result.filter(i => i.status === 'pending');
        break;
      case 'urgent':
        result = result.filter(i =>
          i.status === 'pending' && (i.priority === 'critical' || i.priority === 'high'));
        break;
      case 'done':
        result = result.filter(i =>
          i.status === 'approved' || i.status === 'rejected' || i.status === 'expired' || i.status === 'executed');
        break;
      default:
        break;
    }
    // Apply search
    return filterBySearch(result, searchQuery);
  },

  getPendingCount: () => {
    return get().items.filter(i => i.status === 'pending').length;
  },

  exportToJson: () => {
    const { items } = get();
    return JSON.stringify(items, null, 2);
  },
}));
