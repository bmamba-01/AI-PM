import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, rm, writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { validateProfile, applyProfileDefaults, loadProfile } from './projectProfile.js';

let tempDir: string;

beforeEach(async () => {
  tempDir = await mkdtemp(join(tmpdir(), 'profile-test-'));
});

afterEach(async () => {
  await rm(tempDir, { recursive: true, force: true });
});

// ─── applyProfileDefaults ────────────────────────────────────────────────────

describe('applyProfileDefaults', () => {
  it('fills all defaults for empty input', () => {
    const p = applyProfileDefaults({});
    expect(p.version).toBe(1);
    expect(p.project.project_id).toBe('unknown');
    expect(p.project.name).toBe('Unknown Project');
    expect(p.project.root).toBe('.');
    expect(p.project.timezone).toBe('UTC');
    expect(p.connectors).toEqual({});
    expect(p.artifacts).toBeDefined();
    expect(p.approval_policy).toBeDefined();
  });

  it('preserves existing values', () => {
    const input = {
      version: 2,
      project: {
        project_id: 'proj-001',
        name: 'Test',
        root: '/tmp',
        methodology: 'scrum',
        project_type: 'fixed_cost',
        timezone: 'Asia/Tokyo',
        tags: ['ai'],
      },
    };
    const p = applyProfileDefaults(input);
    expect(p.version).toBe(2);
    expect(p.project.methodology).toBe('scrum');
    expect(p.project.project_type).toBe('fixed_cost');
    expect(p.project.timezone).toBe('Asia/Tokyo');
  });
});

// ─── validateProfile ─────────────────────────────────────────────────────────

describe('validateProfile', () => {
  it('valid profile passes', () => {
    const result = validateProfile({
      version: 1,
      project: { project_id: 'p1', name: 'Test', root: '.' },
    });
    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it('rejects non-object input', () => {
    const result = validateProfile(null);
    expect(result.valid).toBe(false);
  });

  it('rejects missing project', () => {
    const result = validateProfile({ version: 1 });
    expect(result.valid).toBe(false);
  });

  it('rejects empty project_id', () => {
    const result = validateProfile({
      version: 1,
      project: { project_id: '', name: 'Test', root: '.' },
    });
    expect(result.valid).toBe(false);
  });

  it('rejects invalid methodology', () => {
    const result = validateProfile({
      version: 1,
      project: { project_id: 'p1', name: 'Test', root: '.', methodology: 'invalid' },
    });
    expect(result.valid).toBe(false);
  });

  it('accepts valid methodology', () => {
    const result = validateProfile({
      version: 1,
      project: { project_id: 'p1', name: 'Test', root: '.', methodology: 'scrum' },
    });
    expect(result.valid).toBe(true);
  });

  it('rejects invalid project_type', () => {
    const result = validateProfile({
      version: 1,
      project: { project_id: 'p1', name: 'Test', root: '.', project_type: 'invalid' },
    });
    expect(result.valid).toBe(false);
  });

  it('accepts valid project_type', () => {
    const result = validateProfile({
      version: 1,
      project: { project_id: 'p1', name: 'Test', root: '.', project_type: 'fixed_cost' },
    });
    expect(result.valid).toBe(true);
  });

  it('accepts null methodology and project_type', () => {
    const result = validateProfile({
      version: 1,
      project: { project_id: 'p1', name: 'Test', root: '.', methodology: null, project_type: null },
    });
    expect(result.valid).toBe(true);
  });

  it('warns on unknown connectors', () => {
    const result = validateProfile({
      version: 1,
      project: { project_id: 'p1', name: 'Test', root: '.' },
      connectors: { unknown_service: { enabled: true } },
    });
    expect(result.warnings.some(w => w.includes('Unknown connector'))).toBe(true);
  });

  it('rejects non-boolean approval_policy values', () => {
    const result = validateProfile({
      version: 1,
      project: { project_id: 'p1', name: 'Test', root: '.' },
      approval_policy: { require_approval_for_email: 'yes' },
    });
    expect(result.valid).toBe(false);
  });

  it('accepts valid complete profile', () => {
    const result = validateProfile({
      version: 1,
      project: {
        project_id: 'proj-001',
        name: 'AI-PM Toolkit',
        root: '.',
        description: 'Test project',
        methodology: 'scrum',
        project_type: 'product',
        timezone: 'UTC',
        tags: ['test'],
      },
      connectors: {
        github: { enabled: true, repo: 'test/repo' },
        jira: { enabled: false },
      },
      artifacts: { root: '.', reports: 'reports' },
      approval_policy: { require_approval_for_email: true, auto_approve_read_only: true },
    });
    expect(result.valid).toBe(true);
    expect(result.profile.project.name).toBe('AI-PM Toolkit');
  });
});

// ─── loadProfile ─────────────────────────────────────────────────────────────

describe('loadProfile', () => {
  it('returns error for missing file', async () => {
    const result = await loadProfile('/nonexistent/path');
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('not found'))).toBe(true);
  });
});
