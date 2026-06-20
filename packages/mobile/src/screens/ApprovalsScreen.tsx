import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ScrollView, Alert, Animated, PanResponder, Dimensions,
  TextInput, RefreshControl, Share, Modal,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { RootStackParamList } from '../App';
import { useApprovalStore, type ApprovalItem, type ApprovalPriority } from '../state/approval-store';

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

// ─── Create Approval Modal ──────────────────────────────────────────────────

function CreateApprovalSheet({
  visible,
  onClose,
  onCreate,
}: {
  visible: boolean;
  onClose: () => void;
  onCreate: (input: {
    title: string;
    description: string;
    summary_diff: string;
    priority: ApprovalPriority;
    target_system: string;
    target_id: string;
    action_type: string;
    workflow_id: string;
    run_id: string;
    requested_by_agent: string;
    requested_by_role: string;
    confidence: number;
    source_refs: ApprovalItem['source_refs'];
    project_id: string;
  }) => void;
}) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [summaryDiff, setSummaryDiff] = useState('');
  const [priority, setPriority] = useState<ApprovalPriority>('medium');
  const [targetSystem, setTargetSystem] = useState('jira');
  const [targetId, setTargetId] = useState('');

  const valid = title.trim().length > 0 && description.trim().length > 0;

  function handleCreate() {
    if (!valid) return;
    onCreate({
      title: title.trim(),
      description: description.trim(),
      summary_diff: summaryDiff.trim() || `Manual approval request: ${title.trim()}`,
      priority,
      target_system: targetSystem,
      target_id: targetId.trim() || 'manual',
      action_type: 'custom',
      workflow_id: 'manual-approval',
      run_id: `run-${Date.now()}`,
      requested_by_agent: 'mobile-user',
      requested_by_role: 'pm_commander',
      confidence: 100,
      source_refs: [],
      project_id: 'proj-001',
    });
    setTitle('');
    setDescription('');
    setSummaryDiff('');
    setPriority('medium');
    setTargetSystem('jira');
    setTargetId('');
    onClose();
  }

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.sheetOverlay}>
        <View style={styles.sheet}>
          <Text style={styles.sheetTitle}>New Approval Request</Text>

          <Text style={styles.inputLabel}>Title *</Text>
          <TextInput
            style={styles.sheetInput}
            placeholder="Brief description of the action"
            placeholderTextColor="#64748b"
            value={title}
            onChangeText={setTitle}
          />

          <Text style={styles.inputLabel}>Description *</Text>
          <TextInput
            style={[styles.sheetInput, { minHeight: 60 }]}
            placeholder="Detailed explanation"
            placeholderTextColor="#64748b"
            value={description}
            onChangeText={setDescription}
            multiline
            textAlignVertical="top"
          />

          <Text style={styles.inputLabel}>What will change</Text>
          <TextInput
            style={[styles.sheetInput, { minHeight: 60 }]}
            placeholder="Summary of changes"
            placeholderTextColor="#64748b"
            value={summaryDiff}
            onChangeText={setSummaryDiff}
            multiline
            textAlignVertical="top"
          />

          <Text style={styles.inputLabel}>Priority</Text>
          <View style={styles.priorityRow}>
            {(['low', 'medium', 'high', 'critical'] as ApprovalPriority[]).map(p => (
              <TouchableOpacity
                key={p}
                style={[styles.priorityChip, priority === p && { backgroundColor: PRIORITIES[p] + '30', borderColor: PRIORITIES[p] }]}
                onPress={() => setPriority(p)}
              >
                <Text style={[styles.priorityChipText, priority === p && { color: PRIORITIES[p] }]}>
                  {p.charAt(0).toUpperCase() + p.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.inputLabel}>Target system</Text>
          <View style={styles.priorityRow}>
            {['jira', 'github', 'gmail', 'notion', 'confluence'].map(sys => (
              <TouchableOpacity
                key={sys}
                style={[styles.priorityChip, targetSystem === sys && styles.chipActive]}
                onPress={() => setTargetSystem(sys)}
              >
                <Text style={[styles.priorityChipText, targetSystem === sys && styles.chipTextActive]}>
                  {TARGET_ICONS[sys]} {sys}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.inputLabel}>Target ID</Text>
          <TextInput
            style={styles.sheetInput}
            placeholder="e.g. PROJ-123, PR-456"
            placeholderTextColor="#64748b"
            value={targetId}
            onChangeText={setTargetId}
          />

          <View style={styles.sheetActions}>
            <TouchableOpacity style={styles.sheetCancel} onPress={onClose}>
              <Text style={styles.sheetCancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.sheetSubmit, !valid && styles.sheetSubmitDisabled]}
              onPress={valid ? handleCreate : undefined}
            >
              <Text style={styles.sheetSubmitText}>Create</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ─── Main Screen ────────────────────────────────────────────────────────────

export function ApprovalsScreen({ navigation }: Props) {
  const {
    items, isLoading, dataSource, isRefreshing,
    searchQuery, activeFilter, counts,
    queuedCount, syncResult,
    loadItems, decide, refresh, create,
    setSearchQuery, setActiveFilter, getFilteredItems, getPendingCount, exportToJson,
    syncOfflineQueue,
  } = useApprovalStore();

  const [createVisible, setCreateVisible] = useState(false);
  const [syncDismissed, setSyncDismissed] = useState(false);
  const [, setRefreshKey] = useState(0);

  // Reset dismissed state when syncResult changes
  React.useEffect(() => {
    if (syncResult) setSyncDismissed(false);
  }, [syncResult]);

  useFocusEffect(
    useCallback(() => {
      loadItems();
      setRefreshKey(k => k + 1);
      // Auto-sync queued actions when screen comes into focus
      if (dataSource === 'local_server') {
        syncOfflineQueue();
      }
    }, [loadItems, dataSource, syncOfflineQueue])
  );

  const filtered = getFilteredItems();
  const filterCounts = {
    all: items.length,
    pending: items.filter(i => i.status === 'pending').length,
    urgent: items.filter(i => i.status === 'pending' && (i.priority === 'critical' || i.priority === 'high')).length,
    done: items.filter(i => i.status === 'approved' || i.status === 'rejected' || i.status === 'expired' || i.status === 'executed').length,
  };

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

  async function handleExport() {
    try {
      const json = exportToJson();
      await Share.share({ message: json, title: 'Approval Queue Export' });
    } catch (error) {
      Alert.alert('Export Error', String(error));
    }
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
      {/* Sync result banner — shown after successful sync */}
      {syncResult && !syncDismissed && (
        <View style={styles.syncBanner}>
          <Text style={styles.syncBannerText}>✓ {syncResult}</Text>
          <TouchableOpacity onPress={() => setSyncDismissed(true)} style={styles.syncDismiss}>
            <Text style={styles.syncDismissText}>✕</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Offline queue banner — shown when actions are queued */}
      {queuedCount > 0 && (
        <View style={styles.queueBanner}>
          <Text style={styles.queueBannerText}>
            ⟳ {queuedCount} action{queuedCount !== 1 ? 's' : ''} queued — will sync when online
          </Text>
          <TouchableOpacity
            style={styles.syncNowBtn}
            onPress={async () => {
              if (dataSource === 'local_server') {
                await syncOfflineQueue();
              }
            }}
          >
            <Text style={styles.syncNowBtnText}>Sync now</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Data source indicator + notification badge + export */}
      <View style={styles.topBar}>
        <View style={styles.dataSourceIndicator}>
          <View style={[styles.dataSourceDot, { backgroundColor: dataSource === 'local_server' ? '#10b981' : '#f59e0b' }]} />
          <Text style={[styles.dataSourceText, { color: dataSource === 'local_server' ? '#10b981' : '#f59e0b' }]}>
            {dataSource === 'local_server' ? '⚡ Live — local server' : '🧪 Demo — mock data'}
          </Text>
        </View>
        <View style={styles.topBarRight}>
          {getPendingCount() > 0 && (
            <View style={styles.notificationBadge}>
              <Text style={styles.notificationBadgeText}>{getPendingCount()}</Text>
            </View>
          )}
          <TouchableOpacity style={styles.exportBtn} onPress={handleExport}>
            <Text style={styles.exportBtnText}>📤 Export</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.createBtn} onPress={() => setCreateVisible(true)}>
            <Text style={styles.createBtnText}>+ New</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Search bar */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search approvals..."
          placeholderTextColor="#64748b"
          value={searchQuery}
          onChangeText={setSearchQuery}
          returnKeyType="search"
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity style={styles.searchClear} onPress={() => setSearchQuery('')}>
            <Text style={styles.searchClearText}>✕</Text>
          </TouchableOpacity>
        )}
      </View>

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
            {filterCounts[f.key] > 0 && (
              <View style={[styles.chipCount, activeFilter === f.key && styles.chipCountActive]}>
                <Text style={[styles.chipCountText, activeFilter === f.key && styles.chipCountTextActive]}>
                  {filterCounts[f.key]}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Approval list with pull-to-refresh */}
      <FlatList
        data={filtered}
        keyExtractor={item => item.approval_id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={refresh}
            tintColor="#60a5fa"
            colors={['#10b981']}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            {isLoading ? (
              <>
                <Text style={styles.emptyIcon}>⏳</Text>
                <Text style={styles.emptyText}>Loading approvals...</Text>
              </>
            ) : searchQuery ? (
              <>
                <Text style={styles.emptyIcon}>🔍</Text>
                <Text style={styles.emptyText}>No results for "{searchQuery}"</Text>
              </>
            ) : items.length === 0 ? (
              <>
                <Text style={styles.emptyIcon}>✓</Text>
                <Text style={styles.emptyTitle}>No approvals yet</Text>
                <Text style={styles.emptyHint}>
                  New approval requests from agents will appear here{'\n'}when they need your review.
                </Text>
                <TouchableOpacity style={styles.emptyCreateBtn} onPress={() => setCreateVisible(true)}>
                  <Text style={styles.emptyCreateBtnText}>+ Create one</Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <Text style={styles.emptyIcon}>📋</Text>
                <Text style={styles.emptyText}>No approvals in this filter</Text>
              </>
            )}
          </View>
        }
      />

      {/* Create approval sheet */}
      <CreateApprovalSheet
        visible={createVisible}
        onClose={() => setCreateVisible(false)}
        onCreate={async (input) => {
          try {
            await create({ ...input, status: 'pending', deadline: null, ttl_seconds: null, assigned_approvers: [] });
            await refresh();
            Alert.alert('Created', 'Approval request created successfully.');
          } catch (error) {
            Alert.alert('Error', String(error));
          }
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },

  // Sync banners
  syncBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#10b98120',
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginHorizontal: 12,
    marginTop: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#10b98130',
  },
  syncBannerText: { color: '#10b981', fontSize: 13, fontWeight: '500', flex: 1 },
  syncDismiss: { padding: 4 },
  syncDismissText: { color: '#10b981', fontSize: 14 },
  queueBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f59e0b20',
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginHorizontal: 12,
    marginTop: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#f59e0b30',
  },
  queueBannerText: { color: '#f59e0b', fontSize: 13, fontWeight: '500', flex: 1 },
  syncNowBtn: {
    backgroundColor: '#f59e0b',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  syncNowBtnText: { color: '#fff', fontSize: 12, fontWeight: '600' },

  // Top bar
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  dataSourceIndicator: { flexDirection: 'row', alignItems: 'center' },
  dataSourceDot: { width: 6, height: 6, borderRadius: 3, marginRight: 6 },
  dataSourceText: { color: '#64748b', fontSize: 11 },
  topBarRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  notificationBadge: {
    backgroundColor: '#ef4444',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  notificationBadgeText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  exportBtn: {
    backgroundColor: '#1e293b',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: '#334155',
  },
  exportBtnText: { color: '#94a3b8', fontSize: 11, fontWeight: '600' },
  createBtn: {
    backgroundColor: '#3b82f6',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  createBtnText: { color: '#fff', fontSize: 11, fontWeight: '700' },

  // Search
  searchContainer: {
    paddingHorizontal: 12,
    paddingBottom: 6,
    position: 'relative',
  },
  searchInput: {
    backgroundColor: '#1e293b',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    color: '#f1f5f9',
    fontSize: 13,
    borderWidth: 1,
    borderColor: '#334155',
  },
  searchClear: {
    position: 'absolute',
    right: 22,
    top: 7,
    padding: 4,
  },
  searchClearText: { color: '#64748b', fontSize: 14 },

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
  emptyIcon: { fontSize: 32, marginBottom: 12 },
  emptyTitle: { color: '#f1f5f9', fontSize: 16, fontWeight: '600', marginBottom: 6 },
  emptyText: { color: '#64748b', fontSize: 14, textAlign: 'center' },
  emptyHint: { color: '#64748b', fontSize: 13, textAlign: 'center', marginTop: 4, lineHeight: 18 },
  emptyCreateBtn: {
    marginTop: 16,
    backgroundColor: '#3b82f6',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  emptyCreateBtnText: { color: '#fff', fontSize: 13, fontWeight: '600' },

  // Create sheet
  sheetOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#1e293b',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 20,
    paddingBottom: 32,
    maxHeight: '85%',
  },
  sheetTitle: { color: '#f1f5f9', fontSize: 16, fontWeight: '700', marginBottom: 12 },
  inputLabel: { color: '#94a3b8', fontSize: 12, fontWeight: '600', marginBottom: 4, marginTop: 8 },
  sheetInput: {
    backgroundColor: '#0f172a',
    borderRadius: 8,
    padding: 10,
    color: '#f1f5f9',
    fontSize: 13,
    borderWidth: 1,
    borderColor: '#334155',
    minHeight: 36,
  },
  priorityRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 },
  priorityChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    backgroundColor: '#0f172a',
    borderWidth: 1,
    borderColor: '#334155',
  },
  priorityChipText: { color: '#94a3b8', fontSize: 12, fontWeight: '500' },
  sheetActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 16 },
  sheetCancel: { paddingVertical: 10, paddingHorizontal: 16 },
  sheetCancelText: { color: '#94a3b8', fontSize: 14 },
  sheetSubmit: { backgroundColor: '#3b82f6', borderRadius: 8, paddingVertical: 10, paddingHorizontal: 20 },
  sheetSubmitDisabled: { opacity: 0.4 },
  sheetSubmitText: { color: '#fff', fontSize: 14, fontWeight: '600' },
});
