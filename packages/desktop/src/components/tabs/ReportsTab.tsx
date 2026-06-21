import React, { useEffect, useCallback } from "react";
import { Project } from "@ai-pm/core";
import { useReportingStore, type AuditRun, type MemoryArtifact } from "../../state/reporting-store";
import { CheckCircle2, AlertTriangle, Clock, ArrowRight, FileText, RotateCcw, Loader2 } from "lucide-react";

interface Props { project: Project }

export function ReportsTab({ project }: Props) {
  const { auditRuns, artifacts, memorySummary, isLoading, error, lastUpdated, loadAll } = useReportingStore();

  const load = useCallback(() => loadAll(), [loadAll]);
  useEffect(() => { load(); }, [load]);

  const recentRuns = auditRuns.slice(0, 10);
  const activeArtifacts = artifacts.filter(a => a.status === "active");
  const archivedArtifacts = artifacts.filter(a => a.status === "archived");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-foreground">Reports & Exports</h2>
          <p className="text-sm text-muted-foreground">
            Workflow runs, generated artifacts, and audit trail for {project.name}
            {lastUpdated && (
              <span className="ml-2 text-xs opacity-60">
                Refreshed {new Date(lastUpdated).toLocaleTimeString()}
              </span>
            )}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => load()}
            className="flex items-center gap-1.5 px-4 py-2 bg-white/5 hover:bg-white/10 rounded-lg text-sm font-medium text-foreground transition-colors"
            disabled={isLoading}
          >
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RotateCcw className="w-4 h-4" />}
            {isLoading ? "Loading..." : "Refresh"}
          </button>
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div className="glass-card rounded-xl p-4 border border-[#FF3B30]/30 flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-[#FF3B30] shrink-0" />
          <div className="flex-1">
            <p className="text-sm text-foreground">{error}</p>
            <p className="text-xs text-muted-foreground mt-1">Some data may be unavailable.</p>
          </div>
          <button
            onClick={() => load()}
            className="px-3 py-1.5 text-xs border border-[#FF3B30]/30 rounded-lg text-[#FF3B30] hover:bg-[#FF3B30]/10"
          >
            Retry
          </button>
        </div>
      )}

      {/* Loading skeleton */}
      {isLoading && !memorySummary && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="glass-card rounded-xl p-5 animate-pulse">
              <div className="h-4 bg-white/10 rounded w-1/3 mb-3" />
              <div className="h-3 bg-white/5 rounded w-2/3 mb-2" />
              <div className="h-3 bg-white/5 rounded w-1/2" />
            </div>
          ))}
        </div>
      )}

      {/* Summary stats */}
      {memorySummary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: "Total Tasks", value: memorySummary.totalTasks, color: "#007AFF" },
            { label: "Completed", value: memorySummary.completedTasks, color: "#34C759" },
            { label: "Artifacts", value: memorySummary.totalArtifacts, color: "#AF52DE" },
            { label: "Archived", value: memorySummary.archivedArtifacts, color: "#8E8E93" },
          ].map(s => (
            <div key={s.label} className="glass-card rounded-xl p-4 text-center">
              <p className="text-2xl font-bold" style={{ color: s.color }}>{s.value}</p>
              <p className="text-xs text-muted-foreground mt-1">{s.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Workflow Run History */}
      <div className="glass-card rounded-xl p-5">
        <h3 className="font-medium text-foreground mb-4">Workflow Run History</h3>
        {recentRuns.length === 0 ? (
          <div className="text-center py-8">
            <Clock className="w-10 h-10 mx-auto text-muted-foreground/30 mb-3" />
            <p className="text-sm text-muted-foreground">No workflow runs yet</p>
            <p className="text-xs text-muted-foreground mt-1">Run a workflow with <code className="px-1.5 py-0.5 glass rounded text-[11px]">ai-pm orchestrator run</code> to see results here.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {recentRuns.map((run, i) => (
              <RunRow key={i} run={run} />
            ))}
          </div>
        )}
      </div>

      {/* Generated Artifacts */}
      <div className="glass-card rounded-xl p-5">
        <h3 className="font-medium text-foreground mb-4">Generated Artifacts</h3>
        {activeArtifacts.length === 0 && archivedArtifacts.length === 0 ? (
          <div className="text-center py-8">
            <FileText className="w-10 h-10 mx-auto text-muted-foreground/30 mb-3" />
            <p className="text-sm text-muted-foreground">No artifacts yet</p>
            <p className="text-xs text-muted-foreground mt-1">Artifacts are created when workflows produce reports, matrices, or other deliverables.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {activeArtifacts.length > 0 && (
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Active</p>
                {activeArtifacts.map((art, i) => (
                  <ArtifactRow key={i} artifact={art} />
                ))}
              </div>
            )}
            {archivedArtifacts.length > 0 && (
              <div className="mt-4">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Archived</p>
                {archivedArtifacts.map((art, i) => (
                  <ArtifactRow key={i} artifact={art} />
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Empty state when everything is truly empty */}
      {!isLoading && !error && auditRuns.length === 0 && artifacts.length === 0 && (
        <div className="glass-card rounded-xl p-8 text-center">
          <p className="text-lg text-foreground font-medium mb-2">No reports data yet</p>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            This panel shows data from workflow runs and generated artifacts.
            Run workflows with the CLI to populate this view, or check the Daily Brief for a summary.
          </p>
        </div>
      )}
    </div>
  );
}

function RunRow({ run }: { run: AuditRun }) {
  const statusColor =
    run.status === "completed" ? "#34C759"
    : run.status === "failed" ? "#FF3B30"
    : "#8E8E93";

  return (
    <div className="flex items-start gap-3 p-3 rounded-lg glass hover:bg-white/5 transition-colors">
      <div className="mt-0.5">
        {run.status === "completed"
          ? <CheckCircle2 className="w-4 h-4" style={{ color: statusColor }} />
          : run.status === "failed"
          ? <AlertTriangle className="w-4 h-4" style={{ color: statusColor }} />
          : <Clock className="w-4 h-4" style={{ color: statusColor }} />
        }
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-foreground">{run.workflowId}</span>
          <span className="text-xs px-1.5 py-0.5 rounded" style={{ color: statusColor, backgroundColor: `${statusColor}15` }}>
            {run.status}
          </span>
        </div>
        <p className="text-xs text-muted-foreground mt-0.5 truncate">{run.outputSummary}</p>
        {run.sourceCoverage.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1.5">
            {run.sourceCoverage.slice(0, 4).map((src, i) => (
              <span key={i} className={`text-[10px] px-1.5 py-0.5 rounded ${src.startsWith("unavailable:") ? "bg-[#FF3B30]/15 text-[#FF3B30]" : "bg-white/5 text-muted-foreground"}`}>
                {src.startsWith("unavailable:") ? `✗ ${src.replace("unavailable:", "")}` : src}
              </span>
            ))}
            {run.sourceCoverage.length > 4 && (
              <span className="text-[10px] text-muted-foreground">+{run.sourceCoverage.length - 4}</span>
            )}
          </div>
        )}
      </div>
      <span className="text-xs text-muted-foreground shrink-0">
        {new Date(run.completedAt ?? run.startedAt).toLocaleDateString()}
      </span>
    </div>
  );
}

function ArtifactRow({ artifact }: { artifact: MemoryArtifact }) {
  return (
    <div className="flex items-center gap-3 p-3 rounded-lg glass hover:bg-white/5 transition-colors">
      <div className="p-2 bg-[#AF52DE]/15 rounded-lg">
        <FileText className="w-4 h-4 text-[#AF52DE]" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground truncate">{artifact.name}</p>
        <p className="text-xs text-muted-foreground">{artifact.path}</p>
      </div>
      <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/5 text-muted-foreground shrink-0">
        {artifact.type}
      </span>
      <span className="text-[10px] text-muted-foreground shrink-0">v{artifact.version}</span>
    </div>
  );
}
