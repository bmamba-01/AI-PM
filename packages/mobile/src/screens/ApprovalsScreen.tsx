import React from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../App';

type Props = NativeStackScreenProps<RootStackParamList, 'Approvals'>;

const mockApprovals = [
  { id: '1', title: 'Release v1.2.0', requester: 'Dev Team', status: 'Pending' },
  { id: '2', title: 'Budget increase', requester: 'Finance', status: 'Approved' },
];

export function ApprovalsScreen({ navigation }: Props) {
  return (
    <View style={styles.container}>
      <FlatList
        data={mockApprovals}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <View style={styles.approvalItem}>
            <Text style={styles.approvalTitle}>{item.title}</Text>
            <Text style={styles.approvalRequester}>{item.requester}</Text>
            <View style={styles.actions}>
              {item.status === 'Pending' && (
                <>
                  <TouchableOpacity style={[styles.btn, styles.btnApprove]}>
                    <Text style={styles.btnText}>Approve</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.btn, styles.btnReject]}>
                    <Text style={styles.btnText}>Reject</Text>
                  </TouchableOpacity>
                </>
              )}
              <Text style={[styles.status, { color: item.status === 'Approved' ? '#10b981' : '#f59e0b' }]}>
                {item.status}
              </Text>
            </View>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a', padding: 16 },
  approvalItem: {
    backgroundColor: '#1e293b',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
  },
  approvalTitle: { fontSize: 16, color: '#ffffff', fontWeight: '500' },
  approvalRequester: { fontSize: 12, color: '#94a3b8', marginTop: 4 },
  actions: { flexDirection: 'row', marginTop: 12, alignItems: 'center', gap: 12 },
  btn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 6 },
  btnApprove: { backgroundColor: '#10b981' },
  btnReject: { backgroundColor: '#ef4444' },
  btnText: { color: '#fff', fontSize: 14 },
  status: { fontSize: 12, marginLeft: 'auto' },
});