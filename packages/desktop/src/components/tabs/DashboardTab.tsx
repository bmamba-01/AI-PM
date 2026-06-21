import { Project } from "@ai-pm/core";
import { Card, CardHeader, CardTitle, CardContent } from "../ui/card";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { useState, useEffect, useCallback } from "react";
import {
  Heart, DollarSign, AlertTriangle, TrendingUp,
  Clock, Users, ArrowUpRight, ArrowDownRight, Minus,
  Activity, Calendar, CheckCircle2, GitPullRequest,
  Rocket, MessageSquare, List, Loader, Check,
  Eye, Settings, Box, Wifi, WifiOff,
  ChevronDown, ChevronUp, Server, HardDrive, ClipboardCheck,
  HelpCircle
} from "lucide-react";
import { useState as useStateGuide } from "react";
import { SetupGuideDialog, GuideButton } from "../setup/SetupGuideDialog";

interface DashboardTabProps {
  project: Project;
}

export function DashboardTab({ project }: DashboardTabProps) {
  const [showGuide, setShowGuide] = useStateGuide(false);

  return (
    <div className="space-y-5">
      {/* Setup Guide Dialog */}
      {showGuide && (
        <SetupGuideDialog
          title="Dashboard Setup Guide"
          purpose="The dashboard shows project health, sprint progress, and real-time status. Configure MCP connectors to see live data from external systems."
          requiredSetup={[
            "Project profile configured (.ai-pm/profile.yaml)",
            "MCP connectors set up for live data",
            "Local server running for mobile access",
          ]}
          currentReadiness={{ score: 85, blocking: ["Configure MCP connectors for live data"] }}
          cliEquivalent="ai-pm setup doctor --json"
          onClose={() => setShowGuide(false)}
        />
      )}

      {/* Server status */}
      <ServerStatus />

      {/* Stat cards */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-xl font-semibold text-foreground">Dashboard</h2>
          <GuideButton onClick={() => setShowGuide(true)} />
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Health Score" value={`${project.healthScore}%`} icon={Heart} trend="up" color="emerald" />
        <StatCard title="Budget Used" value="65%" icon={DollarSign} trend="neutral" color="amber" />
        <StatCard title="Active Risks" value="3" icon={AlertTriangle} trend="down" color="red" />
        <StatCard title="Team Velocity" value="42 pts" icon={TrendingUp} trend="up" color="cyan" />
      </div>

      {/* Sprint progress + Budget burn */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-[#007AFF]" /> Sprint Progress
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Completed</span>
                <span className="font-medium text-foreground">28 / 42 pts</span>
              </div>
              <div className="h-2.5 rounded-full bg-secondary/50 overflow-hidden">
                <div className="h-full rounded-full liquid-bg animate-liquid-flow" style={{ width: "67%" }} />
              </div>
              <p className="text-xs text-muted-foreground">6 days remaining</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-[#FF9500]" /> Budget Burn
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Spent</span>
                <span className="font-medium text-foreground">$127,500 / $200,000</span>
              </div>
              <div className="h-2.5 rounded-full bg-secondary/50 overflow-hidden">
                <div className="h-full rounded-full bg-gradient-to-r from-[#FF9500] to-[#FFCC00]" style={{ width: "64%" }} />
              </div>
              <p className="text-xs text-muted-foreground">On track for Fixed Cost model</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Activity + Meetings */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-[#5AC8FA]" /> Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ActivityFeed />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-[#AF52DE]" /> Upcoming
            </CardTitle>
          </CardHeader>
          <CardContent>
            <MeetingList />
          </CardContent>
        </Card>
      </div>

      {/* Daily Briefing Panel */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <List className="w-4 h-4 text-[#5AC8FA]" /> Daily Briefing
          </CardTitle>
          <Badge variant="secondary" className="text-[9px]">Sample Data</Badge>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <p className="font-medium text-foreground">Top Priorities</p>
            <div className="space-y-1">
              <div className="flex items-start gap-3 p-2 rounded-lg bg-muted/50">
                <Check className="w-4 h-4 text-[#34C759]" />
                <div>
                  <p className="text-sm font-medium">Review project status and blockers</p>
                  <p className="text-xs text-muted-foreground">Due today</p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-2 rounded-lg bg-muted/50">
                <Check className="w-4 h-4 text-[#34C759]" />
                <div>
                  <p className="text-sm font-medium">Prepare sprint planning agenda</p>
                  <p className="text-xs text-muted-foreground">Due tomorrow</p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-2 rounded-lg bg-muted/50">
                <Check className="w-4 h-4 text-[#34C759]" />
                <div>
                  <p className="text-sm font-medium">Update stakeholder communication plan</p>
                  <p className="text-xs text-muted-foreground">Due in 2 days</p>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <p className="font-medium text-foreground">Urgent Blockers</p>
            <div className="space-y-1">
              <div className="flex items-start gap-3 p-2 rounded-lg bg-muted/50">
                <AlertTriangle className="w-4 h-4 text-[#FF3B30]" />
                <div>
                  <p className="text-sm font-medium">Dependency on external API delayed</p>
                  <p className="text-xs text-muted-foreground">Blocking feature X</p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-2 rounded-lg bg-muted/50">
                <AlertTriangle className="w-4 h-4 text-[#FF3B30]" />
                <div>
                  <p className="text-sm font-medium">Performance issue in database query</p>
                  <p className="text-xs text-muted-foreground">Affects reporting module</p>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <p className="font-medium text-foreground">Risks to Review</p>
            <div className="space-y-1">
              <div className="flex items-start gap-3 p-2 rounded-lg bg-muted/50">
                <Eye className="w-4 h-4 text-[#AF52DE]" />
                <div>
                  <p className="text-sm font-medium">Potential scope creep from new requirements</p>
                  <p className="text-xs text-muted-foreground">Medium probability, high impact</p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-2 rounded-lg bg-muted/50">
                <Eye className="w-4 h-4 text-[#AF52DE]" />
                <div>
                  <p className="text-sm font-medium">Third-party service license renewal pending</p>
                  <p className="text-xs text-muted-foreground">Low probability, but could affect budget</p>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <p className="font-medium text-foreground">Meetings Today</p>
            <div className="space-y-1">
              <div className="flex items-start gap-3 p-2 rounded-lg bg-muted/50">
                <Clock className="w-4 h-4 text-[#5AC8FA]" />
                <div>
                  <p className="text-sm font-medium">Daily Standup</p>
                  <p className="text-xs text-muted-foreground">10:00 AM</p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-2 rounded-lg bg-muted/50">
                <Clock className="w-4 h-4 text-[#5AC8FA]" />
                <div>
                  <p className="text-sm font-medium">Sprint Planning</p>
                  <p className="text-xs text-muted-foreground">2:00 PM</p>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <p className="font-medium text-foreground">Source Coverage</p>
            <p className="text-xs text-muted-foreground">
              Local project memory • GitHub (issues) • Google Calendar
            </p>
          </div>

          <div className="space-y-2">
            <p className="font-medium text-foreground">Confidence</p>
            <div className="flex items-center gap-2">
              <Badge variant="success" className="px-2 py-1 text-xs">85%</Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({ title, value, icon: Icon, trend, color }: {
  title: string;
  value: string;
  icon: React.ElementType;
  trend: "up" | "down" | "neutral";
  color: string;
}) {
  const colorMap: Record<string, string> = {
    emerald: "text-[#34C759]",
    amber: "text-[#FF9500]",
    red: "text-[#FF3B30]",
    cyan: "text-[#5AC8FA]",
  };
  const trendConfig = {
    up: { icon: ArrowUpRight, color: "text-[#34C759]", label: "+12%" },
    down: { icon: ArrowDownRight, color: "text-[#FF3B30]", label: "-3%" },
    neutral: { icon: Minus, color: "text-muted-foreground", label: "0%" },
  };
  const t = trendConfig[trend];
  const TrendIcon = t.icon;

  return (
    <Card className="liquid-border group hover:scale-[1.02] transition-all duration-300">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-muted-foreground font-medium">{title}</p>
          <p className="text-2xl font-bold text-foreground mt-1 glow-text">{value}</p>
        </div>
        <div className={`p-2 rounded-xl glass-card ${colorMap[color]} group-hover:shadow-lg transition-shadow duration-300`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
      <div className="mt-3 flex items-center gap-1.5 text-xs">
        <TrendIcon className={`w-3.5 h-3.5 ${t.color}`} />
        <span className={t.color}>{t.label}</span>
        <span className="text-muted-foreground">vs last period</span>
      </div>
    </Card>
  );
}

function ActivityFeed() {
  const activities = [
    { time: "2h ago", user: "Alex Chen", action: "completed", target: "API authentication refactor", type: "task", icon: CheckCircle2, iconColor: "text-[#34C759]" },
    { time: "4h ago", user: "Maria Santos", action: "opened PR", target: "Payment integration", type: "pr", icon: GitPullRequest, iconColor: "text-[#5AC8FA]" },
    { time: "6h ago", user: "System", action: "deployed", target: "v2.1.0 to staging", type: "deploy", icon: Rocket, iconColor: "text-[#AF52DE]" },
    { time: "1d ago", user: "James Wilson", action: "commented on", target: "Risk: Database migration", type: "risk", icon: MessageSquare, iconColor: "text-[#FF9500]" }
  ];

  return (
    <div className="space-y-2.5">
      {activities.map((a, i) => {
        const Icon = a.icon;
        return (
          <div key={i} className="flex items-start gap-3 p-3 rounded-lg glass-card hover:bg-white/5 transition-colors group">
            <div className="w-8 h-8 rounded-lg glass-card flex items-center justify-center shrink-0">
              <Icon className={`w-4 h-4 ${a.iconColor}`} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-foreground">
                <span className="font-medium">{a.user}</span>{" "}
                <span className="text-muted-foreground">{a.action}</span>{" "}
                <span className="font-medium text-primary">{a.target}</span>
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">{a.time}</p>
            </div>
            <Badge variant="secondary" className="text-[9px] shrink-0">{a.type}</Badge>
          </div>
        );
      })}
    </div>
  );
}

function MeetingList() {
  const meetings = [
    { time: "10:00", title: "Daily Standup", type: "standup" },
    { time: "14:00", title: "Sprint Planning", type: "planning" },
    { time: "16:00", title: "Architecture Review", type: "review" }
  ];

  return (
    <div className="space-y-2.5">
      {meetings.map((m, i) => (
        <div key={i} className="flex items-center gap-3 p-3 rounded-lg glass-card hover:bg-white/5 transition-colors">
          <div className="text-sm font-mono text-muted-foreground w-12 shrink-0">{m.time}</div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground">{m.title}</p>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{m.type}</p>
          </div>
          <Button size="sm" variant="ghost" className="text-[10px] text-primary shrink-0">
            Join
          </Button>
        </div>
      ))}
    </div>
  );
}

function ServerStatus() {
  const [status, setStatus] = useState<{ running: boolean; host: string; port: number; url: string; projectRoot: string; health: { ok: boolean; version?: string } } | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [toggling, setToggling] = useState(false);
  const [startedAt] = useState(() => Date.now());

  // Detail data
  const [memorySummary, setMemorySummary] = useState<{ totalTasks: number; completedTasks: number; totalArtifacts: number; archivedArtifacts: number; staleArtifacts: number } | null>(null);
  const [approvalCounts, setApprovalCounts] = useState<Record<string, number> | null>(null);

  const fetchStatus = useCallback(() => {
    window.electronAPI.server.getStatus().then(setStatus).catch(() =>
      setStatus({ running: false, host: "127.0.0.1", port: 3847, url: "http://127.0.0.1:3847", projectRoot: "", health: { ok: false } })
    );
  }, []);

  useEffect(() => { fetchStatus(); }, [fetchStatus]);

  // Auto-refresh status every 30s
  useEffect(() => {
    const id = setInterval(fetchStatus, 30000);
    return () => clearInterval(id);
  }, [fetchStatus]);

  // Fetch detail data when expanded and server is healthy
  useEffect(() => {
    if (!expanded || !status?.running || !status.health.ok) return;

    window.electronAPI.approvals.count()
      .then(setApprovalCounts)
      .catch(() => setApprovalCounts(null));

    window.electronAPI.memory.summary()
      .then(setMemorySummary)
      .catch(() => setMemorySummary(null));

    const id = setInterval(() => {
      window.electronAPI.approvals.count().then(setApprovalCounts).catch(() => {});
      window.electronAPI.memory.summary().then(setMemorySummary).catch(() => {});
    }, 30000);
    return () => clearInterval(id);
  }, [expanded, status?.running, status?.health.ok]);

  async function toggleServer() {
    setToggling(true);
    try {
      if (status?.running) {
        const s = await window.electronAPI.server.stop();
        setStatus(prev => prev ? { ...prev, running: s.running } : null);
        setMemorySummary(null);
        setApprovalCounts(null);
      } else {
        const s = await window.electronAPI.server.start();
        if (s.running) {
          const full = await window.electronAPI.server.getStatus();
          setStatus(full);
        } else {
          setStatus(prev => prev ? { ...prev, running: false } : null);
        }
      }
    } catch {
      // ignore
    } finally {
      setToggling(false);
    }
  }

  if (!status) return null;

  const healthOk = status.running && status.health.ok;
  const uptimeMs = status.running ? Date.now() - startedAt : 0;
  const uptimeLabel = uptimeMs < 60000 ? `${Math.floor(uptimeMs / 1000)}s`
    : uptimeMs < 3600000 ? `${Math.floor(uptimeMs / 60000)}m`
    : `${Math.floor(uptimeMs / 3600000)}h`;

  const totalApprovals = approvalCounts
    ? Object.values(approvalCounts).reduce((a, b) => a + b, 0)
    : null;

  return (
    <Card className="glass">
      <CardContent className="p-3">
        {/* Collapsed header — always visible */}
        <div
          className="flex items-center justify-between cursor-pointer select-none"
          onClick={() => { if (status.running) setExpanded(!expanded); }}
        >
          <div className="flex items-center gap-2">
            {status.running ? (
              <Wifi className="w-4 h-4 text-[#34C759]" />
            ) : (
              <WifiOff className="w-4 h-4 text-muted-foreground" />
            )}
            <span className="text-sm font-medium text-foreground">Local Server</span>
            <Badge
              variant="outline"
              className="text-[10px]"
              style={{
                borderColor: status.running ? "#34C75940" : "#8E8E9340",
                color: status.running ? "#34C759" : "#8E8E93",
              }}
            >
              {status.running ? `Running on :${status.port}` : "Stopped"}
            </Badge>
            {status.running && (
              <Badge
                variant="outline"
                className="text-[10px]"
                style={{
                  borderColor: healthOk ? "#34C75940" : "#FF950040",
                  color: healthOk ? "#34C759" : "#FF9500",
                }}
              >
                {healthOk ? "Healthy" : "Unreachable"}
              </Badge>
            )}
            {status.running && (
              <span className="text-[10px] text-muted-foreground">
                {status.health.version && `v${status.health.version}`}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {status.running && (
              expanded
                ? <ChevronUp className="w-4 h-4 text-muted-foreground" />
                : <ChevronDown className="w-4 h-4 text-muted-foreground" />
            )}
            <Button
              size="sm"
              variant="ghost"
              className="text-xs"
              onClick={(e) => { e.stopPropagation(); toggleServer(); }}
              disabled={toggling}
            >
              {toggling ? "..." : status.running ? "Stop" : "Start"}
            </Button>
          </div>
        </div>

        {/* Collapsed subline */}
        {!expanded && (
          <div className="flex items-center gap-4 mt-1 ml-6 text-[10px] text-muted-foreground">
            {status.running && <span>{status.url}</span>}
            {status.projectRoot && (
              <span title={status.projectRoot}>
                Root: {status.projectRoot.length > 40 ? "…" + status.projectRoot.slice(-39) : status.projectRoot}
              </span>
            )}
            {status.running && (
              <span>Mobile devices can connect to {status.url}</span>
            )}
          </div>
        )}

        {/* Expanded detail panel */}
        {expanded && status.running && (
          <div className="mt-3 ml-1 space-y-3">
            {/* Info grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="glass-card rounded-lg p-2.5">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Status</p>
                <p className="text-xs font-medium text-[#34C759] flex items-center gap-1 mt-0.5">
                  <Server className="w-3 h-3" /> Running on {status.url}
                </p>
              </div>
              <div className="glass-card rounded-lg p-2.5">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Health</p>
                <p className="text-xs font-medium mt-0.5" style={{ color: healthOk ? "#34C759" : "#FF9500" }}>
                  {healthOk ? "✅ Healthy" : "⚠️ Unreachable"}
                  {status.health.version && ` (v${status.health.version})`}
                </p>
              </div>
              <div className="glass-card rounded-lg p-2.5">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Project</p>
                <p className="text-xs font-medium text-foreground mt-0.5 truncate" title={status.projectRoot}>
                  {status.projectRoot ? (status.projectRoot.split(/[\\/]/).pop() || status.projectRoot) : "—"}
                </p>
              </div>
              <div className="glass-card rounded-lg p-2.5">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Uptime</p>
                <p className="text-xs font-medium text-foreground mt-0.5">Started {uptimeLabel} ago</p>
              </div>
            </div>

            {/* Memory + Approvals panels */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              {/* Memory panel */}
              <div className="glass-card rounded-lg p-3">
                <div className="flex items-center gap-2 mb-2">
                  <HardDrive className="w-3.5 h-3.5 text-[#AF52DE]" />
                  <p className="text-xs font-semibold text-foreground">Memory</p>
                </div>
                {memorySummary ? (
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Tasks</span>
                      <span className="text-foreground font-medium">
                        {memorySummary.totalTasks}
                        <span className="text-muted-foreground font-normal"> ({memorySummary.completedTasks} done)</span>
                      </span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Artifacts</span>
                      <span className="text-foreground font-medium">
                        {memorySummary.totalArtifacts}
                        <span className="text-muted-foreground font-normal"> ({memorySummary.archivedArtifacts} arch)</span>
                      </span>
                    </div>
                    {memorySummary.staleArtifacts > 0 && (
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">Stale</span>
                        <span className="text-[#FF9500] font-medium">{memorySummary.staleArtifacts}</span>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">—</p>
                )}
              </div>

              {/* Approvals panel */}
              <div className="glass-card rounded-lg p-3">
                <div className="flex items-center gap-2 mb-2">
                  <ClipboardCheck className="w-3.5 h-3.5 text-[#FF9500]" />
                  <p className="text-xs font-semibold text-foreground">Approvals</p>
                </div>
                {approvalCounts ? (
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Pending</span>
                      <span className="text-[#FF9500] font-medium">{approvalCounts["pending"] ?? 0}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Revision</span>
                      <span className="text-[#FF3B30] font-medium">{approvalCounts["revision_requested"] ?? 0}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Approved</span>
                      <span className="text-[#34C759] font-medium">{approvalCounts["approved"] ?? 0}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Total</span>
                      <span className="text-foreground font-medium">{totalApprovals}</span>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">—</p>
                )}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}