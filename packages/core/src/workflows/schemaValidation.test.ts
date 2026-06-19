import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { loadWorkflowSchema, validateWorkflowOutput, createDefaultValidator } from './schemaValidation.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const schemasDir = path.resolve(__dirname, '../../../../schemas/workflows');

/** Fixture: valid daily briefing output (snake_case, matches schema). */
const validBriefOutput = {
  date: '2026-06-19T00:00:00Z',
  project_id: 'alpha',
  top_priorities: ['Fix payment gateway timeout'],
  meetings_to_prepare: ['Client sync'],
  urgent_blockers: ['Payment gateway timeout'],
  risks_to_review: ['UAT environment not ready'],
  pending_approvals: ['Approve release PR'],
  suggested_followups: ['Reply to vendor'],
  source_coverage: ['jira', 'calendar'],
  assumptions: ['calendar data was cached'],
  confidence: 82,
};

describe('loadWorkflowSchema', () => {
  it('loads the daily-briefing output schema', async () => {
    const schema = await loadWorkflowSchema('daily-briefing', schemasDir);
    expect(schema).not.toBeNull();
    expect(schema).toHaveProperty('required');
    expect((schema as Record<string, unknown>).required).toContain('confidence');
  });

  it('returns null for unknown workflow', async () => {
    const schema = await loadWorkflowSchema('nonexistent-workflow', schemasDir);
    expect(schema).toBeNull();
  });
});

describe('validateWorkflowOutput', () => {
  it('validates correct daily briefing output', async () => {
    const result = await validateWorkflowOutput('daily-briefing', validBriefOutput, schemasDir);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
    expect(result.warnings).toHaveLength(0);
  });

  it('rejects missing required field (confidence)', async () => {
    const invalid = { ...validBriefOutput };
    delete (invalid as Record<string, unknown>).confidence;
    const result = await validateWorkflowOutput('daily-briefing', invalid, schemasDir);
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors.some(e => e.includes('confidence'))).toBe(true);
  });

  it('rejects confidence out of range', async () => {
    const invalid = { ...validBriefOutput, confidence: 150 };
    const result = await validateWorkflowOutput('daily-briefing', invalid, schemasDir);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('confidence'))).toBe(true);
  });

  it('rejects additional properties', async () => {
    const invalid = { ...validBriefOutput, unknown_field: 'bad' };
    const result = await validateWorkflowOutput('daily-briefing', invalid, schemasDir);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('additional'))).toBe(true);
  });

  it('rejects invalid date-time format', async () => {
    const invalid = { ...validBriefOutput, date: '2026-06-19' };
    const result = await validateWorkflowOutput('daily-briefing', invalid, schemasDir);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('date'))).toBe(true);
  });

  it('rejects completely malformed date-time', async () => {
    const invalid = { ...validBriefOutput, date: 'not-a-date' };
    const result = await validateWorkflowOutput('daily-briefing', invalid, schemasDir);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('date'))).toBe(true);
  });

  it('returns valid with warning when schema file is missing', async () => {
    const result = await validateWorkflowOutput('nonexistent-workflow', { anything: true }, schemasDir);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
    expect(result.warnings.length).toBe(1);
    expect(result.warnings[0]).toContain('nonexistent-workflow');
  });

  it('validates valid fixture file', async () => {
    const { readFileSync } = await import('node:fs');
    const fixture = JSON.parse(
      readFileSync(path.join(schemasDir, '../fixtures/workflows/daily-briefing.output.valid.json'), 'utf-8'),
    );
    const result = await validateWorkflowOutput('daily-briefing', fixture, schemasDir);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('rejects invalid fixture file', async () => {
    const { readFileSync } = await import('node:fs');
    const fixture = JSON.parse(
      readFileSync(path.join(schemasDir, '../fixtures/workflows/daily-briefing.output.invalid.json'), 'utf-8'),
    );
    const result = await validateWorkflowOutput('daily-briefing', fixture, schemasDir);
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });
});

describe('createDefaultValidator', () => {
  it('validates using default schemas directory', async () => {
    const validator = createDefaultValidator();
    const result = await validator.validate('daily-briefing', validBriefOutput);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });
});
