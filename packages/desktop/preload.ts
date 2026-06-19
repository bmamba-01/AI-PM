import { contextBridge, ipcRenderer } from "electron";
import type { MCPServerConfig } from '@ai-pm/mcp/connectionManager';

const api = {
  dialog: {
    openFile: (): Promise<string | undefined> => ipcRenderer.invoke("dialog:openFile"),
    saveFile: (defaultPath: string): Promise<string | undefined> => ipcRenderer.invoke("dialog:saveFile", defaultPath)
  },
  shell: {
    openExternal: (url: string): Promise<void> => ipcRenderer.invoke("shell:openExternal", url)
  },
  app: {
    getVersion: (): Promise<string> => ipcRenderer.invoke("app:getVersion"),
    getPlatform: (): Promise<string> => ipcRenderer.invoke("app:getPlatform")
  },
  mcp: {
    getConfig: (): Promise<any> => ipcRenderer.invoke("get-mcp-config"),
    getLanguage: (): Promise<string> => ipcRenderer.invoke("get-language"),
    toggleServer: (id: string, enabled: boolean): Promise<{ success: boolean; servers: MCPServerConfig[] }> => ipcRenderer.invoke("toggle-server", id, enabled),
    removeServer: (id: string): Promise<{ success: boolean; servers: MCPServerConfig[] }> => ipcRenderer.invoke("remove-server", id),
    addServer: (server: MCPServerConfig): Promise<{ success: boolean; servers: MCPServerConfig[] }> => ipcRenderer.invoke("add-server", server),
  },
  approvals: {
    list: (filter?: { status?: string; priority?: string }): Promise<any[]> => ipcRenderer.invoke("approvals:list", filter),
    count: (): Promise<Record<string, number>> => ipcRenderer.invoke("approvals:count"),
    get: (id: string): Promise<any | null> => ipcRenderer.invoke("approvals:get", id),
    decide: (id: string, payload: { decided_by: string; decision: string; reason?: string; notes?: string }): Promise<any> => ipcRenderer.invoke("approvals:decide", id, payload),
  },
};

contextBridge.exposeInMainWorld("electronAPI", api);

declare global {
  interface Window {
    electronAPI: typeof api;
  }
}
