import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { generateDailyBriefing, generateContextualBriefing } from './dailyBriefing.js';
import { mkdtemp, rm, writeFile, mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

describe('generateDailyBriefing', () => {
  it('prioritizes blockers, meetings, risks, approvals, and follow ups from local inputs', () => {
    const briefing = generateDailyBriefing({
      projectId: 'alpha',
      date: '2026-06-18',
      items: [
        { source: 'jira', type: 'blocker', title: 'Payment API is blocked', priority: 'critical' },
        { source: 'calendar', type: 'meeting', title: 'Client scope review', priority: 'high' },
        { source: 'risk-register', type: 'risk', title: 'UAT environment not ready', priority: 'high' },
        { source: 'github', type: 'approval', title: 'Approve release PR', priority: 'medium' },
        { source: 'email', type: 'follow_up', title: 'Reply to vendor estimate', priority: 'low' },
      ],
      unavailableSources: ['gmail'],
    });

    expect(briefing.projectId).toBe('alpha');
    expect(briefing.topPriorities).toEqual(['Payment API is blocked', 'Client scope review', 'UAT environment not ready']);
    expect(briefing.urgentBlockers).toEqual(['Payment API is blocked']);
    expect(briefing.meetingsToPrepare).toEqual(['Client scope review']);
    expect(briefing.risksToReview).toEqual(['UAT environment not ready']);
    expect(briefing.pendingApprovals).toEqual(['Approve release PR']);
    expect(briefing.suggestedFollowups).toEqual(['Reply to vendor estimate']);
    expect(briefing.sourceCoverage).toContain('unavailable:gmail');
    expect(briefing.confidence).toBeLessThan(100);
  });

  it('includes default empty memory/connector fields', () => {
    const briefing = generateDailyBriefing({
      projectId: 'beta',
      date: '2026-06-18',
      items: [],
    });

    expect(briefing.memoryTasks).toEqual({ total: 0, active: 0, completed: 0 });
    expect(briefing.memoryArtifacts).toEqual({ total: 0, active: 0 });
    expect(briefing.connectorStatus).toEqual({});
    expect(briefing.degradedSources).toEqual([]);
  });
});

describe('generateContextualBriefing', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await mkdtemp(path.join(tmpdir(), 'briefing-ctx-'));
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  it('generates a briefing from empty project (graceful degradation)', async () => {
    const briefing = await generateContextualBriefing({
      projectRoot: tempDir,
      methodology: 'scrum',
      projectType: 'fixed_cost',
    });

    expect(briefing.projectId).toBe(path.basename(tempDir));
    expect(briefing.methodology).toBe('scrum');
    expect(briefing.projectType).toBe('fixed_cost');
    expect(briefing.confidence).toBeGreaterThanOrEqual(0);
    expect(briefing.confidence).toBeLessThanOrEqual(100);
    expect(briefing.assumptions.length).toBeGreaterThan(0);
  });

  it('loads memory tasks when memory store exists', async () => {
    // Create memory store with some tasks
    const memDir = path.join(tempDir, '.ai-pm', 'memory');
    await mkdir(memDir, { recursive: true });
    await writeFile(path.join(memDir, 'state.json'), JSON.stringify({
      version: 1,
      project_id: 'test',
      tasks: [
        { task_id: 't1', project_id: 'test', name: 'Task 1', description: '', status: 'pending', assigned_to: 'pm', created_at: '2026-06-19T00:00:00Z', updated_at: '2026-06-19T00:00:00Z', completed_at: null, dependencies: [], artifacts: [], tags: [] },
        { task_id: 't2', project_id: 'test', name: 'Task 2', description: '', status: 'completed', assigned_to: 'dev', created_at: '2026-06-18T00:00:00Z', updated_at: '2026-06-19T00:00:00Z', completed_at: '2026-06-19T00:00:00Z', dependencies: [], artifacts: [], tags: [] },
      ],
      artifacts: [],
      updated_at: '2026-06-19T00:00:00Z',
    }, null, 2));

    const briefing = await generateContextualBriefing({
      projectRoot: tempDir,
    });

    expect(briefing.memoryTasks.total).toBe(2);
    expect(briefing.memoryTasks.active).toBe(1);
    expect(briefing.memoryTasks.completed).toBe(1);
    expect(briefing.connectorStatus['memory-store']).toBe('available');
  });

  it('loads pending approvals from approval queue', async () => {
    // Create approval queue with pending items
    const approvalsDir = path.join(tempDir, '.ai-pm');
    await mkdir(approvalsDir, { recursive: true });
    await writeFile(path.join(approvalsDir, 'approvals.json'), JSON.stringify([
      {
        approval_id: 'a1',
        project_id: 'test',
        action_type: 'report',
        target_system: 'jira',
        target_id: 'PRJ-1',
        workflow_id: 'reporting',
        run_id: 'run-1',
        requested_by_agent: 'agent-1',
        requested_by_role: 'reporting',
        title: 'Publish weekly report',
        description: 'Send the report',
        summary_diff: 'New report ready',
        confidence: 85,
        source_refs: [],
        priority: 'high',
        status: 'pending',
        revision_round: 0,
        deadline: null,
        ttl_seconds: null,
        assigned_approvers: [],
        created_at: '2026-06-19T00:00:00Z',
        updated_at: '2026-06-19T00:00:00Z',
        decided_at: null,
        decided_by: null,
        decision: null,
        rejection_reason: null,
        revision_notes: null,
        delegated_to: null,
        execution_status: 'pending',
        execution_error: null,
        execution_target_response: null,
        retry_count: 0,
        policy_rule_id: null,
      },
    ], null, 2));

    const briefing = await generateContextualBriefing({
      projectRoot: tempDir,
    });

    expect(briefing.pendingApprovals).toContain('Publish weekly report');
    expect(briefing.connectorStatus['approval-queue']).toBe('available');
  });

  it('tracks degraded sources for missing connectors', async () => {
    const briefing = await generateContextualBriefing({
      projectRoot: tempDir,
    });

    // The briefing should have degraded sources for connectors that couldn't load
    expect(briefing.degradedSources.length).toBeGreaterThan(0);
    expect(briefing.assumptions.length).toBeGreaterThan(0);
  });

  it('loads risks from risk register via memory artifacts', async () => {
    // Create memory store with risk artifacts
    const memDir = path.join(tempDir, '.ai-pm', 'memory');
    await mkdir(memDir, { recursive: true });
    await writeFile(path.join(memDir, 'state.json'), JSON.stringify({
      version: 1,
      project_id: 'test',
      tasks: [],
      artifacts: [
        {
          artifact_id: 'r1',
          project_id: 'test',
          name: 'Risk: DB Migration',
          path: 'risk/r1.json',
          type: 'risk',
          status: 'active',
          created_at: '2026-06-18T00:00:00Z',
          updated_at: '2026-06-19T00:00:00Z',
          archived_at: null,
          archive_reason: null,
          task_id: null,
          version: 1,
          meta: {
            title: 'Database migration risk',
            description: 'DB migration may fail',
            probability: 'high',
            impact: 'critical',
            status: 'open',
          },
        },
      ],
      updated_at: '2026-06-19T00:00:00Z',
    }, null, 2));

    const briefing = await generateContextualBriefing({
      projectRoot: tempDir,
    });

    expect(briefing.risksToReview).toContain('Database migration risk');
    expect(briefing.connectorStatus['risk-register']).toBe('available');
  });
});

