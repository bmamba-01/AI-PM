import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, rm, mkdir, writeFile } from 'node:fs/promises';
import * as path from 'node:path';
import { tmpdir } from 'node:os';
const join = path.join;
import {
  determineSetupMode,
  checkReadiness,
  formatReadinessSummary,
  DEFAULT_SETUP,
  type SetupMode,
} from './setupProfile.js';

// ─── Helpers ─────────────────────────────────────────────────────────────────

let tempDir: string;

beforeEach(async () => {
  tempDir = await mkdtemp(path.join(tmpdir(), 'setup-test-'));
});

afterEach(async () => {
  await rm(tempDir, { recursive: true, force: true });
});

async function touch(relPath: string) {
  await mkdir(join(tempDir, relPath, '..'), { recursive: true });
  await writeFile(join(tempDir, relPath), '', 'utf-8');
}

// ─── determineSetupMode ──────────────────────────────────────────────────────

describe('determineSetupMode', () => {
  it('returns new_project for empty directory', async () => {
    const mode = await determineSetupMode(tempDir);
    expect(mode).toBe('new_project');
  });

  it('returns adopt_existing when .ai-pm/profile.yaml exists', async () => {
    await touch('.ai-pm/profile.yaml');
    const mode = await determineSetupMode(tempDir);
    expect(mode).toBe('adopt_existing');
  });

  it('returns adopt_existing when .ai-pm dir exists', async () => {
    await mkdir(join(tempDir, '.ai-pm'), { recursive: true });
    await writeFile(join(tempDir, '.ai-pm', 'test.txt'), '', 'utf-8');
    const mode = await determineSetupMode(tempDir);
    expect(mode).toBe('adopt_existing');
  });
});

// ─── checkReadiness ──────────────────────────────────────────────────────────

describe('checkReadiness', () => {
  it('low score for empty directory', async () => {
    const result = await checkReadiness(tempDir);
    expect(result.score).toBeLessThan(50);
    expect(result.blocking.length).toBeGreaterThan(0);
    expect(result.nextCommands.length).toBeGreaterThan(0);
  });

  it('high score when all required files exist', async () => {
    await touch('.ai-pm/profile.yaml');
    await touch('.ai-pm/memory/state.json');
    await touch('.ai-pm/audit/workflow-runs.jsonl');
    await writeFile(join(tempDir, '.ai-pm', 'approvals.json'), '[]');
    await touch('AGENTS.md');

    const result = await checkReadiness(tempDir);
    expect(result.score).toBeGreaterThanOrEqual(80);
    expect(result.blocking.length).toBe(0);
  });

  it('100 score when all files exist', async () => {
    await touch('.ai-pm/profile.yaml');
    await touch('.ai-pm/memory/state.json');
    await touch('.ai-pm/audit/workflow-runs.jsonl');
    await writeFile(join(tempDir, '.ai-pm', 'approvals.json'), '[]');
    await touch('AGENTS.md');
    await touch('CODEX.md');
    await touch('CLAUDE.md');
    await touch('reports/weekly.md');
    await touch('templates/daily.md');
    await touch('mcp/registry.yaml');

    const result = await checkReadiness(tempDir);
    expect(result.score).toBe(100);
    expect(result.blocking.length).toBe(0);
    expect(result.warnings.length).toBe(0);
  });

  it('includes next commands', async () => {
    const result = await checkReadiness(tempDir);
    expect(result.nextCommands).toContain('ai-pm project scan --json');
    expect(result.nextCommands).toContain('ai-pm mcp validate --json');
  });

  it('includes setup repair when blocking items exist', async () => {
    const result = await checkReadiness(tempDir);
    expect(result.nextCommands.some(c => c.includes('setup repair'))).toBe(true);
  });
});

// ─── formatReadinessSummary ──────────────────────────────────────────────────

describe('formatReadinessSummary', () => {
  it('formats output with blocking items', async () => {
    const result = await checkReadiness(tempDir);
    const summary = formatReadinessSummary(result);
    expect(summary).toContain('Setup Mode:');
    expect(summary).toContain('Readiness Score:');
    expect(summary).toContain('BLOCKING');
    expect(summary).toContain('Next commands:');
  });

  it('formats clean output when all passes', async () => {
    await touch('.ai-pm/profile.yaml');
    await touch('.ai-pm/memory/state.json');
    await touch('.ai-pm/audit/workflow-runs.jsonl');
    await writeFile(join(tempDir, '.ai-pm', 'approvals.json'), '[]');
    await touch('AGENTS.md');
    await touch('CODEX.md');
    await touch('CLAUDE.md');
    await touch('reports/weekly.md');
    await touch('templates/daily.md');
    await touch('mcp/registry.yaml');

    const result = await checkReadiness(tempDir);
    const summary = formatReadinessSummary(result);
    expect(summary).toContain('All checks passed');
  });
});

// ─── DEFAULT_SETUP ───────────────────────────────────────────────────────────

describe('DEFAULT_SETUP', () => {
  it('has all required fields', () => {
    expect(DEFAULT_SETUP.methodology).toBe('scrum');
    expect(DEFAULT_SETUP.project_type).toBe('software');
    expect(DEFAULT_SETUP.commercial_model).toBe('fixed_cost');
    expect(DEFAULT_SETUP.timezone).toBe('Asia/Saigon');
    expect(DEFAULT_SETUP.connector_profile).toBe('offline-local');
    expect(DEFAULT_SETUP.approval_gated).toBe(true);
  });
});
