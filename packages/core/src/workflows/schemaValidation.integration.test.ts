import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { loadWorkflowSchema, validateWorkflowOutput } from './schemaValidation.js';
import { generateDailyBriefing } from './dailyBriefing.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const SCHEMAS_DIR = path.resolve(__dirname, '../../../../schemas/workflows');
const FIXTURES_DIR = path.resolve(__dirname, '../../../../schemas/fixtures/workflows');

const ALL_WORKFLOWS = [
  'daily-briefing',
  'meeting-intelligence',
  'risk-control',
  'scope-control',
  'reporting',
  'code-quality-guard',
];

function loadFixture(name: string): Promise<unknown> {
  return readFile(path.join(FIXTURES_DIR, name), 'utf-8').then(raw => JSON.parse(raw));
}

describe('Schema validation — integration', () => {
  describe('load all 6 workflow schemas', () => {
    for (const workflowId of ALL_WORKFLOWS) {
      it(`loads ${workflowId} output schema`, async () => {
        const schema = await loadWorkflowSchema(workflowId, SCHEMAS_DIR);
        expect(schema).not.toBeNull();
        expect(schema).toHaveProperty('type', 'object');
        expect(schema).toHaveProperty('properties');
        expect(schema).toHaveProperty('required');
      });
    }

    it('returns null for unknown workflow', async () => {
      const schema = await loadWorkflowSchema('nonexistent-workflow', SCHEMAS_DIR);
      expect(schema).toBeNull();
    });
  });

  describe('valid fixtures pass validation', () => {
    const validCases: [string, string][] = [
      ['daily-briefing', 'daily-briefing.output.valid.json'],
      ['meeting-intelligence', 'meeting-intelligence.output.valid.json'],
      ['risk-control', 'risk-control.output.valid.json'],
      ['scope-control', 'scope-control.output.valid.json'],
      ['reporting', 'reporting.output.valid.json'],
      ['code-quality-guard', 'code-quality-guard.output.valid.json'],
    ];

    for (const [workflowId, fixtureFile] of validCases) {
      it(`${workflowId} valid fixture passes`, async () => {
        const fixture = await loadFixture(fixtureFile);
        const result = await validateWorkflowOutput(workflowId, fixture, SCHEMAS_DIR);
        expect(result.valid).toBe(true);
        expect(result.errors).toHaveLength(0);
        expect(result.warnings).toHaveLength(0);
      });
    }
  });

  describe('invalid fixtures fail validation', () => {
    const invalidCases: [string, string][] = [
      ['daily-briefing', 'daily-briefing.output.invalid.json'],
      ['meeting-intelligence', 'meeting-intelligence.output.invalid.json'],
      ['risk-control', 'risk-control.output.invalid.json'],
      ['scope-control', 'scope-control.output.invalid.json'],
      ['reporting', 'reporting.output.invalid.json'],
      ['code-quality-guard', 'code-quality-guard.output.invalid.json'],
    ];

    for (const [workflowId, fixtureFile] of invalidCases) {
      it(`${workflowId} invalid fixture fails`, async () => {
        const fixture = await loadFixture(fixtureFile);
        const result = await validateWorkflowOutput(workflowId, fixture, SCHEMAS_DIR);
        expect(result.valid).toBe(false);
        expect(result.errors.length).toBeGreaterThan(0);
      });
    }
  });

  describe('real generateDailyBriefing output', () => {
    it('passes schema validation with realistic input', async () => {
      const briefing = generateDailyBriefing({
        projectId: 'PRJ-INT-001',
        date: '2026-06-19T00:00:00Z',
        items: [
          { source: 'jira', type: 'blocker', title: 'CI pipeline broken', priority: 'critical' },
          { source: 'calendar', type: 'meeting', title: 'Sprint review', priority: 'high' },
          { source: 'risk-register', type: 'risk', title: 'DB migration risk', priority: 'high' },
          { source: 'github', type: 'approval', title: 'Approve release PR', priority: 'medium' },
          { source: 'email', type: 'follow_up', title: 'Reply to vendor', priority: 'low' },
        ],
        unavailableSources: ['slack'],
        assumptions: ['Sprint scope unchanged from planning'],
      });

      // generateDailyBriefing returns camelCase — validateWorkflowOutput
      // handles the snake_case conversion internally
      const result = await validateWorkflowOutput('daily-briefing', briefing, SCHEMAS_DIR);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('passes with minimal valid input', async () => {
      const briefing = generateDailyBriefing({
        projectId: 'minimal-proj',
        date: '2026-06-19T00:00:00Z',
        items: [
          { source: 'local', type: 'priority', title: 'Review status', priority: 'high' },
        ],
        assumptions: ['Minimal context available'],
      });

      const result = await validateWorkflowOutput('daily-briefing', briefing, SCHEMAS_DIR);
      expect(result.valid).toBe(true);
    });

    it('passes with minimal assumptions (confidence >= 70)', async () => {
      const briefing = generateDailyBriefing({
        projectId: 'test',
        date: '2026-06-19T00:00:00Z',
        items: [
          { source: 'jira', type: 'priority', title: 'Do something', priority: 'high' },
        ],
        assumptions: ['Minimal context available'],
      });

      // confidence will be 100 (no unavailable, items exist)
      expect(briefing.confidence).toBeGreaterThanOrEqual(70);
      const result = await validateWorkflowOutput('daily-briefing', briefing, SCHEMAS_DIR);
      expect(result.valid).toBe(true);
    });
  });

  describe('graceful fallback', () => {
    it('returns valid with warning when schema file is missing', async () => {
      const result = await validateWorkflowOutput('nonexistent-workflow', { anything: true }, SCHEMAS_DIR);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.warnings).toHaveLength(1);
      expect(result.warnings[0]).toContain('nonexistent-workflow');
    });

    it('returns valid with warning for empty schemas dir', async () => {
      const result = await validateWorkflowOutput('daily-briefing', { data: true }, '/tmp/empty-schemas-dir-xyz');
      expect(result.valid).toBe(true);
      expect(result.warnings.length).toBeGreaterThan(0);
    });
  });

  describe('result structure', () => {
    it('valid result has correct shape', async () => {
      const fixture = await loadFixture('daily-briefing.output.valid.json');
      const result = await validateWorkflowOutput('daily-briefing', fixture, SCHEMAS_DIR);

      expect(result).toHaveProperty('valid');
      expect(result).toHaveProperty('errors');
      expect(result).toHaveProperty('warnings');
      expect(typeof result.valid).toBe('boolean');
      expect(Array.isArray(result.errors)).toBe(true);
      expect(Array.isArray(result.warnings)).toBe(true);
      expect(result.valid).toBe(true);
    });

    it('invalid result has correct shape with error strings', async () => {
      const fixture = await loadFixture('daily-briefing.output.invalid.json');
      const result = await validateWorkflowOutput('daily-briefing', fixture, SCHEMAS_DIR);

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      result.errors.forEach(err => {
        expect(typeof err).toBe('string');
        expect(err.length).toBeGreaterThan(0);
      });
    });

    it('fallback result has warning string', async () => {
      const result = await validateWorkflowOutput('missing', {}, SCHEMAS_DIR);
      expect(result.valid).toBe(true);
      expect(result.warnings).toHaveLength(1);
      expect(typeof result.warnings[0]).toBe('string');
    });
  });

  describe('cross-workflow: schema load independence', () => {
    it('validating one workflow does not affect another', async () => {
      const valid = await loadFixture('daily-briefing.output.valid.json');
      const invalid = await loadFixture('daily-briefing.output.invalid.json');

      const result1 = await validateWorkflowOutput('daily-briefing', valid, SCHEMAS_DIR);
      const result2 = await validateWorkflowOutput('daily-briefing', invalid, SCHEMAS_DIR);

      expect(result1.valid).toBe(true);
      expect(result2.valid).toBe(false);

      // Validate again to ensure no state leakage
      const result3 = await validateWorkflowOutput('daily-briefing', valid, SCHEMAS_DIR);
      expect(result3.valid).toBe(true);
    });
  });
});
