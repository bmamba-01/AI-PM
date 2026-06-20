# Desktop Architecture

The AI-PM desktop app is an Electron application using React, Zustand, and Vite.

## Structure

```
packages/desktop/
├── main.ts                  # Electron main process
├── preload.ts               # IPC bridge (contextBridge)
├── src/
│   ├── App.tsx              # Root component
│   ├── main.tsx             # React entry point
│   ├── global.d.ts          # Window.electronAPI type declarations
│   ├── state/
│   │   ├── index.ts         # Store barrel export
│   │   ├── project-store.ts # Project/view state (Zustand)
│   │   └── approval-store.ts # Approval queue state (Zustand + IPC)
│   ├── components/
│   │   ├── Layout.tsx       # App shell with sidebar + header
│   │   ├── Sidebar.tsx      # Navigation sidebar
│   │   ├── Header.tsx       # Top bar
│   │   ├── ProjectView.tsx  # View router
│   │   ├── Tabs.tsx         # Generic tab components
│   │   └── tabs/            # Individual tab views
│   │       ├── DashboardTab.tsx
│   │       ├── DailyBriefTab.tsx
│   │       ├── ApprovalsTab.tsx
│   │       ├── SprintTab.tsx
│   │       ├── RisksTab.tsx
│   │       ├── ReportsTab.tsx
│   │       ├── McpServersTab.tsx
│   │       ├── AgentsTab.tsx
│   │       └── SettingsTab.tsx
│   ├── ui/                  # Shared UI primitives
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   └── badge.tsx
│   └── lib/
│       └── utils.ts         # cn() helper
├── preload.ts               # IPC API definition
└── vite.config.ts
```

## IPC Architecture

The app enforces strict process isolation:

- **Main process** (`main.ts`): Has access to Node.js APIs, file system, and `@ai-pm/core/runtime`. Handles all IPC calls.
- **Preload** (`preload.ts`): Uses `contextBridge.exposeInMainWorld` to expose `window.electronAPI`.
- **Renderer** (`src/`): React code runs in a sandboxed browser context. No direct file system or Node.js access.

```
┌─────────────────────────────────┐
│  Main Process (main.ts)         │
│  - ApprovalQueue instance       │
│  - LocalProjectStore instance   │
│  - MCP config management        │
│  - Local server child process   │
│  └─ ipcMain.handle(...)         │
├─────────────────────────────────┤
│  Preload Bridge (preload.ts)    │
│  - contextBridge.exposeInWorld  │
│  - Maps invoke → API methods    │
├─────────────────────────────────┤
│  Renderer (React)               │
│  - window.electronAPI.*         │
│  - Zustand stores               │
│  - React components             │
└─────────────────────────────────┘
```

## IPC Channels

### Approvals

| Channel | Input | Returns |
|---|---|---|
| `approvals:list` | `{ status?, priority? }` | `ApprovalItem[]` |
| `approvals:count` | — | `Record<string, number>` |
| `approvals:get` | `id: string` | `ApprovalItem \| null` |
| `approvals:decide` | `id, payload` | `ApprovalItem` |
| `approvals:create` | `input` | `ApprovalItem` |
| `approvals:resubmit` | `id, summary_diff` | `ApprovalItem` |

### MCP

| Channel | Description |
|---|---|
| `get-mcp-config` | Load MCP server config |
| `toggle-server` | Enable/disable a server |
| `remove-server` | Remove a server |
| `add-server` | Add or update a server |

### Server

| Channel | Description |
|---|---|
| `server:getStatus` | Check if local server is running |
| `server:start` | Start the local server |
| `server:stop` | Stop the local server |

## State Management

Zustand stores with no external dependencies beyond the `electronAPI`:

- **`project-store.ts`**: Manages current project, active view, sidebar state
- **`approval-store.ts`**: Manages approval items, counts, loading/error state. All mutations go through IPC. No `@ai-pm/core/runtime` import in renderer.

## Styling

- Glassmorphism design with `glass-card` CSS class
- Apple-inspired color palette
- Tailwind CSS utility classes
- Shared UI primitives in `src/ui/` (Button, Card, Badge)

## Build

```bash
pnpm --filter @ai-pm/desktop build   # tsc -b && vite build
pnpm --filter @ai-pm/desktop dev     # Vite dev server (http://localhost:3000)
```
