// DevOps Release Readiness Workflow
// Generate release readiness report, rollback checklist, and approval item.

export interface ReleaseInput {
  project_id: string;
  environment: string;
  run_id?: string;
  deployment_status?: string;
  ci_cd_health?: string;
  environment_blockers?: string[];
  incident_risk?: string;
  observations?: string[];
  unavailable_sources?: string[];
  assumptions?: string[];
}

export interface ReleaseReadiness {
  project_id: string;
  run_id: string;
  environment: string;
  readiness: 'ready' | 'not_ready' | 'degraded';
  deployment_status: string;
  ci_cd_health: string;
  environment_blockers: string[];
  incident_risk: string;
  blockers: string[];
  recommended_actions: string[];
  source_coverage: string[];
  confidence: number;
  assumptions: string[];
  generated_at: string;
}

export interface ReleaseArtifactResult {
  release: ReleaseReadiness;
  rollback_checklist: string[];
  approvalItemId: string | null;
  artifacts: Array<{
    id: string;
    path: string;
    format: string;
    persisted: boolean;
  }>;
}

export function generateReleaseReadiness(input: ReleaseInput): ReleaseReadiness {
  const blockers = [...(input.environment_blockers ?? [])];
  if (input.ci_cd_health && !/healthy|passing|ok/i.test(input.ci_cd_health)) {
    blockers.push(`CI/CD health degraded: ${input.ci_cd_health}`);
  }
  if (input.incident_risk && !/none|low/i.test(input.incident_risk)) {
    blockers.push(`Incident risk elevated: ${input.incident_risk}`);
  }

  const unavailable = input.unavailable_sources ?? [];
  const readiness: ReleaseReadiness['readiness'] =
    unavailable.length > 0
      ? 'degraded'
      : blockers.length > 0
        ? 'not_ready'
        : 'ready';

  const sourceCoverage = [
    ...(input.deployment_status ? ['deployment-status'] : []),
    ...(input.ci_cd_health ? ['ci-cd-health'] : []),
    ...(input.environment_blockers && input.environment_blockers.length > 0 ? ['environment-checks'] : []),
    ...unavailable.map(source => `unavailable:${source}`),
  ];

  const confidence = Math.max(
    40,
    100 - unavailable.length * 10 - blockers.length * 10,
  );

  return {
    project_id: input.project_id,
    run_id: input.run_id ?? `release-${Date.now()}`,
    environment: input.environment,
    readiness,
    deployment_status: input.deployment_status ?? 'unknown',
    ci_cd_health: input.ci_cd_health ?? 'unknown',
    environment_blockers: input.environment_blockers ?? [],
    incident_risk: input.incident_risk ?? 'unknown',
    blockers,
    recommended_actions: readiness === 'ready'
      ? ['Proceed with release approval.']
      : ['Resolve blockers before release.', 'Re-run health check after remediation.'],
    source_coverage: sourceCoverage,
    confidence,
    assumptions: input.assumptions ?? ['Live CI evidence replaced with synthetic items for test.'],
    generated_at: new Date().toISOString(),
  };
}

export function buildRollbackChecklist(release: ReleaseReadiness): string[] {
  const checklist: string[] = [
    `Rollback trigger: release ${release.run_id} in ${release.environment}.`,
    `Notify on-call and stakeholders.`,
    `Stop deployment pipeline for ${release.environment}.`,
    `Restore previous artifact version from artifact store.`,
    `Verify rollback by health check.`,
    `Communicate resolution in incident channel.`,
  ];

  if (release.environment_blockers.length > 0) {
    checklist.push(`Investigate blockers before retry: ${release.environment_blockers.join('; ')}`);
  }

  return checklist;
}

// TODO: Wire release workflow into artifact factory and approval queue
// (integration scaffolding left for next task)
