# Mobile Approval API Client

**Date:** 2026-06-19
**Status:** Implemented
**Audience:** Mobile implementers (packages/mobile)
**References:** [approval-queue-ux.md](../product/approval-queue-ux.md), [approval-queue-runtime-contract.md](../architecture/approval-queue-runtime-contract.md), [approval-queue-mobile-components.md](../product/approval-queue-mobile-components.md)

## 1. Purpose

Define the mobile approval API client — a thin fetch-based layer that communicates with the laptop-hosted local server for approval queue operations. When no server URL is configured, the client falls back to an explicit mock mode using seed data.

## 2. Architecture

```text
┌─────────────────────────────────────────────────┐
│                Mobile App                        │
│                                                  │
│  ┌─────────────────┐  ┌──────────────────────┐  │
│  │ ApprovalStore   │  │ Screens              │  │
│  │ (Zustand)       │  │ (React Navigation)   │  │
│  └────────┬────────┘  └──────────┬───────────┘  │
│           │                      │               │
│           └──────────┬───────────┘               │
│                      ▼                           │
│           ┌─────────────────────┐                │
│           │ Approval API Client │                │
│           │ (fetch-based)       │                │
│           │ + Health Check      │                │
│           └──────────┬──────────┘                │
│                      │                           │
│    ┌─────────────────┼────────────────────┐     │
│    ▼                 ▼                    ▼     │
│  Local Server     Mock Fallback       Offline   │
│  (fetch)          (in-memory seed)    (queue)   │
└─────────────────────────────────────────────────┘
```

## 3. Data Source Modes

### 3.1 Local Server Mode

When `configureServer(url)` is called with a valid URL and the server passes a health check, all approval operations go through fetch to the local server.

**API endpoints consumed:**

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/approvals` | List approval items (optional `?status=&priority=` query) |
| GET | `/api/approvals/counts` | Get status counts |
| GET | `/api/approvals/:id` | Get single item |
| POST | `/api/approvals/:id/decide` | Submit decision |

### 3.2 Mock Fallback Mode

When no base URL is configured (default), the client operates in mock fallback mode:

- Uses an in-memory seed dataset of 4 realistic approval items
- All CRUD and state transition logic runs client-side
- Data is not persisted between app restarts
- `dataSource` state is set to `'mock_fallback'`
- UI displays "🧪 Demo — mock data" indicator

### 3.3 Error Handling

**Read operations** (loadItems, loadCounts, refresh): On network error, degrade gracefully to mock fallback and set `error` state. The user sees the error and mock data.

**Write operations** (decide, create): On network error, queue the action for offline sync:
- The action is persisted to `expo-secure-store` as a `QueuedAction`
- Local mock state is updated optimistically so the UI reflects the change
- `queuedCount` is updated in the store
- The error is thrown so the calling component can show an alert
- A "Queued — will sync when online" banner appears in the ApprovalsScreen

## 4. Offline Queue

When the server is unreachable and the user takes a write action (approve, reject, create), the action is queued locally for later sync.

### 4.1 QueuedAction Type

```typescript
interface QueuedAction {
  id: string;           // unique queue entry ID
  type: 'decide' | 'create' | 'resubmit';
  itemId: string | null; // item ID for decide/resubmit, null for create
  payload: DecidePayload | Record<string, unknown> | { summary_diff: string };
  timestamp: string;    // ISO-8601
  status: 'pending' | 'synced' | 'failed';
  error?: string;
}
```

### 4.2 Queue Limits

- **Max size:** 50 actions (oldest discarded with warning)
- **TTL:** 24 hours (expired actions purged on next enqueue)
- **Storage:** `expo-secure-store` under key `ai-pm-queued-actions`

### 4.3 Sync on Reconnect

When `refresh()` or `syncOfflineQueue()` is called and the server is reachable:
1. All pending queued actions are replayed in order
2. Each action is sent to the server API
3. Successfully synced actions are removed from the queue
4. Failed actions are kept with error details
5. `queuedCount` and `syncResult` are updated in the store

### 4.4 UI Indicators

- **Queue banner:** "⟳ N action(s) queued — will sync when online" with "Sync now" button
- **Sync result banner:** "✓ Synced N action(s)" after successful sync (dismissible)
- Both banners appear above the data source indicator

### 4.5 Network Detection

Auto-sync is triggered when:
- `refresh()` is called and server is reachable
- `configureServer()` connects to a server
- Screen comes into focus (via `useFocusEffect`)
- User taps "Sync now" on the queue banner

## 5. Server Configuration

### 5.1 Setting the Server URL

```typescript
import { configureServer } from '../state/approval-store';

// From Settings screen — handles health check, persistence, and data loading:
await configureServer('http://192.168.1.50:3847');

// To disconnect:
await configureServer(null);
```

### 5.2 Health Check

Before showing runtime mode, the client performs a health check:

```typescript
import { checkServerHealth, type ServerStatus } from '../state/approval-store';

const status: ServerStatus = await checkServerHealth('http://192.168.1.50:3847');
// 'connected' | 'unreachable' | 'unknown'
```

The health check uses a 5-second timeout and GETs `/api/approvals`. A 200 or 404 response means the server is alive.

### 5.3 URL Persistence

The server URL is persisted to `expo-secure-store` so it survives app restarts. On first access, `loadPersistedUrl()` is called to restore the URL.

### 5.4 Settings Screen

The Settings screen (`SettingsScreen.tsx`) provides:

- **Server URL input** — text field for the URL
- **Test Connection** button — runs health check
- **Save & Connect** button — persists URL, runs health check, loads data if connected
- **Disconnect** button — clears URL and reverts to mock
- **Status indicator** — shows connected/unreachable/not configured with color dot
- **Active mode badge** — "ACTIVE" (green) for local server, "MOCK" (amber) for fallback

## 6. Store Interface

```typescript
interface ApprovalState {
  items: ApprovalItem[];
  counts: Record<string, number>;
  isLoading: boolean;
  error: string | null;
  dataSource: DataSource;       // 'local_server' | 'mock_fallback'
  serverStatus: ServerStatus;   // 'unknown' | 'connected' | 'unreachable'
  searchQuery: string;
  activeFilter: string;
  isRefreshing: boolean;
  queuedCount: number;          // number of pending offline actions
  syncResult: string | null;    // last sync result message

  loadItems: (filter?) => Promise<void>;
  loadCounts: () => Promise<void>;
  decide: (id, payload) => Promise<ApprovalItem>;
  create: (input) => Promise<ApprovalItem>;
  refresh: () => Promise<void>;
  configureServer: (url: string | null) => Promise<void>;
  syncOfflineQueue: () => Promise<void>;
  // ... search/filter helpers
}
```

## 7. UI Indicators

### ApprovalsScreen

- **Data source bar** at the top:
  - Green dot + "⚡ Live — local server" — connected to laptop-hosted server
  - Amber dot + "🧪 Demo — mock data" — using in-memory seed data
- **Error banner** — shown when `error` is set, with retry option
- **Queue banner** — amber "⟳ N action(s) queued — will sync when online" with "Sync now" button
- **Sync result banner** — green "✓ Synced N action(s)" after successful sync (dismissible)

### SettingsScreen

- **Status dot** with label: Connected (green), Unreachable (red), Not configured (gray)
- **Mode badge**: ACTIVE (green) or MOCK (amber)
- **URL input** with placeholder showing default port

## 8. Type Definitions

All types are defined locally in `packages/mobile/src/state/approval-store.ts`:

- `ApprovalItem` — mirrors the runtime contract
- `DecidePayload` — decision request shape
- `DataSource` — `'local_server' | 'mock_fallback'`
- `ServerStatus` — `'unknown' | 'connected' | 'unreachable'`
- `QueuedAction` — offline action queue entry

No imports from `@ai-pm/core/runtime` in any renderer code.

## 9. Constraints

- **No Node-only imports:** The client uses `fetch` (available in React Native) and `zustand`
- **No file system access:** All state is in-memory or via HTTP
- **Explicit mock mode:** Mock data is clearly labeled, not mixed with server data
- **Write errors queue actions:** Failed writes are queued for later sync, not silently dropped
- **Health check required:** Server must pass health check before entering live mode
- **URL persisted:** Server URL survives app restarts via expo-secure-store
- **Queue limits:** Max 50 actions, 24h TTL, oldest discarded on overflow
