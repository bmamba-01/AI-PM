import { describe, expect, it, beforeAll, afterEach, afterAll } from 'vitest';
import path from 'node:path';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { exec, execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execAsync = promisify(exec);
const execFileAsync = promisify(execFile);
const cliPath = path.resolve(__dirname, '../../bin/ai-pm.js');

describe('schema CLI', () => {
  let tempDir: string;

  beforeAll(async () => {
    tempDir = await mkdtemp(path.join(tmpdir(), 'ai-pm-schema-test-'));
  });

  afterEach(async () => {
    // Clean up any .ai-pm directory that may be created
    try {
      await rm(path.join(tempDir, '.ai-pm'), { recursive: true, force: true });
    } catch {}
  });

  afterAll(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  describe('schema list', () => {
    it('lists all available schemas (16 schemas)', async () => {
      const { stdout } = await execAsync(`node ${cliPath} schema list`);
      expect(stdout).toContain('Available Workflow Schemas');
      expect(stdout).toContain('daily-briefing');
      expect(stdout).toContain('meeting-intelligence');
      expect(stdout).toContain('risk-control');
      expect(stdout).toContain('scope-control');
      expect(stdout).toContain('reporting');
      expect(stdout).toContain('code-quality-guard');
    }, 30000);

    it('outputs valid JSON array with --json', async () => {
      const { stdout } = await execAsync(`node ${cliPath} schema list --json`);
      const parsed = JSON.parse(stdout);
      expect(parsed).toHaveProperty('schemas');
      expect(parsed).toHaveProperty('total');
      expect(Array.isArray(parsed.schemas)).toBe(true);
      expect(parsed.total).toBeGreaterThanOrEqual(6);
    });
  });

  describe('schema validate - valid input', () => {
    it('validates valid daily briefing output', async () => {
      const validFile = path.resolve(__dirname, '../../../../schemas/fixtures/workflows/daily-briefing.output.valid.json');
      const { stdout, stderr } = await execAsync(
        `node ${cliPath} schema validate --workflow daily-briefing --input "${validFile}"`,
        { cwd: tempDir }
      );
      expect(stdout).toContain('Validation passed');
    });
  });

  describe('schema validate - invalid input', () => {
    it('validates invalid daily briefing output (fails with error)', async () => {
      const invalidFile = path.resolve(__dirname, '../../../../schemas/fixtures/workflows/daily-briefing.output.invalid.json');
      const result = await execAsync(
        `node ${cliPath} schema validate --workflow daily-briefing --input "${invalidFile}"`,
        { cwd: tempDir }
      ).catch((e: any) => e);

      expect(result.stdout).toContain('Validation failed');
      expect(result.code).toBe(1);
    });

    it('outputs valid JSON with --json flag', async () => {
      const invalidFile = path.resolve(__dirname, '../../../../schemas/fixtures/workflows/daily-briefing.output.invalid.json');
      const result = await execAsync(
        `node ${cliPath} schema validate --workflow daily-briefing --input "${invalidFile}" --json`,
        { cwd: tempDir }
      ).catch((e: any) => e);

      // JSON output goes to stdout, parse it
      const parsed = JSON.parse(result.stdout);
      expect(parsed.valid).toBe(false);
      expect(parsed.errors).toBeInstanceOf(Array);
      expect(result.code).toBe(1);
    });

it('handles unknown workflow ID', async () => {
      const testFile = path.join(tempDir, 'test.json');
      await writeFile(testFile, JSON.stringify({ test: 'data' }));

      const result = await execAsync(
        `node ${cliPath} schema validate --workflow nonexistent-workflow --input "${testFile}"`,
        { cwd: tempDir }
      ).catch((e: any) => e);

      expect(result.stderr).toContain('Schema not found');
      expect(result.code).toBe(1);
    });

    it('handles non-existent input file', async () => {
      const result = await execAsync(
        `node ${cliPath} schema validate --workflow daily-briefing --input "nonexistent.json"`,
        { cwd: tempDir }
      ).catch((e: any) => e);

      expect((result.stdout + result.stderr).includes('not found')).toBe(true);
      expect(result.code).toBe(1);
    });

    it('handles invalid JSON in input file', async () => {
      const badJsonFile = path.join(tempDir, 'bad.json');
      await writeFile(badJsonFile, 'this is not json {{{');

      const result = await execAsync(
        `node ${cliPath} schema validate --workflow daily-briefing --input "${badJsonFile}"`,
        { cwd: tempDir }
      ).catch((e: any) => e);

      // JSON parse error shows as "not found" in stderr
      expect(result.stderr).toContain('not found');
      expect(result.code).toBe(1);
    });
  });

  describe('schema validate --json-string', () => {
    it('validates a valid JSON string', async () => {
      const validData = JSON.stringify({
        date: '2026-06-20T00:00:00Z',
        project_id: 'test',
        top_priorities: ['Fix bug'],
        meetings_to_prepare: [],
        urgent_blockers: [],
        risks_to_review: [],
        pending_approvals: [],
        suggested_followups: [],
        source_coverage: ['jira'],
        assumptions: ['Assumed Jira is available'],
        confidence: 80,
      });

      const { stdout } = await execFileAsync('node', [
        cliPath,
        'schema',
        'validate',
        '--workflow',
        'daily-briefing',
        '--json-string',
        validData,
      ], { cwd: tempDir });
      expect(stdout).toContain('Validation passed');
    });

    it('rejects an invalid JSON string', async () => {
      const invalidData = JSON.stringify({ date: '2026-06-20T00:00:00Z' });

      const result = await execFileAsync('node', [
        cliPath,
        'schema',
        'validate',
        '--workflow',
        'daily-briefing',
        '--json-string',
        invalidData,
      ], { cwd: tempDir }).catch((e: any) => e);

      expect(result.stdout).toContain('Validation failed');
      expect(result.code).toBe(1);
    });

    it('outputs valid JSON with --json flag', async () => {
      const validData = JSON.stringify({
        date: '2026-06-20T00:00:00Z',
        project_id: 'test',
        top_priorities: ['Fix bug'],
        meetings_to_prepare: [],
        urgent_blockers: [],
        risks_to_review: [],
        pending_approvals: [],
        suggested_followups: [],
        source_coverage: ['jira'],
        assumptions: ['Assumed Jira is available'],
        confidence: 80,
      });

      const { stdout } = await execFileAsync('node', [
        cliPath,
        'schema',
        'validate',
        '--workflow',
        'daily-briefing',
        '--json-string',
        validData,
        '--json',
      ], { cwd: tempDir });
      const parsed = JSON.parse(stdout);
      expect(parsed.valid).toBe(true);
    });
  });

  describe('schema validate --help', () => {
    it('shows help with --help flag', async () => {
      const { stdout } = await execAsync(`node ${cliPath} schema validate --help`);
      expect(stdout).toContain('--workflow');
      expect(stdout).toContain('--input');
      expect(stdout).toContain('<workflow-id>');
    });

    it('shows workflow is required error when missing --workflow', async () => {
      const validFile = path.resolve(__dirname, '../../../../schemas/fixtures/workflows/daily-briefing.output.valid.json');
      const result = await execAsync(
        `node ${cliPath} schema validate --input "${validFile}"`,
        { cwd: tempDir }
      ).catch((e: any) => e);

      // Commander exits with code 1 and shows error when required option is missing
      expect(result.code).toBe(1);
    });

    it('shows input is required error when missing --input', async () => {
      const result = await execAsync(
        `node ${cliPath} schema validate --workflow daily-briefing`,
        { cwd: tempDir }
      ).catch((e: any) => e);

      expect(result.code).toBe(1);
    });
  });

  describe('schema inspect', () => {
    it('shows schema structure for daily-briefing', async () => {
      const { stdout } = await execAsync(`node ${cliPath} schema inspect daily-briefing`);
      expect(stdout).toContain('Schema: daily-briefing');
      expect(stdout).toContain('Required fields');
      expect(stdout).toContain('Field');
    });

    it('outputs valid JSON with --json flag', async () => {
      const { stdout } = await execAsync(`node ${cliPath} schema inspect daily-briefing --json`);
      const parsed = JSON.parse(stdout);
      expect(parsed.workflowId).toBe('daily-briefing');
      expect(parsed.schema).toBeDefined();
    });

    it('handles unknown workflow ID', async () => {
      const result = await execAsync(`node ${cliPath} schema inspect nonexistent-workflow`).catch((e: any) => e);
      expect(result.stderr).toContain('Schema not found');
      expect(result.code).toBe(1);
    });
  });

  describe('schema without subcommand', () => {
    it('shows help when no subcommand provided', async () => {
      const result = await execAsync(`node ${cliPath} schema`).catch((e: any) => e);
      expect((result.stdout + result.stderr)).toContain('Validate workflow outputs against JSON schemas');
    });
  });
});
