import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { mkdtemp, rm, writeFile, mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { afterEach, describe, it, expect } from 'vitest';
import { createTrackingCommand } from './tracking.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const CLI = path.resolve(__dirname, '../../bin/ai-pm.js');
const OPTS = { encoding: 'utf-8' as const };

function run(cmd: string, cwd?: string): { stdout: string; exitCode: number } {
  try {
    const stdout = execSync(`node "${CLI}" ${cmd}`, { ...OPTS, cwd: cwd || process.cwd() }).toString();
    return { stdout, exitCode: 0 };
  } catch (err: any) {
    return { stdout: err.stdout?.toString() ?? '', exitCode: err.status ?? 1 };
  }
}

function parseJSON(raw: string): unknown {
  return JSON.parse(raw);
}

const tempRoots: string[] = [];

async function tempRoot(): Promise<string> {
  const root = await (await import('node:fs/promises')).mkdtemp(path.join(await (await import('node:os')).tmpdir(), 'json-regression-'));
  tempRoots.push(root);
  return root;
}

afterEach(async () => {
  for (const root of tempRoots.splice(0)) {
    await rm(root, { recursive: true, force: true });
  }
});

async function runTrackingCommand(root: string, argv: string[]): Promise<string> {
  const originalCwd = process.cwd();
  const originalExit = process.exit;
  const logs: string[] = [];
  const spy = (await import('vitest')).vi.spyOn(console, 'log').mockImplementation((value?: unknown) => {
    logs.push(String(value ?? ''));
  });
  process.exit = (() => undefined) as never;
  process.chdir(root);
  try {
    const cmd = createTrackingCommand();
    await cmd.parseAsync(argv, { from: 'user' });
    await new Promise(resolve => setTimeout(resolve, 25));
  } finally {
    spy.mockRestore();
    process.chdir(originalCwd);
    process.exit = originalExit;
    process.exitCode = 0;
  }
  return logs.join('');
}

describe('JSON regression: setup', () => {
  it('setup doctor --json returns valid JSON', () => {
    const { stdout } = run('setup doctor --json');
    const data = parseJSON(stdout);
    expect(typeof data).toBe('object');
    expect(typeof (data as any).score).toBe('number');
    expect(typeof (data as any).score).toBe('number');
    expect(Array.isArray((data as any).checks)).toBe(true);
  });

  it('setup doctor --json has no spinner text on stdout', () => {
    const { stdout } = run('setup doctor --json');
    expect(stdout).not.toContain('Running setup doctor');
    expect(stdout).not.toContain('Loading');
  });

  it('setup repair --json returns valid JSON', async () => {
    const root = await tempRoot();
    const { stdout } = run('setup repair --json', root);
    const data = parseJSON(stdout) as any;
    expect(typeof data).toBe('object');
    expect(typeof data.success).toBe('boolean');
    expect(Array.isArray(data.created)).toBe(true);
  });
});

describe('JSON regression: project', () => {
  it('project scan --json returns valid JSON', () => {
    const { stdout } = run('project scan --json');
    const data = parseJSON(stdout) as any;
    expect(typeof data).toBe('object');
    expect(typeof data.ready).toBe('boolean');
    expect(typeof data.score).toBe('number');
    expect(Array.isArray(data.checks)).toBe(true);
  });

  it('project profile validate --json returns valid JSON', () => {
    const { stdout } = run('project profile validate --json');
    const data = parseJSON(stdout) as any;
    expect(typeof data).toBe('object');
    expect(typeof data.valid).toBe('boolean');
    expect(typeof data.profile).toBe('object');
  });

  it('project profile validate --json has no spinner text', () => {
    const { stdout } = run('project profile validate --json');
    expect(stdout).not.toContain('Loading');
    expect(stdout).not.toContain('Scanning');
  });
});

describe('JSON regression: memory', () => {
  it('memory summary --json returns valid JSON', () => {
    const { stdout } = run('memory summary --json');
    const data = parseJSON(stdout) as any;
    expect(typeof data).toBe('object');
    expect(typeof data.totalTasks).toBe('number');
    expect(typeof data.totalArtifacts).toBe('number');
  });

  it('memory tasks list --json returns valid JSON', () => {
    const { stdout } = run('memory tasks list --json');
    const data = parseJSON(stdout) as unknown;
    expect(typeof data === 'object' || Array.isArray(data)).toBe(true);
  });
});

describe('JSON regression: daily', () => {
  it('daily --json returns valid JSON', () => {
    const { stdout } = run('daily --json');
    const data = parseJSON(stdout) as any;
    expect(typeof data).toBe('object');
    expect(typeof data.date).toBe('string');
    expect(typeof data.confidence).toBe('number');
    expect(Array.isArray(data.topPriorities)).toBe(true);
    expect(Array.isArray(data.sourceCoverage)).toBe(true);
  });

  it('daily --format json returns valid JSON', () => {
    const { stdout } = run('daily --format json');
    const data = parseJSON(stdout) as any;
    expect(typeof data).toBe('object');
    expect(typeof data.date).toBe('string');
  });

  it('daily --json has no spinner/status text', () => {
    const { stdout } = run('daily --json');
    expect(stdout).not.toContain('Loading');
    expect(stdout).not.toContain('Loading daily data');
  });
});

describe('JSON regression: MCP', () => {
  it('mcp validate --json returns valid JSON', () => {
    const { stdout } = run('mcp validate --json');
    const data = parseJSON(stdout) as any;
    expect(typeof data).toBe('object');
    expect(typeof data.valid).toBe('boolean');
  });

  it('mcp doctor --json returns valid JSON', () => {
    const { stdout } = run('mcp doctor --json');
    const data = parseJSON(stdout) as any;
    expect(typeof data).toBe('object');
    expect(typeof data.health).toBe('string');
    expect(Array.isArray(data.connectors)).toBe(true);
  });

  it('mcp list exits 0', () => {
    const { exitCode, stdout } = run('mcp list');
    expect(exitCode).toBe(0);
  });
});

describe('JSON regression: agent route', () => {
  it('agent route --workflow daily-briefing --json returns valid JSON', () => {
    const { stdout } = run('agent route --workflow daily-briefing --json');
    const data = parseJSON(stdout) as any;
    expect(typeof data).toBe('object');
    expect(data.workflowId).toBe('daily-briefing');
    expect(data.primaryAgent).toBeDefined();
  });

  it('agent route --workflow weekly-report --json returns valid JSON', () => {
    const { stdout } = run('agent route --workflow weekly-report --json');
    const data = parseJSON(stdout) as any;
    expect(typeof data).toBe('object');
    expect(data.workflowId).toBe('weekly-report');
    expect(data.primaryAgent).toBeDefined();
  });

  it('agent status --json returns valid JSON', () => {
    const { stdout } = run('agent status --json');
    const data = parseJSON(stdout) as any;
    expect(typeof data).toBe('object');
    expect(data.name).toBe('ai-pm');
    expect(Array.isArray(data.agents)).toBe(true);
  });
});

describe('JSON regression: adoption', () => {
  it('adopt --path <dir> --json returns valid JSON', async () => {
    const root = await tempRoot();
    const { stdout } = run('adopt --path ' + root + ' --json', root);
    const data = parseJSON(stdout) as any;
    expect(typeof data).toBe('object');
    expect(typeof data.mode).toBe('string');
    expect(typeof data.readiness).toBe('object');
    expect(typeof data.readiness.score).toBe('number');
    expect(typeof data.defaults).toBe('object');
  });

  it('adopt --path <dir> --json has no spinner text', async () => {
    const root = await tempRoot();
    const { stdout } = run('adopt --path ' + root + ' --json', root);
    expect(stdout).not.toContain('Analyzing project');
    expect(stdout).not.toContain('Loading');
  });

  it('adopt --defaults --path <dir> --json writes files and returns valid JSON', async () => {
    const root = await tempRoot();
    const { stdout } = run('adopt --path ' + root + ' --defaults --json', root);
    const data = parseJSON(stdout) as any;
    expect(typeof data).toBe('object');
    expect(typeof data.mode).toBe('string');
    expect(typeof data.repair).toBe('object');
    expect(typeof data.repair.success).toBe('boolean');
    expect(Array.isArray(data.repair.created)).toBe(true);
  });

  it('adopt --help shows --defaults flag', () => {
    const { stdout } = run('adopt --help');
    expect(stdout).toContain('--defaults');
    expect(stdout).toContain('setup repair');
  });
});

describe('JSON regression: approval', () => {
  it('approval count --json returns valid JSON', () => {
    const { stdout } = run('approval count --json');
    const data = parseJSON(stdout) as unknown;
    expect(typeof data === 'object' || Array.isArray(data)).toBe(true);
  });

  it('approval list --json returns valid JSON', () => {
    const { stdout } = run('approval list --json');
    const data = parseJSON(stdout) as any;
    expect(typeof data).toBe('object');
    expect(Array.isArray(data.items)).toBe(true);
  });
});

describe('JSON regression: audit', () => {
  it('audit list --json returns valid JSON or text', () => {
    const { stdout } = run('audit list --json');
    const trimmed = stdout.trim();
    const isJSON = trimmed.startsWith('[') || trimmed.startsWith('{');
    const isText = trimmed.includes('No audit');
    expect(isJSON || isText).toBe(true);
  });
});

describe('JSON regression: init', () => {
  it('init --help shows --json flag', () => {
    const { stdout } = run('init --help');
    expect(stdout).toContain('--json');
  });

  it('init --help shows --defaults flag', () => {
    const { stdout } = run('init --help');
    expect(stdout).toContain('--defaults');
  });

  it('init --help shows --methodology flag', () => {
    const { stdout } = run('init --help');
    expect(stdout).toContain('--methodology');
  });
});

describe('JSON regression: orchestrator', () => {
  it('orchestrator run --workflow daily-briefing --json returns valid JSON', async () => {
    const root = await tempRoot();
    // Create minimal .ai-pm structure
    const fs = await import('node:fs/promises');
    await fs.mkdir(path.join(root, '.ai-pm/memory'), { recursive: true });
    await fs.mkdir(path.join(root, '.ai-pm/audit'), { recursive: true });
    await fs.writeFile(path.join(root, '.ai-pm/approvals.json'), '[]');
    const { stdout } = run('orchestrator run --workflow daily-briefing --json', root);
    const data = parseJSON(stdout) as any;
    expect(typeof data).toBe('object');
    expect(typeof data.valid).toBe('boolean');
    expect(typeof data.runId).toBe('string');
    expect(typeof data.status).toBe('string');
  });

  it('orchestrator list --json returns valid JSON', async () => {
    const root = await tempRoot();
    const fs = await import('node:fs/promises');
    await fs.mkdir(path.join(root, '.ai-pm/memory'), { recursive: true });
    await fs.mkdir(path.join(root, '.ai-pm/audit'), { recursive: true });
    await fs.writeFile(path.join(root, '.ai-pm/approvals.json'), '[]');
    const { stdout } = run('orchestrator list --json', root);
    const data = parseJSON(stdout) as unknown;
    // May be array (runs.json) or object (empty runs.json or no file)
    expect(typeof data === 'object').toBe(true);
  });
});

describe('JSON regression: schema', () => {
  it('schema list --json returns valid JSON', () => {
    const { stdout } = run('schema list --json');
    const data = parseJSON(stdout) as any;
    expect(typeof data).toBe('object');
    expect(typeof data.schemas).toBe('object');
    expect(Array.isArray(data.schemas)).toBe(true);
  });
});

describe('JSON regression: tracking command module', () => {
  it('tracking resolve --json returns valid JSON without spinner text', async () => {
    const root = await tempRoot();
    await mkdir(path.join(root, '.ai-pm'), { recursive: true });
    await writeFile(path.join(root, '.ai-pm', 'profile.yaml'), [
      'version: 1',
      'project:',
      '  project_id: tracking-json',
      '  name: Tracking Json',
      '  root: .',
      'tracking:',
      '  system: local_memory',
      '  mode: live',
      '',
    ].join('\n'));

    const stdout = await runTrackingCommand(root, ['resolve', '--json']);
    const data = parseJSON(stdout) as any;
    expect(typeof data).toBe('object');
    expect(data.tracking.system).toBe('local_memory');
    expect(stdout).not.toContain('Loading');
    expect(stdout).not.toContain('Running');
  });

  it('tracking create/complete/verify --json stay parseable across the flow', async () => {
    const root = await tempRoot();
    await mkdir(path.join(root, '.ai-pm'), { recursive: true });
    await writeFile(path.join(root, '.ai-pm', 'profile.yaml'), [
      'version: 1',
      'project:',
      '  project_id: tracking-flow',
      '  name: Tracking Flow',
      '  root: .',
      'tracking:',
      '  system: local_memory',
      '  mode: live',
      '',
    ].join('\n'));

    const createdRaw = await runTrackingCommand(root, [
      'create',
      '--title', 'JSON flow',
      '--agent', 'reporting',
      '--workflow', 'weekly-report',
      '--json',
    ]);
    const created = parseJSON(createdRaw) as any;
    expect(created.action).toBe('create');

    const completedRaw = await runTrackingCommand(root, [
      'complete',
      created.task.external_task_id,
      '--status', 'done',
      '--report', 'reports/json-flow.md',
      '--json',
    ]);
    const completed = parseJSON(completedRaw) as any;
    expect(completed.action).toBe('complete');
    expect(completed.completion.status_after_update).toBe('done');

    const verifiedRaw = await runTrackingCommand(root, [
      'verify',
      created.task.external_task_id,
      '--json',
    ]);
    const verified = parseJSON(verifiedRaw) as any;
    expect(verified.action).toBe('verify');
    expect(verified.verified).toBe(true);
  });
});

describe('JSON regression: skills', () => {
  it('skills list --json returns valid JSON', async () => {
    const root = await tempRoot();
    await mkdir(path.join(root, '.ai-pm-skills', 'tracking.resolve_project_tracker'), { recursive: true });
    await writeFile(path.join(root, '.ai-pm-skills', 'tracking.resolve_project_tracker', 'skill.json'), JSON.stringify({
      id: 'tracking.resolve_project_tracker',
      name: 'Resolve Project Tracker',
      category: 'tracking',
      description: 'Resolve active tracker',
      version: '1.0.0',
      owner: 'orchestrator',
      tags: ['tracking'],
    }, null, 2));
    await writeFile(path.join(root, '.ai-pm-skills', 'tracking.resolve_project_tracker', 'instructions.md'), 'resolve tracker');

    const { stdout } = run('skills list --json', root);
    const data = parseJSON(stdout) as any;
    expect(typeof data).toBe('object');
    expect(typeof data.total).toBe('number');
    expect(Array.isArray(data.skills)).toBe(true);
  });

  it('skills status --json returns valid JSON', async () => {
    const root = await tempRoot();
    await mkdir(path.join(root, '.ai-pm-skills', 'tracking.complete_task'), { recursive: true });
    await writeFile(path.join(root, '.ai-pm-skills', 'tracking.complete_task', 'skill.json'), JSON.stringify({
      id: 'tracking.complete_task',
      name: 'Complete Tracking Task',
      category: 'tracking',
      description: 'Complete tracking task',
      version: '1.0.0',
      owner: 'agent',
      tags: ['tracking'],
    }, null, 2));
    await writeFile(path.join(root, '.ai-pm-skills', 'tracking.complete_task', 'instructions.md'), 'complete');
    await mkdir(path.join(root, '.ai-pm', 'tracking'), { recursive: true });
    await writeFile(path.join(root, '.ai-pm', 'profile.yaml'), [
      'version: 1',
      'project:',
      '  project_id: skills-status-json',
      '  name: Skills Status Json',
      '  root: .',
      'tracking:',
      '  system: notion',
      '  mode: local_import',
      '',
    ].join('\n'));
    await writeFile(path.join(root, '.ai-pm', 'tracking', 'tasks.json'), JSON.stringify([{
      task_id: 't1',
      project_id: 'skills-status-json',
      assigned_agent: 'reporting',
      workflow_id: 'weekly-report',
      status: 'ready',
      external_task_id: 'notion-local:t1',
      external_task_url: 'file://issues.csv#t1',
      tracking: { tool: 'notion' },
      skill_required: { agent_complete: 'tracking.complete_task' },
    }], null, 2));

    const { stdout } = run('skills status --json --path ' + root, root);
    const data = parseJSON(stdout) as any;
    expect(typeof data).toBe('object');
    expect(data.project_id).toBe('skills-status-json');
    expect(Array.isArray(data.skills)).toBe(true);
  });
});
