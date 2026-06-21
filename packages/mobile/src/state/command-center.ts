import * as SecureStore from 'expo-secure-store';
import { getApprovalBaseUrl, checkServerHealth, type ServerStatus } from './approval-store';

// ---------------------------------------------------------------------------
// Types — mirror the server chat gateway contract (read-only commands)
// ---------------------------------------------------------------------------

export interface ChatCommand {
  id: string;
  name: string;
  description: string;
  read_only: true;
  parameters: Array<{
    name: string;
    type: string;
    required: boolean;
    description: string;
  }>;
}

export interface ProjectSummary {
  totalTasks: number;
  completedTasks: number;
  totalArtifacts: number;
  archivedArtifacts: number;
  staleArtifacts: number;
}

export interface DailyBriefResult {
  command: 'daily_brief';
  date: string;
  project_summary: ProjectSummary;
  pending_approvals: Array<{
    approval_id: string;
    title: string;
    priority: string;
    target_system: string;
    created_at: string;
  }>;
  today_activity: {
    tasks_updated: number;
    pending_tasks: number;
    completed_tasks: number;
  };
  assumptions: string[];
}

export interface WeeklyStatusResult {
  command: 'weekly_status';
  period: { from: string; to: string };
  project_summary: ProjectSummary;
  approvals_summary: {
    total: number;
    approved: number;
    rejected: number;
    pending: number;
  };
  tasks_summary: {
    total_updated: number;
    completed: number;
    failed: number;
  };
  assumptions: string[];
}

export interface RiskSummaryResult {
  command: 'risk_summary';
  risk_signals: {
    failed_tasks: Array<{
      task_id: string;
      name: string;
      assigned_to: string;
      updated_at: string;
    }>;
    stale_artifacts: Array<{
      artifact_id: string;
      name: string;
      type: string;
      updated_at: string;
    }>;
    total_tasks: number;
    completed_tasks: number;
    stale_artifact_count: number;
  };
  assumptions: string[];
}

export interface PendingApprovalsResult {
  command: 'pending_approvals';
  count: number;
  items: Array<{
    approval_id: string;
    title: string;
    description: string;
    priority: string;
    target_system: string;
    target_id: string;
    requested_by_role: string;
    confidence: number;
    created_at: string;
    deadline: string | null;
  }>;
  assumptions: string[];
}

export type QueryResult =
  | DailyBriefResult
  | WeeklyStatusResult
  | RiskSummaryResult
  | PendingApprovalsResult;

// ---------------------------------------------------------------------------
// Mock data — used when no server is configured
// ---------------------------------------------------------------------------

const MOCK_DAILY_BRIEF: DailyBriefResult = {
  command: 'daily_brief',
  date: new Date().toISOString().slice(0, 10),
  project_summary: { totalTasks: 12, completedTasks: 7, totalArtifacts: 23, archivedArtifacts: 5, staleArtifacts: 2 },
  pending_approvals: [
    { approval_id: 'mock-a1', title: 'Publish weekly report', priority: 'high', target_system: 'gmail', created_at: new Date().toISOString() },
    { approval_id: 'mock-a2', title: 'Close risk PROJ-247', priority: 'medium', target_system: 'jira', created_at: new Date().toISOString() },
  ],
  today_activity: { tasks_updated: 3, pending_tasks: 5, completed_tasks: 7 },
  assumptions: ['Mock data — no server connected'],
};

const MOCK_WEEKLY_STATUS: WeeklyStatusResult = {
  command: 'weekly_status',
  period: {
    from: new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10),
    to: new Date().toISOString().slice(0, 10),
  },
  project_summary: { totalTasks: 12, completedTasks: 7, totalArtifacts: 23, archivedArtifacts: 5, staleArtifacts: 2 },
  approvals_summary: { total: 8, approved: 5, rejected: 1, pending: 2 },
  tasks_summary: { total_updated: 6, completed: 3, failed: 0 },
  assumptions: ['Mock data — no server connected'],
};

const MOCK_RISK_SUMMARY: RiskSummaryResult = {
  command: 'risk_summary',
  risk_signals: {
    failed_tasks: [],
    stale_artifacts: [
      { artifact_id: 'mock-art-1', name: 'old-spec.md', type: 'doc', updated_at: '2026-05-01T00:00:00Z' },
    ],
    total_tasks: 12,
    completed_tasks: 7,
    stale_artifact_count: 1,
  },
  assumptions: ['Mock data — no server connected', 'Stale threshold: 30 days'],
};

const MOCK_PENDING_APPROVALS: PendingApprovalsResult = {
  command: 'pending_approvals',
  count: 2,
  items: [
    {
      approval_id: 'mock-a1', title: 'Publish weekly report', description: 'Send weekly status report to stakeholders',
      priority: 'high', target_system: 'gmail', target_id: 'msg-001', requested_by_role: 'reporting',
      confidence: 84, created_at: new Date().toISOString(), deadline: null,
    },
    {
      approval_id: 'mock-a2', title: 'Close risk PROJ-247', description: 'Mark mitigated risk as closed',
      priority: 'medium', target_system: 'jira', target_id: 'PROJ-247', requested_by_role: 'risk',
      confidence: 71, created_at: new Date().toISOString(), deadline: null,
    },
  ],
  assumptions: ['Mock data — no server connected'],
};

const MOCK_COMMANDS: ChatCommand[] = [
  { id: 'daily_brief', name: 'Daily Brief', description: 'Today\'s priorities, blockers, approvals', read_only: true, parameters: [{ name: 'date', type: 'string', required: false, description: 'ISO date (default: today)' }] },
  { id: 'weekly_status', name: 'Weekly Status', description: 'Past week: completed tasks, approvals, artifacts', read_only: true, parameters: [{ name: 'date', type: 'string', required: false, description: 'ISO date (default: end of week)' }] },
  { id: 'risk_summary', name: 'Risk Summary', description: 'Failed tasks, stale artifacts as risk indicators', read_only: true, parameters: [] },
  { id: 'pending_approvals', name: 'Pending Approvals', description: 'Approval items awaiting decision', read_only: true, parameters: [] },
];

// ---------------------------------------------------------------------------
// Offline query queue — persisted in SecureStore
// ---------------------------------------------------------------------------

const QUERY_QUEUE_KEY = 'ai-pm-queued-queries';

export interface QueuedQuery {
  id: string;
  command: string;
  params: Record<string, string>;
  timestamp: string;
  status: 'pending' | 'synced' | 'failed';
}

export async function loadQueuedQueries(): Promise<QueuedQuery[]> {
  try {
    const raw = await SecureStore.getItemAsync(QUERY_QUEUE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function saveQueuedQueries(queries: QueuedQuery[]): Promise<void> {
  try {
    await SecureStore.setItemAsync(QUERY_QUEUE_KEY, JSON.stringify(queries));
  } catch { /* best-effort */ }
}

export async function getQueuedQueryCount(): Promise<number> {
  const q = await loadQueuedQueries();
  return q.filter(x => x.status === 'pending').length;
}

// ---------------------------------------------------------------------------
// API client
// ---------------------------------------------------------------------------

async function chatApiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const baseUrl = getApprovalBaseUrl();
  if (!baseUrl) throw new Error('No server configured');
  const res = await fetch(`${baseUrl}${path}`, {
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
// Public API — commands list
// ---------------------------------------------------------------------------

export async function listCommands(): Promise<ChatCommand[]> {
  const baseUrl = getApprovalBaseUrl();
  if (!baseUrl) return MOCK_COMMANDS;
  try {
    const res = await chatApiFetch<{ commands: ChatCommand[] }>('/api/chat/commands');
    return res.commands;
  } catch {
    return MOCK_COMMANDS;
  }
}

// ---------------------------------------------------------------------------
// Public API — execute query
// ---------------------------------------------------------------------------

export async function executeQuery(
  command: string,
  params: Record<string, string> = {},
): Promise<{ result: QueryResult; fromServer: boolean }> {
  const baseUrl = getApprovalBaseUrl();
  if (!baseUrl) {
    return { result: getMockResult(command), fromServer: false };
  }
  try {
    const result = await chatApiFetch<QueryResult>('/api/chat/query', {
      method: 'POST',
      body: JSON.stringify({ command, params }),
    });
    return { result, fromServer: true };
  } catch {
    // Offline — queue the query and return mock data
    const queued: QueuedQuery = {
      id: `qq-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      command,
      params,
      timestamp: new Date().toISOString(),
      status: 'pending',
    };
    const queries = await loadQueuedQueries();
    queries.push(queued);
    await saveQueuedQueries(queries);
    return { result: getMockResult(command), fromServer: false };
  }
}

function getMockResult(command: string): QueryResult {
  switch (command) {
    case 'daily_brief': return MOCK_DAILY_BRIEF;
    case 'weekly_status': return MOCK_WEEKLY_STATUS;
    case 'risk_summary': return MOCK_RISK_SUMMARY;
    case 'pending_approvals': return MOCK_PENDING_APPROVALS;
    default: return MOCK_DAILY_BRIEF;
  }
}

// ---------------------------------------------------------------------------
// Convenience: grouped data for the command center dashboard
// ---------------------------------------------------------------------------

export interface CommandCenterData {
  dailyBrief: DailyBriefResult | null;
  weeklyStatus: WeeklyStatusResult | null;
  riskSummary: RiskSummaryResult | null;
  pendingApprovals: PendingApprovalsResult | null;
  isLoading: boolean;
  error: string | null;
  lastUpdated: string | null;
}

export async function fetchCommandCenterData(): Promise<CommandCenterData> {
  const baseUrl = getApprovalBaseUrl();
  if (!baseUrl) {
    return {
      dailyBrief: MOCK_DAILY_BRIEF,
      weeklyStatus: MOCK_WEEKLY_STATUS,
      riskSummary: MOCK_RISK_SUMMARY,
      pendingApprovals: MOCK_PENDING_APPROVALS,
      isLoading: false,
      error: null,
      lastUpdated: new Date().toISOString(),
    };
  }

  try {
    const [daily, weekly, risks, approvals] = await Promise.all([
      chatApiFetch<DailyBriefResult>('/api/chat/query', {
        method: 'POST', body: JSON.stringify({ command: 'daily_brief' }),
      }),
      chatApiFetch<WeeklyStatusResult>('/api/chat/query', {
        method: 'POST', body: JSON.stringify({ command: 'weekly_status' }),
      }),
      chatApiFetch<RiskSummaryResult>('/api/chat/query', {
        method: 'POST', body: JSON.stringify({ command: 'risk_summary' }),
      }),
      chatApiFetch<PendingApprovalsResult>('/api/chat/query', {
        method: 'POST', body: JSON.stringify({ command: 'pending_approvals' }),
      }),
    ]);

    return {
      dailyBrief: daily,
      weeklyStatus: weekly,
      riskSummary: risks,
      pendingApprovals: approvals,
      isLoading: false,
      error: null,
      lastUpdated: new Date().toISOString(),
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      dailyBrief: MOCK_DAILY_BRIEF,
      weeklyStatus: MOCK_WEEKLY_STATUS,
      riskSummary: MOCK_RISK_SUMMARY,
      pendingApprovals: MOCK_PENDING_APPROVALS,
      isLoading: false,
      error: msg,
      lastUpdated: null,
    };
  }
}
