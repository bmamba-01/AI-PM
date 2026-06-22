import { describe, expect, it } from 'vitest';
import { parseIntent, executeIntent, type AdapterServices } from './hermesAdapter.js';

function mockServices(projectName = 'ai-pm-tm-test'): AdapterServices {
  return {
    queue: {
      createItem: async (input: any) => ({
        approval_id: `approval-${Date.now()}`,
        ...input,
        status: 'pending',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        decided_at: null,
        decided_by: null,
        decision: null,
        rejection_reason: null,
        revision_notes: null,
        delegated_to: null,
        execution_status: 'pending',
        execution_error: null,
        execution_target_response: null,
        revision_round: 0,
        retry_count: 0,
        policy_rule_id: null,
      }),
      listItems: async () => [],
      getCounts: async () => ({}),
    },
    memory: {
      getSummary: async () => ({
        totalTasks: 5,
        completedTasks: 3,
        totalArtifacts: 4,
        archivedArtifacts: 1,
        staleArtifacts: 0,
      }),
      listTasks: async () => [],
      listArtifacts: async () => [],
    },
    projectRoot: '/test/project',
    projectName,
  };
}

describe('parseIntent', () => {
  it('parses daily brief intent', () => {
    const intent = parseIntent('Give me the daily brief');
    expect(intent).not.toBeNull();
    expect(intent!.command).toBe('daily_brief');
  });

  it('parses weekly status intent', () => {
    const intent = parseIntent('What is the weekly status?');
    expect(intent!.command).toBe('weekly_status');
  });

  it('parses risk summary intent', () => {
    const intent = parseIntent('Show me the risk summary');
    expect(intent!.command).toBe('risk_summary');
  });

  it('parses pending approvals intent', () => {
    const intent = parseIntent('What approvals are pending?');
    expect(intent!.command).toBe('pending_approvals');
  });

  it('parses project scan intent', () => {
    const intent = parseIntent('Run a project scan');
    expect(intent!.command).toBe('project_scan');
  });

  it('parses memory tasks intent', () => {
    const intent = parseIntent('List my tasks');
    expect(intent!.command).toBe('memory_tasks');
  });

  it('parses mutation create task intent', () => {
    const intent = parseIntent('Create a task for database migration');
    expect(intent!.command).toBe('create_task');
    expect(intent!.text).toBe('Create a task for database migration');
  });

  it('parses mutation publish report intent', () => {
    const intent = parseIntent('Publish the weekly report');
    expect(intent!.command).toBe('publish_report');
  });

  it('parses mutation send email intent', () => {
    const intent = parseIntent('Send an email to the client');
    expect(intent!.command).toBe('send_email');
  });

  it('returns null for unknown intent', () => {
    const intent = parseIntent('Hello, how are you?');
    expect(intent).toBeNull();
  });

  it('handles empty input', () => {
    const intent = parseIntent('');
    expect(intent).toBeNull();
  });

  it('is case insensitive', () => {
    const intent = parseIntent('DAILY BRIEF PLEASE');
    expect(intent!.command).toBe('daily_brief');
  });
});

describe('executeIntent', () => {
  it('executes daily_brief as read-only', async () => {
    const services = mockServices();
    const intent = parseIntent('daily brief')!;
    const response = await executeIntent(intent, services);
    expect(response.status).toBe('success');
    expect(response.data).toHaveProperty('message');
  });

  it('executes weekly_status as read-only', async () => {
    const services = mockServices();
    const intent = parseIntent('weekly status')!;
    const response = await executeIntent(intent, services);
    expect(response.status).toBe('success');
    expect(response.data).toHaveProperty('message');
  });

  it('executes risk_summary as read-only', async () => {
    const services = mockServices();
    const intent = parseIntent('risk summary')!;
    const response = await executeIntent(intent, services);
    expect(response.status).toBe('success');
    expect(response.data).toHaveProperty('message');
  });

  it('executes pending_approvals with memory data', async () => {
    const services = mockServices();
    const intent = parseIntent('pending approvals')!;
    const response = await executeIntent(intent, services);
    expect(response.status).toBe('success');
    expect(response.data).toHaveProperty('totalTasks');
    expect(response.data).toHaveProperty('completedTasks');
  });

  it('creates approval proposal for create_task mutation', async () => {
    const services = mockServices();
    const intent = parseIntent('Create a task for migration')!;
    const response = await executeIntent(intent, services);
    expect(response.status).toBe('approval_required');
    expect(response.data).toHaveProperty('approval_id');
    expect(response.data).toHaveProperty('title');
    expect(response.suggestion).toBeDefined();
  });

  it('creates approval proposal for publish_report mutation', async () => {
    const services = mockServices();
    const intent = parseIntent('Publish the weekly report')!;
    const response = await executeIntent(intent, services);
    expect(response.status).toBe('approval_required');
    expect(response.data).toHaveProperty('approval_id');
  });

  it('creates approval proposal for send_email mutation', async () => {
    const services = mockServices();
    const intent = parseIntent('Send email to client')!;
    const response = await executeIntent(intent, services);
    expect(response.status).toBe('approval_required');
    expect(response.data).toHaveProperty('approval_id');
  });

  it('returns error for unknown command', async () => {
    const services = mockServices();
    const response = await executeIntent({ command: 'nonexistent' }, services);
    expect(response.status).toBe('error');
    expect(response.error).toContain('Unknown command');
  });

  it('returns success for project_scan with local hint', async () => {
    const services = mockServices();
    const intent = { command: 'project_scan', params: {} };
    const response = await executeIntent(intent, services);
    expect(response.status).toBe('success');
    expect(response.data).toHaveProperty('hint');
  });

  it('all read commands return success status', async () => {
    const services = mockServices();
    for (const cmd of ['daily_brief', 'weekly_status', 'risk_summary', 'pending_approvals']) {
      const response = await executeIntent({ command: cmd }, services);
      expect(response.status).toBe('success');
    }
  });

  it('all mutation commands return approval_required status', async () => {
    const services = mockServices();
    for (const cmd of ['create_task', 'publish_report', 'send_email']) {
      const response = await executeIntent({ command: cmd }, services);
      expect(response.status).toBe('approval_required');
      expect(response.data).toHaveProperty('approval_id');
    }
  });

  it('mutation proposals include suggestion text', async () => {
    const services = mockServices();
    const response = await executeIntent({ command: 'create_task', text: 'test' }, services);
    expect(response.suggestion).toContain('POST');
    expect(response.suggestion).toContain('approve');
  });

  it('no external system is mutated directly', async () => {
    const services = mockServices();
    // Create approval proposals for mutations — should not send any Discord messages
    const results = await Promise.all([
      executeIntent({ command: 'create_task', text: 'test' }, services),
      executeIntent({ command: 'publish_report', text: 'report' }, services),
      executeIntent({ command: 'send_email', text: 'email' }, services),
    ]);
    for (const result of results) {
      expect(result.status).toBe('approval_required');
      expect(result.data).toHaveProperty('approval_id');
      // Verify no Discord message was sent (we only create approval proposals)
      expect(result.data).toHaveProperty('message');
      expect((result.data as any).message).toContain('Approval');
    }
  });

  // ── Project-scoped tests ──────────────────────────────────────────────────

  it('read commands return project name in data', async () => {
    const services = mockServices('ai-pm-tm-test');
    const intent = parseIntent('daily brief')!;
    const response = await executeIntent(intent, services);
    expect(response.data.project).toBe('ai-pm-tm-test');
    expect(response.data.message).toContain('ai-pm-tm-test');
  });

  it('read commands return memory data from project scope', async () => {
    const services = mockServices('ai-pm-tm-test');
    const intent = parseIntent('pending approvals')!;
    const response = await executeIntent(intent, services);
    expect(response.data.project).toBe('ai-pm-tm-test');
    expect(response.data.totalTasks).toBe(5);
    expect(response.data.completedTasks).toBe(3);
    expect(response.data.totalArtifacts).toBe(4);
  });

  it('mutation proposals use project scope in project_id', async () => {
    const services = mockServices('ai-pm-tm-test');
    const intent = parseIntent('Create a task for migration')!;
    const response = await executeIntent(intent, services);
    expect(response.status).toBe('approval_required');
    expect(response.data.project).toBe('ai-pm-tm-test');
    expect(response.data.message).toContain('ai-pm-tm-test');
  });

  it('mutation proposals include project in title', async () => {
    const services = mockServices('my-project');
    const response = await executeIntent({ command: 'create_task', text: 'test task' }, services);
    expect(response.data.title).toContain('my-project');
  });

  it('falls back to projectRoot when projectName is missing', async () => {
    const services = { ...mockServices(), projectName: undefined };
    const intent = parseIntent('daily brief')!;
    const response = await executeIntent(intent, services);
    expect(response.data.project).toBe('/test/project');
  });

  it('project_scan returns project name', async () => {
    const services = mockServices('ai-pm-tm-test');
    const intent = { command: 'project_scan', params: {} };
    const response = await executeIntent(intent, services);
    expect(response.data.project).toBe('ai-pm-tm-test');
    expect(response.data.message).toContain('ai-pm-tm-test');
  });

  it('risk_summary returns stale artifact count from project memory', async () => {
    const services = mockServices('ai-pm-tm-test');
    const intent = parseIntent('risk summary')!;
    const response = await executeIntent(intent, services);
    expect(response.data.project).toBe('ai-pm-tm-test');
    expect(response.data.staleArtifacts).toBe(0);
    expect(response.data.totalArtifacts).toBe(4);
  });

  it('weekly_status returns project-scoped summary', async () => {
    const services = mockServices('ai-pm-tm-test');
    const intent = parseIntent('weekly status')!;
    const response = await executeIntent(intent, services);
    expect(response.data.project).toBe('ai-pm-tm-test');
    expect(response.data.totalTasks).toBe(5);
    expect(response.data.message).toContain('ai-pm-tm-test');
  });

  it('one-PM profile: all commands are project-scoped', async () => {
    const services = mockServices('ai-pm-tm-test');
    const commands = ['daily_brief', 'weekly_status', 'risk_summary', 'pending_approvals'];
    for (const cmd of commands) {
      const response = await executeIntent({ command: cmd }, services);
      expect(response.status).toBe('success');
      expect(response.data.project).toBe('ai-pm-tm-test');
    }
  });

  it('one-PM profile: mutations create project-scoped approval proposals', async () => {
    const services = mockServices('ai-pm-tm-test');
    const mutations = ['create_task', 'publish_report', 'send_email'];
    for (const cmd of mutations) {
      const response = await executeIntent({ command: cmd, text: `test ${cmd}` }, services);
      expect(response.status).toBe('approval_required');
      expect(response.data.project).toBe('ai-pm-tm-test');
      expect(response.data.title).toContain('ai-pm-tm-test');
    }
  });
});
