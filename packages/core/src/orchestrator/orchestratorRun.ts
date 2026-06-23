/**
 * Orchestrator State Machine — Run Management
 *
 * Pure/local implementation. No external MCP calls.
 * Deterministic and testable.
 */

import { randomUUID } from 'node:crypto';
import {
  type OrchestratorRun,
  type OrchestratorRunState,
  type ProjectContextPack,
  type RunTrigger,
  type OrchestratorAuditRecord,
  type RunArtifact,
  type RunError,
  STATE_TRANSITIONS,
} from './types.js';
import type { TrackingUpdate } from '../tracking/types.js';
import {
  type AgentContract,
  type TaskLifecycleState,
  buildAgentContract,
  validateTrackingUpdate,
} from '../tracking/taskLifecycle.js';

// ─── Validation ──────────────────────────────────────────────────────────────

function isValidTransition(from: OrchestratorRunState, to: OrchestratorRunState): boolean {
  return STATE_TRANSITIONS[from]?.includes(to) ?? false;
}

// ─── Create ──────────────────────────────────────────────────────────────────

export interface CreateOrchestratorRunInput {
  project_id: string;
  workflow_id: string;
  trigger: RunTrigger;
}

export function createOrchestratorRun(input: CreateOrchestratorRunInput): OrchestratorRun {
  if (!input.project_id || !input.workflow_id) {
    throw new Error('Missing required fields: project_id, workflow_id');
  }

  const now = new Date().toISOString();

  return {
    run_id: randomUUID(),
    project_id: input.project_id,
    workflow_id: input.workflow_id,
    state: 'intake',
    trigger: input.trigger,
    context_pack: null,
    assigned_agents: [],
    artifacts: [],
    approvals_required: [],
    tracking_state: null,
    agent_task_contract: null,
    errors: [],
    started_at: now,
    updated_at: now,
    completed_at: null,
  };
}

// ─── Advance ─────────────────────────────────────────────────────────────────

export interface AdvanceInput {
  target_state: OrchestratorRunState;
  context_pack?: ProjectContextPack;
  agents?: string[];
  artifacts?: RunArtifact[];
  approvals?: string[];
  tracking_state?: TaskLifecycleState;
  agent_task_contract?: AgentContract;
  error?: RunError;
}

export function advanceOrchestratorRun(
  run: OrchestratorRun,
  input: AdvanceInput
): OrchestratorRun {
  // Cannot advance completed or failed runs
  if (run.state === 'completed' || run.state === 'failed') {
    throw new Error(`Run is in terminal state "${run.state}" and cannot be advanced.`);
  }

  // Validate transition
  if (!isValidTransition(run.state, input.target_state)) {
    throw new Error(
      `Invalid transition: ${run.state} → ${input.target_state}. ` +
      `Allowed: [${STATE_TRANSITIONS[run.state].join(', ')}]`
    );
  }

  const now = new Date().toISOString();
  const nextTrackingState = input.tracking_state ?? run.tracking_state;
  let nextAgentContract = input.agent_task_contract ?? run.agent_task_contract;

  if (input.target_state === 'agent_assignment') {
    if (!nextTrackingState) {
      throw new Error('Tracking state must be created or bound before agent assignment.');
    }

    if (!nextAgentContract) {
      const agentRole =
        input.agents?.[0] ??
        run.assigned_agents[run.assigned_agents.length - 1] ??
        'unassigned';
      nextAgentContract = buildAgentContract(nextTrackingState, run.workflow_id, agentRole);
    }

    if (
      nextAgentContract.tracking.skill_required.orchestrator_create !== 'tracking.create_task' ||
      nextAgentContract.tracking.skill_required.agent_complete !== 'tracking.complete_task'
    ) {
      throw new Error('Agent task contract must include required tracking skill ids.');
    }
  }

  const next: OrchestratorRun = {
    ...run,
    state: input.target_state,
    updated_at: now,
    tracking_state: nextTrackingState,
    agent_task_contract: nextAgentContract,
  };

  // Apply side effects based on target state
  if (input.target_state === 'failed' && input.error) {
    next.errors = [...run.errors, { ...input.error, timestamp: now }];
  }

  if (input.context_pack) {
    next.context_pack = input.context_pack;
  }

  if (input.agents) {
    next.assigned_agents = [...run.assigned_agents, ...input.agents];
  }

  if (input.artifacts) {
    next.artifacts = [...run.artifacts, ...input.artifacts];
  }

  if (input.approvals) {
    next.approvals_required = [...run.approvals_required, ...input.approvals];
  }

  if (input.target_state === 'completed' || input.target_state === 'failed') {
    next.completed_at = now;
  }

  return next;
}

export function bindTrackingToRun(
  run: OrchestratorRun,
  tracking_state: TaskLifecycleState,
): OrchestratorRun {
  return {
    ...run,
    tracking_state,
    updated_at: new Date().toISOString(),
  };
}

export interface PrepareAgentAssignmentInput {
  agent: string;
  tracking_state: TaskLifecycleState;
  tracking_contract: AgentContract;
}

export function prepareAgentAssignment(
  run: OrchestratorRun,
  input: PrepareAgentAssignmentInput,
): OrchestratorRun {
  return advanceOrchestratorRun(bindTrackingToRun(run, input.tracking_state), {
    target_state: 'agent_assignment',
    agents: [input.agent],
    agent_task_contract: input.tracking_contract,
  });
}

export function acceptAgentCompletion(
  run: OrchestratorRun,
  tracking_update: TrackingUpdate['tracking_update'] | null | undefined,
): OrchestratorRun {
  if (!run.tracking_state) {
    throw new Error('Cannot accept agent completion without a bound tracking state.');
  }

  const validatedUpdate = validateTrackingUpdate(run.tracking_state, tracking_update);
  const nextTrackingState: TaskLifecycleState = {
    ...run.tracking_state,
    status: validatedUpdate.status_after_update as TaskLifecycleState['status'],
    completed_at:
      validatedUpdate.status_after_update === 'done'
        ? new Date().toISOString()
        : run.tracking_state.completed_at,
    completion_payload: {
      tool: validatedUpdate.tool,
      external_task_id: validatedUpdate.external_task_id,
      external_task_url: validatedUpdate.external_task_url,
      status_after_update: validatedUpdate.status_after_update as TaskLifecycleState['status'],
      attempted: validatedUpdate.attempted,
      result: validatedUpdate.result,
      evidence_refs: validatedUpdate.evidence_refs,
      summary: 'summary' in validatedUpdate ? validatedUpdate.summary : '',
    },
  };

  return advanceOrchestratorRun(run, {
    target_state: 'validation',
    tracking_state: nextTrackingState,
  });
}

// ─── Advance to next sequential state ────────────────────────────────────────

const SEQUENTIAL_ORDER: OrchestratorRunState[] = [
  'intake',
  'project_resolution',
  'context_pack',
  'workflow_selection',
  'agent_assignment',
  'validation',
  'approval_gate',
  'artifact_persistence',
  'completion_report',
  'audit_write',
  'completed',
];

export function advanceToNext(
  run: OrchestratorRun,
  opts?: Partial<AdvanceInput>
): OrchestratorRun {
  const currentIdx = SEQUENTIAL_ORDER.indexOf(run.state);
  if (currentIdx === -1 || currentIdx >= SEQUENTIAL_ORDER.length - 1) {
    throw new Error(`Cannot advance from state "${run.state}".`);
  }

  const next_state = SEQUENTIAL_ORDER[currentIdx + 1];
  return advanceOrchestratorRun(run, { target_state: next_state, ...opts });
}

// ─── Fail ────────────────────────────────────────────────────────────────────

export function failRun(
  run: OrchestratorRun,
  message: string,
  recoverable = true
): OrchestratorRun {
  return advanceOrchestratorRun(run, {
    target_state: 'failed',
    error: {
      state: run.state,
      message,
      timestamp: new Date().toISOString(),
      recoverable,
    },
  });
}

// ─── Audit Record ────────────────────────────────────────────────────────────

export function toAuditRecord(
  run: OrchestratorRun,
  assumptions: string[] = [],
  confidence = 100
): OrchestratorAuditRecord {
  return {
    run_id: run.run_id,
    project_id: run.project_id,
    workflow_id: run.workflow_id,
    trigger: run.trigger,
    started_at: run.started_at,
    completed_at: run.completed_at,
    final_state: run.state,
    agents_used: run.assigned_agents,
    inputs: run.context_pack
      ? [
          `project_id: ${run.context_pack.project_id}`,
          `methodology: ${run.context_pack.methodology}`,
          `project_type: ${run.context_pack.project_type}`,
        ]
      : [],
    outputs: run.artifacts.map(a => `${a.type}: ${a.path}`),
    approvals: run.approvals_required,
    errors: run.errors.map(e => `[${e.state}] ${e.message}`),
    assumptions,
    confidence,
  };
}
