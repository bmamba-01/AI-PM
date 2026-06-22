/**
 * Excel Dry-Run Adapter
 *
 * Supports CSV-compatible rows for tracking tasks in spreadsheets.
 * Returns external_task_id/url and dry_run_only when not in live mode.
 */

import { readFile, writeFile, appendFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import type { TrackingAdapter, TrackingTask, CreateTaskInput, TrackingSystem, TrackingMode, TaskStatus } from './types.js';

const CSV_HEADER = 'ExternalID,Title,Priority,Status,Owner,Description,Acceptance Criteria,Verification,Due Date,Source\n';

function mapPriority(priority: string): string {
  const map: Record<string, string> = {
    critical: 'Critical',
    high: 'High',
    medium: 'Medium',
    low: 'Low',
  };
  return map[priority] || 'Medium';
}

function taskToRow(task: TrackingTask): string {
  return [
    task.external_task_id,
    task.title,
    mapPriority(task.priority),
    task.status,
    task.assigned_agent,
    task.description,
    (task.acceptance_criteria ?? []).join('; '),
    (task.verification_commands ?? []).join('; '),
    task.due_date || '',
    (task.source_refs ?? []).join('; '),
  ].join(',');
}

function rowToTask(line: string, projectId: string): TrackingTask {
  const cols = line.split(',');
  return {
    task_id: randomUUID(),
    project_id: projectId,
    title: cols[1] || 'Unknown',
    description: '',
    assigned_agent: '',
    workflow_id: '',
    priority: 'medium',
    status: (cols[3] || 'ready') as TaskStatus,
    due_date: null,
    acceptance_criteria: [],
    verification_commands: [],
    source_refs: [],
    local_memory_task_id: '',
    external_task_id: cols[0] || '',
    external_task_url: `https://docs.google.com/spreadsheets/d/${cols[0] || ''}`,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

export class ExcelAdapter implements TrackingAdapter {
  readonly adapter_id: TrackingSystem = 'excel';
  mode: TrackingMode;
  private csvPath: string;

  constructor(projectRoot: string, mode: TrackingMode = 'local_import') {
    this.mode = mode;
    this.csvPath = path.join(projectRoot, 'integrations', 'excel', 'tasks.csv');
  }

  async createTask(input: CreateTaskInput): Promise<TrackingTask> {
    if (this.mode === 'live') {
      throw new Error('Live Excel not implemented');
    }

    const externalId = `excel-row-${randomUUID().slice(0, 8)}`;
    const now = new Date().toISOString();

    const task: TrackingTask = {
      task_id: randomUUID(),
      project_id: input.project_id,
      title: input.title,
      description: input.description,
      assigned_agent: input.assigned_agent,
      workflow_id: input.workflow_id,
      priority: input.priority,
      status: input.status ?? 'ready',
      due_date: input.due_date ?? null,
      acceptance_criteria: input.acceptance_criteria ?? [],
      verification_commands: input.verification_commands ?? [],
      source_refs: input.source_refs ?? [],
      local_memory_task_id: '',
      external_task_id: externalId,
      external_task_url: `https://docs.google.com/spreadsheets/d/${externalId}`,
      created_at: now,
      updated_at: now,
    };

    await this.ensureCsvDir();
    await appendFile(this.csvPath, taskToRow(task) + '\n', 'utf-8');
    return task;
  }

  async getTask(externalTaskId: string): Promise<TrackingTask | null> {
    if (this.mode === 'live') throw new Error('Live Excel not implemented');

    try {
      const content = await readFile(this.csvPath, 'utf-8');
      const lines = content.trim().split('\n').filter(Boolean);

      for (const line of lines) {
        const cols = line.split(',');
        if (cols[0]?.trim() === externalTaskId) {
          return rowToTask(line, '');
        }
      }
      return null;
    } catch {
      return null;
    }
  }

  async updateStatus(externalTaskId: string, status: TaskStatus, summary?: string): Promise<TrackingTask> {
    if (this.mode === 'live') throw new Error('Live Excel not implemented');

    const task = await this.getTask(externalTaskId);
    if (!task) throw new Error(`Task ${externalTaskId} not found`);

    task.status = status;
    task.updated_at = new Date().toISOString();

    // Rewrite entire CSV with updated status
    const content = await readFile(this.csvPath, 'utf-8');
    const lines = content.trim().split('\n').filter(Boolean);
    const updatedLines = lines.map(line => {
      const cols = line.split(',');
      if (cols[0]?.trim() === externalTaskId) {
        return taskToRow(task);
      }
      return line;
    });

    await writeFile(this.csvPath, updatedLines.join('\n') + '\n', 'utf-8');
    return task;
  }

  async verifyCompletion(externalTaskId: string): Promise<{ complete: boolean; evidence: string[] }> {
    if (this.mode === 'live') throw new Error('Live Excel not implemented');

    const task = await this.getTask(externalTaskId);
    if (!task) return { complete: false, evidence: ['Task not found in local CSV'] };

    return {
      complete: task.status === 'done',
      evidence: task.verification_commands,
    };
  }

  async listTasks(projectId: string): Promise<TrackingTask[]> {
    if (this.mode === 'live') throw new Error('Live Excel not implemented');

    try {
      const content = await readFile(this.csvPath, 'utf-8');
      const lines = content.trim().split('\n').filter(Boolean);
      return lines.map(line => rowToTask(line, projectId));
    } catch {
      return [];
    }
  }

  private async ensureCsvDir(): Promise<void> {
    const dir = path.dirname(this.csvPath);
    await mkdir(dir, { recursive: true });
  }
}
