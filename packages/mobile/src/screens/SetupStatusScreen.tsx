import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  RefreshControl, ActivityIndicator,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { RootStackParamList } from '../App';
import {
  fetchSetupStatus,
  type SetupStatus,
} from '../state/setup-status';

type Props = NativeStackScreenProps<RootStackParamList, 'SetupStatus'>;

export function SetupStatusScreen(_props: Props) {
  const [status, setStatus] = useState<SetupStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const load = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const result = await fetchSetupStatus();
      setStatus(result);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  if (isLoading && !status) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text style={styles.loadingText}>Checking project status...</Text>
      </View>
    );
  }

  if (!status) return null;

  const { readiness, profile, pendingApprovals, serverStatus, nextCommand } = status;
  const serverColor = serverStatus === 'connected' ? '#10b981' : serverStatus === 'unreachable' ? '#ef4444' : '#64748b';
  const serverLabel = serverStatus === 'connected' ? 'Connected' : serverStatus === 'unreachable' ? 'Unreachable' : 'Unknown';

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={isRefreshing} onRefresh={load} tintColor="#60a5fa" colors={['#10b981']} />
      }
    >
      {/* Project name */}
      <View style={styles.header}>
        <Text style={styles.projectName}>{status.projectName}</Text>
        <Text style={styles.lastChecked}>Last checked: {status.lastChecked ? new Date(status.lastChecked).toLocaleTimeString() : '—'}</Text>
      </View>

      {/* Server status */}
      <View style={styles.card}>
        <View style={styles.cardRow}>
          <View style={[styles.statusDot, { backgroundColor: serverColor }]} />
          <Text style={[styles.serverStatus, { color: serverColor }]}>{serverLabel}</Text>
        </View>
        {serverStatus !== 'connected' && (
          <Text style={styles.hint}>Connect to your laptop server for live project data</Text>
        )}
      </View>

      {/* Readiness score */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Readiness</Text>
        <View style={styles.scoreRow}>
          <Text style={[styles.scoreValue, { color: readiness.ready ? '#10b981' : '#f59e0b' }]}>
            {readiness.score}%
          </Text>
          <Text style={styles.scoreLabel}>
            {readiness.passedRequired}/{readiness.totalRequired} required · {readiness.passedOptional}/{readiness.totalOptional} optional
          </Text>
        </View>
        {readiness.ready ? (
          <View style={[styles.readyBadge, { backgroundColor: '#10b98120' }]}>
            <Text style={[styles.readyBadgeText, { color: '#10b981' }]}>✓ Project ready</Text>
          </View>
        ) : (
          <View style={[styles.readyBadge, { backgroundColor: '#f59e0b20' }]}>
            <Text style={[styles.readyBadgeText, { color: '#f59e0b' }]}>⚠ Setup incomplete</Text>
          </View>
        )}
      </View>

      {/* Profile info */}
      {profile && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Project Profile</Text>
          <InfoRow label="Methodology" value={profile.methodology ?? 'Not set'} />
          <InfoRow label="Project type" value={profile.project_type ?? 'Not set'} />
          {Object.keys(profile.source_systems).length > 0 && (
            <View style={styles.sourceGrid}>
              {Object.entries(profile.source_systems).map(([name, enabled]) => (
                <View key={name} style={[styles.sourceBadge, { backgroundColor: enabled ? '#10b98120' : '#334155' }]}>
                  <Text style={[styles.sourceText, { color: enabled ? '#10b981' : '#64748b' }]}>
                    {name} {enabled ? '✓' : '✗'}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </View>
      )}

      {/* Pending approvals */}
      <View style={styles.card}>
        <View style={styles.cardRow}>
          <Text style={styles.cardTitle}>Pending Approvals</Text>
          {pendingApprovals > 0 && (
            <View style={styles.countBadge}>
              <Text style={styles.countText}>{pendingApprovals}</Text>
            </View>
          )}
        </View>
        <Text style={styles.hint}>
          {pendingApprovals > 0
            ? `${pendingApprovals} action(s) awaiting approval`
            : 'No pending approvals'}
        </Text>
      </View>

      {/* Readiness checks */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Readiness Checks</Text>
        {readiness.checks.map(check => (
          <View key={check.id} style={styles.checkRow}>
            <Text style={[styles.checkIcon, { color: check.present ? '#10b981' : check.required ? '#ef4444' : '#64748b' }]}>
              {check.present ? '✓' : check.required ? '✗' : '○'}
            </Text>
            <Text style={[styles.checkLabel, { color: check.present ? '#f1f5f9' : '#94a3b8' }]}>
              {check.label}
            </Text>
            {check.required && (
              <Text style={styles.requiredBadge}>required</Text>
            )}
          </View>
        ))}
      </View>

      {/* Next command */}
      {nextCommand && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Next Step</Text>
          <View style={styles.commandBox}>
            <Text style={styles.commandText} selectable>{nextCommand}</Text>
          </View>
        </View>
      )}

      <View style={{ height: 32 }} />
    </ScrollView>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
  content: { padding: 12 },
  loadingText: { color: '#64748b', fontSize: 13, marginTop: 12, textAlign: 'center' },

  header: { marginBottom: 16 },
  projectName: { fontSize: 22, fontWeight: '700', color: '#f1f5f9' },
  lastChecked: { fontSize: 11, color: '#64748b', marginTop: 4 },

  card: { backgroundColor: '#1e293b', borderRadius: 12, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: '#334155' },
  cardTitle: { fontSize: 14, fontWeight: '600', color: '#f1f5f9', marginBottom: 8 },
  cardRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },

  statusDot: { width: 8, height: 8, borderRadius: 4 },
  serverStatus: { fontSize: 13, fontWeight: '600' },
  hint: { fontSize: 12, color: '#64748b', marginTop: 4 },

  scoreRow: { flexDirection: 'row', alignItems: 'baseline', gap: 8, marginBottom: 8 },
  scoreValue: { fontSize: 28, fontWeight: '800' },
  scoreLabel: { fontSize: 11, color: '#94a3b8' },
  readyBadge: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 },
  readyBadgeText: { fontSize: 12, fontWeight: '600' },

  infoRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  infoLabel: { color: '#94a3b8', fontSize: 12 },
  infoValue: { color: '#f1f5f9', fontSize: 12, fontWeight: '500' },

  sourceGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 },
  sourceBadge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4 },
  sourceText: { fontSize: 11, fontWeight: '500' },

  countBadge: { backgroundColor: '#ef4444', borderRadius: 10, minWidth: 20, height: 20, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6 },
  countText: { color: '#fff', fontSize: 11, fontWeight: '700' },

  checkRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 4, gap: 8 },
  checkIcon: { fontSize: 14, width: 18, textAlign: 'center' },
  checkLabel: { flex: 1, fontSize: 13 },
  requiredBadge: { fontSize: 9, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.5 },

  commandBox: { backgroundColor: '#0f172a', borderRadius: 8, padding: 10, borderWidth: 1, borderColor: '#334155' },
  commandText: { color: '#60a5fa', fontSize: 12, fontFamily: 'monospace' },
});
