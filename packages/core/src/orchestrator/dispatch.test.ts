import { describe, it, expect } from 'vitest';
import {
  dispatchWorkflow,
  isValidWorkflow,
  SUPPORTED_WORKFLOWS,
  type WorkflowId,
  type DispatchResult,
} from './dispatch.js';

// ─── isValidWorkflow ─────────────────────────────────────────────────────────

describe('isValidWorkflow', () => {
  it('accepts valid workflow IDs', () => {
    for (const id of SUPPORTED_WORKFLOWS) {
      expect(isValidWorkflow(id)).toBe(true);
    }
  });

  it('rejects invalid workflow IDs', () => {
    expect(isValidWorkflow('unknown')).toBe(false);
    expect(isValidWorkflow('')).toBe(false);
    expect(isValidWorkflow('daily')).toBe(false);
  });
});

// ─── dispatchWorkflow ────────────────────────────────────────────────────────

describe('dispatchWorkflow', () => {
  const base = { project_id: 'test-proj', project_root: '/tmp/test' };

  it('dispatches daily-briefing workflow', () => {
    const result = dispatchWorkflow({ ...base, workflow_id: 'daily-briefing' });
    expect(result.workflow_id).toBe('daily-briefing');
    expect(result.output).toBeDefined();
    expect(result.artifact_name).toBe('daily-briefing');
    expect(result.artifact_path).toContain('daily-briefing-');
    expect(result.assumptions.length).toBeGreaterThan(0);
  });

  it('dispatches weekly-report workflow', () => {
    const result = dispatchWorkflow({ ...base, workflow_id: 'weekly-report' });
    expect(result.workflow_id).toBe('weekly-report');
    expect(result.output).toBeDefined();
    expect(result.artifact_name).toBe('weekly-report');
    expect(result.artifact_path).toContain('weekly-report-');
  });

  it('dispatches risk-control workflow', () => {
    const result = dispatchWorkflow({ ...base, workflow_id: 'risk-control' });
    expect(result.workflow_id).toBe('risk-control');
    expect(result.output).toBeDefined();
    expect(result.artifact_name).toBe('risk-control');
    expect(result.artifact_path).toContain('risk-control-');
  });

  it('dispatches traceability workflow', () => {
    const result = dispatchWorkflow({ ...base, workflow_id: 'traceability' });
    expect(result.workflow_id).toBe('traceability');
    expect(result.output).toBeDefined();
    expect(result.artifact_name).toBe('traceability-matrix');
    expect(result.artifact_path).toContain('traceability-matrix-');
  });

  it('dispatches code-quality workflow', () => {
    const result = dispatchWorkflow({ ...base, workflow_id: 'code-quality' });
    expect(result.workflow_id).toBe('code-quality');
    expect(result.output).toBeDefined();
    expect(result.artifact_name).toBe('code-quality-review');
    expect(result.artifact_path).toContain('code-quality-review-');
  });

  it('throws on unknown workflow', () => {
    expect(() => dispatchWorkflow({ ...base, workflow_id: 'unknown' }))
      .toThrow('Unknown workflow');
  });

  it('throws on empty workflow', () => {
    expect(() => dispatchWorkflow({ ...base, workflow_id: '' }))
      .toThrow('Unknown workflow');
  });

  it('all outputs have expected structure', () => {
    for (const wf of SUPPORTED_WORKFLOWS) {
      const result = dispatchWorkflow({ ...base, workflow_id: wf });
      expect(result).toHaveProperty('workflow_id');
      expect(result).toHaveProperty('output');
      expect(result).toHaveProperty('artifact_name');
      expect(result).toHaveProperty('artifact_path');
      expect(result).toHaveProperty('assumptions');
      expect(Array.isArray(result.assumptions)).toBe(true);
    }
  });
});
