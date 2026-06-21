# Coding Agent 4 — Server Health Dashboard Panel

> **Type:** 🖥️ CODING TASK
> **Priority:** Medium — gives PM visibility into full server state
> **Depends on:** Agent 4's desktop runtime lifecycle (completed)
> **Blocks:** Nothing

## Task

Extend the DashboardTab with a server health detail panel that shows memory stats, approval counts, and active connections — turning the existing badge into a full server overview.

## Files to modify

- `packages/desktop/src/components/tabs/DashboardTab.tsx` — expand ServerStatus section

## What to do

Replace the minimal ServerStatus badge with an expandable panel:

### Collapsed view (current)
```
🟢 Server: Running on :3847 | Healthy | Root: C:\...\AI-PM | v0.1.0
```

### Expanded view (new)
```
┌─ Server Overview ─────────────────────────────────────────┐
│ Status:     🟢 Running on http://127.0.0.1:3847           │
│ Health:     ✅ Healthy (v0.1.0)                           │
│ Project:    C:\Works\AI-PM                                │
│ Uptime:     Started 2m ago                                │
│                                                            │
│ ┌─ Memory ──────────────┐ ┌─ Approvals ──────────────────┐
│ │ Tasks:     12 (8 done)│ │ Pending:     5               │
│ │ Artifacts:  7 (2 arch)│ │ Revision:    2               │
│ └───────────────────────┘ │ Approved:    3               │
│                            │ Total:      10               │
│                            └──────────────────────────────┘
└────────────────────────────────────────────────────────────┘
```

### Implementation

1. Add IPC calls to fetch memory summary and approval counts
2. Store data in local component state
3. Auto-refresh every 30 seconds or on server status change
4. Handle errors gracefully (show "—" for unavailable data)
5. Use existing glass-card and badge components

## Key constraints

- Do NOT modify packages/core/ or packages/server/
- Use IPC calls (via `window.electronAPI`) — no direct Node imports
- Keep the panel collapsible (click to expand/collapse)
- `pnpm --filter @ai-pm/desktop build` must pass

## Context files to read

1. packages/desktop/src/components/tabs/DashboardTab.tsx
2. packages/desktop/preload.ts (available IPC methods)
3. packages/desktop/src/global.d.ts (type definitions)

## Verification

```bash
pnpm --filter @ai-pm/desktop build
rg -n "node:fs|node:path|@ai-pm/core/runtime" packages/desktop/src/components/tabs/DashboardTab.tsx
```
