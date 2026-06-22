/**
 * Tracking System Types
 *
 * Defines the contract for all tracking adapters.
 * Every tracking adapter must implement these operations.
 */

// ─── Valid tracking systems and modes ───────────────────────────────────────

export const VALID_TRACKING_SYSTEMS = [
  'notion', 'jira', 'linear', 'github', 'excel', 'local_memory',
] as const;

export const VALID_TRACKING_MODES = [
  'live', 'dry_run', 'local_import', 'manual',
] as const;

export const VALID_TASK_STATUSES = [
  'ready', 'in_progress', 'blocked', 'done', 'cancelled',
] as const;

export type TrackingSystem = typeof VALID_TRACKING_SYSTEMS[number];
export type TrackingMode = typeof VALID_TRACKING_MODES[number];
export type TaskStatus = typeof VALID_TASK_STATUSES[number];

// ─── Task contract ──────────────────────────────────────────────────────────

export interface TrackingTask {
  task_id: string;
  project_id: string;
  title: string;
  description: string;
  assigned_agent: string;
  workflow_id: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  status: TaskStatus;
  due_date: string | null;
  acceptance_criteria: string[];
  verification_commands: string[];
  source_refs: string[];
  local_memory_task_id: string;
  external_task_id: string;
  external_task_url: string;
  dry_run_only?: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateTaskInput {
  project_id: string;
  title: string;
  description: string;
  assigned_agent: string;
  workflow_id: string;
  priority: TrackingTask['priority'];
  status: TaskStatus;
  due_date?: string | null;
  acceptance_criteria?: string[];
  verification_commands?: string[];
  source_refs?: string[];
}

export interface TrackingUpdate {
  task_id: string;
  project_id: string;
  tracking_update: {
    tool: TrackingSystem;
    external_task_id: string;
    external_task_url: string;
    attempted: boolean;
    result: 'updated' | 'dry_run_only' | 'blocked' | 'failed';
    status_after_update: string;
    report_url: string;
    evidence_refs: string[];
  };
  summary: string;
}

// ─── Adapter interface ──────────────────────────────────────────────────────

export interface TrackingAdapter {
  readonly adapter_id: TrackingSystem;
  readonly mode: TrackingMode;

  /** Create a task in the tracking system. */
  createTask(input: CreateTaskInput): Promise<TrackingTask>;

  /** Get a task by external ID. */
  getTask(externalTaskId: string): Promise<TrackingTask | null>;

  /** Update task status. */
  updateStatus(externalTaskId: string, status: TaskStatus, summary?: string): Promise<TrackingTask>;

  /** Verify that a task is complete and matches evidence. */
  verifyCompletion(externalTaskId: string): Promise<{ complete: boolean; evidence: string[] }>;
}

// ─── Project profile tracking section ───────────────────────────────────────

export interface TrackingConfig {
  system: TrackingSystem;
  mode: TrackingMode;
  database_name?: string;
  status_field?: string;
  done_status?: string;
  sync_policy?: 'approval_required' | 'read_only' | 'local_only';
  local_import_files?: {
    issues?: string;
    schema?: string;
  };
}
