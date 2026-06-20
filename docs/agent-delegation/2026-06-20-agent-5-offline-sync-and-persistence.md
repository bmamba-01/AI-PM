# Coding Agent 5 — Mobile Offline Queue + Sync

> **Type:** 🖥️ CODING TASK
> **Priority:** High — offline-first is a core product principle
> **Depends on:** Agent 5's mobile config UX (completed)
> **Blocks:** Nothing — standalone mobile work

## Task

Implement offline approval action queuing on mobile: when the user takes approve/reject/revision actions while offline, queue them locally and sync when the server becomes available again.

## Files to modify

- `packages/mobile/src/state/approval-store.ts` — add offline queue logic
- `packages/mobile/src/screens/ApprovalsScreen.tsx` — add sync indicator

## What to do

### 1. Offline Action Queue in approval-store.ts

```typescript
interface QueuedAction {
  id: string;
  type: 'decide' | 'create' | 'resubmit';
  payload: DecidePayload | CreateApprovalPayload | { summary_diff: string };
  timestamp: string;
  status: 'pending' | 'synced' | 'failed';
  error?: string;
}
```

When server is unreachable and user takes action:
1. Save the action to SecureStore as queued action
2. Update local mock state optimistically
3. Show "Queued — will sync when online" indicator

When server comes back online:
1. Process queued actions in order
2. Update status to synced or failed
3. Refresh the list from server
4. Show sync results

### 2. Sync on reconnect

```typescript
async function syncQueuedActions(): Promise<{ synced: number; failed: number }> {
  const queued = await loadQueuedActions();
  let synced = 0, failed = 0;
  for (const action of queued) {
    try {
      await processAction(action);
      action.status = 'synced';
      synced++;
    } catch (err) {
      action.status = 'failed';
      action.error = err instanceof Error ? err.message : String(err);
      failed++;
    }
  }
  await saveQueuedActions(queued.filter(a => a.status === 'pending'));
  return { synced, failed };
}
```

### 3. Sync indicator in ApprovalsScreen

When there are pending queued actions, show a banner:
```
⟳ 2 actions queued — will sync when online
```
When sync completes, show toast:
```
✓ Synced 2 actions successfully
```

### 4. Network status listener

Use `@react-native-community/netinfo` or simple polling to detect when server comes back online, then auto-sync.

## Key constraints

- Do NOT modify packages/core/ or packages/desktop/
- Persist queued actions in `expo-secure-store`
- Maximum queue size: 50 actions (discard oldest with warning)
- Queue TTL: 24 hours (discard after 24h without sync)
- `pnpm --filter @ai-pm/mobile build` must pass

## Context files to read

1. packages/mobile/src/state/approval-store.ts
2. packages/mobile/src/screens/ApprovalsScreen.tsx
3. docs/product/mobile-approval-api-client.md

## Verification

```bash
pnpm --filter @ai-pm/mobile build
rg -n "QueuedAction\|queuedActions\|syncQueued" packages/mobile/src/state/approval-store.ts
```
