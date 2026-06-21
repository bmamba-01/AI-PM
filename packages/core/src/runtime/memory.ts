import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';

export type ArtifactStatus = 'draft' | 'active' | 'archived' | 'deleted';
export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'failed' | 'cancelled';

export interface MemoryTask {
  task_id: string;
  project_id: string;
  name: string;
  description: string;
  status: TaskStatus;
  assigned_to: string;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
  dependencies: string[];
  artifacts: string[];
  tags: string[];
}

export interface MemoryArtifact {
  artifact_id: string;
  project_id: string;
  name: string;
  path: string;
  type: string;
  status: ArtifactStatus;
  meta?: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  archived_at: string | null;
  archive_reason: string | null;
  task_id: string | null;
  version: number;
}

export interface MemoryState {
  version: number;
  project_id: string;
  tasks: MemoryTask[];
  artifacts: MemoryArtifact[];
  updated_at: string;
}

export interface MemorySummary {
  totalTasks: number;
  completedTasks: number;
  totalArtifacts: number;
  archivedArtifacts: number;
  staleArtifacts: number;
}

const DEFAULT_STALE_DAYS = 30;
const DEFAULT_ARCHIVE_DAYS = 7;

function isNodeError(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && 'code' in error;
}

export class MemoryStore {
  private readonly filePath: string;

  constructor(private readonly projectRoot: string) {
    this.filePath = path.join(projectRoot, '.ai-pm', 'memory', 'state.json');
  }

  private async ensureDir(): Promise<void> {
    await mkdir(path.dirname(this.filePath), { recursive: true });
  }

  private async readState(): Promise<MemoryState> {
    try {
      const raw = await readFile(this.filePath, 'utf-8');
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object' && Array.isArray(parsed.tasks) && Array.isArray(parsed.artifacts)) {
        return parsed as MemoryState;
      }
      return this.emptyState();
    } catch (error: unknown) {
      if (isNodeError(error) && error.code === 'ENOENT') return this.emptyState();
      throw error;
    }
  }

  private async writeState(state: MemoryState): Promise<void> {
    await this.ensureDir();
    state.updated_at = new Date().toISOString();
    await writeFile(this.filePath, JSON.stringify(state, null, 2), 'utf-8');
  }

  private emptyState(): MemoryState {
    return {
      version: 1,
      project_id: '',
      tasks: [],
      artifacts: [],
      updated_at: new Date().toISOString(),
    };
  }

  // --- State ---

  async getState(): Promise<MemoryState> {
    return this.readState();
  }

  // --- Tasks ---

  async createTask(input: Omit<MemoryTask, 'task_id' | 'created_at' | 'updated_at'>): Promise<MemoryTask> {
    if (!input.name || !input.project_id) {
      throw new Error('Missing required fields: name, project_id');
    }

    const now = new Date().toISOString();
    const task: MemoryTask = {
      ...input,
      task_id: randomUUID(),
      completed_at: input.completed_at ?? null,
      dependencies: input.dependencies ?? [],
      artifacts: input.artifacts ?? [],
      tags: input.tags ?? [],
      created_at: now,
      updated_at: now,
    };

    const state = await this.readState();
    state.project_id = state.project_id || input.project_id;
    state.tasks.push(task);
    await this.writeState(state);
    return task;
  }

  async updateTask(taskId: string, updates: Partial<MemoryTask>): Promise<MemoryTask> {
    const state = await this.readState();
    const idx = state.tasks.findIndex(t => t.task_id === taskId);
    if (idx === -1) throw new Error(`Task ${taskId} not found`);

    const task = state.tasks[idx];
    const { task_id, created_at, ...safe } = updates;
    Object.assign(task, safe, { updated_at: new Date().toISOString() });

    state.tasks[idx] = task;
    await this.writeState(state);
    return task;
  }

  async completeTask(taskId: string): Promise<MemoryTask> {
    const state = await this.readState();
    const idx = state.tasks.findIndex(t => t.task_id === taskId);
    if (idx === -1) throw new Error(`Task ${taskId} not found`);

    const now = new Date().toISOString();
    state.tasks[idx].status = 'completed';
    state.tasks[idx].completed_at = now;
    state.tasks[idx].updated_at = now;

    await this.writeState(state);
    return state.tasks[idx];
  }

  async getTask(taskId: string): Promise<MemoryTask | null> {
    const state = await this.readState();
    return state.tasks.find(t => t.task_id === taskId) ?? null;
  }

  async listTasks(filter?: { status?: TaskStatus }): Promise<MemoryTask[]> {
    const state = await this.readState();
    if (filter?.status) return state.tasks.filter(t => t.status === filter.status);
    return state.tasks;
  }

  // --- Artifacts ---

  async createArtifact(
    input: Omit<MemoryArtifact, 'artifact_id' | 'created_at' | 'updated_at' | 'version'>,
  ): Promise<MemoryArtifact> {
    if (!input.name || !input.project_id) {
      throw new Error('Missing required fields: name, project_id');
    }

    const now = new Date().toISOString();
    const artifact: MemoryArtifact = {
      ...input,
      artifact_id: randomUUID(),
      task_id: input.task_id ?? null,
      archived_at: null,
      archive_reason: null,
      version: 1,
      created_at: now,
      updated_at: now,
    };

    const state = await this.readState();
    state.artifacts.push(artifact);

    // Link to originating task if present
    if (artifact.task_id) {
      const task = state.tasks.find(t => t.task_id === artifact.task_id);
      if (task && !task.artifacts.includes(artifact.artifact_id)) {
        task.artifacts.push(artifact.artifact_id);
      }
    }

    await this.writeState(state);
    return artifact;
  }

  async updateArtifact(artifactId: string, updates: Partial<MemoryArtifact>): Promise<MemoryArtifact> {
    const state = await this.readState();
    const idx = state.artifacts.findIndex(a => a.artifact_id === artifactId);
    if (idx === -1) throw new Error(`Artifact ${artifactId} not found`);

    const artifact = state.artifacts[idx];
    const { artifact_id, created_at, ...safe } = updates;
    Object.assign(artifact, safe, {
      updated_at: new Date().toISOString(),
      version: artifact.version + 1,
    });

    state.artifacts[idx] = artifact;
    await this.writeState(state);
    return artifact;
  }

  async archiveArtifact(artifactId: string, reason: string): Promise<MemoryArtifact> {
    const state = await this.readState();
    const idx = state.artifacts.findIndex(a => a.artifact_id === artifactId);
    if (idx === -1) throw new Error(`Artifact ${artifactId} not found`);

    const now = new Date().toISOString();
    const artifact = state.artifacts[idx];
    artifact.status = 'archived';
    artifact.archived_at = now;
    artifact.archive_reason = reason;
    artifact.updated_at = now;

    state.artifacts[idx] = artifact;
    await this.writeState(state);
    return artifact;
  }

  async getArtifact(artifactId: string): Promise<MemoryArtifact | null> {
    const state = await this.readState();
    return state.artifacts.find(a => a.artifact_id === artifactId) ?? null;
  }

  async listArtifacts(filter?: { status?: ArtifactStatus; type?: string }): Promise<MemoryArtifact[]> {
    const state = await this.readState();
    let result = state.artifacts;
    if (filter?.status) result = result.filter(a => a.status === filter.status);
    if (filter?.type) result = result.filter(a => a.type === filter.type);
    return result;
  }

  async getTaskArtifacts(taskId: string): Promise<MemoryArtifact[]> {
    const state = await this.readState();
    const task = state.tasks.find(t => t.task_id === taskId);
    if (!task) return [];
    return state.artifacts.filter(a => task.artifacts.includes(a.artifact_id));
  }

  // --- Lifecycle ---

  async autoArchiveCompleted(maxAgeDays: number = DEFAULT_ARCHIVE_DAYS): Promise<MemoryArtifact[]> {
    const state = await this.readState();
    const cutoff = Date.now() - maxAgeDays * 24 * 60 * 60 * 1000;
    const archived: MemoryArtifact[] = [];
    const now = new Date().toISOString();

    for (const task of state.tasks) {
      if (task.status !== 'completed' || !task.completed_at) continue;
      const completedTime = new Date(task.completed_at).getTime();
      if (completedTime >= cutoff) continue;

      for (const artId of task.artifacts) {
        const idx = state.artifacts.findIndex(a => a.artifact_id === artId);
        if (idx === -1) continue;
        const art = state.artifacts[idx];
        if (art.status !== 'active') continue;

        art.status = 'archived';
        art.archived_at = now;
        art.archive_reason = `Auto-archived: task "${task.name}" completed ${new Date(task.completed_at).toISOString().slice(0, 10)}`;
        art.updated_at = now;
        archived.push(art);
      }
    }

    if (archived.length > 0) await this.writeState(state);
    return archived;
  }

  async getStaleArtifacts(maxAgeDays: number = DEFAULT_STALE_DAYS): Promise<MemoryArtifact[]> {
    const state = await this.readState();
    const cutoff = Date.now() - maxAgeDays * 24 * 60 * 60 * 1000;
    return state.artifacts.filter(a => {
      if (a.status === 'archived' || a.status === 'deleted') return false;
      return new Date(a.updated_at).getTime() < cutoff;
    });
  }

  // --- Summary ---

  async getSummary(): Promise<MemorySummary> {
    const state = await this.readState();
    const stale = await this.getStaleArtifacts();
    return {
      totalTasks: state.tasks.length,
      completedTasks: state.tasks.filter(t => t.status === 'completed').length,
      totalArtifacts: state.artifacts.length,
      archivedArtifacts: state.artifacts.filter(a => a.status === 'archived').length,
      staleArtifacts: stale.length,
    };
  }
}
