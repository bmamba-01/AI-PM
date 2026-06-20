import type { LocalProjectStore } from '../runtime/localProjectStore.js';
import type { ApprovalQueue } from '../runtime/approvalQueue.js';
export type WeeklyReportInputItem = {
    source: string;
    section: 'accomplishment' | 'milestone' | 'risk' | 'issue' | 'change_request' | 'decision' | 'next_week' | 'dependency';
    title: string;
    status?: string;
    target_date?: string;
    owner?: string;
};
export interface WeeklyReportInput {
    projectId: string;
    reportingPeriodStart: string;
    reportingPeriodEnd: string;
    reportDate: string;
    items: WeeklyReportInputItem[];
    unavailableSources?: string[];
    assumptions?: string[];
}
export interface WeeklyReport {
    projectId: string;
    reportingPeriodStart: string;
    reportingPeriodEnd: string;
    reportDate: string;
    rag: Record<string, 'green' | 'amber' | 'red' | 'unknown'>;
    accomplishments: string[];
    scheduleStatus: {
        baselineFinish: string;
        forecastFinish: string;
        varianceDays: number;
        criticalPathImpact: string;
    };
    riskSummary: string[];
    changeSummary: string[];
    decisions: string[];
    nextWeekFocus: string[];
    milestones: Array<{
        name: string;
        dueDate: string;
        target_date?: string;
        daysRemaining: number;
    }>;
    resourceBudget: string;
    metricsQuality: string[];
    dependencies: string[];
    leadershipActions: string[];
    sourceCoverage: string[];
    assumptions: string[];
    confidence: number;
}
export declare function generateWeeklyReport(input: WeeklyReportInput): WeeklyReport;
export declare function generateWeeklyReportForProject(options: {
    projectRoot: string;
    reportingPeriodStart: string;
    reportingPeriodEnd: string;
    store: LocalProjectStore;
    approvalQueue: ApprovalQueue;
}): Promise<{
    report: WeeklyReport;
    approvalItemId: string | null;
}>;
//# sourceMappingURL=weeklyReport.d.ts.map