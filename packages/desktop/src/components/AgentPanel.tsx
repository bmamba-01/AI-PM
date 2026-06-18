import React from "react";
import { useProjectStore } from "../state";
import { useState } from "react";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Input } from "./ui/input";
import { cn } from "../lib/utils";
import { Zap, X, ChevronDown, Play, Settings, FileText, Bot } from "lucide-react";

const agents = [
  { id: "morning-brief", name: "Morning Briefing", type: "daily-ops", status: "idle", lastRun: "2024-08-10 08:00", nextRun: "2024-08-11 08:00", description: "Aggregates email, calendar, tasks, risks into daily digest" },
  { id: "email-triage", name: "Email Triage", type: "daily-ops", status: "running", lastRun: "2024-08-10 14:23", nextRun: "—", description: "Categorizes, drafts replies, creates tasks from emails" },
  { id: "meeting-prep", name: "Meeting Prep", type: "meeting-intel", status: "idle", lastRun: "2024-08-09 16:00", nextRun: "2024-08-11 09:00", description: "Generates agenda from calendar + context docs" },
  { id: "mom-generator", name: "MoM Generator", type: "meeting-intel", status: "idle", lastRun: "2024-08-09 11:30", nextRun: "—", description: "Transcribes, extracts actions, syncs to Jira" },
  { id: "pr-review", name: "PR Review Agent", type: "code-quality", status: "idle", lastRun: "2024-08-10 13:45", nextRun: "—", description: "Checks complexity, smells, security, test coverage" },
  { id: "test-strategy", name: "Test Strategy", type: "code-quality", status: "idle", lastRun: "2024-08-08 10:00", nextRun: "—", description: "Maps tests to requirements, detects gaps" },
  { id: "risk-analyst", name: "Risk Analyst", type: "project-control", status: "running", lastRun: "2024-08-10 14:30", nextRun: "—", description: "Monte Carlo simulation, mitigation tracking" },
  { id: "timeline-opt", name: "Timeline Optimizer", type: "project-control", status: "idle", lastRun: "2024-08-09 15:00", nextRun: "—", description: "Critical path analysis, resource leveling" }
];

const typeBadge: Record<string, "cyan" | "purple" | "default" | "warning"> = {
  "daily-ops": "cyan",
  "meeting-intel": "purple",
  "code-quality": "default",
  "project-control": "warning",
};

export function AgentPanel() {
  const { agentPanelOpen, toggleAgentPanel } = useProjectStore();
  const [filter, setFilter] = useState("all");
  const [chatInput, setChatInput] = useState("");

  if (!agentPanelOpen) return null;

  const filteredAgents = agents.filter(a => filter === "all" || a.type === filter);

  return (
    <aside className="w-80 glass-strong flex flex-col h-full shrink-0 z-10">
      {/* Header */}
      <div className="p-4 border-b border-white/5 flex items-center justify-between">
        <h2 className="font-semibold text-foreground flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg liquid-bg flex items-center justify-center">
            <Bot className="w-3.5 h-3.5 text-white" />
          </div>
          AI Agents
        </h2>
        <Button variant="ghost" size="icon" onClick={toggleAgentPanel} className="text-muted-foreground h-7 w-7">
          <X className="w-4 h-4" />
        </Button>
      </div>

      {/* Filter */}
      <div className="p-3 border-b border-white/5">
        <select
          value={filter}
          onChange={e => setFilter(e.target.value)}
          className="w-full h-9 rounded-lg glass-card px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
        >
          <option value="all">All Agents</option>
          <option value="daily-ops">Daily Ops</option>
          <option value="meeting-intel">Meeting Intel</option>
          <option value="code-quality">Code Quality</option>
          <option value="project-control">Project Control</option>
        </select>
      </div>

      {/* Agent list */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {filteredAgents.map(agent => (
          <AgentCard key={agent.id} agent={agent} />
        ))}
      </div>

      {/* Chat input */}
      <div className="p-3 border-t border-white/5">
        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mb-2">Chat with PM Agent</p>
        <div className="flex gap-2">
          <Input
            value={chatInput}
            onChange={e => setChatInput(e.target.value)}
            onKeyDown={e => e.key === "Enter" && chatInput.trim() && (setChatInput(""), console.log("Send:", chatInput))}
            placeholder="Ask: sprint status, risk..."
            className="flex-1"
          />
          <Button size="sm" className="liquid-bg text-white glow-indigo">
            <Zap className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>
    </aside>
  );
}

function AgentCard({ agent }: { agent: typeof agents[0] }) {
  const [expanded, setExpanded] = useState(false);
  const isRunning = agent.status === "running";

  return (
    <div className={cn(
      "glass-card p-3 transition-all duration-200 cursor-pointer",
      isRunning && "glow-cyan"
    )} onClick={() => setExpanded(!expanded)}>
      <div className="flex items-start gap-3">
        {/* Status indicator */}
        <div className="mt-1 shrink-0">
          <div className={cn(
            "w-2.5 h-2.5 rounded-full",
            isRunning ? "bg-cyan-400 animate-glow-pulse" : "bg-muted-foreground/30"
          )} />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h4 className="font-medium text-foreground text-sm">{agent.name}</h4>
            <Badge variant={typeBadge[agent.type] || "secondary"} className="text-[9px]">{agent.type}</Badge>
            <Badge variant={isRunning ? "success" : "secondary"} className="text-[9px]">
              {agent.status}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-1 truncate">{agent.description}</p>
        </div>

        <ChevronDown className={cn(
          "w-4 h-4 text-muted-foreground shrink-0 transition-transform duration-200 mt-0.5",
          expanded && "rotate-180"
        )} />
      </div>

      {expanded && (
        <div className="mt-3 pt-3 border-t border-white/5 space-y-2 text-xs text-muted-foreground">
          <div className="flex justify-between">
            <span>Last run</span>
            <span className="text-foreground font-mono">{agent.lastRun}</span>
          </div>
          <div className="flex justify-between">
            <span>Next run</span>
            <span className="text-foreground font-mono">{agent.nextRun}</span>
          </div>
          <div className="flex gap-2 mt-2">
            <Button size="sm" variant="outline" className="flex-1 text-[10px]" disabled={isRunning}>
              <Play className="w-3 h-3" /> Run
            </Button>
            <Button size="sm" variant="ghost" className="flex-1 text-[10px]">
              <Settings className="w-3 h-3" /> Config
            </Button>
            <Button size="sm" variant="ghost" className="flex-1 text-[10px]">
              <FileText className="w-3 h-3" /> Logs
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
