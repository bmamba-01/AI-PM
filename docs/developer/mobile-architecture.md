# Mobile Architecture

The AI-PM mobile app is a React Native application using Expo, React Navigation, and Zustand.

## Structure

```
packages/mobile/
├── src/
│   ├── App.tsx              # Navigation container + stack navigator
│   ├── index.ts             # Package exports
│   ├── screens/
│   │   ├── DashboardScreen.tsx
│   │   ├── TasksScreen.tsx
│   │   ├── ApprovalsScreen.tsx      # List view with swipe actions
│   │   ├── ApprovalDetailScreen.tsx  # Full detail + action sheets
│   │   ├── ChatScreen.tsx
│   │   ├── ReportsScreen.tsx
│   │   └── SettingsScreen.tsx
│   └── state/
│       └── approval-store.ts  # Zustand store with fetch client + mock fallback
├── package.json
└── tsconfig.json
```

## Navigation

React Navigation with a native stack:

```typescript
type RootStackParamList = {
  Dashboard: undefined;
  Tasks: undefined;
  Approvals: undefined;
  ApprovalDetail: { approvalId: string };
  Chat: undefined;
  Reports: undefined;
  Settings: undefined;
};
```

## Data Layer

The approval store uses a dual-mode API client:

```
┌──────────────────────────┐
│  Zustand Store           │
│  (approval-store.ts)     │
├──────────────────────────┤
│  API Client Layer        │
│  - setBaseUrl(url)       │
│  - fetch-based requests  │
├──────────────────────────┤
│  ┌─────────┐ ┌─────────┐│
│  │ Local   │ │ Mock    ││
│  │ Server  │ │ Fallback││
│  │ (fetch) │ │ (memory)││
│  └─────────┘ └─────────┘│
└──────────────────────────┘
```

### Data Sources

- **`local_server`**: When `setApprovalBaseUrl()` is configured, data comes from the laptop-hosted local server via `fetch`.
- **`mock_fallback`**: Default mode. Uses in-memory seed data for development and offline use.

### Store Shape

```typescript
interface ApprovalState {
  items: ApprovalItem[];
  counts: Record<string, number>;
  isLoading: boolean;
  error: string | null;
  dataSource: 'local_server' | 'mock_fallback';

  loadItems: (filter?) => Promise<void>;
  loadCounts: () => Promise<void>;
  decide: (id, payload) => Promise<ApprovalItem>;
  refresh: () => Promise<void>;
}
```

### Type Safety

All types (`ApprovalItem`, `DecidePayload`, etc.) are defined locally in the store. No imports from `@ai-pm/core/runtime` in any renderer code.

## Key Features

- **Swipe actions**: Swipe right to approve, swipe left to reject (using `PanResponder`)
- **Pull to refresh**: `RefreshControl` on list views
- **Offline indicator**: Shows data source badge (green = local server, amber = mock)
- **Detail screens**: Full approval detail with collapsible sections, action sheets for reject/revise/delegate

## Build

```bash
pnpm --filter @ai-pm/mobile build      # tsc -b
pnpm --filter @ai-pm/mobile typecheck   # tsc --noEmit
pnpm --filter @ai-pm/mobile dev         # Expo dev server
```
