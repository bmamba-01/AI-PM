# Coding Agent 3 — Wire Approval UI to Runtime

> **Type:** 🖥️ CODING TASK
> **Depends on:** Task 4 approval queue runtime + CLI commands (both completed)
> **Blocks:** Nothing — final wiring step

## Task

Replace mock data in desktop and mobile approval panels with real calls to the `ApprovalQueue` store.

## Files to modify

- `packages/desktop/src/components/tabs/ApprovalsTab.tsx` — replace mockApprovals with store calls
- `packages/mobile/src/screens/ApprovalsScreen.tsx` — replace mock data with store calls
- `packages/mobile/src/screens/ApprovalDetailScreen.tsx` — wire approve/reject/revision/delegate actions

## What to do

### Desktop (ApprovalsTab.tsx)
1. Import `ApprovalQueue` from `@ai-pm/core/runtime`
2. Replace hardcoded `mockApprovals` array with `queue.listItems()` call
3. Wire filter tabs to `queue.listItems({ status })` 
4. Wire approve/reject buttons to `queue.decide()`
5. Keep "Sample Data" banner removed since data is now real

### Mobile (ApprovalsScreen.tsx)
1. Import `ApprovalQueue` from `@ai-pm/core/runtime`
2. Replace hardcoded `mockApprovals` with `queue.listItems()` in useEffect
3. Wire swipe approve/reject to `queue.decide()`
4. Keep filter chips working with real data

### Mobile (ApprovalDetailScreen.tsx)
1. Load item via `queue.getItem(approvalId)` 
2. Wire Approve button → `queue.decide(id, { decided_by: 'user', decision: 'approve' })`
3. Wire Reject button → `queue.decide(id, { decided_by: 'user', decision: 'reject', reason })`
4. Wire Revision button → `queue.decide(id, { decided_by: 'user', decision: 'revision_requested', notes })`
5. Wire Delegate → `queue.decide(id, { decided_by: 'user', decision: 'cancel' })` + note

## Key constraints

- Do NOT modify packages/core/ or packages/mcp/
- Desktop: use project root from props for ApprovalQueue constructor
- Mobile: use a fixed project root or configurable path
- After actions, refresh the list
- Handle errors gracefully (show Alert on mobile, console.warn on desktop)
- `pnpm --filter @ai-pm/desktop build` and `pnpm --filter @ai-pm/cli build` must pass

## Context files to read

1. packages/core/src/runtime/approvalQueue.ts
2. packages/desktop/src/components/tabs/ApprovalsTab.tsx
3. packages/mobile/src/screens/ApprovalsScreen.tsx
4. packages/mobile/src/screens/ApprovalDetailScreen.tsx

## Verification

```bash
pnpm --filter @ai-pm/core build
pnpm --filter @ai-pm/desktop build 2>&1 | tail -5
pnpm --filter @ai-pm/cli build
```
