# Coding Agent 5 — Runtime Memory System

> **Type:** 🖥️ CODING TASK  
> **Priority:** High — core feature cho AI-PM product  
> **Depends on:** Task 4 approval queue (completed), Task 3 project scan (completed)  
> **Blocks:** Future workflow automation

## Problem

AI-PM toolkit chưa có memory system để:
- Lưu trạng thái task completion
- Theo dõi artifact lifecycle (draft → active → archived)
- Tự động archive khi hoàn thành workflow
- Query lịch sử project

## Task

### Part 1: Design memory data model

Create `packages/core/src/runtime/memory.ts`:

```typescript
// Core types
export type ArtifactStatus = 'draft' | 'active' | 'archived' | 'deleted';
export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'failed' | 'cancelled';

export interface MemoryTask {
  task_id: string;
  project_id: string;
  name: string;
  description: string;
  status: TaskStatus;
  assigned_to: string;           // agent or user
  created_at: string;            // ISO-8601
  updated_at: string;
  completed_at: string | null;
  dependencies: string[];        // other task_ids
  artifacts: string[];           // artifact_ids
  tags: string[];
}

export interface MemoryArtifact {
  artifact_id: string;
  project_id: string;
  name: string;
  path: string;                  // relative to project root
  type: string;                  // 'doc' | 'code' | 'schema' | 'template' | 'plan' | 'delegation'
  status: ArtifactStatus;
  created_at: string;
  updated_at: string;
  archived_at: string | null;
  archive_reason: string | null;
  task_id: string | null;        // originating task
  version: number;               // incremented on updates
}

export interface MemoryState {
  version: number;
  project_id: string;
  tasks: MemoryTask[];
  artifacts: MemoryArtifact[];
  updated_at: string;
}
```

### Part 2: Implement MemoryStore class

```typescript
export class MemoryStore {
  private filePath: string;

  constructor(projectRoot: string) {
    this.filePath = path.join(projectRoot, '.ai-pm', 'memory', 'state.json');
  }

  // CRUD operations
  async getState(): Promise<MemoryState>;
  async createTask(input: Omit<MemoryTask, 'task_id' | 'created_at' | 'updated_at'>): Promise<MemoryTask>;
  async updateTask(taskId: string, updates: Partial<MemoryTask>): Promise<MemoryTask>;
  async completeTask(taskId: string): Promise<MemoryTask>;
  
  async createArtifact(input: Omit<MemoryArtifact, 'artifact_id' | 'created_at' | 'updated_at' | 'version'>): Promise<MemoryArtifact>;
  async updateArtifact(artifactId: string, updates: Partial<MemoryArtifact>): Promise<MemoryArtifact>;
  async archiveArtifact(artifactId: string, reason: string): Promise<MemoryArtifact>;
  
  // Queries
  async listTasks(filter?: { status?: TaskStatus }): Promise<MemoryTask[]>;
  async listArtifacts(filter?: { status?: ArtifactStatus; type?: string }): Promise<MemoryArtifact[]>;
  async getTaskArtifacts(taskId: string): Promise<MemoryArtifact[]>;
  
  // Lifecycle
  async autoArchiveCompleted(): Promise<MemoryArtifact[]>;  // archive artifacts of completed tasks older than N days
  async getStaleArtifacts(maxAgeDays?: number): Promise<MemoryArtifact[]>;  // find artifacts not updated in N days
  
  // Summary
  async getSummary(): Promise<{
    totalTasks: number;
    completedTasks: number;
    totalArtifacts: number;
    archivedArtifacts: number;
    staleArtifacts: number;
  }>;
}
```

### Part 3: Create tests

Create `packages/core/src/runtime/memory.test.ts`:

Test cases:
1. Create and retrieve task
2. Complete task → status changes, completed_at set
3. Create artifact linked to task
4. Archive artifact → status changes, archived_at set
5. Auto-archive: completed tasks older than 7 days get artifacts archived
6. Stale detection: artifacts not updated in 30 days flagged
7. Summary counts correct
8. Missing file returns empty state (not error)
9. Concurrent operations don't corrupt state

### Part 4: Export from runtime/index.ts

```typescript
export * from './memory.js';
```

## Key constraints

- File-backed store: `.ai-pm/memory/state.json`
- Same pattern as ApprovalQueue and LocalProjectStore
- No external dependencies
- Tests use temp directories
- `pnpm --filter @ai-pm/core build` and `pnpm --filter @ai-pm/core test` must pass

## Context files to read

1. packages/core/src/runtime/approvalQueue.ts (pattern reference)
2. packages/core/src/runtime/localProjectStore.ts (pattern reference)
3. packages/core/src/runtime/approvalQueue.test.ts (test pattern)
4. .ai-pm/memory/ (will be created by housekeeping agent — read structure if exists)

## Verification

```bash
pnpm --filter @ai-pm/core test -- src/runtime/memory.test.ts
pnpm --filter @ai-pm/core build
pnpm --filter @ai-pm/core test  # all tests
```
