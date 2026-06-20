import type { DailyBriefingInputItem } from '../workflows/dailyBriefing.js';
export type WorkflowAuditStatus = 'completed' | 'blocked' | 'failed';
export interface WorkflowAuditInput {
    workflowId: string;
    projectId: string;
    status: WorkflowAuditStatus;
    startedAt: string;
    completedAt: string;
    outputSummary: string;
    sourceCoverage: string[];
    assumptions: string[];
}
export interface WorkflowAuditRecord extends WorkflowAuditInput {
    runId: string;
}
export declare class LocalProjectStore {
    private readonly projectRoot;
    private readonly aiPmDir;
    private readonly auditDir;
    constructor(projectRoot: string);
    ensureProjectDirs(): Promise<void>;
    loadDailyBriefingItems(): Promise<DailyBriefingInputItem[]>;
    appendWorkflowAudit(input: WorkflowAuditInput): Promise<string>;
    loadWorkflowAuditRecords(): Promise<WorkflowAuditRecord[]>;
}
//# sourceMappingURL=localProjectStore.d.ts.map