import { Project } from "@ai-pm/core";
import { Card, CardContent } from "../ui/card";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import {
  Clock, CheckCircle2, XCircle, AlertTriangle, ArrowRight,
  GitPullRequest, FileText, ChevronDown, ChevronUp,
  Shield, Eye, Loader2, RotateCcw
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

// Simple toast state
interface Toast { id: number; message: string; type: "success" | "error" }
let toastCounter = 0;

export function ApprovalsTab({ project }: Props) {
  const { items, counts, isLoading, error, loadItems, loadCounts, decide, refresh, clearError } = useApprovalStore();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>("all");
  const [actionPending, setActionPending] = useState<string | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);

  // Confirmation state
  const [confirmAction, setConfirmAction] = useState<{
    type: "approve" | "reject" | "revision";
    itemId: string;
    itemTitle: string;
  } | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [revisionNotes, setRevisionNotes] = useState("");

  function showToast(message: string, type: Toast["type"] = "success") {
    const id = ++toastCounter;
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000);
  }

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

  async function executeAction(id: string, decision: "approve" | "reject" | "revision_requested", opts?: { reason?: string; notes?: string }) {
    setActionPending(id);
    try {
      await decide(id, { decided_by: "pm-user", decision, ...opts });
      await refresh();
      const label = decision === "approve" ? "Approved" : decision === "reject" ? "Rejected" : "Revision requested";
      showToast(label);
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Action failed", "error");
    } finally {
      setActionPending(null);
    }
  }

  function handleApproveConfirm() {
    if (!confirmAction) return;
    executeAction(confirmAction.itemId, "approve");
    setConfirmAction(null);
  }

  function handleRejectConfirm() {
    if (!confirmAction) return;
    if (rejectReason.length < 10) return;
    executeAction(confirmAction.itemId, "reject", { reason: rejectReason });
    setConfirmAction(null);
    setRejectReason("");
  }

  function handleRevisionConfirm() {
    if (!confirmAction) return;
    if (revisionNotes.length < 10) return;
    executeAction(confirmAction.itemId, "revision_requested", { notes: revisionNotes });
    setConfirmAction(null);
    setRevisionNotes("");
  }

  return (
    <div className="space-y-5">
      {/* Toast overlay */}
      {toasts.length > 0 && (
        <div className="fixed top-4 right-4 z-50 space-y-2">
          {toasts.map(t => (
            <div
              key={t.id}
              className={`px-4 py-3 rounded-lg glass-card text-sm font-medium shadow-lg transition-all ${
                t.type === "success" ? "border-[#34C759]/30 text-[#34C759]" : "border-[#FF3B30]/30 text-[#FF3B30]"
              }`}
            >
              {t.type === "success" ? <CheckCircle2 className="w-4 h-4 inline mr-2" /> : <AlertTriangle className="w-4 h-4 inline mr-2" />}
              {t.message}
            </div>
          ))}
        </div>
      )}

      {/* Confirmation modal */}
      {confirmAction && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/50" onClick={() => { setConfirmAction(null); setRejectReason(""); setRevisionNotes(""); }}>
          <div className="glass-card rounded-xl p-6 w-full max-w-md space-y-4" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-foreground">
              {confirmAction.type === "approve" && "Confirm Approval"}
              {confirmAction.type === "reject" && "Reject Approval"}
              {confirmAction.type === "revision" && "Request Revision"}
            </h3>
            <p className="text-sm text-muted-foreground">{confirmAction.itemTitle}</p>

            {confirmAction.type === "reject" && (
              <div>
                <label className="text-xs text-muted-foreground">Rejection reason (min 10 chars)</label>
                <textarea
                  className="mt-1 w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-[#FF3B30]/50"
                  rows={3}
                  value={rejectReason}
                  onChange={e => setRejectReason(e.target.value)}
                  placeholder="Explain why this is being rejected..."
                />
                <p className="text-xs text-muted-foreground mt-1">{rejectReason.length}/10 min</p>
              </div>
            )}

            {confirmAction.type === "revision" && (
              <div>
                <label className="text-xs text-muted-foreground">Revision instructions (min 10 chars)</label>
                <textarea
                  className="mt-1 w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-[#FF9500]/50"
                  rows={3}
                  value={revisionNotes}
                  onChange={e => setRevisionNotes(e.target.value)}
                  placeholder="Describe what needs to change..."
                />
                <p className="text-xs text-muted-foreground mt-1">{revisionNotes.length}/10 min</p>
              </div>
            )}

            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => { setConfirmAction(null); setRejectReason(""); setRevisionNotes(""); }}>
                Cancel
              </Button>
              {confirmAction.type === "approve" && (
                <Button className="bg-[#34C759] hover:bg-[#34C759]/80 text-white" onClick={handleApproveConfirm}>
                  <CheckCircle2 className="w-4 h-4 mr-1" /> Approve
                </Button>
              )}
              {confirmAction.type === "reject" && (
                <Button
                  variant="destructive"
                  onClick={handleRejectConfirm}
                  disabled={rejectReason.length < 10}
                >
                  Reject
                </Button>
              )}
              {confirmAction.type === "revision" && (
                <Button
                  className="bg-[#FF9500] hover:bg-[#FF9500]/80 text-white"
                  onClick={handleRevisionConfirm}
                  disabled={revisionNotes.length < 10}
                >
                  Request Revision
                </Button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Header */}
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

      {/* Error state */}
      {error && (
        <Card className="border-[#FF3B30]/20">
          <CardContent className="p-6 text-center">
            <AlertTriangle className="w-10 h-10 mx-auto text-[#FF3B30] mb-3" />
            <h3 className="text-lg font-medium text-foreground">Unable to load approvals</h3>
            <p className="text-sm text-muted-foreground mt-1 mb-4">{error}</p>
            <Button
              variant="outline"
              className="border-[#FF3B30]/30 text-[#FF3B30]"
              onClick={() => { clearError(); load(); }}
            >
              <RotateCcw className="w-4 h-4 mr-1" /> Retry
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Loading state */}
      {isLoading && !error && (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className="w-3 h-3 rounded-full bg-white/10 mt-1" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-white/10 rounded w-3/4" />
                    <div className="h-3 bg-white/5 rounded w-1/2" />
                    <div className="h-3 bg-white/5 rounded w-1/3" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Empty state */}
      {!isLoading && !error && items.length === 0 && (
        <Card>
          <CardContent className="p-10 text-center">
            <CheckCircle2 className="w-12 h-12 mx-auto text-[#34C759] mb-4" />
            <h3 className="text-lg font-medium text-foreground">✓ No pending approvals</h3>
            <p className="text-sm text-muted-foreground mt-2 max-w-md mx-auto">
              All caught up! New approval requests will appear here when agents need your review.
            </p>
            <Button variant="outline" className="mt-4" onClick={() => refresh()}>
              <RotateCcw className="w-4 h-4 mr-1" /> Refresh
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Approval Items */}
      {!isLoading && !error && items.length > 0 && (
        <div className="space-y-3">
          {items.map((item) => {
            const status = item.status as string;
            const cfg = statusConfig[status] ?? { label: status, color: "#8E8E93", icon: Clock };
            const StatusIcon = cfg.icon;
            const sysCfg = systemConfig[item.target_system] ?? { label: item.target_system, icon: FileText };
            const SystemIcon = sysCfg.icon;
            const isExpanded = expandedId === item.approval_id;
            const isDeciding = actionPending === item.approval_id;
            const isActionable = item.status === "pending" || item.status === "revision_requested";

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
                      {isActionable && (
                        <>
                          <Button
                            size="sm"
                            className="bg-[#34C759] hover:bg-[#34C759]/80 text-white"
                            onClick={() => setConfirmAction({ type: "approve", itemId: item.approval_id, itemTitle: item.title })}
                            disabled={isDeciding}
                          >
                            <CheckCircle2 className="w-4 h-4 mr-1" />
                            {isDeciding ? "..." : "Approve"}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-[#FF3B30]/30 text-[#FF3B30]"
                            onClick={() => setConfirmAction({ type: "reject", itemId: item.approval_id, itemTitle: item.title })}
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

                      {/* Request revision button in expanded detail */}
                      {isActionable && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="mt-2 border-[#FF9500]/30 text-[#FF9500]"
                          onClick={() => setConfirmAction({ type: "revision", itemId: item.approval_id, itemTitle: item.title })}
                          disabled={isDeciding}
                        >
                          Request Revision
                        </Button>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Footer Info */}
      {!isLoading && items.length > 0 && (
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
      )}
    </div>
  );
}
