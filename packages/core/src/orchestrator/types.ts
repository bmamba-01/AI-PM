/**
 * Orchestrator State Machine — Types
 *
 * Defines the PM Orchestrator run states and data contracts.
 * This is a pure/local state machine — no external MCP calls.
 */

// ─── Run States ──────────────────────────────────────────────────────────────

export const ORCHESTRATOR_STATES = [
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
  'failed',
] as const;

export type OrchestratorRunState = (typeof ORCHESTRATOR_STATES)[number];

/**
 * Valid transitions: from → [allowed destinations]
 */
export const STATE_TRANSITIONS: Record<OrchestratorRunState, OrchestratorRunState[]> = {
  intake:              ['project_resolution', 'failed'],
  project_resolution:  ['context_pack', 'failed'],
  context_pack:        ['workflow_selection', 'failed'],
  workflow_selection:  ['agent_assignment', 'failed'],
  agent_assignment:    ['validation', 'failed'],
  validation:          ['approval_gate', 'failed'],
  approval_gate:       ['artifact_persistence', 'failed'],
  artifact_persistence: ['completion_report', 'failed'],
  completion_report:   ['audit_write', 'failed'],
  audit_write:         ['completed', 'failed'],
  completed:           [],
  failed:              [],
};

// ─── Connector Availability ──────────────────────────────────────────────────

export interface ConnectorAvailability {
  github: boolean;
  jira: boolean;
  linear: boolean;
  calendar: boolean;
  email: boolean;
  confluence: boolean;
  notion: boolean;
  slack: boolean;
}

// ─── Project Context Pack ────────────────────────────────────────────────────

export interface ProjectContextPack {
  project_id: string;
  project_root: string;
  methodology: string;
  project_type: string;
  connectors: ConnectorAvailability;
  memory_summary: MemorySummary;
  pending_approvals: number;
  assumptions: string[];
}

export interface MemorySummary {
  total_tasks: number;
  completed_tasks: number;
  total_artifacts: number;
  archived_artifacts: number;
}

// ─── Orchestrator Run ────────────────────────────────────────────────────────

export interface OrchestratorRun {
  run_id: string;
  project_id: string;
  workflow_id: string;
  state: OrchestratorRunState;
  trigger: RunTrigger;
  context_pack: ProjectContextPack | null;
  assigned_agents: string[];
  artifacts: RunArtifact[];
  approvals_required: string[];
  errors: RunError[];
  started_at: string;
  updated_at: string;
  completed_at: string | null;
}

export interface RunTrigger {
  type: 'manual' | 'scheduled' | 'chat' | 'cli' | 'desktop' | 'mobile';
  actor: string;
  command?: string;
}

export interface RunArtifact {
  name: string;
  path: string;
  type: 'report' | 'template' | 'issue' | 'pr' | 'note' | 'test_plan' | 'risk_register' | 'audit';
}

export interface RunError {
  state: OrchestratorRunState;
  message: string;
  timestamp: string;
  recoverable: boolean;
}

// ─── Audit Output ────────────────────────────────────────────────────────────

export interface OrchestratorAuditRecord {
  run_id: string;
  project_id: string;
  workflow_id: string;
  trigger: RunTrigger;
  started_at: string;
  completed_at: string | null;
  final_state: OrchestratorRunState;
  agents_used: string[];
  inputs: string[];
  outputs: string[];
  approvals: string[];
  errors: string[];
  assumptions: string[];
  confidence: number;
}
