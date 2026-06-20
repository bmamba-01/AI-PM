import { mkdtemp, rm, writeFile, mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { scanProject } from '@ai-pm/core/runtime';

const tempRoots: string[] = [];

async function tempRoot(): Promise<string> {
  const root = await mkdtemp(path.join(tmpdir(), 'ai-pm-project-cli-'));
  tempRoots.push(root);
  return root;
}

afterEach(async () => {
  await Promise.all(tempRoots.splice(0).map(root => rm(root, { recursive: true, force: true })));
});

describe('project scan — store layer', () => {
  it('empty dir returns score 0', async () => {
    const root = await tempRoot();
    const result = await scanProject(root);
    expect(result.score).toBe(0);
    expect(result.ready).toBe(false);
    expect(result.passedRequired).toBe(0);
    expect(result.totalRequired).toBeGreaterThan(0);
  });

  it('full project returns score 100', async () => {
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
    expect(result.score).toBe(100);
    expect(result.ready).toBe(true);
    expect(result.passedRequired).toBe(result.totalRequired);
  });

  it('json output is valid JSON', async () => {
    const root = await tempRoot();
    const result = await scanProject(root);
    const json = JSON.stringify(result, null, 2);
    const parsed = JSON.parse(json);
    expect(parsed.score).toBe(0);
    expect(parsed.ready).toBe(false);
    expect(Array.isArray(parsed.checks)).toBe(true);
  });

  it('partial project returns partial score', async () => {
    const root = await tempRoot();
    await writeFile(path.join(root, 'AGENTS.md'), '', 'utf-8');
    await writeFile(path.join(root, 'README.md'), '', 'utf-8');
    // Missing: design-spec, active-plan, workflows, playbooks, mcp-registry

    const result = await scanProject(root);
    expect(result.score).toBeGreaterThan(0);
    expect(result.score).toBeLessThan(100);
    expect(result.ready).toBe(false);
    expect(result.passedRequired).toBeLessThan(result.totalRequired);
  });

  it('checks are individually marked', async () => {
    const root = await tempRoot();
    await writeFile(path.join(root, 'AGENTS.md'), '', 'utf-8');

    const result = await scanProject(root);
    const agentsCheck = result.checks.find(c => c.id === 'agents-md');
    const readmeCheck = result.checks.find(c => c.id === 'readme-md');
    expect(agentsCheck?.present).toBe(true);
    expect(readmeCheck?.present).toBe(false);
  });

  it('optional files do not affect ready status', async () => {
    const root = await tempRoot();
    // Create only required files
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

  it('nested docs paths are detected', async () => {
    const root = await tempRoot();
    await mkdir(path.join(root, 'docs', 'superpowers', 'specs'), { recursive: true });
    const result = await scanProject(root);
    const specCheck = result.checks.find(c => c.id === 'design-spec');
    expect(specCheck?.present).toBe(true);
  });

  it('all checks have required fields', async () => {
    const root = await tempRoot();
    const result = await scanProject(root);
    for (const check of result.checks) {
      expect(check).toHaveProperty('id');
      expect(check).toHaveProperty('present');
      expect(check).toHaveProperty('required');
      expect(typeof check.id).toBe('string');
      expect(typeof check.present).toBe('boolean');
      expect(typeof check.required).toBe('boolean');
    }
  });

  it('score is between 0 and 100', async () => {
    const root = await tempRoot();
    await writeFile(path.join(root, 'AGENTS.md'), '', 'utf-8');
    await writeFile(path.join(root, 'README.md'), '', 'utf-8');
    const result = await scanProject(root);
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(100);
  });

  it('ready is true only when all required checks pass', async () => {
    const root = await tempRoot();
    // Create all required items
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
    expect(result.passedRequired).toBe(result.totalRequired);
  });

  it('does not write to disk', async () => {
    const root = await tempRoot();
    const { readdir } = await import('node:fs/promises');
    const before = await readdir(root);
    await scanProject(root);
    const after = await readdir(root);
    expect(after).toEqual(before);
  });
});
