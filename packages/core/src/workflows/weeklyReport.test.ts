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

    const fakeStore = { appendWorkflowAudit: async () => '' } as any;

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
});
