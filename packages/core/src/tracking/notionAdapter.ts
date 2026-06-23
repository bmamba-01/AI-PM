/**
 * Notion local-import adapter.
 *
 * Live Notion is not supported yet. Dry-run and local-import modes write a
 * CSV artifact that can be imported or inspected locally.
 */

import { randomUUID } from 'node:crypto';
import { appendFile, mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import type {
  CreateTaskInput,
  TaskStatus,
  TrackingAdapter,
  TrackingMode,
  TrackingSystem,
  TrackingTask,
} from './types.js';

function toCsvRow(values: string[]): string {
  return values.map(value => `"${value.replaceAll('"', '""')}"`).join(',');
}

function parseCsvLine(line: string): string[] {
  const values: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const next = line[index + 1];

    if (char === '"') {
      if (inQuotes && next === '"') {
        current += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === ',' && !inQuotes) {
      values.push(current);
      current = '';
      continue;
    }

    current += char;
  }

  values.push(current);
  return values;
}

function splitList(value: string): string[] {
  return value ? value.split('; ').filter(Boolean) : [];
}

function joinList(values: string[] | undefined): string {
  return (values ?? []).join('; ');
}

function formatPriority(priority: TrackingTask['priority']): string {
  return priority.charAt(0).toUpperCase() + priority.slice(1);
}

function parsePriority(priority: string): TrackingTask['priority'] {
  return (priority.toLowerCase() || 'medium') as TrackingTask['priority'];
}

export class NotionAdapter implements TrackingAdapter {
  readonly adapter_id: TrackingSystem = 'notion';
  readonly mode: TrackingMode;
  private readonly csvPath: string;

  constructor(projectRoot: string, mode: TrackingMode = 'local_import') {
    this.mode = mode;
    this.csvPath = path.join(projectRoot, 'integrations', 'notion', 'issues.csv');
  }

  private ensureSupportedMode(action: string): void {
    if (this.mode === 'live') {
      throw new Error(`Tracking adapter "notion" does not support live mode for ${action}`);
    }
  }

  private buildExternalTaskUrl(): string {
    return pathToFileURL(this.csvPath).href;
  }

  private async ensureCsvDir(): Promise<void> {
    await mkdir(path.dirname(this.csvPath), { recursive: true });
  }

  private rowToTask(line: string, projectId: string): TrackingTask {
    const [
      externalTaskId = '',
      title = 'Unknown',
      status = 'ready',
      priority = 'medium',
      owner = '',
      workflowId = '',
      dueDate = '',
      description = '',
      sourceRefs = '',
      acceptanceCriteria = '',
      verification = '',
      reportUrls = '',
      comments = '',
    ] = parseCsvLine(line);

    const now = new Date().toISOString();
    return {
      task_id: externalTaskId || randomUUID(),
      project_id: projectId,
      title,
      description,
      assigned_agent: owner,
      workflow_id: workflowId,
      priority: parsePriority(priority),
      status: (status || 'ready') as TaskStatus,
      due_date: dueDate || null,
      acceptance_criteria: splitList(acceptanceCriteria),
      verification_commands: splitList(verification),
      source_refs: splitList(sourceRefs),
      local_memory_task_id: '',
      external_task_id: externalTaskId,
      external_task_url: this.buildExternalTaskUrl(),
      dry_run_only: true,
      report_urls: splitList(reportUrls),
      comments: splitList(comments),
      created_at: now,
      updated_at: now,
    };
  }

  private taskToRow(task: TrackingTask): string {
    return toCsvRow([
      task.external_task_id,
      task.title,
      task.status,
      formatPriority(task.priority),
      task.assigned_agent,
      task.workflow_id,
      task.due_date ?? '',
      task.description,
      joinList(task.source_refs),
      joinList(task.acceptance_criteria),
      joinList(task.verification_commands),
      joinList(task.report_urls),
      joinList(task.comments),
    ]);
  }

  private async readRows(): Promise<string[]> {
    try {
      const content = await readFile(this.csvPath, 'utf-8');
      return content.split('\n').map(line => line.trim()).filter(Boolean);
    } catch {
      return [];
    }
  }

  private async writeRows(lines: string[]): Promise<void> {
    await this.ensureCsvDir();
    await writeFile(this.csvPath, `${lines.join('\n')}\n`, 'utf-8');
  }

  async createTask(input: CreateTaskInput): Promise<TrackingTask> {
    this.ensureSupportedMode('createTask');

    const externalTaskId = `notion-local:${randomUUID().slice(0, 8)}`;
    const now = new Date().toISOString();
    const task: TrackingTask = {
      task_id: randomUUID(),
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
      local_memory_task_id: '',
      external_task_id: externalTaskId,
      external_task_url: this.buildExternalTaskUrl(),
      dry_run_only: true,
      report_urls: [],
      comments: [],
      created_at: now,
      updated_at: now,
    };

    await this.ensureCsvDir();
    await appendFile(this.csvPath, `${this.taskToRow(task)}\n`, 'utf-8');
    return task;
  }

  async getTask(externalTaskId: string): Promise<TrackingTask | null> {
    this.ensureSupportedMode('getTask');

    const lines = await this.readRows();
    const line = lines.find(entry => this.rowToTask(entry, '').external_task_id === externalTaskId);
    return line ? this.rowToTask(line, '') : null;
  }

  async updateStatus(externalTaskId: string, status: TaskStatus): Promise<TrackingTask> {
    this.ensureSupportedMode('updateStatus');

    const task = await this.getTask(externalTaskId);
    if (!task) {
      throw new Error(`Task ${externalTaskId} not found`);
    }

    const updated: TrackingTask = {
      ...task,
      status,
      updated_at: new Date().toISOString(),
    };

    const lines = await this.readRows();
    const nextLines = lines.map(line => {
      const current = this.rowToTask(line, task.project_id);
      return current.external_task_id === externalTaskId ? this.taskToRow(updated) : line;
    });
    await this.writeRows(nextLines);
    return updated;
  }

  async attachReport(externalTaskId: string, reportUrl: string): Promise<TrackingTask> {
    this.ensureSupportedMode('attachReport');

    const task = await this.getTask(externalTaskId);
    if (!task) {
      throw new Error(`Task ${externalTaskId} not found`);
    }

    const updated: TrackingTask = {
      ...task,
      report_urls: [...(task.report_urls ?? []), reportUrl],
      updated_at: new Date().toISOString(),
    };

    const lines = await this.readRows();
    const nextLines = lines.map(line => {
      const current = this.rowToTask(line, task.project_id);
      return current.external_task_id === externalTaskId ? this.taskToRow(updated) : line;
    });
    await this.writeRows(nextLines);
    return updated;
  }

  async addComment(externalTaskId: string, comment: string): Promise<TrackingTask> {
    this.ensureSupportedMode('addComment');

    const task = await this.getTask(externalTaskId);
    if (!task) {
      throw new Error(`Task ${externalTaskId} not found`);
    }

    const updated: TrackingTask = {
      ...task,
      comments: [...(task.comments ?? []), comment],
      updated_at: new Date().toISOString(),
    };

    const lines = await this.readRows();
    const nextLines = lines.map(line => {
      const current = this.rowToTask(line, task.project_id);
      return current.external_task_id === externalTaskId ? this.taskToRow(updated) : line;
    });
    await this.writeRows(nextLines);
    return updated;
  }

  async listProjectTasks(projectId: string): Promise<TrackingTask[]> {
    this.ensureSupportedMode('listProjectTasks');

    const lines = await this.readRows();
    return lines.map(line => this.rowToTask(line, projectId));
  }

  async listTasks(projectId: string): Promise<TrackingTask[]> {
    return this.listProjectTasks(projectId);
  }

  async verifyCompletion(externalTaskId: string): Promise<{ complete: boolean; evidence: string[] }> {
    this.ensureSupportedMode('verifyCompletion');

    const task = await this.getTask(externalTaskId);
    if (!task) {
      return { complete: false, evidence: ['Task not found in local CSV'] };
    }

    return {
      complete: task.status === 'done',
      evidence: [...(task.report_urls ?? []), ...(task.comments ?? []), ...task.verification_commands],
    };
  }
}
