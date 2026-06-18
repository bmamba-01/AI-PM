import React from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../App';

type Props = NativeStackScreenProps<RootStackParamList, 'Tasks'>;

const mockTasks = [
  { id: '1', title: 'Setup CI/CD pipeline', status: 'In Progress', priority: 'P1' },
  { id: '2', title: 'Review PR #42', status: 'To Do', priority: 'P0' },
  { id: '3', title: 'Prepare sprint goals', status: 'Done', priority: 'P2' },
];

export function TasksScreen({ navigation }: Props) {
  return (
    <View style={styles.container}>
      <FlatList
        data={mockTasks}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.taskItem}>
            <Text style={styles.taskTitle}>{item.title}</Text>
            <View style={styles.taskMeta}>
              <Text style={[styles.badge, { backgroundColor: getStatusColor(item.status) }]}>
                {item.status}
              </Text>
              <Text style={styles.priority}>{item.priority}</Text>
            </View>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

function getStatusColor(status: string) {
  const colors: Record<string, string> = {
    'To Do': '#6b7280',
    'In Progress': '#3b82f6',
    'Done': '#10b981',
  };
  return colors[status] || '#6b7280';
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a', padding: 16 },
  taskItem: {
    backgroundColor: '#1e293b',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
  },
  taskTitle: { fontSize: 16, color: '#ffffff', fontWeight: '500' },
  taskMeta: { flexDirection: 'row', marginTop: 8, gap: 8 },
  badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4, fontSize: 12, color: '#fff' },
  priority: { fontSize: 12, color: '#94a3b8' },
});