# API Reference

Runtime functions exposed by `@ai-pm/core/runtime`.

## ApprovalQueue

File-backed approval queue managing external mutation approvals.

### Constructor

```typescript
new ApprovalQueue(projectRoot: string)
```

Creates a queue backed by `<projectRoot>/.ai-pm/approvals.json`.

### Methods

#### `createItem(input)`

```typescript
async createItem(input: {
  project_id: string;
  action_type: string;
  target_system: string;
  target_id: string;
  workflow_id: string;
  run_id: string;
  requested_by_agent: string;
  requested_by_role: string;
  title: string;
  description: string;
  summary_diff: string;
  confidence: number;          // 0–100
  source_refs: Array<{ type: string; id: string; title?: string; accessed_at?: string }>;
  priority: 'critical' | 'high' | 'medium' | 'low';
  deadline?: string | null;
  ttl_seconds?: number | null;
  assigned_approvers?: string[];
}): Promise<ApprovalItem>
```

Creates a new pending approval item. Validates required fields and confidence range. Returns the created item with generated UUID.

#### `getItem(id)`

```typescript
async getItem(id: string): Promise<ApprovalItem | null>
```

Returns the item matching the full UUID, or `null`.

#### `listItems(filter?)`

```typescript
async listItems(filter?: {
  status?: string;
  priority?: string;
}): Promise<ApprovalItem[]>
```

Returns items sorted by priority (critical > high > medium > low) then by `created_at` ascending. Optional filters narrow by status or priority.

#### `decide(id, payload)`

```typescript
async decide(id: string, payload: {
  decided_by: string;
  decision: 'approve' | 'reject' | 'revision_requested' | 'cancel';
  reason?: string;    // required for reject (min 10 chars)
  notes?: string;     // required for revision_requested (min 10 chars)
}): Promise<ApprovalItem>
```

Transitions the item through the state machine. Throws if the transition is invalid or required fields are missing.

#### `resubmit(id, summary_diff)`

```typescript
async resubmit(id: string, summary_diff: string): Promise<ApprovalItem>
```

Resubmits a `revision_requested` item back to `pending`. Increments `revision_round`. Throws if not in `revision_requested` status or if revision limit (3 rounds) is reached.

#### `getCounts()`

```typescript
async getCounts(): Promise<Record<string, number>>
```

Returns a map of status → count.

### Types

```typescript
type ApprovalStatus =
  | 'draft' | 'pending' | 'revision_requested' | 'approved' | 'rejected'
  | 'cancelled' | 'expired' | 'executing' | 'executed' | 'execution_failed';

type ApprovalDecision = 'approve' | 'reject' | 'revision_requested' | 'cancel';

interface ApprovalItem { /* see runtime contract */ }
interface ApprovalAuditEntry { /* see runtime contract */ }
interface DecidePayload { decided_by: string; decision: ApprovalDecision; reason?: string; notes?: string }
```

---

## LocalProjectStore

File-backed project store for audit records and daily briefing items.

### Constructor

```typescript
new LocalProjectStore(projectRoot: string)
```

### Methods

#### `ensureProjectDirs()`

```typescript
async ensureProjectDirs(): Promise<void>
```

Creates `.ai-pm/audit/` directory if missing.

#### `loadDailyBriefingItems()`

```typescript
async loadDailyBriefingItems(): Promise<DailyBriefingInputItem[]>
```

Reads `.ai-pm/daily-items.json`. Returns `[]` if file doesn't exist.

#### `appendWorkflowAudit(input)`

```typescript
async appendWorkflowAudit(input: WorkflowAuditInput): Promise<string>
```

Appends a JSONL record to `.ai-pm/audit/workflow-runs.jsonl`. Returns the audit file path.

#### `loadWorkflowAuditRecords()`

```typescript
async loadWorkflowAuditRecords(): Promise<WorkflowAuditRecord[]>
```

Reads and parses all JSONL audit records. Skips malformed lines with warnings.

### Types

```typescript
type WorkflowAuditStatus = 'completed' | 'blocked' | 'failed';

interface WorkflowAuditInput {
  workflowId: string;
  projectId: string;
  status: WorkflowAuditStatus;
  startedAt: string;
  completedAt: string;
  outputSummary: string;
  sourceCoverage: string[];
  assumptions: string[];
}
```

---

## scanProject()

```typescript
async scanProject(projectRoot: string): Promise<ScanResult>
```

Scans a project directory for required files and returns a readiness score.

### Checks

| ID | Path | Required |
|---|---|---|
| `agents-md` | `AGENTS.md` | yes |
| `readme-md` | `README.md` | yes |
| `design-spec` | `docs/superpowers/specs` | yes |
| `active-plan` | `docs/superpowers/plans` | yes |
| `workflows-dir` | `workflows` | yes |
| `playbooks-dir` | `playbooks` | yes |
| `mcp-registry` | `mcp/registry.yaml` | yes |
| `templates-dir` | `templates` | no |
| `schemas-dir` | `schemas` | no |
| `operating-model` | `docs/operating-model` | no |
| `claude-md` | `CLAUDE.md` | no |
| `codex-md` | `CODEX.md` | no |

### Returns

```typescript
interface ScanResult {
  projectRoot: string;
  score: number;            // 0–100 (required checks only)
  totalRequired: number;
  passedRequired: number;
  totalOptional: number;
  passedOptional: number;
  checks: ScanCheck[];
  ready: boolean;           // true when all required checks pass
}
```

---

## MemoryStore

File-backed task and artifact lifecycle store.

### Constructor

```typescript
new MemoryStore(projectRoot: string)
```

Backed by `<projectRoot>/.ai-pm/memory/state.json`.

### Task Methods

| Method | Signature | Description |
|---|---|---|
| `createTask` | `(input: Omit<MemoryTask, 'task_id' \| 'created_at' \| 'updated_at'>) => Promise<MemoryTask>` | Create a task |
| `updateTask` | `(taskId: string, updates: Partial<MemoryTask>) => Promise<MemoryTask>` | Update fields (immutable: task_id, created_at) |
| `completeTask` | `(taskId: string) => Promise<MemoryTask>` | Set status=completed, set completed_at |
| `getTask` | `(taskId: string) => Promise<MemoryTask \| null>` | Get by ID |
| `listTasks` | `(filter?: { status?: TaskStatus }) => Promise<MemoryTask[]>` | List with optional filter |

### Artifact Methods

| Method | Signature | Description |
|---|---|---|
| `createArtifact` | `(input: Omit<MemoryArtifact, 'artifact_id' \| 'created_at' \| 'updated_at' \| 'version'>) => Promise<MemoryArtifact>` | Create, auto-link to task if task_id set |
| `updateArtifact` | `(artifactId: string, updates: Partial<MemoryArtifact>) => Promise<MemoryArtifact>` | Update, auto-increments version |
| `archiveArtifact` | `(artifactId: string, reason: string) => Promise<MemoryArtifact>` | Set status=archived with reason |
| `getArtifact` | `(artifactId: string) => Promise<MemoryArtifact \| null>` | Get by ID |
| `listArtifacts` | `(filter?: { status?: ArtifactStatus; type?: string }) => Promise<MemoryArtifact[]>` | List with optional filters |
| `getTaskArtifacts` | `(taskId: string) => Promise<MemoryArtifact[]>` | Get artifacts linked to a task |

### Lifecycle Methods

| Method | Signature | Description |
|---|---|---|
| `autoArchiveCompleted` | `(maxAgeDays?: number) => Promise<MemoryArtifact[]>` | Archive active artifacts of tasks completed > N days ago (default 7) |
| `getStaleArtifacts` | `(maxAgeDays?: number) => Promise<MemoryArtifact[]>` | Find active artifacts not updated in N days (default 30) |
| `getSummary` | `() => Promise<MemorySummary>` | Aggregate counts |
| `getState` | `() => Promise<MemoryState>` | Raw state access |

### Types

```typescript
type ArtifactStatus = 'draft' | 'active' | 'archived' | 'deleted';
type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'failed' | 'cancelled';

interface MemoryTask {
  task_id: string; project_id: string; name: string; description: string;
  status: TaskStatus; assigned_to: string;
  created_at: string; updated_at: string; completed_at: string | null;
  dependencies: string[]; artifacts: string[]; tags: string[];
}

interface MemoryArtifact {
  artifact_id: string; project_id: string; name: string; path: string;
  type: string; status: ArtifactStatus;
  created_at: string; updated_at: string; archived_at: string | null;
  archive_reason: string | null; task_id: string | null; version: number;
}
```
