import { Card, CardHeader, CardTitle, CardContent } from "../ui/card";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Server, Plus, Power, Trash2, RefreshCw } from "lucide-react";

const servers = [
  { id: "github", name: "GitHub", type: "source_control", enabled: true, status: "connected" },
  { id: "jira", name: "Jira", type: "work_tracking", enabled: true, status: "connected" },
  { id: "google-gmail", name: "Gmail", type: "communication", enabled: false, status: "disconnected" },
  { id: "google-calendar", name: "Calendar", type: "calendar", enabled: true, status: "connected" },
  { id: "filesystem", name: "Filesystem", type: "local", enabled: true, status: "connected" },
  { id: "slack", name: "Slack", type: "communication", enabled: false, status: "disconnected" },
];

const typeColors: Record<string, string> = {
  source_control: "bg-[#007AFF]/15 text-[#007AFF]",
  work_tracking: "bg-[#AF52DE]/15 text-[#AF52DE]",
  communication: "bg-[#34C759]/15 text-[#34C759]",
  calendar: "bg-[#FF9500]/15 text-[#FF9500]",
  local: "bg-[#8E8E93]/15 text-[#8E8E93]",
};

export function McpServersTab() {
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-foreground">MCP Servers</h2>
          <p className="text-sm text-muted-foreground">Manage integration connectors</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm"><RefreshCw className="w-3.5 h-3.5 mr-1" /> Check All</Button>
          <Button size="sm" className="bg-[#007AFF] hover:bg-[#007AFF]/80 text-white"><Plus className="w-3.5 h-3.5 mr-1" /> Add Server</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {servers.map((srv) => (
          <Card key={srv.id} className="group hover:border-white/14 transition-all">
            <CardContent className="pt-5">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Server className="w-4 h-4 text-muted-foreground" />
                  <span className="font-medium text-foreground">{srv.name}</span>
                </div>
                <div className={`w-2 h-2 rounded-full ${srv.enabled ? "bg-[#34C759]" : "bg-[#FF3B30]"}`} />
              </div>
              <div className="flex items-center gap-2 mb-3">
                <Badge className={`text-[9px] ${typeColors[srv.type] || ""}`}>{srv.type.replace("_", " ")}</Badge>
                <Badge variant={srv.enabled ? "success" : "destructive"} className="text-[9px]">{srv.status}</Badge>
              </div>
              <div className="flex gap-1.5">
                <Button size="sm" variant="ghost" className="flex-1 text-xs h-7"><Power className="w-3 h-3 mr-1" /> {srv.enabled ? "Disable" : "Enable"}</Button>
                <Button size="sm" variant="ghost" className="text-xs h-7 text-[#FF3B30]"><Trash2 className="w-3 h-3" /></Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
