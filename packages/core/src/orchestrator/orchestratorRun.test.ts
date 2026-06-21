import { describe, it, expect } from 'vitest';
import {
  createOrchestratorRun,
  advanceOrchestratorRun,
  advanceToNext,
  failRun,
  toAuditRecord,
} from './orchestratorRun.js';
import { STATE_TRANSITIONS, ORCHESTRATOR_STATES } from './types.js';
import type { OrchestratorRun, OrchestratorRunState, ProjectContextPack } from './types.js';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeInput() {
  return {
    project_id: 'proj-001',
    workflow_id: 'weekly-report',
    trigger: { type: 'cli' as const, actor: 'pm' },
  };
}

function makeContextPack(): ProjectContextPack {
  return {
    project_id: 'proj-001',
    project_root: '/tmp/test',
    methodology: 'SCRUM',
    project_type: 'SOFTWARE',
    connectors: {
      github: true, jira: true, linear: false,
      calendar: true, email: false, confluence: false,
      notion: false, slack: false,
    },
    memory_summary: {
      total_tasks: 10,
      completed_tasks: 3,
      total_artifacts: 5,
      archived_artifacts: 1,
    },
    pending_approvals: 2,
    assumptions: ['local-only mode'],
  };
}

// ─── createOrchestratorRun ───────────────────────────────────────────────────

describe('createOrchestratorRun', () => {
  it('creates a run in intake state', () => {
    const run = createOrchestratorRun(makeInput());
    expect(run.state).toBe('intake');
    expect(run.project_id).toBe('proj-001');
    expect(run.workflow_id).toBe('weekly-report');
    expect(run.run_id).toBeDefined();
  });

  it('has empty initial arrays', () => {
    const run = createOrchestratorRun(makeInput());
    expect(run.assigned_agents).toEqual([]);
    expect(run.artifacts).toEqual([]);
    expect(run.approvals_required).toEqual([]);
    expect(run.errors).toEqual([]);
  });

  it('has timestamps', () => {
    const run = createOrchestratorRun(makeInput());
    expect(run.started_at).toBeDefined();
    expect(run.completed_at).toBeNull();
  });

  it('throws on missing project_id', () => {
    expect(() => createOrchestratorRun({ project_id: '', workflow_id: 'test', trigger: { type: 'cli', actor: 'pm' } }))
      .toThrow('Missing required fields');
  });

  it('throws on missing workflow_id', () => {
    expect(() => createOrchestratorRun({ project_id: 'p1', workflow_id: '', trigger: { type: 'cli', actor: 'pm' } }))
      .toThrow('Missing required fields');
  });

  it('has context_pack null initially', () => {
    const run = createOrchestratorRun(makeInput());
    expect(run.context_pack).toBeNull();
  });
});

// ─── advanceOrchestratorRun ──────────────────────────────────────────────────

describe('advanceOrchestratorRun', () => {
  it('advances from intake to project_resolution', () => {
    const run = createOrchestratorRun(makeInput());
    const next = advanceOrchestratorRun(run, { target_state: 'project_resolution' });
    expect(next.state).toBe('project_resolution');
  });

  it('advances through full happy path', () => {
    let run = createOrchestratorRun(makeInput());
    const states: OrchestratorRunState[] = [
      'project_resolution', 'context_pack', 'workflow_selection',
      'agent_assignment', 'validation', 'approval_gate',
      'artifact_persistence', 'completion_report', 'audit_write', 'completed',
    ];
    for (const s of states) {
      run = advanceOrchestratorRun(run, { target_state: s });
      expect(run.state).toBe(s);
    }
    expect(run.completed_at).toBeDefined();
  });

  it('rejects invalid transition', () => {
    const run = createOrchestratorRun(makeInput());
    expect(() => advanceOrchestratorRun(run, { target_state: 'completed' }))
      .toThrow('Invalid transition');
  });

  it('rejects advancing completed run', () => {
    let run = createOrchestratorRun(makeInput());
    for (let i = 0; i < 10; i++) {
      run = advanceToNext(run);
    }
    expect(() => advanceOrchestratorRun(run, { target_state: 'intake' }))
      .toThrow('terminal state');
  });

  it('sets context_pack', () => {
    const run = createOrchestratorRun(makeInput());
    const next = advanceOrchestratorRun(run, {
      target_state: 'project_resolution',
      context_pack: makeContextPack(),
    });
    expect(next.context_pack).toBeDefined();
    expect(next.context_pack?.methodology).toBe('SCRUM');
  });

  it('accumulates agents', () => {
    let run = createOrchestratorRun(makeInput());
    run = advanceOrchestratorRun(run, {
      target_state: 'project_resolution',
      agents: ['reporting-agent'],
    });
    expect(run.assigned_agents).toEqual(['reporting-agent']);
    run = advanceOrchestratorRun(run, {
      target_state: 'context_pack',
      agents: ['risk-agent'],
    });
    expect(run.assigned_agents).toEqual(['reporting-agent', 'risk-agent']);
  });

  it('accumulates artifacts', () => {
    let run = createOrchestratorRun(makeInput());
    run = advanceToNext(run);
    run = advanceToNext(run);
    run = advanceToNext(run);
    run = advanceToNext(run);
    run = advanceToNext(run);
    run = advanceToNext(run);
    run = advanceOrchestratorRun(run, {
      target_state: 'artifact_persistence',
      artifacts: [{ name: 'report.md', path: 'reports/week-1.md', type: 'report' }],
    });
    expect(run.artifacts.length).toBe(1);
  });

  it('records errors on failure', () => {
    const run = createOrchestratorRun(makeInput());
    const failed = advanceOrchestratorRun(run, {
      target_state: 'failed',
      error: { state: 'intake', message: 'Missing project', timestamp: '', recoverable: true },
    });
    expect(failed.state).toBe('failed');
    expect(failed.errors.length).toBe(1);
    expect(failed.errors[0].message).toBe('Missing project');
    expect(failed.completed_at).toBeDefined();
  });
});

// ─── advanceToNext ───────────────────────────────────────────────────────────

describe('advanceToNext', () => {
  it('advances one step forward', () => {
    const run = createOrchestratorRun(makeInput());
    const next = advanceToNext(run);
    expect(next.state).toBe('project_resolution');
  });

  it('completes full sequential path', () => {
    let run = createOrchestratorRun(makeInput());
    for (let i = 0; i < 10; i++) {
      run = advanceToNext(run);
    }
    expect(run.state).toBe('completed');
  });

  it('throws at completed state', () => {
    let run = createOrchestratorRun(makeInput());
    for (let i = 0; i < 10; i++) run = advanceToNext(run);
    expect(() => advanceToNext(run)).toThrow();
  });
});

// ─── failRun ─────────────────────────────────────────────────────────────────

describe('failRun', () => {
  it('transitions any state to failed', () => {
    const run = createOrchestratorRun(makeInput());
    const failed = failRun(run, 'Something broke');
    expect(failed.state).toBe('failed');
    expect(failed.errors[0].message).toBe('Something broke');
    expect(failed.errors[0].recoverable).toBe(true);
  });

  it('records non-recoverable errors', () => {
    const run = createOrchestratorRun(makeInput());
    const failed = failRun(run, 'Fatal', false);
    expect(failed.errors[0].recoverable).toBe(false);
  });
});

// ─── toAuditRecord ───────────────────────────────────────────────────────────

describe('toAuditRecord', () => {
  it('creates audit record from completed run', () => {
    let run = createOrchestratorRun(makeInput());
    run = advanceOrchestratorRun(run, {
      target_state: 'project_resolution',
      context_pack: makeContextPack(),
    });
    run = advanceToNext(run);
    run = advanceToNext(run);
    run = advanceOrchestratorRun(run, {
      target_state: 'agent_assignment',
      agents: ['reporting-agent'],
    });
    run = advanceOrchestratorRun(run, {
      target_state: 'validation',
      artifacts: [{ name: 'report.md', path: 'reports/w1.md', type: 'report' }],
      approvals: ['email-send'],
    });
    run = advanceToNext(run); // approval_gate
    run = advanceToNext(run); // artifact_persistence
    run = advanceToNext(run); // completion_report
    run = advanceToNext(run); // audit_write
    run = advanceToNext(run); // completed

    const audit = toAuditRecord(run, ['offline mode'], 95);
    expect(audit.run_id).toBe(run.run_id);
    expect(audit.final_state).toBe('completed');
    expect(audit.agents_used).toEqual(['reporting-agent']);
    expect(audit.outputs.length).toBe(1);
    expect(audit.approvals).toEqual(['email-send']);
    expect(audit.assumptions).toEqual(['offline mode']);
    expect(audit.confidence).toBe(95);
  });

  it('creates audit record from failed run', () => {
    let run = createOrchestratorRun(makeInput());
    run = failRun(run, 'Connection lost');

    const audit = toAuditRecord(run);
    expect(audit.final_state).toBe('failed');
    expect(audit.errors.length).toBe(1);
    expect(audit.errors[0]).toContain('Connection lost');
  });
});

// ─── State transition map ────────────────────────────────────────────────────

describe('state transitions', () => {
  it('every state has defined transitions', () => {
    for (const state of ORCHESTRATOR_STATES) {
      expect(STATE_TRANSITIONS[state]).toBeDefined();
      expect(Array.isArray(STATE_TRANSITIONS[state])).toBe(true);
    }
  });

  it('completed and failed have no outgoing transitions', () => {
    expect(STATE_TRANSITIONS.completed).toEqual([]);
    expect(STATE_TRANSITIONS.failed).toEqual([]);
  });

  it('all states can reach failed', () => {
    for (const state of ORCHESTRATOR_STATES) {
      if (state === 'completed' || state === 'failed') continue;
      expect(STATE_TRANSITIONS[state]).toContain('failed');
    }
  });
});
