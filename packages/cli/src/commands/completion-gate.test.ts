import { execSync } from 'node:child_process';
import { describe, it, expect } from 'vitest';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const CLI = path.resolve(__dirname, '../../bin/ai-pm.js');
const OPTS = { cwd: process.cwd(), encoding: 'utf-8' as const };

function run(cmd: string): { stdout: string; exitCode: number } {
  try {
    const stdout = execSync(`node "${CLI}" ${cmd}`, OPTS).toString();
    return { stdout, exitCode: 0 };
  } catch (err: any) {
    return { stdout: err.stdout?.toString() ?? '', exitCode: err.status ?? 1 };
  }
}

function parseJSON(raw: string): unknown {
  return JSON.parse(raw);
}

describe('completion gate', () => {
  it('--help exits 0', () => {
    const { exitCode, stdout } = run('--help');
    expect(exitCode).toBe(0);
    expect(stdout).toContain('AI-PM Toolkit CLI');
  });

  it('approval count --json returns valid JSON', () => {
    const { exitCode, stdout } = run('approval count --json');
    expect(exitCode).toBe(0);
    const data = parseJSON(stdout) as Record<string, unknown>;
    expect(typeof data).toBe('object');
  });

  it('memory summary --json returns valid JSON', () => {
    const { exitCode, stdout } = run('memory summary --json');
    expect(exitCode).toBe(0);
    const data = parseJSON(stdout) as Record<string, unknown>;
    expect(typeof data.totalTasks).toBe('number');
    expect(typeof data.totalArtifacts).toBe('number');
  });

  it('audit list --json returns valid output', () => {
    const { exitCode, stdout } = run('audit list --json');
    expect(exitCode).toBe(0);
    // Empty store may print text "No audit records..." — that's acceptable
    const trimmed = stdout.trim();
    const isJSON = trimmed.startsWith('[') || trimmed.startsWith('{');
    const isText = trimmed.includes('No audit');
    expect(isJSON || isText).toBe(true);
  });

  it('project scan --json returns ready and score', () => {
    const { exitCode, stdout } = run('project scan --json');
    expect(exitCode).toBe(0);
    const data = parseJSON(stdout) as Record<string, unknown>;
    expect(typeof data.ready).toBe('boolean');
    expect(typeof data.score).toBe('number');
  });

  it('schema list --json returns valid JSON', () => {
    const { exitCode, stdout } = run('schema list --json');
    expect(exitCode).toBe(0);
    const data = parseJSON(stdout) as unknown;
    // May return array or object with schemas property
    expect(Array.isArray(data) || typeof data === 'object').toBe(true);
  });

  it('init --help exits 0', () => {
    const { exitCode, stdout } = run('init --help');
    expect(exitCode).toBe(0);
    expect(stdout).toContain('Initialize');
  });

  it('approval --help exits 0', () => {
    const { exitCode, stdout } = run('approval --help');
    expect(exitCode).toBe(0);
    expect(stdout).toContain('approval');
  });

  it('orchestrator --help exits 0', () => {
    const { exitCode, stdout } = run('orchestrator --help');
    expect(exitCode).toBe(0);
    expect(stdout).toContain('orchestration');
  });

  it('agent status --json returns capability report', () => {
    const { exitCode, stdout } = run('agent status --json');
    expect(exitCode).toBe(0);
    const data = parseJSON(stdout) as Record<string, unknown>;
    expect(data.name).toBe('ai-pm');
    expect(Array.isArray(data.agents)).toBe(true);
  });

  it('project profile validate --json returns valid JSON', () => {
    const { exitCode, stdout } = run('project profile validate --json');
    const trimmed = stdout.trim();
    // May exit non-zero when no profile exists; JSON output still valid
    const isJSON = trimmed.startsWith('{') || trimmed.startsWith('[');
    expect(isJSON).toBe(true);
    const data = parseJSON(trimmed) as Record<string, unknown>;
    expect(typeof data).toBe('object');
    expect(typeof data.valid).toBe('boolean');
  });

  it('mcp validate --json returns valid report', () => {
    const { exitCode, stdout } = run('mcp validate --json');
    expect(exitCode).toBe(0);
    const data = parseJSON(stdout) as Record<string, unknown>;
    expect(typeof data).toBe('object');
    expect(typeof data.valid).toBe('boolean');
  });

  it('mcp doctor --json returns health report', () => {
    const { exitCode, stdout } = run('mcp doctor --json');
    expect(exitCode).toBe(0);
    const data = parseJSON(stdout) as Record<string, unknown>;
    expect(typeof data).toBe('object');
    expect(typeof data.health).toBe('string');
    expect(Array.isArray(data.connectors)).toBe(true);
  });

  it('agent route --workflow daily-briefing --json returns primary agent', () => {
    const { exitCode, stdout } = run('agent route --workflow daily-briefing --json');
    expect(exitCode).toBe(0);
    const data = parseJSON(stdout) as Record<string, unknown>;
    expect(data.workflowId).toBe('daily-briefing');
    expect(data.primaryAgent).toBeDefined();
  });

  it('traceability build --help exits 0', () => {
    const { exitCode, stdout } = run('traceability build --help');
    expect(exitCode).toBe(0);
    expect(stdout).toContain('traceability matrix');
  });

  it('code-quality review --help exits 0', () => {
    const { exitCode, stdout } = run('code-quality review --help');
    expect(exitCode).toBe(0);
    expect(stdout).toContain('Review a local diff');
  });
});
