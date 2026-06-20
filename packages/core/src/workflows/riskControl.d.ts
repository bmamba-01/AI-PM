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
export declare function generateRiskControlSummary(input: RiskControlInput): RiskControlSummary;
export declare function listProjectRisks(options: {
    store: MemoryStore;
}): Promise<Risk[]>;
export declare function addProjectRisk(options: {
    store: MemoryStore;
    localStore: LocalProjectStore;
    approvalQueue: ApprovalQueue;
    input: RiskInput;
}): Promise<{
    risk: Risk;
    approvalItemId: string | null;
}>;
export declare function closeProjectRisk(options: {
    store: MemoryStore;
    localStore: LocalProjectStore;
    approvalQueue: ApprovalQueue;
    riskId: string;
    evidence?: string;
}): Promise<{
    risk: Risk | null;
    approvalItemId: string | null;
}>;
//# sourceMappingURL=riskControl.d.ts.map