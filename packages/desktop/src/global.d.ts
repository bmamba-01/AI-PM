import type { MCPServerConfig } from '@ai-pm/mcp/connectionManager';

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
}

declare global {
  interface Window {
    electronAPI: ElectronApi;
  }
}

export {};

