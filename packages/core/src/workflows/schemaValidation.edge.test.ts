import { mkdtemp, rm, writeFile, mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, describe, expect, it } from 'vitest';
import { loadWorkflowSchema, validateWorkflowOutput } from './schemaValidation.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const schemasDir = path.resolve(__dirname, '../../../../schemas/workflows');

const tempRoots: string[] = [];

async function tempDir(): Promise<string> {
  const root = await mkdtemp(path.join(tmpdir(), 'ai-pm-schema-edge-'));
  tempRoots.push(root);
  return root;
}

afterEach(async () => {
  await Promise.all(tempRoots.splice(0).map(root => rm(root, { recursive: true, force: true })));
});

describe('Schema validation — edge cases', () => {
  describe('empty and minimal outputs', () => {
    it('empty object fails validation (missing required fields)', async () => {
      const result = await validateWorkflowOutput('daily-briefing', {}, schemasDir);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('null output fails validation', async () => {
      const result = await validateWorkflowOutput('daily-briefing', null, schemasDir);
      expect(result.valid).toBe(false);
    });

    it('empty array fails validation', async () => {
      const result = await validateWorkflowOutput('daily-briefing', [], schemasDir);
      expect(result.valid).toBe(false);
    });

    it('string output fails validation', async () => {
      const result = await validateWorkflowOutput('daily-briefing', 'not an object', schemasDir);
      expect(result.valid).toBe(false);
    });

    it('number output fails validation', async () => {
      const result = await validateWorkflowOutput('daily-briefing', 42, schemasDir);
      expect(result.valid).toBe(false);
    });
  });

  describe('additional properties', () => {
    it('rejects extra fields when additionalProperties is false', async () => {
      const validOutput = {
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

      const withExtra = { ...validOutput, unknown_field: 'bad', another: 123 };
      const result = await validateWorkflowOutput('daily-briefing', withExtra, schemasDir);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('additional'))).toBe(true);
    });

    it('valid output without extra fields passes', async () => {
      const validOutput = {
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

      const result = await validateWorkflowOutput('daily-briefing', validOutput, schemasDir);
      expect(result.valid).toBe(true);
    });
  });

  describe('schema file not found', () => {
    it('returns valid with warning for unknown workflow', async () => {
      const result = await validateWorkflowOutput('nonexistent-workflow', { anything: true }, schemasDir);
      expect(result.valid).toBe(true);
      expect(result.warnings.length).toBe(1);
      expect(result.warnings[0]).toContain('nonexistent-workflow');
    });

    it('returns valid with warning for empty string workflow', async () => {
      const result = await validateWorkflowOutput('', { anything: true }, schemasDir);
      expect(result.valid).toBe(true);
      expect(result.warnings.length).toBe(1);
    });
  });

  describe('invalid schema files', () => {
    it('returns error for invalid JSON in schema file', async () => {
      const tempD = await tempDir();
      const badSchemaPath = path.join(tempD, 'bad-workflow.output.schema.json');
      await writeFile(badSchemaPath, '{ this is not valid JSON {{{', 'utf-8');

      await expect(
        validateWorkflowOutput('bad-workflow', { data: true }, tempD)
      ).rejects.toThrow();
    });

    it('returns error for malformed schema (not JSON)', async () => {
      const tempD = await tempDir();
      const badSchemaPath = path.join(tempD, 'malformed.output.schema.json');
      await writeFile(badSchemaPath, 'just a string', 'utf-8');

      await expect(
        validateWorkflowOutput('malformed', { data: true }, tempD)
      ).rejects.toThrow();
    });
  });

  describe('batch validation', () => {
    it('validates multiple workflows in sequence', async () => {
      const validBrief = {
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

      const workflows = [
        { id: 'daily-briefing', output: validBrief },
        { id: 'daily-briefing', output: { ...validBrief, project_id: 'beta' } },
      ];

      const results = await Promise.all(
        workflows.map(w => validateWorkflowOutput(w.id, w.output, schemasDir))
      );

      expect(results).toHaveLength(2);
      expect(results[0].valid).toBe(true);
      expect(results[1].valid).toBe(true);
    });

    it('batch with mix of valid and invalid', async () => {
      const validBrief = {
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

      const workflows = [
        { id: 'daily-briefing', output: validBrief },
        { id: 'daily-briefing', output: {} },  // missing required fields
      ];

      const results = await Promise.all(
        workflows.map(w => validateWorkflowOutput(w.id, w.output, schemasDir))
      );

      expect(results[0].valid).toBe(true);
      expect(results[1].valid).toBe(false);
    });
  });

  describe('type mismatches', () => {
    it('rejects string where number expected', async () => {
      const output = {
        date: '2026-06-19T00:00:00Z',
        project_id: 'alpha',
        top_priorities: [],
        meetings_to_prepare: [],
        urgent_blockers: [],
        risks_to_review: [],
        pending_approvals: [],
        suggested_followups: [],
        source_coverage: [],
        assumptions: [],
        confidence: 'not-a-number',  // should be number
      };

      const result = await validateWorkflowOutput('daily-briefing', output, schemasDir);
      expect(result.valid).toBe(false);
    });

    it('rejects number where string expected', async () => {
      const output = {
        date: 2026,  // should be string
        project_id: 'alpha',
        top_priorities: [],
        meetings_to_prepare: [],
        urgent_blockers: [],
        risks_to_review: [],
        pending_approvals: [],
        suggested_followups: [],
        source_coverage: [],
        assumptions: [],
        confidence: 80,
      };

      const result = await validateWorkflowOutput('daily-briefing', output, schemasDir);
      expect(result.valid).toBe(false);
    });

    it('rejects object where array expected', async () => {
      const output = {
        date: '2026-06-19T00:00:00Z',
        project_id: 'alpha',
        top_priorities: 'not an array',  // should be array
        meetings_to_prepare: [],
        urgent_blockers: [],
        risks_to_review: [],
        pending_approvals: [],
        suggested_followups: [],
        source_coverage: [],
        assumptions: [],
        confidence: 80,
      };

      const result = await validateWorkflowOutput('daily-briefing', output, schemasDir);
      expect(result.valid).toBe(false);
    });
  });

  describe('loadWorkflowSchema edge cases', () => {
    it('returns null for non-existent directory', async () => {
      const schema = await loadWorkflowSchema('daily-briefing', '/nonexistent/path');
      expect(schema).toBeNull();
    });

    it('returns null for empty directory', async () => {
      const tempD = await tempDir();
      const schema = await loadWorkflowSchema('daily-briefing', tempD);
      expect(schema).toBeNull();
    });
  });
});
