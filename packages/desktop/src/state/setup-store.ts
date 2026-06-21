import { create } from 'zustand';

// Types for the setup flow
export type SetupMode = 'new_project' | 'adopt_existing' | 'demo' | null;
export type SetupStep = 'gateway' | 'new_project_wizard' | 'adopt_wizard' | 'scanning' | 'repairing' | 'complete' | 'error';

export interface SetupDefaults {
  methodology: string;
  project_type: string;
  commercial_model: string;
  timezone: string;
  connector_profile: string;
}

export interface SetupReadinessResult {
  score: number;
  checks: Array<{
    id: string;
    label: string;
    required: boolean;
    present: boolean;
  }>;
  blocking: string[];
  warnings: string[];
  nextCommands: string[];
}

interface SetupState {
  step: SetupStep;
  mode: SetupMode;
  defaults: SetupDefaults;
  selectedPath: string;
  readiness: SetupReadinessResult | null;
  isProcessing: boolean;
  error: string | null;

  // Actions
  startNewProject: () => void;
  startAdoptExisting: () => void;
  startDemo: () => void;
  setSelectedPath: (path: string) => void;
  runScan: (path: string) => Promise<void>;
  runRepair: (path: string) => Promise<void>;
  reset: () => void;
  setStep: (step: SetupStep) => void;
}

export const useSetupStore = create<SetupState>()((set) => ({
  step: 'gateway',
  mode: null,
  defaults: {
    methodology: 'scrum',
    project_type: 'software',
    commercial_model: 'fixed_cost',
    timezone: 'Asia/Saigon',
    connector_profile: 'offline-local',
  },
  selectedPath: '',
  readiness: null,
  isProcessing: false,
  error: null,

  startNewProject: () => set({ step: 'new_project_wizard', mode: 'new_project' }),
  startAdoptExisting: () => set({ step: 'adopt_wizard', mode: 'adopt_existing' }),
  startDemo: () => set({ step: 'scanning', mode: 'demo' }),
  setSelectedPath: (path: string) => set({ selectedPath: path }),

  runScan: async (path: string) => {
    set({ isProcessing: true, error: null, step: 'scanning' });
    try {
      const scanResult = await window.electronAPI.setup.scan(path);
      const readiness: SetupReadinessResult = {
        score: scanResult.score,
        checks: scanResult.checks,
        blocking: scanResult.blocking,
        warnings: scanResult.warnings,
        nextCommands: scanResult.blocking.length > 0
          ? ['ai-pm setup repair --path . --json']
          : ['ai-pm project scan --json'],
      };
      set({ readiness, isProcessing: false });
    } catch (err) {
      set({ error: String(err), isProcessing: false, step: 'error' });
    }
  },

  runRepair: async (path: string) => {
    set({ isProcessing: true, error: null, step: 'repairing' });
    try {
      await window.electronAPI.setup.repair(path);
      set({ isProcessing: false, step: 'complete' });
    } catch (err) {
      set({ error: String(err), isProcessing: false, step: 'error' });
    }
  },

  reset: () => set({
    step: 'gateway',
    mode: null,
    readiness: null,
    isProcessing: false,
    error: null,
  }),

  setStep: (step: SetupStep) => set({ step }),
}));
