import { Card, CardHeader, CardTitle, CardContent } from "../ui/card";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Bot, Play, Settings, FileText, Zap } from "lucide-react";

const agents = [
  { id: "morning-brief", name: "Morning Briefing", type: "daily-ops", status: "idle", lastRun: "08:00", nextRun: "08:00", description: "Aggregates email, calendar, tasks, risks into daily digest" },
  { id: "email-triage", name: "Email Triage", type: "daily-ops", status: "running", lastRun: "14:23", nextRun: "—", description: "Categorizes, drafts replies, creates tasks from emails" },
  { id: "meeting-prep", name: "Meeting Prep", type: "meeting-intel", status: "idle", lastRun: "16:00", nextRun: "09:00", description: "Generates agenda from calendar + context docs" },
  { id: "mom-generator", name: "MoM Generator", type: "meeting-intel", status: "idle", lastRun: "11:30", nextRun: "—", description: "Transcribes, extracts actions, syncs to Jira" },
  { id: "pr-review", name: "PR Review Agent", type: "code-quality", status: "idle", lastRun: "13:45", nextRun: "—", description: "Checks complexity, smells, security, test coverage" },
  { id: "risk-analyst", name: "Risk Analyst", type: "project-control", status: "running", lastRun: "14:30", nextRun: "—", description: "Monte Carlo simulation, mitigation tracking" },
];

const typeBadge: Record<string, "success" | "warning" | "default" | "secondary"> = {
  "daily-ops": "success",
  "meeting-intel": "secondary",
  "code-quality": "default",
  "project-control": "warning",
};

export function AgentsTab() {
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-foreground">AI Agents</h2>
          <p className="text-sm text-muted-foreground">Manage and monitor agent workflows</p>
        </div>
        <Button className="bg-[#007AFF] hover:bg-[#007AFF]/80 text-white">
          <Zap className="w-4 h-4 mr-1" /> Run All Idle
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {agents.map((agent) => (
          <Card key={agent.id} className="group hover:border-white/14 transition-all">
            <CardContent className="pt-5">
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${agent.status === "running" ? "bg-[#34C759] animate-pulse" : "bg-muted-foreground/30"}`} />
                  <span className="font-medium text-foreground text-sm">{agent.name}</span>
                </div>
                <Badge variant={typeBadge[agent.type] || "secondary"} className="text-[9px]">{agent.type}</Badge>
              </div>
              <p className="text-xs text-muted-foreground mb-3 line-clamp-2">{agent.description}</p>
              <div className="flex items-center gap-2 text-[10px] text-muted-foreground mb-3">
                <span>Last: {agent.lastRun}</span>
                <span>•</span>
                <span>Next: {agent.nextRun}</span>
              </div>
              <div className="flex gap-1.5">
                <Button size="sm" variant="outline" className="flex-1 text-xs h-7" disabled={agent.status === "running"}>
                  <Play className="w-3 h-3 mr-1" /> Run
                </Button>
                <Button size="sm" variant="ghost" className="text-xs h-7"><Settings className="w-3 h-3" /></Button>
                <Button size="sm" variant="ghost" className="text-xs h-7"><FileText className="w-3 h-3" /></Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
