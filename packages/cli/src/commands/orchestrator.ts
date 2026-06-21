/**
 * Orchestrator CLI — narrow adapter over existing workflow functions.
 *
 * INTEGRATION ASSUMPTIONS (Agent 1 not yet merged):
 * - No dedicated orchestrator state machine in core.
 * - Run records stored in .ai-pm/orchestrator/runs.json (file-backed).
 * - Workflow dispatch is a simple map to existing generate* functions.
 * - Once Agent 1 merges, replace the dispatch map with core orchestrator calls.
 */

import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { randomUUID } from 'node:crypto';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { generateDailyBriefing, generateWeeklyReport, generateRiskControlSummary, validateWorkflowOutput } from '@ai-pm/core/workflows';
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
  const runId = randomUUID();
  const startedAt = new Date().toISOString();
  const errors: string[] = [];
  const warnings: string[] = [];
  let output: unknown = null;
  let status: RunStatus = 'completed';

  try {
    output = dispatchWorkflow(workflowId, projectRoot);

    // Validate against schema if available
    // NOTE: Adapter-generated output may not fully satisfy schemas (empty items).
    // Validation issues are recorded as warnings, not failures, until Agent 1
    // replaces this with the real orchestrator that produces schema-compliant output.
    const validation = await validateWorkflowOutput(workflowId, output);
    if (!validation.valid) {
      warnings.push(...validation.errors.map(e => `schema: ${e}`));
    }
    warnings.push(...validation.warnings);
  } catch (err) {
    status = 'failed';
    const msg = err instanceof Error ? err.message : String(err);
    errors.push(msg);
    output = { error: msg };
  }

  const completedAt = new Date().toISOString();
  const record: RunRecord = {
    runId,
    workflowId,
    status,
    startedAt,
    completedAt,
    output,
    errors,
    warnings,
  };

  // Persist run record (best-effort, degrade gracefully)
  try {
    const runs = await loadRuns(projectRoot);
    runs.push(record);
    await saveRuns(projectRoot, runs);
  } catch {
    warnings.push('Could not persist run record (missing .ai-pm directory?)');
  }

  return { valid: status === 'completed', runId, workflowId, status, output, errors, warnings };
}

// ─── Status command ──────────────────────────────────────────────────────────

async function getRunStatus(runId: string, projectRoot: string): Promise<RunRecord | null> {
  const runs = await loadRuns(projectRoot);
  return runs.find(r => r.runId === runId || r.runId.startsWith(runId)) ?? null;
}

async function listRuns(projectRoot: string): Promise<RunRecord[]> {
  return loadRuns(projectRoot);
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
