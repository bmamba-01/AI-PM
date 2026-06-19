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

When `setApprovalBaseUrl(url)` is called with a valid URL (e.g. `http://192.168.1.50:3000`), all approval operations go through fetch to the local server API.

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

### 3.3 Error Degradation

If a fetch call to the local server fails (network error, timeout, server down):

1. The error message is stored in `state.error`
2. The client degrades to mock fallback mode for that operation
3. `dataSource` is set to `'mock_fallback'`
4. UI shows the error and fallback indicator

## 4. Configuration

### 4.1 Setting the Server URL

```typescript
import { setApprovalBaseUrl } from '../state/approval-store';

// At app startup or from Settings screen:
setApprovalBaseUrl('http://192.168.1.50:3000');

// To revert to mock mode:
setApprovalBaseUrl(null);
```

### 4.2 Default Behavior

- Default: no server URL → mock fallback mode
- `dataSource` starts as `'mock_fallback'`
- UI displays "Mock fallback" indicator with amber dot

## 5. Store Interface

```typescript
interface ApprovalState {
  items: ApprovalItem[];
  counts: Record<string, number>;
  isLoading: boolean;
  error: string | null;
  dataSource: DataSource;  // 'local_server' | 'mock_fallback'

  loadItems: (filter?: { status?: string; priority?: string }) => Promise<void>;
  loadCounts: () => Promise<void>;
  decide: (id: string, payload: DecidePayload) => Promise<ApprovalItem>;
  refresh: () => Promise<void>;
}
```

## 6. UI Indicators

The `ApprovalsScreen` displays a data source indicator bar at the top:

- **Green dot + "Local server"** — connected to laptop-hosted server
- **Amber dot + "Mock fallback"** — using in-memory seed data

The indicator updates reactively as the store's `dataSource` changes.

## 7. Type Definitions

All types are defined locally in `packages/mobile/src/state/approval-store.ts`:

- `ApprovalItem` — mirrors the runtime contract
- `DecidePayload` — decision request shape
- `DataSource` — `'local_server' | 'mock_fallback'`

No imports from `@ai-pm/core/runtime` in any renderer code.

## 8. Constraints

- **No Node-only imports:** The client uses `fetch` (available in React Native) and `zustand`
- **No file system access:** All state is in-memory or via HTTP
- **Explicit mock mode:** Mock data is clearly labeled, not mixed with server data
- **Graceful degradation:** Network errors fall back to mock, never crash
