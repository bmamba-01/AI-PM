import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../App';

type Props = NativeStackScreenProps<RootStackParamList, 'Dashboard'>;

export function DashboardScreen({ navigation }: Props) {
  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>AI-PM Dashboard</Text>
        <Text style={styles.subtitle}>Project Management Toolkit</Text>
      </View>

      <View style={styles.grid}>
        <DashboardCard title="Tasks" icon="📋" onPress={() => navigation.navigate('Tasks')} />
        <DashboardCard title="Approvals" icon="✅" onPress={() => navigation.navigate('Approvals')} />
        <DashboardCard title="Chat" icon="💬" onPress={() => navigation.navigate('Chat')} />
        <DashboardCard title="Reports" icon="📊" onPress={() => navigation.navigate('Reports')} />
        <DashboardCard title="Settings" icon="⚙️" onPress={() => navigation.navigate('Settings')} />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Active Agents</Text>
        {['Morning Briefing', 'PR Review', 'Risk Analyst'].map((name, i) => (
          <View key={i} style={styles.agentItem}>
            <View style={[styles.statusDot, { backgroundColor: i === 1 ? '#10b981' : '#6b7280' }]} />
            <Text style={styles.agentName}>{name}</Text>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

function DashboardCard({ title, icon, onPress }: { title: string; icon: string; onPress: () => void }) {
  return (
    <TouchableOpacity style={styles.card} onPress={onPress}>
      <Text style={styles.cardIcon}>{icon}</Text>
      <Text style={styles.cardTitle}>{title}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a', padding: 16 },
  header: { marginBottom: 24 },
  title: { fontSize: 24, fontWeight: 'bold', color: '#ffffff' },
  subtitle: { fontSize: 14, color: '#94a3b8', marginTop: 4 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 24 },
  card: {
    width: '45%',
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardIcon: { fontSize: 32, marginBottom: 8 },
  cardTitle: { fontSize: 14, color: '#e2e8f0', fontWeight: '500' },
  section: { backgroundColor: '#1e293b', borderRadius: 12, padding: 16 },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: '#ffffff', marginBottom: 12 },
  agentItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8 },
  statusDot: { width: 8, height: 8, borderRadius: 4, marginRight: 12 },
  agentName: { fontSize: 14, color: '#cbd5e1' },
});