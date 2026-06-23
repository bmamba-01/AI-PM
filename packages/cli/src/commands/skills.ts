import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { Command } from 'commander';
import chalk from 'chalk';
import { SkillLoader, SkillRegistry, type SkillRuntimeBinding } from '@ai-pm/core/skills';

interface TrackingFixtureTask {
  task_id: string;
  project_id: string;
  assigned_agent: string;
  workflow_id: string;
  status: string;
  external_task_id: string;
  external_task_url: string;
  tracking?: { tool?: string };
  skill_required?: {
    orchestrator_create?: string;
    agent_complete?: string;
  };
  verification?: { verified?: boolean };
}

function emitJson(payload: unknown): void {
  console.log(JSON.stringify(payload, null, 2));
}

function repoSkillSearchPaths(repoRoot: string): string[] {
  return [
    path.join(repoRoot, '.ai-pm-skills'),
  ];
}

async function loadRegistry(repoRoot: string): Promise<SkillRegistry> {
  const loader = new SkillLoader(repoSkillSearchPaths(repoRoot));
  const registry = new SkillRegistry();
  registry.registerAll(await loader.loadSkills());
  return registry;
}

async function readTrackingBindings(projectRoot: string): Promise<SkillRuntimeBinding[]> {
  const tasksPath = path.join(projectRoot, '.ai-pm', 'tracking', 'tasks.json');
  try {
    const parsed = JSON.parse(await readFile(tasksPath, 'utf-8'));
    if (!Array.isArray(parsed)) return [];
    return parsed.flatMap(toBindingsFromTask);
  } catch {
    return [];
  }
}

function toBindingsFromTask(task: TrackingFixtureTask): SkillRuntimeBinding[] {
  const trackingTool = normalizeTrackingTool(task.tracking?.tool);
  const base = {
    task_id: task.task_id,
    title: task.task_id,
    status: task.status,
    project_id: task.project_id,
    tracking_tool: trackingTool,
    external_task_id: task.external_task_id,
    external_task_url: task.external_task_url,
    assigned_agent: task.assigned_agent,
    workflow_id: task.workflow_id,
  } satisfies Omit<SkillRuntimeBinding, 'skill_id'>;

  const skillIds = new Set<string>([
    'tracking.resolve_project_tracker',
    'tracking.sync_local_mirror',
  ]);

  if (task.skill_required?.orchestrator_create) {
    skillIds.add(task.skill_required.orchestrator_create);
    skillIds.add('tracking.prepare_agent_contract');
  }
  if (task.skill_required?.agent_complete) {
    skillIds.add(task.skill_required.agent_complete);
  }
  if (task.status === 'blocked') {
    skillIds.add('tracking.block_task');
  }
  if (task.verification?.verified) {
    skillIds.add('tracking.verify_completion');
  }

  return [...skillIds].map(skill_id => ({
    skill_id,
    ...base,
  }));
}

function normalizeTrackingTool(tool: string | undefined): SkillRuntimeBinding['tracking_tool'] {
  switch (tool) {
    case 'notion':
    case 'jira':
    case 'linear':
    case 'github':
    case 'excel':
    case 'local_memory':
      return tool;
    default:
      return 'local_memory';
  }
}

function printSkillsList(skills: ReturnType<SkillRegistry['getAll']>): void {
  if (skills.length === 0) {
    console.log(chalk.yellow('No skills found.'));
    return;
  }
  console.log(chalk.blue('\nSkills\n'));
  for (const skill of skills) {
    console.log(`${chalk.green(skill.id)}  ${skill.owner ?? 'shared'}  ${skill.category}`);
    console.log(chalk.gray(`  ${skill.description}`));
  }
}

export const skillsCommand = new Command('skills');

skillsCommand
  .description('Inspect packaged runtime skills and project skill status')
  .addCommand(
    new Command('list')
      .description('List packaged skills')
      .option('--path <dir>', 'Project root for context', process.cwd())
      .option('--json', 'Output as JSON', false)
      .action(async (opts) => {
        const projectRoot = path.resolve(opts.path);
        const registry = await loadRegistry(process.cwd());
        const skills = registry.getAll().sort((a, b) => a.id.localeCompare(b.id));
        const payload = {
          project_root: projectRoot,
          total: skills.length,
          skills,
        };

        if (opts.json) {
          emitJson(payload);
          return;
        }
        printSkillsList(skills);
      }),
  )
  .addCommand(
    new Command('show')
      .description('Show one packaged skill')
      .argument('<skill_id>', 'Skill id')
      .option('--path <dir>', 'Project root for context', process.cwd())
      .option('--json', 'Output as JSON', false)
      .action(async (skillId: string, opts) => {
        const registry = await loadRegistry(process.cwd());
        const skill = registry.get(skillId);
        if (!skill) {
          if (opts.json) {
            emitJson({ error: { code: 'SKILL_NOT_FOUND', message: `Skill not found: ${skillId}` } });
          } else {
            console.error(chalk.red(`Skill not found: ${skillId}`));
          }
          process.exitCode = 1;
          return;
        }

        const bindings = await readTrackingBindings(path.resolve(opts.path));
        const model = await registry.buildReadModel({
          projectRoot: path.resolve(opts.path),
          runtime: { tasks: bindings },
        });
        const status = model.skills.find(entry => entry.skill_id === skillId) ?? null;
        const payload = { skill, status, warnings: model.warnings };

        if (opts.json) {
          emitJson(payload);
          return;
        }

        console.log(chalk.blue(`\n${skill.id}\n`));
        console.log(`  Owner:       ${skill.owner ?? 'shared'}`);
        console.log(`  Category:    ${skill.category}`);
        console.log(`  Version:     ${skill.version}`);
        console.log(`  Description: ${skill.description}`);
        if (status) {
          console.log(`  Active:      ${status.active_task_count}`);
          console.log(`  Pending approvals: ${status.pending_approval_count}`);
        }
      }),
  )
  .addCommand(
    new Command('status')
      .description('Show project skill status and tracker bindings')
      .option('--path <dir>', 'Project root', process.cwd())
      .option('--json', 'Output as JSON', false)
      .action(async (opts) => {
        const projectRoot = path.resolve(opts.path);
        const registry = await loadRegistry(process.cwd());
        const bindings = await readTrackingBindings(projectRoot);
        const model = await registry.buildReadModel({
          projectRoot,
          runtime: { tasks: bindings },
        });

        if (opts.json) {
          emitJson(model);
          return;
        }

        console.log(chalk.blue('\nSkill Status\n'));
        console.log(`  Project: ${model.project_id || '(unknown)'}`);
        console.log(`  Tracker: ${model.tracking_tool || '(unknown)'}`);
        for (const skill of model.skills) {
          console.log(`${chalk.green(skill.skill_id)}  active=${skill.active_task_count}  approvals=${skill.pending_approval_count}`);
        }
        if (model.warnings.length > 0) {
          console.log(chalk.yellow('\nWarnings:'));
          for (const warning of model.warnings) {
            console.log(`  - ${warning}`);
          }
        }
      }),
  );
