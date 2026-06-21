import React, { useState, useEffect, useCallback } from "react";
import { Project } from "@ai-pm/core";
import { useReportingStore, type MemoryTask, type MemoryArtifact } from "../../state/reporting-store";
import {
  CheckCircle2, AlertTriangle, Clock, XCircle, RotateCcw,
  Loader2, Shield, Activity, Target, FileText
} from "lucide-react";

interface Props { project: Project }

interface QAFinding {
  severity: string;
  type: string;
  file: string;
  line?: number;
  message: string;
}

export function QATab({ project }: Props) {
  const { tasks, artifacts, memorySummary, isLoading, error, loadAll } = useReportingStore();
  const [activeTab, setActiveTab] = useState<"quality" | "tests" | "readiness">("quality");

  const load = useCallback(() => loadAll(), [loadAll]);
  useEffect(() => { load(); }, [load]);

  const failedTasks = tasks.filter(t => t.status === "failed");
  const completedTasks = tasks.filter(t => t.status === "completed");
  const inProgressTasks = tasks.filter(t => t.status === "in_progress");
  const staleArtifacts = artifacts.filter(a => {
    if (a.status === "archived" || a.status === "deleted") return false;
    const daysSince = (Date.now() - new Date(a.updated_at).getTime()) / (1000 * 60 * 60 * 24);
    return daysSince > 30;
  });
  const codeArtifacts = artifacts.filter(a =>
    a.type === "code" || a.type === "schema" || a.name.endsWith(".ts") || a.name.endsWith(".js")
  );

  const findings: QAFinding[] = [];
  for (const a of staleArtifacts) {
    findings.push({
      severity: "warning",
      type: "stale_artifact",
      file: a.name,
      message: `Code artifact "${a.name}" has not been updated in over 30 days.`,
    });
  }
  for (const t of failedTasks) {
    findings.push({
      severity: "error",
      type: "failed_task",
      file: t.name,
      message: `Task "${t.name}" is in failed state and may indicate quality issues.`,
    });
  }

  const passRate = memorySummary && memorySummary.totalTasks > 0
    ? Math.round((memorySummary.completedTasks / memorySummary.totalTasks) * 100)
    : 0;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-foreground">QA & Code Quality</h2>
          <p className="text-sm text-muted-foreground">{project.name} • Code quality, test evidence, and release readiness</p>
        </div>
        <button
          onClick={() => load()}
          className="flex items-center gap-1.5 px-4 py-2 bg-white/5 hover:bg-white/10 rounded-lg text-sm text-foreground transition-colors"
          disabled={isLoading}
        >
          {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RotateCcw className="w-4 h-4" />}
          Refresh
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="glass-card rounded-xl p-4 border border-[#FF3B30]/30 flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-[#FF3B30] shrink-0" />
          <div className="flex-1">
            <p className="text-sm text-foreground">{error}</p>
          </div>
        </div>
      )}

      {/* Tab bar */}
      <div className="flex gap-1 p-1 glass-card rounded-xl">
        {(["quality", "tests", "readiness"] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 px-4 py-2 text-sm font-medium rounded-lg transition-all ${
              activeTab === tab ? "bg-white/10 text-foreground" : "text-muted-foreground hover:text-foreground hover:bg-white/5"
            }`}
          >
            {tab === "quality" ? "Code Quality" : tab === "tests" ? "Test Evidence" : "Release Readiness"}
          </button>
        ))}
      </div>

      {/* Quality tab */}
      {activeTab === "quality" && (
        <div className="space-y-4">
          {/* Summary stats */}
          <div className="grid grid-cols-3 gap-3">
            <div className="glass-card rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-[#ef4444]">{findings.filter(f => f.severity === "error").length}</p>
              <p className="text-xs text-muted-foreground">Errors</p>
            </div>
            <div className="glass-card rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-[#f59e0b]">{findings.filter(f => f.severity === "warning").length}</p>
              <p className="text-xs text-muted-foreground">Warnings</p>
            </div>
            <div className="glass-card rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-[#10b981]">{codeArtifacts.length}</p>
              <p className="text-xs text-muted-foreground">Code Artifacts</p>
            </div>
          </div>

          {/* Findings list */}
          <div className="glass-card rounded-xl p-5">
            <h3 className="font-medium text-foreground mb-4">Findings</h3>
            {findings.length === 0 ? (
              <div className="text-center py-8">
                <CheckCircle2 className="w-10 h-10 mx-auto text-[#10b981]/30 mb-3" />
                <p className="text-sm text-muted-foreground">No code quality findings</p>
                <p className="text-xs text-muted-foreground mt-1">All artifacts are current and no failed tasks detected.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {findings.map((f, i) => (
                  <div
                    key={i}
                    className={`flex items-start gap-3 p-3 rounded-lg ${
                      f.severity === "error"
                        ? "bg-[#ef4444]/8 border border-[#ef4444]/15"
                        : "bg-[#f59e0b]/8 border border-[#f59e0b]/15"
                    }`}
                  >
                    {f.severity === "error"
                      ? <AlertTriangle className="w-4 h-4 text-[#ef4444] shrink-0 mt-0.5" />
                      : <AlertTriangle className="w-4 h-4 text-[#f59e0b] shrink-0 mt-0.5" />}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground">{f.type.replace(/_/g, " ")}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{f.message}</p>
                    </div>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                      f.severity === "error" ? "bg-[#ef4444]/15 text-[#ef4444]" : "bg-[#f59e0b]/15 text-[#f59e0b]"
                    }`}>
                      {f.severity}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tests tab */}
      {activeTab === "tests" && (
        <div className="space-y-4">
          <div className="glass-card rounded-xl p-5">
            <h3 className="font-medium text-foreground mb-4">Task Status Overview</h3>
            <div className="grid grid-cols-4 gap-3">
              {[
                { label: "Total", value: memorySummary?.totalTasks ?? 0, color: "#60a5fa" },
                { label: "Completed", value: memorySummary?.completedTasks ?? 0, color: "#10b981" },
                { label: "In Progress", value: inProgressTasks.length, color: "#f59e0b" },
                { label: "Failed", value: failedTasks.length, color: "#ef4444" },
              ].map(s => (
                <div key={s.label} className="text-center">
                  <p className="text-xl font-bold" style={{ color: s.color }}>{s.value}</p>
                  <p className="text-[10px] text-muted-foreground">{s.label}</p>
                </div>
              ))}
            </div>
            <div className="mt-4 pt-4 border-t border-white/5">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-muted-foreground">Pass rate</span>
                <span className="text-sm font-medium" style={{ color: passRate >= 80 ? "#10b981" : passRate >= 50 ? "#f59e0b" : "#ef4444" }}>
                  {passRate}%
                </span>
              </div>
              <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                <div className="h-full rounded-full transition-all" style={{ width: `${passRate}%`, backgroundColor: passRate >= 80 ? "#10b981" : passRate >= 50 ? "#f59e0b" : "#ef4444" }} />
              </div>
            </div>
          </div>

          {/* Recent completed tasks */}
          <div className="glass-card rounded-xl p-5">
            <h3 className="font-medium text-foreground mb-4">Recent Completed Tasks</h3>
            {completedTasks.length === 0 ? (
              <p className="text-sm text-muted-foreground">No completed tasks yet.</p>
            ) : (
              <div className="space-y-2">
                {completedTasks.slice(0, 8).map((t, i) => (
                  <div key={i} className="flex items-center gap-3 p-2.5 rounded-lg glass">
                    <CheckCircle2 className="w-4 h-4 text-[#10b981] shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-foreground truncate">{t.name}</p>
                      <p className="text-xs text-muted-foreground">{t.assigned_to || "unassigned"}</p>
                    </div>
                    <span className="text-xs text-muted-foreground">{t.completed_at ? new Date(t.completed_at).toLocaleDateString() : "—"}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Readiness tab */}
      {activeTab === "readiness" && (
        <div className="space-y-4">
          <div className="glass-card rounded-xl p-5">
            <h3 className="font-medium text-foreground mb-4">Release Readiness</h3>
            <div className="space-y-3">
              <ReadinessCheck label="Zero critical task failures" passed={failedTasks.length === 0} />
              <ReadinessCheck label="All tasks completed" passed={memorySummary ? memorySummary.completedTasks === memorySummary.totalTasks : false} />
              <ReadinessCheck label="No stale code artifacts (30d+)" passed={staleArtifacts.length === 0} />
              <ReadinessCheck label="Pass rate ≥ 80%" passed={passRate >= 80} />
            </div>
          </div>
        </div>
      )}

      {/* Empty state */}
      {!isLoading && !error && memorySummary && memorySummary.totalTasks === 0 && artifacts.length === 0 && (
        <div className="glass-card rounded-xl p-8 text-center">
          <Shield className="w-10 h-10 mx-auto text-muted-foreground/30 mb-3" />
          <p className="text-lg text-foreground font-medium mb-2">No QA data yet</p>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            Run workflows and track tasks to populate this view with code quality findings, test evidence, and release readiness.
          </p>
        </div>
      )}
    </div>
  );
}

function ReadinessCheck({ label, passed }: { label: string; passed: boolean }) {
  return (
    <div className="flex items-center gap-3 p-3 rounded-lg glass">
      {passed
        ? <CheckCircle2 className="w-5 h-5 text-[#10b981] shrink-0" />
        : <XCircle className="w-5 h-5 text-[#ef4444] shrink-0" />}
      <span className="text-sm text-foreground">{label}</span>
      <span className={`ml-auto text-xs font-medium ${passed ? "text-[#10b981]" : "text-[#ef4444]"}`}>
        {passed ? "PASS" : "FAIL"}
      </span>
    </div>
  );
}
