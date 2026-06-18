import { RoleType } from '@ai-pm/core/domain';
import type { Skill } from '@ai-pm/core/skills';

export interface Agent {
  id: string;
  name: string;
  role: RoleType;
  status: 'idle' | 'busy' | 'error';
  capabilities: string[];
  lastRun?: string;
}

export interface AgentTask {
  id: string;
  agentId: string;
  type: string;
  input: unknown;
  status: 'pending' | 'running' | 'completed' | 'failed';
  result?: unknown;
}

export interface AgentPool {
  agents: Map<string, Agent>;
  register(agent: Agent): void;
  unregister(agentId: string): void;
  getAvailable(role: RoleType): Agent | undefined;
  assignTask(task: AgentTask): Promise<void>;
}

export class DefaultAgentPool implements AgentPool {
  agents: Map<string, Agent> = new Map();
  private tasks: Map<string, AgentTask> = new Map();

  register(agent: Agent): void {
    this.agents.set(agent.id, agent);
  }

  unregister(agentId: string): void {
    this.agents.delete(agentId);
  }

  getAvailable(role: RoleType): Agent | undefined {
    return Array.from(this.agents.values()).find(a => a.role === role && a.status === 'idle');
  }

  async assignTask(task: AgentTask): Promise<void> {
    this.tasks.set(task.id, { ...task, status: 'running' });
    const agent = this.agents.get(task.agentId);
    if (agent) {
      agent.status = 'busy';
    }
    setTimeout(() => {
      const t = this.tasks.get(task.id);
      if (t) {
        t.status = 'completed';
        t.result = { processed: true };
      }
      const a = this.agents.get(task.agentId);
      if (a) a.status = 'idle';
    }, 1000);
  }

  getTask(taskId: string): AgentTask | undefined {
    return this.tasks.get(taskId);
  }

  getTasksByAgent(agentId: string): AgentTask[] {
    return Array.from(this.tasks.values()).filter(t => t.agentId === agentId);
  }
}

export const agentPool = new DefaultAgentPool();

export class AgentOrchestrator {
  private pool: AgentPool;

  constructor(pool: AgentPool = agentPool) {
    this.pool = pool;
  }

  async createAgent(role: RoleType, skills?: Skill[]): Promise<Agent> {
    const agent: Agent = {
      id: `${String(role)}-${Date.now()}`,
      name: `${String(role)} Agent`,
      role,
      status: 'idle',
      capabilities: skills?.map(s => s.id) || [],
    };
    this.pool.register(agent);
    return agent;
  }

  async runAgent(agentId: string, taskType: string, input: unknown): Promise<string> {
    const taskId = `task-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const task: AgentTask = {
      id: taskId,
      agentId,
      type: taskType,
      input,
      status: 'pending',
    };
    await this.pool.assignTask(task);
    return taskId;
  }

  async autoDiscoverAgents(skills: Skill[]): Promise<Agent[]> {
    const agents: Agent[] = [];
    const roleSkills: Record<string, Skill[]> = {};
    
    for (const skill of skills) {
      const role = this.inferRoleFromSkill(skill);
      const roleKey = String(role);
      if (!roleSkills[roleKey]) roleSkills[roleKey] = [];
      roleSkills[roleKey].push(skill);
    }

    for (const [role, roleSkillList] of Object.entries(roleSkills)) {
      const agent = await this.createAgent(role as RoleType, roleSkillList);
      agents.push(agent);
    }
    return agents;
  }

  private inferRoleFromSkill(skill: Skill): RoleType {
    const category = skill.category.toLowerCase();
    const mapping: Record<string, RoleType> = {
      planning: RoleType.PM,
      risk: RoleType.PM,
      budget: RoleType.PM,
      architecture: RoleType.TECH_LEAD,
      coding: RoleType.DEVELOPER,
      testing: RoleType.QA,
      requirements: RoleType.BA,
      stakeholder: RoleType.STAKEHOLDER,
    };
    if (category in mapping) return mapping[category];
    const tags = skill.tags || [];
    if (tags.some((t) => t.toLowerCase().includes('pm'))) return RoleType.PM;
    if (tags.some((t) => t.toLowerCase().includes('lead'))) return RoleType.TECH_LEAD;
    if (tags.some((t) => t.toLowerCase().includes('test'))) return RoleType.QA;
    return RoleType.PM;
  }
}
