import { describe, expect, it } from 'vitest';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { generateWeeklyReport, generateWeeklyReportForProject } from './weeklyReport.js';
import type { WeeklyReportInputItem } from './weeklyReport.js';
import { LocalProjectStore } from '../runtime/localProjectStore.js';
import { ApprovalQueue } from '../runtime/approvalQueue.js';
import { MemoryStore } from '../runtime/memory.js';

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

async function makeTestEnv() {
  const root = await mkdtemp(path.join(tmpdir(), 'weekly-report-test-'));
  const store = new LocalProjectStore(root);
  const queue = new ApprovalQueue(root);
  const memory = new MemoryStore(root);
  return { root, store, queue, memory, cleanup: () => rm(root, { recursive: true, force: true }) };
}

describe('generateWeeklyReportForProject', () => {

  it('returns a report from local store sources', async () => {
    const env = await makeTestEnv();
    try {
      const result = await generateWeeklyReportForProject({
        projectRoot: env.root,
        reportingPeriodStart: '2026-06-01',
        reportingPeriodEnd: '2026-06-07',
        store: env.store,
        approvalQueue: env.queue,
        memoryStore: env.memory,
      });
      expect(result.report).toBeDefined();
      expect(result.report.projectId).toBe('local-project');
      expect(result.approvalItemId).toBeTruthy();
    } finally { await env.cleanup(); }
  });

  it('queues approval item when queue is available', async () => {
    const env = await makeTestEnv();
    try {
      const result = await generateWeeklyReportForProject({
        projectRoot: env.root,
        reportingPeriodStart: '2026-06-01',
        reportingPeriodEnd: '2026-06-07',
        store: env.store,
        approvalQueue: env.queue,
        memoryStore: env.memory,
      });
      expect(result.approvalItemId).toBeTruthy();
      const item = await env.queue.getItem(result.approvalItemId!);
      expect(item).not.toBeNull();
      expect(item!.action_type).toBe('publish_weekly_report');
    } finally { await env.cleanup(); }
  });

  it('generates markdown, html, and json artifacts', async () => {
    const env = await makeTestEnv();
    try {
      const result = await generateWeeklyReportForProject({
        projectRoot: env.root,
        reportingPeriodStart: '2026-06-01',
        reportingPeriodEnd: '2026-06-07',
        store: env.store,
        approvalQueue: env.queue,
        memoryStore: env.memory,
      });
      expect(result.artifacts).toHaveLength(3);
      expect(result.artifacts.map(a => a.format).sort()).toEqual(['html', 'json', 'markdown']);
      expect(result.artifacts.every(a => a.persisted)).toBe(true);
    } finally { await env.cleanup(); }
  });

  it('persists artifact refs in memory store', async () => {
    const env = await makeTestEnv();
    try {
      await generateWeeklyReportForProject({
        projectRoot: env.root,
        reportingPeriodStart: '2026-06-01',
        reportingPeriodEnd: '2026-06-07',
        store: env.store,
        approvalQueue: env.queue,
        memoryStore: env.memory,
      });
      const artifacts = await env.memory.listArtifacts();
      expect(artifacts.length).toBe(3);
      expect(artifacts.every(a => a.project_id === 'local-project')).toBe(true);
      expect(artifacts.every(a => a.status === 'active')).toBe(true);
      expect(artifacts.every(a => a.name.startsWith('weekly-report-'))).toBe(true);
    } finally { await env.cleanup(); }
  });

  it('approval item references artifact paths', async () => {
    const env = await makeTestEnv();
    try {
      const result = await generateWeeklyReportForProject({
        projectRoot: env.root,
        reportingPeriodStart: '2026-06-01',
        reportingPeriodEnd: '2026-06-07',
        store: env.store,
        approvalQueue: env.queue,
        memoryStore: env.memory,
      });
      const item = await env.queue.getItem(result.approvalItemId!);
      expect(item!.summary_diff).toContain('Artifacts:');
      expect(item!.summary_diff).toContain('.md');
      expect(item!.summary_diff).toContain('.html');
      expect(item!.summary_diff).toContain('.json');
    } finally { await env.cleanup(); }
  });

  it('handles memory store failure gracefully', async () => {
    const env = await makeTestEnv();
    try {
      const failMemory = {
        createArtifact: async () => { throw new Error('store full'); },
        listArtifacts: async () => [],
      } as any;

      const result = await generateWeeklyReportForProject({
        projectRoot: env.root,
        reportingPeriodStart: '2026-06-01',
        reportingPeriodEnd: '2026-06-07',
        store: env.store,
        approvalQueue: env.queue,
        memoryStore: failMemory,
      });
      expect(result.report).toBeDefined();
      expect(result.artifacts).toHaveLength(3);
      expect(result.approvalItemId).toBeTruthy();
    } finally { await env.cleanup(); }
  });

  it('works without memoryStore (backward compatible)', async () => {
    const env = await makeTestEnv();
    try {
      const result = await generateWeeklyReportForProject({
        projectRoot: env.root,
        reportingPeriodStart: '2026-06-01',
        reportingPeriodEnd: '2026-06-07',
        store: env.store,
        approvalQueue: env.queue,
      });
      expect(result.report).toBeDefined();
      expect(result.artifacts).toHaveLength(3);
      expect(result.approvalItemId).toBeTruthy();
      // No artifacts persisted since no memoryStore
      const artifacts = await env.memory.listArtifacts();
      expect(artifacts.length).toBe(0);
    } finally { await env.cleanup(); }
  });
});
