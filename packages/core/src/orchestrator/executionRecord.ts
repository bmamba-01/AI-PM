/**
 * Orchestrator Execution Records
 *
 * Persists orchestrator run metadata under project-scoped local state.
 * Produces audit entry, memory task, artifact references, and approval summary.
 * No external MCP calls — pure local file I/O.
 */

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import path from 'node:path';
import type {
  OrchestratorRun,
  OrchestratorAuditRecord,
  RunArtifact,
} from './types.js';
import { toAuditRecord } from './orchestratorRun.js';
import type { MemoryTask, MemoryArtifact } from '../runtime/memory.js';

// ─── Execution Record ────────────────────────────────────────────────────────

export interface ExecutionRecord {
  record_id: string;
  run_id: string;
  project_id: string;
  workflow_id: string;
  trigger_type: string;
  trigger_actor: string;
  state: string;
  started_at: string;
  completed_at: string | null;
  agents_used: string[];
  source_coverage: SourceCoverage;
  artifacts: ArtifactRef[];
  approvals: ApprovalSummary;
  memory_task_id: string | null;
  errors: string[];
  assumptions: string[];
  confidence: number;
}

export interface SourceCoverage {
  total: number;
  available: string[];
  unavailable: string[];
}

export interface ArtifactRef {
  name: string;
  path: string;
  type: string;
}

export interface ApprovalSummary {
  required: string[];
  count: number;
}

// ─── Persistence ─────────────────────────────────────────────────────────────

function runsDir(projectRoot: string): string {
  return path.join(projectRoot, '.ai-pm', 'orchestrator', 'runs');
}

function recordPath(projectRoot: string, recordId: string): string {
  return path.join(runsDir(projectRoot), `${recordId}.json`);
}

function indexPath(projectRoot: string): string {
  return path.join(runsDir(projectRoot), 'index.json');
}

async function readIndex(projectRoot: string): Promise<RecordEntry[]> {
  try {
    const raw = await readFile(indexPath(projectRoot), 'utf-8');
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function writeIndex(projectRoot: string, entries: RecordEntry[]): Promise<void> {
  const dir = runsDir(projectRoot);
  await mkdir(dir, { recursive: true });
  await writeFile(indexPath(projectRoot), JSON.stringify(entries, null, 2), 'utf-8');
}

interface RecordEntry {
  record_id: string;
  run_id: string;
  workflow_id: string;
  state: string;
  started_at: string;
  completed_at: string | null;
}

// ─── Finalize ────────────────────────────────────────────────────────────────

export interface FinalizeInput {
  assumptions?: string[];
  confidence?: number;
  source_coverage?: SourceCoverage;
}

export async function finalizeOrchestratorRun(
  run: OrchestratorRun,
  projectRoot: string,
  input: FinalizeInput = {}
): Promise<ExecutionRecord> {
  if (run.state !== 'completed' && run.state !== 'failed') {
    throw new Error(
      `Cannot finalize run in state "${run.state}". Must be completed or failed.`
    );
  }

  // Build audit record
  const audit = toAuditRecord(run, input.assumptions ?? [], input.confidence ?? 100);

  // Build source coverage from context pack
  const sourceCoverage: SourceCoverage = input.source_coverage ?? buildSourceCoverage(run);

  // Build artifact refs
  const artifactRefs: ArtifactRef[] = run.artifacts.map(a => ({
    name: a.name,
    path: a.path,
    type: a.type,
  }));

  // Build approval summary
  const approvalSummary: ApprovalSummary = {
    required: run.approvals_required,
    count: run.approvals_required.length,
  };

  // Create execution record
  const record: ExecutionRecord = {
    record_id: randomUUID(),
    run_id: run.run_id,
    project_id: run.project_id,
    workflow_id: run.workflow_id,
    trigger_type: run.trigger.type,
    trigger_actor: run.trigger.actor,
    state: run.state,
    started_at: run.started_at,
    completed_at: run.completed_at,
    agents_used: run.assigned_agents,
    source_coverage: sourceCoverage,
    artifacts: artifactRefs,
    approvals: approvalSummary,
    memory_task_id: null,
    errors: run.errors.map(e => e.message),
    assumptions: input.assumptions ?? [],
    confidence: input.confidence ?? 100,
  };

  // Persist record to disk
  await mkdir(runsDir(projectRoot), { recursive: true });
  await writeFile(recordPath(projectRoot, record.record_id), JSON.stringify(record, null, 2), 'utf-8');

  // Update index
  const index = await readIndex(projectRoot);
  index.push({
    record_id: record.record_id,
    run_id: record.run_id,
    workflow_id: record.workflow_id,
    state: record.state,
    started_at: record.started_at,
    completed_at: record.completed_at,
  });
  await writeIndex(projectRoot, index);

  // Persist audit record
  await persistAudit(projectRoot, audit);

  return record;
}

// ─── Read Records ────────────────────────────────────────────────────────────

export async function readExecutionRecord(
  projectRoot: string,
  recordId: string
): Promise<ExecutionRecord | null> {
  try {
    const raw = await readFile(recordPath(projectRoot, recordId), 'utf-8');
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export async function listExecutionRecords(
  projectRoot: string
): Promise<RecordEntry[]> {
  return readIndex(projectRoot);
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function buildSourceCoverage(run: OrchestratorRun): SourceCoverage {
  const available: string[] = [];
  const unavailable: string[] = [];

  if (run.context_pack) {
    const connectors = run.context_pack.connectors;
    const connectorNames = Object.keys(connectors) as Array<keyof typeof connectors>;
    for (const name of connectorNames) {
      if (connectors[name]) {
        available.push(name);
      } else {
        unavailable.push(name);
      }
    }
  }

  return {
    total: available.length + unavailable.length,
    available,
    unavailable,
  };
}

// ─── Audit persistence ───────────────────────────────────────────────────────

const AUDIT_FILE = 'audit.jsonl';

async function persistAudit(projectRoot: string, audit: OrchestratorAuditRecord): Promise<void> {
  const dir = path.join(projectRoot, '.ai-pm', 'orchestrator');
  await mkdir(dir, { recursive: true });
  const auditFile = path.join(dir, AUDIT_FILE);
  const line = JSON.stringify(audit) + '\n';

  try {
    const existing = await readFile(auditFile, 'utf-8');
    await writeFile(auditFile, existing + line, 'utf-8');
  } catch {
    await writeFile(auditFile, line, 'utf-8');
  }
}

export async function readAuditLog(projectRoot: string): Promise<OrchestratorAuditRecord[]> {
  try {
    const raw = await readFile(path.join(projectRoot, '.ai-pm', 'orchestrator', AUDIT_FILE), 'utf-8');
    const lines = raw.split('\n').filter(l => l.trim());
    return lines.map(l => JSON.parse(l));
  } catch {
    return [];
  }
}
