import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { createDefaultValidator, SchemaValidator } from './schemaValidation.js';

describe('SchemaValidator', () => {
  const schemasDir = path.resolve(__dirname, '../../../../schemas/workflows');
  const validator = new SchemaValidator(schemasDir);
  const briefOutput = {
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
    proposed_external_actions: [
      { action: 'merge_pr', target_system: 'github', approval_required: true },
    ],
  };

  it('validates correct daily briefing output', async () => {
    const result = await validator.validateWorkflowOutput('daily-briefing', briefOutput);
    expect(result.valid).toBe(true);
    expect(result.issues).toHaveLength(0);
    expect(result.schemaPath).toContain('daily-briefing.output.schema.json');
  });

  it('rejects missing required field', async () => {
    const invalid = { ...briefOutput };
    delete (invalid as Record<string, unknown>).top_priorities;
    const result = await validator.validateWorkflowOutput('daily-briefing', invalid);
    expect(result.valid).toBe(false);
    expect(result.issues.some(i => i.keyword === 'required' && i.path === '$')).toBe(true);
  });

  it('rejects confidence out of range', async () => {
    const invalid = { ...briefOutput, confidence: 150 };
    const result = await validator.validateWorkflowOutput('daily-briefing', invalid);
    expect(result.valid).toBe(false);
    expect(result.issues.some(i => (i.keyword === 'maximum' || i.keyword === 'type') && i.path === '$.confidence')).toBe(true);
  });

  it('rejects additional properties', async () => {
    const invalid = { ...briefOutput, unknown_field: 'bad' };
    const result = await validator.validateWorkflowOutput('daily-briefing', invalid);
    expect(result.valid).toBe(false);
    expect(result.issues.some(i => i.keyword === 'additionalProperties' && i.path === '$.unknown_field')).toBe(true);
  });

  it('returns valid with empty issues when schema file is missing', async () => {
    const missingValidator = new SchemaValidator('/path/that/does/not/exist');
    const result = await missingValidator.validateWorkflowOutput('nonexistent-workflow', { foo: 1 });
    expect(result.valid).toBe(true);
    expect(result.issues).toHaveLength(0);
    expect(result.schemaPath).toContain('nonexistent-workflow.output.schema.json');
  });

  it('default validator resolves schemas from repo', async () => {
    const defaultValidator = createDefaultValidator();
    const result = await defaultValidator.validateWorkflowOutput('daily-briefing', briefOutput);
    expect(result.valid).toBe(true);
    expect(result.schemaPath).toContain('daily-briefing.output.schema.json');
  });
});
