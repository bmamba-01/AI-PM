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
    create: (input: { project_id: string; action_type: string; target_system: string; target_id: string; workflow_id: string; run_id: string; requested_by_agent: string; requested_by_role: string; title: string; description: string; summary_diff: string; confidence: number; source_refs: Array<{ type: string; id: string; title?: string; accessed_at?: string }>; priority: string; deadline?: string | null; ttl_seconds?: number | null; assigned_approvers?: string[] }): Promise<any> => ipcRenderer.invoke("approvals:create", input),
    resubmit: (id: string, summary_diff: string): Promise<any> => ipcRenderer.invoke("approvals:resubmit", id, summary_diff),
  },
  memory: {
    summary: (): Promise<{ totalTasks: number; completedTasks: number; totalArtifacts: number; archivedArtifacts: number; staleArtifacts: number }> => ipcRenderer.invoke("memory:summary"),
    tasks: (filter?: { status?: string }): Promise<any[]> => ipcRenderer.invoke("memory:tasks", filter),
    artifacts: (filter?: { status?: string; type?: string }): Promise<any[]> => ipcRenderer.invoke("memory:artifacts", filter),
  },
  audit: {
    runs: (): Promise<Array<{ runId: string; workflowId: string; projectId: string; status: string; startedAt: string; completedAt: string; outputSummary: string; sourceCoverage: string[]; assumptions: string[] }>> => ipcRenderer.invoke("audit:runs"),
  },
  server: {
    getStatus: (): Promise<{ running: boolean; host: string; port: number; url: string; projectRoot: string; health: { ok: boolean; version?: string } }> => ipcRenderer.invoke("server:getStatus"),
    health: (): Promise<{ ok: boolean; version?: string }> => ipcRenderer.invoke("server:health"),
    start: (): Promise<{ running: boolean; port: number }> => ipcRenderer.invoke("server:start"),
    stop: (): Promise<{ running: boolean; port: number }> => ipcRenderer.invoke("server:stop"),
  },
  setup: {
    scan: (path: string) => ipcRenderer.invoke("setup:scan", path),
    repair: (path: string) => ipcRenderer.invoke("setup:repair", path),
    createProject: (name: string, defaults: Record<string, string>) => ipcRenderer.invoke("setup:createProject", name, defaults),
    adopt: (path: string) => ipcRenderer.invoke("setup:adopt", path),
  },
};

contextBridge.exposeInMainWorld("electronAPI", api);

declare global {
  interface Window {
    electronAPI: typeof api;
  }
}
