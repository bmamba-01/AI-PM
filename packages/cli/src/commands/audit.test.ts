import { mkdtemp, rm, writeFile, mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { LocalProjectStore } from '@ai-pm/core/runtime';

const tempRoots: string[] = [];

async function tempRoot(): Promise<string> {
  const root = await mkdtemp(path.join(tmpdir(), 'ai-pm-audit-cli-'));
  tempRoots.push(root);
  return root;
}

afterEach(async () => {
  await Promise.all(tempRoots.splice(0).map(root => rm(root, { recursive: true, force: true })));
});

describe('audit CLI — store layer', () => {
  it('empty store returns empty list', async () => {
    const root = await tempRoot();
    const store = new LocalProjectStore(root);
    const records = await store.loadWorkflowAuditRecords();
    expect(records).toEqual([]);
  });

  it('loads records from jsonl file', async () => {
    const root = await tempRoot();
    const store = new LocalProjectStore(root);
    await store.ensureProjectDirs();

    const line = JSON.stringify({
      runId: 'daily-briefing-001',
      workflowId: 'daily-briefing',
      projectId: 'alpha',
      status: 'completed',
      startedAt: '2026-06-19T01:00:00.000Z',
      completedAt: '2026-06-19T01:00:01.000Z',
      outputSummary: '1 priority',
      sourceCoverage: ['local-memory'],
      assumptions: [],
    });

    await writeFile(path.join(root, '.ai-pm', 'audit', 'workflow-runs.jsonl'), line + '\n', 'utf-8');

    const records = await store.loadWorkflowAuditRecords();
    expect(records).toHaveLength(1);
    expect(records[0].runId).toBe('daily-briefing-001');
    expect(records[0].workflowId).toBe('daily-briefing');
    expect(records[0].status).toBe('completed');
  });

  it('json output is valid JSON array', async () => {
    const root = await tempRoot();
    const store = new LocalProjectStore(root);
    await store.ensureProjectDirs();

    const records = [
      { runId: 'r1', workflowId: 'daily-briefing', projectId: 'p1', status: 'completed', startedAt: '2026-06-19T01:00:00.000Z', completedAt: '2026-06-19T01:00:01.000Z', outputSummary: 'ok', sourceCoverage: [], assumptions: [] },
      { runId: 'r2', workflowId: 'reporting', projectId: 'p2', status: 'failed', startedAt: '2026-06-19T02:00:00.000Z', completedAt: '2026-06-19T02:00:02.000Z', outputSummary: 'failed', sourceCoverage: [], assumptions: [] },
    ];

    await writeFile(
      path.join(root, '.ai-pm', 'audit', 'workflow-runs.jsonl'),
      records.map(r => JSON.stringify(r)).join('\n') + '\n',
      'utf-8',
    );

    const loaded = await store.loadWorkflowAuditRecords();
    const json = JSON.stringify(loaded, null, 2);
    const parsed = JSON.parse(json);
    expect(Array.isArray(parsed)).toBe(true);
    expect(parsed).toHaveLength(2);
    expect(parsed[0].runId).toBe('r1');
  });

  it('skips malformed JSON lines gracefully', async () => {
    const root = await tempRoot();
    const store = new LocalProjectStore(root);
    await store.ensureProjectDirs();

    const lines = [
      JSON.stringify({ runId: 'r1', workflowId: 'daily-briefing', projectId: 'p1', status: 'completed', startedAt: '2026-06-19T01:00:00.000Z', completedAt: '2026-06-19T01:00:01.000Z', outputSummary: 'ok', sourceCoverage: [], assumptions: [] }),
      'NOT JSON AT ALL {{{',
      JSON.stringify({ runId: 'r2', workflowId: 'reporting', projectId: 'p2', status: 'blocked', startedAt: '2026-06-19T02:00:00.000Z', completedAt: '2026-06-19T02:00:01.000Z', outputSummary: 'blocked', sourceCoverage: [], assumptions: [] }),
    ];

    await writeFile(
      path.join(root, '.ai-pm', 'audit', 'workflow-runs.jsonl'),
      lines.join('\n') + '\n',
      'utf-8',
    );

    const loaded = await store.loadWorkflowAuditRecords();
    expect(loaded).toHaveLength(2);
    expect(loaded[0].runId).toBe('r1');
    expect(loaded[1].runId).toBe('r2');
  });

  it('handles missing audit directory', async () => {
    const root = await tempRoot();
    // No .ai-pm/audit/ directory created
    const store = new LocalProjectStore(root);
    const records = await store.loadWorkflowAuditRecords();
    expect(records).toEqual([]);
  });

  it('multiple jsonl lines loaded in order', async () => {
    const root = await tempRoot();
    const store = new LocalProjectStore(root);
    await store.ensureProjectDirs();

    const lines = [
      JSON.stringify({ runId: 'r1', workflowId: 'w1', projectId: 'p1', status: 'completed', startedAt: '2026-01-01T00:00:00Z', completedAt: '2026-01-01T00:00:01Z', outputSummary: 'a', sourceCoverage: [], assumptions: [] }),
      JSON.stringify({ runId: 'r2', workflowId: 'w2', projectId: 'p2', status: 'blocked', startedAt: '2026-01-01T00:01:00Z', completedAt: '2026-01-01T00:01:01Z', outputSummary: 'b', sourceCoverage: [], assumptions: [] }),
      JSON.stringify({ runId: 'r3', workflowId: 'w3', projectId: 'p3', status: 'failed', startedAt: '2026-01-01T00:02:00Z', completedAt: '2026-01-01T00:02:01Z', outputSummary: 'c', sourceCoverage: [], assumptions: [] }),
    ];

    await writeFile(path.join(root, '.ai-pm', 'audit', 'workflow-runs.jsonl'), lines.join('\n') + '\n', 'utf-8');

    const records = await store.loadWorkflowAuditRecords();
    expect(records).toHaveLength(3);
    expect(records[0].status).toBe('completed');
    expect(records[1].status).toBe('blocked');
    expect(records[2].status).toBe('failed');
  });

  it('empty jsonl file returns empty array', async () => {
    const root = await tempRoot();
    const store = new LocalProjectStore(root);
    await store.ensureProjectDirs();
    await writeFile(path.join(root, '.ai-pm', 'audit', 'workflow-runs.jsonl'), '', 'utf-8');

    const records = await store.loadWorkflowAuditRecords();
    expect(records).toEqual([]);
  });

  it('jsonl with only blank lines returns empty array', async () => {
    const root = await tempRoot();
    const store = new LocalProjectStore(root);
    await store.ensureProjectDirs();
    await writeFile(path.join(root, '.ai-pm', 'audit', 'workflow-runs.jsonl'), '\n\n\n', 'utf-8');

    const records = await store.loadWorkflowAuditRecords();
    expect(records).toEqual([]);
  });

  it('appendWorkflowAudit creates file and returns path', async () => {
    const root = await tempRoot();
    const store = new LocalProjectStore(root);
    const auditPath = await store.appendWorkflowAudit({
      workflowId: 'test-wf',
      projectId: 'test-proj',
      status: 'completed',
      startedAt: '2026-06-19T00:00:00Z',
      completedAt: '2026-06-19T00:00:01Z',
      outputSummary: 'Test run completed',
      sourceCoverage: ['local-memory'],
      assumptions: [],
    });

    expect(auditPath).toContain('workflow-runs.jsonl');

    const records = await store.loadWorkflowAuditRecords();
    expect(records).toHaveLength(1);
    expect(records[0].workflowId).toBe('test-wf');
    expect(records[0].runId).toContain('test-wf-');
  });

  it('consecutive appends accumulate records', async () => {
    const root = await tempRoot();
    const store = new LocalProjectStore(root);

    await store.appendWorkflowAudit({
      workflowId: 'wf-1', projectId: 'p1', status: 'completed',
      startedAt: '2026-06-19T01:00:00Z', completedAt: '2026-06-19T01:00:01Z',
      outputSummary: 'First', sourceCoverage: [], assumptions: [],
    });
    await store.appendWorkflowAudit({
      workflowId: 'wf-2', projectId: 'p2', status: 'failed',
      startedAt: '2026-06-19T02:00:00Z', completedAt: '2026-06-19T02:00:01Z',
      outputSummary: 'Second', sourceCoverage: [], assumptions: [],
    });

    const records = await store.loadWorkflowAuditRecords();
    expect(records).toHaveLength(2);
    expect(records[0].workflowId).toBe('wf-1');
    expect(records[1].workflowId).toBe('wf-2');
  });
});
