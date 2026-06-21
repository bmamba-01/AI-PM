import type { MemoryStore } from '../runtime/memory.js';
import type { ApprovalQueue } from '../runtime/approvalQueue.js';
import type { LocalProjectStore } from '../runtime/localProjectStore.js';

export type ReviewSeverity = 'critical' | 'high' | 'medium' | 'low';

export type CodeQualityInput = {
  projectId: string;
  diffText: string;
  requirementsText?: string;
  testEvidence?: string;
  knownRisks?: string[];
  createdBy?: string;
};

export type RequirementMismatch = {
  requirementId?: string;
  description: string;
};

export type MissingTest = {
  area: string;
  expected: string;
};

export type RiskFinding = {
  severity: ReviewSeverity;
  description: string;
  area?: string;
};

export interface MergeReadinessResult {
  mergeReadiness: 'ready' | 'not_ready' | 'needs_human_decision';
  summary: string;
  criticalFindings: string[];
  highFindings: string[];
  mediumFindings: string[];
  missingTests: string[];
  requirementGaps: string[];
  verificationSeen: string[];
  reviewerActions: string[];
  approvalItemId: string | null;
}

function toLines(diff: string): string[] {
  return diff
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(Boolean);
}

function classifyFindings(lines: string[]): RiskFinding[] {
  const findings: RiskFinding[] = [];
  const seen = new Set<string>();

  for (const line of lines) {
    const key = line.toLowerCase();

    if (!seen.has(key) && /secret|token|password|passwd|api[_-]?key/i.test(key)) {
      seen.add(key);
      findings.push({
        severity: 'critical',
        area: 'security',
        description: `Potential secret in diff: ${line}`,
      });
      continue;
    }

    if (!seen.has(key) && /console\.(log|error|warn)\(/.test(line)) {
      seen.add(key);
      findings.push({
        severity: 'low',
        area: 'cleanup',
        description: `Console statement may be noisy in production: ${line}`,
      });
    }
  }

  return findings;
}

function detectMissingTests(lines: string[], testEvidence?: string): string[] {
  const hints: MissingTest[] = [];
  const normalizedTests = testEvidence?.toLowerCase() ?? '';
  const hasSomeTests = /\btest(s)?\b|\bdescribe\b|\bit\(/.test(normalizedTests) || /\b\.test\b|\b\.spec\b/.test(normalizedTests);

  if (!hasSomeTests) {
    hints.push({ area: 'test-coverage', expected: 'evidence of unit or integration tests for changed logic' });
  }

  if (!hasSomeTests && /\bclass\b|\binterface\b|\btype\b|\bfunction\b|\b=>\b|\badd\b|\bremove\b|\bdelete\b/i.test(lines.join(' '))) {
    hints.push({ area: 'behavioral-coverage', expected: 'tests for changed functions/classes/routes' });
  }

  return hints.map(item => `${item.area}: ${item.expected}`);
}

function detectRequirementGaps(diffText: string, requirementsText?: string): RequirementMismatch[] {
  if (!requirementsText || !requirementsText.trim()) {
    return [];
  }

  const keywords = requirementsText
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(Boolean)
    .slice(0, 20);

  const lowered = diffText.toLowerCase();
  return keywords
    .filter(keyword => keyword.length > 4)
    .filter(keyword => lowered.includes(keyword.toLowerCase()))
    .map(requirement => ({
      requirementId: requirement.slice(0, 40),
      description: `Requirement keyword matched in diff: ${requirement}`,
    }));
}

export function generateCodeQualityReview(input: CodeQualityInput): MergeReadinessResult {
  const lines = toLines(input.diffText);
  const findings = classifyFindings(lines);
  const missingTests = detectMissingTests(lines, input.testEvidence);
  const requirementGaps = detectRequirementGaps(input.diffText, input.requirementsText);

  const bySeverity = (severity: ReviewSeverity) => findings.filter(f => f.severity === severity).map(f => f.description);
  const hasCritical = bySeverity('critical').length > 0;
  const hasHigh = bySeverity('high').length > 0;

  const mergeReadiness: MergeReadinessResult['mergeReadiness'] = hasCritical
    ? 'not_ready'
    : hasHigh
      ? 'not_ready'
      : missingTests.length >= 3
        ? 'needs_human_decision'
        : missingTests.length >= 1
          ? 'needs_human_decision'
          : requirementGaps.length >= 2
            ? 'needs_human_decision'
            : 'ready';

  return {
    mergeReadiness,
    summary: mergeReadiness === 'ready' ? 'No blocking findings for merge readiness.' : 'Review found issues that may block merge.',
    criticalFindings: bySeverity('critical'),
    highFindings: bySeverity('high'),
    mediumFindings: bySeverity('medium'),
    missingTests,
    requirementGaps: requirementGaps.map(item => item.description),
    verificationSeen: [
      input.testEvidence ? 'provided test evidence' : 'no test evidence provided',
      input.requirementsText ? 'requirements text provided' : 'requirements text missing',
    ],
    reviewerActions: [
      ...(hasCritical ? ['Do not merge until critical findings are fixed.'] : []),
      ...(hasHigh ? ['Request explicit approval if high findings are waived.'] : []),
      ...(missingTests.length ? ['Add or update tests before merge.'] : []),
      ...(requirementGaps.length ? ['Confirm requirement linkage before merge.'] : []),
    ],
    approvalItemId: null,
  };
}

export async function runCodeQualityReview(options: {
  projectRoot: string;
  store: MemoryStore;
  localStore: LocalProjectStore;
  approvalQueue: ApprovalQueue;
  input: CodeQualityInput;
}): Promise<{ result: MergeReadinessResult; approvalItemId: string | null }> {
  const { projectRoot, store, localStore, approvalQueue, input } = options;
  const startedAt = new Date().toISOString();
  const result = generateCodeQualityReview(input);

  let approvalItemId: string | null = null;
  try {
    const approval = await approvalQueue.createItem({
      project_id: input.projectId,
      action_type: result.mergeReadiness === 'ready' ? 'code_quality_review' : 'code_quality_review_blocked',
      target_system: 'local',
      target_id: `code-quality-${startedAt}`,
      workflow_id: 'code-quality-guard',
      run_id: `code-quality-${Date.now()}`,
      requested_by_agent: 'code-quality-guard-workflow',
      requested_by_role: 'pm',
      title: `Code quality review ${result.mergeReadiness}`,
      description: result.summary,
      summary_diff: [
        `Merge readiness: ${result.mergeReadiness}`,
        `Critical: ${result.criticalFindings.length}`,
        `High: ${result.highFindings.length}`,
        `Medium: ${result.mediumFindings.length}`,
        `Missing tests: ${result.missingTests.length}`,
        `Requirement gaps: ${result.requirementGaps.length}`,
      ].join('\n'),
      confidence: result.mergeReadiness === 'ready' ? 90 : 60,
      source_refs: [],
      priority: result.mergeReadiness === 'not_ready' ? 'high' : 'medium',
      assigned_approvers: [],
    });
    approvalItemId = approval.approval_id;
  } catch (error) {
    console.warn('[code-quality] Failed to queue approval item:', error);
  }

  await localStore.appendWorkflowAudit({
    workflowId: 'code-quality-guard',
    projectId: input.projectId,
    status: 'completed',
    startedAt,
    completedAt: new Date().toISOString(),
    outputSummary: `Merge readiness: ${result.mergeReadiness}`,
    sourceCoverage: ['local-diff', 'local-requirements', 'local-test-evidence'],
    assumptions: input.knownRisks ?? ['Review is based on local inputs only.'],
  });

  return { result: { ...result, approvalItemId }, approvalItemId };
}
