import type { RegistryConfig, ProfileConfig } from "./configTypes.js";
export interface ValidationIssue {
    severity: "error" | "warning" | "info";
    code: string;
    message: string;
    context?: Record<string, string | undefined>;
}
export interface ValidationReport {
    valid: boolean;
    issues: ValidationIssue[];
    summary: string;
    checkedAt: string;
}
export declare function validateConfigs(registry: RegistryConfig, profiles?: ProfileConfig[]): ValidationReport;
declare function resolveContractsDir(): string;
export { resolveContractsDir };
//# sourceMappingURL=configValidator.d.ts.map