import { Project } from "@ai-pm/core";
import { Card, CardHeader, CardTitle, CardContent } from "../ui/card";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { useState, useEffect, useCallback } from "react";
import { useProjectStore } from "../../state";
import {
  Command, CheckCircle2, XCircle, AlertTriangle,
  Clock, RotateCcw, ArrowRight, Shield,
  Server, Wifi, WifiOff, HardDrive, ClipboardCheck,
  FileText, Activity, Zap, Search
} from "lucide-react";

interface Props { project: Project }

interface AuditRun {
  runId: string;
  workflowId: string;
  projectId: string;
  status: string;
  startedAt: string;
  completedAt: string;
  outputSummary: string;
  sourceCoverage: string[];
  assumptions: string[];
}

interface ApprovalCounts {
  pending: number;
  revision_requested: number;
  approved: number;
  total: number;
}

interface MemorySummary {
  totalTasks: number;
  completedTasks: number;
  totalArtifacts: number;
  archivedArtifacts: number;
  staleArtifacts: number;
}

const STATUS_COLORS: Record<string, string> = {
  completed: "#34C759",
  blocked: "#FF9500",
  failed: "#FF3B30",
};

const STATUS_ICONS: Record<string, React.ElementType> = {
  completed: CheckCircle2,
  blocked: AlertTriangle,
  failed: XCircle,
};

export function CommandCenterTab({ project }: Props) {
  const { setActiveView } = useProjectStore();
  const [auditRuns, setAuditRuns] = useState<AuditRun[]>([]);
  const [approvalCounts, setApprovalCounts] = useState<ApprovalCounts | null>(null);
  const [memorySummary, setMemorySummary] = useState<MemorySummary | null>(null);
  const [serverStatus, setServerStatus] = useState<{ running: boolean; port: number; url: string; health: { ok: boolean } } | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [runs, counts, mem, srv] = await Promise.allSettled([
        window.electronAPI.audit.runs(),
        window.electronAPI.approvals.count(),
        window.electronAPI.memory.summary(),
        window.electronAPI.server.getStatus(),
      ]);

      if (runs.status === "fulfilled") setAuditRuns(runs.value.slice(-20).reverse());
      if (counts.status === "fulfilled") {
        const c = counts.value;
        setApprovalCounts({
          pending: c["pending"] ?? 0,
          revision_requested: c["revision_requested"] ?? 0,
          approved: c["approved"] ?? 0,
          total: Object.values(c).reduce((a, b) => a + b, 0),
        });
      }
      if (mem.status === "fulfilled") setMemorySummary(mem.value);
      if (srv.status === "fulfilled") setServerStatus(srv.value);
    } catch {
      // degrade gracefully
    } finally {
      setLoading(false);
      setLastRefresh(new Date());
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Auto-refresh every 30s
  useEffect(() => {
    const id = setInterval(fetchData, 30000);
    return () => clearInterval(id);
  }, [fetchData]);

  function timeAgo(iso: string): string {
    const diffMs = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diffMs / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-semibold text-foreground">Command Center</h2>
            <Badge variant="outline" className="text-[10px]">
              {project.name}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Operational overview • Last refresh: {lastRefresh.toLocaleTimeString()}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="ghost" onClick={fetchData} disabled={loading}>
            <RotateCcw className={`w-4 h-4 mr-1 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Quick Stats Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          label="Pending Approvals"
          value={approvalCounts?.pending ?? 0}
          color="#FF9500"
          icon={ClipboardCheck}
          subtext={approvalCounts ? `${approvalCounts.revision_requested} need revision` : "Loading..."}
        />
        <StatCard
          label="Active Tasks"
          value={memorySummary ? memorySummary.totalTasks - memorySummary.completedTasks : 0}
          color="#007AFF"
          icon={Activity}
          subtext={memorySummary ? `${memorySummary.completedTasks} done` : "Loading..."}
        />
        <StatCard
          label="Artifacts"
          value={memorySummary?.totalArtifacts ?? 0}
          color="#AF52DE"
          icon={FileText}
          subtext={memorySummary ? `${memorySummary.archivedArtifacts} archived` : "Loading..."}
        />
        <StatCard
          label="Workflow Runs"
          value={auditRuns.length}
          color="#34C759"
          icon={Zap}
          subtext={`${auditRuns.filter(r => r.status === "completed").length} completed`}
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Quick Actions (left) */}
        <Card className="lg:col-span-1">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Zap className="w-4 h-4 text-[#FF9500]" /> Quick Actions
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <QuickAction
              label="Daily Brief"
              description="Generate project status snapshot"
              color="#007AFF"
              onClick={() => setActiveView("daily-brief")}
            />
            <QuickAction
              label="Weekly Status"
              description="Prepare weekly report"
              color="#34C759"
              onClick={() => setActiveView("reports")}
            />
            <QuickAction
              label="Risk Summary"
              description="Review project risks"
              color="#FF3B30"
              onClick={() => setActiveView("risks")}
            />
            <QuickAction
              label="Pending Approvals"
              description={`${approvalCounts?.pending ?? 0} items awaiting decision`}
              color="#FF9500"
              onClick={() => setActiveView("approvals")}
            />
          </CardContent>
        </Card>

        {/* Recent Workflow Runs (center) */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm flex items-center gap-2">
                <Activity className="w-4 h-4 text-[#5AC8FA]" /> Recent Workflow Runs
              </CardTitle>
              <Badge variant="outline" className="text-[9px]">
                {auditRuns.length} total
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            {auditRuns.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground text-sm">
                <Zap className="w-8 h-8 mx-auto mb-2 opacity-30" />
                No workflow runs yet. Run a workflow to see audit trail here.
              </div>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {auditRuns.map((run) => {
                  const StatusIcon = STATUS_ICONS[run.status] || Clock;
                  const statusColor = STATUS_COLORS[run.status] || "#8E8E93";
                  return (
                    <div key={run.runId} className="flex items-start gap-3 p-2.5 rounded-lg glass hover:bg-white/5 transition-colors">
                      <StatusIcon className="w-4 h-4 shrink-0 mt-0.5" style={{ color: statusColor }} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-foreground truncate">
                            {run.workflowId}
                          </span>
                          <Badge
                            variant="outline"
                            className="text-[9px] shrink-0"
                            style={{ borderColor: statusColor + "40", color: statusColor }}
                          >
                            {run.status}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground truncate mt-0.5">
                          {run.outputSummary}
                        </p>
                        <div className="flex items-center gap-3 mt-1 text-[10px] text-muted-foreground">
                          <span>{timeAgo(run.completedAt)}</span>
                          {run.sourceCoverage.length > 0 && (
                            <span>Sources: {run.sourceCoverage.join(", ")}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Bottom Row: Server + Memory + Approvals */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Server Status */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Server className="w-4 h-4 text-[#AF52DE]" /> Server
            </CardTitle>
          </CardHeader>
          <CardContent>
            {serverStatus ? (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  {serverStatus.running ? (
                    <Wifi className="w-4 h-4 text-[#34C759]" />
                  ) : (
                    <WifiOff className="w-4 h-4 text-muted-foreground" />
                  )}
                  <span className="text-sm font-medium" style={{ color: serverStatus.running ? "#34C759" : "#8E8E93" }}>
                    {serverStatus.running ? "Running" : "Stopped"}
                  </span>
                  {serverStatus.running && (
                    <span className="text-xs text-muted-foreground">:{serverStatus.port}</span>
                  )}
                </div>
                {serverStatus.running && (
                  <div className="text-xs text-muted-foreground">
                    Health: {serverStatus.health.ok ? "✅ OK" : "⚠️ Degraded"}
                  </div>
                )}
                <div className="text-[10px] text-muted-foreground truncate">
                  {serverStatus.url}
                </div>
              </div>
            ) : (
              <div className="text-xs text-muted-foreground">Loading...</div>
            )}
          </CardContent>
        </Card>

        {/* Memory Summary */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <HardDrive className="w-4 h-4 text-[#007AFF]" /> Memory
            </CardTitle>
          </CardHeader>
          <CardContent>
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
              <div className="text-xs text-muted-foreground">Loading...</div>
            )}
          </CardContent>
        </Card>

        {/* Approvals Summary */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm flex items-center gap-2">
                <ClipboardCheck className="w-4 h-4 text-[#FF9500]" /> Approvals
              </CardTitle>
              <button
                onClick={() => setActiveView("approvals")}
                className="text-[10px] text-[#007AFF] hover:underline"
              >
                See all →
              </button>
            </div>
          </CardHeader>
          <CardContent>
            {approvalCounts ? (
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Pending</span>
                  <span className="text-[#FF9500] font-medium">{approvalCounts.pending}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Revision</span>
                  <span className="text-[#FF3B30] font-medium">{approvalCounts.revision_requested}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Approved</span>
                  <span className="text-[#34C759] font-medium">{approvalCounts.approved}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Total</span>
                  <span className="text-foreground font-medium">{approvalCounts.total}</span>
                </div>
              </div>
            ) : (
              <div className="text-xs text-muted-foreground">Loading...</div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function StatCard({ label, value, color, icon: Icon, subtext }: {
  label: string;
  value: number;
  color: string;
  icon: React.ElementType;
  subtext: string;
}) {
  return (
    <Card>
      <CardContent className="p-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className="text-2xl font-bold" style={{ color }}>{value}</p>
          </div>
          <div className="p-2 rounded-lg" style={{ backgroundColor: color + "15" }}>
            <Icon className="w-5 h-5" style={{ color }} />
          </div>
        </div>
        <p className="text-[10px] text-muted-foreground mt-1">{subtext}</p>
      </CardContent>
    </Card>
  );
}

function QuickAction({ label, description, color, onClick }: {
  label: string;
  description: string;
  color: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 p-2.5 rounded-lg glass hover:bg-white/5 transition-colors text-left group"
    >
      <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: color + "15" }}>
        <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" style={{ color }} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground">{label}</p>
        <p className="text-[10px] text-muted-foreground truncate">{description}</p>
      </div>
    </button>
  );
}
