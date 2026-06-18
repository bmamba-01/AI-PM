import React, { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Server, Plus, Power, Trash2 } from 'lucide-react';
import type { MCPServerConfig } from '@ai-pm/mcp/connectionManager';

const messages = {
  en: {
    title: 'Connected MCP Servers',
    enable: 'Enable', disable: 'Disable', remove: 'Remove', add: 'Add Server',
    noServers: 'No servers configured.',
    serverTypes: {
      github: 'GitHub', jira: 'Jira', linear: 'Linear', notion: 'Notion',
      slack: 'Slack', google: 'Google Workspace', custom: 'Custom',
    },
  },
  vi: {
    title: 'Các Server Đã Kết Nối',
    enable: 'Bật', disable: 'Tắt', remove: 'Xóa', add: 'Thêm Server',
    noServers: 'Chưa có server nào được cấu hình.',
    serverTypes: {
      github: 'GitHub', jira: 'Jira', linear: 'Linear', notion: 'Notion',
      slack: 'Slack', google: 'Google Workspace', custom: 'Tùy chỉnh',
    },
  },
};

type ServerConfig = MCPServerConfig;

export default function McpManager() {
  const [servers, setServers] = useState<ServerConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const t = messages.en;

  useEffect(() => {
    (async () => {
      try {
        const config = await window.electronAPI.mcp.getConfig();
        setServers(config?.servers ?? []);
      } catch (e) {
        setServers([]);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const toggleEnabled = async (id: string) => {
    try {
      const server = servers.find(s => s.id === id);
      if (!server) return;
      const result = await window.electronAPI.mcp.toggleServer(id, !server.enabled);
      if (result.success) setServers(result.servers);
    } catch (err) { console.error('Toggle failed', err); }
  };

  const removeServer = async (id: string) => {
    try {
      const result = await window.electronAPI.mcp.removeServer(id);
      if (result.success) setServers(result.servers);
    } catch (err) { console.error('Remove failed', err); }
  };

  const addServer = async () => {
    const id = prompt('Enter server ID (kebab-case):');
    if (!id) return;
    const name = prompt('Enter server name:');
    if (!name) return;
    const type = (prompt('Server type (github, jira, linear, notion, slack, google, custom):') || 'custom') as ServerConfig['type'];
    const url = prompt('Base URL (optional):') || undefined;
    const token = prompt('Token:') || undefined;

    try {
      const payload: ServerConfig = { id, name, type, enabled: true, ...(url && { url }), ...(token && { token }) };
      const result = await window.electronAPI.mcp.addServer(payload);
      if (result.success) setServers(result.servers);
    } catch (err) { console.error('Add failed', err); }
  };

  if (loading) {
    return (
      <Card className="flex items-center justify-center p-8">
        <div className="text-center text-muted-foreground text-sm">{t.noServers}</div>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <Server className="w-4 h-4 text-cyan-400" /> {t.title}
        </CardTitle>
        <Button size="sm" onClick={addServer} className="liquid-bg text-white glow-indigo">
          <Plus className="w-3.5 h-3.5" /> {t.add}
        </Button>
      </CardHeader>
      <div className="space-y-2">
        {servers.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">{t.noServers}</p>
        ) : (
          servers.map((srv) => (
            <div key={srv.id} className="flex items-center justify-between p-3 rounded-lg glass-card hover:bg-white/5 transition-colors">
              <div className="flex items-center gap-3">
                <div className={`w-2 h-2 rounded-full ${srv.enabled ? 'bg-emerald-400 animate-glow-pulse' : 'bg-red-400'}`} />
                <div>
                  <p className="text-sm font-medium text-foreground">{srv.name}</p>
                  <p className="text-[10px] text-muted-foreground font-mono">{srv.id}</p>
                </div>
                <Badge variant={srv.enabled ? "success" : "destructive"} className="text-[9px]">
                  {t.serverTypes[srv.type]}
                </Badge>
              </div>
              <div className="flex items-center gap-1.5">
                <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => toggleEnabled(srv.id)}>
                  <Power className="w-3.5 h-3.5" />
                </Button>
                <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-red-400 hover:text-red-300" onClick={() => removeServer(srv.id)}>
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          ))
        )}
      </div>
    </Card>
  );
}
