import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, rm, readFile, readdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import {
  createOrchestratorRun,
  advanceOrchestratorRun,
  advanceToNext,
  failRun,
} from './orchestratorRun.js';
import {
  finalizeOrchestratorRun,
  readExecutionRecord,
  listExecutionRecords,
  readAuditLog,
} from './executionRecord.js';
import type { OrchestratorRunState } from './types.js';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const tempRoots: string[] = [];

async function tempRoot(): Promise<string> {
  const root = await mkdtemp(path.join(tmpdir(), 'ai-pm-exec-'));
  tempRoots.push(root);
  return root;
}

afterEach(async () => {
  await Promise.all(tempRoots.splice(0).map(root => rm(root, { recursive: true, force: true })));
});

function makeInput() {
  return {
    project_id: 'proj-001',
    workflow_id: 'weekly-report',
    trigger: { type: 'cli' as const, actor: 'pm' },
  };
}

function makeTrackingState() {
  return {
    tracking_tool: 'local_memory' as const,
    tracking_mode: 'manual',
    external_task_id: 'track-001',
    external_task_url: 'file://.ai-pm/memory/state.json#track-001',
    local_memory_task_id: 'track-001',
    status: 'ready' as const,
    created_at: '2026-06-22T00:00:00.000Z',
    completed_at: null,
    dry_run_only: false,
    completion_payload: null,
  };
}

function makeFullRun(): ReturnType<typeof createOrchestratorRun> {
  let run = createOrchestratorRun(makeInput());
  run = advanceOrchestratorRun(run, {
    target_state: 'project_resolution',
    context_pack: {
      project_id: 'proj-001',
      project_root: '/tmp/test',
      methodology: 'SCRUM',
      project_type: 'SOFTWARE',
      connectors: { github: true, jira: true, linear: false, calendar: true, email: false, confluence: false, notion: false, slack: false },
      memory_summary: { total_tasks: 10, completed_tasks: 3, total_artifacts: 5, archived_artifacts: 1 },
      pending_approvals: 2,
      assumptions: ['offline mode'],
    },
  });
  run = advanceToNext(run); // context_pack
  run = advanceToNext(run); // workflow_selection
  run = advanceOrchestratorRun(run, {
    target_state: 'agent_assignment',
    agents: ['reporting-agent'],
    tracking_state: makeTrackingState(),
  });
  run = advanceToNext(run); // validation
  run = advanceOrchestratorRun(run, {
    target_state: 'approval_gate',
    approvals: ['email-send'],
  });
  run = advanceOrchestratorRun(run, {
    target_state: 'artifact_persistence',
    artifacts: [{ name: 'report.md', path: 'reports/weekly.md', type: 'report' }],
  });
  run = advanceToNext(run); // completion_report
  run = advanceToNext(run); // audit_write
  run = advanceToNext(run); // completed
  return run;
}

// ─── finalizeOrchestratorRun ─────────────────────────────────────────────────

describe('finalizeOrchestratorRun', () => {
  it('creates execution record on disk', async () => {
    const root = await tempRoot();
    const run = makeFullRun();
    const record = await finalizeOrchestratorRun(run, root);

    expect(record.record_id).toBeDefined();
    expect(record.run_id).toBe(run.run_id);
    expect(record.project_id).toBe('proj-001');
    expect(record.workflow_id).toBe('weekly-report');
    expect(record.state).toBe('completed');

    // Verify file exists
    const filePath = path.join(root, '.ai-pm', 'orchestrator', 'runs', `${record.record_id}.json`);
    const raw = await readFile(filePath, 'utf-8');
    const parsed = JSON.parse(raw);
    expect(parsed.record_id).toBe(record.record_id);
  });

  it('updates index file', async () => {
    const root = await tempRoot();
    const run = makeFullRun();
    await finalizeOrchestratorRun(run, root);

    const indexRaw = await readFile(path.join(root, '.ai-pm', 'orchestrator', 'runs', 'index.json'), 'utf-8');
    const index = JSON.parse(indexRaw);
    expect(Array.isArray(index)).toBe(true);
    expect(index.length).toBe(1);
    expect(index[0].run_id).toBe(run.run_id);
  });

  it('writes audit log entry', async () => {
    const root = await tempRoot();
    const run = makeFullRun();
    await finalizeOrchestratorRun(run, root);

    const audits = await readAuditLog(root);
    expect(audits.length).toBe(1);
    expect(audits[0].run_id).toBe(run.run_id);
    expect(audits[0].final_state).toBe('completed');
    expect(audits[0].agents_used).toContain('reporting-agent');
  });

  it('includes source coverage', async () => {
    const root = await tempRoot();
    const run = makeFullRun();
    const record = await finalizeOrchestratorRun(run, root);

    expect(record.source_coverage.available).toContain('github');
    expect(record.source_coverage.available).toContain('jira');
    expect(record.source_coverage.unavailable).toContain('linear');
    expect(record.source_coverage.unavailable).toContain('email');
  });

  it('includes artifacts', async () => {
    const root = await tempRoot();
    const run = makeFullRun();
    const record = await finalizeOrchestratorRun(run, root);

    expect(record.artifacts.length).toBe(1);
    expect(record.artifacts[0].name).toBe('report.md');
    expect(record.artifacts[0].path).toBe('reports/weekly.md');
    expect(record.artifacts[0].type).toBe('report');
  });

  it('includes approval summary', async () => {
    const root = await tempRoot();
    const run = makeFullRun();
    const record = await finalizeOrchestratorRun(run, root);

    expect(record.approvals.required).toContain('email-send');
    expect(record.approvals.count).toBe(1);
  });

  it('includes assumptions and confidence', async () => {
    const root = await tempRoot();
    const run = makeFullRun();
    const record = await finalizeOrchestratorRun(run, root, {
      assumptions: ['local only', 'no network'],
      confidence: 85,
    });

    expect(record.assumptions).toContain('local only');
    expect(record.assumptions).toContain('no network');
    expect(record.confidence).toBe(85);
  });

  it('throws on non-terminal state', async () => {
    const root = await tempRoot();
    const run = createOrchestratorRun(makeInput());
    await expect(finalizeOrchestratorRun(run, root)).rejects.toThrow('Cannot finalize');
  });

  it('handles failed runs', async () => {
    const root = await tempRoot();
    let run = createOrchestratorRun(makeInput());
    run = advanceToNext(run); // project_resolution
    run = failRun(run, 'Something broke');

    const record = await finalizeOrchestratorRun(run, root);
    expect(record.state).toBe('failed');
    expect(record.errors).toContain('Something broke');
  });

  it('links memory_task_id when provided', async () => {
    const root = await tempRoot();
    const run = makeFullRun();
    const record = await finalizeOrchestratorRun(run, root, {});
    // memory_task_id is null by default (no memory integration yet)
    expect(record.memory_task_id).toBeNull();
  });
});

// ─── readExecutionRecord ─────────────────────────────────────────────────────

describe('readExecutionRecord', () => {
  it('reads a persisted record', async () => {
    const root = await tempRoot();
    const run = makeFullRun();
    const saved = await finalizeOrchestratorRun(run, root);

    const loaded = await readExecutionRecord(root, saved.record_id);
    expect(loaded).not.toBeNull();
    expect(loaded!.record_id).toBe(saved.record_id);
    expect(loaded!.run_id).toBe(run.run_id);
  });

  it('returns null for non-existent record', async () => {
    const root = await tempRoot();
    const loaded = await readExecutionRecord(root, 'non-existent-id');
    expect(loaded).toBeNull();
  });
});

// ─── listExecutionRecords ────────────────────────────────────────────────────

describe('listExecutionRecords', () => {
  it('returns empty array when no records', async () => {
    const root = await tempRoot();
    const records = await listExecutionRecords(root);
    expect(records).toEqual([]);
  });

  it('lists all records', async () => {
    const root = await tempRoot();
    const run1 = makeFullRun();
    await finalizeOrchestratorRun(run1, root);

    const run2Input = { ...makeInput(), workflow_id: 'daily-brief' };
    let run2 = createOrchestratorRun(run2Input);
    run2 = advanceToNext(run2);
    run2 = failRun(run2, 'timeout');
    await finalizeOrchestratorRun(run2, root);

    const records = await listExecutionRecords(root);
    expect(records.length).toBe(2);
    expect(records.map(r => r.workflow_id)).toContain('weekly-report');
    expect(records.map(r => r.workflow_id)).toContain('daily-brief');
  });
});

// ─── readAuditLog ────────────────────────────────────────────────────────────

describe('readAuditLog', () => {
  it('returns empty array when no audit log', async () => {
    const root = await tempRoot();
    const log = await readAuditLog(root);
    expect(log).toEqual([]);
  });

  it('appends multiple audit entries', async () => {
    const root = await tempRoot();

    let run1 = createOrchestratorRun(makeInput());
    run1 = advanceToNext(run1); // project_resolution
    run1 = advanceToNext(run1); // context_pack
    run1 = advanceToNext(run1); // workflow_selection
    run1 = advanceToNext(run1, { tracking_state: makeTrackingState() }); // agent_assignment
    run1 = advanceToNext(run1); // validation
    run1 = advanceToNext(run1); // approval_gate
    run1 = advanceToNext(run1); // artifact_persistence
    run1 = advanceToNext(run1); // completion_report
    run1 = advanceToNext(run1); // audit_write
    run1 = advanceToNext(run1); // completed
    await finalizeOrchestratorRun(run1, root);

    let run2 = createOrchestratorRun(makeInput());
    run2 = failRun(run2, 'error');
    await finalizeOrchestratorRun(run2, root);

    const log = await readAuditLog(root);
    expect(log.length).toBe(2);
    expect(log[0].final_state).toBe('completed');
    expect(log[1].final_state).toBe('failed');
  });
});
