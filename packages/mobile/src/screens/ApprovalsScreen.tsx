import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ScrollView, Alert, Animated, PanResponder, Dimensions,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { RootStackParamList } from '../App';

type Props = NativeStackScreenProps<RootStackParamList, 'Approvals'>;

type ApprovalPriority = 'critical' | 'high' | 'medium' | 'low';
type ApprovalStatus =
  | 'pending' | 'revision_requested' | 'approved' | 'rejected'
  | 'cancelled' | 'expired' | 'executing' | 'executed' | 'execution_failed';

type FilterType = 'all' | 'pending' | 'urgent' | 'done';

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

const PRIORITIES: Record<ApprovalPriority, string> = {
  critical: '#ef4444',
  high: '#f97316',
  medium: '#f59e0b',
  low: '#94a3b8',
};

const TARGET_ICONS: Record<string, string> = {
  jira: '🎫',
  github: '🐙',
  gmail: '📧',
  confluence: '📄',
  notion: '📋',
};

// Mock data aligned with approval queue runtime contract.
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

const FILTERS: { key: FilterType; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'pending', label: 'Pending' },
  { key: 'urgent', label: 'Urgent' },
  { key: 'done', label: 'Done' },
];

function timeAgo(iso: string): string {
  const now = Date.now();
  const diffMs = now - new Date(iso).getTime();
  const minutes = Math.max(0, Math.floor(diffMs / 60000));
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  return `${days}d`;
}

function filterItems(items: ApprovalItem[], filter: FilterType): ApprovalItem[] {
  switch (filter) {
    case 'pending':
      return items.filter(i => i.status === 'pending');
    case 'urgent':
      return items.filter(i =>
        i.status === 'pending' && (i.priority === 'critical' || i.priority === 'high')
      );
    case 'done':
      return items.filter(i =>
        i.status === 'approved' || i.status === 'rejected' || i.status === 'expired' || i.status === 'executed'
      );
    default:
      return items;
  }
}

function filterCounts(items: ApprovalItem[]): Record<FilterType, number> {
  return {
    all: items.length,
    pending: items.filter(i => i.status === 'pending').length,
    urgent: items.filter(i => i.status === 'pending' && (i.priority === 'critical' || i.priority === 'high')).length,
    done: items.filter(i => i.status === 'approved' || i.status === 'rejected' || i.status === 'expired' || i.status === 'executed').length,
  };
}

function SwipeableRow({
  item,
  onSwipeRight,
  onSwipeLeft,
  children,
}: {
  item: ApprovalItem;
  onSwipeRight: () => void;
  onSwipeLeft: () => void;
  children: React.ReactNode;
}) {
  const translateX = React.useRef(new Animated.Value(0)).current;
  const screenWidth = Dimensions.get('window').width;
  const threshold = 80;
  const isActionable = item.status === 'pending' || item.status === 'revision_requested';

  const panResponder = React.useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gestureState) =>
        isActionable && Math.abs(gestureState.dx) > 10 && Math.abs(gestureState.dx) > Math.abs(gestureState.dy),
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dx > 0) {
          translateX.setValue(Math.min(gestureState.dx, threshold * 1.5));
        } else {
          translateX.setValue(Math.max(gestureState.dx, -threshold * 1.5));
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dx > threshold) {
          Animated.spring(translateX, { toValue: screenWidth, useNativeDriver: true }).start(() => {
            onSwipeRight();
            translateX.setValue(0);
          });
        } else if (gestureState.dx < -threshold) {
          Animated.spring(translateX, { toValue: -screenWidth, useNativeDriver: true }).start(() => {
            onSwipeLeft();
            translateX.setValue(0);
          });
        } else {
          Animated.spring(translateX, { toValue: 0, useNativeDriver: true }).start();
        }
      },
    })
  ).current;

  if (!isActionable) {
    return <>{children}</>;
  }

  return (
    <View>
      {/* Green approve background (right swipe) */}
      <View style={[styles.swipeAction, styles.swipeApprove, { right: 0 }]}>
        <Text style={styles.swipeActionText}>✓ Approve</Text>
      </View>
      {/* Red reject background (left swipe) */}
      <View style={[styles.swipeAction, styles.swipeReject, { left: 0 }]}>
        <Text style={styles.swipeActionText}>✗ Reject</Text>
      </View>
      <Animated.View
        style={[{ transform: [{ translateX }] }]}
        {...panResponder.panHandlers}
      >
        {children}
      </Animated.View>
    </View>
  );
}

export function ApprovalsScreen({ navigation }: Props) {
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const [, setRefreshKey] = useState(0);

  // Refresh when screen comes into focus (after returning from detail)
  useFocusEffect(
    useCallback(() => {
      setRefreshKey(k => k + 1);
    }, [])
  );

  const filtered = filterItems(mockApprovals, activeFilter);
  const counts = filterCounts(mockApprovals);

  function handleSwipeApprove(item: ApprovalItem) {
    Alert.alert('Approve', `Approve "${item.title}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Approve', onPress: () => Alert.alert('Done', 'Approval submitted.') },
    ]);
  }

  function handleSwipeReject(item: ApprovalItem) {
    Alert.alert('Reject', `Reject "${item.title}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Reject',
        style: 'destructive',
        onPress: () => Alert.alert('Done', 'Rejection submitted.'),
      },
    ]);
  }

  function renderItem({ item }: { item: ApprovalItem }) {
    return (
      <SwipeableRow
        item={item}
        onSwipeRight={() => handleSwipeApprove(item)}
        onSwipeLeft={() => handleSwipeReject(item)}
      >
        <TouchableOpacity
          style={styles.card}
          activeOpacity={0.7}
          onPress={() => navigation.navigate('ApprovalDetail', { approvalId: item.approval_id })}
        >
          {/* Header row: priority dot + title + status badge */}
          <View style={styles.cardHeader}>
            <View style={[styles.priorityDot, { backgroundColor: PRIORITIES[item.priority] }]} />
            <Text style={styles.cardTitle} numberOfLines={2}>{item.title}</Text>
            <View style={[styles.statusBadge, { backgroundColor: STATUS_COLOR[item.status] + '20' }]}>
              <Text style={[styles.statusBadgeText, { color: STATUS_COLOR[item.status] }]}>
                {STATUS_LABEL[item.status]}
              </Text>
            </View>
          </View>

          {/* Meta row: workflow · target · age */}
          <View style={styles.metaRow}>
            <Text style={styles.metaText}>
              {TARGET_ICONS[item.target_system] || '🔗'} {item.workflow_id.replace('wf-', '')} · {item.target_system}
            </Text>
            <Text style={styles.metaAge}>{timeAgo(item.created_at)} ago</Text>
          </View>

          {/* Confidence + requester */}
          <View style={styles.footerRow}>
            <View style={styles.confidenceBadge}>
              <Text style={[styles.confidenceText, {
                color: item.confidence >= 80 ? '#10b981' : item.confidence >= 60 ? '#f59e0b' : '#ef4444',
              }]}>
                {item.confidence}%
              </Text>
            </View>
            <Text style={styles.requesterText}>by {item.requested_by_role}</Text>
            {item.revision_round > 0 && (
              <View style={styles.revisionBadge}>
                <Text style={styles.revisionBadgeText}>R{item.revision_round}</Text>
              </View>
            )}
            {item.deadline && (
              <Text style={styles.deadlineText}>⏰ {new Date(item.deadline).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
            )}
          </View>
        </TouchableOpacity>
      </SwipeableRow>
    );
  }

  return (
    <View style={styles.container}>
      {/* Sample Data banner */}
      <View style={styles.sampleBanner}>
        <Text style={styles.sampleBannerText}>📋 Sample Data</Text>
      </View>

      {/* Filter chips */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipContainer}>
        {FILTERS.map(f => (
          <TouchableOpacity
            key={f.key}
            style={[styles.chip, activeFilter === f.key && styles.chipActive]}
            onPress={() => setActiveFilter(f.key)}
          >
            <Text style={[styles.chipText, activeFilter === f.key && styles.chipTextActive]}>
              {f.label}
            </Text>
            {counts[f.key] > 0 && (
              <View style={[styles.chipCount, activeFilter === f.key && styles.chipCountActive]}>
                <Text style={[styles.chipCountText, activeFilter === f.key && styles.chipCountTextActive]}>
                  {counts[f.key]}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Approval list */}
      <FlatList
        data={filtered}
        keyExtractor={item => item.approval_id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No approvals in this filter</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
  sampleBanner: {
    backgroundColor: '#1e40af30',
    borderBottomWidth: 1,
    borderBottomColor: '#1e40af50',
    paddingVertical: 6,
    paddingHorizontal: 16,
  },
  sampleBannerText: { color: '#60a5fa', fontSize: 12, fontWeight: '600' },

  // Filter chips
  chipContainer: { paddingHorizontal: 12, paddingVertical: 10, maxHeight: 52 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: '#1e293b',
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#334155',
  },
  chipActive: { backgroundColor: '#3b82f630', borderColor: '#3b82f6' },
  chipText: { color: '#94a3b8', fontSize: 13, fontWeight: '500' },
  chipTextActive: { color: '#60a5fa' },
  chipCount: {
    marginLeft: 6,
    backgroundColor: '#334155',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  chipCountActive: { backgroundColor: '#3b82f650' },
  chipCountText: { color: '#94a3b8', fontSize: 11, fontWeight: '700' },
  chipCountTextActive: { color: '#93c5fd' },

  // List
  listContent: { padding: 12, paddingBottom: 24 },

  // Card
  card: {
    backgroundColor: '#1e293b',
    borderRadius: 10,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#334155',
  },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  priorityDot: { width: 10, height: 10, borderRadius: 5, marginTop: 3 },
  cardTitle: { flex: 1, fontSize: 15, color: '#f1f5f9', fontWeight: '600', lineHeight: 20 },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  statusBadgeText: { fontSize: 11, fontWeight: '700' },

  // Meta
  metaRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8, alignItems: 'center' },
  metaText: { color: '#94a3b8', fontSize: 12 },
  metaAge: { color: '#64748b', fontSize: 11 },

  // Footer
  footerRow: { flexDirection: 'row', alignItems: 'center', marginTop: 8, gap: 8 },
  confidenceBadge: { flexDirection: 'row', alignItems: 'center' },
  confidenceText: { fontSize: 12, fontWeight: '700' },
  requesterText: { color: '#64748b', fontSize: 11, flex: 1 },
  revisionBadge: {
    backgroundColor: '#fb923c30',
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  revisionBadgeText: { color: '#fb923c', fontSize: 10, fontWeight: '700' },
  deadlineText: { color: '#f59e0b', fontSize: 11 },

  // Swipe
  swipeAction: {
    position: 'absolute',
    top: 0,
    bottom: 10,
    width: 100,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 10,
  },
  swipeApprove: { backgroundColor: '#10b981', right: 0 },
  swipeReject: { backgroundColor: '#ef4444', left: 0 },
  swipeActionText: { color: '#fff', fontWeight: '700', fontSize: 13 },

  // Empty
  emptyState: { paddingVertical: 40, alignItems: 'center' },
  emptyText: { color: '#64748b', fontSize: 14 },
});
