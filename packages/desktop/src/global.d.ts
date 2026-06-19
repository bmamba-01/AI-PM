import type { MCPServerConfig } from '@ai-pm/mcp/connectionManager';
import type { ApprovalItem, DecidePayload } from '@ai-pm/core/runtime';

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
  };
}

declare global {
  interface Window {
    electronAPI: ElectronApi;
  }
}

export {};

