import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  RefreshControl, Alert, ActivityIndicator,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { RootStackParamList } from '../App';
import {
  fetchCommandCenterData,
  listCommands,
  executeQuery,
  type CommandCenterData,
  type ChatCommand,
  type QueryResult,
} from '../state/command-center';
import { getApprovalBaseUrl } from '../state/approval-store';

type Props = NativeStackScreenProps<RootStackParamList, 'CommandCenter'>;

// ---------------------------------------------------------------------------
// Section Components
// ---------------------------------------------------------------------------

function DataSourceBanner({ dataSource }: { dataSource: 'local_server' | 'mock_fallback' }) {
  return (
    <View style={styles.banner}>
      <View style={[styles.bannerDot, { backgroundColor: dataSource === 'local_server' ? '#10b981' : '#f59e0b' }]} />
      <Text style={[styles.bannerText, { color: dataSource === 'local_server' ? '#10b981' : '#f59e0b' }]}>
        {dataSource === 'local_server' ? '⚡ Live — local server' : '🧪 Demo — mock data'}
      </Text>
    </View>
  );
}

function StatCard({ label, value, color, icon }: { label: string; value: number | string; color: string; icon: string }) {
  return (
    <View style={styles.statCard}>
      <Text style={styles.statIcon}>{icon}</Text>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function ApprovalPreviewCard({ item, onNavigate }: { item: { approval_id: string; title: string; priority: string; target_system: string }; onNavigate: (id: string) => void }) {
  const priColors: Record<string, string> = { critical: '#ef4444', high: '#f97316', medium: '#f59e0b', low: '#94a3b8' };
  return (
    <TouchableOpacity style={styles.previewCard} onPress={() => onNavigate(item.approval_id)}>
      <View style={[styles.priorityDot, { backgroundColor: priColors[item.priority] ?? '#94a3b8' }]} />
      <View style={styles.previewContent}>
        <Text style={styles.previewTitle} numberOfLines={1}>{item.title}</Text>
        <Text style={styles.previewMeta}>{item.target_system} · {item.priority}</Text>
      </View>
      <Text style={styles.chevron}>›</Text>
    </TouchableOpacity>
  );
}

function RiskItem({ label, count, color }: { label: string; count: number; color: string }) {
  if (count === 0) return null;
  return (
    <View style={styles.riskItem}>
      <View style={[styles.riskDot, { backgroundColor: color }]} />
      <Text style={styles.riskLabel}>{label}</Text>
      <Text style={[styles.riskCount, { color }]}>{count}</Text>
    </View>
  );
}

function CommandButton({ cmd, onPress }: { cmd: ChatCommand; onPress: (id: string) => void }) {
  return (
    <TouchableOpacity style={styles.cmdBtn} onPress={() => onPress(cmd.id)}>
      <Text style={styles.cmdBtnName}>{cmd.name}</Text>
      <Text style={styles.cmdBtnDesc} numberOfLines={1}>{cmd.description}</Text>
    </TouchableOpacity>
  );
}

// ---------------------------------------------------------------------------
// Main Screen
// ---------------------------------------------------------------------------

export function CommandCenterScreen({ navigation }: Props) {
  const [data, setData] = useState<CommandCenterData | null>(null);
  const [commands, setCommands] = useState<ChatCommand[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [queryResult, setQueryResult] = useState<QueryResult | null>(null);
  const [queryLoading, setQueryLoading] = useState(false);
  const [dataSource, setDataSource] = useState<'local_server' | 'mock_fallback'>(
    getApprovalBaseUrl() ? 'local_server' : 'mock_fallback',
  );

  const loadAll = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const [ccData, cmds] = await Promise.all([
        fetchCommandCenterData(),
        listCommands(),
      ]);
      setData(ccData);
      setCommands(cmds);
      setDataSource(getApprovalBaseUrl() ? 'local_server' : 'mock_fallback');
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadAll();
    }, [loadAll])
  );

  async function handleRunCommand(commandId: string) {
    setQueryLoading(true);
    setQueryResult(null);
    try {
      const { result } = await executeQuery(commandId);
      setQueryResult(result);
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Command failed');
    } finally {
      setQueryLoading(false);
    }
  }

  const summary = data?.dailyBrief?.project_summary;
  const pending = data?.pendingApprovals;
  const risks = data?.riskSummary?.risk_signals;
  const weekly = data?.weeklyStatus;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={isRefreshing} onRefresh={loadAll} tintColor="#60a5fa" colors={['#10b981']} />
      }
    >
      {/* Data source */}
      <DataSourceBanner dataSource={dataSource} />

      {/* Error banner */}
      {data?.error && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>⚠ {data.error}</Text>
        </View>
      )}

      {/* ─── Daily Summary ─── */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>📊 Daily Overview</Text>
        {summary ? (
          <View style={styles.statGrid}>
            <StatCard label="Tasks" value={summary.totalTasks} color="#3b82f6" icon="📋" />
            <StatCard label="Done" value={summary.completedTasks} color="#10b981" icon="✅" />
            <StatCard label="Artifacts" value={summary.totalArtifacts} color="#8b5cf6" icon="📦" />
            <StatCard label="Stale" value={summary.staleArtifacts} color="#f59e0b" icon="⏰" />
          </View>
        ) : (
          <ActivityIndicator color="#64748b" />
        )}
        {data?.dailyBrief && (
          <Text style={styles.timestamp}>
            Activity: {data.dailyBrief.today_activity.tasks_updated} updated, {data.dailyBrief.today_activity.pending_tasks} pending
          </Text>
        )}
      </View>

      {/* ─── Pending Approvals ─── */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>✅ Pending Approvals</Text>
          {pending && pending.count > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{pending.count}</Text>
            </View>
          )}
        </View>
        {pending && pending.items.length > 0 ? (
          pending.items.map(item => (
            <ApprovalPreviewCard
              key={item.approval_id}
              item={item}
              onNavigate={(id) => navigation.navigate('ApprovalDetail', { approvalId: id })}
            />
          ))
        ) : (
          <Text style={styles.emptyText}>No pending approvals</Text>
        )}
      </View>

      {/* ─── Risk Summary ─── */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>⚠️ Risk Signals</Text>
        {risks ? (
          <>
            <RiskItem label="Failed tasks" count={risks.failed_tasks.length} color="#ef4444" />
            <RiskItem label="Stale artifacts" count={risks.stale_artifact_count} color="#f59e0b" />
            <RiskItem label="Total tasks" count={risks.total_tasks} color="#94a3b8" />
            {risks.failed_tasks.length === 0 && risks.stale_artifact_count === 0 && (
              <Text style={styles.okText}>✓ No risk signals</Text>
            )}
          </>
        ) : (
          <ActivityIndicator color="#64748b" />
        )}
      </View>

      {/* ─── Weekly Status ─── */}
      {weekly && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📅 Weekly Status</Text>
          <Text style={styles.periodText}>{weekly.period.from} → {weekly.period.to}</Text>
          <View style={styles.miniGrid}>
            <View style={styles.miniStat}>
              <Text style={[styles.miniValue, { color: '#10b981' }]}>{weekly.tasks_summary.completed}</Text>
              <Text style={styles.miniLabel}>Completed</Text>
            </View>
            <View style={styles.miniStat}>
              <Text style={[styles.miniValue, { color: '#f59e0b' }]}>{weekly.tasks_summary.failed}</Text>
              <Text style={styles.miniLabel}>Failed</Text>
            </View>
            <View style={styles.miniStat}>
              <Text style={[styles.miniValue, { color: '#3b82f6' }]}>{weekly.approvals_summary.approved}</Text>
              <Text style={styles.miniLabel}>Approved</Text>
            </View>
            <View style={styles.miniStat}>
              <Text style={[styles.miniValue, { color: '#ef4444' }]}>{weekly.approvals_summary.rejected}</Text>
              <Text style={styles.miniLabel}>Rejected</Text>
            </View>
          </View>
        </View>
      )}

      {/* ─── Quick Commands ─── */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>💬 Quick Commands</Text>
        <View style={styles.cmdGrid}>
          {commands.map(cmd => (
            <CommandButton key={cmd.id} cmd={cmd} onPress={handleRunCommand} />
          ))}
        </View>
        {queryLoading && (
          <View style={styles.queryLoading}>
            <ActivityIndicator color="#60a5fa" />
            <Text style={styles.queryLoadingText}>Running query...</Text>
          </View>
        )}
        {queryResult && !queryLoading && (
          <View style={styles.queryResult}>
            <Text style={styles.queryResultTitle}>Result: {queryResult.command}</Text>
            <ScrollView horizontal style={styles.queryResultScroll}>
              <Text style={styles.queryResultJson} selectable>
                {JSON.stringify(queryResult, null, 2)}
              </Text>
            </ScrollView>
          </View>
        )}
      </View>

      {/* Bottom padding */}
      <View style={{ height: 32 }} />
    </ScrollView>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
  content: { padding: 12 },

  // Banner
  banner: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6, marginBottom: 8 },
  bannerDot: { width: 6, height: 6, borderRadius: 3, marginRight: 6 },
  bannerText: { fontSize: 11, fontWeight: '500' },

  // Error
  errorBanner: { backgroundColor: '#ef444420', borderRadius: 8, padding: 10, marginBottom: 12, borderWidth: 1, borderColor: '#ef444430' },
  errorText: { color: '#ef4444', fontSize: 12 },

  // Section
  section: { backgroundColor: '#1e293b', borderRadius: 12, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: '#334155' },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sectionTitle: { fontSize: 15, fontWeight: '600', color: '#f1f5f9', marginBottom: 10 },
  timestamp: { fontSize: 11, color: '#64748b', marginTop: 8 },

  // Stat grid
  statGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  statCard: { flex: 1, minWidth: '20%', backgroundColor: '#0f172a', borderRadius: 8, padding: 10, alignItems: 'center', borderWidth: 1, borderColor: '#334155' },
  statIcon: { fontSize: 16, marginBottom: 4 },
  statValue: { fontSize: 18, fontWeight: '700' },
  statLabel: { fontSize: 10, color: '#64748b', marginTop: 2 },

  // Badge
  badge: { backgroundColor: '#ef4444', borderRadius: 10, minWidth: 20, height: 20, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6 },
  badgeText: { color: '#fff', fontSize: 11, fontWeight: '700' },

  // Approval preview
  previewCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#0f172a', borderRadius: 8, padding: 10, marginBottom: 6, borderWidth: 1, borderColor: '#334155' },
  priorityDot: { width: 8, height: 8, borderRadius: 4, marginRight: 10 },
  previewContent: { flex: 1 },
  previewTitle: { color: '#f1f5f9', fontSize: 13, fontWeight: '500' },
  previewMeta: { color: '#64748b', fontSize: 11, marginTop: 2 },
  chevron: { color: '#64748b', fontSize: 18 },

  // Risk
  riskItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6, gap: 8 },
  riskDot: { width: 8, height: 8, borderRadius: 4 },
  riskLabel: { flex: 1, color: '#94a3b8', fontSize: 13 },
  riskCount: { fontSize: 14, fontWeight: '700' },
  okText: { color: '#10b981', fontSize: 13, fontWeight: '500' },

  // Weekly
  periodText: { color: '#64748b', fontSize: 11, marginBottom: 8 },
  miniGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  miniStat: { flex: 1, minWidth: '20%', alignItems: 'center' },
  miniValue: { fontSize: 20, fontWeight: '700' },
  miniLabel: { fontSize: 10, color: '#64748b', marginTop: 2 },

  // Commands
  cmdGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  cmdBtn: { flex: 1, minWidth: '45%', backgroundColor: '#0f172a', borderRadius: 8, padding: 12, borderWidth: 1, borderColor: '#3b82f630' },
  cmdBtnName: { color: '#60a5fa', fontSize: 13, fontWeight: '600' },
  cmdBtnDesc: { color: '#64748b', fontSize: 11, marginTop: 4 },

  // Query result
  queryLoading: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10 },
  queryLoadingText: { color: '#64748b', fontSize: 12 },
  queryResult: { marginTop: 10, backgroundColor: '#0f172a', borderRadius: 8, padding: 10, borderWidth: 1, borderColor: '#334155' },
  queryResultTitle: { color: '#60a5fa', fontSize: 12, fontWeight: '600', marginBottom: 6 },
  queryResultScroll: { maxHeight: 200 },
  queryResultJson: { color: '#94a3b8', fontSize: 11, fontFamily: 'monospace' },

  // Empty
  emptyText: { color: '#64748b', fontSize: 13, paddingVertical: 8 },
});
