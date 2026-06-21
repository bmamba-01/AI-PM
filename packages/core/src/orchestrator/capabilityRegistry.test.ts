import { describe, expect, it } from 'vitest';
import {
  getAllCapabilities,
  getCapabilityById,
  getCapabilitiesForWorkflow,
  routeCapability,
  getCapabilityRegistrySummary,
} from './capabilityRegistry.js';

describe('Capability Registry', () => {
  describe('getAllCapabilities', () => {
    it('returns all registered capabilities', () => {
      const capabilities = getAllCapabilities();
      expect(capabilities.length).toBeGreaterThanOrEqual(10);
    });

    it('each capability has required fields', () => {
      const capabilities = getAllCapabilities();
      for (const cap of capabilities) {
        expect(cap.id).toBeDefined();
        expect(cap.role).toBeDefined();
        expect(cap.displayName).toBeDefined();
        expect(cap.description).toBeDefined();
        expect(Array.isArray(cap.supportedWorkflows)).toBe(true);
        expect(cap.supportedWorkflows.length).toBeGreaterThan(0);
        expect(Array.isArray(cap.requiredInputs)).toBe(true);
        expect(Array.isArray(cap.producedOutputs)).toBe(true);
        expect(Array.isArray(cap.outputFormats)).toBe(true);
        expect(cap.approvalBoundary).toBeDefined();
        expect(typeof cap.approvalBoundary.requiresApproval).toBe('boolean');
        expect(Array.isArray(cap.requiredMcpCapabilities)).toBe(true);
        expect(Array.isArray(cap.optionalMcpCapabilities)).toBe(true);
      }
    });

    it('contains all expected roles', () => {
      const capabilities = getAllCapabilities();
      const roles = capabilities.map(c => c.role);
      expect(roles).toContain('pm_commander');
      expect(roles).toContain('ba_analyst');
      expect(roles).toContain('qa_engineer');
      expect(roles).toContain('developer');
      expect(roles).toContain('tech_lead');
      expect(roles).toContain('code_quality_guard');
      expect(roles).toContain('reporting');
      expect(roles).toContain('meeting_intelligence');
      expect(roles).toContain('risk_manager');
      expect(roles).toContain('delivery_control');
    });
  });

  describe('getCapabilityById', () => {
    it('returns capability by ID', () => {
      const cap = getCapabilityById('pm-commander');
      expect(cap).toBeDefined();
      expect(cap!.role).toBe('pm_commander');
      expect(cap!.displayName).toBe('PM Commander');
    });

    it('returns undefined for unknown ID', () => {
      const cap = getCapabilityById('nonexistent');
      expect(cap).toBeUndefined();
    });
  });

  describe('getCapabilitiesForWorkflow', () => {
    it('returns capabilities for daily-briefing', () => {
      const caps = getCapabilitiesForWorkflow('daily-briefing');
      expect(caps.length).toBeGreaterThanOrEqual(2);
      const ids = caps.map(c => c.id);
      expect(ids).toContain('reporting-agent');
      expect(ids).toContain('meeting-intelligence');
    });

    it('returns capabilities for code-quality-guard', () => {
      const caps = getCapabilitiesForWorkflow('code-quality-guard');
      expect(caps.length).toBeGreaterThanOrEqual(3);
      const ids = caps.map(c => c.id);
      expect(ids).toContain('code-quality-guard');
      expect(ids).toContain('tech-lead');
      expect(ids).toContain('developer');
    });

    it('returns empty for unknown workflow', () => {
      const caps = getCapabilitiesForWorkflow('nonexistent-workflow');
      expect(caps).toHaveLength(0);
    });
  });

  describe('routeCapability', () => {
    it('routes daily-briefing to best-fit agent', () => {
      const result = routeCapability('daily-briefing');
      expect(result).not.toBeNull();
      expect(result!.workflowId).toBe('daily-briefing');
      expect(result!.primaryAgent).toBeDefined();
      expect(result!.estimatedSteps).toContain('intake');
      expect(result!.estimatedSteps).toContain('completion_report');
    });

    it('sets approvalRequired when any agent needs approval', () => {
      const result = routeCapability('risk-control');
      expect(result).not.toBeNull();
      expect(result!.approvalRequired).toBe(true);
    });

    it('returns null for unknown workflow', () => {
      const result = routeCapability('nonexistent');
      expect(result).toBeNull();
    });

    it('includes approval_gate when approval required', () => {
      const result = routeCapability('scope-control');
      expect(result).not.toBeNull();
      expect(result!.estimatedSteps).toContain('approval_gate');
    });

    it('includes supporting agents', () => {
      const result = routeCapability('daily-briefing');
      expect(result).not.toBeNull();
      expect(result!.supportingAgents.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('getCapabilityRegistrySummary', () => {
    it('returns correct summary', () => {
      const summary = getCapabilityRegistrySummary();
      expect(summary.totalAgents).toBeGreaterThanOrEqual(10);
      expect(summary.roles.length).toBeGreaterThanOrEqual(10);
      expect(summary.workflows.length).toBeGreaterThan(0);
      expect(summary.agentsWithApproval).toBeGreaterThan(0);
    });

    it('workflows include all expected workflows', () => {
      const summary = getCapabilityRegistrySummary();
      expect(summary.workflows).toContain('daily-briefing');
      expect(summary.workflows).toContain('weekly-report');
      expect(summary.workflows).toContain('risk-control');
      expect(summary.workflows).toContain('scope-control');
      expect(summary.workflows).toContain('code-quality-guard');
    });

    it('roles include all expected roles', () => {
      const summary = getCapabilityRegistrySummary();
      expect(summary.roles).toContain('pm_commander');
      expect(summary.roles).toContain('ba_analyst');
      expect(summary.roles).toContain('developer');
      expect(summary.roles).toContain('delivery_control');
    });
  });
});
