import { describe, expect, it, beforeEach } from 'vitest';
import { useSetupStore } from './setup-store';

describe('Setup Store', () => {
  beforeEach(() => {
    useSetupStore.setState({
      step: 'gateway',
      mode: null,
      selectedPath: '',
      readiness: null,
      isProcessing: false,
      error: null,
    });
  });

  it('starts at gateway step', () => {
    const { step } = useSetupStore.getState();
    expect(step).toBe('gateway');
  });

  it('startNewProject transitions to wizard', () => {
    useSetupStore.getState().startNewProject();
    const { step, mode } = useSetupStore.getState();
    expect(step).toBe('new_project_wizard');
    expect(mode).toBe('new_project');
  });

  it('startAdoptExisting transitions to adopt wizard', () => {
    useSetupStore.getState().startAdoptExisting();
    const { step, mode } = useSetupStore.getState();
    expect(step).toBe('adopt_wizard');
    expect(mode).toBe('adopt_existing');
  });

  it('setSelectedPath updates path', () => {
    useSetupStore.getState().setSelectedPath('/tmp/test');
    expect(useSetupStore.getState().selectedPath).toBe('/tmp/test');
  });

  it('reset returns to gateway', () => {
    useSetupStore.getState().startNewProject();
    useSetupStore.getState().reset();
    const state = useSetupStore.getState();
    expect(state.step).toBe('gateway');
    expect(state.mode).toBeNull();
    expect(state.readiness).toBeNull();
    expect(state.isProcessing).toBe(false);
    expect(state.error).toBeNull();
  });

  it('setStep updates step directly', () => {
    useSetupStore.getState().setStep('error');
    expect(useSetupStore.getState().step).toBe('error');
  });

  it('has sensible defaults', () => {
    const { defaults } = useSetupStore.getState();
    expect(defaults.methodology).toBe('scrum');
    expect(defaults.project_type).toBe('software');
    expect(defaults.commercial_model).toBe('fixed_cost');
    expect(defaults.connector_profile).toBe('offline-local');
  });
});
