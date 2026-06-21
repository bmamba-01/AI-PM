import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { generateDailyBriefing, type DailyBriefingInput, type DailyBriefing } from '../workflows/dailyBriefing.js';
import { LocalProjectStore } from '../runtime/localProjectStore.js';

const tempRoots: string[] = [];

async function tempRoot(): Promise<string> {
  const root = await mkdtemp(path.join(tmpdir(), 'ai-pm-daily-integration-'));
  tempRoots.push(root);
  return root;
}

afterEach(async () => {
  await Promise.all(tempRoots.splice(0).map(root => rm(root, { recursive: true, force: true })));
});

describe('DailyBriefing — integration', () => {
  it('full run: project setup → generate → audit record → artifact reference', async () => {
    const root = await tempRoot();
    const projectId = 'proj-daily-int';
    const store = new LocalProjectStore(root);
    await store.ensureProjectDirs();

    const input: DailyBriefingInput = {
      projectId,
      date: '2026-06-21',
      items: [
        { source: 'jira', type: 'priority', title: 'Fix login regression' },
        { source: 'jira', type: 'blocker', title: 'Staging DB down' },
        { source: 'calendar', type: 'meeting', title: 'Sprint planning' },
        { source: 'risk-register', type: 'risk', title: 'Third-party API deprecation' },
        { source: 'approval-queue', type: 'approval', title: 'Publish weekly report' },
        { source: 'slack', type: 'follow_up', title: 'Follow up with vendor on SLA' },
      ],
      unavailableSources: ['github', 'email'],
      assumptions: ['Live data replaced with synthetic items for test.'],
    };

    const briefing = generateDailyBriefing(input);

    // Verify artifact shape (output is the artifact)
    expect(briefing.projectId).toBe(projectId);
    expect(briefing.date).toBe('2026-06-21');
    expect(Array.isArray(briefing.topPriorities)).toBe(true);
    expect(Array.isArray(briefing.meetingsToPrepare)).toBe(true);
    expect(Array.isArray(briefing.urgentBlockers)).toBe(true);
    expect(Array.isArray(briefing.risksToReview)).toBe(true);
    expect(Array.isArray(briefing.pendingApprovals)).toBe(true);
    expect(Array.isArray(briefing.suggestedFollowups)).toBe(true);
    expect(Array.isArray(briefing.sourceCoverage)).toBe(true);
    expect(Array.isArray(briefing.assumptions)).toBe(true);
    expect(typeof briefing.confidence).toBe('number');

    // Verify source coverage includes both available and unavailable markers
    expect(briefing.sourceCoverage).toContain('approval-queue');
    expect(briefing.sourceCoverage).toContain('unavailable:github');
    expect(briefing.sourceCoverage).toContain('unavailable:email');

    // Verify unavailable sources deduction in confidence
    expect(briefing.confidence).toBe(80); // 100 - 2*10 unavailable, items present => 80

    // Persist audit record (simulating orchestrator / workflow runner behavior)
    await store.appendWorkflowAudit({
      workflowId: 'daily-briefing',
      projectId,
      status: 'completed',
      startedAt: '2026-06-21T00:00:00.000Z',
      completedAt: '2026-06-21T00:01:00.000Z',
      outputSummary: `Daily briefing generated with ${briefing.topPriorities.length} priorities, ${briefing.urgentBlockers.length} blockers.`,
      sourceCoverage: briefing.sourceCoverage,
      assumptions: briefing.assumptions,
    });

    // Verify audit record persisted and loadable
    const records = await store.loadWorkflowAuditRecords();
    expect(records).toHaveLength(1);
    expect(records[0].workflowId).toBe('daily-briefing');
    expect(records[0].status).toBe('completed');
    expect(records[0].outputSummary).toContain('priorities');
    expect(records[0].sourceCoverage).toEqual(briefing.sourceCoverage);
  });

  it('source coverage tracking: available vs unavailable sources', () => {
    const input: DailyBriefingInput = {
      projectId: 'proj-source-coverage',
      date: '2026-06-21',
      items: [{ source: 'jira', type: 'priority', title: 'A' }],
      unavailableSources: ['slack', 'calendar'],
    };

    const briefing = generateDailyBriefing(input);
    expect(briefing.sourceCoverage).toEqual(['jira', 'unavailable:slack', 'unavailable:calendar']);
  });

  it('confidence drops with unavailable sources and empty items', () => {
    const input: DailyBriefingInput = {
      projectId: 'proj-confidence',
      date: '2026-06-21',
      items: [],
      unavailableSources: ['jira', 'slack', 'calendar'],
    };

    const briefing = generateDailyBriefing(input);
    expect(briefing.confidence).toBe(40); // 100 - 3*10 - 30 = 40, clamped to min 40
  });
});
