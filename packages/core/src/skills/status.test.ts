import { mkdtemp, rm, writeFile, mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import type { Skill } from './loader.js';
import {
  buildSkillsReadModel,
  type SkillRuntimeBinding,
  type SkillRuntimeApproval,
} from './status.js';

const tempRoots: string[] = [];

async function tempRoot(): Promise<string> {
  const root = await mkdtemp(path.join(tmpdir(), 'ai-pm-skills-status-'));
  tempRoots.push(root);
  return root;
}

afterEach(async () => {
  await Promise.all(tempRoots.splice(0).map(root => rm(root, { recursive: true, force: true })));
});

function skill(overrides?: Partial<Skill>): Skill {
  return {
    id: 'tracking.complete_task',
    name: 'Tracking Complete Task',
    category: 'tracking',
    description: 'Complete a tracked task.',
    version: '1.0.0',
    tags: ['tracking'],
    instructions: 'do the thing',
    ...overrides,
  };
}

describe('buildSkillsReadModel', () => {
  it('returns deterministic empty status fields when runtime data is unavailable', async () => {
    const snapshot = await buildSkillsReadModel({
      skills: [
        skill(),
        skill({ id: 'tracking.create_task', name: 'Tracking Create Task' }),
      ],
    });

    expect(snapshot.project_id).toBe('');
    expect(snapshot.tracking_tool).toBe('');
    expect(snapshot.skills).toHaveLength(2);
    expect(snapshot.skills.map(item => item.skill_id)).toEqual([
      'tracking.complete_task',
      'tracking.create_task',
    ]);
    expect(snapshot.skills[0].owner).toBe('shared');
    expect(snapshot.skills[0].active_task_count).toBe(0);
    expect(snapshot.skills[0].pending_approval_count).toBe(0);
    expect(snapshot.skills[0].tasks).toEqual([]);
    expect(snapshot.warnings).toContain('Skill runtime task bindings are unavailable; task lists are empty.');
  });

  it('builds per-skill task and approval status from explicit runtime bindings', async () => {
    const tasks: SkillRuntimeBinding[] = [
      {
        skill_id: 'tracking.complete_task',
        task_id: 'task-1',
        title: 'Close weekly report task',
        status: 'in_progress',
        project_id: 'proj-19',
        tracking_tool: 'notion',
        external_task_id: 'notion-1',
        external_task_url: 'https://notion.so/notion-1',
        assigned_agent: 'reporting',
        workflow_id: 'weekly-report',
      },
      {
        skill_id: 'tracking.complete_task',
        task_id: 'task-2',
        title: 'Verify report publish gate',
        status: 'done',
        project_id: 'proj-19',
        tracking_tool: 'notion',
        external_task_id: 'notion-2',
        external_task_url: 'https://notion.so/notion-2',
        assigned_agent: 'reporting',
        workflow_id: 'weekly-report',
      },
      {
        skill_id: 'tracking.create_task',
        task_id: 'task-3',
        title: 'Create report tracker item',
        status: 'ready',
        project_id: 'proj-19',
        tracking_tool: 'notion',
        external_task_id: 'notion-3',
        external_task_url: 'https://notion.so/notion-3',
        assigned_agent: 'orchestrator',
        workflow_id: 'weekly-report',
      },
    ];

    const approvals: SkillRuntimeApproval[] = [
      { approval_id: 'approval-1', status: 'pending', target_id: 'task-1' },
      { approval_id: 'approval-2', status: 'approved', target_id: 'task-2' },
      { approval_id: 'approval-3', status: 'pending', target_id: 'notion-3' },
    ];

    const snapshot = await buildSkillsReadModel({
      skills: [
        skill(),
        skill({ id: 'tracking.create_task', name: 'Tracking Create Task', owner: 'orchestrator' }),
      ],
      runtime: {
        project_id: 'proj-19',
        tracking_tool: 'notion',
        tasks,
        approvals,
      },
    });

    const completeTask = snapshot.skills.find(item => item.skill_id === 'tracking.complete_task');
    const createTask = snapshot.skills.find(item => item.skill_id === 'tracking.create_task');

    expect(completeTask).toBeDefined();
    expect(completeTask!.active_task_count).toBe(1);
    expect(completeTask!.pending_approval_count).toBe(1);
    expect(completeTask!.tasks).toHaveLength(2);

    expect(createTask).toBeDefined();
    expect(createTask!.owner).toBe('orchestrator');
    expect(createTask!.active_task_count).toBe(1);
    expect(createTask!.pending_approval_count).toBe(1);
    expect(createTask!.tasks[0].external_task_id).toBe('notion-3');
  });

  it('loads project scope from local profile and degrades gracefully without task bindings', async () => {
    const root = await tempRoot();
    await mkdir(path.join(root, '.ai-pm'), { recursive: true });
    await writeFile(
      path.join(root, '.ai-pm', 'profile.yaml'),
      [
        'version: 1',
        'project:',
        '  project_id: proj-file',
        '  name: File Project',
        '  root: .',
        'tracking:',
        '  system: notion',
        '  mode: local_import',
        '',
      ].join('\n'),
      'utf-8',
    );

    const snapshot = await buildSkillsReadModel({
      projectRoot: root,
      skills: [skill()],
    });

    expect(snapshot.project_id).toBe('proj-file');
    expect(snapshot.tracking_tool).toBe('notion');
    expect(snapshot.skills[0].tasks).toEqual([]);
    expect(snapshot.warnings).toContain('Skill runtime task bindings are unavailable; task lists are empty.');
  });
});
