import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ScrollView, Alert, Animated, PanResponder, Dimensions,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { RootStackParamList } from '../App';
import { useApprovalStore } from '../state/approval-store';
import type { ApprovalItem } from '@ai-pm/core/runtime';

type Props = NativeStackScreenProps<RootStackParamList, 'Approvals'>;

type FilterType = 'all' | 'pending' | 'urgent' | 'done';

const STATUS_COLOR: Record<string, string> = {
  pending: '#f59e0b',
  revision_requested: '#fb923c',
  approved: '#10b981',
  rejected: '#ef4444',
  cancelled: '#64748b',
  expired: '#64748b',
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

const PRIORITIES: Record<string, string> = {
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
      <View style={[styles.swipeAction, styles.swipeApprove, { right: 0 }]}>
        <Text style={styles.swipeActionText}>✓ Approve</Text>
      </View>
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
  const { items, isLoading, loadItems, decide, refresh } = useApprovalStore();
  const [, setRefreshKey] = useState(0);

  // Refresh when screen comes into focus (after returning from detail)
  useFocusEffect(
    useCallback(() => {
      loadItems();
      setRefreshKey(k => k + 1);
    }, [loadItems])
  );

  const filtered = filterItems(items, activeFilter);
  const counts = filterCounts(items);

  function handleSwipeApprove(item: ApprovalItem) {
    Alert.alert('Approve', `Approve "${item.title}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Approve',
        onPress: async () => {
          try {
            await decide(item.approval_id, { decided_by: 'mobile-user', decision: 'approve' });
            await refresh();
            Alert.alert('Done', 'Approval submitted.');
          } catch (error) {
            Alert.alert('Error', String(error));
          }
        },
      },
    ]);
  }

  function handleSwipeReject(item: ApprovalItem) {
    Alert.alert('Reject', `Reject "${item.title}"?\n\nYou will be prompted for a reason.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Reject',
        style: 'destructive',
        onPress: () => {
          // Simple prompt — in production use a modal
          Alert.prompt?.(
            'Rejection Reason',
            'Min 10 characters:',
            async (reason) => {
              if (!reason || reason.length < 10) {
                Alert.alert('Error', 'Rejection reason must be at least 10 characters.');
                return;
              }
              try {
                await decide(item.approval_id, { decided_by: 'mobile-user', decision: 'reject', reason });
                await refresh();
                Alert.alert('Done', 'Rejection submitted.');
              } catch (error) {
                Alert.alert('Error', String(error));
              }
            }
          );
        },
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
          <View style={styles.cardHeader}>
            <View style={[styles.priorityDot, { backgroundColor: PRIORITIES[item.priority] ?? '#94a3b8' }]} />
            <Text style={styles.cardTitle} numberOfLines={2}>{item.title}</Text>
            <View style={[styles.statusBadge, { backgroundColor: (STATUS_COLOR[item.status] ?? '#64748b') + '20' }]}>
              <Text style={[styles.statusBadgeText, { color: STATUS_COLOR[item.status] ?? '#64748b' }]}>
                {STATUS_LABEL[item.status] ?? item.status}
              </Text>
            </View>
          </View>

          <View style={styles.metaRow}>
            <Text style={styles.metaText}>
              {TARGET_ICONS[item.target_system] || '🔗'} {item.workflow_id.replace('wf-', '')} · {item.target_system}
            </Text>
            <Text style={styles.metaAge}>{timeAgo(item.created_at)} ago</Text>
          </View>

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
            <Text style={styles.emptyText}>
              {isLoading ? 'Loading approvals...' : 'No approvals in this filter'}
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },

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
