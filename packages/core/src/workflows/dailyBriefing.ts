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

const priorityRank: Record<DailyBriefingPriority, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
};

function titlesFor(items: DailyBriefingInputItem[], type: DailyBriefingItemType): string[] {
  return items.filter(item => item.type === type).map(item => item.title);
}

function sourceCoverage(input: DailyBriefingInput): string[] {
  const available = Array.from(new Set(input.items.map(item => item.source))).sort();
  const unavailable = (input.unavailableSources ?? []).map(source => `unavailable:${source}`);
  return [...available, ...unavailable];
}

function confidenceFor(input: DailyBriefingInput): number {
  const unavailablePenalty = (input.unavailableSources?.length ?? 0) * 10;
  const emptyPenalty = input.items.length === 0 ? 30 : 0;
  return Math.max(40, 100 - unavailablePenalty - emptyPenalty);
}

export function generateDailyBriefing(input: DailyBriefingInput): DailyBriefing {
  const sorted = [...input.items].sort((a, b) => {
    const aRank = priorityRank[a.priority ?? 'medium'];
    const bRank = priorityRank[b.priority ?? 'medium'];
    return aRank - bRank;
  });

  return {
    projectId: input.projectId,
    date: input.date,
    topPriorities: sorted
      .filter(item => item.type === 'priority' || item.type === 'blocker' || item.type === 'meeting' || item.type === 'risk')
      .slice(0, 3)
      .map(item => item.title),
    meetingsToPrepare: titlesFor(input.items, 'meeting'),
    urgentBlockers: titlesFor(input.items, 'blocker'),
    risksToReview: titlesFor(input.items, 'risk'),
    pendingApprovals: titlesFor(input.items, 'approval'),
    suggestedFollowups: titlesFor(input.items, 'follow_up'),
    sourceCoverage: sourceCoverage(input),
    assumptions: input.assumptions ?? [],
    confidence: confidenceFor(input),
  };
}

