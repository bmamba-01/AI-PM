export interface ValidationResult {
    valid: boolean;
    errors: string[];
    warnings: string[];
}
/**
 * Load a JSON schema for a workflow output from disk.
 * Returns the parsed schema object, or null if the file is missing.
 */
export declare function loadWorkflowSchema(workflowId: string, schemasDir?: string): Promise<Record<string, unknown> | null>;
/**
 * Validate a workflow output object against its registered JSON schema
 * using ajv. Returns a `ValidationResult` with `valid`, `errors`, and
 * `warnings`.
 *
 * If no schema file is found for the given workflowId the result is
 * `valid: true` with a warning – callers can degrade gracefully.
 */
export declare function validateWorkflowOutput(workflowId: string, output: unknown, schemasDir?: string): Promise<ValidationResult>;
/**
 * Convenience wrapper that returns a pre-configured validator bound
 * to the default schemas directory.
 */
export declare function createDefaultValidator(): {
    validate: (workflowId: string, output: unknown) => Promise<ValidationResult>;
};
//# sourceMappingURL=schemaValidation.d.ts.map