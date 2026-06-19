import { Project } from "@ai-pm/core";
import { Card, CardHeader, CardTitle, CardContent } from "../ui/card";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import {
  Clock, CheckCircle2, XCircle, AlertTriangle, ArrowRight,
  GitPullRequest, FileText, ExternalLink, ChevronDown, ChevronUp,
  Shield, Eye
} from "lucide-react";
import { useState } from "react";

interface Props { project: Project }

type ApprovalStatus = "pending" | "revision_requested" | "approved" | "expired";

interface ApprovalItem {
  id: string;
  title: string;
  description: string;
  status: ApprovalStatus;
  priority: "critical" | "high" | "medium" | "low";
  targetSystem: "jira" | "github" | "confluence";
  confidence: number;
  requestedBy: string;
  requestedAt: string;
  auditTrail: AuditEntry[];
}

interface AuditEntry {
  timestamp: string;
  action: string;
  actor: string;
}

const statusConfig: Record<ApprovalStatus, { label: string; color: string; icon: React.ElementType }> = {
  pending: { label: "Pending", color: "#FF9500", icon: Clock },
  revision_requested: { label: "Revision Requested", color: "#FF3B30", icon: AlertTriangle },
  approved: { label: "Approved", color: "#34C759", icon: CheckCircle2 },
  expired: { label: "Expired", color: "#8E8E93", icon: XCircle },
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
};

const mockApprovals: ApprovalItem[] = [
  {
    id: "APR-001",
    title: "Create Jira issue: Follow-up on DB migration",
    description: "Create follow-up task to monitor database migration progress and handle rollback if needed.",
    status: "pending",
    priority: "critical",
    targetSystem: "jira",
    confidence: 92,
    requestedBy: "AI Agent (DB Migration Bot)",
    requestedAt: "2026-06-19T08:30:00Z",
    auditTrail: [
      { timestamp: "2026-06-19T08:30:00Z", action: "Request created", actor: "AI Agent" },
      { timestamp: "2026-06-19T08:31:00Z", action: "Validation passed", actor: "System" },
      { timestamp: "2026-06-19T09:15:00Z", action: "Review requested", actor: "PM (You)" },
    ],
  },
  {
    id: "APR-002",
    title: "Publish weekly client report",
    description: "Generate and publish the weekly status report to the client Confluence space.",
    status: "revision_requested",
    priority: "high",
    targetSystem: "confluence",
    confidence: 78,
    requestedBy: "AI Agent (Report Generator)",
    requestedAt: "2026-06-18T16:45:00Z",
    auditTrail: [
      { timestamp: "2026-06-18T16:45:00Z", action: "Request created", actor: "AI Agent" },
      { timestamp: "2026-06-18T16:46:00Z", action: "Draft generated", actor: "System" },
      { timestamp: "2026-06-18T17:00:00Z", action: "Revision requested", actor: "PM (You)", },
      { timestamp: "2026-06-18T17:05:00Z", action: "Feedback: Add risk section", actor: "PM (You)" },
    ],
  },
  {
    id: "APR-003",
    title: "PR #234 merge approval",
    description: "Merge pull request #234: Implement payment gateway integration with Stripe.",
    status: "approved",
    priority: "medium",
    targetSystem: "github",
    confidence: 95,
    requestedBy: "AI Agent (Code Review Bot)",
    requestedAt: "2026-06-17T14:20:00Z",
    auditTrail: [
      { timestamp: "2026-06-17T14:20:00Z", action: "Request created", actor: "AI Agent" },
      { timestamp: "2026-06-17T14:21:00Z", action: "CI checks passed", actor: "GitHub Actions" },
      { timestamp: "2026-06-17T14:30:00Z", action: "Code review approved", actor: "Senior Dev" },
      { timestamp: "2026-06-17T15:00:00Z", action: "Approved for merge", actor: "PM (You)" },
    ],
  },
  {
    id: "APR-004",
    title: "Update sprint velocity metrics",
    description: "Auto-update sprint velocity dashboard with latest completed story points.",
    status: "expired",
    priority: "low",
    targetSystem: "jira",
    confidence: 65,
    requestedBy: "AI Agent (Metrics Bot)",
    requestedAt: "2026-06-15T10:00:00Z",
    auditTrail: [
      { timestamp: "2026-06-15T10:00:00Z", action: "Request created", actor: "AI Agent" },
      { timestamp: "2026-06-15T10:01:00Z", action: "Awaiting approval", actor: "System" },
      { timestamp: "2026-06-18T10:00:00Z", action: "Expired (72h timeout)", actor: "System" },
    ],
  },
];

export function ApprovalsTab({ project }: Props) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [filter, setFilter] = useState<ApprovalStatus | "all">("all");

  const filteredApprovals = filter === "all"
    ? mockApprovals
    : mockApprovals.filter((a) => a.status === filter);

  const stats = {
    total: mockApprovals.length,
    pending: mockApprovals.filter((a) => a.status === "pending").length,
    approved: mockApprovals.filter((a) => a.status === "approved").length,
    revision: mockApprovals.filter((a) => a.status === "revision_requested").length,
    expired: mockApprovals.filter((a) => a.status === "expired").length,
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-semibold text-foreground">Approvals</h2>
            <Badge className="bg-[#FF9500]/20 text-[#FF9500] border-[#FF9500]/30 text-[10px]">
              <Eye className="w-3 h-3 mr-1" />
              Sample Data
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">{project.name} • AI-generated actions awaiting approval</p>
        </div>
        <Button className="bg-[#007AFF] hover:bg-[#007AFF]/80 text-white">
          Approve All Pending <ArrowRight className="w-4 h-4 ml-1" />
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
            {status === "all" ? "All" : statusConfig[status].label}
          </Button>
        ))}
      </div>

      {/* Approval Items */}
      <div className="space-y-3">
        {filteredApprovals.map((item) => {
          const StatusIcon = statusConfig[item.status].icon;
          const SystemIcon = systemConfig[item.targetSystem].icon;
          const isExpanded = expandedId === item.id;

          return (
            <Card key={item.id} className="glass">
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge
                        className="text-[10px]"
                        style={{
                          backgroundColor: `${statusConfig[item.status].color}20`,
                          color: statusConfig[item.status].color,
                          borderColor: `${statusConfig[item.status].color}40`,
                        }}
                      >
                        <StatusIcon className="w-3 h-3 mr-1" />
                        {statusConfig[item.status].label}
                      </Badge>
                      <Badge
                        variant="outline"
                        className="text-[10px]"
                        style={{
                          borderColor: `${priorityConfig[item.priority].color}40`,
                          color: priorityConfig[item.priority].color,
                        }}
                      >
                        {priorityConfig[item.priority].label}
                      </Badge>
                      <Badge variant="outline" className="text-[10px]">
                        <SystemIcon className="w-3 h-3 mr-1" />
                        {systemConfig[item.targetSystem].label}
                      </Badge>
                    </div>
                    <h3 className="text-sm font-medium text-foreground mb-1">{item.title}</h3>
                    <p className="text-xs text-muted-foreground mb-2">{item.description}</p>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span>ID: {item.id}</span>
                      <span>By: {item.requestedBy}</span>
                      <span>Confidence: <span className="font-medium text-[#34C759]">{item.confidence}%</span></span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {item.status === "pending" && (
                      <>
                        <Button size="sm" className="bg-[#34C759] hover:bg-[#34C759]/80 text-white">
                          <CheckCircle2 className="w-4 h-4 mr-1" /> Approve
                        </Button>
                        <Button size="sm" variant="outline" className="border-[#FF3B30]/30 text-[#FF3B30]">
                          Reject
                        </Button>
                      </>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setExpandedId(isExpanded ? null : item.id)}
                    >
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </Button>
                  </div>
                </div>

                {/* Expanded Audit Trail */}
                {isExpanded && (
                  <div className="mt-4 pt-4 border-t border-white/10">
                    <h4 className="text-xs font-medium text-muted-foreground mb-3 flex items-center gap-2">
                      <Shield className="w-3 h-3" />
                      Audit Trail
                    </h4>
                    <div className="space-y-2">
                      {item.auditTrail.map((entry, idx) => (
                        <div key={idx} className="flex items-center gap-3 text-xs">
                          <span className="text-muted-foreground font-mono w-36 shrink-0">
                            {new Date(entry.timestamp).toLocaleString()}
                          </span>
                          <span className="text-foreground">{entry.action}</span>
                          <span className="text-muted-foreground ml-auto">{entry.actor}</span>
                        </div>
                      ))}
                    </div>
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
              Auto-expire: 72 hours
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
