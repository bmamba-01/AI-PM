import { readFile } from 'node:fs/promises';
import path from 'node:path';
import type { ApprovalStatus } from '../runtime/approvalQueue.js';
import { loadProfile } from '../runtime/projectProfile.js';
import type { TrackingSystem } from '../tracking/types.js';
import type { Skill } from './loader.js';

export type SkillOwner = 'orchestrator' | 'shared' | 'agent';

export interface SkillRuntimeBinding {
  skill_id: string;
  task_id: string;
  title: string;
  status: string;
  project_id: string;
  tracking_tool: TrackingSystem;
  external_task_id: string;
  external_task_url: string;
  assigned_agent: string;
  workflow_id: string;
}

export interface SkillRuntimeApproval {
  approval_id: string;
  status: ApprovalStatus;
  target_id: string;
}

export interface SkillRuntimeSnapshot {
  project_id: string;
  tracking_tool: TrackingSystem | '';
  tasks: SkillRuntimeBinding[];
  approvals: SkillRuntimeApproval[];
}

export interface SkillTaskStatus extends SkillRuntimeBinding {
  pending_approval_count: number;
}

export interface SkillStatusRecord {
  skill_id: string;
  owner: SkillOwner;
  category: string;
  project_id: string;
  tracking_tool: TrackingSystem | '';
  active_task_count: number;
  pending_approval_count: number;
  tasks: SkillTaskStatus[];
  name: string;
  description: string;
  version: string;
  tags: string[];
}

export interface SkillsReadModel {
  project_id: string;
  tracking_tool: TrackingSystem | '';
  generated_at: string;
  skills: SkillStatusRecord[];
  warnings: string[];
}

export interface BuildSkillsReadModelOptions {
  projectRoot?: string;
  skills: Skill[];
  runtime?: Partial<SkillRuntimeSnapshot>;
}

const ACTIVE_TASK_STATUSES = new Set(['ready', 'pending', 'in_progress', 'blocked']);

export async function buildSkillsReadModel(
  options: BuildSkillsReadModelOptions,
): Promise<SkillsReadModel> {
  const warnings: string[] = [];
  const runtime = await resolveRuntimeSnapshot(options.projectRoot, options.runtime, warnings);
  const approvalsByTarget = indexApprovalsByTarget(runtime.approvals);

  const skills = [...options.skills]
    .sort((a, b) => a.id.localeCompare(b.id))
    .map(skill => {
      const skillTasks = runtime.tasks
        .filter(task => task.skill_id === skill.id)
        .sort((a, b) => a.task_id.localeCompare(b.task_id))
        .map(task => {
          const pendingApprovalCount = countPendingApprovals(task, approvalsByTarget);
          return {
            ...task,
            pending_approval_count: pendingApprovalCount,
          };
        });

      return {
        skill_id: skill.id,
        owner: normalizeSkillOwner(skill.owner),
        category: skill.category,
        project_id: runtime.project_id,
        tracking_tool: runtime.tracking_tool,
        active_task_count: skillTasks.filter(task => ACTIVE_TASK_STATUSES.has(task.status)).length,
        pending_approval_count: skillTasks.reduce((sum, task) => sum + task.pending_approval_count, 0),
        tasks: skillTasks,
        name: skill.name,
        description: skill.description,
        version: skill.version,
        tags: [...skill.tags].sort((a, b) => a.localeCompare(b)),
      } satisfies SkillStatusRecord;
    });

  if (runtime.tasks.length === 0) {
    warnings.push('Skill runtime task bindings are unavailable; task lists are empty.');
  }

  return {
    project_id: runtime.project_id,
    tracking_tool: runtime.tracking_tool,
    generated_at: new Date().toISOString(),
    skills,
    warnings,
  };
}

function normalizeSkillOwner(owner: Skill['owner']): SkillOwner {
  if (owner === 'orchestrator' || owner === 'shared' || owner === 'agent') {
    return owner;
  }
  return 'shared';
}

function indexApprovalsByTarget(
  approvals: SkillRuntimeApproval[],
): Map<string, SkillRuntimeApproval[]> {
  const map = new Map<string, SkillRuntimeApproval[]>();
  for (const approval of approvals) {
    const items = map.get(approval.target_id) ?? [];
    items.push(approval);
    map.set(approval.target_id, items);
  }
  return map;
}

function countPendingApprovals(
  task: SkillRuntimeBinding,
  approvalsByTarget: Map<string, SkillRuntimeApproval[]>,
): number {
  const linked = [
    ...(approvalsByTarget.get(task.task_id) ?? []),
    ...(task.external_task_id ? approvalsByTarget.get(task.external_task_id) ?? [] : []),
  ];
  return linked.filter(approval => approval.status === 'pending').length;
}

async function resolveRuntimeSnapshot(
  projectRoot: string | undefined,
  runtime: Partial<SkillRuntimeSnapshot> | undefined,
  warnings: string[],
): Promise<SkillRuntimeSnapshot> {
  const profileScope = projectRoot ? await loadProjectScope(projectRoot, warnings) : undefined;
  const project_id = runtime?.project_id ?? profileScope?.project_id ?? '';
  const tracking_tool = runtime?.tracking_tool ?? profileScope?.tracking_tool ?? '';
  const tasks = runtime?.tasks ?? [];
  const approvals = runtime?.approvals ?? (projectRoot ? await loadRuntimeApprovals(projectRoot, warnings) : []);

  return {
    project_id,
    tracking_tool,
    tasks,
    approvals,
  };
}

async function loadProjectScope(
  projectRoot: string,
  warnings: string[],
): Promise<{ project_id: string; tracking_tool: TrackingSystem | '' }> {
  const profile = await loadProfile(projectRoot);
  if (!profile.valid && profile.errors.length > 0) {
    warnings.push(...profile.errors.map(error => `Project profile: ${error}`));
  }

  return {
    project_id: profile.profile.project.project_id ?? '',
    tracking_tool: profile.profile.tracking?.system ?? '',
  };
}

async function loadRuntimeApprovals(
  projectRoot: string,
  warnings: string[],
): Promise<SkillRuntimeApproval[]> {
  const approvalsPath = path.join(projectRoot, '.ai-pm', 'approvals.json');
  try {
    const raw = await readFile(approvalsPath, 'utf-8');
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      warnings.push('Approval queue data is invalid; approval counts default to empty.');
      return [];
    }

    return parsed
      .filter(item => item && typeof item === 'object')
      .map(item => {
        const candidate = item as Record<string, unknown>;
        return {
          approval_id: typeof candidate.approval_id === 'string' ? candidate.approval_id : '',
          status: (typeof candidate.status === 'string' ? candidate.status : 'pending') as ApprovalStatus,
          target_id: typeof candidate.target_id === 'string' ? candidate.target_id : '',
        } satisfies SkillRuntimeApproval;
      })
      .filter(item => item.approval_id !== '' && item.target_id !== '');
  } catch (error: unknown) {
    const nodeError = error as NodeJS.ErrnoException;
    if (nodeError.code !== 'ENOENT') {
      warnings.push('Approval queue data is unreadable; approval counts default to empty.');
    }
    return [];
  }
}
