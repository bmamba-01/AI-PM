export interface ScanCheck {
    id: string;
    label: string;
    path: string;
    required: boolean;
    present: boolean;
}
export interface ScanResult {
    projectRoot: string;
    score: number;
    totalRequired: number;
    passedRequired: number;
    totalOptional: number;
    passedOptional: number;
    checks: ScanCheck[];
    ready: boolean;
}
export declare function scanProject(projectRoot: string): Promise<ScanResult>;
//# sourceMappingURL=projectScanner.d.ts.map