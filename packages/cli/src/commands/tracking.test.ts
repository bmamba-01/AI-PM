import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createTrackingCommand } from './tracking.js';

const tempRoots: string[] = [];

async function tempRoot(): Promise<string> {
  const root = await mkdtemp(path.join(tmpdir(), 'ai-pm-tracking-cli-'));
  tempRoots.push(root);
  return root;
}

async function writeProfile(root: string, yaml: string): Promise<void> {
  await mkdir(path.join(root, '.ai-pm'), { recursive: true });
  await writeFile(path.join(root, '.ai-pm', 'profile.yaml'), yaml, 'utf-8');
}

async function withCwd<T>(cwd: string, fn: () => Promise<T>): Promise<T> {
  const original = process.cwd();
  process.chdir(cwd);
  try {
    return await fn();
  } finally {
    process.chdir(original);
  }
}

async function runWithArgv(
  cwd: string,
  argv: string[],
): Promise<void> {
  const originalExit = process.exit;
  process.exit = (() => undefined) as never;
  try {
    await withCwd(cwd, async () => {
      const cmd = createTrackingCommand();
      await cmd.parseAsync(argv, { from: 'user' });
      await new Promise(resolve => setTimeout(resolve, 25));
    });
  } finally {
    process.exit = originalExit;
    process.exitCode = 0;
  }
}

afterEach(async () => {
  await Promise.all(tempRoots.splice(0).map(root => rm(root, { recursive: true, force: true })));
});

describe('tracking CLI', () => {
  let logSpy: ReturnType<typeof vi.spyOn>;
  let errSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    logSpy.mockRestore();
    errSpy.mockRestore();
  });

  it('resolve --json reports configured tracking and resolved adapter', async () => {
    const root = await tempRoot();
    await writeProfile(root, [
      'version: 1',
      'project:',
      '  project_id: demo-project',
      '  name: Demo Project',
      '  root: .',
      'tracking:',
      '  system: notion',
      '  mode: local_import',
      '  done_status: Done',
      '',
    ].join('\n'));

    await runWithArgv(root, ['resolve', '--json']);

    const out = logSpy.mock.calls.map(call => String(call[0])).join('');
    const parsed = JSON.parse(out);
    expect(parsed.project_id).toBe('demo-project');
    expect(parsed.tracking.system).toBe('notion');
    expect(parsed.tracking.mode).toBe('local_import');
    expect(typeof parsed.adapter.adapter_id).toBe('string');
  });

  it('create --json creates a tracked task', async () => {
    const root = await tempRoot();
    await writeProfile(root, [
      'version: 1',
      'project:',
      '  project_id: tracking-create',
      '  name: Tracking Create',
      '  root: .',
      'tracking:',
      '  system: local_memory',
      '  mode: live',
      '',
    ].join('\n'));

    await runWithArgv(root, [
      'create',
      '--title', 'Write weekly report',
      '--agent', 'reporting',
      '--workflow', 'weekly-report',
      '--json',
    ]);

    const out = logSpy.mock.calls.map(call => String(call[0])).join('');
    const parsed = JSON.parse(out);
    expect(parsed.action).toBe('create');
    expect(parsed.task.title).toBe('Write weekly report');
    expect(parsed.task.assigned_agent).toBe('reporting');
    expect(parsed.task.workflow_id).toBe('weekly-report');
    expect(parsed.task.status).toBe('ready');
    expect(parsed.lifecycle.external_task_id).toBe(parsed.task.external_task_id);
  });

  it('complete --json updates the task and verify --json confirms it', async () => {
    const root = await tempRoot();
    await writeProfile(root, [
      'version: 1',
      'project:',
      '  project_id: tracking-complete',
      '  name: Tracking Complete',
      '  root: .',
      'tracking:',
      '  system: local_memory',
      '  mode: live',
      '',
    ].join('\n'));

    await runWithArgv(root, [
      'create',
      '--title', 'Close the loop',
      '--agent', 'delivery_control',
      '--workflow', 'daily-briefing',
      '--json',
    ]);

    const createOut = logSpy.mock.calls.map(call => String(call[0])).join('');
    const created = JSON.parse(createOut);
    logSpy.mockClear();

    await runWithArgv(root, [
      'complete',
      created.task.external_task_id,
      '--status', 'done',
      '--report', 'reports/close-the-loop.md',
      '--json',
    ]);

    const completeOut = logSpy.mock.calls.map(call => String(call[0])).join('');
    const completed = JSON.parse(completeOut);
    expect(completed.action).toBe('complete');
    expect(completed.completion.external_task_id).toBe(created.task.external_task_id);
    expect(completed.completion.status_after_update).toBe('done');
    expect(completed.completion.evidence_refs).toContain('reports/close-the-loop.md');
    expect(completed.verification.complete).toBe(true);
    logSpy.mockClear();

    await runWithArgv(root, [
      'verify',
      created.task.external_task_id,
      '--json',
    ]);

    const verifyOut = logSpy.mock.calls.map(call => String(call[0])).join('');
    const verified = JSON.parse(verifyOut);
    expect(verified.action).toBe('verify');
    expect(verified.external_task_id).toBe(created.task.external_task_id);
    expect(verified.verified).toBe(true);
    expect(Array.isArray(verified.evidence)).toBe(true);
  });

  it('uses local_memory defaults when profile is missing', async () => {
    const root = await tempRoot();

    await runWithArgv(root, ['resolve', '--json']);

    const out = logSpy.mock.calls.map(call => String(call[0])).join('');
    const parsed = JSON.parse(out);
    expect(parsed.tracking.system).toBe('local_memory');
    expect(parsed.tracking.mode).toBe('manual');
    expect(parsed.adapter.adapter_id).toBe('local_memory');
    expect(parsed.profile_valid).toBe(false);
  });
});
