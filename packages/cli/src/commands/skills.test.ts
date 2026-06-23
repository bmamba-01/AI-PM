import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { tmpdir } from 'node:os';
import { describe, it, expect, afterEach } from 'vitest';
import { skillsCommand } from './skills.js';

const tempRoots: string[] = [];

async function makeRoot(): Promise<string> {
  const root = await mkdtemp(path.join(tmpdir(), 'skills-command-'));
  tempRoots.push(root);
  return root;
}

async function runSkills(root: string, argv: string[]): Promise<string> {
  const originalCwd = process.cwd();
  const logs: string[] = [];
  const { vi } = await import('vitest');
  const spy = vi.spyOn(console, 'log').mockImplementation((value?: unknown) => {
    logs.push(String(value ?? ''));
  });

  process.chdir(root);
  try {
    await skillsCommand.parseAsync(argv, { from: 'user' });
  } finally {
    spy.mockRestore();
    process.chdir(originalCwd);
  }

  return logs.join('');
}

afterEach(async () => {
  for (const root of tempRoots.splice(0)) {
    await rm(root, { recursive: true, force: true });
  }
});

describe('skills command', () => {
  it('lists packaged skills as JSON', async () => {
    const root = await makeRoot();
    await mkdir(path.join(root, '.ai-pm-skills', 'tracking.create_task'), { recursive: true });
    await writeFile(path.join(root, '.ai-pm-skills', 'tracking.create_task', 'skill.json'), JSON.stringify({
      id: 'tracking.create_task',
      name: 'Tracking Create Task',
      category: 'tracking',
      description: 'Create tracker task',
      version: '1.0.0',
      owner: 'orchestrator',
      tags: ['tracking'],
    }, null, 2));
    await writeFile(path.join(root, '.ai-pm-skills', 'tracking.create_task', 'instructions.md'), 'create task');

    const raw = await runSkills(root, ['list', '--json']);
    const data = JSON.parse(raw) as { total: number; skills: Array<{ id: string }> };
    expect(data.total).toBe(1);
    expect(data.skills[0].id).toBe('tracking.create_task');
  });

  it('builds project status from tracking fixtures', async () => {
    const root = await makeRoot();
    await mkdir(path.join(root, '.ai-pm-skills', 'tracking.complete_task'), { recursive: true });
    await writeFile(path.join(root, '.ai-pm-skills', 'tracking.complete_task', 'skill.json'), JSON.stringify({
      id: 'tracking.complete_task',
      name: 'Tracking Complete Task',
      category: 'tracking',
      description: 'Complete tracker task',
      version: '1.0.0',
      owner: 'agent',
      tags: ['tracking'],
    }, null, 2));
    await writeFile(path.join(root, '.ai-pm-skills', 'tracking.complete_task', 'instructions.md'), 'complete task');
    await mkdir(path.join(root, '.ai-pm', 'tracking'), { recursive: true });
    await mkdir(path.join(root, '.ai-pm'), { recursive: true });
    await writeFile(path.join(root, '.ai-pm', 'profile.yaml'), [
      'version: 1',
      'project:',
      '  project_id: skills-fixture',
      '  name: Skills Fixture',
      '  root: .',
      'tracking:',
      '  system: notion',
      '  mode: local_import',
      '',
    ].join('\n'));
    await writeFile(path.join(root, '.ai-pm', 'tracking', 'tasks.json'), JSON.stringify([{
      task_id: 't1',
      project_id: 'skills-fixture',
      assigned_agent: 'reporting',
      workflow_id: 'weekly-report',
      status: 'ready',
      external_task_id: 'notion-local:t1',
      external_task_url: 'file://issues.csv#t1',
      tracking: { tool: 'notion' },
      skill_required: { agent_complete: 'tracking.complete_task' },
    }], null, 2));

    const raw = await runSkills(root, ['status', '--json', '--path', root]);
    const data = JSON.parse(raw) as {
      project_id: string;
      tracking_tool: string;
      skills: Array<{ skill_id: string; active_task_count: number }>;
    };
    expect(data.project_id).toBe('skills-fixture');
    expect(data.tracking_tool).toBe('notion');
    expect(data.skills.find(skill => skill.skill_id === 'tracking.complete_task')?.active_task_count).toBe(1);
  });
});
