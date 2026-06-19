import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import Ajv from 'ajv/dist/2020';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

const DEFAULT_SCHEMAS_DIR = path.resolve(__dirname, '../../../../schemas/workflows');

/**
 * Load a JSON schema for a workflow output from disk.
 * Returns the parsed schema object, or null if the file is missing.
 */
export async function loadWorkflowSchema(
  workflowId: string,
  schemasDir: string = DEFAULT_SCHEMAS_DIR,
): Promise<Record<string, unknown> | null> {
  const filePath = path.join(schemasDir, `${workflowId}.output.schema.json`);
  try {
    const raw = await readFile(filePath, 'utf-8');
    return JSON.parse(raw) as Record<string, unknown>;
  } catch (error: unknown) {
    const nodeError = error as NodeJS.ErrnoException;
    if (nodeError.code === 'ENOENT') return null;
    throw error;
  }
}

/**
 * Validate a workflow output object against its registered JSON schema
 * using ajv. Returns a `ValidationResult` with `valid`, `errors`, and
 * `warnings`.
 *
 * If no schema file is found for the given workflowId the result is
 * `valid: true` with a warning – callers can degrade gracefully.
 */
export async function validateWorkflowOutput(
  workflowId: string,
  output: unknown,
  schemasDir: string = DEFAULT_SCHEMAS_DIR,
): Promise<ValidationResult> {
  const schema = await loadWorkflowSchema(workflowId, schemasDir);

  if (!schema) {
    return {
      valid: true,
      errors: [],
      warnings: [`No schema found for workflow '${workflowId}' — skipping validation.`],
    };
  }

  const ajv = new Ajv({ allErrors: true, strict: false });
  const valid = ajv.validate(schema, output);

  if (valid) {
    return { valid: true, errors: [], warnings: [] };
  }

  const errors = (ajv.errors ?? []).map((err) => {
    const loc = err.instancePath || '';
    return `${loc}: ${err.message ?? 'unknown error'}`.trim();
  });

  return { valid: false, errors, warnings: [] };
}

/**
 * Convenience wrapper that returns a pre-configured validator bound
 * to the default schemas directory.
 */
export function createDefaultValidator() {
  return {
    validate: (workflowId: string, output: unknown) =>
      validateWorkflowOutput(workflowId, output, DEFAULT_SCHEMAS_DIR),
  };
}
