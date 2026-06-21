import { readFile } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const DEFAULT_SCHEMAS_DIR = resolve(__dirname, '..', '..', '..', '..', 'schemas', 'artifacts');

// ── Types ───────────────────────────────────────────────────────────────────

export type ColumnType = 'string' | 'number' | 'date' | 'enum' | 'boolean';

export interface ColumnDef {
  name: string;
  type: ColumnType;
  description?: string;
  required?: boolean;
  enum_values?: string[];
}

export interface TableSchema {
  id: string;
  title: string;
  description: string;
  columns: ColumnDef[];
  required_columns: string[];
}

export interface TableValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  schemaId: string;
}

// ── Schema loading ───────────────────────────────────────────────────────────

const schemaCache = new Map<string, TableSchema>();

export async function loadTableSchema(
  schemaId: string,
  schemasDir: string = DEFAULT_SCHEMAS_DIR,
): Promise<TableSchema | null> {
  if (schemaCache.has(schemaId)) return schemaCache.get(schemaId)!;

  const filePath = resolve(schemasDir, `${schemaId}.schema.json`);
  try {
    const raw = await readFile(filePath, 'utf-8');
    const parsed = JSON.parse(raw);
    // Schema files store columns at top level alongside JSON Schema metadata
    const rawColumns = (parsed.columns ?? []) as Record<string, unknown>[];
    const rawRequired = (parsed.required_columns ?? []) as string[];
    const schema: TableSchema = {
      id: schemaId,
      title: parsed.title ?? schemaId,
      description: parsed.description ?? '',
      columns: rawColumns.map((c) => ({
        name: c.name as string,
        type: (c.type as ColumnType) ?? 'string',
        description: (c.description as string) ?? '',
        required: (c.required as boolean) ?? false,
        enum_values: c.enum_values as string[] | undefined,
      })),
      required_columns: rawRequired,
    };
    schemaCache.set(schemaId, schema);
    return schema;
  } catch {
    return null;
  }
}

// ── Validation ───────────────────────────────────────────────────────────────

export async function validateArtifactTable(
  schemaId: string,
  data: Array<Record<string, unknown>>,
  schemasDir: string = DEFAULT_SCHEMAS_DIR,
): Promise<TableValidationResult> {
  const schema = await loadTableSchema(schemaId, schemasDir);
  if (!schema) {
    return { valid: false, errors: [`Schema "${schemaId}" not found`], warnings: [], schemaId };
  }

  const errors: string[] = [];
  const warnings: string[] = [];

  if (data.length === 0) {
    return { valid: true, errors: [], warnings: ['Empty dataset'], schemaId };
  }

  const columnNames = new Set(schema.columns.map(c => c.name));
  const requiredSet = new Set(schema.required_columns);

  // Check required columns exist in data
  for (const req of schema.required_columns) {
    if (!columnNames.has(req)) {
      errors.push(`Required column "${req}" missing from schema definition`);
    }
  }

  // Validate each row
  const colDefs = new Map(schema.columns.map(c => [c.name, c]));

  for (let rowIdx = 0; rowIdx < data.length; rowIdx++) {
    const row = data[rowIdx];
    const rowPrefix = `Row ${rowIdx + 1}`;

    // Check required columns present in row
    for (const req of schema.required_columns) {
      if (row[req] === undefined || row[req] === null || row[req] === '') {
        errors.push(`${rowPrefix}: missing required column "${req}"`);
      }
    }

    // Validate each cell type
    for (const [colName, cell] of Object.entries(row)) {
      if (cell === undefined || cell === null || cell === '') continue;

      const colDef = colDefs.get(colName);
      if (!colDef) {
        warnings.push(`${rowPrefix}: unknown column "${colName}"`);
        continue;
      }

      const typeErr = validateCellType(cell, colDef, rowPrefix);
      if (typeErr) errors.push(typeErr);
    }
  }

  return { valid: errors.length === 0, errors, warnings, schemaId };
}

function validateCellType(
  value: unknown,
  col: ColumnDef,
  prefix: string,
): string | null {
  const cellPath = `${prefix}.${col.name}`;

  switch (col.type) {
    case 'string':
      if (typeof value !== 'string' && typeof value !== 'number') {
        return `${cellPath}: expected string, got ${typeof value}`;
      }
      break;

    case 'number':
      if (typeof value !== 'number' || !Number.isFinite(value)) {
        if (typeof value === 'string') {
          const n = Number(value);
          if (!Number.isFinite(n)) return `${cellPath}: expected number, got "${value}"`;
        } else {
          return `${cellPath}: expected number, got ${typeof value}`;
        }
      }
      break;

    case 'boolean':
      if (typeof value !== 'boolean') {
        return `${cellPath}: expected boolean, got ${typeof value}`;
      }
      break;

    case 'date':
      if (typeof value === 'string') {
        const d = new Date(value);
        if (isNaN(d.getTime())) return `${cellPath}: invalid date "${value}"`;
      } else {
        return `${cellPath}: expected date string, got ${typeof value}`;
      }
      break;

    case 'enum':
      if (col.enum_values && !col.enum_values.includes(String(value))) {
        return `${cellPath}: value "${value}" not in enum [${col.enum_values.join(', ')}]`;
      }
      break;
  }

  return null;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

const SCHEMA_IDS = [
  'wbs',
  'traceability-matrix',
  'risk-register',
  'issue-log',
  'budget-burn',
  'milestone-plan',
  'uat-signoff',
  'release-readiness',
] as const;

export type TableSchemaId = typeof SCHEMA_IDS[number];

export function listTableSchemas(): string[] {
  return [...SCHEMA_IDS];
}
