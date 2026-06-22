import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { generateWeeklyReportForProject, type WeeklyReport } from '../workflows/weeklyReport.js';
import { LocalProjectStore } from '../runtime/localProjectStore.js';
import { ApprovalQueue } from '../runtime/approvalQueue.js';

const tempRoots: string[] = [];

async function tempRoot(): Promise<string> {
  const root = await mkdtemp(path.join(tmpdir(), 'ai-pm-weekly-integration-'));
  tempRoots.push(root);
  return root;
}

afterEach(async () => {
  await Promise.all(tempRoots.splice(0).map(root => rm(root, { recursive: true, force: true })));
});

describe('WeeklyReport — integration', () => {
  it('full run: project setup → generate report → verify memory artifact → verify approval queued', async () => {
    const root = await tempRoot();
    const projectId = 'proj-weekly-int';
    const store = new LocalProjectStore(root);
    const approvalQueue = new ApprovalQueue(root);
    await store.ensureProjectDirs();

    const { report, approvalItemId } = await generateWeeklyReportForProject({
      projectRoot: root,
      reportingPeriodStart: '2026-06-15',
      reportingPeriodEnd: '2026-06-21',
      store,
      approvalQueue,
    });

    // Verify report shape (artifact reference)
    // Without profile.yaml, falls back to folder name
    expect(report.projectId).toBe(path.basename(root));
    expect(report.reportingPeriodStart).toBe('2026-06-15');
    expect(report.reportingPeriodEnd).toBe('2026-06-21');
    expect(Array.isArray(report.accomplishments)).toBe(true);
    expect(Array.isArray(report.riskSummary)).toBe(true);
    expect(Array.isArray(report.sourceCoverage)).toBe(true);
    expect(typeof report.confidence).toBe('number');

    // Verify memory artifact persisted via store audit
    const records = await store.loadWorkflowAuditRecords();
    expect(records).toHaveLength(1);
    expect(records[0].workflowId).toBe('weekly-report');
    expect(records[0].status).toBe('completed');
    expect(records[0].sourceCoverage).toEqual(report.sourceCoverage);

    // Verify approval item queued
    expect(approvalItemId).not.toBeNull();
    const approval = await approvalQueue.getItem(approvalItemId!);
    expect(approval).toBeTruthy();
    expect(approval!.workflow_id).toBe('weekly-report');
    expect(approval!.action_type).toBe('publish_weekly_report');
    expect(approval!.status).toBe('pending');

    // Verify source coverage tracking includes unavailable marker
    expect(report.sourceCoverage).toContain('unavailable:online-mcp');
  });

  it('source coverage combines available and unavailable sources', async () => {
    const root = await tempRoot();
    const store = new LocalProjectStore(root);
    const approvalQueue = new ApprovalQueue(root);
    await store.ensureProjectDirs();

    const { report } = await generateWeeklyReportForProject({
      projectRoot: root,
      reportingPeriodStart: '2026-06-15',
      reportingPeriodEnd: '2026-06-21',
      store,
      approvalQueue,
    });

    expect(report.sourceCoverage).toEqual(['local-memory', 'unavailable:online-mcp']);
  });

  it('approval queue is empty before weekly report run', async () => {
    const root = await tempRoot();
    const approvalQueue = new ApprovalQueue(root);

    const items = await approvalQueue.listItems();
    expect(items).toHaveLength(0);
  });
});
