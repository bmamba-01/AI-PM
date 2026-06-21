import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Alert, ActivityIndicator,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../App';
import { useApprovalStore, type ApprovalItem } from '../state/approval-store';

type Props = NativeStackScreenProps<RootStackParamList, 'ActionProposal'>;

const STATUS_COLOR: Record<string, string> = {
  pending: '#f59e0b',
  revision_requested: '#fb923c',
  approved: '#10b981',
  rejected: '#ef4444',
  cancelled: '#64748b',
  executing: '#38bdf8',
  executed: '#10b981',
  execution_failed: '#ef4444',
  draft: '#64748b',
};

const STATUS_LABEL: Record<string, string> = {
  pending: 'Pending',
  revision_requested: 'Needs Revision',
  approved: 'Approved',
  rejected: 'Rejected',
  cancelled: 'Cancelled',
  expired: 'Expired',
  executing: 'Executing',
  executed: 'Executed',
  execution_failed: 'Failed',
  draft: 'Draft',
};

export function ActionProposalScreen({ route, navigation }: Props) {
  const { approvalId } = route.params;
  const { items, decide, refresh } = useApprovalStore();
  const item = items.find(a => a.approval_id === approvalId);
  const [submitting, setSubmitting] = useState(false);

  if (!item) {
    return (
      <View style={styles.container}>
        <View style={styles.centered}>
          <Text style={styles.errorText}>Action proposal not found.</Text>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.backLink}>← Back</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const isActionable = item.status === 'pending' || item.status === 'revision_requested';

  async function handleApprove() {
    if (!item) return;
    Alert.alert('Approve Action', `Execute this action on ${item.target_system}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Approve',
        onPress: async () => {
          setSubmitting(true);
          try {
            await decide(item!.approval_id, { decided_by: 'mobile-user', decision: 'approve' });
            await refresh();
            Alert.alert('Done', 'Action approved and queued for execution.');
            navigation.goBack();
          } catch (error) {
            Alert.alert('Error', String(error));
          } finally {
            setSubmitting(false);
          }
        },
      },
    ]);
  }

  async function handleReject() {
    if (!item) return;
    Alert.alert('Reject Action', 'Reject this proposed action?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Reject',
        style: 'destructive',
        onPress: async () => {
          setSubmitting(true);
          try {
            await decide(item!.approval_id, {
              decided_by: 'mobile-user',
              decision: 'reject',
              reason: 'Rejected from mobile action proposal view',
            });
            await refresh();
            Alert.alert('Done', 'Action rejected.');
            navigation.goBack();
          } catch (error) {
            Alert.alert('Error', String(error));
          } finally {
            setSubmitting(false);
          }
        },
      },
    ]);
  }

  const priColors: Record<string, string> = { critical: '#ef4444', high: '#f97316', medium: '#f59e0b', low: '#94a3b8' };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Status + priority header */}
      <View style={styles.badgeRow}>
        <View style={[styles.badge, { backgroundColor: (STATUS_COLOR[item.status] ?? '#64748b') + '20' }]}>
          <Text style={[styles.badgeText, { color: STATUS_COLOR[item.status] ?? '#64748b' }]}>
            {STATUS_LABEL[item.status] ?? item.status}
          </Text>
        </View>
        <View style={[styles.badge, { backgroundColor: (priColors[item.priority] ?? '#94a3b8') + '20' }]}>
          <Text style={[styles.badgeText, { color: priColors[item.priority] ?? '#94a3b8' }]}>
            {item.priority}
          </Text>
        </View>
      </View>

      {/* Title */}
      <Text style={styles.title}>{item.title}</Text>
      <Text style={styles.description}>{item.description}</Text>

      {/* What will happen */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>What will happen</Text>
        <View style={styles.detailBox}>
          <Text style={styles.detailText}>{item.summary_diff}</Text>
        </View>
      </View>

      {/* Target system */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Target</Text>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>System</Text>
          <Text style={styles.infoValue}>{item.target_system}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Target ID</Text>
          <Text style={styles.infoValue}>{item.target_id}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Action Type</Text>
          <Text style={styles.infoValue}>{item.action_type}</Text>
        </View>
      </View>

      {/* Confidence + source refs */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Details</Text>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Confidence</Text>
          <Text style={[styles.infoValue, { color: item.confidence >= 80 ? '#10b981' : item.confidence >= 60 ? '#f59e0b' : '#ef4444' }]}>
            {item.confidence}%
          </Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Requested by</Text>
          <Text style={styles.infoValue}>{item.requested_by_role}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Workflow</Text>
          <Text style={styles.infoValue}>{item.workflow_id}</Text>
        </View>
      </View>

      {/* Source references */}
      {item.source_refs.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Source References</Text>
          {item.source_refs.map((ref, i) => (
            <View key={i} style={styles.sourceRef}>
              <Text style={styles.sourceRefType}>{ref.type}</Text>
              <Text style={styles.sourceRefTitle}>{ref.title}</Text>
              <Text style={styles.sourceRefId}>ID: {ref.id}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Audit trail (decision history) */}
      {item.decided_by && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Decision History</Text>
          <View style={styles.auditEntry}>
            <Text style={styles.auditAction}>Decision: {String(item.decision)}</Text>
            <Text style={styles.auditMeta}>
              By {item.decided_by} · {item.decided_at ? new Date(item.decided_at).toLocaleString() : '—'}
            </Text>
            {item.rejection_reason && (
              <Text style={styles.auditNote}>Reason: {item.rejection_reason}</Text>
            )}
            {item.revision_notes && (
              <Text style={styles.auditNote}>Notes: {item.revision_notes}</Text>
            )}
          </View>
        </View>
      )}

      {/* Execution info */}
      {item.execution_error && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Execution Error</Text>
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{item.execution_error}</Text>
          </View>
        </View>
      )}

      {/* Action buttons */}
      {isActionable && (
        <View style={styles.actionBar}>
          <TouchableOpacity
            style={styles.approveBtn}
            onPress={handleApprove}
            disabled={submitting}
          >
            {submitting ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.approveBtnText}>✓ Approve</Text>}
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.rejectBtn}
            onPress={handleReject}
            disabled={submitting}
          >
            <Text style={styles.rejectBtnText}>✗ Reject</Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
  content: { padding: 16 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  errorText: { color: '#94a3b8', fontSize: 16 },
  backLink: { color: '#3b82f6', marginTop: 12, fontSize: 14 },

  badgeRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  badgeText: { fontSize: 12, fontWeight: '700' },

  title: { fontSize: 20, fontWeight: '700', color: '#f1f5f9', marginBottom: 8, lineHeight: 26 },
  description: { fontSize: 14, color: '#94a3b8', lineHeight: 20, marginBottom: 16 },

  section: { marginBottom: 16 },
  sectionTitle: { fontSize: 13, fontWeight: '600', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 },

  detailBox: { backgroundColor: '#1e293b', borderRadius: 8, padding: 12, borderWidth: 1, borderColor: '#334155' },
  detailText: { color: '#cbd5e1', fontSize: 13, lineHeight: 18 },

  infoRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 },
  infoLabel: { color: '#64748b', fontSize: 13 },
  infoValue: { color: '#f1f5f9', fontSize: 13, fontWeight: '500' },

  sourceRef: { backgroundColor: '#1e293b', borderRadius: 8, padding: 10, marginBottom: 8, borderWidth: 1, borderColor: '#334155' },
  sourceRefType: { color: '#60a5fa', fontSize: 11, fontWeight: '600', textTransform: 'uppercase' },
  sourceRefTitle: { color: '#f1f5f9', fontSize: 13, marginTop: 2 },
  sourceRefId: { color: '#64748b', fontSize: 11, marginTop: 2 },

  auditEntry: { backgroundColor: '#1e293b', borderRadius: 8, padding: 10, borderWidth: 1, borderColor: '#334155' },
  auditAction: { color: '#f1f5f9', fontSize: 13, fontWeight: '600' },
  auditMeta: { color: '#64748b', fontSize: 11, marginTop: 4 },
  auditNote: { color: '#94a3b8', fontSize: 12, marginTop: 4, fontStyle: 'italic' },

  errorBox: { backgroundColor: '#ef444415', borderRadius: 8, padding: 10, borderWidth: 1, borderColor: '#ef444430' },

  actionBar: { flexDirection: 'row', gap: 10, marginTop: 12 },
  approveBtn: { flex: 1, backgroundColor: '#10b981', borderRadius: 8, paddingVertical: 14, alignItems: 'center' },
  approveBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  rejectBtn: { flex: 1, backgroundColor: '#ef444430', borderRadius: 8, paddingVertical: 14, alignItems: 'center' },
  rejectBtnText: { color: '#ef4444', fontSize: 15, fontWeight: '700' },
});
