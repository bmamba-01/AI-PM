import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { generateReleaseReadiness, buildRollbackChecklist } from './devopsRelease.js';
import { LocalProjectStore } from '../runtime/localProjectStore.js';
import { ApprovalQueue } from '../runtime/approvalQueue.js';

const tempRoots: string[] = [];

async function tempRoot(): Promise<string> {
  const root = await mkdtemp(path.join(tmpdir(), 'ai-pm-devops-int-'));
  tempRoots.push(root);
  return root;
}

afterEach(async () => {
  await Promise.all(tempRoots.splice(0).map(root => rm(root, { recursive: true, force: true })));
});

describe('DevOpsRelease — integration', () => {
  it('full run: create temp project → generate release readiness → verify source coverage', async () => {
    const root = await tempRoot();
    const projectId = 'proj-devops-int';
    const store = new LocalProjectStore(root);
    const approvalQueue = new ApprovalQueue(root);
    await store.ensureProjectDirs();

    const release = generateReleaseReadiness({
      project_id: projectId,
      environment: 'staging',
      deployment_status: 'deployed',
      ci_cd_health: 'healthy',
      unavailable_sources: ['ci-logs'],
    });

    expect(release.project_id).toBe(projectId);
    expect(release.readiness).toBe('degraded');
    expect(release.source_coverage).toContain('unavailable:ci-logs');

    const checklist = buildRollbackChecklist(release);
    expect(checklist.length).toBeGreaterThanOrEqual(5);
    expect(checklist[0]).toContain(release.run_id);
  });
});
