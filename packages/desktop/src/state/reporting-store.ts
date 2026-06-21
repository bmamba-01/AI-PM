import { create } from "zustand";

// ---------------------------------------------------------------------------
// Types — all from IPC, no Node imports
// ---------------------------------------------------------------------------

export interface MemorySummary {
  totalTasks: number;
  completedTasks: number;
  totalArtifacts: number;
  archivedArtifacts: number;
  staleArtifacts: number;
}

export interface MemoryTask {
  task_id: string;
  project_id: string;
  name: string;
  description: string;
  status: string;
  assigned_to: string;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
  dependencies: string[];
  artifacts: string[];
  tags: string[];
}

export interface MemoryArtifact {
  artifact_id: string;
  project_id: string;
  name: string;
  path: string;
  type: string;
  status: string;
  created_at: string;
  updated_at: string;
  archived_at: string | null;
  archive_reason: string | null;
  task_id: string | null;
  version: number;
}

export interface AuditRun {
  runId: string;
  workflowId: string;
  projectId: string;
  status: string;
  startedAt: string;
  completedAt: string;
  outputSummary: string;
  sourceCoverage: string[];
  assumptions: string[];
}

export interface ApprovalItem {
  approval_id: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  action_type: string;
  target_system: string;
  target_id: string;
  confidence: number;
  created_at: string;
}

export interface ServerStatus {
  running: boolean;
  host: string;
  port: number;
  url: string;
  projectRoot: string;
  health: { ok: boolean; version?: string };
}

export interface SourceCoverageItem {
  name: string;
  available: boolean;
}

interface ReportingState {
  memorySummary: MemorySummary | null;
  tasks: MemoryTask[];
  artifacts: MemoryArtifact[];
  auditRuns: AuditRun[];
  approvals: ApprovalItem[];
  serverStatus: ServerStatus | null;
  sourceCoverage: SourceCoverageItem[];
  isLoading: boolean;
  error: string | null;
  lastUpdated: string | null;

  // Actions
  loadAll: () => Promise<void>;
  loadMemorySummary: () => Promise<void>;
  loadArtifacts: () => Promise<void>;
  loadAuditRuns: () => Promise<void>;
  loadApprovals: () => Promise<void>;
  loadServerStatus: () => Promise<void>;
}

// ---------------------------------------------------------------------------
// IPC helpers
// ---------------------------------------------------------------------------

async function safeInvoke<T>(fn: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    console.warn("[reporting-store] IPC call failed:", err);
    return fallback;
  }
}

// IPC may return partial objects — normalize to full types
function normalizeTask(raw: any): MemoryTask {
  return {
    task_id: raw.task_id ?? "",
    project_id: raw.project_id ?? "",
    name: raw.name ?? "",
    description: raw.description ?? "",
    status: raw.status ?? "pending",
    assigned_to: raw.assigned_to ?? "",
    created_at: raw.created_at ?? "",
    updated_at: raw.updated_at ?? "",
    completed_at: raw.completed_at ?? null,
    dependencies: raw.dependencies ?? [],
    artifacts: raw.artifacts ?? [],
    tags: raw.tags ?? [],
  };
}

function normalizeArtifact(raw: any): MemoryArtifact {
  return {
    artifact_id: raw.artifact_id ?? "",
    project_id: raw.project_id ?? "",
    name: raw.name ?? "",
    path: raw.path ?? "",
    type: raw.type ?? "unknown",
    status: raw.status ?? "active",
    created_at: raw.created_at ?? "",
    updated_at: raw.updated_at ?? "",
    archived_at: raw.archived_at ?? null,
    archive_reason: raw.archive_reason ?? null,
    task_id: raw.task_id ?? null,
    version: raw.version ?? 1,
  };
}

function deriveSourceCoverage(
  server: ServerStatus | null,
  auditRuns: AuditRun[],
  tasks: MemoryTask[],
  artifacts: MemoryArtifact[]
): SourceCoverageItem[] {
  const sources: SourceCoverageItem[] = [];

  // Server connectivity
  sources.push({ name: "Local server", available: server?.running === true });

  // Memory state
  sources.push({ name: "Project memory", available: (tasks.length + artifacts.length) > 0 });

  // Workflow audit
  sources.push({ name: "Audit trail", available: auditRuns.length > 0 });

  // Derive from audit sourceCoverage
  const auditSources = new Set<string>();
  for (const run of auditRuns) {
    for (const src of run.sourceCoverage ?? []) {
      if (src.startsWith("unavailable:")) {
        sources.push({ name: src.replace("unavailable:", ""), available: false });
      } else {
        auditSources.add(src);
      }
    }
  }
  for (const s of auditSources) {
    // Don't duplicate if already present
    if (!sources.find(x => x.name.toLowerCase() === s.toLowerCase())) {
      sources.push({ name: s, available: true });
    }
  }

  return sources;
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

export const useReportingStore = create<ReportingState>()((set, get) => ({
  memorySummary: null,
  tasks: [],
  artifacts: [],
  auditRuns: [],
  approvals: [],
  serverStatus: null,
  sourceCoverage: [],
  isLoading: false,
  error: null,
  lastUpdated: null,

  loadAll: async () => {
    set({ isLoading: true, error: null });
    try {
      const [memory, rawTasks, rawArtifacts, runs, approvals, server] = await Promise.all([
        safeInvoke(() => window.electronAPI.memory.summary(), null),
        safeInvoke(() => window.electronAPI.memory.tasks(), []),
        safeInvoke(() => window.electronAPI.memory.artifacts(), []),
        safeInvoke(() => window.electronAPI.audit.runs(), []),
        safeInvoke(() => window.electronAPI.approvals.list({ status: "pending" }), []),
        safeInvoke(() => window.electronAPI.server.getStatus(), null),
      ]);

      const tasks = (rawTasks as any[]).map(normalizeTask);
      const artifacts = (rawArtifacts as any[]).map(normalizeArtifact);
      const sourceCoverage = deriveSourceCoverage(server, runs as AuditRun[], tasks, artifacts);

      set({
        memorySummary: memory,
        tasks,
        artifacts,
        auditRuns: runs as AuditRun[],
        approvals: approvals as ApprovalItem[],
        serverStatus: server,
        sourceCoverage,
        isLoading: false,
        error: null,
        lastUpdated: new Date().toISOString(),
      });
    } catch (err) {
      set({
        isLoading: false,
        error: err instanceof Error ? err.message : "Failed to load data",
      });
    }
  },

  loadMemorySummary: async () => {
    const summary = await safeInvoke(() => window.electronAPI.memory.summary(), null);
    set({ memorySummary: summary });
  },

  loadArtifacts: async () => {
    const raw = await safeInvoke(() => window.electronAPI.memory.artifacts(), []);
    set({ artifacts: (raw as any[]).map(normalizeArtifact) });
  },

  loadAuditRuns: async () => {
    const raw = await safeInvoke(() => window.electronAPI.audit.runs(), []);
    set({ auditRuns: raw as AuditRun[] });
  },

  loadApprovals: async () => {
    const raw = await safeInvoke(() => window.electronAPI.approvals.list({ status: "pending" }), []);
    set({ approvals: raw as ApprovalItem[] });
  },

  loadServerStatus: async () => {
    const server = await safeInvoke(() => window.electronAPI.server.getStatus(), null);
    set({ serverStatus: server });
  },
}));
