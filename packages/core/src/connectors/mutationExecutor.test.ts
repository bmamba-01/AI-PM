import { describe, expect, it } from 'vitest';
import { registerConnector, getConnector, listConnectors, executeMutation } from './mutationExecutor.js';

describe('mutationExecutor', () => {
  it('registers and retrieves connector', () => {
    registerConnector({
      name: 'test-connector',
      supported_actions: ['create_issue', 'update_issue'],
      execute: async () => ({ id: 'ISSUE-1' }),
    });
    expect(getConnector('test-connector')).toBeDefined();
    expect(listConnectors()).toContain('test-connector');
  });

  it('returns null for unknown connector', () => {
    expect(getConnector('nonexistent')).toBeUndefined();
  });

  it('executes mutation successfully in dry-run mode', async () => {
    registerConnector({
      name: 'mock-jira',
      supported_actions: ['create_issue'],
      execute: async (action, payload, dryRun) => ({
        id: dryRun ? 'DRY-RUN-1' : 'ISSUE-1',
        action,
        title: payload.title,
      }),
    });

    const result = await executeMutation({
      approval_id: 'APR-001',
      connector: 'mock-jira',
      action: 'create_issue',
      payload: { title: 'Test issue', project: 'PROJ' },
      dry_run: true,
    });

    expect(result.status).toBe('completed');
    expect(result.dry_run).toBe(true);
    expect(result.result?.id).toBe('DRY-RUN-1');
    expect(result.mutation_id).toMatch(/^MUT-\d{6}$/);
  });

  it('executes mutation in live mode', async () => {
    registerConnector({
      name: 'mock-live',
      supported_actions: ['send_email'],
      execute: async (_action, _payload, dryRun) => ({
        sent: !dryRun,
      }),
    });

    const result = await executeMutation({
      approval_id: 'APR-002',
      connector: 'mock-live',
      action: 'send_email',
      payload: { to: 'test@example.com' },
      dry_run: false,
    });

    expect(result.status).toBe('completed');
    expect(result.dry_run).toBe(false);
    expect(result.result?.sent).toBe(true);
  });

  it('returns error for unknown connector', async () => {
    const result = await executeMutation({
      approval_id: 'APR-003',
      connector: 'unknown-connector',
      action: 'do_something',
      payload: {},
    });
    expect(result.status).toBe('failed');
    expect(result.error).toContain('not registered');
  });

  it('returns error for unsupported action', async () => {
    registerConnector({
      name: 'limited-connector',
      supported_actions: ['read_only'],
      execute: async () => ({}),
    });

    const result = await executeMutation({
      approval_id: 'APR-004',
      connector: 'limited-connector',
      action: 'write_data',
      payload: {},
    });
    expect(result.status).toBe('failed');
    expect(result.error).toContain('not supported');
  });

  it('returns error when connector throws', async () => {
    registerConnector({
      name: 'failing-connector',
      supported_actions: ['fail'],
      execute: async () => { throw new Error('Connection timeout'); },
    });

    const result = await executeMutation({
      approval_id: 'APR-005',
      connector: 'failing-connector',
      action: 'fail',
      payload: {},
    });
    expect(result.status).toBe('failed');
    expect(result.error).toBe('Connection timeout');
  });

  it('defaults to dry_run=true', async () => {
    registerConnector({
      name: 'default-dry',
      supported_actions: ['action'],
      execute: async (_a, _p, dryRun) => ({ dryRun }),
    });

    const result = await executeMutation({
      approval_id: 'APR-006',
      connector: 'default-dry',
      action: 'action',
      payload: {},
    });
    expect(result.dry_run).toBe(true);
  });
});
