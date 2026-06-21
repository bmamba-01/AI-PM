/**
 * Agent Capability Registry
 *
 * Local, static registry of PM/BA/QA/Tech Lead/Code Quality/Reporting/
 * Meeting/Risk agents with their supported workflows, inputs, outputs,
 * and approval boundaries.
 *
 * All data is local — no network calls, no vendor APIs.
 * This replaces the static getAgentStatus() in the CLI with a queryable registry.
 */

// ─── Types ──────────────────────────────────────────────────────────────────

export type AgentRole =
  | 'pm_commander'
  | 'ba_analyst'
  | 'qa_engineer'
  | 'tech_lead'
  | 'code_quality_guard'
  | 'reporting'
  | 'meeting_intelligence'
  | 'risk_manager'
  | 'scope_controller'
  | 'daily_briefing'
  | 'agent_supervisor';

export interface ApprovalBoundary {
  requiresApproval: boolean;
  approvalScope: 'all_mutations' | 'external_only' | 'none';
  escalationRole: 'pm_commander' | 'human';
}

export interface AgentDefinition {
  id: string;
  role: AgentRole;
  displayName: string;
  description: string;
  supportedWorkflows: string[];
  requiredInputs: string[];
  producedOutputs: string[];
  approvalBoundary: ApprovalBoundary;
  requiredConnectors: string[];
  optionalConnectors: string[];
}

export interface AgentRouteResult {
  workflowId: string;
  assignedAgent: AgentDefinition;
  requiredAgents: AgentDefinition[];
  approvalRequired: boolean;
  estimatedSteps: string[];
}

// ─── Static Registry ────────────────────────────────────────────────────────

const AGENT_REGISTRY: AgentDefinition[] = [
  {
    id: 'pm-commander',
    role: 'pm_commander',
    displayName: 'PM Commander',
    description: 'Project Manager orchestrator. Owns project context, methodology, and final decisions.',
    supportedWorkflows: ['daily-briefing', 'weekly-report', 'risk-control', 'scope-control'],
    requiredInputs: ['project_root', 'methodology', 'connector_availability'],
    producedOutputs: ['context_pack', 'execution_plan'],
    approvalBoundary: {
      requiresApproval: false,
      approvalScope: 'none',
      escalationRole: 'human',
    },
    requiredConnectors: [],
    optionalConnectors: ['github', 'jira', 'calendar'],
  },
  {
    id: 'ba-analyst',
    role: 'ba_analyst',
    displayName: 'BA Analyst',
    description: 'Business Analyst. Handles scope control, requirements, and change requests.',
    supportedWorkflows: ['scope-control'],
    requiredInputs: ['project_id', 'scope_baseline'],
    producedOutputs: ['scope_diff', 'change_request'],
    approvalBoundary: {
      requiresApproval: true,
      approvalScope: 'all_mutations',
      escalationRole: 'pm_commander',
    },
    requiredConnectors: ['jira'],
    optionalConnectors: ['notion', 'confluence'],
  },
  {
    id: 'qa-engineer',
    role: 'qa_engineer',
    displayName: 'QA Engineer',
    description: 'Quality Assurance. Manages test plans, test execution, and quality gates.',
    supportedWorkflows: ['code-quality-guard'],
    requiredInputs: ['project_id', 'code_changes'],
    producedOutputs: ['test_report', 'quality_gate'],
    approvalBoundary: {
      requiresApproval: false,
      approvalScope: 'none',
      escalationRole: 'pm_commander',
    },
    requiredConnectors: ['github'],
    optionalConnectors: ['jira'],
  },
  {
    id: 'tech-lead',
    role: 'tech_lead',
    displayName: 'Tech Lead',
    description: 'Technical Lead. Reviews code, architecture decisions, and technical risks.',
    supportedWorkflows: ['code-quality-guard'],
    requiredInputs: ['project_id', 'code_diff'],
    producedOutputs: ['tech_review', 'architecture_advice'],
    approvalBoundary: {
      requiresApproval: true,
      approvalScope: 'external_only',
      escalationRole: 'pm_commander',
    },
    requiredConnectors: ['github'],
    optionalConnectors: ['jira'],
  },
  {
    id: 'code-quality-guard',
    role: 'code_quality_guard',
    displayName: 'Code Quality Guard',
    description: 'Automated code quality checks. Validates PRs against project standards.',
    supportedWorkflows: ['code-quality-guard'],
    requiredInputs: ['project_id', 'pr_diff'],
    producedOutputs: ['quality_report', 'pr_comments'],
    approvalBoundary: {
      requiresApproval: true,
      approvalScope: 'external_only',
      escalationRole: 'pm_commander',
    },
    requiredConnectors: ['github'],
    optionalConnectors: [],
  },
  {
    id: 'reporting-agent',
    role: 'reporting',
    displayName: 'Reporting Agent',
    description: 'Generates reports (daily, weekly, monthly). Aggregates data from multiple sources.',
    supportedWorkflows: ['daily-briefing', 'weekly-report'],
    requiredInputs: ['project_id', 'date_range', 'source_data'],
    producedOutputs: ['report', 'executive_summary'],
    approvalBoundary: {
      requiresApproval: true,
      approvalScope: 'external_only',
      escalationRole: 'pm_commander',
    },
    requiredConnectors: ['jira'],
    optionalConnectors: ['github', 'confluence', 'notion', 'calendar', 'email'],
  },
  {
    id: 'meeting-intelligence',
    role: 'meeting_intelligence',
    displayName: 'Meeting Intelligence',
    description: 'Processes meeting transcripts, extracts action items, and generates follow-ups.',
    supportedWorkflows: ['daily-briefing'],
    requiredInputs: ['project_id', 'meeting_transcripts'],
    producedOutputs: ['action_items', 'follow_ups', 'decisions'],
    approvalBoundary: {
      requiresApproval: false,
      approvalScope: 'none',
      escalationRole: 'pm_commander',
    },
    requiredConnectors: ['calendar'],
    optionalConnectors: ['notion'],
  },
  {
    id: 'risk-manager',
    role: 'risk_manager',
    displayName: 'Risk Manager',
    description: 'Manages project risk register. Tracks, assesses, and mitigates risks.',
    supportedWorkflows: ['risk-control'],
    requiredInputs: ['project_id', 'risk_data'],
    producedOutputs: ['risk_summary', 'mitigation_plan'],
    approvalBoundary: {
      requiresApproval: true,
      approvalScope: 'all_mutations',
      escalationRole: 'pm_commander',
    },
    requiredConnectors: ['jira'],
    optionalConnectors: ['github', 'notion'],
  },
  {
    id: 'scope-controller',
    role: 'scope_controller',
    displayName: 'Scope Controller',
    description: 'Monitors scope baseline, detects scope creep, and manages change requests.',
    supportedWorkflows: ['scope-control'],
    requiredInputs: ['project_id', 'baseline'],
    producedOutputs: ['scope_status', 'change_requests'],
    approvalBoundary: {
      requiresApproval: true,
      approvalScope: 'all_mutations',
      escalationRole: 'pm_commander',
    },
    requiredConnectors: ['jira', 'notion'],
    optionalConnectors: ['github'],
  },
  {
    id: 'daily-briefing-agent',
    role: 'daily_briefing',
    displayName: 'Daily Briefing Agent',
    description: 'Generates daily PM briefing with priorities, blockers, and action items.',
    supportedWorkflows: ['daily-briefing'],
    requiredInputs: ['project_id', 'date'],
    producedOutputs: ['daily_briefing'],
    approvalBoundary: {
      requiresApproval: false,
      approvalScope: 'none',
      escalationRole: 'pm_commander',
    },
    requiredConnectors: ['jira', 'calendar'],
    optionalConnectors: ['github', 'slack'],
  },
  {
    id: 'agent-supervisor',
    role: 'agent_supervisor',
    displayName: 'Agent Supervisor',
    description: 'Monitors agent health, performance, and coordinates multi-agent workflows.',
    supportedWorkflows: ['daily-briefing', 'weekly-report', 'risk-control', 'scope-control', 'code-quality-guard'],
    requiredInputs: ['project_id'],
    producedOutputs: ['supervisor_report', 'agent_health'],
    approvalBoundary: {
      requiresApproval: false,
      approvalScope: 'none',
      escalationRole: 'pm_commander',
    },
    requiredConnectors: [],
    optionalConnectors: ['github', 'jira'],
  },
];

// ─── Public API ─────────────────────────────────────────────────────────────

/**
 * Get all registered agents.
 */
export function getAllAgents(): AgentDefinition[] {
  return [...AGENT_REGISTRY];
}

/**
 * Get a single agent by ID.
 */
export function getAgentById(id: string): AgentDefinition | undefined {
  return AGENT_REGISTRY.find(a => a.id === id);
}

/**
 * Get all agents that support a given workflow.
 */
export function getAgentsForWorkflow(workflowId: string): AgentDefinition[] {
  return AGENT_REGISTRY.filter(a => a.supportedWorkflows.includes(workflowId));
}

/**
 * Route a workflow to the best-fit agent(s).
 * Returns the primary assigned agent, required agents, and approval status.
 */
export function routeWorkflow(workflowId: string): AgentRouteResult | null {
  const candidates = getAgentsForWorkflow(workflowId);
  if (candidates.length === 0) return null;

  // Primary agent: first candidate with fewest required connectors (most self-sufficient)
  const primary = candidates.reduce((best, curr) =>
    curr.requiredConnectors.length < best.requiredConnectors.length ? curr : best,
  );

  // Required agents: all agents that handle this workflow (excluding primary)
  const required = candidates.filter(a => a.id !== primary.id);

  // Approval required if any agent in the chain needs it
  const approvalRequired = [primary, ...required].some(a => a.approvalBoundary.requiresApproval);

  // Estimate steps
  const estimatedSteps = [
    'intake',
    'project_resolution',
    'context_pack',
    'workflow_selection',
    'agent_assignment',
    'validation',
    ...(approvalRequired ? ['approval_gate'] : []),
    'artifact_persistence',
    'completion_report',
    'audit_write',
  ];

  return {
    workflowId,
    assignedAgent: primary,
    requiredAgents: required,
    approvalRequired,
    estimatedSteps,
  };
}

/**
 * Get agent registry summary (for CLI output).
 */
export function getAgentRegistrySummary(): {
  totalAgents: number;
  roles: AgentRole[];
  workflows: string[];
  agentsWithApproval: number;
} {
  const roles = [...new Set(AGENT_REGISTRY.map(a => a.role))];
  const workflows = [...new Set(AGENT_REGISTRY.flatMap(a => a.supportedWorkflows))].sort();
  const agentsWithApproval = AGENT_REGISTRY.filter(a => a.approvalBoundary.requiresApproval).length;

  return {
    totalAgents: AGENT_REGISTRY.length,
    roles,
    workflows,
    agentsWithApproval,
  };
}
