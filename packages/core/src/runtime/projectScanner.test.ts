import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { scanProject } from './projectScanner.js';

const tempRoots: string[] = [];

async function tempRoot(): Promise<string> {
  const root = await mkdtemp(path.join(tmpdir(), 'ai-pm-scan-'));
  tempRoots.push(root);
  return root;
}

afterEach(async () => {
  await Promise.all(tempRoots.splice(0).map(root => rm(root, { recursive: true, force: true })));
});

describe('projectScanner', () => {
  it('returns low score for empty directory', async () => {
    const root = await tempRoot();
    const result = await scanProject(root);
    expect(result.ready).toBe(false);
    expect(result.score).toBe(0);
    expect(result.passedRequired).toBe(0);
    expect(result.checks.length).toBeGreaterThan(0);
  });

  it('returns ready=true when all required files exist', async () => {
    const root = await tempRoot();
    await writeFile(path.join(root, 'AGENTS.md'), '', 'utf-8');
    await writeFile(path.join(root, 'README.md'), '', 'utf-8');
    await mkdir(path.join(root, 'docs', 'superpowers', 'specs'), { recursive: true });
    await mkdir(path.join(root, 'docs', 'superpowers', 'plans'), { recursive: true });
    await mkdir(path.join(root, 'workflows'), { recursive: true });
    await mkdir(path.join(root, 'playbooks'), { recursive: true });
    await mkdir(path.join(root, 'mcp'), { recursive: true });
    await writeFile(path.join(root, 'mcp', 'registry.yaml'), '', 'utf-8');

    const result = await scanProject(root);
    expect(result.ready).toBe(true);
    expect(result.score).toBe(100);
    expect(result.passedRequired).toBe(result.totalRequired);
  });

  it('marks individual missing files correctly', async () => {
    const root = await tempRoot();
    await writeFile(path.join(root, 'AGENTS.md'), '', 'utf-8');
    // Missing README.md, workflows, etc.

    const result = await scanProject(root);
    const agentsCheck = result.checks.find(c => c.id === 'agents-md');
    const readmeCheck = result.checks.find(c => c.id === 'readme-md');
    expect(agentsCheck?.present).toBe(true);
    expect(readmeCheck?.present).toBe(false);
  });

  it('optional files do not affect ready status', async () => {
    const root = await tempRoot();
    await writeFile(path.join(root, 'AGENTS.md'), '', 'utf-8');
    await writeFile(path.join(root, 'README.md'), '', 'utf-8');
    await mkdir(path.join(root, 'docs', 'superpowers', 'specs'), { recursive: true });
    await mkdir(path.join(root, 'docs', 'superpowers', 'plans'), { recursive: true });
    await mkdir(path.join(root, 'workflows'), { recursive: true });
    await mkdir(path.join(root, 'playbooks'), { recursive: true });
    await mkdir(path.join(root, 'mcp'), { recursive: true });
    await writeFile(path.join(root, 'mcp', 'registry.yaml'), '', 'utf-8');

    const result = await scanProject(root);
    expect(result.ready).toBe(true);
    // Optional files like CLAUDE.md, templates/, schemas/ may be missing
    expect(result.passedOptional).toBeLessThanOrEqual(result.totalOptional);
  });

  it('does not mutate any files', async () => {
    const root = await tempRoot();
    await writeFile(path.join(root, 'AGENTS.md'), 'test', 'utf-8');
    const { readdir } = await import('node:fs/promises');

    const before = await readdir(root);
    await scanProject(root);
    const after = await readdir(root);
    expect(after).toEqual(before);
  });
});
