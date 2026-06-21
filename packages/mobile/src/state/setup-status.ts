import { getApprovalBaseUrl, checkServerHealth, type ServerStatus } from './approval-store';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type SetupMode = 'new_project' | 'adopt_existing' | 'demo';

export interface SetupReadinessCheck {
  id: string;
  label: string;
  required: boolean;
  present: boolean;
}

export interface SetupReadinessResult {
  score: number;
  totalRequired: number;
  passedRequired: number;
  totalOptional: number;
  passedOptional: number;
  checks: SetupReadinessCheck[];
  ready: boolean;
}

export interface ProjectProfile {
  version: number;
  name: string;
  methodology: string | null;
  project_type: string | null;
  source_systems: Record<string, boolean>;
  connectors: Record<string, { enabled: boolean }>;
}

export interface SetupStatus {
  projectName: string;
  readiness: SetupReadinessResult;
  profile: ProjectProfile | null;
  pendingApprovals: number;
  serverStatus: ServerStatus;
  nextCommand: string | null;
  lastChecked: string | null;
}

// ---------------------------------------------------------------------------
// Mock data
// ---------------------------------------------------------------------------

const MOCK_READINESS: SetupReadinessResult = {
  score: 85,
  totalRequired: 7,
  passedRequired: 6,
  totalOptional: 10,
  passedOptional: 7,
  checks: [
    { id: 'agents-md', label: 'AGENTS.md', required: true, present: true },
    { id: 'readme-md', label: 'README.md', required: true, present: true },
    { id: 'design-spec', label: 'Design spec', required: true, present: true },
    { id: 'active-plan', label: 'Active plan', required: true, present: true },
    { id: 'workflows-dir', label: 'Workflows', required: true, present: true },
    { id: 'playbooks-dir', label: 'Playbooks', required: true, present: false },
    { id: 'mcp-registry', label: 'MCP registry', required: true, present: true },
    { id: 'templates-dir', label: 'Templates', required: false, present: true },
    { id: 'requirements-dir', label: 'Requirements', required: false, present: true },
    { id: 'risks-dir', label: 'Risks', required: false, present: true },
    { id: 'meetings-dir', label: 'Meetings', required: false, present: true },
    { id: 'artifacts-dir', label: 'Artifacts', required: false, present: true },
    { id: 'reports-dir', label: 'Reports', required: false, present: true },
  ],
  ready: false,
};

const MOCK_PROFILE: ProjectProfile = {
  version: 1,
  name: 'Demo Project',
  methodology: 'scrum',
  project_type: 'software',
  source_systems: { jira: false, github: false, linear: false },
  connectors: { github: { enabled: false }, jira: { enabled: false } },
};

// ---------------------------------------------------------------------------
// API client
// ---------------------------------------------------------------------------

async function apiFetch<T>(path: string): Promise<T> {
  const baseUrl = getApprovalBaseUrl();
  if (!baseUrl) throw new Error('No server configured');
  const res = await fetch(`${baseUrl}${path}`, {
    headers: { 'Content-Type': 'application/json' },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`API ${res.status}: ${body || res.statusText}`);
  }
  return res.json() as Promise<T>;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

function getNextCommand(readiness: SetupReadinessResult): string | null {
  const missing = readiness.checks.filter(c => c.required && !c.present);
  if (missing.length > 0) return `ai-pm setup repair --path .`;
  if (readiness.score < 100) return `ai-pm project scan --json`;
  return null;
}

export async function fetchSetupStatus(): Promise<SetupStatus> {
  const baseUrl = getApprovalBaseUrl();
  const serverStatus = await checkServerHealth(baseUrl ?? '');

  if (serverStatus !== 'connected' || !baseUrl) {
    return {
      projectName: 'Unknown (offline)',
      readiness: MOCK_READINESS,
      profile: null,
      pendingApprovals: 0,
      serverStatus,
      nextCommand: 'Configure server to see live status',
      lastChecked: new Date().toISOString(),
    };
  }

  try {
    const [readiness, profile, approvals] = await Promise.all([
      apiFetch<SetupReadinessResult>('/api/setup/readiness').catch(() => MOCK_READINESS),
      apiFetch<ProjectProfile>('/api/setup/profile').catch(() => MOCK_PROFILE),
      apiFetch<{ count: number }>('/api/approvals/counts').catch(() => ({ count: 0 })),
    ]);

    return {
      projectName: profile?.name ?? 'Unknown',
      readiness,
      profile,
      pendingApprovals: approvals.count ?? 0,
      serverStatus,
      nextCommand: getNextCommand(readiness),
      lastChecked: new Date().toISOString(),
    };
  } catch {
    return {
      projectName: 'Unknown (server error)',
      readiness: MOCK_READINESS,
      profile: null,
      pendingApprovals: 0,
      serverStatus,
      nextCommand: 'Server unreachable — check laptop connection',
      lastChecked: new Date().toISOString(),
    };
  }
}
