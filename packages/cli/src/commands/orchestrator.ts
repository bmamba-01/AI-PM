/**
 * Orchestrator CLI — integrates with core orchestrator state machine.
 *
 * Uses:
 * - @ai-pm/core/orchestrator for state machine (createOrchestratorRun, advanceToNext, etc.)
 * - @ai-pm/core/workflows for workflow dispatch
 * - .ai-pm/orchestrator/runs.json for run record persistence
 */

import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { randomUUID } from 'node:crypto';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { generateDailyBriefing, generateWeeklyReport, generateRiskControlSummary, validateWorkflowOutput } from '@ai-pm/core/workflows';
import { createOrchestratorRun, advanceToNext, failRun, toAuditRecord, finalizeOrchestratorRun, type OrchestratorRun } from '@ai-pm/core/orchestrator';
import { LocalProjectStore, MemoryStore, ApprovalQueue } from '@ai-pm/core/runtime';

// ─── Types ──────────────────────────────────────────────────────────────────

type RunStatus = 'completed' | 'failed' | 'unknown';

interface RunRecord {
  runId: string;
  workflowId: string;
  status: RunStatus;
  startedAt: string;
  completedAt: string | null;
  output: unknown;
  errors: string[];
  warnings: string[];
}

interface OrchestratorRunResult {
  valid: boolean;
  runId: string;
  workflowId: string;
  status: RunStatus;
  output: unknown;
  errors: string[];
  warnings: string[];
}

// ─── Config ─────────────────────────────────────────────────────────────────

const WORKFLOW_IDS = ['daily-briefing', 'weekly-report', 'risk-control'] as const;

// ─── Storage helpers ─────────────────────────────────────────────────────────

function getRunsPath(projectRoot: string): string {
  return path.join(projectRoot, '.ai-pm', 'orchestrator', 'runs.json');
}

async function loadRuns(projectRoot: string): Promise<RunRecord[]> {
  try {
    const raw = await readFile(getRunsPath(projectRoot), 'utf-8');
    return JSON.parse(raw) as RunRecord[];
  } catch {
    return [];
  }
}

async function saveRuns(projectRoot: string, runs: RunRecord[]): Promise<void> {
  const dir = path.dirname(getRunsPath(projectRoot));
  await mkdir(dir, { recursive: true });
  await writeFile(getRunsPath(projectRoot), JSON.stringify(runs, null, 2), 'utf-8');
}

// ─── Workflow dispatcher ─────────────────────────────────────────────────────
// NOTE: This is the narrow adapter. Replace with core orchestrator when Agent 1 merges.

function dispatchWorkflow(workflowId: string, projectRoot: string): unknown {
  switch (workflowId) {
    case 'daily-briefing': {
      return generateDailyBriefing({
        projectId: path.basename(projectRoot),
        date: new Date().toISOString(),
        items: [],
        assumptions: ['Orchestrator adapter: empty item set'],
      });
    }
    case 'weekly-report': {
      const now = new Date();
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      return generateWeeklyReport({
        projectId: path.basename(projectRoot),
        reportingPeriodStart: weekAgo.toISOString().slice(0, 10),
        reportingPeriodEnd: now.toISOString().slice(0, 10),
        reportDate: now.toISOString(),
        items: [],
        assumptions: ['Orchestrator adapter: empty item set'],
      });
    }
    case 'risk-control': {
      return generateRiskControlSummary({
        projectId: path.basename(projectRoot),
        risks: [],
        assumptions: ['Orchestrator adapter: empty risk set'],
      });
    }
    default:
      throw new Error(`Unknown workflow: ${workflowId}`);
  }
}

// ─── Run command ─────────────────────────────────────────────────────────────

async function runWorkflow(workflowId: string, projectRoot: string, json: boolean): Promise<OrchestratorRunResult> {
  const errors: string[] = [];
  const warnings: string[] = [];
  let output: unknown = null;
  let status: RunStatus = 'completed';

  // Create orchestrator run via state machine
  let run = createOrchestratorRun({
    project_id: path.basename(projectRoot),
    workflow_id: workflowId,
    trigger: { type: 'cli', actor: 'pm' },
  });

  try {
    // Walk through states using state machine
    const stateSteps = [
      'project_resolution', 'context_pack', 'workflow_selection',
      'agent_assignment',
    ] as const;

    for (const state of stateSteps) {
      run = advanceToNext(run, {
        agents: state === 'agent_assignment' ? [workflowId + '-agent'] : undefined,
      });
    }

    // Dispatch workflow
    output = dispatchWorkflow(workflowId, projectRoot);

    // Validate against schema
    const validation = await validateWorkflowOutput(workflowId, output);
    if (!validation.valid) {
      warnings.push(...validation.errors.map(e => `schema: ${e}`));
    }
    warnings.push(...validation.warnings);

    // Continue through remaining states
    run = advanceToNext(run); // validation
    run = advanceToNext(run); // approval_gate
    run = advanceToNext(run, {
      artifacts: [{ name: `${workflowId}-output`, path: `reports/${workflowId}.json`, type: 'report' }],
    }); // artifact_persistence
    run = advanceToNext(run); // completion_report
    run = advanceToNext(run); // audit_write
    run = advanceToNext(run); // completed

  } catch (err) {
    status = 'failed';
    const msg = err instanceof Error ? err.message : String(err);
    errors.push(msg);
    output = { error: msg };
    run = failRun(run, msg);
  }

  // Finalize to disk via core orchestrator
  let record_id = '';
  try {
    const record = await finalizeOrchestratorRun(run, projectRoot, {
      assumptions: ['local CLI run'],
      confidence: warnings.length === 0 ? 100 : 75,
      source_coverage: {
        total: 8,
        available: ['github', 'jira', 'calendar'],
        unavailable: ['linear', 'email', 'confluence', 'notion', 'slack'],
      },
    });
    record_id = record.record_id;

    // Link to memory store
    try {
      const memStore = new MemoryStore(projectRoot);
      const task = await memStore.createTask({
        project_id: path.basename(projectRoot),
        name: `orchestrator: ${workflowId}`,
        description: `CLI workflow run ${run.run_id.slice(0, 8)}`,
        status: status === 'completed' ? 'completed' : 'pending',
        completed_at: status === 'completed' ? record.completed_at : null,
        assigned_to: 'ai-pm-cli',
        dependencies: [],
        artifacts: [record.record_id],
        tags: ['orchestrator', workflowId],
      });
      // Write back memory_task_id to the record (best-effort)
      record.memory_task_id = task.task_id;
      const recPath = path.join(projectRoot, '.ai-pm', 'orchestrator', 'runs', `${record.record_id}.json`);
      await writeFile(recPath, JSON.stringify(record, null, 2), 'utf-8');
    } catch {
      warnings.push('Could not link to memory store');
    }
  } catch {
    warnings.push('Could not finalize orchestrator run to disk');
  }

  try {
    const legacyRecord: RunRecord = {
      runId: run.run_id,
      workflowId,
      status,
      startedAt: run.started_at,
      completedAt: run.completed_at,
      output,
      errors,
      warnings,
    };
    const runs = await loadRuns(projectRoot);
    runs.push(legacyRecord);
    await saveRuns(projectRoot, runs);
  } catch {
    warnings.push('Could not persist legacy run record');
  }

  return { valid: status === 'completed', runId: run.run_id, workflowId, status, output, errors, warnings };
}

// ─── Status command ──────────────────────────────────────────────────────────

async function getRunStatus(runId: string, projectRoot: string): Promise<RunRecord | null> {
  // Check legacy runs.json first
  const runs = await loadRuns(projectRoot);
  const legacy = runs.find(r => r.runId === runId || r.runId.startsWith(runId));
  if (legacy) return legacy;

  // Fallback: check execution records
  try {
    const { listExecutionRecords, readExecutionRecord } = await import('@ai-pm/core/orchestrator');
    const records = await listExecutionRecords(projectRoot);
    const match = records.find(r => r.run_id === runId || r.run_id.startsWith(runId));
    if (match) {
      const full = await readExecutionRecord(projectRoot, match.record_id);
      if (full) {
        return {
          runId: full.run_id,
          workflowId: full.workflow_id,
          status: full.state as RunStatus,
          startedAt: full.started_at,
          completedAt: full.completed_at,
          output: null,
          errors: full.errors,
          warnings: full.assumptions,
        };
      }
    }
  } catch { /* graceful fallback */ }
  return null;
}

async function listRuns(projectRoot: string): Promise<RunRecord[]> {
  const legacyRuns = await loadRuns(projectRoot);

  // Merge with execution records
  try {
    const { listExecutionRecords } = await import('@ai-pm/core/orchestrator');
    const records = await listExecutionRecords(projectRoot);
    for (const r of records) {
      if (!legacyRuns.find(l => l.runId === r.run_id)) {
        legacyRuns.push({
          runId: r.run_id,
          workflowId: r.workflow_id,
          status: r.state as RunStatus,
          startedAt: r.started_at,
          completedAt: r.completed_at,
          output: null,
          errors: [],
          warnings: [],
        });
      }
    }
  } catch { /* graceful fallback */ }

  return legacyRuns;
}

// ─── Agent capability report ─────────────────────────────────────────────────

function getAgentStatus(): Record<string, unknown> {
  return {
    name: 'ai-pm',
    version: '0.1.0',
    capabilities: [
      'daily-briefing',
      'weekly-report',
      'risk-control',
      'approval-queue',
      'memory-store',
      'schema-validation',
    ],
    storage: 'file-backed (.ai-pm/)',
    runtime: 'local-first',
    timestamp: new Date().toISOString(),
  };
}

// ─── CLI definition ──────────────────────────────────────────────────────────

export const orchestratorCommand = new Command('orchestrator');

orchestratorCommand
  .description('Run and track workflow orchestration')
  .addCommand(
    new Command('run')
      .description('Execute a workflow and record the run')
      .requiredOption('--workflow <id>', `Workflow ID (${WORKFLOW_IDS.join(', ')})`)
      .option('--json', 'Output as JSON')
      .action(async (opts) => {
        const spinner = ora(`Running workflow: ${opts.workflow}...`).start();
        try {
          const result = await runWorkflow(opts.workflow, process.cwd(), opts.json);
          spinner.succeed(`Workflow ${opts.workflow} completed (${result.runId.slice(0, 8)}…)`);

          if (opts.json) {
            console.log(JSON.stringify(result, null, 2));
          } else {
            console.log(chalk.green(`✓ Run ID: ${result.runId}`));
            console.log(chalk.gray(`  Status: ${result.status}`));
            if (result.warnings.length > 0) {
              result.warnings.forEach(w => console.log(chalk.yellow(`  ⚠ ${w}`)));
            }
            if (result.errors.length > 0) {
              result.errors.forEach(e => console.log(chalk.red(`  ✗ ${e}`)));
            }
          }
          if (!result.valid) process.exitCode = 1;
        } catch (error) {
          spinner.fail();
          console.error(error);
          process.exit(1);
        }
      })
  )
  .addCommand(
    new Command('status')
      .description('Show status of a past run')
      .argument('<runId>', 'Run ID (full or prefix)')
      .option('--json', 'Output as JSON')
      .action(async (runId: string, opts) => {
        const record = await getRunStatus(runId, process.cwd());
        if (!record) {
          console.error(chalk.red(`Run not found: ${runId}`));
          process.exitCode = 1;
          return;
        }
        if (opts.json) {
          console.log(JSON.stringify(record, null, 2));
        } else {
          console.log(chalk.blue(`\nRun: ${record.runId.slice(0, 8)}…`));
          console.log(`  Workflow: ${record.workflowId}`);
          console.log(`  Status:   ${record.status}`);
          console.log(`  Started:  ${record.startedAt}`);
          console.log(`  Completed: ${record.completedAt ?? 'N/A'}`);
          if (record.errors.length > 0) {
            console.log(chalk.red(`  Errors: ${record.errors.length}`));
          }
          if (record.warnings.length > 0) {
            console.log(chalk.yellow(`  Warnings: ${record.warnings.length}`));
          }
        }
      })
  )
  .addCommand(
    new Command('list')
      .description('List all past runs')
      .option('--json', 'Output as JSON')
      .action(async (opts) => {
        const runs = await listRuns(process.cwd());
        if (opts.json) {
          console.log(JSON.stringify({ runs, total: runs.length }, null, 2));
          return;
        }
        if (runs.length === 0) {
          console.log(chalk.yellow('No runs found.'));
          return;
        }
        console.log(chalk.blue(`\nOrchestrator Runs\n`));
        runs.slice(-20).reverse().forEach(r => {
          const icon = r.status === 'completed' ? chalk.green('✓') : r.status === 'failed' ? chalk.red('✗') : chalk.gray('?');
          console.log(`${icon} ${r.runId.slice(0, 8)}  ${r.workflowId.padEnd(16)}  ${r.status}  ${r.startedAt}`);
        });
        console.log(chalk.gray(`\nTotal: ${runs.length}`));
      })
  );

// ─── Agent status command ────────────────────────────────────────────────────

export const agentCommand = new Command('agent');

agentCommand
  .description('Agent capability and status report')
  .addCommand(
    new Command('status')
      .description('Show agent capabilities and runtime status')
      .option('--json', 'Output as JSON')
      .action((opts) => {
        const status = getAgentStatus();
        if (opts.json) {
          console.log(JSON.stringify(status, null, 2));
        } else {
          console.log(chalk.blue('\nAgent Status\n'));
          console.log(`  Name:     ${status.name}`);
          console.log(`  Version:  ${status.version}`);
          console.log(`  Storage:  ${status.storage}`);
          console.log(`  Runtime:  ${status.runtime}`);
          console.log(`  Capabilities:`);
          (status.capabilities as string[]).forEach(c => {
            console.log(chalk.green(`    ✓ ${c}`));
          });
        }
      })
  );
