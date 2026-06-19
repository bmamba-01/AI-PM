# Coding Agent 3 — Phase 5: Local Server Integration into Desktop

> **Type:** 🖥️ CODING TASK
> **Priority:** High — mobile can't use local server until desktop hosts it
> **Depends on:** packages/server/ (completed), packages/desktop/main.ts IPC bridge (completed)
> **Blocks:** Mobile real-server mode

## Task

Start the local HTTP server automatically when the desktop Electron app launches, so mobile devices on the same network can connect to it.

## Files to modify

- `packages/desktop/main.ts` — spawn server process on app ready
- `packages/desktop/package.json` — add `@ai-pm/server` dependency
- `packages/desktop/src/components/tabs/DashboardTab.tsx` — add server status indicator

## What to do

### 1. Start server in Electron main process

In `packages/desktop/main.ts`, after app is ready:

```typescript
import { startServer } from '@ai-pm/server';

// Start local server for mobile/chat access
const server = startServer({
  port: 3847,
  projectRoot: app.getPath('userData'), // or project path
});

app.on('will-quit', () => {
  server.close();
});
```

OR if `startServer` is not exported, use child_process to spawn `node packages/server/dist/index.js` as a background process.

### 2. Expose server status to renderer

Add to preload.ts / global.d.ts:
```typescript
interface ElectronAPI {
  // ... existing
  server: {
    getStatus: () => Promise<{ running: boolean; port: number; url: string }>;
    start: () => Promise<void>;
    stop: () => Promise<void>;
  };
}
```

### 3. Add server status indicator to Dashboard

In DashboardTab.tsx, add a small status badge showing:
- "Local Server: Running on :3847" (green)
- "Local Server: Stopped" (gray, with start button)

This tells the PM that mobile devices can connect.

## Key constraints

- Do NOT modify packages/core/ or packages/server/ directly
- Server must start on a random available port if 3847 is taken
- Server must gracefully shut down when app quits
- Do NOT block app startup on server start
- `pnpm --filter @ai-pm/desktop build` must pass

## Context files to read

1. packages/desktop/main.ts
2. packages/desktop/preload.ts
3. packages/server/src/index.ts
4. packages/desktop/src/components/tabs/DashboardTab.tsx

## Verification

```bash
pnpm --filter @ai-pm/desktop build
pnpm build
```
