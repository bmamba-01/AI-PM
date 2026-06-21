import type { MCPServerConfig } from '@ai-pm/mcp/connectionManager';
import type { ApprovalItem, DecidePayload } from '@ai-pm/core/runtime';

interface CreateApprovalInput {
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
  priority: ApprovalItem['priority'];
  deadline?: string | null;
  ttl_seconds?: number | null;
  assigned_approvers?: string[];
}

interface ElectronApi {
  dialog: {
    openFile: () => Promise<string | undefined>;
    saveFile: (defaultPath: string) => Promise<string | undefined>;
  };
  shell: {
    openExternal: (url: string) => Promise<void>;
  };
  app: {
    getVersion: () => Promise<string>;
    getPlatform: () => Promise<string>;
  };
  mcp: {
    getConfig: () => Promise<{ servers: MCPServerConfig[] }>;
    getLanguage: () => Promise<string>;
    toggleServer: (id: string, enabled: boolean) => Promise<{ success: boolean; servers: MCPServerConfig[] }>;
    removeServer: (id: string) => Promise<{ success: boolean; servers: MCPServerConfig[] }>;
    addServer: (server: MCPServerConfig) => Promise<{ success: boolean; servers: MCPServerConfig[] }>;
  };
  approvals: {
    list: (filter?: { status?: string; priority?: string }) => Promise<ApprovalItem[]>;
    count: () => Promise<Record<string, number>>;
    get: (id: string) => Promise<ApprovalItem | null>;
    decide: (id: string, payload: DecidePayload) => Promise<ApprovalItem>;
    create: (input: CreateApprovalInput) => Promise<ApprovalItem>;
    resubmit: (id: string, summary_diff: string) => Promise<ApprovalItem>;
  };
  memory: {
    summary: () => Promise<{ totalTasks: number; completedTasks: number; totalArtifacts: number; archivedArtifacts: number; staleArtifacts: number }>;
    tasks: (filter?: { status?: string }) => Promise<Array<{ task_id: string; name: string; status: string }>>;
    artifacts: (filter?: { status?: string; type?: string }) => Promise<Array<{ artifact_id: string; name: string; status: string }>>;
  };
  audit: {
    runs: () => Promise<Array<{ runId: string; workflowId: string; projectId: string; status: string; startedAt: string; completedAt: string; outputSummary: string; sourceCoverage: string[]; assumptions: string[] }>>;
  };
  server: {
    getStatus: () => Promise<{ running: boolean; host: string; port: number; url: string; projectRoot: string; health: { ok: boolean; version?: string } }>;
    health: () => Promise<{ ok: boolean; version?: string }>;
    start: () => Promise<{ running: boolean; port: number }>;
    stop: () => Promise<{ running: boolean; port: number }>;
  };
  setup: {
    scan: (path: string) => Promise<{
      score: number;
      blocking: string[];
      warnings: string[];
      checks: Array<{ id: string; label: string; required: boolean; present: boolean }>;
    }>;
    repair: (path: string) => Promise<{ created: string[] }>;
    createProject: (name: string, defaults: Record<string, string>) => Promise<{
      success: boolean;
      projectRoot: string;
      readiness: { score: number; blocking: string[]; warnings: string[] };
    }>;
    adopt: (path: string) => Promise<{ success: boolean }>;
  };
}

declare global {
  interface Window {
    electronAPI: ElectronApi;
  }
}

export {};

