import { Project } from "@ai-pm/core";
import { Card, CardContent } from "../ui/card";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import {
  Clock, CheckCircle2, XCircle, AlertTriangle, ArrowRight,
  GitPullRequest, FileText, ChevronDown, ChevronUp,
  Shield, Eye, Loader2
} from "lucide-react";
import { useState, useEffect, useCallback } from "react";
import { useApprovalStore, type ApprovalItem } from "../../state/approval-store";

interface Props { project: Project }

type ApprovalStatus = "pending" | "revision_requested" | "approved" | "rejected" | "expired" | "cancelled" | "executing" | "executed" | "execution_failed";

const statusConfig: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  pending: { label: "Pending", color: "#FF9500", icon: Clock },
  revision_requested: { label: "Revision Requested", color: "#FF3B30", icon: AlertTriangle },
  approved: { label: "Approved", color: "#34C759", icon: CheckCircle2 },
  expired: { label: "Expired", color: "#8E8E93", icon: XCircle },
  rejected: { label: "Rejected", color: "#FF3B30", icon: XCircle },
  cancelled: { label: "Cancelled", color: "#8E8E93", icon: XCircle },
  executing: { label: "Executing", color: "#007AFF", icon: Loader2 },
  executed: { label: "Executed", color: "#34C759", icon: CheckCircle2 },
  execution_failed: { label: "Failed", color: "#FF3B30", icon: XCircle },
  draft: { label: "Draft", color: "#8E8E93", icon: Clock },
};

const priorityConfig: Record<string, { label: string; color: string }> = {
  critical: { label: "Critical", color: "#FF3B30" },
  high: { label: "High", color: "#FF9500" },
  medium: { label: "Medium", color: "#007AFF" },
  low: { label: "Low", color: "#34C759" },
};

const systemConfig: Record<string, { label: string; icon: React.ElementType }> = {
  jira: { label: "Jira", icon: FileText },
  github: { label: "GitHub", icon: GitPullRequest },
  confluence: { label: "Confluence", icon: FileText },
  gmail: { label: "Gmail", icon: FileText },
  notion: { label: "Notion", icon: FileText },
  local_file: { label: "Local", icon: FileText },
};

export function ApprovalsTab({ project }: Props) {
  const { items, counts, isLoading, loadItems, loadCounts, decide, refresh } = useApprovalStore();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>("all");
  const [actionPending, setActionPending] = useState<string | null>(null);

  const load = useCallback(() => {
    if (filter === "all") {
      loadItems();
    } else {
      loadItems({ status: filter });
    }
    loadCounts();
  }, [filter, loadItems, loadCounts]);

  useEffect(() => {
    load();
  }, [load]);

  const stats = {
    total: items.length,
    pending: counts["pending"] ?? 0,
    approved: counts["approved"] ?? 0,
    revision: counts["revision_requested"] ?? 0,
    expired: counts["expired"] ?? 0,
  };

  async function handleApprove(id: string) {
    setActionPending(id);
    try {
      await decide(id, { decided_by: "pm-user", decision: "approve" });
      await refresh();
    } catch (error) {
      console.warn("[ApprovalsTab] Approve failed:", error);
    } finally {
      setActionPending(null);
    }
  }

  async function handleReject(id: string) {
    const reason = window.prompt("Rejection reason (min 10 characters):");
    if (!reason || reason.length < 10) {
      if (reason !== null) alert("Rejection reason must be at least 10 characters.");
      return;
    }
    setActionPending(id);
    try {
      await decide(id, { decided_by: "pm-user", decision: "reject", reason });
      await refresh();
    } catch (error) {
      console.warn("[ApprovalsTab] Reject failed:", error);
    } finally {
      setActionPending(null);
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-semibold text-foreground">Approvals</h2>
            <Badge className="bg-[#34C759]/20 text-[#34C759] border-[#34C759]/30 text-[10px]">
              <Eye className="w-3 h-3 mr-1" />
              Live Data
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">{project.name} • AI-generated actions awaiting approval</p>
        </div>
        <Button
          className="bg-[#007AFF] hover:bg-[#007AFF]/80 text-white"
          onClick={() => refresh()}
        >
          Refresh <ArrowRight className="w-4 h-4 ml-1" />
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-5 gap-3">
        {[
          { label: "Total", value: stats.total, color: "#007AFF" },
          { label: "Pending", value: stats.pending, color: "#FF9500" },
          { label: "Approved", value: stats.approved, color: "#34C759" },
          { label: "Revision", value: stats.revision, color: "#FF3B30" },
          { label: "Expired", value: stats.expired, color: "#8E8E93" },
        ].map((stat) => (
          <Card key={stat.label}>
            <CardContent className="p-3">
              <div className="text-center">
                <p className="text-2xl font-bold" style={{ color: stat.color }}>{stat.value}</p>
                <p className="text-xs text-muted-foreground">{stat.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2">
        {(["all", "pending", "revision_requested", "approved", "expired"] as const).map((status) => (
          <Button
            key={status}
            variant={filter === status ? "default" : "ghost"}
            size="sm"
            onClick={() => setFilter(status)}
            className={filter === status ? "bg-white/10" : ""}
          >
            {status === "all" ? "All" : (statusConfig[status]?.label ?? status)}
          </Button>
        ))}
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          <span className="ml-2 text-sm text-muted-foreground">Loading approvals...</span>
        </div>
      )}

      {/* Empty state */}
      {!isLoading && items.length === 0 && (
        <Card>
          <CardContent className="p-8 text-center">
            <CheckCircle2 className="w-10 h-10 mx-auto text-[#34C759] mb-3" />
            <h3 className="text-lg font-medium text-foreground">All caught up!</h3>
            <p className="text-sm text-muted-foreground mt-1">No approval items found. Agent actions will appear here when they need your review.</p>
          </CardContent>
        </Card>
      )}

      {/* Approval Items */}
      <div className="space-y-3">
        {items.map((item) => {
          const status = item.status as string;
          const cfg = statusConfig[status] ?? { label: status, color: "#8E8E93", icon: Clock };
          const StatusIcon = cfg.icon;
          const sysCfg = systemConfig[item.target_system] ?? { label: item.target_system, icon: FileText };
          const SystemIcon = sysCfg.icon;
          const isExpanded = expandedId === item.approval_id;
          const isDeciding = actionPending === item.approval_id;

          return (
            <Card key={item.approval_id} className="glass">
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge
                        className="text-[10px]"
                        style={{
                          backgroundColor: `${cfg.color}20`,
                          color: cfg.color,
                          borderColor: `${cfg.color}40`,
                        }}
                      >
                        <StatusIcon className="w-3 h-3 mr-1" />
                        {cfg.label}
                      </Badge>
                      <Badge
                        variant="outline"
                        className="text-[10px]"
                        style={{
                          borderColor: `${(priorityConfig[item.priority]?.color ?? "#8E8E93")}40`,
                          color: priorityConfig[item.priority]?.color ?? "#8E8E93",
                        }}
                      >
                        {priorityConfig[item.priority]?.label ?? item.priority}
                      </Badge>
                      <Badge variant="outline" className="text-[10px]">
                        <SystemIcon className="w-3 h-3 mr-1" />
                        {sysCfg.label}
                      </Badge>
                    </div>
                    <h3 className="text-sm font-medium text-foreground mb-1">{item.title}</h3>
                    <p className="text-xs text-muted-foreground mb-2">{item.description}</p>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span>ID: {item.approval_id.slice(0, 8)}</span>
                      <span>By: {item.requested_by_role}</span>
                      <span>Confidence: <span className="font-medium text-[#34C759]">{item.confidence}%</span></span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {(item.status === "pending" || item.status === "revision_requested") && (
                      <>
                        <Button
                          size="sm"
                          className="bg-[#34C759] hover:bg-[#34C759]/80 text-white"
                          onClick={() => handleApprove(item.approval_id)}
                          disabled={isDeciding}
                        >
                          <CheckCircle2 className="w-4 h-4 mr-1" />
                          {isDeciding ? "..." : "Approve"}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-[#FF3B30]/30 text-[#FF3B30]"
                          onClick={() => handleReject(item.approval_id)}
                          disabled={isDeciding}
                        >
                          Reject
                        </Button>
                      </>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setExpandedId(isExpanded ? null : item.approval_id)}
                    >
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </Button>
                  </div>
                </div>

                {/* Expanded Detail */}
                {isExpanded && (
                  <div className="mt-4 pt-4 border-t border-white/10 space-y-3">
                    {/* Summary */}
                    <div>
                      <h4 className="text-xs font-medium text-muted-foreground mb-1">Summary of Changes</h4>
                      <p className="text-xs text-foreground bg-white/5 rounded p-2">{item.summary_diff}</p>
                    </div>
                    {/* Source refs */}
                    {item.source_refs.length > 0 && (
                      <div>
                        <h4 className="text-xs font-medium text-muted-foreground mb-1 flex items-center gap-2">
                          <Shield className="w-3 h-3" /> Source References
                        </h4>
                        {item.source_refs.map((ref, idx) => (
                          <div key={idx} className="text-xs text-foreground ml-5">
                            {ref.type} — {ref.title ?? ref.id}
                          </div>
                        ))}
                      </div>
                    )}
                    {/* Decision info */}
                    {item.decided_by && (
                      <div className="text-xs text-muted-foreground">
                        Decision: {item.decision} by {item.decided_by} at {item.decided_at ? new Date(item.decided_at).toLocaleString() : "—"}
                      </div>
                    )}
                    {item.rejection_reason && (
                      <div className="text-xs text-[#FF3B30]">Reason: {item.rejection_reason}</div>
                    )}
                    {item.revision_notes && (
                      <div className="text-xs text-[#FF9500]">Revision Notes: {item.revision_notes}</div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Footer Info */}
      <Card>
        <CardContent className="p-3">
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Shield className="w-3 h-3" />
              All actions require PM approval before execution
            </span>
            <span className="ml-auto">
              {items.length} item(s) in queue
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
