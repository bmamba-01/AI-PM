import { Methodology } from '../domain/index.js';
import { ScrumDefinition } from './definitions/scrum.js';
import { WaterfallDefinition } from './definitions/waterfall.js';
import { KanbanDefinition } from './definitions/kanban.js';
import { HybridDefinition } from './definitions/hybrid.js';

export interface MethodologyArtifact {
  id: string;
  type: string;
  name: string;
  content: any;
  createdAt: Date;
  updatedAt: Date;
}

export interface MethodologyState {
  currentPhase?: string;
  currentSprint?: string;
  artifacts: MethodologyArtifact[];
  ceremonies: CeremonySchedule[];
}

export interface CeremonySchedule {
  id: string;
  type: string;
  date: Date;
  duration: number;
  attendees: string[];
  status: 'scheduled' | 'completed' | 'cancelled';
}

type Definition = {
  name: string;
  events?: string[];
  artifacts?: string[];
  phases?: string[];
  principles?: string[];
  description?: string;
};

export class MethodologyEngine {
  private states = new Map<string, MethodologyState>();

  async initialize(projectId: string, type: Methodology): Promise<MethodologyState> {
    const definition = this.getDefinition(type);
    const state: MethodologyState = {
      currentPhase: definition.phases?.[0] || (definition.events ? 'START' : 'ACTIVE'),
      artifacts: this.createInitialArtifacts(definition),
      ceremonies: [],
    };
    this.states.set(projectId, state);
    return state;
  }

  async transition(projectId: string, phase: string, sprint?: string): Promise<void> {
    const state = this.states.get(projectId);
    if (state) {
      state.currentPhase = phase;
      if (sprint) state.currentSprint = sprint;
    }
  }

  async getArtifacts(projectId: string): Promise<MethodologyArtifact[]> {
    const state = this.states.get(projectId);
    return state?.artifacts || [];
  }

  async scheduleCeremony(projectId: string, ceremony: Omit<CeremonySchedule, 'id' | 'status'>): Promise<CeremonySchedule> {
    const state = this.states.get(projectId);
    if (!state) throw new Error('Project not initialized');
    const entry: CeremonySchedule = { ...ceremony, id: `ceremony-${Date.now()}`, status: 'scheduled' };
    state.ceremonies.push(entry);
    return entry;
  }

  private getDefinition(type: Methodology): Definition {
    switch (type) {
      case Methodology.SCRUM: return ScrumDefinition;
      case Methodology.WATERFALL: return WaterfallDefinition;
      case Methodology.KANBAN: return KanbanDefinition;
      case Methodology.HYBRID: return HybridDefinition;
      default: return ScrumDefinition;
    }
  }

  private createInitialArtifacts(definition: Definition): MethodologyArtifact[] {
    const names = definition.artifacts || [];
    return names.map((name, i) => ({
      id: `artifact-${i}`,
      type: name.toLowerCase(),
      name,
      content: {},
      createdAt: new Date(),
      updatedAt: new Date(),
    }));
  }
}