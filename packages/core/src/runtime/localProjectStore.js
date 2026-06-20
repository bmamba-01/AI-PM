import { appendFile, mkdir, readFile } from 'node:fs/promises';
import path from 'node:path';
export class LocalProjectStore {
    projectRoot;
    aiPmDir;
    auditDir;
    constructor(projectRoot) {
        this.projectRoot = projectRoot;
        this.aiPmDir = path.join(projectRoot, '.ai-pm');
        this.auditDir = path.join(this.aiPmDir, 'audit');
    }
    async ensureProjectDirs() {
        await mkdir(this.auditDir, { recursive: true });
    }
    async loadDailyBriefingItems() {
        try {
            const raw = await readFile(path.join(this.aiPmDir, 'daily-items.json'), 'utf-8');
            const parsed = JSON.parse(raw);
            if (!Array.isArray(parsed))
                return [];
            return parsed.filter(isDailyBriefingInputItem);
        }
        catch (error) {
            if (isNodeError(error) && error.code === 'ENOENT')
                return [];
            throw error;
        }
    }
    async appendWorkflowAudit(input) {
        await this.ensureProjectDirs();
        const auditPath = path.join(this.auditDir, 'workflow-runs.jsonl');
        const record = {
            runId: `${input.workflowId}-${Date.now()}`,
            ...input,
        };
        await appendFile(auditPath, `${JSON.stringify(record)}\n`, 'utf-8');
        return auditPath;
    }
    async loadWorkflowAuditRecords() {
        const auditPath = path.join(this.auditDir, 'workflow-runs.jsonl');
        try {
            const raw = await readFile(auditPath, 'utf-8');
            const lines = raw.trim().split('\n').filter(line => line.length > 0);
            const records = [];
            for (const line of lines) {
                try {
                    const parsed = JSON.parse(line);
                    if (isValidAuditRecord(parsed)) {
                        records.push(parsed);
                    }
                    else {
                        console.warn(`[audit] Skipping invalid record: ${line.slice(0, 80)}...`);
                    }
                }
                catch {
                    console.warn(`[audit] Skipping malformed JSON line: ${line.slice(0, 80)}...`);
                }
            }
            return records;
        }
        catch (error) {
            if (isNodeError(error) && error.code === 'ENOENT')
                return [];
            throw error;
        }
    }
}
function isDailyBriefingInputItem(value) {
    if (!value || typeof value !== 'object')
        return false;
    const item = value;
    return typeof item.source === 'string'
        && typeof item.type === 'string'
        && typeof item.title === 'string';
}
function isNodeError(error) {
    return error instanceof Error && 'code' in error;
}
function isValidAuditRecord(value) {
    if (!value || typeof value !== 'object')
        return false;
    const r = value;
    return typeof r.runId === 'string'
        && typeof r.workflowId === 'string'
        && typeof r.projectId === 'string'
        && typeof r.status === 'string'
        && typeof r.startedAt === 'string'
        && typeof r.completedAt === 'string';
}
//# sourceMappingURL=localProjectStore.js.map