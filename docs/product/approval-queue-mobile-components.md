# Approval Queue Mobile Component Specification

**Date:** 2026-06-19  
**Status:** Design draft  
**Audience:** Mobile implementers (packages/mobile), React Native  
**References:** [approval-queue-ux.md](../product/approval-queue-ux.md) §4, [approval-queue-runtime-contract.md](../architecture/approval-queue-runtime-contract.md) §4, [ApprovalsScreen.tsx](../../packages/mobile/src/screens/ApprovalsScreen.tsx) (existing stub)

## 1. Component Tree

```text
ApprovalsScreen                          (React Navigation screen)
├── ApprovalFilterChips                  (horizontal ScrollView: All | Pending | Urgent | Done)
├── ApprovalCountBadge                   (header right, live count)
│
├── FlatList<ApprovalItem>
│   └── ApprovalListItem                 (one per item)
│       ├── PriorityDot
│       ├── Title (truncated, 2 lines)
│       ├── MetaRow                      (workflow · target_system · age)
│       ├── RequesterBadge
│       └── SwipeActions                 (swipe-right = approve, swipe-left = reject)
│
└── ApprovalDetailScreen                 (pushed via React Navigation)
    ├── ScrollView
    │   ├── ApprovalDetailHeader
    │   │   ├── Title
    │   │   ├── SourceWorkflowBadge
    │   │   ├── ConfidenceScore          (compact arc)
    │   │   ├── TargetSystem + TargetID
    │   │   ├── CreatedAt / Deadline
    │   │   └── RevisionRound            (if > 0)
    │   ├── ApprovalChangePreview        (collapsible, defaults collapsed)
    │   ├── ApprovalSourceRefs           (collapsible)
    │   └── ApprovalRevisionHistory      (if revision_round > 0)
    │
    └── ApprovalActionSheet              (fixed bottom bar)
        ├── ApproveButton                (primary, green)
        ├── RejectButton                 (destructive, opens reason sheet)
        ├── RequestRevisionButton        (secondary, opens comment sheet)
        └── DelegateButton               (tertiary link)

DecisionSheets (modals):
├── RejectReasonSheet                    (TextInput + Submit)
├── RevisionCommentSheet                 (TextInput + Submit)
├── DelegateUserSheet                    (user picker + note input)
└── OfflineQueueIndicator                (banner when actions queued offline)
```

## 2. Navigation

### 2.1 Screen Registration

The existing `RootStackParamList` in `packages/mobile/src/App.tsx` already includes `Approvals`. Extend it:

```typescript
export type RootStackParamList = {
  Dashboard: undefined;
  Tasks: undefined;
  Approvals: undefined;
  ApprovalDetail: { approvalId: string };
  Chat: undefined;
  Reports: undefined;
  Settings: undefined;
};
```

### 2.2 Stack Navigator

```typescript
<Stack.Screen name="Approvals" component={ApprovalsScreen} options={{ title: 'Approvals' }} />
<Stack.Screen name="ApprovalDetail" component={ApprovalDetailScreen} options={{ title: 'Approval Detail' }} />
```

### 2.3 Navigation Calls

| From | To | Code |
|---|---|---|
| ApprovalsScreen (tap item) | ApprovalDetail | `navigation.navigate('ApprovalDetail', { approvalId: item.approval_id })` |
| ApprovalsScreen (tap "See all" from Dashboard) | Approvals | `navigation.navigate('Approvals')` |
| DashboardScreen (notification tap) | ApprovalDetail | `navigation.navigate('ApprovalDetail', { approvalId: id })` |
| Bottom tab bar (Approvals tab) | Approvals | `navigation.navigate('Approvals')` |

### 2.4 Back Navigation

ApprovalDetail uses `useNavigation()` for standard back behavior. After a decision is submitted, the detail screen pops back to the list and the list refreshes.

```typescript
// After successful decision:
navigation.goBack();
// List screen refreshes via useFocusEffect
```

## 3. Props Interface

### 3.1 ApprovalsScreen

```typescript
type Props = NativeStackScreenProps<RootStackParamList, 'Approvals'>;
```

No additional props. The screen reads from the local API and manages its own state.

### 3.2 ApprovalDetailScreen

```typescript
type Props = NativeStackScreenProps<RootStackParamList, 'ApprovalDetail'>;

// Route params:
interface ApprovalDetailParams {
  approvalId: string;
}
```

### 3.3 ApprovalListItem

```typescript
interface ApprovalListItemProps {
  item: ApprovalItem;
  onPress: () => void;
  onApprove: () => void;
  onReject: () => void;
}
```

### 3.4 ApprovalFilterChips

```typescript
interface ApprovalFilterChipsProps {
  activeFilter: 'all' | 'pending' | 'urgent' | 'done';
  onFilterChange: (filter: 'all' | 'pending' | 'urgent' | 'done') => void;
  counts: Record<string, number>;
}
```

Filter mapping to API params:

| Chip | API params |
|---|---|
| `all` | no filter |
| `pending` | `status=pending` |
| `urgent` | `status=pending&priority=critical,high` |
| `done` | `status=approved,rejected,executed,expired` |

### 3.5 ApprovalActionSheet

```typescript
interface ApprovalActionSheetProps {
  status: ApprovalStatus;
  onApprove: () => void;
  onReject: () => void;
  onRequestRevision: () => void;
  onDelegate: () => void;
  isDeciding: boolean;
}
```

### 3.6 RejectReasonSheet

```typescript
interface RejectReasonSheetProps {
  visible: boolean;
  onSubmit: (reason: string) => void;
  onCancel: () => void;
  isSubmitting: boolean;
}
```

Validation: min 10 characters. Submit button disabled until valid.

### 3.7 RevisionCommentSheet

```typescript
interface RevisionCommentSheetProps {
  visible: boolean;
  onSubmit: (notes: string) => void;
  onCancel: () => void;
  isSubmitting: boolean;
}
```

Validation: min 10 characters. Submit button disabled until valid.

### 3.8 DelegateUserSheet

```typescript
interface DelegateUserSheetProps {
  visible: boolean;
  onSubmit: (userId: string, note?: string) => void;
  onCancel: () => void;
  isSubmitting: boolean;
}
```

### 3.9 ConfidenceScore (compact)

```typescript
interface ConfidenceScoreProps {
  score: number;    // 0–100
  size?: 'compact' | 'full';
}
```

Compact: 24px arc with number inside. Full: 40px arc with label below.

### 3.10 OfflineQueueIndicator

```typescript
interface OfflineQueueIndicatorProps {
  queuedCount: number;
  isOnline: boolean;
}
```

## 4. State Management

### 4.1 Fetch Pattern

Each screen manages its own state with `useState` + `useEffect`. No shared Zustand store on mobile — the mobile app is a thin renderer over the local server API.

```typescript
// ApprovalsScreen.tsx
const [items, setItems] = useState<ApprovalItem[]>([]);
const [counts, setCounts] = useState<Record<string, number>>({});
const [filter, setFilter] = useState<'all' | 'pending' | 'urgent' | 'done'>('all');
const [isLoading, setIsLoading] = useState(true);
const [isRefreshing, setIsRefreshing] = useState(false);
const [isOnline, setIsOnline] = useState(true);
```

### 4.2 API Base

```typescript
const API_BASE = 'http://localhost:3847';  // local server
```

On device, this would be the laptop's LAN IP or a configured endpoint. For development, use `localhost` with port forwarding.

### 4.3 Cache Strategy

| Data | Storage | TTL | Invalidation |
|---|---|---|---|
| Item list | `AsyncStorage` (encrypted) | 5 minutes | On pull-to-refresh, after decision, screen focus |
| Item detail | `AsyncStorage` (encrypted) | 5 minutes | On navigation to detail, after decision |
| Counts | `AsyncStorage` (not encrypted) | 30 seconds | On focus, after decision, periodic |
| Offline queue | `AsyncStorage` (encrypted) | 24 hours | On sync success |

Cache key scheme:

```typescript
const CACHE_KEYS = {
  items: (project_id: string, filter: string) => `approval_items_${project_id}_${filter}`,
  detail: (id: string) => `approval_detail_${id}`,
  counts: (project_id: string) => `approval_counts_${project_id}`,
  offlineQueue: 'approval_offline_queue',
};
```

### 4.4 Offline Handling

**Detection:**

```typescript
import NetInfo from '@react-native-community/netinfo';

useEffect(() => {
  const unsubscribe = NetInfo.addEventListener(state => {
    setIsOnline(state.isConnected ?? false);
  });
  return () => unsubscribe();
}, []);
```

**Offline queue:**

When the user approves/rejects/requests revision while offline:

1. Store the action in an encrypted offline queue:

```typescript
interface OfflineAction {
  action_id: string;           // UUID
  approval_id: string;
  decision: 'approve' | 'reject' | 'revision_requested';
  payload: { reason?: string; notes?: string };
  queued_at: string;           // ISO-8601
  expires_at: string;          // ISO-8601 (24h from queued_at)
  user_id: string;
}
```

2. Show a visual indicator: "Queued — will sync when online" (yellow banner at top of list).
3. When connectivity resumes, replay the queue in order:
   - `POST /api/approvals/:id/decide` for each action.
   - If the item has already been decided (409 Conflict), discard the stale action and show a toast: "Action expired — item was already decided."
   - If the item has expired, discard and show: "Action expired — item is no longer pending."
4. On successful sync, remove from queue and refresh the list.
5. Queue TTL: 24 hours. Expired queue items are discarded on next app launch.

**Encrypted storage:**

```typescript
import * as Keychain from 'react-native-keychain';

// Store offline queue
await Keychain.setGenericPassword('approval_queue', JSON.stringify(queue), {
  service: 'ai-pm-offline-approvals',
  accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
});

// Retrieve offline queue
const credentials = await Keychain.getGenericPassword({ service: 'ai-pm-offline-approvals' });
```

### 4.5 Sync on Reconnect

```typescript
useEffect(() => {
  if (!isOnline) return;
  syncOfflineQueue().then(() => {
    fetchItems();
    fetchCounts();
  });
}, [isOnline]);
```

The sync function processes the queue sequentially, with a 500ms delay between actions to avoid rate limiting.

## 5. Pull-to-Refresh

### 5.1 Implementation

Use React Native's built-in `RefreshControl` on the `FlatList`:

```typescript
<FlatList
  data={filteredItems}
  keyExtractor={item => item.approval_id}
  renderItem={/* ... */}
  refreshControl={
    <RefreshControl
      refreshing={isRefreshing}
      onRefresh={onRefresh}
      tintColor="#ffffff"
      colors={['#10b981']}
    />
  }
/>
```

### 5.2 Refresh Behavior

```typescript
const onRefresh = useCallback(async () => {
  setIsRefreshing(true);
  try {
    await Promise.all([fetchItems(), fetchCounts()]);
  } finally {
    setIsRefreshing(false);
  }
}, [filter]);
```

### 5.3 Focus Refresh

```typescript
import { useFocusEffect } from '@react-navigation/native';

useFocusEffect(
  useCallback(() => {
    fetchItems();
    fetchCounts();
  }, [filter])
);
```

The screen refreshes every time it gains focus (e.g., after returning from detail screen or from another tab).

### 5.4 Offline Refresh

When offline, pull-to-refresh shows a brief message: "Offline — showing cached data" and does NOT make API calls. The cached data is displayed as-is.

## 6. Push Notification Deep-Linking

### 6.1 Notification Subscription

The mobile app subscribes to two notification channels via the local server's push notification service:

| Channel | Trigger | Filter |
|---|---|---|
| `approval:created` | New item enters queue | Only `critical` and `high` priority |
| `approval:status_changed` | Item status changes | Only items where user is in `assigned_approvers` |

### 6.2 Notification Payload

```typescript
interface ApprovalNotificationPayload {
  type: 'approval:created' | 'approval:status_changed';
  approval_id: string;
  title: string;
  priority: 'critical' | 'high';
  action?: string;          // 'approved', 'rejected', 'revision_requested', 'executed'
  timestamp: string;        // ISO-8601
}
```

### 6.3 Notification Setup

```typescript
import messaging from '@react-native-firebase/messaging';

// Request permission
const authStatus = await messaging().requestPermission();
const enabled = authStatus === messaging.AuthorizationStatus.AUTHORIZED;

// Subscribe to approval topics
if (enabled) {
  await messaging().subscribeToTopic('approval_critical');
  await messaging().subscribeToTopic('approval_high');
  await messaging().subscribeToTopic(`approval_user_${userId}`);
}
```

### 6.4 Deep-Link Handler

```typescript
// In App.tsx or a root-level notification handler
messaging().onNotificationOpenedApp(remoteMessage => {
  const data = remoteMessage.data as ApprovalNotificationPayload;
  if (data.type?.startsWith('approval:') && data.approval_id) {
    navigationRef.current?.navigate('ApprovalDetail', {
      approvalId: data.approval_id,
    });
  }
});

// When app was killed and opened via notification
messaging().getInitialNotification().then(remoteMessage => {
  if (remoteMessage) {
    const data = remoteMessage.data as ApprovalNotificationPayload;
    if (data.type?.startsWith('approval:') && data.approval_id) {
      // Delay navigation until navigation is ready
      setTimeout(() => {
        navigationRef.current?.navigate('ApprovalDetail', {
          approvalId: data.approval_id,
        });
      }, 1000);
    }
  }
});
```

### 6.5 Notification Display

When the app is in the foreground, show a local notification banner:

```typescript
messaging().onMessage(async remoteMessage => {
  const data = remoteMessage.data as ApprovalNotificationPayload;
  // Show in-app banner
  showInAppNotification({
    title: data.title,
    body: data.priority === 'critical'
      ? `Critical approval required — tap to review`
      : `High priority — tap to review`,
    onPress: () => {
      navigationRef.current?.navigate('ApprovalDetail', {
        approvalId: data.approval_id,
      });
    },
  });
});
```

### 6.6 Badge Count

The mobile app maintains a badge count on the Approvals tab icon:

```typescript
// Update badge when counts change
import PushNotification from 'react-native-push-notification';

PushNotification.setApplicationIconBadgeNumber(counts.pending || 0);
```

## 7. Swipe Actions

### 7.1 Implementation

Use `react-native-gesture-handler` `Swipeable` component:

```typescript
<Swipeable
  renderRightActions={() => (
    <TouchableOpacity style={styles.swipeApprove} onPress={onApprove}>
      <Text style={styles.swipeText}>Approve</Text>
    </TouchableOpacity>
  )}
  renderLeftActions={() => (
    <TouchableOpacity style={styles.swipeReject} onPress={onReject}>
      <Text style={styles.swipeText}>Reject</Text>
    </TouchableOpacity>
  )}
  onSwipeableOpen={(direction) => {
    if (direction === 'right') onApprove();
    if (direction === 'left') onReject();
  }}
>
  {/* ListItem content */}
</Swipeable>
```

### 7.2 Swipe Behavior

| Direction | Action | Background |
|---|---|---|
| Swipe right | Approve | Green (`#10b981`) with checkmark icon |
| Swipe left | Reject | Red (`#ef4444`) with X icon |

- Swipe only enabled for `pending` and `revision_requested` items.
- After swipe completes, show a brief confirmation toast: "Approved" or "Reject reason required" (opens sheet for reject).
- Items in other states do not respond to swipe.

### 7.3 Swipe Threshold

Minimum swipe distance: 80px (about 40% of a typical phone width). This prevents accidental swipes.

## 8. Visual Requirements

### 8.1 Color System

| Element | Color |
|---|---|
| Background | `#0f172a` (existing dark theme) |
| Card background | `#1e293b` (existing) |
| Priority: critical | `#ef4444` |
| Priority: high | `#f97316` |
| Priority: medium | `#f59e0b` |
| Priority: low | `#94a3b8` |
| Status: pending | `#f59e0b` |
| Status: revision_requested | `#fb923c` |
| Status: expired | `#64748b` |
| Status: approved | `#10b981` |
| Status: rejected | `#ef4444` |
| Status: executing | `#38bdf8` |
| Status: executed | `#10b981` (dim) |
| Confidence ≥ 80 | `#10b981` |
| Confidence 60–79 | `#f97316` |
| Confidence < 60 | `#ef4444` |
| Approve button | `#10b981` |
| Reject button | `#ef4444` |
| Secondary button | `#334155` |

### 8.2 Filter Chips

```typescript
const styles = StyleSheet.create({
  chipContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#1e293b',
  },
  chipActive: {
    backgroundColor: '#334155',
    borderWidth: 1,
    borderColor: '#5AC8FA',
  },
  chipText: {
    fontSize: 13,
    color: '#94a3b8',
  },
  chipTextActive: {
    color: '#ffffff',
    fontWeight: '600',
  },
  chipCount: {
    fontSize: 10,
    color: '#64748b',
    marginLeft: 4,
  },
});
```

### 8.3 Detail Screen Layout

```typescript
const detailStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 120, // space for fixed action bar
  },
  header: {
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 8,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  metaText: {
    fontSize: 12,
    color: '#94a3b8',
  },
  collapsibleSection: {
    backgroundColor: '#1e293b',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  collapsibleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  actionBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#1e293b',
    borderTopWidth: 1,
    borderTopColor: '#334155',
    padding: 12,
    paddingBottom: 24, // safe area
    flexDirection: 'row',
    gap: 8,
  },
  approveBtn: {
    flex: 1,
    backgroundColor: '#10b981',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  rejectBtn: {
    flex: 1,
    backgroundColor: '#ef4444',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  secondaryBtn: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#334155',
    borderRadius: 8,
    alignItems: 'center',
  },
});
```

## 9. Bottom Tab Bar Integration

### 9.1 Tab Configuration

The existing app uses a `NativeStackNavigator`. The bottom tab bar should be added as a parent navigator:

```typescript
// App.tsx - refactored structure
const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator<RootStackParamList>();

function ApprovalsStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen name="Approvals" component={ApprovalsScreen} options={{ title: 'Approvals' }} />
      <Stack.Screen name="ApprovalDetail" component={ApprovalDetailScreen} options={{ title: 'Detail' }} />
    </Stack.Navigator>
  );
}

export default function App() {
  return (
    <NavigationContainer>
      <Tab.Navigator>
        <Tab.Screen name="Dashboard" component={DashboardScreen}
          options={{ tabBarIcon: ({ color, size }) => <DashboardIcon color={color} size={size} /> }} />
        <Tab.Screen name="Tasks" component={TasksScreen}
          options={{ tabBarIcon: ({ color, size }) => <TasksIcon color={color} size={size} /> }} />
        <Tab.Screen name="Approvals" component={ApprovalsStack}
          options={{
            tabBarIcon: ({ color, size }) => <ApprovalsIcon color={color} size={size} />,
            tabBarBadge: pendingCount > 0 ? pendingCount : undefined,
            tabBarBadgeStyle: { backgroundColor: '#ef4444', fontSize: 10 },
          }} />
        <Tab.Screen name="Chat" component={ChatScreen}
          options={{ tabBarIcon: ({ color, size }) => <ChatIcon color={color} size={size} }} />
        <Tab.Screen name="Settings" component={SettingsScreen}
          options={{ tabBarIcon: ({ color, size }) => <SettingsIcon color={color} size={size} }} />
      </Tab.Navigator>
    </NavigationContainer>
  );
}
```

### 9.2 Badge Count Updates

```typescript
// In a root-level effect or context provider
const [pendingCount, setPendingCount] = useState(0);

// Poll counts every 30 seconds when app is in foreground
useEffect(() => {
  const interval = setInterval(async () => {
    const counts = await fetchCounts();
    setPendingCount(counts.pending || 0);
  }, 30_000);
  return () => clearInterval(interval);
}, []);
```

## 10. Dashboard Card Integration

### 10.1 Pending Approvals Card

In `DashboardScreen.tsx`, add a summary card:

```typescript
<PendingApprovalsCard
  items={pendingItems.slice(0, 3)}
  totalCount={pendingCount}
  onViewAll={() => navigation.navigate('Approvals')}
  onPressItem={(item) => navigation.navigate('ApprovalDetail', { approvalId: item.approval_id })}
/>
```

### 10.2 Card Layout

```text
┌─────────────────────────────────────────┐
│ ⚡ Pending Approvals          See all →  │
│                                         │
│ 🔴 Critical: PR #234 merge      2h ago  │
│ 🟠 High: Publish weekly report   45m ago│
│ 🟡 Medium: Update risk register  1h ago │
│                                         │
│ +3 more items need review               │
└─────────────────────────────────────────┘
```

### 10.3 Card Props

```typescript
interface PendingApprovalsCardProps {
  items: ApprovalItem[];          // max 3 displayed
  totalCount: number;
  onViewAll: () => void;
  onPressItem: (item: ApprovalItem) => void;
}
```

### 10.4 Card Styles

```typescript
const cardStyles = StyleSheet.create({
  card: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#ffffff',
  },
  seeAll: {
    fontSize: 13,
    color: '#5AC8FA',
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  moreText: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 8,
    textAlign: 'center',
  },
});
```
