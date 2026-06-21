/**
 * Agent Capability Registry
 *
 * Static registry of PM/BA/QA/Developer/Tech Lead/Code Quality/Reporting/
 * Meeting/Risk/Delivery Control agents with their supported workflows,
 * inputs, outputs, approval boundaries, and MCP capabilities.
 *
 * All data is local — no network calls, no vendor APIs.
 */

// ─── Types ──────────────────────────────────────────────────────────────────

export type AgentRole =
  | 'pm_commander'
  | 'ba_analyst'
  | 'qa_engineer'
  | 'developer'
  | 'tech_lead'
  | 'code_quality_guard'
  | 'reporting'
  | 'meeting_intelligence'
  | 'risk_manager'
  | 'delivery_control';

export type CapabilityType = 'read' | 'mutation' | 'approval_gate';

export interface ApprovalBoundary {
  requiresApproval: boolean;
  approvalScope: 'all_mutations' | 'external_only' | 'none';
  escalationRole: 'pm_commander' | 'human';
}

export interface AgentCapability {
  id: string;
  role: AgentRole;
  displayName: string;
  description: string;
  supportedWorkflows: string[];
  requiredInputs: string[];
  producedOutputs: string[];
  outputFormats: string[];
  approvalBoundary: ApprovalBoundary;
  requiredMcpCapabilities: string[];
  optionalMcpCapabilities: string[];
}

export interface AgentRouteResult {
  workflowId: string;
  primaryAgent: AgentCapability;
  supportingAgents: AgentCapability[];
  approvalRequired: boolean;
  estimatedSteps: string[];
}

// ─── Static Registry ────────────────────────────────────────────────────────

const CAPABILITY_REGISTRY: AgentCapability[] = [
  {
    id: 'pm-commander',
    role: 'pm_commander',
    displayName: 'PM Commander',
    description: 'Project Manager orchestrator. Owns project context, methodology, and final decisions.',
    supportedWorkflows: ['daily-briefing', 'weekly-report', 'risk-control', 'scope-control', 'code-quality-guard'],
    requiredInputs: ['project_root', 'methodology', 'connector_availability'],
    producedOutputs: ['context_pack', 'execution_plan'],
    outputFormats: ['json', 'markdown'],
    approvalBoundary: { requiresApproval: false, approvalScope: 'none', escalationRole: 'human' },
    requiredMcpCapabilities: [],
    optionalMcpCapabilities: ['github', 'jira', 'calendar'],
  },
  {
    id: 'ba-analyst',
    role: 'ba_analyst',
    displayName: 'BA Analyst',
    description: 'Business Analyst. Handles scope control, requirements, and change requests.',
    supportedWorkflows: ['scope-control'],
    requiredInputs: ['project_id', 'scope_baseline', 'requirements'],
    producedOutputs: ['scope_diff', 'change_request', 'requirement_traceability'],
    outputFormats: ['json', 'markdown', 'csv'],
    approvalBoundary: { requiresApproval: true, approvalScope: 'all_mutations', escalationRole: 'pm_commander' },
    requiredMcpCapabilities: ['jira'],
    optionalMcpCapabilities: ['notion', 'confluence'],
  },
  {
    id: 'qa-engineer',
    role: 'qa_engineer',
    displayName: 'QA Engineer',
    description: 'Quality Assurance. Manages test plans, test execution, and quality gates.',
    supportedWorkflows: ['code-quality-guard'],
    requiredInputs: ['project_id', 'code_changes', 'test_cases'],
    producedOutputs: ['test_report', 'quality_gate', 'regression_plan'],
    outputFormats: ['json', 'markdown'],
    approvalBoundary: { requiresApproval: false, approvalScope: 'none', escalationRole: 'pm_commander' },
    requiredMcpCapabilities: ['github'],
    optionalMcpCapabilities: ['jira'],
  },
  {
    id: 'developer',
    role: 'developer',
    displayName: 'Developer Agent',
    description: 'Implementation plan, code changes, refactor plan, and test creation.',
    supportedWorkflows: ['code-quality-guard'],
    requiredInputs: ['project_id', 'implementation_spec', 'codebase_context'],
    producedOutputs: ['code_changes', 'implementation_plan', 'test_code'],
    outputFormats: ['json', 'diff', 'file'],
    approvalBoundary: { requiresApproval: true, approvalScope: 'external_only', escalationRole: 'pm_commander' },
    requiredMcpCapabilities: ['github'],
    optionalMcpCapabilities: ['jira'],
  },
  {
    id: 'tech-lead',
    role: 'tech_lead',
    displayName: 'Tech Lead',
    description: 'Technical Lead. Reviews code, architecture decisions, and technical risks.',
    supportedWorkflows: ['code-quality-guard'],
    requiredInputs: ['project_id', 'code_diff', 'architecture_context'],
    producedOutputs: ['tech_review', 'architecture_advice'],
    outputFormats: ['json', 'markdown'],
    approvalBoundary: { requiresApproval: true, approvalScope: 'external_only', escalationRole: 'pm_commander' },
    requiredMcpCapabilities: ['github'],
    optionalMcpCapabilities: ['jira'],
  },
  {
    id: 'code-quality-guard',
    role: 'code_quality_guard',
    displayName: 'Code Quality Guard',
    description: 'Automated code quality checks. Validates PRs against project standards.',
    supportedWorkflows: ['code-quality-guard'],
    requiredInputs: ['project_id', 'pr_diff', 'quality_rules'],
    producedOutputs: ['quality_report', 'pr_comments'],
    outputFormats: ['json', 'markdown'],
    approvalBoundary: { requiresApproval: true, approvalScope: 'external_only', escalationRole: 'pm_commander' },
    requiredMcpCapabilities: ['github'],
    optionalMcpCapabilities: [],
  },
  {
    id: 'reporting-agent',
    role: 'reporting',
    displayName: 'Reporting Agent',
    description: 'Generates reports (daily, weekly, monthly). Aggregates data from multiple sources.',
    supportedWorkflows: ['daily-briefing', 'weekly-report'],
    requiredInputs: ['project_id', 'date_range', 'source_data'],
    producedOutputs: ['report', 'executive_summary'],
    outputFormats: ['json', 'markdown', 'html'],
    approvalBoundary: { requiresApproval: true, approvalScope: 'external_only', escalationRole: 'pm_commander' },
    requiredMcpCapabilities: ['jira'],
    optionalMcpCapabilities: ['github', 'confluence', 'notion', 'calendar', 'email'],
  },
  {
    id: 'meeting-intelligence',
    role: 'meeting_intelligence',
    displayName: 'Meeting Intelligence',
    description: 'Processes meeting transcripts, extracts action items, and generates follow-ups.',
    supportedWorkflows: ['daily-briefing'],
    requiredInputs: ['project_id', 'meeting_transcripts'],
    producedOutputs: ['action_items', 'follow_ups', 'decisions'],
    outputFormats: ['json', 'markdown'],
    approvalBoundary: { requiresApproval: false, approvalScope: 'none', escalationRole: 'pm_commander' },
    requiredMcpCapabilities: ['calendar'],
    optionalMcpCapabilities: ['notion'],
  },
  {
    id: 'risk-manager',
    role: 'risk_manager',
    displayName: 'Risk Manager',
    description: 'Manages project risk register. Tracks, assesses, and mitigates risks.',
    supportedWorkflows: ['risk-control'],
    requiredInputs: ['project_id', 'risk_data', 'project_context'],
    producedOutputs: ['risk_summary', 'mitigation_plan'],
    outputFormats: ['json', 'markdown'],
    approvalBoundary: { requiresApproval: true, approvalScope: 'all_mutations', escalationRole: 'pm_commander' },
    requiredMcpCapabilities: ['jira'],
    optionalMcpCapabilities: ['github', 'notion'],
  },
  {
    id: 'delivery-control',
    role: 'delivery_control',
    displayName: 'Delivery Control',
    description: 'Owns timeline, milestones, dependencies, scope movement, capacity signals, and delivery forecast.',
    supportedWorkflows: ['scope-control', 'weekly-report'],
    requiredInputs: ['project_id', 'timeline_data', 'milestone_data'],
    producedOutputs: ['delivery_forecast', 'dependency_report', 'capacity_signal'],
    outputFormats: ['json', 'markdown'],
    approvalBoundary: { requiresApproval: true, approvalScope: 'all_mutations', escalationRole: 'pm_commander' },
    requiredMcpCapabilities: ['jira'],
    optionalMcpCapabilities: ['github', 'confluence'],
  },
];

// ─── Public API ─────────────────────────────────────────────────────────────

/**
 * Get all registered agent capabilities.
 */
export function getAllCapabilities(): AgentCapability[] {
  return [...CAPABILITY_REGISTRY];
}

/**
 * Get a single agent capability by ID.
 */
export function getCapabilityById(id: string): AgentCapability | undefined {
  return CAPABILITY_REGISTRY.find(a => a.id === id);
}

/**
 * Get all agents that support a given workflow.
 */
export function getCapabilitiesForWorkflow(workflowId: string): AgentCapability[] {
  return CAPABILITY_REGISTRY.filter(a => a.supportedWorkflows.includes(workflowId));
}

/**
 * Route a workflow to the best-fit agent(s).
 * Returns the primary assigned agent, supporting agents, and approval status.
 */
export function routeCapability(workflowId: string): AgentRouteResult | null {
  const candidates = getCapabilitiesForWorkflow(workflowId);
  if (candidates.length === 0) return null;

  // Primary agent: first candidate with fewest required MCP capabilities (most self-sufficient)
  const primary = candidates.reduce((best, curr) =>
    curr.requiredMcpCapabilities.length < best.requiredMcpCapabilities.length ? curr : best,
  );

  // Supporting agents: all agents that handle this workflow (excluding primary)
  const supporting = candidates.filter(a => a.id !== primary.id);

  // Approval required if any agent in the chain needs it
  const approvalRequired = [primary, ...supporting].some(a => a.approvalBoundary.requiresApproval);

  // Estimate steps based on approval requirements
  const estimatedSteps = [
    'intake',
    'context_loading',
    'agent_execution',
    'validation',
    ...(approvalRequired ? ['approval_gate'] : []),
    'artifact_persistence',
    'completion_report',
  ];

  return {
    workflowId,
    primaryAgent: primary,
    supportingAgents: supporting,
    approvalRequired,
    estimatedSteps,
  };
}

/**
 * Get capability registry summary (for CLI output).
 */
export function getCapabilityRegistrySummary(): {
  totalAgents: number;
  roles: AgentRole[];
  workflows: string[];
  agentsWithApproval: number;
} {
  const roles = [...new Set(CAPABILITY_REGISTRY.map(a => a.role))];
  const workflows = [...new Set(CAPABILITY_REGISTRY.flatMap(a => a.supportedWorkflows))].sort();
  const agentsWithApproval = CAPABILITY_REGISTRY.filter(a => a.approvalBoundary.requiresApproval).length;

  return {
    totalAgents: CAPABILITY_REGISTRY.length,
    roles,
    workflows,
    agentsWithApproval,
  };
}
