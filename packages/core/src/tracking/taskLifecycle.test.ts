import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  createLifecycleTask,
  completeLifecycleTask,
  verifyCompletion,
  buildAgentContract,
  type TaskLifecycleState,
} from './taskLifecycle.js';
import type { TrackingAdapter, TrackingConfig, TrackingTask, TaskStatus } from './types.js';

// ─── Mock Adapter ────────────────────────────────────────────────────────────

function createMockAdapter(): TrackingAdapter & { _tasks: Map<string, TrackingTask> } {
  const tasks = new Map<string, TrackingTask>();

  return {
    _tasks: tasks,
    adapter_id: 'local_memory',
    mode: 'manual',
    createTask: vi.fn(async (input) => {
      const id = `ext-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      const task: TrackingTask = {
        task_id: id,
        project_id: input.project_id,
        title: input.title,
        description: input.description,
        assigned_agent: input.assigned_agent,
        workflow_id: input.workflow_id,
        priority: input.priority,
        status: input.status,
        due_date: input.due_date ?? null,
        acceptance_criteria: input.acceptance_criteria ?? [],
        verification_commands: input.verification_commands ?? [],
        source_refs: input.source_refs ?? [],
        local_memory_task_id: id,
        external_task_id: id,
        external_task_url: `https://example.com/tasks/${id}`,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      tasks.set(id, task);
      return task;
    }),
    getTask: vi.fn(async (id) => tasks.get(id) ?? null),
    updateStatus: vi.fn(async (id, status) => {
      const task = tasks.get(id);
      if (!task) throw new Error(`Task not found: ${id}`);
      task.status = status;
      task.updated_at = new Date().toISOString();
      return task;
    }),
    verifyCompletion: vi.fn(async (id) => {
      const task = tasks.get(id);
      if (!task) return { complete: false, evidence: [`Task not found: ${id}`] };
      const complete = task.status === 'done';
      return { complete, evidence: [`Status: ${task.status}`] };
    }),
  };
}

function makeConfig(overrides?: Partial<TrackingConfig>): TrackingConfig {
  return {
    system: 'local_memory',
    mode: 'manual',
    ...overrides,
  };
}

function makeInput(overrides?: Record<string, unknown>) {
  return {
    project_id: 'proj-001',
    title: 'Test task',
    description: 'A test task for lifecycle',
    assigned_agent: 'test-agent',
    workflow_id: 'test-workflow',
    priority: 'high' as const,
    acceptance_criteria: ['Task completes successfully'],
    verification_commands: ['echo "done"'],
    source_refs: ['doc-001'],
    ...overrides,
  };
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('createLifecycleTask', () => {
  let adapter: ReturnType<typeof createMockAdapter>;
  let config: TrackingConfig;

  beforeEach(() => {
    adapter = createMockAdapter();
    config = makeConfig();
  });

  it('creates a tracked task and returns lifecycle state', async () => {
    const result = await createLifecycleTask(adapter, config, makeInput());

    expect(result.state.tracking_tool).toBe('local_memory');
    expect(result.state.tracking_mode).toBe('manual');
    expect(result.state.external_task_id).toBeTruthy();
    expect(result.state.external_task_url).toBeTruthy();
    expect(result.state.local_memory_task_id).toBeTruthy();
    expect(result.state.status).toBe('ready');
    expect(result.state.created_at).toBeTruthy();
    expect(result.state.completed_at).toBeNull();
    expect(result.state.dry_run_only).toBe(false);
    expect(result.state.completion_payload).toBeNull();
  });

  it('returns a TrackingTask with correct fields', async () => {
    const result = await createLifecycleTask(adapter, config, makeInput());

    expect(result.tracking_task.task_id).toBe(result.state.external_task_id);
    expect(result.tracking_task.title).toBe('Test task');
    expect(result.tracking_task.assigned_agent).toBe('test-agent');
    expect(result.tracking_task.priority).toBe('high');
    expect(result.tracking_task.status).toBe('ready');
  });

  it('calls adapter.createTask with correct payload', async () => {
    await createLifecycleTask(adapter, config, makeInput());
    expect(adapter.createTask).toHaveBeenCalledTimes(1);
  });

  it('sets dry_run_only when mode is dry_run', async () => {
    const dryConfig = makeConfig({ mode: 'dry_run' });
    const result = await createLifecycleTask(adapter, dryConfig, makeInput());
    expect(result.state.dry_run_only).toBe(true);
  });

  it('sets dry_run_only when mode is local_import', async () => {
    const localConfig = makeConfig({ mode: 'local_import' });
    const result = await createLifecycleTask(adapter, localConfig, makeInput());
    expect(result.state.dry_run_only).toBe(true);
  });

  it('does not set dry_run_only when mode is manual', async () => {
    const result = await createLifecycleTask(adapter, config, makeInput());
    expect(result.state.dry_run_only).toBe(false);
  });
});

describe('completeLifecycleTask', () => {
  let adapter: ReturnType<typeof createMockAdapter>;
  let config: TrackingConfig;
  let createdState: TaskLifecycleState;

  beforeEach(async () => {
    adapter = createMockAdapter();
    config = makeConfig();
    const { state } = await createLifecycleTask(adapter, config, makeInput());
    createdState = state;
  });

  it('completes a task and returns updated state', async () => {
    const result = await completeLifecycleTask(adapter, config, createdState, {
      external_task_id: createdState.external_task_id!,
      status: 'done',
      summary: 'Task completed successfully',
    });

    expect(result.state.status).toBe('done');
    expect(result.state.completed_at).toBeTruthy();
    expect(result.completion_payload).not.toBeNull();
  });

  it('sets tracking fields in completion payload', async () => {
    const result = await completeLifecycleTask(adapter, config, createdState, {
      external_task_id: createdState.external_task_id!,
      status: 'done',
      summary: 'Task completed',
    });

    expect(result.completion_payload.tool).toBe('local_memory');
    expect(result.completion_payload.external_task_id).toBe(createdState.external_task_id);
    // Manual mode skips tracker update
    expect(result.completion_payload.attempted).toBe(false);
    expect(result.completion_payload.result).toBe('skipped');
  });

  it('includes verification result', async () => {
    const result = await completeLifecycleTask(adapter, config, createdState, {
      external_task_id: createdState.external_task_id!,
      status: 'done',
    });

    expect(result.verification).toBeDefined();
    expect(typeof result.verification.complete).toBe('boolean');
    expect(Array.isArray(result.verification.evidence)).toBe(true);
  });

  it('skips tracker update in manual mode', async () => {
    const manualConfig = makeConfig({ mode: 'manual' });
    const { state } = await createLifecycleTask(adapter, manualConfig, makeInput());
    await completeLifecycleTask(adapter, manualConfig, state, {
      external_task_id: state.external_task_id!,
      status: 'done',
    });

    expect(adapter.updateStatus).not.toHaveBeenCalled();
  });

  it('calls adapter.updateStatus in non-manual mode', async () => {
    const liveConfig = makeConfig({ mode: 'live' });
    const { state } = await createLifecycleTask(adapter, liveConfig, makeInput());
    await completeLifecycleTask(adapter, liveConfig, state, {
      external_task_id: state.external_task_id!,
      status: 'done',
    });

    expect(adapter.updateStatus).toHaveBeenCalled();
  });

  it('throws when dry_run_only and mode is live', async () => {
    // Manually set dry_run_only = true with a live config to test the guard
    const liveConfig = makeConfig({ mode: 'live' });
    const { state } = await createLifecycleTask(adapter, liveConfig, makeInput());
    // Force dry_run_only to simulate a task created in dry_run but now completing in live
    state.dry_run_only = true;

    await expect(
      completeLifecycleTask(adapter, liveConfig, state, {
        external_task_id: state.external_task_id!,
        status: 'done',
      }),
    ).rejects.toThrow('Cannot complete task in dry-run-only state');
  });

  it('allows dry_run_only when mode is dry_run', async () => {
    const dryConfig = makeConfig({ mode: 'dry_run' });
    const { state } = await createLifecycleTask(adapter, dryConfig, makeInput());

    const result = await completeLifecycleTask(adapter, dryConfig, state, {
      external_task_id: state.external_task_id!,
      status: 'done',
    });

    expect(result.state.status).toBe('done');
  });

  it('allows dry_run_only when mode is local_import', async () => {
    const localConfig = makeConfig({ mode: 'local_import' });
    const { state } = await createLifecycleTask(adapter, localConfig, makeInput());

    const result = await completeLifecycleTask(adapter, localConfig, state, {
      external_task_id: state.external_task_id!,
      status: 'done',
    });

    expect(result.state.status).toBe('done');
  });

  it('handles adapter errors gracefully', async () => {
    const errorAdapter = createMockAdapter();
    errorAdapter.updateStatus = vi.fn(async () => { throw new Error('API down'); });

    const liveConfig = makeConfig({ mode: 'live' });
    const { state } = await createLifecycleTask(errorAdapter, liveConfig, makeInput());

    const result = await completeLifecycleTask(errorAdapter, liveConfig, state, {
      external_task_id: state.external_task_id!,
      status: 'done',
    });

    expect(result.completion_payload.result).toContain('failed');
  });

  it('includes evidence_refs in completion payload', async () => {
    const result = await completeLifecycleTask(adapter, config, createdState, {
      external_task_id: createdState.external_task_id!,
      status: 'done',
      evidence_refs: ['report.md', 'test-log.txt'],
    });

    expect(result.completion_payload.evidence_refs).toEqual(['report.md', 'test-log.txt']);
  });
});

describe('verifyCompletion', () => {
  let adapter: ReturnType<typeof createMockAdapter>;

  beforeEach(() => {
    adapter = createMockAdapter();
  });

  it('returns verified when task is done', async () => {
    const { state } = await createLifecycleTask(adapter, makeConfig(), makeInput());
    await adapter.updateStatus(state.external_task_id!, 'done');

    const result = await verifyCompletion(adapter, state.external_task_id!);

    expect(result.verified).toBe(true);
    expect(result.evidence.length).toBeGreaterThan(0);
  });

  it('returns not verified when task is not done', async () => {
    const { state } = await createLifecycleTask(adapter, makeConfig(), makeInput());

    const result = await verifyCompletion(adapter, state.external_task_id!);

    expect(result.verified).toBe(false);
  });

  it('returns not verified for non-existent task', async () => {
    const result = await verifyCompletion(adapter, 'non-existent-id');

    expect(result.verified).toBe(false);
  });
});

describe('buildAgentContract', () => {
  it('builds contract from lifecycle state', () => {
    const state: TaskLifecycleState = {
      tracking_tool: 'notion',
      tracking_mode: 'dry_run',
      external_task_id: 'notion-123',
      external_task_url: 'https://notion.so/123',
      local_memory_task_id: 'local-456',
      status: 'ready',
      created_at: '2026-06-22T00:00:00Z',
      completed_at: null,
      dry_run_only: true,
      completion_payload: null,
    };

    const contract = buildAgentContract(state, 'daily-briefing', 'pm_commander');

    expect(contract.external_task_id).toBe('notion-123');
    expect(contract.external_task_url).toBe('https://notion.so/123');
    expect(contract.tracking_tool).toBe('notion');
    expect(contract.tracking_mode).toBe('dry_run');
    expect(contract.completion_skill).toBe('tracking.complete_task');
    expect(contract.workflow_id).toBe('daily-briefing');
    expect(contract.agent_role).toBe('pm_commander');
  });

  it('uses local_memory_task_id when external id is missing', () => {
    const state: TaskLifecycleState = {
      tracking_tool: 'local_memory',
      tracking_mode: 'manual',
      external_task_id: null,
      external_task_url: null,
      local_memory_task_id: 'local-789',
      status: 'ready',
      created_at: '2026-06-22T00:00:00Z',
      completed_at: null,
      dry_run_only: false,
      completion_payload: null,
    };

    const contract = buildAgentContract(state, 'test', 'developer');

    expect(contract.task_id).toBe('local-789');
    expect(contract.external_task_id).toBe('');
  });
});
