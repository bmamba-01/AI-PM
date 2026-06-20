export type DailyBriefingItemType = 'priority' | 'meeting' | 'blocker' | 'risk' | 'approval' | 'follow_up';
export type DailyBriefingPriority = 'critical' | 'high' | 'medium' | 'low';
export interface DailyBriefingInputItem {
    source: string;
    type: DailyBriefingItemType;
    title: string;
    priority?: DailyBriefingPriority;
}
export interface DailyBriefingInput {
    projectId: string;
    date: string;
    items: DailyBriefingInputItem[];
    unavailableSources?: string[];
    assumptions?: string[];
}
export interface DailyBriefing {
    projectId: string;
    date: string;
    topPriorities: string[];
    meetingsToPrepare: string[];
    urgentBlockers: string[];
    risksToReview: string[];
    pendingApprovals: string[];
    suggestedFollowups: string[];
    sourceCoverage: string[];
    assumptions: string[];
    confidence: number;
}
export declare function generateDailyBriefing(input: DailyBriefingInput): DailyBriefing;
//# sourceMappingURL=dailyBriefing.d.ts.map