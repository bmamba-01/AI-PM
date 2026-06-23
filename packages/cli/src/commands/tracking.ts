import path from 'node:path';
import { Command } from 'commander';
import chalk from 'chalk';
import { loadProfile } from '@ai-pm/core/runtime';
import {
  type TrackingSystem,
  type TrackingMode,
  type TaskStatus,
  type TrackingConfig,
  type TrackingTask,
  type TrackingAdapter,
  type TaskLifecycleState,
  type CompletionPayload,
  type CreateLifecycleTaskInput,
  resolveTrackingAdapter,
  getTrackingConfig,
  createLifecycleTask,
  completeLifecycleTask,
  verifyCompletion,
} from '@ai-pm/core/tracking';

const VALID_TASK_STATUSES: TaskStatus[] = ['ready', 'in_progress', 'blocked', 'done', 'cancelled'];

function emitJson(payload: unknown): void {
  console.log(JSON.stringify(payload, null, 2));
}

function emitError(json: boolean, code: string, message: string): void {
  if (json) {
    emitJson({ error: { code, message } });
  } else {
    console.error(chalk.red(`Error: ${message}`));
  }
  process.exitCode = 1;
}

function resolveProjectId(profileResult: Awaited<ReturnType<typeof loadProfile>>, cwd: string): string {
  const projectId = profileResult.profile.project.project_id;
  return projectId && projectId !== 'unknown' ? projectId : path.basename(cwd);
}

function toLifecycleState(task: TrackingTask, config: TrackingConfig): TaskLifecycleState {
  return {
    tracking_tool: config.system,
    tracking_mode: config.mode,
    external_task_id: task.external_task_id,
    external_task_url: task.external_task_url,
    local_memory_task_id: task.local_memory_task_id,
    status: task.status,
    created_at: task.created_at,
    completed_at: task.status === 'done' ? task.updated_at : null,
    dry_run_only: config.mode === 'dry_run' || config.mode === 'local_import',
    completion_payload: null,
  };
}

async function resolveTrackingContext(projectRoot: string) {
  const profileResult = await loadProfile(projectRoot);
  const config = getTrackingConfig(profileResult.profile as object);
  const adapter = resolveTrackingAdapter(profileResult.profile as object, projectRoot);
  const projectId = resolveProjectId(profileResult, projectRoot);

  return {
    projectRoot,
    profileResult,
    config,
    adapter,
    projectId,
  };
}

export function createTrackingCommand(): Command {
  const command = new Command('tracking');

  command.description('Resolve and update project tracker tasks');

  command.addCommand(
    new Command('resolve')
      .description('Resolve the active project tracking configuration')
      .option('--path <dir>', 'Project root', process.cwd())
      .option('--json', 'Output as JSON', false)
      .action(async (opts) => {
        const context = await resolveTrackingContext(path.resolve(opts.path));
        const payload = {
          project_root: context.projectRoot,
          project_id: context.projectId,
          profile_valid: context.profileResult.valid,
          profile_errors: context.profileResult.errors,
          tracking: context.config,
          adapter: {
            adapter_id: context.adapter.adapter_id,
            mode: context.adapter.mode,
          },
        };

        if (opts.json) {
          emitJson(payload);
          return;
        }

        console.log(chalk.blue('\nTracking\n'));
        console.log(`  Project:   ${payload.project_id}`);
        console.log(`  Config:    ${payload.tracking.system} (${payload.tracking.mode})`);
        console.log(`  Adapter:   ${payload.adapter.adapter_id} (${payload.adapter.mode})`);
        if (!payload.profile_valid && payload.profile_errors.length > 0) {
          payload.profile_errors.forEach(error => console.log(chalk.yellow(`  Warning: ${error}`)));
        }
      }),
  );

  command.addCommand(
    new Command('create')
      .description('Create a tracked task for delegation')
      .requiredOption('--title <title>', 'Task title')
      .requiredOption('--agent <agent>', 'Assigned agent id')
      .requiredOption('--workflow <workflow>', 'Workflow id')
      .option('--description <description>', 'Task description', '')
      .option('--priority <priority>', 'Task priority', 'medium')
      .option('--path <dir>', 'Project root', process.cwd())
      .option('--json', 'Output as JSON', false)
      .action(async (opts) => {
        const priority = opts.priority as TrackingTask['priority'];
        if (!['critical', 'high', 'medium', 'low'].includes(priority)) {
          emitError(opts.json, 'INVALID_PRIORITY', `Invalid priority "${opts.priority}".`);
          return;
        }

        const context = await resolveTrackingContext(path.resolve(opts.path));
        const input: CreateLifecycleTaskInput = {
          project_id: context.projectId,
          title: opts.title,
          description: opts.description || '',
          assigned_agent: opts.agent,
          workflow_id: opts.workflow,
          priority,
        };
        const result = await createLifecycleTask(context.adapter, context.config, input);

        const payload = {
          action: 'create',
          project_id: context.projectId,
          tracking: {
            system: context.config.system,
            mode: context.config.mode,
            adapter_id: context.adapter.adapter_id,
          },
          task: result.tracking_task,
          lifecycle: result.state,
        };

        if (opts.json) {
          emitJson(payload);
          return;
        }

        console.log(chalk.green(`Created tracked task ${result.tracking_task.external_task_id}`));
        console.log(`  Title:    ${result.tracking_task.title}`);
        console.log(`  Agent:    ${result.tracking_task.assigned_agent}`);
        console.log(`  Workflow: ${result.tracking_task.workflow_id}`);
      }),
  );

  command.addCommand(
    new Command('complete')
      .description('Mark a tracked task complete or blocked')
      .argument('<external_task_id>', 'External task id')
      .requiredOption('--status <status>', `Task status (${VALID_TASK_STATUSES.join(', ')})`)
      .option('--summary <summary>', 'Completion summary')
      .option('--report <path>', 'Report or artifact path')
      .option('--path <dir>', 'Project root', process.cwd())
      .option('--json', 'Output as JSON', false)
      .action(async (externalTaskId: string, opts) => {
        const status = opts.status as TaskStatus;
        if (!VALID_TASK_STATUSES.includes(status)) {
          emitError(opts.json, 'INVALID_STATUS', `Invalid tracking status "${opts.status}".`);
          return;
        }

        const context = await resolveTrackingContext(path.resolve(opts.path));
        const task = await context.adapter.getTask(externalTaskId);
        if (!task) {
          emitError(opts.json, 'TASK_NOT_FOUND', `Tracked task not found: ${externalTaskId}`);
          return;
        }

        const currentState = toLifecycleState(task, context.config);
        const evidenceRefs = opts.report ? [opts.report] : [];
        const completed = await completeLifecycleTask(
          context.adapter,
          context.config,
          currentState,
          {
            external_task_id: externalTaskId,
            status,
            summary: opts.summary,
            evidence_refs: evidenceRefs,
          },
        );

        const payload = {
          action: 'complete',
          project_id: context.projectId,
          tracking: {
            system: context.config.system,
            mode: context.config.mode,
            adapter_id: context.adapter.adapter_id,
          },
          completion: completed.completion_payload,
          verification: completed.verification,
          lifecycle: completed.state,
        };

        if (opts.json) {
          emitJson(payload);
          return;
        }

        console.log(chalk.green(`Updated tracked task ${externalTaskId}`));
        console.log(`  Status:   ${completed.completion_payload.status_after_update}`);
        console.log(`  Result:   ${completed.completion_payload.result}`);
      }),
  );

  command.addCommand(
    new Command('verify')
      .description('Verify tracked task completion state')
      .argument('<external_task_id>', 'External task id')
      .option('--path <dir>', 'Project root', process.cwd())
      .option('--json', 'Output as JSON', false)
      .action(async (externalTaskId: string, opts) => {
        const context = await resolveTrackingContext(path.resolve(opts.path));
        const verification = await verifyCompletion(context.adapter, externalTaskId);
        const task = await context.adapter.getTask(externalTaskId);
        const payload = {
          action: 'verify',
          project_id: context.projectId,
          external_task_id: externalTaskId,
          verified: verification.verified,
          evidence: verification.evidence,
          task,
        };

        if (opts.json) {
          emitJson(payload);
          return;
        }

        const header = verification.verified ? chalk.green('Verified') : chalk.yellow('Not verified');
        console.log(`${header}: ${externalTaskId}`);
        verification.evidence.forEach((line: string) => console.log(`  ${line}`));
      }),
  );

  return command;
}

export const trackingCommand = createTrackingCommand();
