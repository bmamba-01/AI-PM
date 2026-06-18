import { describe, expect, it } from 'vitest';
import { generateDailyBriefing } from './dailyBriefing.js';

describe('generateDailyBriefing', () => {
  it('prioritizes blockers, meetings, risks, approvals, and follow ups from local inputs', () => {
    const briefing = generateDailyBriefing({
      projectId: 'alpha',
      date: '2026-06-18',
      items: [
        { source: 'jira', type: 'blocker', title: 'Payment API is blocked', priority: 'critical' },
        { source: 'calendar', type: 'meeting', title: 'Client scope review', priority: 'high' },
        { source: 'risk-register', type: 'risk', title: 'UAT environment not ready', priority: 'high' },
        { source: 'github', type: 'approval', title: 'Approve release PR', priority: 'medium' },
        { source: 'email', type: 'follow_up', title: 'Reply to vendor estimate', priority: 'low' },
      ],
      unavailableSources: ['gmail'],
    });

    expect(briefing.projectId).toBe('alpha');
    expect(briefing.topPriorities).toEqual(['Payment API is blocked', 'Client scope review', 'UAT environment not ready']);
    expect(briefing.urgentBlockers).toEqual(['Payment API is blocked']);
    expect(briefing.meetingsToPrepare).toEqual(['Client scope review']);
    expect(briefing.risksToReview).toEqual(['UAT environment not ready']);
    expect(briefing.pendingApprovals).toEqual(['Approve release PR']);
    expect(briefing.suggestedFollowups).toEqual(['Reply to vendor estimate']);
    expect(briefing.sourceCoverage).toContain('unavailable:gmail');
    expect(briefing.confidence).toBeLessThan(100);
  });
});

