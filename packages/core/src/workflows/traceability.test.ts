import { afterEach, describe, expect, it } from 'vitest';
import {
  buildTraceabilityMatrix,
  requiresScopeApproval,
  persistTraceabilityArtifact,
  type TraceabilityInput,
  type RequirementInput,
} from './traceability.js';
import { MemoryStore } from '../runtime/memory.js';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

const tempRoots: string[] = [];

async function tempRoot(): Promise<string> {
  const root = await mkdtemp(path.join(tmpdir(), 'ai-pm-trace-'));
  tempRoots.push(root);
  return root;
}

afterEach(async () => {
  await Promise.all(tempRoots.splice(0).map(r => rm(r, { recursive: true, force: true })));
});

function baseRequirements(): RequirementInput[] {
  return [
    {
      id: 'REQ-001',
      title: 'User login with email',
      description: 'User can log in with email/password',
      owner: 'auth-team',
      status: 'approved',
      acceptanceCriteria: ['AC-1: Valid credentials accepted', 'AC-2: Invalid credentials rejected'],
      testRefs: ['TEST-101', 'TEST-102'],
      sourceRefs: ['DOC-1'],
      priority: 'high',
    },
    {
      id: 'REQ-002',
      title: 'Password reset flow',
      description: 'User can reset password via email link',
      owner: 'auth-team',
      status: 'draft',
      acceptanceCriteria: ['AC-3: Reset email sent'],
      testRefs: [],
      sourceRefs: ['DOC-2'],
    },
    {
      id: 'REQ-003',
      title: 'Audit logging',
      description: 'All login attempts are logged',
      status: 'draft',
    },
  ];
}

function baseInput(overrides?: Partial<TraceabilityInput>): TraceabilityInput {
  return {
    projectId: 'proj-001',
    requirements: baseRequirements(),
    ...overrides,
  };
}

describe('buildTraceabilityMatrix', () => {
  it('builds matrix from requirements', () => {
    const matrix = buildTraceabilityMatrix(baseInput());
    expect(matrix.totalRequirements).toBe(3);
    expect(matrix.entries).toHaveLength(3);
    expect(matrix.projectId).toBe('proj-001');
    expect(matrix.generatedAt).toBeDefined();
  });

  it('populates entry details correctly', () => {
    const matrix = buildTraceabilityMatrix(baseInput());
    const req1 = matrix.entries.find(e => e.reqId === 'REQ-001')!;
    expect(req1.title).toBe('User login with email');
    expect(req1.owner).toBe('auth-team');
    expect(req1.status).toBe('approved');
    expect(req1.acceptanceCriteriaCount).toBe(2);
    expect(req1.testRefCount).toBe(2);
  });

  it('detects gap: no acceptance criteria', () => {
    const matrix = buildTraceabilityMatrix(baseInput());
    const req3 = matrix.entries.find(e => e.reqId === 'REQ-003')!;
    expect(req3.gaps.some(g => g.category === 'acceptance_criteria')).toBe(true);
    expect(req3.gaps.some(g => g.severity === 'major')).toBe(true);
  });

  it('detects gap: no test refs', () => {
    const matrix = buildTraceabilityMatrix(baseInput());
    const req2 = matrix.entries.find(e => e.reqId === 'REQ-002')!;
    expect(req2.gaps.some(g => g.category === 'test_coverage')).toBe(true);
  });

  it('detects gap: missing owner', () => {
    const matrix = buildTraceabilityMatrix(baseInput());
    const req3 = matrix.entries.find(e => e.reqId === 'REQ-003')!;
    expect(req3.gaps.some(g => g.category === 'ownership')).toBe(true);
  });

  it('counts gaps correctly', () => {
    const matrix = buildTraceabilityMatrix(baseInput());
    expect(matrix.gaps.length).toBeGreaterThan(0);
    expect(matrix.summary.gapCount).toBe(matrix.gaps.length);
    expect(typeof matrix.summary.gapsBySeverity).toBe('object');
    expect(typeof matrix.summary.gapsByCategory).toBe('object');
  });

  it('computes coverage percent', () => {
    const matrix = buildTraceabilityMatrix(baseInput());
    // REQ-001 has both AC and tests — covered
    // REQ-002 has AC but no tests — not covered
    // REQ-003 has neither — not covered
    expect(matrix.summary.coveragePercent).toBe(33); // 1/3 ≈ 33%
  });

  it('handles empty input', () => {
    const matrix = buildTraceabilityMatrix({ projectId: 'proj-002', requirements: [] });
    expect(matrix.totalRequirements).toBe(0);
    expect(matrix.entries).toHaveLength(0);
    expect(matrix.gaps).toHaveLength(0);
    expect(matrix.summary.coveragePercent).toBe(100);
  });

  it('sets baselineId when provided', () => {
    const matrix = buildTraceabilityMatrix(baseInput({ baselineId: 'BL-2026-Q3' }));
    expect(matrix.baselineId).toBe('BL-2026-Q3');
  });

  it('defaults baselineId to null', () => {
    const matrix = buildTraceabilityMatrix(baseInput());
    expect(matrix.baselineId).toBeNull();
  });

  it('includes assumptions and sourceCoverage', () => {
    const matrix = buildTraceabilityMatrix(baseInput({
      assumptions: ['No backend changes expected'],
      sourceCoverage: ['jira', 'unavailable:github'],
    }));
    expect(matrix.assumptions).toContain('No backend changes expected');
    expect(matrix.sourceCoverage.length).toBeGreaterThan(0);
  });

  it('computes confidence based on data quality', () => {
    const good = buildTraceabilityMatrix(baseInput());
    const bad = buildTraceabilityMatrix(baseInput({
      sourceCoverage: ['unavailable:jira', 'unavailable:github'],
    }));
    expect(bad.confidence).toBeLessThan(good.confidence);
  });

  it('detects partial test coverage', () => {
    const input: TraceabilityInput = {
      projectId: 'proj-001',
      requirements: [{
        id: 'REQ-100',
        title: 'Partial coverage',
        owner: 'team',
        status: 'approved',
        acceptanceCriteria: ['AC-1', 'AC-2', 'AC-3'],
        testRefs: ['TEST-1'],  // 1 test for 3 AC
      }],
    };
    const matrix = buildTraceabilityMatrix(input);
    expect(matrix.gaps.some(g =>
      g.category === 'test_coverage' && g.message.includes('not all criteria covered'),
    )).toBe(true);
  });
});

describe('requiresScopeApproval', () => {
  it('returns true when baselineId is set', () => {
    expect(requiresScopeApproval({ projectId: 'p', requirements: [], baselineId: 'BL-1' })).toBe(true);
  });

  it('returns false when baselineId is null', () => {
    expect(requiresScopeApproval({ projectId: 'p', requirements: [], baselineId: null })).toBe(false);
  });

  it('returns false when baselineId is undefined', () => {
    expect(requiresScopeApproval({ projectId: 'p', requirements: [] })).toBe(false);
  });
});

describe('persistTraceabilityArtifact', () => {
  it('persists artifact to memory store', async () => {
    const root = await tempRoot();
    const store = new MemoryStore(root);
    const matrix = buildTraceabilityMatrix(baseInput({ projectId: 'proj-001', baselineId: 'BL-1' }));
    const artifactId = await persistTraceabilityArtifact(store, matrix);
    expect(artifactId).toBeDefined();

    const artifacts = await store.listArtifacts({ type: 'traceability-matrix' });
    expect(artifacts).toHaveLength(1);
    expect(artifacts[0].name).toContain('proj-001');
    expect(artifacts[0].status).toBe('active');
  });

  it('creates separate artifacts for different baselines', async () => {
    const root = await tempRoot();
    const store = new MemoryStore(root);
    const m1 = buildTraceabilityMatrix(baseInput({ projectId: 'proj-001', baselineId: 'BL-1' }));
    const m2 = buildTraceabilityMatrix(baseInput({ projectId: 'proj-001', baselineId: 'BL-2' }));
    await persistTraceabilityArtifact(store, m1);
    await persistTraceabilityArtifact(store, m2);

    const artifacts = await store.listArtifacts({ type: 'traceability-matrix' });
    expect(artifacts).toHaveLength(2);
  });
});
