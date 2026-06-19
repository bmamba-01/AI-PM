import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { LocalProjectStore } from './localProjectStore.js';

const tempRoots: string[] = [];

async function tempRoot(): Promise<string> {
  const root = await mkdtemp(path.join(tmpdir(), 'ai-pm-store-'));
  tempRoots.push(root);
  return root;
}

afterEach(async () => {
  await Promise.all(tempRoots.splice(0).map(root => rm(root, { recursive: true, force: true })));
});

describe('LocalProjectStore', () => {
  it('loads daily briefing items from local project memory', async () => {
    const root = await tempRoot();
    const store = new LocalProjectStore(root);
    await store.ensureProjectDirs();
    await writeFile(
      path.join(root, '.ai-pm', 'daily-items.json'),
      JSON.stringify([
        { source: 'local-memory', type: 'blocker', title: 'Blocked payment test', priority: 'high' },
      ]),
      'utf-8'
    );

    const items = await store.loadDailyBriefingItems();

    expect(items).toEqual([
      { source: 'local-memory', type: 'blocker', title: 'Blocked payment test', priority: 'high' },
    ]);
  });

  it('appends workflow audit records as json lines', async () => {
    const root = await tempRoot();
    const store = new LocalProjectStore(root);

    const auditRef = await store.appendWorkflowAudit({
      workflowId: 'daily-briefing',
      projectId: 'alpha',
      status: 'completed',
      startedAt: '2026-06-19T01:00:00.000Z',
      completedAt: '2026-06-19T01:00:01.000Z',
      outputSummary: '1 priority, 0 blockers',
      sourceCoverage: ['local-memory'],
      assumptions: ['local fallback'],
    });

    const auditLog = await readFile(path.join(root, '.ai-pm', 'audit', 'workflow-runs.jsonl'), 'utf-8');
    const [line] = auditLog.trim().split('\n');
    const record = JSON.parse(line);

    expect(auditRef).toBe(path.join(root, '.ai-pm', 'audit', 'workflow-runs.jsonl'));
    expect(record.runId).toMatch(/^daily-briefing-/);
    expect(record.workflowId).toBe('daily-briefing');
    expect(record.projectId).toBe('alpha');
    expect(record.sourceCoverage).toEqual(['local-memory']);
  });

  it('loads empty list when audit file does not exist', async () => {
    const root = await tempRoot();
    const store = new LocalProjectStore(root);
    const records = await store.loadWorkflowAuditRecords();
    expect(records).toEqual([]);
  });

  it('loads workflow audit records from jsonl', async () => {
    const root = await tempRoot();
    const store = new LocalProjectStore(root);
    await store.ensureProjectDirs();

    // Append two records
    await store.appendWorkflowAudit({
      workflowId: 'daily-briefing',
      projectId: 'alpha',
      status: 'completed',
      startedAt: '2026-06-19T01:00:00.000Z',
      completedAt: '2026-06-19T01:00:01.000Z',
      outputSummary: '1 priority',
      sourceCoverage: ['local-memory'],
      assumptions: [],
    });
    await store.appendWorkflowAudit({
      workflowId: 'meeting-intelligence',
      projectId: 'beta',
      status: 'failed',
      startedAt: '2026-06-19T02:00:00.000Z',
      completedAt: '2026-06-19T02:00:02.000Z',
      outputSummary: 'transcript missing',
      sourceCoverage: [],
      assumptions: ['no transcript available'],
    });

    const records = await store.loadWorkflowAuditRecords();
    expect(records).toHaveLength(2);
    expect(records[0].workflowId).toBe('daily-briefing');
    expect(records[1].workflowId).toBe('meeting-intelligence');
    expect(records[1].status).toBe('failed');
  });

  it('skips invalid JSON lines and continues loading', async () => {
    const root = await tempRoot();
    const store = new LocalProjectStore(root);
    await store.ensureProjectDirs();
    const auditPath = path.join(root, '.ai-pm', 'audit', 'workflow-runs.jsonl');

    // Write a valid record, a bad line, then another valid record
    const line1 = JSON.stringify({ runId: 'r1', workflowId: 'daily-briefing', projectId: 'p1', status: 'completed', startedAt: '2026-06-19T01:00:00.000Z', completedAt: '2026-06-19T01:00:01.000Z', outputSummary: 'ok', sourceCoverage: [], assumptions: [] });
    const line2 = 'this is not json {{{';
    const line3 = JSON.stringify({ runId: 'r2', workflowId: 'reporting', projectId: 'p2', status: 'blocked', startedAt: '2026-06-19T03:00:00.000Z', completedAt: '2026-06-19T03:00:01.000Z', outputSummary: 'blocked', sourceCoverage: [], assumptions: [] });

    await writeFile(auditPath, [line1, line2, line3].join('\n') + '\n', 'utf-8');

    const records = await store.loadWorkflowAuditRecords();
    expect(records).toHaveLength(2);
    expect(records[0].runId).toBe('r1');
    expect(records[1].runId).toBe('r2');
  });
});

