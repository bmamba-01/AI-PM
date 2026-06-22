/**
 * Tracking Task Lifecycle
 *
 * Orchestrator lifecycle helpers for creating, completing, and verifying
 * tracked tasks. Used by orchestratorRun to ensure every delegated work
 * creates a tracker task before agent assignment and verifies completion after.
 */

import { randomUUID } from 'node:crypto';
import type {
  TrackingAdapter,
  TrackingConfig,
  TrackingTask,
  TaskStatus,
  TrackingSystem,
} from './types.js';

// ─── Lifecycle State ─────────────────────────────────────────────────────────

export interface TaskLifecycleState {
  tracking_tool: TrackingSystem;
  tracking_mode: string;
  external_task_id: string | null;
  external_task_url: string | null;
  local_memory_task_id: string | null;
  status: TaskStatus;
  created_at: string;
  completed_at: string | null;
  dry_run_only: boolean;
  completion_payload: CompletionPayload | null;
}

export interface CompletionPayload {
  tool: TrackingSystem;
  external_task_id: string;
  external_task_url: string;
  status_after_update: TaskStatus;
  attempted: boolean;
  result: string;
  evidence_refs: string[];
  summary: string;
}

// ─── Create Task ─────────────────────────────────────────────────────────────

export interface CreateLifecycleTaskInput {
  project_id: string;
  title: string;
  description: string;
  assigned_agent: string;
  workflow_id: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  acceptance_criteria?: string[];
  verification_commands?: string[];
  source_refs?: string[];
  due_date?: string;
}

export interface CreateLifecycleTaskResult {
  state: TaskLifecycleState;
  tracking_task: TrackingTask;
}

/**
 * Create a tracked task via the adapter and build the lifecycle state
 * that the orchestrator stores in the execution record.
 */
export async function createLifecycleTask(
  adapter: TrackingAdapter,
  config: TrackingConfig,
  input: CreateLifecycleTaskInput,
): Promise<CreateLifecycleTaskResult> {
  const now = new Date().toISOString();

  const trackingTask = await adapter.createTask({
    project_id: input.project_id,
    title: input.title,
    description: input.description,
    assigned_agent: input.assigned_agent,
    workflow_id: input.workflow_id,
    priority: input.priority,
    status: 'ready',
    due_date: input.due_date ?? null,
    acceptance_criteria: input.acceptance_criteria ?? [],
    verification_commands: input.verification_commands ?? [],
    source_refs: input.source_refs ?? [],
  });

  // Determine if this is a dry_run_only task based on tracking mode
  const dryRunOnly = config.mode === 'dry_run' || config.mode === 'local_import';

  const state: TaskLifecycleState = {
    tracking_tool: config.system,
    tracking_mode: config.mode,
    external_task_id: trackingTask.external_task_id || null,
    external_task_url: trackingTask.external_task_url || null,
    local_memory_task_id: trackingTask.local_memory_task_id,
    status: 'ready',
    created_at: now,
    completed_at: null,
    dry_run_only: dryRunOnly,
    completion_payload: null,
  };

  return { state, tracking_task: trackingTask };
}

// ─── Complete Task ───────────────────────────────────────────────────────────

export interface CompleteTaskInput {
  external_task_id: string;
  status: TaskStatus;
  summary?: string;
  evidence_refs?: string[];
}

export interface CompleteTaskResult {
  state: TaskLifecycleState;
  completion_payload: CompletionPayload;
  verification: { complete: boolean; evidence: string[] };
}

/**
 * Mark a tracked task as completed. Validates that:
 * - The task exists in the tracker
 * - Dry-run completion is only allowed when the mode permits it
 * - Returns verification result
 */
export async function completeLifecycleTask(
  adapter: TrackingAdapter,
  config: TrackingConfig,
  currentState: TaskLifecycleState,
  input: CompleteTaskInput,
): Promise<CompleteTaskResult> {
  // Validate: dry-run completion only allowed when mode permits
  const isDryRunAllowed = config.mode === 'dry_run' || config.mode === 'local_import' || config.mode === 'manual';
  if (currentState.dry_run_only && !isDryRunAllowed) {
    throw new Error(
      `Cannot complete task in dry-run-only state when mode is "${config.mode}". ` +
      `Dry-run completion is only allowed in dry_run, local_import, or manual modes.`,
    );
  }

  const now = new Date().toISOString();
  let attempted = false;
  let result = 'skipped';

  // Update tracker via adapter (skip for manual mode)
  if (config.mode !== 'manual') {
    try {
      await adapter.updateStatus(input.external_task_id, input.status, input.summary);
      attempted = true;
      result = 'updated';
    } catch (err) {
      attempted = true;
      result = `failed: ${err instanceof Error ? err.message : String(err)}`;
    }
  }

  const completionPayload: CompletionPayload = {
    tool: config.system,
    external_task_id: input.external_task_id,
    external_task_url: currentState.external_task_url ?? '',
    status_after_update: input.status,
    attempted,
    result,
    evidence_refs: input.evidence_refs ?? [],
    summary: input.summary ?? '',
  };

  // Verify completion via adapter
  const verification = await adapter.verifyCompletion(input.external_task_id);

  const state: TaskLifecycleState = {
    ...currentState,
    status: input.status,
    completed_at: now,
    completion_payload: completionPayload,
  };

  return { state, completion_payload: completionPayload, verification };
}

// ─── Verify Completion ───────────────────────────────────────────────────────

/**
 * Verify that a tracked task was actually updated by the agent.
 * Returns false if the task is missing, wrong status, or not found.
 */
export async function verifyCompletion(
  adapter: TrackingAdapter,
  externalTaskId: string,
): Promise<{ verified: boolean; evidence: string[] }> {
  const result = await adapter.verifyCompletion(externalTaskId);

  if (!result.complete) {
    return {
      verified: false,
      evidence: [
        `Task ${externalTaskId} is not in done status`,
        ...result.evidence,
      ],
    };
  }

  return {
    verified: true,
    evidence: [
      `Task ${externalTaskId} verified as completed`,
      ...result.evidence,
    ],
  };
}

// ─── Build Agent Contract ────────────────────────────────────────────────────

export interface AgentContract {
  task_id: string;
  external_task_id: string;
  external_task_url: string;
  tracking_tool: string;
  tracking_mode: string;
  completion_skill: string;
  workflow_id: string;
  agent_role: string;
}

/**
 * Build the agent contract that gets injected into the subagent task prompt.
 * This ensures the agent knows how to complete the tracked task.
 */
export function buildAgentContract(
  state: TaskLifecycleState,
  workflow_id: string,
  agent_role: string,
): AgentContract {
  return {
    task_id: state.local_memory_task_id ?? state.external_task_id ?? '',
    external_task_id: state.external_task_id ?? '',
    external_task_url: state.external_task_url ?? '',
    tracking_tool: state.tracking_tool,
    tracking_mode: state.tracking_mode,
    completion_skill: 'tracking.complete_task',
    workflow_id,
    agent_role,
  };
}
