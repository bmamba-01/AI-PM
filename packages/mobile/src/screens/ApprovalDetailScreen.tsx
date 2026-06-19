import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Alert, TextInput, Modal,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../App';

type Props = NativeStackScreenProps<RootStackParamList, 'ApprovalDetail'>;

type ApprovalPriority = 'critical' | 'high' | 'medium' | 'low';
type ApprovalStatus =
  | 'pending' | 'revision_requested' | 'approved' | 'rejected'
  | 'cancelled' | 'expired' | 'executing' | 'executed' | 'execution_failed';

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

const STATUS_LABEL: Record<ApprovalStatus, string> = {
  pending: 'Pending',
  revision_requested: 'Needs Revision',
  approved: 'Approved',
  rejected: 'Rejected',
  cancelled: 'Cancelled',
  expired: 'Expired',
  executing: 'Executing',
  executed: 'Executed',
  execution_failed: 'Failed',
};

const PRIORITIES: Record<ApprovalPriority, { color: string; label: string }> = {
  critical: { color: '#ef4444', label: 'Critical' },
  high: { color: '#f97316', label: 'High' },
  medium: { color: '#f59e0b', label: 'Medium' },
  low: { color: '#94a3b8', label: 'Low' },
};

const TARGET_ICONS: Record<string, string> = {
  jira: '🎫',
  github: '🐙',
  gmail: '📧',
  confluence: '📄',
  notion: '📋',
};

const MOCK_USERS = [
  { id: 'pm-user-01', name: 'Sarah Chen (PM)' },
  { id: 'dev-user-02', name: 'Marcus Johnson (Dev Lead)' },
  { id: 'qa-user-03', name: 'Priya Sharma (QA)' },
];

// Same mock data as ApprovalsScreen — in production these share a store
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

function CollapsibleSection({
  title,
  defaultCollapsed = true,
  children,
}: {
  title: string;
  defaultCollapsed?: boolean;
  children: React.ReactNode;
}) {
  const [collapsed, setCollapsed] = useState(defaultCollapsed);
  return (
    <View style={styles.section}>
      <TouchableOpacity style={styles.sectionHeader} onPress={() => setCollapsed(!collapsed)}>
        <Text style={styles.sectionTitle}>{title}</Text>
        <Text style={styles.sectionChevron}>{collapsed ? '▸' : '▾'}</Text>
      </TouchableOpacity>
      {!collapsed && <View style={styles.sectionBody}>{children}</View>}
    </View>
  );
}

function InputSheet({
  visible,
  title,
  placeholder,
  value,
  onChangeText,
  onSubmit,
  onCancel,
  submitting,
  minLength = 10,
}: {
  visible: boolean;
  title: string;
  placeholder: string;
  value: string;
  onChangeText: (t: string) => void;
  onSubmit: () => void;
  onCancel: () => void;
  submitting: boolean;
  minLength?: number;
}) {
  const valid = value.trim().length >= minLength;
  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.sheetOverlay}>
        <View style={styles.sheet}>
          <Text style={styles.sheetTitle}>{title}</Text>
          <TextInput
            style={styles.sheetInput}
            placeholder={placeholder}
            placeholderTextColor="#64748b"
            value={value}
            onChangeText={onChangeText}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
          <Text style={styles.sheetHint}>
            {value.trim().length}/{minLength} min characters
          </Text>
          <View style={styles.sheetActions}>
            <TouchableOpacity style={styles.sheetCancel} onPress={onCancel}>
              <Text style={styles.sheetCancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.sheetSubmit, (!valid || submitting) && styles.sheetSubmitDisabled]}
              onPress={valid && !submitting ? onSubmit : undefined}
            >
              <Text style={styles.sheetSubmitText}>{submitting ? 'Submitting...' : 'Submit'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function DelegateSheet({
  visible,
  onSubmit,
  onCancel,
}: {
  visible: boolean;
  onSubmit: (userId: string) => void;
  onCancel: () => void;
}) {
  const [selected, setSelected] = useState<string | null>(null);
  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.sheetOverlay}>
        <View style={styles.sheet}>
          <Text style={styles.sheetTitle}>Delegate to...</Text>
          {MOCK_USERS.map(u => (
            <TouchableOpacity
              key={u.id}
              style={[styles.userRow, selected === u.id && styles.userRowActive]}
              onPress={() => setSelected(u.id)}
            >
              <Text style={[styles.userRowText, selected === u.id && styles.userRowTextActive]}>{u.name}</Text>
              {selected === u.id && <Text style={styles.checkmark}>✓</Text>}
            </TouchableOpacity>
          ))}
          <View style={styles.sheetActions}>
            <TouchableOpacity style={styles.sheetCancel} onPress={onCancel}>
              <Text style={styles.sheetCancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.sheetSubmit, !selected && styles.sheetSubmitDisabled]}
              onPress={selected ? () => onSubmit(selected) : undefined}
            >
              <Text style={styles.sheetSubmitText}>Delegate</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

export function ApprovalDetailScreen({ route, navigation }: Props) {
  const { approvalId } = route.params;
  const item = mockApprovals.find(a => a.approval_id === approvalId);

  const [rejectVisible, setRejectVisible] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [revisionVisible, setRevisionVisible] = useState(false);
  const [revisionNotes, setRevisionNotes] = useState('');
  const [delegateVisible, setDelegateVisible] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  if (!item) {
    return (
      <View style={styles.container}>
        <View style={styles.centered}>
          <Text style={styles.errorText}>Approval item not found.</Text>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.backLink}>← Back to list</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const pri = PRIORITIES[item.priority];
  const isActionable = item.status === 'pending' || item.status === 'revision_requested';

  function handleApprove() {
    Alert.alert('Approve', `Approve "${item!.title}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Approve',
        onPress: () => {
          setSubmitting(true);
          setTimeout(() => {
            setSubmitting(false);
            Alert.alert('Done', 'Approval submitted.');
            navigation.goBack();
          }, 500);
        },
      },
    ]);
  }

  function handleRejectSubmit() {
    setSubmitting(true);
    setTimeout(() => {
      setSubmitting(false);
      setRejectVisible(false);
      setRejectReason('');
      Alert.alert('Done', 'Rejection submitted.');
      navigation.goBack();
    }, 500);
  }

  function handleRevisionSubmit() {
    setSubmitting(true);
    setTimeout(() => {
      setSubmitting(false);
      setRevisionVisible(false);
      setRevisionNotes('');
      Alert.alert('Done', 'Revision request submitted.');
      navigation.goBack();
    }, 500);
  }

  function handleDelegate(userId: string) {
    setSubmitting(true);
    setTimeout(() => {
      setSubmitting(false);
      setDelegateVisible(false);
      Alert.alert('Done', `Delegated to ${MOCK_USERS.find(u => u.id === userId)?.name}.`);
      navigation.goBack();
    }, 500);
  }

  return (
    <View style={styles.container}>
      {/* Sample Data banner */}
      <View style={styles.sampleBanner}>
        <Text style={styles.sampleBannerText}>📋 Sample Data</Text>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.detailHeader}>
          <View style={styles.badgeRow}>
            <View style={[styles.statusBadge, { backgroundColor: STATUS_COLOR[item.status] + '20' }]}>
              <Text style={[styles.statusBadgeText, { color: STATUS_COLOR[item.status] }]}>
                {STATUS_LABEL[item.status]}
              </Text>
            </View>
            <View style={[styles.priorityBadge, { backgroundColor: pri.color + '20' }]}>
              <Text style={[styles.priorityBadgeText, { color: pri.color }]}>{pri.label}</Text>
            </View>
          </View>

          <Text style={styles.detailTitle}>{item.title}</Text>
          <Text style={styles.detailDesc}>{item.description}</Text>

          {/* Meta grid */}
          <View style={styles.metaGrid}>
            <View style={styles.metaCell}>
              <Text style={styles.metaLabel}>Target</Text>
              <Text style={styles.metaValue}>
                {TARGET_ICONS[item.target_system] || '🔗'} {item.target_system} — {item.target_id}
              </Text>
            </View>
            <View style={styles.metaCell}>
              <Text style={styles.metaLabel}>Confidence</Text>
              <Text style={[styles.metaValue, {
                color: item.confidence >= 80 ? '#10b981' : item.confidence >= 60 ? '#f59e0b' : '#ef4444',
              }]}>
                {item.confidence}%
              </Text>
            </View>
            <View style={styles.metaCell}>
              <Text style={styles.metaLabel}>Requested by</Text>
              <Text style={styles.metaValue}>{item.requested_by_role}</Text>
            </View>
            <View style={styles.metaCell}>
              <Text style={styles.metaLabel}>Created</Text>
              <Text style={styles.metaValue}>{new Date(item.created_at).toLocaleString()}</Text>
            </View>
            {item.deadline && (
              <View style={styles.metaCell}>
                <Text style={styles.metaLabel}>Deadline</Text>
                <Text style={[styles.metaValue, { color: '#f59e0b' }]}>
                  ⏰ {new Date(item.deadline).toLocaleString()}
                </Text>
              </View>
            )}
            {item.revision_round > 0 && (
              <View style={styles.metaCell}>
                <Text style={styles.metaLabel}>Revision</Text>
                <Text style={[styles.metaValue, { color: '#fb923c' }]}>Round {item.revision_round}</Text>
              </View>
            )}
            {item.execution_error && (
              <View style={styles.metaCell}>
                <Text style={styles.metaLabel}>Error</Text>
                <Text style={[styles.metaValue, { color: '#ef4444' }]}>{item.execution_error}</Text>
              </View>
            )}
          </View>
        </View>

        {/* Change preview (collapsible) */}
        <CollapsibleSection title="Change Preview">
          <View style={styles.diffBox}>
            <Text style={styles.diffText}>{item.summary_diff}</Text>
          </View>
        </CollapsibleSection>

        {/* Source refs (collapsible) */}
        <CollapsibleSection title="Source References">
          {item.source_refs.map((ref, i) => (
            <View key={i} style={styles.sourceRef}>
              <Text style={styles.sourceRefType}>{ref.type}</Text>
              <Text style={styles.sourceRefTitle}>{ref.title}</Text>
              <Text style={styles.sourceRefId}>ID: {ref.id}</Text>
            </View>
          ))}
        </CollapsibleSection>

        {/* Revision history */}
        {item.revision_round > 0 && (
          <CollapsibleSection title="Revision History" defaultCollapsed={false}>
            <View style={styles.revisionEntry}>
              <Text style={styles.revisionLabel}>Round {item.revision_round}</Text>
              <Text style={styles.revisionNote}>
                {item.revision_notes || 'No notes provided.'}
              </Text>
              <Text style={styles.revisionDate}>
                Requested by {item.decided_by} · {item.decided_at ? new Date(item.decided_at).toLocaleString() : '—'}
              </Text>
            </View>
          </CollapsibleSection>
        )}

        {/* Audit trail */}
        <CollapsibleSection title="Audit Trail">
          <View style={styles.auditEntry}>
            <Text style={styles.auditAction}>Created</Text>
            <Text style={styles.auditDate}>{new Date(item.created_at).toLocaleString()}</Text>
          </View>
          {item.decided_at && (
            <View style={styles.auditEntry}>
              <Text style={styles.auditAction}>Decision: {item.decision}</Text>
              <Text style={styles.auditDate}>
                By {item.decided_by} · {new Date(item.decided_at).toLocaleString()}
              </Text>
            </View>
          )}
          {item.execution_error && (
            <View style={styles.auditEntry}>
              <Text style={[styles.auditAction, { color: '#ef4444' }]}>Execution failed</Text>
              <Text style={styles.auditDate}>{item.execution_error}</Text>
            </View>
          )}
        </CollapsibleSection>

        {/* Bottom padding for fixed action bar */}
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Fixed action bar */}
      {isActionable && (
        <View style={styles.actionBar}>
          <TouchableOpacity style={styles.approveBtn} onPress={handleApprove}>
            <Text style={styles.approveBtnText}>✓ Approve</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.rejectBtn} onPress={() => setRejectVisible(true)}>
            <Text style={styles.rejectBtnText}>✗ Reject</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.revisionBtn} onPress={() => setRevisionVisible(true)}>
            <Text style={styles.revisionBtnText}>✎ Revise</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.delegateBtn} onPress={() => setDelegateVisible(true)}>
            <Text style={styles.delegateBtnText}>→ Delegate</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Reject reason sheet */}
      <InputSheet
        visible={rejectVisible}
        title="Rejection Reason"
        placeholder="Explain why this is being rejected (min 10 chars)..."
        value={rejectReason}
        onChangeText={setRejectReason}
        onSubmit={handleRejectSubmit}
        onCancel={() => { setRejectVisible(false); setRejectReason(''); }}
        submitting={submitting}
      />

      {/* Revision comment sheet */}
      <InputSheet
        visible={revisionVisible}
        title="Revision Instructions"
        placeholder="Describe what needs to change (min 10 chars)..."
        value={revisionNotes}
        onChangeText={setRevisionNotes}
        onSubmit={handleRevisionSubmit}
        onCancel={() => { setRevisionVisible(false); setRevisionNotes(''); }}
        submitting={submitting}
      />

      {/* Delegate user picker */}
      <DelegateSheet
        visible={delegateVisible}
        onSubmit={handleDelegate}
        onCancel={() => setDelegateVisible(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  errorText: { color: '#94a3b8', fontSize: 16 },
  backLink: { color: '#3b82f6', marginTop: 12, fontSize: 14 },

  sampleBanner: {
    backgroundColor: '#1e40af30',
    borderBottomWidth: 1,
    borderBottomColor: '#1e40af50',
    paddingVertical: 6,
    paddingHorizontal: 16,
  },
  sampleBannerText: { color: '#60a5fa', fontSize: 12, fontWeight: '600' },

  scroll: { flex: 1 },
  scrollContent: { padding: 16 },

  // Header
  detailHeader: { marginBottom: 16 },
  badgeRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  statusBadgeText: { fontSize: 12, fontWeight: '700' },
  priorityBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  priorityBadgeText: { fontSize: 12, fontWeight: '700' },
  detailTitle: { fontSize: 20, fontWeight: '700', color: '#f1f5f9', marginBottom: 8, lineHeight: 26 },
  detailDesc: { fontSize: 14, color: '#94a3b8', lineHeight: 20, marginBottom: 16 },

  // Meta grid
  metaGrid: {
    backgroundColor: '#1e293b',
    borderRadius: 10,
    padding: 12,
    gap: 10,
    borderWidth: 1,
    borderColor: '#334155',
  },
  metaCell: { flexDirection: 'row', justifyContent: 'space-between' },
  metaLabel: { color: '#64748b', fontSize: 12 },
  metaValue: { color: '#cbd5e1', fontSize: 12, fontWeight: '500', flex: 1, textAlign: 'right' },

  // Sections
  section: {
    backgroundColor: '#1e293b',
    borderRadius: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#334155',
    overflow: 'hidden',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 14,
  },
  sectionTitle: { color: '#f1f5f9', fontSize: 14, fontWeight: '600' },
  sectionChevron: { color: '#64748b', fontSize: 16 },
  sectionBody: { paddingHorizontal: 14, paddingBottom: 14 },

  // Diff box
  diffBox: {
    backgroundColor: '#0f172a',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  diffText: { color: '#cbd5e1', fontSize: 13, lineHeight: 18 },

  // Source refs
  sourceRef: {
    backgroundColor: '#0f172a',
    borderRadius: 8,
    padding: 10,
    marginBottom: 8,
  },
  sourceRefType: { color: '#60a5fa', fontSize: 11, fontWeight: '600', textTransform: 'uppercase' },
  sourceRefTitle: { color: '#f1f5f9', fontSize: 13, marginTop: 2 },
  sourceRefId: { color: '#64748b', fontSize: 11, marginTop: 2 },

  // Revision history
  revisionEntry: {
    backgroundColor: '#0f172a',
    borderRadius: 8,
    padding: 10,
  },
  revisionLabel: { color: '#fb923c', fontSize: 12, fontWeight: '700' },
  revisionNote: { color: '#cbd5e1', fontSize: 13, marginTop: 4 },
  revisionDate: { color: '#64748b', fontSize: 11, marginTop: 4 },

  // Audit trail
  auditEntry: {
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
    paddingVertical: 8,
  },
  auditAction: { color: '#f1f5f9', fontSize: 13, fontWeight: '500' },
  auditDate: { color: '#64748b', fontSize: 11, marginTop: 2 },

  // Action bar
  actionBar: {
    flexDirection: 'row',
    padding: 12,
    paddingBottom: 24,
    backgroundColor: '#0f172a',
    borderTopWidth: 1,
    borderTopColor: '#1e293b',
    gap: 8,
  },
  approveBtn: { flex: 2, backgroundColor: '#10b981', borderRadius: 8, paddingVertical: 12, alignItems: 'center' },
  approveBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  rejectBtn: { flex: 1, backgroundColor: '#ef444430', borderRadius: 8, paddingVertical: 12, alignItems: 'center' },
  rejectBtnText: { color: '#ef4444', fontSize: 13, fontWeight: '600' },
  revisionBtn: { flex: 1, backgroundColor: '#334155', borderRadius: 8, paddingVertical: 12, alignItems: 'center' },
  revisionBtnText: { color: '#94a3b8', fontSize: 13, fontWeight: '600' },
  delegateBtn: { flex: 1, backgroundColor: 'transparent', borderRadius: 8, paddingVertical: 12, alignItems: 'center' },
  delegateBtnText: { color: '#3b82f6', fontSize: 13, fontWeight: '600' },

  // Input sheet (modal)
  sheetOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#1e293b',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 20,
    paddingBottom: 32,
  },
  sheetTitle: { color: '#f1f5f9', fontSize: 16, fontWeight: '700', marginBottom: 12 },
  sheetInput: {
    backgroundColor: '#0f172a',
    borderRadius: 8,
    padding: 12,
    color: '#f1f5f9',
    fontSize: 14,
    minHeight: 100,
    borderWidth: 1,
    borderColor: '#334155',
  },
  sheetHint: { color: '#64748b', fontSize: 11, marginTop: 6 },
  sheetActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 16 },
  sheetCancel: { paddingVertical: 10, paddingHorizontal: 16 },
  sheetCancelText: { color: '#94a3b8', fontSize: 14 },
  sheetSubmit: { backgroundColor: '#3b82f6', borderRadius: 8, paddingVertical: 10, paddingHorizontal: 20 },
  sheetSubmitDisabled: { opacity: 0.4 },
  sheetSubmitText: { color: '#fff', fontSize: 14, fontWeight: '600' },

  // Delegate sheet
  userRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  userRowActive: { backgroundColor: '#3b82f620' },
  userRowText: { color: '#cbd5e1', fontSize: 14 },
  userRowTextActive: { color: '#60a5fa', fontWeight: '600' },
  checkmark: { color: '#3b82f6', fontSize: 16, fontWeight: '700' },
});
