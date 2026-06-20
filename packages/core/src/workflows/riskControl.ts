import type { MemoryStore } from '../runtime/memory.js';
import type { ApprovalQueue } from '../runtime/approvalQueue.js';
import type { LocalProjectStore } from '../runtime/localProjectStore.js';

export type RiskStatus = 'open' | 'mitigating' | 'closed' | 'accepted';
export type RiskProbability = 'low' | 'medium' | 'high';
export type RiskImpact = 'low' | 'medium' | 'high' | 'critical';

export interface RiskInput {
  id?: string;
  projectId: string;
  title: string;
  description?: string;
  category?: string;
  probability: RiskProbability;
  impact: RiskImpact;
  owner?: string;
  mitigation?: string;
  status?: RiskStatus;
  dueDate?: string;
}

export interface Risk extends RiskInput {
  id: string;
  projectId: string;
  status: RiskStatus;
  createdAt: string;
  updatedAt: string;
  closedAt: string | null;
}

export interface RiskControlInput {
  projectId: string;
  risks: RiskInput[];
  unavailableSources?: string[];
  assumptions?: string[];
}

export interface RiskControlSummary {
  projectId: string;
  totalRisks: number;
  openRisks: number;
  closedRisks: number;
  byStatus: Record<RiskStatus, number>;
  byProbability: Record<RiskProbability, number>;
  byImpact: Record<RiskImpact, number>;
  topRisks: string[];
  closedThisPeriod: string[];
  sourceCoverage: string[];
  assumptions: string[];
  confidence: number;
}

function statusCounts(risks: Risk[]): Record<string, number> {
  const counts: Record<string, number> = { open: 0, mitigating: 0, closed: 0, accepted: 0 };
  for (const risk of risks) counts[risk.status] = (counts[risk.status] || 0) + 1;
  return counts;
}

function probabilityCounts(risks: Risk[]): Record<string, number> {
  const counts: Record<string, number> = { low: 0, medium: 0, high: 0 };
  for (const risk of risks) counts[risk.probability] = (counts[risk.probability] || 0) + 1;
  return counts;
}

function impactCounts(risks: Risk[]): Record<string, number> {
  const counts: Record<string, number> = { low: 0, medium: 0, high: 0, critical: 0 };
  for (const risk of risks) counts[risk.impact] = (counts[risk.impact] || 0) + 1;
  return counts;
}

function sourceCoverage(input: RiskControlInput): string[] {
  const available = Array.from(new Set(input.risks.map(_ => 'local-memory'))).sort();
  const unavailable = (input.unavailableSources ?? []).map(source => `unavailable:${source}`);
  return [...available, ...unavailable];
}

function confidenceFor(input: RiskControlInput): number {
  const unavailablePenalty = (input.unavailableSources?.length ?? 0) * 10;
  const emptyPenalty = input.risks.length === 0 ? 30 : 0;
  return Math.max(40, 100 - unavailablePenalty - emptyPenalty);
}

export function generateRiskControlSummary(input: RiskControlInput): RiskControlSummary {
  const risks = input.risks.map<Risk>(risk => ({
    ...risk,
    id: risk.id ?? `RISK-${Math.random().toString(36).slice(2, 9)}`,
    createdAt: risk.createdAt ?? new Date().toISOString(),
    updatedAt: risk.updatedAt ?? new Date().toISOString(),
    closedAt: risk.closedAt ?? null,
    status: risk.status ?? 'open',
  }));

  const openRisks = risks.filter(risk => risk.status !== 'closed');
  const topRisks = openRisks
    .slice()
    .sort((a, b) => {
      const order = ['critical', 'high', 'medium', 'low'];
      const impactDiff = order.indexOf(a.impact) - order.indexOf(b.impact);
      if (impactDiff !== 0) return impactDiff;
      return order.indexOf(a.probability) - order.indexOf(b.probability);
    })
    .slice(0, 5)
    .map(risk => risk.title);

  const closedThisPeriod = risks
    .filter(risk => risk.status === 'closed')
    .map(risk => risk.title);

  return {
    projectId: input.projectId,
    totalRisks: risks.length,
    openRisks: openRisks.length,
    closedRisks: risks.filter(risk => risk.status === 'closed').length,
    byStatus: statusCounts(risks),
    byProbability: probabilityCounts(risks),
    byImpact: impactCounts(risks),
    topRisks,
    closedThisPeriod,
    sourceCoverage: sourceCoverage(input),
    assumptions: input.assumptions ?? [],
    confidence: confidenceFor(input),
  };
}

export async function listProjectRisks(options: {
  store: MemoryStore;
}): Promise<Risk[]> {
  const state = await options.store.getState();
  const now = new Date().toISOString();
  return state.artifacts
    .filter(artifact => artifact.type === 'risk' && (artifact.status === 'active' || artifact.status === 'draft'))
    .map(artifact => {
      const meta = (artifact as any).meta ?? {};
      return {
        id: artifact.artifact_id,
        projectId: artifact.project_id,
        title: meta.title ?? artifact.name,
        description: meta.description ?? '',
        category: meta.category ?? '',
        probability: meta.probability ?? 'medium',
        impact: meta.impact ?? 'medium',
        owner: meta.owner ?? '',
        mitigation: meta.mitigation ?? '',
        status: (meta.status as RiskStatus) ?? 'open',
        dueDate: meta.dueDate ?? undefined,
        createdAt: artifact.created_at,
        updatedAt: artifact.updated_at,
        closedAt: meta.closedAt ?? null,
      } as Risk;
    });
}

export async function addProjectRisk(options: {
  store: MemoryStore;
  localStore: LocalProjectStore;
  approvalQueue: ApprovalQueue;
  input: RiskInput;
}): Promise<{ risk: Risk; approvalItemId: string | null }> {
  const { store, localStore, approvalQueue, input } = options;
  const now = new Date().toISOString();
  const id = input.id ?? `RISK-${Math.random().toString(36).slice(2, 9)}`;
  const artifact = await store.createArtifact({
    project_id: input.projectId,
    name: input.title,
    path: `risk/${id}.json`,
    type: 'risk',
    status: 'active',
    meta: {
      title: input.title,
      description: input.description ?? '',
      category: input.category ?? '',
      probability: input.probability,
      impact: input.impact,
      owner: input.owner ?? '',
      mitigation: input.mitigation ?? '',
      status: input.status ?? 'open',
      dueDate: input.dueDate,
    },
  });

  const risk: Risk = {
    id: artifact.artifact_id,
    projectId: input.projectId,
    title: input.title,
    description: input.description ?? '',
    category: input.category ?? '',
    probability: input.probability,
    impact: input.impact,
    owner: input.owner ?? '',
    mitigation: input.mitigation ?? '',
    status: input.status ?? 'open',
    dueDate: input.dueDate,
    createdAt: artifact.created_at,
    updatedAt: artifact.updated_at,
    closedAt: null,
  };

  await localStore.appendWorkflowAudit({
    workflowId: 'risk-control',
    projectId: input.projectId,
    status: 'completed',
    startedAt: now,
    completedAt: now,
    outputSummary: `Added risk ${risk.id}: ${risk.title}`,
    sourceCoverage: ['local-memory'],
    assumptions: ['New risk recorded from CLI input.'],
  });

  let approvalItemId: string | null = null;
  try {
    const approval = await approvalQueue.createItem({
      project_id: input.projectId,
      action_type: 'close_risk',
      target_system: 'local',
      target_id: risk.id,
      workflow_id: 'risk-control',
      run_id: `risk-control-${Date.now()}`,
      requested_by_agent: 'risk-control-workflow',
      requested_by_role: 'pm',
      title: `Close risk ${risk.id}`,
      description: `Risk closure recorded for ${risk.title}. Approval is required for closure.`,
      summary_diff: `Risk: ${risk.title}\nProbability: ${risk.probability}\nImpact: ${risk.impact}`,
      confidence: 100,
      source_refs: [{ type: 'artifact', id: artifact.artifact_id }],
      priority: risk.impact === 'critical' || risk.impact === 'high' ? 'high' : 'medium',
      assigned_approvers: [],
    });
    approvalItemId = approval.approval_id;
  } catch (error) {
    console.warn('[risk-control] Failed to queue approval item:', error);
  }

  return { risk, approvalItemId };
}

export async function closeProjectRisk(options: {
  store: MemoryStore;
  localStore: LocalProjectStore;
  approvalQueue: ApprovalQueue;
  riskId: string;
  evidence?: string;
}): Promise<{ risk: Risk | null; approvalItemId: string | null }> {
  const { store, localStore, approvalQueue, riskId, evidence } = options;
  const now = new Date().toISOString();

  const state = await store.getState();
  const idx = state.artifacts.findIndex(artifact => artifact.artifact_id === riskId && artifact.type === 'risk');
  if (idx === -1) {
    return { risk: null, approvalItemId: null };
  }

  const artifact = state.artifacts[idx];
  const meta = (artifact as any).meta ?? {};
  const updatedArtifact = {
    ...artifact,
    status: 'archived' as const,
    archived_at: now,
    archive_reason: evidence ?? 'Closed by PM',
    updated_at: now,
    meta: {
      ...meta,
      status: 'closed',
      closedAt: now,
      evidence: evidence ?? '',
    },
  };

  await store.createArtifact({
    project_id: artifact.project_id,
    name: artifact.name,
    path: artifact.path,
    type: artifact.type,
    status: 'archived',
    meta: (updatedArtifact as any).meta,
  });

  const risk: Risk = {
    id: artifact.artifact_id,
    projectId: artifact.project_id,
    title: meta.title ?? artifact.name,
    description: meta.description ?? '',
    category: meta.category ?? '',
    probability: meta.probability ?? 'medium',
    impact: meta.impact ?? 'medium',
    owner: meta.owner ?? '',
    mitigation: meta.mitigation ?? '',
    status: 'closed',
    dueDate: meta.dueDate,
    createdAt: artifact.created_at,
    updatedAt: now,
    closedAt: now,
  };

  await localStore.appendWorkflowAudit({
    workflowId: 'risk-control',
    projectId: artifact.project_id,
    status: 'completed',
    startedAt: now,
    completedAt: now,
    outputSummary: `Closed risk ${risk.id}: ${risk.title}`,
    sourceCoverage: ['local-memory'],
    assumptions: ['Risk closure recorded from CLI input.'],
  });

  let approvalItemId: string | null = null;
  try {
    const approval = await approvalQueue.createItem({
      project_id: artifact.project_id,
      action_type: 'close_risk',
      target_system: 'local',
      target_id: risk.id,
      workflow_id: 'risk-control',
      run_id: `risk-control-${Date.now()}`,
      requested_by_agent: 'risk-control-workflow',
      requested_by_role: 'pm',
      title: `Approve closure of risk ${risk.id}`,
      description: `Risk closure recorded for ${risk.title}. Approval is required for closure.`,
      summary_diff: `Risk: ${risk.title}\nEvidence: ${evidence ?? 'No evidence provided.'}`,
      confidence: 100,
      source_refs: [{ type: 'artifact', id: artifact.artifact_id }],
      priority: 'medium',
      assigned_approvers: [],
    });
    approvalItemId = approval.approval_id;
  } catch (error) {
    console.warn('[risk-control] Failed to queue approval item:', error);
  }

  return { risk, approvalItemId };
}
