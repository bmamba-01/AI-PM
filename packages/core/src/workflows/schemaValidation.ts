import { readFile } from 'node:fs/promises';
import path from 'node:path';

export interface SchemaValidationIssue {
  keyword: string;
  message: string;
  path: string;
}

export interface SchemaValidationResult {
  valid: boolean;
  issues: SchemaValidationIssue[];
  schemaPath?: string;
}

export class SchemaValidator {
  private readonly schemasDir: string;

  constructor(schemasDir: string) {
    this.schemasDir = schemasDir;
  }

  async validateWorkflowOutput(workflowId: string, output: unknown): Promise<SchemaValidationResult> {
    const schemaPath = path.join(this.schemasDir, `${workflowId}.output.schema.json`);

    try {
      const raw = await readFile(schemaPath, 'utf-8');
      const schema = JSON.parse(raw);
      const issues = this.validate(schema, output);
      return { valid: issues.length === 0, issues, schemaPath };
    } catch (error: unknown) {
      const nodeError = error as NodeJS.ErrnoException;
      if (nodeError.code === 'ENOENT') {
        return {
          valid: true,
          issues: [],
          schemaPath,
        };
      }
      throw error;
    }
  }

  private validate(schema: unknown, data: unknown): SchemaValidationIssue[] {
    const issues: SchemaValidationIssue[] = [];
    const root = schema as Record<string, unknown>;
    const expectedType = root.type as string | undefined;

    if (expectedType) {
      this.checkType(data, expectedType, '$', issues);
    }

    if (root.properties && typeof root.properties === 'object') {
      this.checkProperties(data, root.properties as Record<string, unknown>, '$', issues);
    }

    if (Array.isArray(root.required)) {
      for (const field of root.required) {
        if (data === null || data === undefined || !(field in (data as Record<string, unknown>))) {
          issues.push({ keyword: 'required', message: `Missing required field: ${field}`, path: '$' });
        }
      }
    }

    if (root.additionalProperties === false && typeof data === 'object' && data !== null) {
      const allowed = new Set(Object.keys(root.properties as Record<string, unknown>));
      const record = data as Record<string, unknown>;
      for (const key of Object.keys(record)) {
        if (!allowed.has(key)) {
          issues.push({ keyword: 'additionalProperties', message: `Additional property not allowed: ${key}`, path: `$.${key}` });
        }
      }
    }

    if (Array.isArray(root.items)) {
      const arr = data as unknown[];
      for (let i = 0; i < arr.length; i++) {
        const itemSchema = root.items[0];
        if (itemSchema) {
          this.validate(itemSchema, arr[i]).forEach(issue => issues.push({ ...issue, path: issue.path.replace('$', `$.${i}`) }));
        }
      }
    } else if (typeof root.items === 'object' && root.items !== null) {
      const arr = data as unknown[];
      for (let i = 0; i < arr.length; i++) {
        this.validate(root.items, arr[i]).forEach(issue => issues.push({ ...issue, path: issue.path.replace('$', `$.${i}`) }));
      }
    }

    return issues;
  }

  private checkProperties(data: unknown, properties: Record<string, unknown>, prefix: string, issues: SchemaValidationIssue[]): void {
    if (typeof data !== 'object' || data === null) return;
    const record = data as Record<string, unknown>;
    for (const [key, schema] of Object.entries(properties)) {
      if (!(key in record)) continue;
      const value = record[key];
      const childPath = `${prefix}.${key}`;
      this.validate(schema, value).forEach(issue => issues.push({ ...issue, path: childPath }));
      this.checkConstraints(schema as Record<string, unknown>, value, childPath, issues);
    }
  }

  private checkConstraints(schema: Record<string, unknown>, value: unknown, propertyPath: string, issues: SchemaValidationIssue[]): void {
    if (typeof value === 'number') {
      if (typeof schema.minimum === 'number' && value < schema.minimum) {
        issues.push({ keyword: 'minimum', message: `Value ${value} is less than minimum ${schema.minimum}`, path: propertyPath });
      }
      if (typeof schema.maximum === 'number' && value > schema.maximum) {
        issues.push({ keyword: 'maximum', message: `Value ${value} is greater than maximum ${schema.maximum}`, path: propertyPath });
      }
    }
  }

  private checkType(value: unknown, expected: string, propertyPath: string, issues: SchemaValidationIssue[]): void {
    const actual = Array.isArray(value) ? 'array' : value === null ? 'null' : typeof value;
    if (expected === 'integer' && actual === 'number') {
      if (!Number.isInteger(value)) {
        issues.push({ keyword: 'type', message: `Expected integer at ${propertyPath}`, path: propertyPath });
      }
      return;
    }
    if (actual !== expected) {
      issues.push({ keyword: 'type', message: `Expected ${expected} at ${propertyPath}, got ${actual}`, path: propertyPath });
    }
  }
}

const DEFAULT_SCHEMAS_DIR = path.resolve(__dirname, '../../../../schemas/workflows');

export function createDefaultValidator(): SchemaValidator {
  return new SchemaValidator(DEFAULT_SCHEMAS_DIR);
}
