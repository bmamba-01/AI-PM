import { Project } from "@ai-pm/core";
import { Card, CardContent } from "../ui/card";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import {
  Clock, CheckCircle2, XCircle, AlertTriangle, ArrowRight,
  GitPullRequest, FileText, ChevronDown, ChevronUp,
  Shield, Eye, Loader2, RotateCcw, Search, Download,
  Plus, CheckSquare, Square, History, Trash2
} from "lucide-react";
import { useState, useEffect, useCallback } from "react";
import { SetupGuideDialog, GuideButton } from "../setup/SetupGuideDialog";
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
  const [showGuide, setShowGuide] = useState(false);
  const [filter, setFilter] = useState<string>(() => {
    // Load filter from localStorage (feature #7: filter persistence)
    const saved = localStorage.getItem(`approvals-filter-${project.id}`);
    return saved || "all";
  });
  const [actionPending, setActionPending] = useState<string | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [showCreateForm, setShowCreateForm] = useState(false);

  // Confirmation state
  const [confirmAction, setConfirmAction] = useState<{
    type: "approve" | "reject" | "revision";
    itemId: string;
    itemTitle: string;
  } | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [revisionNotes, setRevisionNotes] = useState("");

  // Feature #7: Save filter to localStorage when it changes
  useEffect(() => {
    localStorage.setItem(`approvals-filter-${project.id}`, filter);
  }, [filter, project.id]);

  // Feature #8: Filter items by search query
  const filteredItems = items.filter(item => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      item.title.toLowerCase().includes(q) ||
      item.description.toLowerCase().includes(q) ||
      item.target_system.toLowerCase().includes(q) ||
      item.action_type.toLowerCase().includes(q)
    );
  });

  // Feature #9: Export functions
  function exportToJSON() {
    const data = JSON.stringify(filteredItems, null, 2);
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `approvals-${project.name}-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast("Exported to JSON");
  }

  function exportToCSV() {
    const headers = ["ID", "Title", "Status", "Priority", "Target System", "Confidence", "Created At"];
    const rows = filteredItems.map(item => [
      item.approval_id,
      item.title,
      item.status,
      item.priority,
      item.target_system,
      item.confidence,
      item.created_at,
    ]);
    const csv = [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `approvals-${project.name}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showToast("Exported to CSV");
  }

  // Feature #6: Bulk selection helpers
  function toggleItemSelection(id: string) {
    setSelectedItems(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    if (selectedItems.size === filteredItems.length) {
      setSelectedItems(new Set());
    } else {
      setSelectedItems(new Set(filteredItems.map(item => item.approval_id)));
    }
  }

  async function bulkApprove() {
    const ids = Array.from(selectedItems);
    if (ids.length === 0) return;
    setActionPending("bulk");
    try {
      await Promise.all(ids.map(id => decide(id, { decided_by: "pm-user", decision: "approve" })));
      await refresh();
      showToast(`Approved ${ids.length} item(s)`);
      setSelectedItems(new Set());
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Bulk approve failed", "error");
    } finally {
      setActionPending(null);
    }
  }

  async function bulkReject() {
    const ids = Array.from(selectedItems);
    if (ids.length === 0) return;
    const reason = prompt("Enter rejection reason (min 10 characters):");
    if (!reason || reason.length < 10) {
      showToast("Rejection reason must be at least 10 characters", "error");
      return;
    }
    setActionPending("bulk");
    try {
      await Promise.all(ids.map(id => decide(id, { decided_by: "pm-user", decision: "reject", reason })));
      await refresh();
      showToast(`Rejected ${ids.length} item(s)`);
      setSelectedItems(new Set());
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Bulk reject failed", "error");
    } finally {
      setActionPending(null);
    }
  }

  // Feature #10: Keyboard shortcuts
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      // Ignore if typing in an input/textarea or modal is open
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || confirmAction || showCreateForm) return;

      if (e.key === "Escape") {
        setExpandedId(null);
        setSelectedItems(new Set());
      }

      // If exactly one item is selected, enable approve/reject shortcuts
      if (selectedItems.size === 1) {
        const id = Array.from(selectedItems)[0];
        const item = filteredItems.find(i => i.approval_id === id);
        if (!item) return;
        const isActionable = item.status === "pending" || item.status === "revision_requested";

        if (isActionable) {
          if (e.key === "a" || e.key === "A") {
            e.preventDefault();
            setConfirmAction({ type: "approve", itemId: id, itemTitle: item.title });
          } else if (e.key === "r" || e.key === "R") {
            e.preventDefault();
            setConfirmAction({ type: "reject", itemId: id, itemTitle: item.title });
          }
        }
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedItems, filteredItems, confirmAction, showCreateForm]);

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
      {/* Setup Guide Dialog */}
      {showGuide && (
        <SetupGuideDialog
          title="Approvals Setup Guide"
          purpose="The approval queue manages external mutations proposed by AI agents. All email, Jira, GitHub, and Notion actions require PM approval before execution."
          requiredSetup={[
            "Project profile configured",
            "MCP connectors for target systems",
            "Approval policies defined (optional)",
          ]}
          cliEquivalent="ai-pm approval list --json"
          onClose={() => setShowGuide(false)}
        />
      )}

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

      {/* Create approval form modal */}
      {showCreateForm && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/50 overflow-y-auto" onClick={() => setShowCreateForm(false)}>
          <div className="glass-card rounded-xl p-6 w-full max-w-2xl my-8 space-y-4" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-foreground">Create Approval Request</h3>
            <form onSubmit={async (e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              try {
                const newItem = {
                  project_id: project.id,
                  title: formData.get("title") as string,
                  description: formData.get("description") as string,
                  action_type: formData.get("action_type") as string,
                  target_system: formData.get("target_system") as string,
                  target_id: formData.get("target_id") as string,
                  workflow_id: "manual",
                  run_id: `manual-${Date.now()}`,
                  requested_by_agent: "manual",
                  requested_by_role: "pm_user",
                  summary_diff: formData.get("summary_diff") as string,
                  confidence: parseInt(formData.get("confidence") as string),
                  source_refs: [],
                  priority: formData.get("priority") as "critical" | "high" | "medium" | "low",
                };
                await window.electronAPI.approvals.create(newItem);
                await refresh();
                setShowCreateForm(false);
                showToast("Approval created successfully");
              } catch (err) {
                showToast(err instanceof Error ? err.message : "Failed to create approval", "error");
              }
            }} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-muted-foreground">Title *</label>
                  <input
                    name="title"
                    required
                    className="mt-1 w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-[#007AFF]/50"
                    placeholder="Brief title for the approval"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Priority *</label>
                  <select
                    name="priority"
                    required
                    defaultValue="medium"
                    className="mt-1 w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-[#007AFF]/50"
                  >
                    <option value="critical">Critical</option>
                    <option value="high">High</option>
                    <option value="medium">Medium</option>
                    <option value="low">Low</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Description *</label>
                <textarea
                  name="description"
                  required
                  rows={3}
                  className="mt-1 w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-[#007AFF]/50"
                  placeholder="Detailed description of what needs approval"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-muted-foreground">Action Type *</label>
                  <select
                    name="action_type"
                    required
                    className="mt-1 w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-[#007AFF]/50"
                  >
                    <option value="report_publish">Report Publish</option>
                    <option value="scope_change">Scope Change</option>
                    <option value="pr_merge">PR Merge</option>
                    <option value="risk_closure">Risk Closure</option>
                    <option value="budget_update">Budget Update</option>
                    <option value="baseline_change">Baseline Change</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Target System *</label>
                  <select
                    name="target_system"
                    required
                    className="mt-1 w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-[#007AFF]/50"
                  >
                    <option value="jira">Jira</option>
                    <option value="github">GitHub</option>
                    <option value="gmail">Gmail</option>
                    <option value="notion">Notion</option>
                    <option value="confluence">Confluence</option>
                    <option value="local_file">Local File</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-muted-foreground">Target ID *</label>
                  <input
                    name="target_id"
                    required
                    className="mt-1 w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-[#007AFF]/50"
                    placeholder="e.g., PR-123, JIRA-456"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Confidence (0-100)</label>
                  <input
                    name="confidence"
                    type="number"
                    min="0"
                    max="100"
                    defaultValue="80"
                    className="mt-1 w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-[#007AFF]/50"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Summary of Changes *</label>
                <textarea
                  name="summary_diff"
                  required
                  rows={2}
                  className="mt-1 w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-[#007AFF]/50"
                  placeholder="Brief summary of what will change"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="ghost" onClick={() => setShowCreateForm(false)}>
                  Cancel
                </Button>
                <Button type="submit" className="bg-[#34C759] hover:bg-[#34C759]/80 text-white">
                  <Plus className="w-4 h-4 mr-1" /> Create Approval
                </Button>
              </div>
            </form>
          </div>
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
            <GuideButton onClick={() => setShowGuide(true)} />
            <Badge className="bg-[#34C759]/20 text-[#34C759] border-[#34C759]/30 text-[10px]">
              <Eye className="w-3 h-3 mr-1" />
              Live Data
            </Badge>
            {selectedItems.size > 0 && (
              <Badge className="bg-[#007AFF]/20 text-[#007AFF] border-[#007AFF]/30 text-[10px]">
                {selectedItems.size} selected
              </Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground">{project.name} • AI-generated actions awaiting approval</p>
        </div>
        <div className="flex items-center gap-2">
          {/* Export buttons */}
          <Button
            variant="outline"
            size="sm"
            onClick={exportToJSON}
            disabled={filteredItems.length === 0}
          >
            <Download className="w-4 h-4 mr-1" /> JSON
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={exportToCSV}
            disabled={filteredItems.length === 0}
          >
            <Download className="w-4 h-4 mr-1" /> CSV
          </Button>
          {/* Create button */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowCreateForm(true)}
            className="border-[#34C759]/30 text-[#34C759]"
          >
            <Plus className="w-4 h-4 mr-1" /> Create
          </Button>
          <Button
            className="bg-[#007AFF] hover:bg-[#007AFF]/80 text-white"
            onClick={() => refresh()}
          >
            <RotateCcw className="w-4 h-4 mr-1" /> Refresh
          </Button>
        </div>
      </div>

      {/* Search bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search approvals by title, description, system, or action type..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-[#007AFF]/50"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <XCircle className="w-4 h-4" />
          </button>
        )}
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

      {/* Bulk selection controls */}
      {filteredItems.length > 0 && (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={toggleSelectAll}
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              {selectedItems.size === filteredItems.length ? (
                <CheckSquare className="w-4 h-4 text-[#007AFF]" />
              ) : (
                <Square className="w-4 h-4" />
              )}
              <span>Select All ({filteredItems.length})</span>
            </button>
            {selectedItems.size > 0 && (
              <span className="text-xs text-muted-foreground">
                {selectedItems.size} of {filteredItems.length} selected
              </span>
            )}
          </div>
          {selectedItems.size > 0 && (
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                className="bg-[#34C759] hover:bg-[#34C759]/80 text-white"
                onClick={bulkApprove}
                disabled={actionPending === "bulk"}
              >
                <CheckCircle2 className="w-4 h-4 mr-1" />
                Approve Selected
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="border-[#FF3B30]/30 text-[#FF3B30]"
                onClick={bulkReject}
                disabled={actionPending === "bulk"}
              >
                <Trash2 className="w-4 h-4 mr-1" />
                Reject Selected
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setSelectedItems(new Set())}
              >
                Clear
              </Button>
            </div>
          )}
        </div>
      )}

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
      {!isLoading && !error && filteredItems.length === 0 && (
        <Card>
          <CardContent className="p-10 text-center">
            {searchQuery ? (
              <>
                <Search className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium text-foreground">No matching approvals</h3>
                <p className="text-sm text-muted-foreground mt-2 max-w-md mx-auto">
                  Try adjusting your search or filter criteria.
                </p>
                <Button variant="outline" className="mt-4" onClick={() => setSearchQuery("")}>
                  Clear Search
                </Button>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-12 h-12 mx-auto text-[#34C759] mb-4" />
                <h3 className="text-lg font-medium text-foreground">✓ No pending approvals</h3>
                <p className="text-sm text-muted-foreground mt-2 max-w-md mx-auto">
                  All caught up! New approval requests will appear here when agents need your review.
                </p>
                <Button variant="outline" className="mt-4" onClick={() => refresh()}>
                  <RotateCcw className="w-4 h-4 mr-1" /> Refresh
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* Approval Items */}
      {!isLoading && !error && filteredItems.length > 0 && (
        <div className="space-y-3">
          {filteredItems.map((item) => {
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
                  <div className="flex items-start gap-3">
                    {/* Checkbox for bulk selection */}
                    <div className="pt-1">
                      <button
                        onClick={() => toggleItemSelection(item.approval_id)}
                        className="text-muted-foreground hover:text-foreground transition-colors"
                      >
                        {selectedItems.has(item.approval_id) ? (
                          <CheckSquare className="w-5 h-5 text-[#007AFF]" />
                        ) : (
                          <Square className="w-5 h-5" />
                        )}
                      </button>
                    </div>

                    <div className="flex-1">
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

                      {/* Status history timeline (feature #2) */}
                      <div>
                        <h4 className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-2">
                          <History className="w-3 h-3" /> Status Timeline
                        </h4>
                        <div className="space-y-2 ml-5">
                          {/* Created */}
                          <div className="flex items-start gap-2 text-xs">
                            <div className="w-2 h-2 rounded-full bg-[#8E8E93] mt-1" />
                            <div>
                              <div className="font-medium text-foreground">Created</div>
                              <div className="text-muted-foreground">{new Date(item.created_at).toLocaleString()}</div>
                              <div className="text-muted-foreground">By {item.requested_by_role}</div>
                            </div>
                          </div>

                          {/* Status changes */}
                          {item.status !== "draft" && (
                            <div className="flex items-start gap-2 text-xs">
                              <div className={`w-2 h-2 rounded-full mt-1`} style={{ backgroundColor: statusConfig[item.status]?.color ?? "#8E8E93" }} />
                              <div>
                                <div className="font-medium text-foreground">{statusConfig[item.status]?.label ?? item.status}</div>
                                <div className="text-muted-foreground">{new Date(item.updated_at).toLocaleString()}</div>
                                {item.decided_by && (
                                  <div className="text-muted-foreground">By {item.decided_by}</div>
                                )}
                              </div>
                            </div>
                          )}

                          {/* Revision rounds */}
                          {item.revision_round > 0 && (
                            <div className="flex items-start gap-2 text-xs">
                              <div className="w-2 h-2 rounded-full bg-[#FF9500] mt-1" />
                              <div>
                                <div className="font-medium text-foreground">Revision Round {item.revision_round}</div>
                                <div className="text-muted-foreground">Requested revisions</div>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Audit trail viewer (feature #12) */}
                      <details className="group">
                        <summary className="text-xs font-medium text-muted-foreground cursor-pointer hover:text-foreground flex items-center gap-2">
                          <Shield className="w-3 h-3" /> Audit Trail
                          <ChevronDown className="w-3 h-3 group-open:rotate-180 transition-transform" />
                        </summary>
                        <div className="mt-2 ml-5 space-y-2 text-xs">
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <div className="text-muted-foreground">Approval ID</div>
                              <div className="text-foreground font-mono">{item.approval_id}</div>
                            </div>
                            <div>
                              <div className="text-muted-foreground">Project ID</div>
                              <div className="text-foreground font-mono">{item.project_id}</div>
                            </div>
                            <div>
                              <div className="text-muted-foreground">Workflow ID</div>
                              <div className="text-foreground font-mono">{item.workflow_id}</div>
                            </div>
                            <div>
                              <div className="text-muted-foreground">Run ID</div>
                              <div className="text-foreground font-mono">{item.run_id}</div>
                            </div>
                            <div>
                              <div className="text-muted-foreground">Requested By</div>
                              <div className="text-foreground">{item.requested_by_agent}</div>
                            </div>
                            <div>
                              <div className="text-muted-foreground">Role</div>
                              <div className="text-foreground">{item.requested_by_role}</div>
                            </div>
                            <div>
                              <div className="text-muted-foreground">Target System</div>
                              <div className="text-foreground">{item.target_system}</div>
                            </div>
                            <div>
                              <div className="text-muted-foreground">Target ID</div>
                              <div className="text-foreground">{item.target_id}</div>
                            </div>
                            <div>
                              <div className="text-muted-foreground">Execution Status</div>
                              <div className="text-foreground">{item.execution_status}</div>
                            </div>
                            <div>
                              <div className="text-muted-foreground">Retry Count</div>
                              <div className="text-foreground">{item.retry_count}</div>
                            </div>
                            {item.deadline && (
                              <div>
                                <div className="text-muted-foreground">Deadline</div>
                                <div className="text-foreground">{new Date(item.deadline).toLocaleString()}</div>
                              </div>
                            )}
                            {item.ttl_seconds && (
                              <div>
                                <div className="text-muted-foreground">TTL (seconds)</div>
                                <div className="text-foreground">{item.ttl_seconds}</div>
                              </div>
                            )}
                            {item.execution_error && (
                              <div className="col-span-2">
                                <div className="text-muted-foreground">Execution Error</div>
                                <div className="text-[#FF3B30] font-mono text-[10px] bg-[#FF3B30]/10 p-2 rounded">
                                  {item.execution_error}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </details>

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
