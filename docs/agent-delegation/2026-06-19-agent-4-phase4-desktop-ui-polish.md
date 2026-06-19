# Coding Agent 4 — Phase 4: Desktop Approval UI Polish

> **Type:** 🖥️ CODING TASK
> **Priority:** Medium — UX quality for approval panel
> **Depends on:** Desktop IPC bridge (completed), approval-store.ts (completed)
> **Blocks:** Nothing — standalone polish

## Task

Polish the desktop approval panel with empty states, loading indicators, error handling, and action confirmation flows.

## Files to modify

- `packages/desktop/src/components/tabs/ApprovalsTab.tsx` — add empty/loading/error states, wire approve/reject/revision actions
- `packages/desktop/src/components/tabs/DailyBriefTab.tsx` — link "Pending Approvals" card to approval view

## What to do

### 1. Empty state for ApprovalsTab

When `items.length === 0` and `isLoading === false`, show:
```
✓ No pending approvals
All caught up! New approval requests will appear here.
```

### 2. Loading state

When `isLoading === true`, show skeleton/spinner in the list panel.

### 3. Error state

When store has error, show:
```
⚠ Unable to load approvals
[error message]
[Retry button]
```

### 4. Action confirmation

When user clicks Approve/Reject/Revise in the detail panel:
- Show confirmation modal/alert before executing
- Show success toast after action
- Refresh the list after action completes

### 5. Daily Brief link

In `DailyBriefTab.tsx`, the "Pending Approvals" card should navigate to the approvals view when clicked (not just show a ghost button).

## Key constraints

- Do NOT modify packages/core/ or packages/mcp/ or packages/mobile/
- Use existing glass-card style patterns
- Use existing Badge/Button components from UI library
- `pnpm --filter @ai-pm/desktop build` must pass

## Context files to read

1. packages/desktop/src/components/tabs/ApprovalsTab.tsx
2. packages/desktop/src/components/tabs/DailyBriefTab.tsx
3. packages/desktop/src/state/approval-store.ts (for store shape)
4. packages/desktop/src/components/ui/ (existing UI components)

## Verification

```bash
pnpm --filter @ai-pm/desktop build
```
