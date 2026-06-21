import { Project } from "@ai-pm/core";
import { Card, CardHeader, CardTitle, CardContent } from "../ui/card";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import {
  AlertTriangle, Clock, Calendar, CheckCircle2, Mail,
  ShieldAlert, ArrowRight, Loader2, RotateCcw, Eye, Box
} from "lucide-react";
import { useEffect, useCallback } from "react";
import { useProjectStore } from "../../state";
import { useReportingStore } from "../../state/reporting-store";

interface Props { project: Project }

export function DailyBriefTab({ project }: Props) {
  const { setActiveView } = useProjectStore();
  const {
    memorySummary, tasks, artifacts, auditRuns, approvals,
    sourceCoverage, isLoading, error, lastUpdated,
    loadAll,
  } = useReportingStore();

  const load = useCallback(() => loadAll(), [loadAll]);
  useEffect(() => { load(); }, [load]);

  const pendingApprovals = approvals.filter(a => a.status === "pending");
  const recentRuns = auditRuns.slice(0, 5);
  const activeArtifacts = artifacts.filter(a => a.status === "active");
  const failedTasks = tasks.filter(t => t.status === "failed");
  const completedTasks = tasks.filter(t => t.status === "completed");

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-foreground">Daily Brief</h2>
          <p className="text-sm text-muted-foreground">
            {new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })} • {project.name}
            {lastUpdated && (
              <span className="ml-2 text-xs opacity-60">
                Updated {new Date(lastUpdated).toLocaleTimeString()}
              </span>
            )}
          </p>
        </div>
        <Button
          className="bg-[#007AFF] hover:bg-[#007AFF]/80 text-white"
          onClick={() => load()}
          disabled={isLoading}
        >
          {isLoading ? <Loader2 className="w-4 h-4 ml-1 animate-spin" /> : <RotateCcw className="w-4 h-4 ml-1" />}
          {isLoading ? "Loading..." : "Refresh"}
        </Button>
      </div>

      {/* Error state */}
      {error && (
        <Card className="border-[#FF3B30]/30">
          <CardContent className="p-4 flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-[#FF3B30] shrink-0" />
            <div className="flex-1">
              <p className="text-sm text-foreground">{error}</p>
              <p className="text-xs text-muted-foreground mt-1">Data may be incomplete or unavailable.</p>
            </div>
            <Button size="sm" variant="outline" onClick={() => load()}>Retry</Button>
          </CardContent>
        </Card>
      )}

      {/* Summary Cards */}
      {memorySummary && (
        <div className="grid grid-cols-5 gap-3">
          {[
            { label: "Total Tasks", value: memorySummary.totalTasks, color: "#007AFF", icon: "📋" },
            { label: "Completed", value: memorySummary.completedTasks, color: "#34C759", icon: "✅" },
            { label: "Artifacts", value: memorySummary.totalArtifacts, color: "#AF52DE", icon: "📦" },
            { label: "Stale", value: memorySummary.staleArtifacts, color: "#FF9500", icon: "⏰" },
            { label: "Pending Approvals", value: pendingApprovals.length, color: "#FF3B30", icon: "📬" },
          ].map(s => (
            <Card key={s.label}>
              <CardContent className="p-3 text-center">
                <span className="text-lg">{s.icon}</span>
                <p className="text-xl font-bold mt-1" style={{ color: s.color }}>{s.value}</p>
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Loading skeleton */}
      {isLoading && !memorySummary && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map(i => (
            <Card key={i}>
              <CardContent className="p-4 space-y-2 animate-pulse">
                <div className="h-4 bg-white/10 rounded w-1/3" />
                <div className="h-3 bg-white/5 rounded w-2/3" />
                <div className="h-3 bg-white/5 rounded w-1/2" />
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Main content */}
      {!isLoading && !error && memorySummary && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Recent Workflow Runs */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Eye className="w-4 h-4 text-[#007AFF]" /> Recent Runs
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {recentRuns.length === 0 ? (
                <p className="text-sm text-muted-foreground py-2">No workflow runs yet. Run a workflow to see results here.</p>
              ) : (
                recentRuns.map((run, i) => (
                  <div key={i} className="flex items-center gap-3 p-2.5 rounded-lg glass hover:bg-white/5 transition-colors">
                    {run.status === "completed"
                      ? <CheckCircle2 className="w-4 h-4 text-[#34C759] shrink-0" />
                      : run.status === "failed"
                      ? <AlertTriangle className="w-4 h-4 text-[#FF3B30] shrink-0" />
                      : <Clock className="w-4 h-4 text-muted-foreground shrink-0" />
                    }
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{run.workflowId}</p>
                      <p className="text-xs text-muted-foreground truncate">{run.outputSummary}</p>
                    </div>
                    <span className="text-xs text-muted-foreground shrink-0">
                      {new Date(run.completedAt ?? run.startedAt).toLocaleDateString()}
                    </span>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          {/* Active Artifacts */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Box className="w-4 h-4 text-[#AF52DE]" /> Artifacts
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {activeArtifacts.length === 0 ? (
                <p className="text-sm text-muted-foreground py-2">No artifacts generated yet. Artifacts appear after workflow runs.</p>
              ) : (
                activeArtifacts.slice(0, 5).map((art, i) => (
                  <div key={i} className="flex items-center gap-3 p-2.5 rounded-lg glass hover:bg-white/5 transition-colors">
                    <Badge variant="outline" className="text-[10px] shrink-0">{art.type}</Badge>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{art.name}</p>
                      <p className="text-xs text-muted-foreground truncate">{art.path}</p>
                    </div>
                    <span className="text-xs text-muted-foreground shrink-0">v{art.version}</span>
                  </div>
                ))
              )}
              {activeArtifacts.length > 5 && (
                <p className="text-xs text-muted-foreground text-center pt-1">
                  +{activeArtifacts.length - 5} more
                </p>
              )}
            </CardContent>
          </Card>

          {/* Failed/Blocked Tasks */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-[#FF3B30]" /> Failed Tasks
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {failedTasks.length === 0 ? (
                <p className="text-sm text-muted-foreground py-2">No failed tasks. {completedTasks.length} completed.</p>
              ) : (
                failedTasks.slice(0, 5).map((task, i) => (
                  <div key={i} className="flex items-start gap-2 p-2.5 rounded-lg bg-[#FF3B30]/8 border border-[#FF3B30]/15">
                    <ShieldAlert className="w-4 h-4 text-[#FF3B30] shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-foreground">{task.name}</p>
                      <p className="text-xs text-muted-foreground">{task.description}</p>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          {/* Pending Approvals */}
          <Card
            className="cursor-pointer hover:bg-white/5 transition-colors"
            onClick={() => setActiveView("approvals")}
          >
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-[#AF52DE]" /> Pending Approvals
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {pendingApprovals.length === 0 ? (
                <p className="text-sm text-muted-foreground py-2">No pending approvals. All caught up!</p>
              ) : (
                pendingApprovals.slice(0, 4).map((item, i) => (
                  <div key={i} className="flex items-center justify-between p-2.5 rounded-lg glass hover:bg-white/5 transition-colors">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-foreground truncate">{item.title}</p>
                      <p className="text-xs text-muted-foreground">{item.target_system} • {item.priority}</p>
                    </div>
                    <Button size="sm" variant="ghost" className="text-xs text-[#007AFF] shrink-0">Review</Button>
                  </div>
                ))
              )}
              <div className="flex justify-end pt-1">
                <span className="text-xs text-[#007AFF] flex items-center gap-1">
                  View all approvals <ArrowRight className="w-3 h-3" />
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Source Coverage */}
      {sourceCoverage.length > 0 && (
        <Card>
          <CardContent>
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <span>Sources:</span>
              {sourceCoverage.map((src, i) => (
                <Badge
                  key={i}
                  variant={src.available ? "outline" : "destructive"}
                  className="text-[9px]"
                >
                  {src.name} {src.available ? "✓" : "✗"}
                </Badge>
              ))}
              {memorySummary && (
                <span className="ml-auto">
                  Confidence: <span className="text-[#34C759] font-medium">
                    {Math.round((sourceCoverage.filter(s => s.available).length / sourceCoverage.length) * 100)}%
                  </span>
                </span>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
