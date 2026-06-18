import React from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../App';

type Props = NativeStackScreenProps<RootStackParamList, 'Reports'>;

const reports = [
  { id: '1', title: 'Sprint Report', date: '2024-08-10' },
  { id: '2', title: 'Risk Analysis', date: '2024-08-09' },
  { id: '3', title: 'Budget Forecast', date: '2024-08-08' },
];

export function ReportsScreen({ navigation }: Props) {
  return (
    <View style={styles.container}>
      <FlatList
        data={reports}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.reportItem}>
            <Text style={styles.reportTitle}>{item.title}</Text>
            <Text style={styles.reportDate}>{item.date}</Text>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a', padding: 16 },
  reportItem: {
    backgroundColor: '#1e293b',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
  },
  reportTitle: { fontSize: 16, color: '#ffffff', fontWeight: '500' },
  reportDate: { fontSize: 12, color: '#94a3b8', marginTop: 4 },
});