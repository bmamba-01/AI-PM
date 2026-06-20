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

**Write operations** (decide, create): On network error, do NOT silently fall back. Surface the error immediately:
- `error` state is set to the error message
- `serverStatus` is set to `'unreachable'`
- The error is thrown so the calling component can show an alert
- The user must fix the connection before retrying

## 4. Server Configuration

### 4.1 Setting the Server URL

```typescript
import { configureServer } from '../state/approval-store';

// From Settings screen — handles health check, persistence, and data loading:
await configureServer('http://192.168.1.50:3847');

// To disconnect:
await configureServer(null);
```

### 4.2 Health Check

Before showing runtime mode, the client performs a health check:

```typescript
import { checkServerHealth, type ServerStatus } from '../state/approval-store';

const status: ServerStatus = await checkServerHealth('http://192.168.1.50:3847');
// 'connected' | 'unreachable' | 'unknown'
```

The health check uses a 5-second timeout and GETs `/api/approvals`. A 200 or 404 response means the server is alive.

### 4.3 URL Persistence

The server URL is persisted to `expo-secure-store` so it survives app restarts. On first access, `loadPersistedUrl()` is called to restore the URL.

### 4.4 Settings Screen

The Settings screen (`SettingsScreen.tsx`) provides:

- **Server URL input** — text field for the URL
- **Test Connection** button — runs health check
- **Save & Connect** button — persists URL, runs health check, loads data if connected
- **Disconnect** button — clears URL and reverts to mock
- **Status indicator** — shows connected/unreachable/not configured with color dot
- **Active mode badge** — "ACTIVE" (green) for local server, "MOCK" (amber) for fallback

## 5. Store Interface

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

  loadItems: (filter?) => Promise<void>;
  loadCounts: () => Promise<void>;
  decide: (id, payload) => Promise<ApprovalItem>;
  create: (input) => Promise<ApprovalItem>;
  refresh: () => Promise<void>;
  configureServer: (url: string | null) => Promise<void>;
  // ... search/filter helpers
}
```

## 6. UI Indicators

### ApprovalsScreen

- **Data source bar** at the top:
  - Green dot + "⚡ Live — local server" — connected to laptop-hosted server
  - Amber dot + "🧪 Demo — mock data" — using in-memory seed data
- **Error banner** — shown when `error` is set, with retry option

### SettingsScreen

- **Status dot** with label: Connected (green), Unreachable (red), Not configured (gray)
- **Mode badge**: ACTIVE (green) or MOCK (amber)
- **URL input** with placeholder showing default port

## 7. Type Definitions

All types are defined locally in `packages/mobile/src/state/approval-store.ts`:

- `ApprovalItem` — mirrors the runtime contract
- `DecidePayload` — decision request shape
- `DataSource` — `'local_server' | 'mock_fallback'`
- `ServerStatus` — `'unknown' | 'connected' | 'unreachable'`

No imports from `@ai-pm/core/runtime` in any renderer code.

## 8. Constraints

- **No Node-only imports:** The client uses `fetch` (available in React Native) and `zustand`
- **No file system access:** All state is in-memory or via HTTP
- **Explicit mock mode:** Mock data is clearly labeled, not mixed with server data
- **Write errors are not swallowed:** Failed writes surface errors to the user
- **Health check required:** Server must pass health check before entering live mode
- **URL persisted:** Server URL survives app restarts via expo-secure-store
