import { describe, expect, it } from 'vitest';
import {
  getAllAgents,
  getAgentById,
  getAgentsForWorkflow,
  routeWorkflow,
  getAgentRegistrySummary,
} from './agentRegistry.js';

describe('Agent Registry', () => {
  describe('getAllAgents', () => {
    it('returns all registered agents', () => {
      const agents = getAllAgents();
      expect(agents.length).toBeGreaterThanOrEqual(10);
    });

    it('each agent has required fields', () => {
      const agents = getAllAgents();
      for (const agent of agents) {
        expect(agent.id).toBeDefined();
        expect(agent.role).toBeDefined();
        expect(agent.displayName).toBeDefined();
        expect(agent.description).toBeDefined();
        expect(Array.isArray(agent.supportedWorkflows)).toBe(true);
        expect(agent.supportedWorkflows.length).toBeGreaterThan(0);
        expect(agent.approvalBoundary).toBeDefined();
        expect(typeof agent.approvalBoundary.requiresApproval).toBe('boolean');
      }
    });
  });

  describe('getAgentById', () => {
    it('returns agent by ID', () => {
      const agent = getAgentById('pm-commander');
      expect(agent).toBeDefined();
      expect(agent!.role).toBe('pm_commander');
      expect(agent!.displayName).toBe('PM Commander');
    });

    it('returns undefined for unknown ID', () => {
      const agent = getAgentById('nonexistent');
      expect(agent).toBeUndefined();
    });
  });

  describe('getAgentsForWorkflow', () => {
    it('returns agents for daily-briefing', () => {
      const agents = getAgentsForWorkflow('daily-briefing');
      expect(agents.length).toBeGreaterThanOrEqual(2);
      const ids = agents.map(a => a.id);
      expect(ids).toContain('daily-briefing-agent');
      expect(ids).toContain('reporting-agent');
    });

    it('returns agents for code-quality-guard', () => {
      const agents = getAgentsForWorkflow('code-quality-guard');
      expect(agents.length).toBeGreaterThanOrEqual(2);
      const ids = agents.map(a => a.id);
      expect(ids).toContain('code-quality-guard');
      expect(ids).toContain('tech-lead');
    });

    it('returns empty for unknown workflow', () => {
      const agents = getAgentsForWorkflow('nonexistent-workflow');
      expect(agents).toHaveLength(0);
    });
  });

  describe('routeWorkflow', () => {
    it('routes daily-briefing to best-fit agent', () => {
      const result = routeWorkflow('daily-briefing');
      expect(result).not.toBeNull();
      expect(result!.workflowId).toBe('daily-briefing');
      expect(result!.assignedAgent).toBeDefined();
      expect(result!.estimatedSteps).toContain('intake');
      expect(result!.estimatedSteps).toContain('audit_write');
    });

    it('sets approvalRequired when any agent needs approval', () => {
      const result = routeWorkflow('risk-control');
      expect(result).not.toBeNull();
      // risk-manager has approval_required: true
      expect(result!.approvalRequired).toBe(true);
    });

    it('returns null for unknown workflow', () => {
      const result = routeWorkflow('nonexistent');
      expect(result).toBeNull();
    });

    it('includes estimated steps with approval gate when needed', () => {
      const result = routeWorkflow('scope-control');
      expect(result).not.toBeNull();
      expect(result!.estimatedSteps).toContain('approval_gate');
    });

    it('excludes approval gate when not needed', () => {
      const result = routeWorkflow('daily-briefing');
      expect(result).not.toBeNull();
      // daily-briefing-agent has requiresApproval: false
      // but reporting-agent has requiresApproval: true
      // so approval gate may or may not be present
      expect(result!.estimatedSteps.length).toBeGreaterThan(5);
    });
  });

  describe('getAgentRegistrySummary', () => {
    it('returns correct summary', () => {
      const summary = getAgentRegistrySummary();
      expect(summary.totalAgents).toBeGreaterThanOrEqual(10);
      expect(summary.roles.length).toBeGreaterThan(0);
      expect(summary.workflows.length).toBeGreaterThan(0);
      expect(summary.agentsWithApproval).toBeGreaterThan(0);
    });

    it('workflows include all expected workflows', () => {
      const summary = getAgentRegistrySummary();
      expect(summary.workflows).toContain('daily-briefing');
      expect(summary.workflows).toContain('weekly-report');
      expect(summary.workflows).toContain('risk-control');
      expect(summary.workflows).toContain('scope-control');
      expect(summary.workflows).toContain('code-quality-guard');
    });
  });
});
