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
}

declare global {
  interface Window {
    electronAPI: ElectronApi;
  }
}

export {};

