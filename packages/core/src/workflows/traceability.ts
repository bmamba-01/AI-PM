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

// ── Strict mode types ────────────────────────────────────────────────────────

export type GapType = 'requirement_gap' | 'ac_gap' | 'test_gap' | 'owner_gap' | 'source_gap';

export interface StrictGap {
  gap_id: string;
  requirement_id: string;
  gap_type: GapType;
  severity: TraceabilityGapSeverity;
  description: string;
  recommended_action: string;
  status: 'open';
  owner: string;
}

export interface ChangeRequestDraft {
  title: string;
  description: string;
  change_description: string;
  business_justification: string;
  impact_assessment: string;
  alternatives: string[];
}

export interface ScopeVerificationResult {
  projectId: string;
  matrix: TraceabilityMatrix;
  strictGaps: StrictGap[];
  uatReadiness: {
    score: number;
    totalRequirements: number;
    acCovered: number;
    testsCovered: number;
    ownersAssigned: number;
  };
  changeRequestDraft: ChangeRequestDraft | null;
  generatedAt: string;
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

// ── Strict mode ──────────────────────────────────────────────────────────────

let _gapCounter = 0;
function nextGapId(): string {
  return `GAP-${String(++_gapCounter).padStart(4, '0')}`;
}

export function runStrictVerification(input: TraceabilityInput): ScopeVerificationResult {
  const matrix = buildTraceabilityMatrix(input);
  const strictGaps: StrictGap[] = [];

  for (const entry of matrix.entries) {
    // AC gap
    if (entry.acceptanceCriteriaCount === 0) {
      strictGaps.push({
        gap_id: nextGapId(),
        requirement_id: entry.reqId,
        gap_type: 'ac_gap',
        severity: 'major',
        description: `Requirement "${entry.title}" has no acceptance criteria defined`,
        recommended_action: 'Define at least one testable acceptance criterion',
        status: 'open',
        owner: entry.owner || 'unassigned',
      });
    }

    // Test gap
    if (entry.testRefCount === 0) {
      strictGaps.push({
        gap_id: nextGapId(),
        requirement_id: entry.reqId,
        gap_type: 'test_gap',
        severity: entry.acceptanceCriteriaCount > 0 ? 'minor' : 'major',
        description: `Requirement "${entry.title}" has no linked test cases`,
        recommended_action: 'Create test cases covering each acceptance criterion',
        status: 'open',
        owner: entry.owner || 'unassigned',
      });
    } else if (entry.testRefCount < entry.acceptanceCriteriaCount) {
      strictGaps.push({
        gap_id: nextGapId(),
        requirement_id: entry.reqId,
        gap_type: 'test_gap',
        severity: 'minor',
        description: `Requirement "${entry.title}" has ${entry.testRefCount} test(s) for ${entry.acceptanceCriteriaCount} AC — partial coverage`,
        recommended_action: 'Add test cases for uncovered acceptance criteria',
        status: 'open',
        owner: entry.owner || 'unassigned',
      });
    }

    // Owner gap
    if (!entry.owner || entry.owner.trim() === '') {
      strictGaps.push({
        gap_id: nextGapId(),
        requirement_id: entry.reqId,
        gap_type: 'owner_gap',
        severity: 'minor',
        description: `Requirement "${entry.title}" has no owner assigned`,
        recommended_action: 'Assign an owner from the project team',
        status: 'open',
        owner: 'unassigned',
      });
    }

    // Source gap
    if (entry.sourceRefCount === 0) {
      strictGaps.push({
        gap_id: nextGapId(),
        requirement_id: entry.reqId,
        gap_type: 'source_gap',
        severity: 'info',
        description: `Requirement "${entry.title}" has no source references`,
        recommended_action: 'Link to design documents, user stories, or meeting notes',
        status: 'open',
        owner: entry.owner || 'unassigned',
      });
    }
  }

  // UAT readiness score
  const total = matrix.totalRequirements;
  const acCovered = matrix.entries.filter(e => e.acceptanceCriteriaCount > 0).length;
  const testsCovered = matrix.entries.filter(e => e.testRefCount > 0).length;
  const ownersAssigned = matrix.entries.filter(e => e.owner && e.owner.trim() !== '').length;

  const uatScore = total === 0
    ? 100
    : Math.round(((acCovered + testsCovered + ownersAssigned) / (total * 3)) * 100);

  // Change request draft (only if there are critical/major gaps)
  const criticalGaps = strictGaps.filter(g => g.severity === 'critical' || g.severity === 'major');
  const changeRequestDraft: ChangeRequestDraft | null = criticalGaps.length > 0
    ? {
        title: `Scope Verification — ${criticalGaps.length} critical/major gap(s)`,
        description: `Scope verification found ${strictGaps.length} gaps (${criticalGaps.length} critical/major) in ${total} requirements.`,
        change_description: criticalGaps.map(g => `- ${g.description}`).join('\n'),
        business_justification: 'Requirements must meet definition of done before UAT',
        impact_assessment: `UAT readiness at ${uatScore}% — ${criticalGaps.length} items block go-live`,
        alternatives: [
          'Accept gaps and proceed with documented risks',
          'Defer incomplete requirements to next sprint',
          'Add acceptance criteria and test cases before UAT',
        ],
      }
    : null;

  return {
    projectId: input.projectId,
    matrix,
    strictGaps,
    uatReadiness: {
      score: uatScore,
      totalRequirements: total,
      acCovered,
      testsCovered,
      ownersAssigned,
    },
    changeRequestDraft,
    generatedAt: new Date().toISOString(),
  };
}
