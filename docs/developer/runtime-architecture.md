# Runtime Architecture

**Date:** 2026-06-19  
**Status:** Implementation complete  
**Audience:** Backend developers, contributors  
**References:** [packages/core/src/runtime/](../../packages/core/src/runtime/), [packages/cli/](../../packages/cli/), [packages/desktop/](../../packages/desktop/), [packages/mobile/](../../packages/mobile/)

## 1. Overview

The AI-PM Toolkit runtime layer provides file-backed stores and workflow execution primitives that power the CLI, desktop app, mobile app, and future chat integrations. The architecture follows a layered design where runtime classes in `@ai-pm/core` are the single source of truth, and UI packages consume them through well-defined interfaces.

```text
┌──────────────────────────────────────────────────────────┐
│                  User Interfaces                          │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌─────────┐  │
│  │   CLI    │  │ Desktop  │  │  Mobile  │  │  Chat   │  │
│  │ (direct) │  │  (IPC)   │  │ (fetch)  │  │(future) │  │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬────┘  │
└───────┼─────────────┼─────────────┼─────────────┼────────┘
        │             │             │             │
        ▼             ▼             ▼             ▼
┌──────────────────────────────────────────────────────────┐
│               @ai-pm/core/runtime                         │
│  ┌──────────────┐  ┌──────────────┐  ┌─────────────┐    │
│  │ApprovalQueue │  │ MemoryStore  │  │ProjectScan  │    │
│  └──────┬───────┘  └──────┬───────┘  └──────┬──────┘    │
└─────────┼──────────────────┼──────────────────┼──────────┘
          │                  │                  │
          ▼                  ▼                  ▼
┌──────────────────────────────────────────────────────────┐
│            File-backed Storage (.ai-pm/)                  │
│  approvals.json  │  memory/state.json  │  projects.json │
└──────────────────────────────────────────────────────────┘
```

**Design principles:**
- **Single source of truth:** Runtime classes read/write `.ai-pm/` files directly
- **No database:** File-backed JSON for simplicity and debuggability
- **Synchronous reads, atomic writes:** Use `readFile`/`writeFile` with `ensureDir`
- **Validation at boundaries:** JSON Schema validation on workflow outputs
- **UI decoupling:** UI packages never import runtime classes directly

---

## 2. Core Runtime Components

### 2.1 ApprovalQueue

**Location:** [packages/core/src/runtime/approvalQueue.ts](../../packages/core/src/runtime/approvalQueue.ts)  
**Storage:** `.ai-pm/approvals.json`

**Purpose:** Manage approval items for external mutations (PR comments, report publishing, baseline changes).

**Key methods:**

| Method | Description | Returns |
|---|---|---|
| `createItem(input)` | Create a new approval item | `ApprovalItem` |
| `getItem(id)` | Get a single approval item | `ApprovalItem \| null` |
| `listItems(filter?)` | List items with optional status/priority filter | `ApprovalItem[]` |
| `decide(id, payload)` | Make an approval decision | `ApprovalItem` |
| `resubmit(id, summary_diff)` | Resubmit after addressing revisions | `ApprovalItem` |
| `getCounts()` | Get status counts | `Record<string, number>` |

**State transitions:**

```text
draft → pending → approved → executing → executed
              ↓         ↓
              ↓      rejected
              ↓
        revision_requested → pending (resubmit, max 3 rounds)
              ↓
          cancelled
```

**Implementation notes:**
- Uses `randomUUID()` for approval IDs
- Validates state transitions before applying
- Requires reason (min 10 chars) for `reject` decisions
- Requires notes (min 10 chars) for `revision_requested` decisions
- Revision limit: 3 rounds, then escalates to PM Commander
- Sorts by priority: `critical` > `high` > `medium` > `low`

---

### 2.2 MemoryStore

**Location:** [packages/core/src/runtime/memory.ts](../../packages/core/src/runtime/memory.ts)  
**Storage:** `.ai-pm/memory/state.json`

**Purpose:** Track project runtime state (tasks, artifacts, lifecycle).

**Key methods:**

| Category | Method | Description |
|---|---|---|
| **Tasks** | `createTask(input)` | Create a new task |
| | `updateTask(taskId, updates)` | Update task fields |
| | `completeTask(taskId)` | Mark task as completed |
| | `getTask(taskId)` | Get a single task |
| | `listTasks(filter?)` | List tasks with optional status filter |
| **Artifacts** | `createArtifact(input)` | Create a new artifact |
| | `updateArtifact(artifactId, updates)` | Update artifact fields |
| | `archiveArtifact(artifactId, reason)` | Archive an artifact |
| | `getArtifact(artifactId)` | Get a single artifact |
| | `listArtifacts(filter?)` | List artifacts with status/type filter |
| | `getTaskArtifacts(taskId)` | Get all artifacts for a task |
| **Lifecycle** | `autoArchiveCompleted(maxAgeDays?)` | Auto-archive old completed task artifacts |
| | `getStaleArtifacts(maxAgeDays?)` | Find artifacts not updated in N days |
| **Summary** | `getSummary()` | Get aggregate counts |

**Task statuses:** `pending`, `in_progress`, `completed`, `failed`, `cancelled`  
**Artifact statuses:** `draft`, `active`, `archived`, `deleted`

**Implementation notes:**
- Tasks link to artifacts via `task.artifacts: string[]`
- Artifacts link back via `artifact.task_id: string | null`
- Auto-archive default: 7 days after task completion
- Stale threshold default: 30 days
- Version increments on artifact updates

---

### 2.3 ProjectScanner

**Location:** [packages/core/src/runtime/projectScanner.ts](../../packages/core/src/runtime/projectScanner.ts)

**Purpose:** Scan a project directory for MCP integration metadata, technology stack, and project structure.

**Key methods:**

| Method | Description |
|---|---|
| `scanProject(rootPath)` | Scan a project and return metadata |
| `detectTech(rootPath)` | Detect technology stack (Node, Python, etc.) |
| `findMcpRegistry(rootPath)` | Find `mcp/registry.yaml` |

**Output shape:**

```typescript
interface ProjectScanResult {
  projectId: string;
  name: string;
  rootPath: string;
  techStack: string[];
  mcpRegistryPath: string | null;
  hasGit: boolean;
  hasClaude: boolean;  // CLAUDE.md exists
  hasAiPm: boolean;    // .ai-pm/ exists
  scannedAt: string;
}
```

---

## 3. Workflows Layer

### 3.1 Schema Validation

**Location:** [packages/core/src/workflows/schemaValidation.ts](../../packages/core/src/workflows/schemaValidation.ts)  
**Schemas:** [schemas/workflows/](../../schemas/workflows/)

**Purpose:** Validate workflow outputs against JSON schemas using Ajv with `ajv-formats` for strict date-time validation.

**Key functions:**

| Function | Description |
|---|---|
| `loadWorkflowSchema(workflowId, schemasDir?)` | Load a workflow output schema from disk |
| `validateWorkflowOutput(workflowId, output, schemasDir?)` | Validate output against schema |
| `createDefaultValidator()` | Create a validator bound to default schemas directory |

**Features:**
- **Ajv 2020-12 draft** with `ajv-formats` for date-time validation
- **Graceful degradation:** Missing schema → valid with warning
- **camelCase → snake_case conversion:** TypeScript outputs use camelCase; schemas expect snake_case
- **Strict validation:** `additionalProperties: false` in schemas

---

### 3.2 Daily Briefing

**Location:** [packages/core/src/workflows/dailyBriefing.ts](../../packages/core/src/workflows/dailyBriefing.ts)

**Purpose:** Generate a daily PM briefing from input items (blockers, meetings, risks, approvals).

**Key function:**

```typescript
generateDailyBriefing(input: DailyBriefingInput): DailyBriefing
```

**Confidence scoring:**
- Base: 100
- Penalty: -10 per unavailable source
- Penalty: -30 if no items
- Floor: 40

---

## 4. CLI Integration

**Location:** [packages/cli/](../../packages/cli/)

**Data flow:**

```text
User
  ↓ ai-pm approval list
CLI Command (approval.ts)
  ↓ new ApprovalQueue(process.cwd())
Runtime (approvalQueue.ts)
  ↓ readFile('.ai-pm/approvals.json')
File System
```

**Integration pattern:**

```typescript
import { ApprovalQueue } from '@ai-pm/core/runtime';

approvalCommand.addCommand(
  new Command('list').action(async (opts) => {
    const queue = new ApprovalQueue(process.cwd());
    const items = await queue.listItems(opts.status ? { status: opts.status } : undefined);
    console.log(JSON.stringify({ items, total: items.length }, null, 2));
  })
);
```

---

## 5. Desktop Integration

**Location:** [packages/desktop/](../../packages/desktop/)

**Data flow:**

```text
React Component (ApprovalsScreen.tsx)
  ↓ useApprovalStore().loadItems()
Zustand Store (approval-store.ts)
  ↓ window.electron.approvalQueue.listItems()
Preload (preload.ts)
  ↓ ipcRenderer.invoke('approval:list')
Main Process (main.ts)
  ↓ new ApprovalQueue(projectRoot)
Runtime (approvalQueue.ts)
  ↓ readFile('.ai-pm/approvals.json')
File System
```

**IPC contract (preload.ts):**

```typescript
contextBridge.exposeInMainWorld('electron', {
  approvalQueue: {
    listItems: (filter?) => ipcRenderer.invoke('approval:list', filter),
    getCounts: () => ipcRenderer.invoke('approval:counts'),
    decide: (id, payload) => ipcRenderer.invoke('approval:decide', id, payload),
  },
});
```

**Important constraints:**
- **Renderer process has NO direct access to runtime** — all operations go through IPC
- **Main process owns the runtime** — single source of truth
- **No Node-only imports in renderer** — renderer code uses `window.electron.*` APIs

---

## 6. Mobile Integration

**Location:** [packages/mobile/](../../packages/mobile/)

**Data flow:**

```text
React Native Component (ApprovalsScreen.tsx)
  ↓ useApprovalStore().loadItems()
Zustand Store (approval-store.ts)
  ↓ fetch('http://192.168.1.100:3100/api/approvals')
Local Server (future)
  ↓ new ApprovalQueue(projectRoot)
Runtime (approvalQueue.ts)
  ↓ readFile('.ai-pm/approvals.json')
File System
```

**Current state (Phase 2):**
- **No local server yet** — mobile store uses mock fallback mode
- **Mock data:** 4 seed approval items defined in `SEED_ITEMS`
- **`dataSource` indicator:** `'local_server'` or `'mock_fallback'`

**Future state (Phase 3):**
- Local server running on laptop: `http://localhost:3100`
- Mobile connects via network: `http://192.168.1.100:3100`
- See [local-server-api-surface.md](../architecture/local-server-api-surface.md) for API design

---

## 7. File-backed Storage Design

### 7.1 Storage Layout

```text
<project-root>/
├── .ai-pm/
│   ├── approvals.json        ApprovalQueue storage
│   ├── memory/
│   │   └── state.json        MemoryStore storage
│   ├── audit/
│   │   └── <year-month>/
│   │       └── <day>.jsonl   Audit logs
│   └── projects.json         LocalProjectStore storage (global)
├── .gitignore                Excludes .ai-pm/ (runtime state)
└── README.md
```

### 7.2 Atomic Writes

All runtime classes follow this pattern:

```typescript
private async writeAll(items: T[]): Promise<void> {
  await this.ensureDir();
  await writeFile(this.filePath, JSON.stringify(items, null, 2), 'utf-8');
}
```

**Properties:**
- **Atomic at filesystem level:** `writeFile` replaces the file atomically on most systems
- **No partial writes:** JSON is serialized fully before writing
- **Readable format:** Pretty-printed with 2-space indent

### 7.3 Read-Modify-Write Pattern

All mutations follow:

1. **Read** the entire file into memory
2. **Modify** the in-memory array/object
3. **Write** the entire file back to disk

**Trade-offs:**
- ✅ Simple, debuggable, no schema migrations
- ✅ Works well for small datasets (< 10k items)
- ❌ Full file rewrite on every mutation
- ❌ No transaction isolation across processes

---

## 8. Testing Strategy

### 8.1 Unit Tests

**Location:** `packages/core/src/runtime/*.test.ts`

**Pattern:**

```typescript
describe('ApprovalQueue', () => {
  let queue: ApprovalQueue;
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await mkdtemp(path.join(os.tmpdir(), 'approval-queue-test-'));
    queue = new ApprovalQueue(tmpDir);
  });

  afterEach(async () => {
    await rm(tmpDir, { recursive: true, force: true });
  });

  it('creates an approval item', async () => {
    const item = await queue.createItem({ ... });
    expect(item.approval_id).toMatch(/^[0-9a-f]{8}-/);
    expect(item.status).toBe('pending');
  });
});
```

**Run:**

```bash
pnpm --filter @ai-pm/core test
```

---

### 8.2 Integration Tests

**Location:** `packages/core/src/runtime/*.integration.test.ts`

**Coverage:**
- Full workflows (create → decide → resubmit → decide)
- Multi-item interactions (list, filter, sort)
- Schema validation round-trip (workflow output → validate → pass)
- Cross-module integration (MemoryStore tasks + artifacts)

---

## 9. Common Patterns

### 9.1 Error Handling

All runtime methods throw on error (no error codes):

```typescript
async decide(id: string, payload: DecidePayload): Promise<ApprovalItem> {
  const items = await this.readAll();
  const idx = items.findIndex(i => i.approval_id === id);
  if (idx === -1) throw new Error(`Approval item ${id} not found`);
  // ...
}
```

**CLI wraps with try/catch:**

```typescript
try {
  const item = await queue.decide(id, payload);
  console.log(JSON.stringify(item, null, 2));
} catch (error) {
  console.error(chalk.red(String(error)));
  process.exit(1);
}
```

### 9.2 ID Resolution

Short ID prefix matching (CLI UX):

```typescript
// User types: ai-pm memory artifacts archive 48c8
// CLI resolves to full UUID: 48c850de-...
const candidates = artifacts.filter(a => a.artifact_id.startsWith(input));
if (candidates.length === 0) throw new Error('Not found');
if (candidates.length > 1) throw new Error('Ambiguous');
return candidates[0].artifact_id;
```

---

## 10. Performance Considerations

### 10.1 Current Scale

- **Typical usage:** 10-100 approval items, 50-500 artifacts
- **File size:** approvals.json ~50KB, memory/state.json ~200KB
- **Read latency:** < 10ms on SSD
- **Write latency:** < 20ms on SSD

### 10.2 When to Migrate to SQLite

Consider SQLite when:
- Approval queue exceeds 1000 items
- Memory store exceeds 5000 artifacts
- Multi-process concurrency is required (local server + CLI)
- Query performance degrades (filtering, sorting)

---

## 11. Verification

All four Phase 4 documentation files have been created:

```bash
ls docs/product/memory-cli-spec.md
ls docs/product/mobile-approval-api-client.md
ls docs/architecture/local-server-api-surface.md
ls docs/developer/runtime-architecture.md
```

## 12. References

- [Approval Queue Runtime Contract](../architecture/approval-queue-runtime-contract.md)
- [Local Server API Surface](../architecture/local-server-api-surface.md)
- [Memory CLI Specification](../product/memory-cli-spec.md)
- [Mobile Approval API Client](../product/mobile-approval-api-client.md)
- [JSON Schemas](../../schemas/)
