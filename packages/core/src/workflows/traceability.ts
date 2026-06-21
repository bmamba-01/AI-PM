import type { MemoryStore } from '../runtime/memory.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type RequirementStatus =
  | 'draft'
  | 'approved'
  | 'implemented'
  | 'tested'
  | 'verified'
  | 'deprecated'
  | 'deferred';

export type TraceabilityGapSeverity = 'critical' | 'major' | 'minor' | 'info';

export interface RequirementInput {
  id: string;
  title: string;
  description?: string;
  priority?: string;
  owner?: string;
  status?: RequirementStatus;
  acceptanceCriteria?: string[];
  testRefs?: string[];
  sourceRefs?: string[];
  tags?: string[];
}

export interface TraceabilityInput {
  projectId: string;
  requirements: RequirementInput[];
  baselineId?: string | null;
  sourceCoverage?: string[];
  assumptions?: string[];
}

export interface TraceabilityEntry {
  reqId: string;
  title: string;
  owner: string;
  status: RequirementStatus;
  acceptanceCriteriaCount: number;
  acceptanceCriteriaRefs: string[];
  testRefCount: number;
  testRefs: string[];
  sourceRefCount: number;
  sourceRefs: string[];
  gaps: TraceabilityGap[];
}

export interface TraceabilityGap {
  reqId: string;
  severity: TraceabilityGapSeverity;
  category: string;
  message: string;
}

export interface TraceabilityMatrix {
  projectId: string;
  baselineId: string | null;
  totalRequirements: number;
  entries: TraceabilityEntry[];
  gaps: TraceabilityGap[];
  summary: {
    byStatus: Record<string, number>;
    coveragePercent: number;
    gapCount: number;
    gapsBySeverity: Record<string, number>;
    gapsByCategory: Record<string, number>;
  };
  sourceCoverage: string[];
  assumptions: string[];
  confidence: number;
  generatedAt: string;
}

// ---------------------------------------------------------------------------
// Core logic
// ---------------------------------------------------------------------------

function defaultStatus(): RequirementStatus {
  return 'draft';
}

function detectGaps(req: RequirementInput): TraceabilityGap[] {
  const gaps: TraceabilityGap[] = [];
  const ac = req.acceptanceCriteria ?? [];
  const tests = req.testRefs ?? [];

  if (ac.length === 0) {
    gaps.push({
      reqId: req.id,
      severity: 'major',
      category: 'acceptance_criteria',
      message: `Requirement ${req.id} has no acceptance criteria`,
    });
  }

  if (tests.length === 0) {
    gaps.push({
      reqId: req.id,
      severity: ac.length > 0 ? 'minor' : 'major',
      category: 'test_coverage',
      message: `Requirement ${req.id} has no linked test references`,
    });
  }

  if (ac.length > 0 && tests.length > 0 && tests.length < ac.length) {
    gaps.push({
      reqId: req.id,
      severity: 'minor',
      category: 'test_coverage',
      message: `Requirement ${req.id} has ${tests.length} test ref(s) for ${ac.length} acceptance criteria — not all criteria covered`,
    });
  }

  if (!req.owner || req.owner.trim() === '') {
    gaps.push({
      reqId: req.id,
      severity: 'minor',
      category: 'ownership',
      message: `Requirement ${req.id} has no owner assigned`,
    });
  }

  return gaps;
}

function computeCoverage(entries: TraceabilityEntry[]): number {
  if (entries.length === 0) return 100;
  const covered = entries.filter(
    e => e.acceptanceCriteriaCount > 0 && e.testRefCount > 0,
  ).length;
  return Math.round((covered / entries.length) * 100);
}

function confidenceFor(input: TraceabilityInput): number {
  const penalties =
    (input.sourceCoverage?.filter(s => s.startsWith('unavailable:')).length ?? 0) * 10 +
    (input.requirements.length === 0 ? 30 : 0);
  return Math.max(40, 100 - penalties);
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export function buildTraceabilityMatrix(input: TraceabilityInput): TraceabilityMatrix {
  const baselineId = input.baselineId ?? null;

  const entries: TraceabilityEntry[] = input.requirements.map(req => {
    const ac = req.acceptanceCriteria ?? [];
    const tests = req.testRefs ?? [];
    const sources = req.sourceRefs ?? [];

    return {
      reqId: req.id,
      title: req.title,
      owner: req.owner ?? '',
      status: req.status ?? defaultStatus(),
      acceptanceCriteriaCount: ac.length,
      acceptanceCriteriaRefs: ac,
      testRefCount: tests.length,
      testRefs: tests,
      sourceRefCount: sources.length,
      sourceRefs: sources,
      gaps: detectGaps(req),
    };
  });

  const allGaps = entries.flatMap(e => e.gaps);

  // Summary stats
  const byStatus: Record<string, number> = {};
  for (const e of entries) {
    byStatus[e.status] = (byStatus[e.status] || 0) + 1;
  }

  const gapsBySeverity: Record<string, number> = {};
  const gapsByCategory: Record<string, number> = {};
  for (const g of allGaps) {
    gapsBySeverity[g.severity] = (gapsBySeverity[g.severity] || 0) + 1;
    gapsByCategory[g.category] = (gapsByCategory[g.category] || 0) + 1;
  }

  const sc = (input.sourceCoverage ?? []).map(s =>
    s.startsWith('unavailable:') ? s : s,
  );

  const scWithPrefix = [...new Set([
    ...sc,
    ...(input.sourceCoverage ?? []).filter(s => !s.startsWith('unavailable:')).length > 0
      ? input.sourceCoverage!.filter(s => !s.startsWith('unavailable:')).map(s => `local:${s}`)
      : [],
  ])];

  return {
    projectId: input.projectId,
    baselineId,
    totalRequirements: input.requirements.length,
    entries,
    gaps: allGaps,
    summary: {
      byStatus,
      coveragePercent: computeCoverage(entries),
      gapCount: allGaps.length,
      gapsBySeverity,
      gapsByCategory,
    },
    sourceCoverage: scWithPrefix,
    assumptions: input.assumptions ?? [],
    confidence: confidenceFor(input),
    generatedAt: new Date().toISOString(),
  };
}

/**
 * Returns true if the input represents a scope baseline change that requires
 * approval. Matrix generation itself is read-only and does NOT require approval.
 */
export function requiresScopeApproval(input: TraceabilityInput): boolean {
  // Only true when a new baseline is being established (not just regenerating)
  return input.baselineId !== undefined && input.baselineId !== null;
}

/**
 * Persist the traceability matrix as an artifact in the MemoryStore.
 */
export async function persistTraceabilityArtifact(
  store: MemoryStore,
  matrix: TraceabilityMatrix,
): Promise<string | null> {
  const name = `traceability-matrix-${matrix.projectId}-${matrix.baselineId ?? 'latest'}`;
  const artifact = await store.createArtifact({
    project_id: matrix.projectId,
    name,
    path: `.ai-pm/artifacts/${name}.json`,
    type: 'traceability-matrix',
    status: 'active',
    archived_at: null,
    archive_reason: null,
    task_id: null,
  });
  return artifact.artifact_id;
}
