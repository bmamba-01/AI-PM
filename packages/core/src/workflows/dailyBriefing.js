const priorityRank = {
    critical: 0,
    high: 1,
    medium: 2,
    low: 3,
};
function titlesFor(items, type) {
    return items.filter(item => item.type === type).map(item => item.title);
}
function sourceCoverage(input) {
    const available = Array.from(new Set(input.items.map(item => item.source))).sort();
    const unavailable = (input.unavailableSources ?? []).map(source => `unavailable:${source}`);
    return [...available, ...unavailable];
}
function confidenceFor(input) {
    const unavailablePenalty = (input.unavailableSources?.length ?? 0) * 10;
    const emptyPenalty = input.items.length === 0 ? 30 : 0;
    return Math.max(40, 100 - unavailablePenalty - emptyPenalty);
}
export function generateDailyBriefing(input) {
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
//# sourceMappingURL=dailyBriefing.js.map