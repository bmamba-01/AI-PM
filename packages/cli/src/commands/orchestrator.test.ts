import { describe, expect, it, beforeAll, afterAll } from 'vitest';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);
const cliPath = path.resolve(__dirname, '../../bin/ai-pm.js');

describe('orchestrator CLI', () => {
  let tempDir: string;

  beforeAll(async () => {
    tempDir = await mkdtemp(path.join(tmpdir(), 'ai-pm-orch-test-'));
  });

  afterAll(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  describe('orchestrator --help', () => {
    it('shows help', async () => {
      const { stdout } = await execFileAsync('node', [cliPath, 'orchestrator', '--help']);
      expect(stdout).toContain('orchestr');
      expect(stdout).toContain('run');
    });

    it('shows run subcommand help', async () => {
      const { stdout } = await execFileAsync('node', [cliPath, 'orchestrator', 'run', '--help']);
      expect(stdout).toContain('--workflow');
    });
  });

  describe('orchestrator run', () => {
    it('runs daily-briefing workflow', async () => {
      const { stdout } = await execFileAsync('node', [
        cliPath, 'orchestrator', 'run', '--workflow', 'daily-briefing', '--json',
      ], { cwd: tempDir, timeout: 60000 });
      const result = JSON.parse(stdout);
      expect(result.runId).toBeDefined();
      expect(result.workflowId).toBe('daily-briefing');
      expect(result.status).toBe('completed');
      expect(result.output).toBeDefined();
    });

    it('runs weekly-report workflow', async () => {
      const { stdout } = await execFileAsync('node', [
        cliPath, 'orchestrator', 'run', '--workflow', 'weekly-report', '--json',
      ], { cwd: tempDir, timeout: 60000 });
      const result = JSON.parse(stdout);
      expect(result.workflowId).toBe('weekly-report');
      expect(result.status).toBe('completed');
    });

    it('runs risk-control workflow', async () => {
      const { stdout } = await execFileAsync('node', [
        cliPath, 'orchestrator', 'run', '--workflow', 'risk-control', '--json',
      ], { cwd: tempDir });
      const result = JSON.parse(stdout);
      expect(result.workflowId).toBe('risk-control');
      expect(result.status).toBe('completed');
    });

    it('fails gracefully for unknown workflow', async () => {
      const result = await execFileAsync('node', [
        cliPath, 'orchestrator', 'run', '--workflow', 'nonexistent', '--json',
      ], { cwd: tempDir }).catch((e: any) => e);
      expect(result.code).toBe(1);
    });

    it('requires --workflow option', async () => {
      const result = await execFileAsync('node', [
        cliPath, 'orchestrator', 'run',
      ], { cwd: tempDir }).catch((e: any) => e);
      expect(result.code).toBe(1);
    });

    it('degrades gracefully when .ai-pm is absent', async () => {
      const freshDir = await mkdtemp(path.join(tmpdir(), 'ai-pm-orch-fresh-'));
      try {
        const { stdout } = await execFileAsync('node', [
          cliPath, 'orchestrator', 'run', '--workflow', 'daily-briefing', '--json',
        ], { cwd: freshDir });
        const result = JSON.parse(stdout);
        // Should still succeed even without .ai-pm directory
        expect(result.valid).toBe(true);
      } finally {
        await rm(freshDir, { recursive: true, force: true });
      }
    });

    it('persists run record in .ai-pm/orchestrator/runs.json', async () => {
      await execFileAsync('node', [
        cliPath, 'orchestrator', 'run', '--workflow', 'daily-briefing',
      ], { cwd: tempDir });
      const { readFile } = await import('node:fs/promises');
      const runsPath = path.join(tempDir, '.ai-pm', 'orchestrator', 'runs.json');
      const raw = await readFile(runsPath, 'utf-8');
      const runs = JSON.parse(raw);
      expect(Array.isArray(runs)).toBe(true);
      expect(runs.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('orchestrator status', () => {
    it('shows run status by ID', async () => {
      // First run something (long timeout for orchestrator state machine)
      const { stdout: runOut } = await execFileAsync('node', [
        cliPath, 'orchestrator', 'run', '--workflow', 'daily-briefing', '--json',
      ], { cwd: tempDir, timeout: 120000 });
      const runResult = JSON.parse(runOut);

      // Then check status
      const { stdout } = await execFileAsync('node', [
        cliPath, 'orchestrator', 'status', runResult.runId, '--json',
      ], { cwd: tempDir, timeout: 30000 });
      const status = JSON.parse(stdout);
      expect(status.runId).toBe(runResult.runId);
      expect(status.workflowId).toBe('daily-briefing');
      expect(status.status).toBe('completed');
    }, 180000);

    it('fails for nonexistent run ID', async () => {
      const result = await execFileAsync('node', [
        cliPath, 'orchestrator', 'status', 'nonexistent-run-id',
      ], { cwd: tempDir, timeout: 10000 }).catch((e: any) => e);
      expect(result.code).toBe(1);
    });
  });

  describe('orchestrator list', () => {
    it('lists all runs', async () => {
      const { stdout } = await execFileAsync('node', [
        cliPath, 'orchestrator', 'list', '--json',
      ], { cwd: tempDir });
      const result = JSON.parse(stdout);
      expect(result).toHaveProperty('runs');
      expect(result).toHaveProperty('total');
      expect(Array.isArray(result.runs)).toBe(true);
    });
  });

  describe('agent status', () => {
    it('shows agent capabilities', async () => {
      const { stdout } = await execFileAsync('node', [
        cliPath, 'agent', 'status', '--json',
      ]);
      const result = JSON.parse(stdout);
      expect(result.name).toBe('ai-pm');
      expect(result.version).toBe('0.1.0');
      expect(Array.isArray(result.agents)).toBe(true);
      expect(result.agents.length).toBeGreaterThan(0);
    });
  });
});
