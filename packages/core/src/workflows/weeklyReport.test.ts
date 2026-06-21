import { describe, expect, it } from 'vitest';
import { generateWeeklyReport, generateWeeklyReportForProject } from './weeklyReport.js';
import type { WeeklyReportInputItem } from './weeklyReport.js';

const baseItem = (overrides: Partial<WeeklyReportInputItem> = {}): WeeklyReportInputItem => ({
  source: 'local-memory',
  section: 'accomplishment',
  title: 'Delivered onboarding flow',
  status: 'green',
  target_date: '2026-06-21',
  owner: 'PM',
  ...overrides,
});

describe('generateWeeklyReport', () => {
  it('generates a weekly report from local inputs', () => {
    const report = generateWeeklyReport({
      projectId: 'alpha',
      reportingPeriodStart: '2026-06-01',
      reportingPeriodEnd: '2026-06-07',
      reportDate: '2026-06-07',
      items: [
        baseItem(),
        baseItem({ section: 'risk', title: 'Vendor delay', status: 'amber' }),
      ],
      unavailableSources: ['gmail'],
      assumptions: ['Live data unavailable.'],
    });

    expect(report.projectId).toBe('alpha');
    expect(report.accomplishments).toEqual(['Delivered onboarding flow (green) - PM']);
    expect(report.sourceCoverage).toContain('unavailable:gmail');
    expect(report.confidence).toBeLessThan(100);
    expect(report.nextWeekFocus.length).toBe(0);
  });

  it('computes milestone days remaining', () => {
    const report = generateWeeklyReport({
      projectId: 'alpha',
      reportingPeriodStart: '2026-06-01',
      reportingPeriodEnd: '2026-06-07',
      reportDate: '2026-06-07',
      items: [baseItem({ section: 'milestone', target_date: '2026-06-10' })],
    });

    expect(report.milestones[0].dueDate).toBe('2026-06-10');
    expect(report.milestones[0].daysRemaining).toBeGreaterThanOrEqual(0);
  });
});

describe('generateWeeklyReportForProject', () => {
  it('returns a report from local store sources', async () => {
    const fakeStore = {
      appendWorkflowAudit: async () => '',
      createArtifact: async () => ({ artifact_id: 'art-1' } as any),
    } as unknown as import('../runtime/localProjectStore.js').LocalProjectStore;

    const fakeQueue = {
      createItem: async () => ({ approval_id: 'approval-1' } as any),
    } as unknown as import('../runtime/approvalQueue.js').ApprovalQueue;

    const result = await generateWeeklyReportForProject({
      projectRoot: process.cwd(),
      reportingPeriodStart: '2026-06-01',
      reportingPeriodEnd: '2026-06-07',
      store: fakeStore,
      approvalQueue: fakeQueue,
    });

    expect(result.report).toBeDefined();
    expect(result.report.projectId).toBe('local-project');
    expect(result.approvalItemId).toBe('approval-1');
  });

  it('queues approval item when queue is available', async () => {
    const approvals: any[] = [];
    const fakeQueue = {
      createItem: async (input: any) => {
        approvals.push(input);
        return { approval_id: 'approval-2' } as any;
      },
    } as unknown as import('../runtime/approvalQueue.js').ApprovalQueue;

    const fakeStore = { appendWorkflowAudit: async () => '', createArtifact: async () => ({ artifact_id: 'art-1' } as any) } as any;

    const result = await generateWeeklyReportForProject({
      projectRoot: process.cwd(),
      reportingPeriodStart: '2026-06-01',
      reportingPeriodEnd: '2026-06-07',
      store: fakeStore,
      approvalQueue: fakeQueue,
    });

    expect(result.approvalItemId).toBe('approval-2');
    expect(approvals[0].action_type).toBe('publish_weekly_report');
  });

  it('generates markdown, html, and json artifacts', async () => {
    const artifactCalls: any[] = [];
    const fakeStore = {
      appendWorkflowAudit: async () => '',
      createArtifact: async (input: any) => {
        artifactCalls.push(input);
        return { artifact_id: `art-${artifactCalls.length}` } as any;
      },
    } as unknown as import('../runtime/localProjectStore.js').LocalProjectStore;

    const fakeQueue = {
      createItem: async () => ({ approval_id: 'approval-3' } as any),
    } as unknown as import('../runtime/approvalQueue.js').ApprovalQueue;

    const result = await generateWeeklyReportForProject({
      projectRoot: process.cwd(),
      reportingPeriodStart: '2026-06-01',
      reportingPeriodEnd: '2026-06-07',
      store: fakeStore,
      approvalQueue: fakeQueue,
    });

    // Should generate 3 artifacts: markdown, html, json
    expect(result.artifacts).toHaveLength(3);
    expect(result.artifacts.map(a => a.format).sort()).toEqual(['html', 'json', 'markdown']);
    expect(result.artifacts.every(a => a.persisted)).toBe(true);
    expect(result.artifacts.every(a => a.path)).toBe(true);
  });

  it('persists artifact refs in memory store', async () => {
    const artifactCalls: any[] = [];
    const fakeStore = {
      appendWorkflowAudit: async () => '',
      createArtifact: async (input: any) => {
        artifactCalls.push(input);
        return { artifact_id: `art-${artifactCalls.length}` } as any;
      },
    } as unknown as import('../runtime/localProjectStore.js').LocalProjectStore;

    const fakeQueue = {
      createItem: async () => ({ approval_id: 'approval-4' } as any),
    } as unknown as import('../runtime/approvalQueue.js').ApprovalQueue;

    await generateWeeklyReportForProject({
      projectRoot: process.cwd(),
      reportingPeriodStart: '2026-06-01',
      reportingPeriodEnd: '2026-06-07',
      store: fakeStore,
      approvalQueue: fakeQueue,
    });

    // 3 artifacts + 1 audit record = 4 calls to store (audit is separate)
    expect(artifactCalls.length).toBe(3);
    expect(artifactCalls[0].type).toBe('markdown');
    expect(artifactCalls[1].type).toBe('html');
    expect(artifactCalls[2].type).toBe('json');
    for (const call of artifactCalls) {
      expect(call.project_id).toBe('local-project');
      expect(call.status).toBe('active');
      expect(call.name).toMatch(/weekly-report-/);
      expect(call.path).toBeDefined();
    }
  });

  it('approval item references artifact paths', async () => {
    const approvals: any[] = [];
    const fakeQueue = {
      createItem: async (input: any) => {
        approvals.push(input);
        return { approval_id: 'approval-5' } as any;
      },
    } as unknown as import('../runtime/approvalQueue.js').ApprovalQueue;

    const fakeStore = { appendWorkflowAudit: async () => '', createArtifact: async () => ({ artifact_id: 'art-1' } as any) } as any;

    await generateWeeklyReportForProject({
      projectRoot: process.cwd(),
      reportingPeriodStart: '2026-06-01',
      reportingPeriodEnd: '2026-06-07',
      store: fakeStore,
      approvalQueue: fakeQueue,
    });

    expect(approvals[0].summary_diff).toContain('Artifacts:');
    expect(approvals[0].summary_diff).toContain('.md');
    expect(approvals[0].summary_diff).toContain('.html');
    expect(approvals[0].summary_diff).toContain('.json');
  });

  it('handles store artifact creation failure gracefully', async () => {
    const fakeStore = {
      appendWorkflowAudit: async () => '',
      createArtifact: async () => { throw new Error('store full'); },
    } as unknown as import('../runtime/localProjectStore.js').LocalProjectStore;

    const fakeQueue = {
      createItem: async () => ({ approval_id: 'approval-6' } as any),
    } as unknown as import('../runtime/approvalQueue.js').ApprovalQueue;

    // Should not throw even if store fails
    const result = await generateWeeklyReportForProject({
      projectRoot: process.cwd(),
      reportingPeriodStart: '2026-06-01',
      reportingPeriodEnd: '2026-06-07',
      store: fakeStore,
      approvalQueue: fakeQueue,
    });

    expect(result.report).toBeDefined();
    expect(result.artifacts).toHaveLength(3);
    expect(result.approvalItemId).toBe('approval-6');
  });
});
