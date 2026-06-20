import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import Ajv from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DEFAULT_SCHEMAS_DIR = path.resolve(__dirname, '../../../../schemas/workflows');
/** Convert a camelCase key to snake_case (e.g. "projectId" → "project_id"). */
function camelToSnake(key) {
    return key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
}
/** Recursively convert all object keys from camelCase to snake_case. */
function toSnakeCaseKeys(obj) {
    if (obj === null || obj === undefined)
        return obj;
    if (Array.isArray(obj))
        return obj.map(toSnakeCaseKeys);
    if (typeof obj === 'object') {
        return Object.fromEntries(Object.entries(obj).map(([k, v]) => [camelToSnake(k), toSnakeCaseKeys(v)]));
    }
    return obj;
}
/**
 * Load a JSON schema for a workflow output from disk.
 * Returns the parsed schema object, or null if the file is missing.
 */
export async function loadWorkflowSchema(workflowId, schemasDir = DEFAULT_SCHEMAS_DIR) {
    const filePath = path.join(schemasDir, `${workflowId}.output.schema.json`);
    try {
        const raw = await readFile(filePath, 'utf-8');
        return JSON.parse(raw);
    }
    catch (error) {
        const nodeError = error;
        if (nodeError.code === 'ENOENT')
            return null;
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
export async function validateWorkflowOutput(workflowId, output, schemasDir = DEFAULT_SCHEMAS_DIR) {
    const schema = await loadWorkflowSchema(workflowId, schemasDir);
    if (!schema) {
        return {
            valid: true,
            errors: [],
            warnings: [`No schema found for workflow '${workflowId}' — skipping validation.`],
        };
    }
    const ajv = new Ajv({ allErrors: true, strict: false });
    addFormats(ajv);
    // Schemas use snake_case keys; convert camelCase TS objects before validation
    const snakeOutput = toSnakeCaseKeys(output);
    const valid = ajv.validate(schema, snakeOutput);
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
        validate: (workflowId, output) => validateWorkflowOutput(workflowId, output, DEFAULT_SCHEMAS_DIR),
    };
}
//# sourceMappingURL=schemaValidation.js.map