import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Switch,
  TextInput, Alert, ActivityIndicator,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../App';
import {
  useApprovalStore,
  getApprovalBaseUrl,
  checkServerHealth,
  setApprovalBaseUrl,
  type ServerStatus,
} from '../state/approval-store';

type Props = NativeStackScreenProps<RootStackParamList, 'Settings'>;

export function SettingsScreen({ navigation }: Props) {
  const { dataSource, configureServer } = useApprovalStore();
  const [serverUrl, setServerUrl] = useState(getApprovalBaseUrl() ?? '');
  const [serverStatus, setServerStatus] = useState<ServerStatus>('unknown');
  const [isChecking, setIsChecking] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Check status on mount if URL is set
  useEffect(() => {
    const url = getApprovalBaseUrl();
    if (url) {
      setIsChecking(true);
      checkServerHealth(url).then(status => {
        setServerStatus(status);
        setIsChecking(false);
      });
    }
  }, []);

  async function handleHealthCheck() {
    if (!serverUrl.trim()) {
      Alert.alert('Error', 'Enter a server URL first');
      return;
    }
    setIsChecking(true);
    try {
      const status = await checkServerHealth(serverUrl.trim());
      setServerStatus(status);
      if (status === 'connected') {
        Alert.alert('Connected', `Server at ${serverUrl.trim()} is reachable`);
      } else {
        Alert.alert('Unreachable', `Cannot reach server at ${serverUrl.trim()}`);
      }
    } finally {
      setIsChecking(false);
    }
  }

  async function handleSave() {
    const url = serverUrl.trim() || null;
    setIsSaving(true);
    try {
      await configureServer(url);
      Alert.alert('Saved', url
        ? `Connected to ${url}. Loading approvals from server.`
        : 'Disconnected. Using mock data.');
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDisconnect() {
    setServerUrl('');
    setServerStatus('unknown');
    await configureServer(null);
    Alert.alert('Disconnected', 'Using mock data.');
  }

  const statusColor = serverStatus === 'connected' ? '#10b981'
    : serverStatus === 'unreachable' ? '#ef4444'
    : '#64748b';
  const statusLabel = serverStatus === 'connected' ? 'Connected'
    : serverStatus === 'unreachable' ? 'Unreachable'
    : 'Not configured';

  return (
    <View style={styles.container}>
      {/* Server Configuration */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Local Server</Text>

        {/* Current status */}
        <View style={styles.statusRow}>
          <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
          <Text style={[styles.statusText, { color: statusColor }]}>{statusLabel}</Text>
          {dataSource === 'local_server' && (
            <View style={styles.liveBadge}>
              <Text style={styles.liveBadgeText}>ACTIVE</Text>
            </View>
          )}
          {dataSource === 'mock_fallback' && (
            <View style={styles.mockBadge}>
              <Text style={styles.mockBadgeText}>MOCK</Text>
            </View>
          )}
        </View>

        {/* URL input */}
        <Text style={styles.label}>Server URL</Text>
        <TextInput
          style={styles.input}
          value={serverUrl}
          onChangeText={setServerUrl}
          placeholder="http://192.168.1.50:3847"
          placeholderTextColor="#64748b"
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="url"
        />
        <Text style={styles.hint}>
          Enter the URL of your laptop running the AI-PM local server.
          Leave empty to use demo data.
        </Text>

        {/* Actions */}
        <View style={styles.buttonRow}>
          <TouchableOpacity
            style={[styles.btn, styles.btnSecondary]}
            onPress={handleHealthCheck}
            disabled={isChecking || !serverUrl.trim()}
          >
            {isChecking ? (
              <ActivityIndicator size="small" color="#94a3b8" />
            ) : (
              <Text style={styles.btnSecondaryText}>Test Connection</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.btn, styles.btnPrimary]}
            onPress={handleSave}
            disabled={isSaving}
          >
            {isSaving ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.btnPrimaryText}>Save & Connect</Text>
            )}
          </TouchableOpacity>
        </View>

        {dataSource === 'local_server' && (
          <TouchableOpacity style={styles.disconnectBtn} onPress={handleDisconnect}>
            <Text style={styles.disconnectText}>Disconnect from server</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Other Preferences */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Preferences</Text>
        <SettingItem label="Dark Mode" value={true} onValueChange={() => {}} />
        <SettingItem label="Notifications" value={true} onValueChange={() => {}} />
      </View>

      {/* Integrations */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Integrations</Text>
        <SettingItem label="Jira Connected" value={true} onValueChange={() => {}} />
        <SettingItem label="GitHub Connected" value={false} onValueChange={() => {}} />
        <SettingItem label="Slack Connected" value={false} onValueChange={() => {}} />
      </View>
    </View>
  );
}

function SettingItem({ label, value, onValueChange }: { label: string; value: boolean; onValueChange: (v: boolean) => void }) {
  return (
    <View style={styles.settingRow}>
      <Text style={styles.settingLabel}>{label}</Text>
      <Switch value={value} onValueChange={onValueChange} trackColor={{ false: '#334155', true: '#4f46e5' }} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a', padding: 16 },
  section: { backgroundColor: '#1e293b', borderRadius: 12, padding: 16, marginBottom: 16 },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: '#ffffff', marginBottom: 12 },

  // Server status
  statusRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, gap: 8 },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  statusText: { fontSize: 13, fontWeight: '500' },
  liveBadge: { backgroundColor: '#10b98120', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  liveBadgeText: { color: '#10b981', fontSize: 10, fontWeight: '700' },
  mockBadge: { backgroundColor: '#f59e0b20', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  mockBadgeText: { color: '#f59e0b', fontSize: 10, fontWeight: '700' },

  // Form
  label: { fontSize: 12, color: '#94a3b8', marginBottom: 4, marginTop: 8 },
  input: {
    backgroundColor: '#0f172a',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#334155',
    padding: 12,
    color: '#f1f5f9',
    fontSize: 14,
  },
  hint: { fontSize: 11, color: '#64748b', marginTop: 6 },

  // Buttons
  buttonRow: { flexDirection: 'row', gap: 8, marginTop: 12 },
  btn: { flex: 1, borderRadius: 8, paddingVertical: 12, alignItems: 'center' },
  btnPrimary: { backgroundColor: '#3b82f6' },
  btnPrimaryText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  btnSecondary: { backgroundColor: '#334155' },
  btnSecondaryText: { color: '#94a3b8', fontSize: 14, fontWeight: '600' },
  disconnectBtn: { marginTop: 12, alignItems: 'center', paddingVertical: 8 },
  disconnectText: { color: '#ef4444', fontSize: 13 },

  // Other settings
  settingRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12 },
  settingLabel: { fontSize: 14, color: '#cbd5e1' },
});
