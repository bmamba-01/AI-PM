import React from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../App';

type Props = NativeStackScreenProps<RootStackParamList, 'Approvals'>;

type ApprovalPriority = 'critical' | 'high' | 'medium' | 'low';
type ApprovalStatus = 'pending' | 'revision_requested' | 'approved' | 'rejected' | 'cancelled' | 'expired' | 'executing' | 'executed' | 'execution_failed';

interface ApprovalItem {
  approval_id: string;
  project_id: string;
  item_type: string;
  workflow_id: string;
  run_id: string;
  requested_by_agent: string;
  requested_by_role: string;
  title: string;
  description: string;
  summary_diff: string;
  confidence: number;
  source_refs: Array<{ type: string; id: string; title: string; accessed_at: string }>;
  priority: ApprovalPriority;
  target_system: string;
  target_id: string;
  status: ApprovalStatus;
  revision_round: number;
  deadline: string | null;
  ttl_seconds: number | null;
  assigned_approvers: string[];
  created_at: string;
  updated_at: string;
  decided_at: string | null;
  executed_at: string | null;
  decision: 'approve' | 'reject' | 'revision_requested' | 'cancel' | null;
  decided_by: string | null;
  rejection_reason: string | null;
  revision_notes: string | null;
  delegated_to: string | null;
  execution_status: 'pending' | 'executing' | 'executed' | 'execution_failed';
  execution_error: string | null;
  execution_target_response: string | null;
  retry_count: number;
  policy_rule_id: string | null;
}

const STATUS_COLOR: Record<ApprovalStatus, string> = {
  pending: '#f59e0b',
  revision_requested: '#fb923c',
  approved: '#10b981',
  rejected: '#ef4444',
  cancelled: '#64748b',
  expired: '#64748b',
  executing: '#38bdf8',
  executed: '#10b981',
  execution_failed: '#ef4444',
};

const PRIORITIES: Record<ApprovalPriority, string> = {
  critical: '#ef4444',
  high: '#f97316',
  medium: '#f59e0b',
  low: '#94a3b8',
};

// Mock data aligned with the approval queue runtime contract and schema.
// TODO: Replace with live queue data once the approval queue runtime lands.
const mockApprovals: ApprovalItem[] = [
  {
    approval_id: 'a1d5b4c6-7f9c-4d8a-b1e2-3f4a5b6c7d8e',
    project_id: 'proj-001',
    item_type: 'report_publish',
    workflow_id: 'wf-reporting-weekly',
    run_id: 'run-20260619-001',
    requested_by_agent: 'agent-reporting',
    requested_by_role: 'reporting',
    title: 'Publish weekly stakeholder report',
    description: 'Send the generated weekly status report to the stakeholder distribution list via Gmail.',
    summary_diff: 'Adds section 4 (risks), updates burndown chart, and sends to 8 recipients.',
    confidence: 84,
    source_refs: [
      { type: 'transcript', id: 'mtg-20260619-standup', title: 'Daily standup transcript', accessed_at: '2026-06-19T07:55:00Z' },
    ],
    priority: 'high',
    target_system: 'gmail',
    target_id: 'msg-stakeholder-weekly-20260619',
    status: 'pending',
    revision_round: 0,
    deadline: '2026-06-19T14:00:00Z',
    ttl_seconds: 3600,
    assigned_approvers: [],
    created_at: '2026-06-19T08:05:00Z',
    updated_at: '2026-06-19T08:05:00Z',
    decided_at: null,
    executed_at: null,
    decision: null,
    decided_by: null,
    rejection_reason: null,
    revision_notes: null,
    delegated_to: null,
    execution_status: 'pending',
    execution_error: null,
    execution_target_response: null,
    retry_count: 0,
    policy_rule_id: null,
  },
  {
    approval_id: 'b2e6c5d7-8a0d-4e9f-a2f3-4g5h6i7j8k9l',
    project_id: 'proj-001',
    item_type: 'jira_issue_update',
    workflow_id: 'wf-risk-monitoring',
    run_id: 'run-20260619-002',
    requested_by_agent: 'agent-risk',
    requested_by_role: 'risk',
    title: 'Close resolved risk PROJ-247',
    description: 'Mark risk PROJ-247 as mitigated and update the risk register with the mitigation evidence.',
    summary_diff: 'Changes risk status from Open to Closed, attaches mitigation log, updates risk score to 2.',
    confidence: 71,
    source_refs: [
      { type: 'jira', id: 'PROJ-247', title: 'Integration timeout risk', accessed_at: '2026-06-19T07:30:00Z' },
    ],
    priority: 'medium',
    target_system: 'jira',
    target_id: 'PROJ-247',
    status: 'revision_requested',
    revision_round: 1,
    deadline: null,
    ttl_seconds: 14400,
    assigned_approvers: [],
    created_at: '2026-06-19T07:45:00Z',
    updated_at: '2026-06-19T08:12:00Z',
    decided_at: '2026-06-19T08:12:00Z',
    executed_at: null,
    decision: 'revision_requested',
    decided_by: 'pm-user-01',
    rejection_reason: null,
    revision_notes: 'Attach the mitigation evidence note before closing.',
    delegated_to: null,
    execution_status: 'pending',
    execution_error: null,
    execution_target_response: null,
    retry_count: 0,
    policy_rule_id: null,
  },
  {
    approval_id: 'c3f7d6e8-9b1e-4f0g-b3g4-5h6i7j8k9l0m',
    project_id: 'proj-001',
    item_type: 'scope_baseline_change',
    workflow_id: 'wf-change-control',
    run_id: 'run-20260619-003',
    requested_by_agent: 'agent-pm-commander',
    requested_by_role: 'pm_commander',
    title: 'Adjust scope baseline for Phase 2',
    description: 'Update the approved scope baseline to reflect the negotiated requirement change from yesterday\'s client review.',
    summary_diff: 'Baseline revised from v3.1 to v3.2, adds two non-functional requirements, removes unused integration spike.',
    confidence: 90,
    source_refs: [
      { type: 'notion', id: 'req-phase2-v3.2', title: 'Phase 2 requirements page', accessed_at: '2026-06-19T06:50:00Z' },
    ],
    priority: 'critical',
    target_system: 'notion',
    target_id: 'req-phase2-v3.2',
    status: 'approved',
    revision_round: 0,
    deadline: '2026-06-19T09:00:00Z',
    ttl_seconds: null,
    assigned_approvers: [],
    created_at: '2026-06-19T06:30:00Z',
    updated_at: '2026-06-19T08:45:00Z',
    decided_at: '2026-06-19T08:45:00Z',
    executed_at: null,
    decision: 'approve',
    decided_by: 'pm-user-01',
    rejection_reason: null,
    revision_notes: null,
    delegated_to: null,
    execution_status: 'pending',
    execution_error: null,
    execution_target_response: null,
    retry_count: 0,
    policy_rule_id: null,
  },
  {
    approval_id: 'd4g8e7f9-0c2f-4g1h-c4h5-6i7j8k9l0m1n',
    project_id: 'proj-001',
    item_type: 'github_pr_merge',
    workflow_id: 'wf-code-quality-guard',
    run_id: 'run-20260619-004',
    requested_by_agent: 'agent-code-quality',
    requested_by_role: 'code_quality_guard',
    title: 'Merge PR #234 — fix auth redirect loop',
    description: 'Merge the hotfix branch after automated checks pass and the security review is complete.',
    summary_diff: 'Merges hotfix/auth-redirect-loop into main, updates auth middleware, adds regression test.',
    confidence: 62,
    source_refs: [
      { type: 'github', id: '234', title: 'PR #234 fix auth redirect loop', accessed_at: '2026-06-19T07:20:00Z' },
    ],
    priority: 'high',
    target_system: 'github',
    target_id: 'PR-234',
    status: 'execution_failed',
    revision_round: 0,
    deadline: null,
    ttl_seconds: null,
    assigned_approvers: [],
    created_at: '2026-06-19T07:00:00Z',
    updated_at: '2026-06-19T09:10:00Z',
    decided_at: '2026-06-19T09:00:00Z',
    executed_at: null,
    decision: 'approve',
    decided_by: 'pm-user-01',
    rejection_reason: null,
    revision_notes: null,
    delegated_to: null,
    execution_status: 'execution_failed',
    execution_error: 'GitHub API returned 403: token lacks merge permission on repo.',
    execution_target_response: null,
    retry_count: 1,
    policy_rule_id: null,
  },
];

function timeAgo(iso: string): string {
  const now = new Date('2026-06-19T09:15:00Z').getTime();
  const diffMs = now - new Date(iso).getTime();
  const minutes = Math.max(0, Math.floor(diffMs / 60000));
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  return `${days}d`;
}

export function ApprovalsScreen(_props: Props) {
  return (
    <View style={styles.container}>
      <FlatList
        data={mockApprovals}
        keyExtractor={item => item.approval_id}
        renderItem={({ item }) => (
          <View style={styles.approvalItem}>
            <View style={styles.headerRow}>
              <View style={[styles.priorityDot, { backgroundColor: PRIORITIES[item.priority] }]} />
              <Text style={styles.approvalTitle} numberOfLines={1}>
                {item.title}
              </Text>
              <Text style={[styles.statusBadge, { color: STATUS_COLOR[item.status] }]}>{item.status}</Text>
            </View>

            <Text style={styles.approvalMeta} numberOfLines={1}>
              {item.workflow_id.replace('wf-', '')} · {item.target_system} · {timeAgo(item.created_at)} ago
            </Text>

            <Text style={styles.approvalRequester}>Requested by {item.requested_by_role}</Text>

            <View style={styles.actions}>
              {item.status === 'pending' && (
                <>
                  <TouchableOpacity style={[styles.btn, styles.btnApprove]}>
                    <Text style={styles.btnText}>Approve</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.btn, styles.btnReject]}>
                    <Text style={styles.btnText}>Reject</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.btn, styles.btnSecondary]}>
                    <Text style={styles.btnText}>Revise</Text>
                  </TouchableOpacity>
                </>
              )}

              {item.status === 'revision_requested' && (
                <TouchableOpacity style={[styles.btn, styles.btnSecondary]}>
                  <Text style={styles.btnText}>Resubmit</Text>
                </TouchableOpacity>
              )}

              {item.status === 'execution_failed' && (
                <TouchableOpacity style={[styles.btn, styles.btnSecondary]}>
                  <Text style={styles.btnText}>Retry</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a', padding: 16 },
  approvalItem: {
    backgroundColor: '#1e293b',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
  },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  priorityDot: { width: 8, height: 8, borderRadius: 4 },
  approvalTitle: { flex: 1, fontSize: 15, color: '#ffffff', fontWeight: '500' },
  statusBadge: { fontSize: 12, fontWeight: '600', textTransform: 'capitalize' },
  approvalMeta: { fontSize: 12, color: '#94a3b8', marginTop: 6 },
  approvalRequester: { fontSize: 12, color: '#cbd5e1', marginTop: 4 },
  actions: { flexDirection: 'row', marginTop: 12, alignItems: 'center', gap: 10 },
  btn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 6 },
  btnApprove: { backgroundColor: '#10b981' },
  btnReject: { backgroundColor: '#ef4444' },
  btnSecondary: { backgroundColor: '#334155' },
  btnText: { color: '#fff', fontSize: 13 },
});