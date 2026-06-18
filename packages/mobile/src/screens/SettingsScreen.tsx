import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Switch } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../App';

type Props = NativeStackScreenProps<RootStackParamList, 'Settings'>;

export function SettingsScreen({ navigation }: Props) {
  return (
    <View style={styles.container}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Preferences</Text>
        <SettingItem label="Dark Mode" value={true} onValueChange={() => {}} />
        <SettingItem label="Notifications" value={true} onValueChange={() => {}} />
        <SettingItem label="Biometric Auth" value={false} onValueChange={() => {}} />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Integrations</Text>
        <SettingItem label="Jira Connected" value={true} onValueChange={() => {}} />
        <SettingItem label="GitHub Connected" value={false} onValueChange={() => {}} />
        <SettingItem label="Slack Connected" value={false} onValueChange={() => {}} />
      </View>

      <TouchableOpacity style={styles.logoutBtn}>
        <Text style={styles.logoutText}>Sign Out</Text>
      </TouchableOpacity>
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
  settingRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12 },
  settingLabel: { fontSize: 14, color: '#cbd5e1' },
  logoutBtn: { backgroundColor: '#ef4444', borderRadius: 8, padding: 16, alignItems: 'center', marginTop: 'auto' },
  logoutText: { color: '#ffffff', fontWeight: '600' },
});