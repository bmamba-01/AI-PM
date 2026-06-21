import { describe, expect, it } from 'vitest';
import { generateReleaseReadiness, buildRollbackChecklist } from './devopsRelease.js';

describe('generateReleaseReadiness', () => {
  it('returns ready when no blockers', () => {
    const result = generateReleaseReadiness({
      project_id: 'proj-devops',
      environment: 'staging',
      deployment_status: 'deployed',
      ci_cd_health: 'healthy',
    });
    expect(result.readiness).toBe('ready');
    expect(result.blockers.length).toBe(0);
    expect(result.recommended_actions[0]).toContain('Proceed with release approval');
  });

  it('returns not_ready when blockers present', () => {
    const result = generateReleaseReadiness({
      project_id: 'proj-devops',
      environment: 'production',
      deployment_status: 'failed',
      ci_cd_health: 'failing',
      environment_blockers: ['disk full'],
    });
    expect(result.readiness).toBe('not_ready');
    expect(result.blockers.length).toBeGreaterThan(0);
  });

  it('marks degraded when sources missing', () => {
    const result = generateReleaseReadiness({
      project_id: 'proj-devops',
      environment: 'staging',
      unavailable_sources: ['ci-cd'],
    });
    expect(result.readiness).toBe('degraded');
    expect(result.source_coverage).toContain('unavailable:ci-cd');
  });
});

describe('buildRollbackChecklist', () => {
  it('includes standard rollback steps', () => {
    const release = generateReleaseReadiness({
      project_id: 'proj-devops',
      environment: 'production',
    });
    const checklist = buildRollbackChecklist(release);
    expect(checklist.length).toBeGreaterThanOrEqual(5);
    expect(checklist[0]).toContain(release.run_id);
  });

  it('appends blocker investigation when blockers exist', () => {
    const release = generateReleaseReadiness({
      project_id: 'proj-devops',
      environment: 'production',
      environment_blockers: ['disk full'],
    });
    const checklist = buildRollbackChecklist(release);
    expect(checklist.some(item => item.includes('disk full'))).toBe(true);
  });
});
