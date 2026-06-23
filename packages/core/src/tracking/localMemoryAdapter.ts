/**
 * Local Memory Tracking Adapter
 *
 * File-backed tracking adapter using the MemoryStore.
 * Default adapter when no external tracking system is configured.
 * All data stays local — no network calls, no vendor APIs.
 */

import { randomUUID } from 'node:crypto';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import type {
  TrackingAdapter,
  TrackingTask,
  CreateTaskInput,
  TaskStatus,
} from './types.js';

const TRACKING_FILE = 'tracking/tasks.json';

interface StoredTask extends TrackingTask {
  _local_version: number;
}

async function ensureDir(filePath: string): Promise<void> {
  await mkdir(path.dirname(filePath), { recursive: true });
}

async function readTasks(projectRoot: string): Promise<StoredTask[]> {
  const filePath = path.join(projectRoot, '.ai-pm', TRACKING_FILE);
  try {
    const raw = await readFile(filePath, 'utf-8');
    return JSON.parse(raw) as StoredTask[];
  } catch {
    return [];
  }
}

async function writeTasks(projectRoot: string, tasks: StoredTask[]): Promise<void> {
  const filePath = path.join(projectRoot, '.ai-pm', TRACKING_FILE);
  await ensureDir(filePath);
  await writeFile(filePath, JSON.stringify(tasks, null, 2), 'utf-8');
}

export class LocalMemoryAdapter implements TrackingAdapter {
  readonly adapter_id = 'local_memory' as const;
  readonly mode = 'manual' as const;

  constructor(private readonly projectRoot: string) {}

  async createTask(input: CreateTaskInput): Promise<TrackingTask> {
    const now = new Date().toISOString();
    const taskId = randomUUID();

    const task: StoredTask = {
      task_id: taskId,
      project_id: input.project_id,
      title: input.title,
      description: input.description,
      assigned_agent: input.assigned_agent,
      workflow_id: input.workflow_id,
      priority: input.priority,
      status: input.status,
      due_date: input.due_date ?? null,
      acceptance_criteria: input.acceptance_criteria ?? [],
      verification_commands: input.verification_commands ?? [],
      source_refs: input.source_refs ?? [],
      local_memory_task_id: taskId,
      external_task_id: taskId,
      external_task_url: '',
      report_urls: [],
      comments: [],
      created_at: now,
      updated_at: now,
      _local_version: 1,
    };

    const tasks = await readTasks(this.projectRoot);
    tasks.push(task);
    await writeTasks(this.projectRoot, tasks);

    return task;
  }

  async getTask(externalTaskId: string): Promise<TrackingTask | null> {
    const tasks = await readTasks(this.projectRoot);
    const found = tasks.find(
      t => t.task_id === externalTaskId || t.external_task_id === externalTaskId,
    );
    return found ?? null;
  }

  async updateStatus(
    externalTaskId: string,
    status: TaskStatus,
    summary?: string,
  ): Promise<TrackingTask> {
    const tasks = await readTasks(this.projectRoot);
    const idx = tasks.findIndex(
      t => t.task_id === externalTaskId || t.external_task_id === externalTaskId,
    );
    if (idx === -1) {
      throw new Error(`Task not found: ${externalTaskId}`);
    }

    const now = new Date().toISOString();
    tasks[idx].status = status;
    tasks[idx].updated_at = now;
    tasks[idx]._local_version += 1;

    await writeTasks(this.projectRoot, tasks);
    return tasks[idx];
  }

  async attachReport(externalTaskId: string, reportUrl: string): Promise<TrackingTask> {
    const tasks = await readTasks(this.projectRoot);
    const idx = tasks.findIndex(
      t => t.task_id === externalTaskId || t.external_task_id === externalTaskId,
    );
    if (idx === -1) {
      throw new Error(`Task not found: ${externalTaskId}`);
    }

    const now = new Date().toISOString();
    tasks[idx].report_urls = [...(tasks[idx].report_urls ?? []), reportUrl];
    tasks[idx].updated_at = now;
    tasks[idx]._local_version += 1;

    await writeTasks(this.projectRoot, tasks);
    return tasks[idx];
  }

  async addComment(externalTaskId: string, comment: string): Promise<TrackingTask> {
    const tasks = await readTasks(this.projectRoot);
    const idx = tasks.findIndex(
      t => t.task_id === externalTaskId || t.external_task_id === externalTaskId,
    );
    if (idx === -1) {
      throw new Error(`Task not found: ${externalTaskId}`);
    }

    const now = new Date().toISOString();
    tasks[idx].comments = [...(tasks[idx].comments ?? []), comment];
    tasks[idx].updated_at = now;
    tasks[idx]._local_version += 1;

    await writeTasks(this.projectRoot, tasks);
    return tasks[idx];
  }

  async listProjectTasks(projectId: string): Promise<TrackingTask[]> {
    const tasks = await readTasks(this.projectRoot);
    return tasks.filter(task => task.project_id === projectId);
  }

  async verifyCompletion(
    externalTaskId: string,
  ): Promise<{ complete: boolean; evidence: string[] }> {
    const task = await this.getTask(externalTaskId);
    if (!task) {
      return { complete: false, evidence: [`Task not found: ${externalTaskId}`] };
    }

    const complete = task.status === 'done';
    const evidence: string[] = [...(task.report_urls ?? []), ...(task.comments ?? [])];
    if (complete) {
      evidence.push(`Task "${task.title}" is in "done" status`);
      evidence.push(`Last updated: ${task.updated_at}`);
    } else {
      evidence.push(`Task "${task.title}" is in "${task.status}" status`);
    }

    return { complete, evidence };
  }
}
