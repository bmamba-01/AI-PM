import { describe, expect, it } from 'vitest';
import { generateRiskControlSummary, listProjectRisks, addProjectRisk, closeProjectRisk } from './riskControl.js';

const makeRisk = (overrides: any = {}) => ({
  title: 'Vendor delay',
  probability: 'high',
  impact: 'high',
  owner: 'PM',
  projectId: 'alpha',
  ...overrides,
});

describe('generateRiskControlSummary', () => {
  it('aggregates risk counts and top risks', () => {
    const summary = generateRiskControlSummary({
      projectId: 'alpha',
      risks: [
        makeRisk({ title: 'Risk 1', impact: 'high', probability: 'high' }),
        makeRisk({ title: 'Risk 2', impact: 'medium', probability: 'medium' }),
        makeRisk({ title: 'Risk 3', status: 'closed' }),
      ],
      unavailableSources: ['gmail'],
      assumptions: ['Live data unavailable.'],
    });

    expect(summary.projectId).toBe('alpha');
    expect(summary.totalRisks).toBe(3);
    expect(summary.openRisks).toBe(2);
    expect(summary.closedRisks).toBe(1);
    expect(summary.topRisks[0]).toBe('Risk 1');
    expect(summary.closedThisPeriod).toEqual(['Risk 3']);
    expect(summary.confidence).toBeLessThan(100);
  });
});

describe('listProjectRisks', () => {
  it('maps artifacts to risk objects', async () => {
    const fakeStore = {
      getState: async () => ({
        artifacts: [
          {
            artifact_id: 'risk-1',
            project_id: 'alpha',
            name: 'Risk 1',
            type: 'risk',
            status: 'active',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            meta: {
              title: 'Risk 1',
              probability: 'high',
              impact: 'high',
              owner: 'PM',
              status: 'open',
              description: '',
              category: '',
              mitigation: '',
            },
          },
        ],
        tasks: [],
        project_id: 'alpha',
        updated_at: new Date().toISOString(),
      }),
    } as any;

    const risks = await listProjectRisks({ store: fakeStore });
    expect(risks).toHaveLength(1);
    expect(risks[0].id).toBe('risk-1');
  });
});

describe('addProjectRisk', () => {
  it('creates an artifact and queues approval', async () => {
    const fakeStore = {
      createArtifact: async (input: any) => ({ artifact_id: 'risk-new', ...input, created_at: new Date().toISOString(), updated_at: new Date().toISOString() }),
    } as any;
    const fakeLocal = {
      appendWorkflowAudit: async () => '',
    } as any;
    const fakeApproval = {
      createItem: async (input: any) => ({ approval_id: 'approval-1' } as any),
    } as any;

    const result = await addProjectRisk({
      store: fakeStore,
      localStore: fakeLocal,
      approvalQueue: fakeApproval,
      input: makeRisk({}),
    });

    expect(result.risk.id).toBe('risk-new');
    expect(result.approvalItemId).toBe('approval-1');
  });
});

describe('closeProjectRisk', () => {
  it('closes a risk if it exists', async () => {
    const now = new Date().toISOString();
    const fakeStore = {
      getState: async () => ({
        artifacts: [
          {
            artifact_id: 'risk-1',
            project_id: 'alpha',
            name: 'Risk 1',
            type: 'risk',
            status: 'active',
            created_at: now,
            updated_at: now,
            meta: {
              title: 'Risk 1',
              probability: 'high',
              impact: 'high',
              owner: 'PM',
              status: 'open',
              description: '',
              category: '',
              mitigation: '',
            },
          },
        ],
        tasks: [],
        project_id: 'alpha',
        updated_at: now,
      }),
      createArtifact: async (input: any) => ({ artifact_id: 'risk-1', ...input, created_at: now, updated_at: now }),
    } as any;
    const fakeLocal = {
      appendWorkflowAudit: async () => '',
    } as any;
    const fakeApproval = {
      createItem: async (input: any) => ({ approval_id: 'approval-close' } as any),
    } as any;

    const result = await closeProjectRisk({
      store: fakeStore,
      localStore: fakeLocal,
      approvalQueue: fakeApproval,
      riskId: 'risk-1',
      evidence: 'Resolved with backup vendor.',
    });

    expect(result.risk).toBeDefined();
    expect(result.risk!.status).toBe('closed');
    expect(result.approvalItemId).toBe('approval-close');
  });

  it('returns null if risk does not exist', async () => {
    const fakeStore = {
      getState: async () => ({ artifacts: [], tasks: [], project_id: 'alpha', updated_at: new Date().toISOString() }),
      createArtifact: async () => ({} as any),
    } as any;

    const result = await closeProjectRisk({
      store: fakeStore,
      localStore: {} as any,
      approvalQueue: {} as any,
      riskId: 'missing',
    });

    expect(result.risk).toBeNull();
    expect(result.approvalItemId).toBeNull();
  });
});
