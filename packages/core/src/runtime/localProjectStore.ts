import { appendFile, mkdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import type { DailyBriefingInputItem } from '../workflows/dailyBriefing.js';

export type WorkflowAuditStatus = 'completed' | 'blocked' | 'failed';

export interface WorkflowAuditInput {
  workflowId: string;
  projectId: string;
  status: WorkflowAuditStatus;
  startedAt: string;
  completedAt: string;
  outputSummary: string;
  sourceCoverage: string[];
  assumptions: string[];
}

export interface WorkflowAuditRecord extends WorkflowAuditInput {
  runId: string;
}

export class LocalProjectStore {
  private readonly aiPmDir: string;
  private readonly auditDir: string;

  constructor(private readonly projectRoot: string) {
    this.aiPmDir = path.join(projectRoot, '.ai-pm');
    this.auditDir = path.join(this.aiPmDir, 'audit');
  }

  async ensureProjectDirs(): Promise<void> {
    await mkdir(this.auditDir, { recursive: true });
  }

  async loadDailyBriefingItems(): Promise<DailyBriefingInputItem[]> {
    try {
      const raw = await readFile(path.join(this.aiPmDir, 'daily-items.json'), 'utf-8');
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];
      return parsed.filter(isDailyBriefingInputItem);
    } catch (error) {
      if (isNodeError(error) && error.code === 'ENOENT') return [];
      throw error;
    }
  }

  async appendWorkflowAudit(input: WorkflowAuditInput): Promise<string> {
    await this.ensureProjectDirs();
    const auditPath = path.join(this.auditDir, 'workflow-runs.jsonl');
    const record: WorkflowAuditRecord = {
      runId: `${input.workflowId}-${Date.now()}`,
      ...input,
    };
    await appendFile(auditPath, `${JSON.stringify(record)}\n`, 'utf-8');
    return auditPath;
  }

  async loadWorkflowAuditRecords(): Promise<WorkflowAuditRecord[]> {
    const auditPath = path.join(this.auditDir, 'workflow-runs.jsonl');
    try {
      const raw = await readFile(auditPath, 'utf-8');
      const lines = raw.trim().split('\n').filter(line => line.length > 0);
      const records: WorkflowAuditRecord[] = [];
      for (const line of lines) {
        try {
          const parsed = JSON.parse(line);
          if (isValidAuditRecord(parsed)) {
            records.push(parsed);
          } else {
            console.warn(`[audit] Skipping invalid record: ${line.slice(0, 80)}...`);
          }
        } catch {
          console.warn(`[audit] Skipping malformed JSON line: ${line.slice(0, 80)}...`);
        }
      }
      return records;
    } catch (error) {
      if (isNodeError(error) && error.code === 'ENOENT') return [];
      throw error;
    }
  }
}

function isDailyBriefingInputItem(value: unknown): value is DailyBriefingInputItem {
  if (!value || typeof value !== 'object') return false;
  const item = value as Partial<DailyBriefingInputItem>;
  return typeof item.source === 'string'
    && typeof item.type === 'string'
    && typeof item.title === 'string';
}

function isNodeError(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && 'code' in error;
}

function isValidAuditRecord(value: unknown): value is WorkflowAuditRecord {
  if (!value || typeof value !== 'object') return false;
  const r = value as Record<string, unknown>;
  return typeof r.runId === 'string'
    && typeof r.workflowId === 'string'
    && typeof r.projectId === 'string'
    && typeof r.status === 'string'
    && typeof r.startedAt === 'string'
    && typeof r.completedAt === 'string';
}

