import { describe, expect, it, beforeEach } from 'vitest';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFile } from 'node:fs/promises';
import {
  loadTableSchema,
  validateArtifactTable,
  listTableSchemas,
  type TableSchema,
} from './tableSchema.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const SCHEMAS_DIR = resolve(__dirname, '..', '..', '..', '..', 'schemas', 'artifacts');
const FIXTURES_DIR = resolve(__dirname, '..', '..', '..', '..', 'schemas', 'fixtures', 'artifacts');

function loadFixture(name: string): Promise<Array<Record<string, unknown>>> {
  return readFile(resolve(FIXTURES_DIR, name), 'utf-8').then(raw => JSON.parse(raw));
}

// ── Schema loading ───────────────────────────────────────────────────────────

describe('Table Schema — loading', () => {
  it('loads all 8 table schemas', async () => {
    const ids = listTableSchemas();
    expect(ids).toHaveLength(8);

    for (const id of ids) {
      const schema = await loadTableSchema(id, SCHEMAS_DIR);
      expect(schema).not.toBeNull();
      expect(schema!.id).toBe(id);
      expect(schema!.title).toBeTruthy();
      expect(schema!.columns.length).toBeGreaterThan(0);
      expect(schema!.required_columns.length).toBeGreaterThan(0);
    }
  });

  it('returns null for unknown schema', async () => {
    const schema = await loadTableSchema('nonexistent', SCHEMAS_DIR);
    expect(schema).toBeNull();
  });

  it('wbs schema has required columns', async () => {
    const schema = await loadTableSchema('wbs', SCHEMAS_DIR);
    expect(schema!.required_columns).toContain('wbs_id');
    expect(schema!.required_columns).toContain('task_name');
    expect(schema!.required_columns).toContain('level');
    expect(schema!.required_columns).toContain('status');
  });

  it('risk-register schema has required columns', async () => {
    const schema = await loadTableSchema('risk-register', SCHEMAS_DIR);
    expect(schema!.required_columns).toContain('risk_id');
    expect(schema!.required_columns).toContain('risk_statement');
    expect(schema!.required_columns).toContain('category');
    expect(schema!.required_columns).toContain('probability');
    expect(schema!.required_columns).toContain('impact');
    expect(schema!.required_columns).toContain('status');
  });

  it('traceability-matrix schema has required columns', async () => {
    const schema = await loadTableSchema('traceability-matrix', SCHEMAS_DIR);
    expect(schema!.required_columns).toContain('requirement_id');
    expect(schema!.required_columns).toContain('requirement_type');
    expect(schema!.required_columns).toContain('test_status');
  });

  it('issue-log schema has required columns', async () => {
    const schema = await loadTableSchema('issue-log', SCHEMAS_DIR);
    expect(schema!.required_columns).toContain('issue_id');
    expect(schema!.required_columns).toContain('title');
    expect(schema!.required_columns).toContain('type');
    expect(schema!.required_columns).toContain('status');
  });

  it('budget-burn schema has required columns', async () => {
    const schema = await loadTableSchema('budget-burn', SCHEMAS_DIR);
    expect(schema!.required_columns).toContain('category');
    expect(schema!.required_columns).toContain('planned_amount');
    expect(schema!.required_columns).toContain('actual_amount');
  });

  it('milestone-plan schema has required columns', async () => {
    const schema = await loadTableSchema('milestone-plan', SCHEMAS_DIR);
    expect(schema!.required_columns).toContain('milestone_id');
    expect(schema!.required_columns).toContain('name');
    expect(schema!.required_columns).toContain('target_date');
    expect(schema!.required_columns).toContain('status');
  });

  it('uat-signoff schema has required columns', async () => {
    const schema = await loadTableSchema('uat-signoff', SCHEMAS_DIR);
    expect(schema!.required_columns).toContain('scenario_id');
    expect(schema!.required_columns).toContain('scenario_name');
    expect(schema!.required_columns).toContain('status');
  });

  it('release-readiness schema has required columns', async () => {
    const schema = await loadTableSchema('release-readiness', SCHEMAS_DIR);
    expect(schema!.required_columns).toContain('check_id');
    expect(schema!.required_columns).toContain('category');
    expect(schema!.required_columns).toContain('check_item');
    expect(schema!.required_columns).toContain('status');
  });

  it('columns have valid types', async () => {
    const validTypes = ['string', 'number', 'date', 'enum', 'boolean'];
    const schema = await loadTableSchema('wbs', SCHEMAS_DIR);
    for (const col of schema!.columns) {
      expect(validTypes).toContain(col.type);
    }
  });

  it('enum columns have enum_values', async () => {
    const schema = await loadTableSchema('wbs', SCHEMAS_DIR);
    const statusCol = schema!.columns.find(c => c.name === 'status');
    expect(statusCol).toBeDefined();
    expect(statusCol!.enum_values).toBeDefined();
    expect(statusCol!.enum_values!.length).toBeGreaterThan(0);
  });
});

// ── Validation — valid fixtures ──────────────────────────────────────────────

describe('Table Validation — valid fixtures', () => {
  it('valid-wbs.json passes WBS schema validation', async () => {
    const data = await loadFixture('valid-wbs.json');
    const result = await validateArtifactTable('wbs', data, SCHEMAS_DIR);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
    expect(result.schemaId).toBe('wbs');
  });

  it('valid-traceability.json passes traceability schema', async () => {
    const data = await loadFixture('valid-traceability.json');
    const result = await validateArtifactTable('traceability-matrix', data, SCHEMAS_DIR);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('valid-risk-register.json passes risk schema', async () => {
    const data = await loadFixture('valid-risk-register.json');
    const result = await validateArtifactTable('risk-register', data, SCHEMAS_DIR);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('empty data returns valid with warning', async () => {
    const result = await validateArtifactTable('wbs', [], SCHEMAS_DIR);
    expect(result.valid).toBe(true);
    expect(result.warnings).toContain('Empty dataset');
  });
});

// ── Validation — invalid data ────────────────────────────────────────────────

describe('Table Validation — invalid data', () => {
  it('rejects missing required columns', async () => {
    const data = [
      { task_name: 'Test', level: 1, status: 'in_progress' }, // missing wbs_id
    ];
    const result = await validateArtifactTable('wbs', data, SCHEMAS_DIR);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('wbs_id'))).toBe(true);
  });

  it('rejects invalid enum value', async () => {
    const data = [
      { wbs_id: '1', task_name: 'Test', level: 1, status: 'bogus_status' },
    ];
    const result = await validateArtifactTable('wbs', data, SCHEMAS_DIR);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('bogus_status'))).toBe(true);
  });

  it('warns about unknown columns', async () => {
    const data = [
      { wbs_id: '1', task_name: 'Test', level: 1, status: 'in_progress', unknown_col: 'value' },
    ];
    const result = await validateArtifactTable('wbs', data, SCHEMAS_DIR);
    expect(result.warnings.some(w => w.includes('unknown_col'))).toBe(true);
  });

  it('reports errors for multiple rows', async () => {
    const data = [
      { wbs_id: '1', task_name: 'Test', level: 1, status: 'in_progress' },
      { wbs_id: '2', level: 1, status: 'completed' }, // missing task_name
      { wbs_id: '3', task_name: 'Test', level: 1, status: 'invalid' },
    ];
    const result = await validateArtifactTable('wbs', data, SCHEMAS_DIR);
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThanOrEqual(2);
  });

  it('validates risk probability enum', async () => {
    const data = [
      {
        risk_id: 'R-1', risk_statement: 'Test risk', category: 'technical',
        probability: 'maybe', impact: 'high', owner: 'TL', status: 'open',
      },
    ];
    const result = await validateArtifactTable('risk-register', data, SCHEMAS_DIR);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('maybe'))).toBe(true);
  });

  it('validates issue-log required columns', async () => {
    const data = [
      { title: 'Bug', type: 'defect', priority: 'high', status: 'open' }, // missing issue_id
    ];
    const result = await validateArtifactTable('issue-log', data, SCHEMAS_DIR);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('issue_id'))).toBe(true);
  });

  it('validates budget-burn numeric columns', async () => {
    const data = [
      { category: 'Dev', planned_amount: 'not a number', actual_amount: 1000 },
    ];
    const result = await validateArtifactTable('budget-burn', data, SCHEMAS_DIR);
    expect(result.valid).toBe(false);
  });

  it('validates milestone-plan required columns', async () => {
    const data = [
      { milestone_id: 'MS-1', name: 'Launch', status: 'on_track' }, // missing target_date
    ];
    const result = await validateArtifactTable('milestone-plan', data, SCHEMAS_DIR);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('target_date'))).toBe(true);
  });

  it('validates uat-signoff required columns', async () => {
    const data = [
      { scenario_name: 'Login test', status: 'pass' }, // missing scenario_id
    ];
    const result = await validateArtifactTable('uat-signoff', data, SCHEMAS_DIR);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('scenario_id'))).toBe(true);
  });

  it('validates release-readiness required columns', async () => {
    const data = [
      { check_id: 'RR-1', category: 'ci_cd', check_item: 'CI passes', status: 'complete' },
    ];
    const result = await validateArtifactTable('release-readiness', data, SCHEMAS_DIR);
    expect(result.valid).toBe(true);
  });

  it('returns error for unknown schema', async () => {
    const result = await validateArtifactTable('nonexistent', [{ x: 1 }], SCHEMAS_DIR);
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toContain('not found');
  });
});

// ── listTableSchemas ─────────────────────────────────────────────────────────

describe('listTableSchemas', () => {
  it('returns all 8 schema IDs', () => {
    const ids = listTableSchemas();
    expect(ids).toEqual([
      'wbs', 'traceability-matrix', 'risk-register', 'issue-log',
      'budget-burn', 'milestone-plan', 'uat-signoff', 'release-readiness',
    ]);
  });
});
