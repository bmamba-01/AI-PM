import { Command } from 'commander';
import chalk from 'chalk';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import {
  buildTraceabilityMatrix,
  requiresScopeApproval,
  persistTraceabilityArtifact,
  type TraceabilityInput,
} from '@ai-pm/core/workflows';
import { MemoryStore, ApprovalQueue } from '@ai-pm/core/runtime';
import { table } from 'table';

export const traceabilityCommand = new Command('traceability');
traceabilityCommand.description('Scope traceability — build requirement traceability matrices');

// ─── traceability build ────────────────────────────────────────────────────

traceabilityCommand
  .addCommand(
    new Command('build')
      .description('Build a traceability matrix from a requirements JSON file')
      .requiredOption('--input <file>', 'Path to requirements JSON file')
      .option('--json', 'Output as JSON', false)
      .option('--baseline <id>', 'Baseline identifier for scope change tracking')
      .option('--persist', 'Persist result as artifact in MemoryStore', false)
      .action(async (opts) => {
        const projectRoot = process.cwd();
        const inputPath = path.resolve(projectRoot, opts.input);

        let raw: string;
        try {
          raw = await readFile(inputPath, 'utf-8');
        } catch (error) {
          console.error(chalk.red(`Cannot read input file: ${inputPath}`));
          process.exit(1);
        }

        let parsed: TraceabilityInput;
        try {
          const data = JSON.parse(raw);
          parsed = {
            projectId: data.projectId ?? path.basename(projectRoot),
            requirements: data.requirements ?? [],
            baselineId: opts.baseline ?? data.baselineId ?? undefined,
            sourceCoverage: data.sourceCoverage,
            assumptions: data.assumptions,
          };
        } catch (error) {
          console.error(chalk.red('Invalid JSON in input file'));
          process.exit(1);
        }

        if (parsed.requirements.length === 0) {
          console.log(chalk.yellow('No requirements found in input.'));
          process.exit(0);
        }

        const matrix = buildTraceabilityMatrix(parsed);

        // Persist artifact if requested
        if (opts.persist) {
          try {
            const store = new MemoryStore(projectRoot);
            await persistTraceabilityArtifact(store, matrix);
            console.log(chalk.gray('Artifact persisted to memory store'));
          } catch {
            console.log(chalk.yellow('Could not persist artifact (memory store unavailable)'));
          }
        }

        // Queue approval only for scope baseline changes (read-only matrix otherwise)
        if (requiresScopeApproval(parsed)) {
          try {
            const queue = new ApprovalQueue(projectRoot);
            await queue.createItem({
              project_id: parsed.projectId,
              action_type: 'scope_baseline_change',
              target_system: 'local_file',
              target_id: matrix.baselineId ?? 'unknown',
              workflow_id: 'scope-traceability',
              run_id: `trace-${Date.now()}`,
              requested_by_agent: 'cli-user',
              requested_by_role: 'pm_commander',
              title: `Scope baseline change: ${matrix.baselineId ?? 'new baseline'}`,
              description: `Traceability matrix built for ${parsed.requirements.length} requirements with baseline ${matrix.baselineId}`,
              summary_diff: `Baseline ${matrix.baselineId}: ${parsed.requirements.length} requirements, ${matrix.summary.gapCount} gaps, ${matrix.summary.coveragePercent}% coverage`,
              confidence: matrix.confidence,
              source_refs: [{ type: 'file', id: opts.input, title: path.basename(opts.input) }],
              priority: 'high',
              deadline: null,
              ttl_seconds: null,
              assigned_approvers: [],
            });
            console.log(chalk.blue('Approval queued for scope baseline change'));
          } catch {
            // Non-blocking — matrix generation is read-only
          }
        }

        // Output
        if (opts.json) {
          console.log(JSON.stringify(matrix, null, 2));
          return;
        }

        console.log(chalk.bold.blue(`\nTraceability Matrix — ${matrix.projectId}`));
        console.log(chalk.gray(`Baseline: ${matrix.baselineId ?? '(none)'}`));
        console.log(chalk.gray(`Generated: ${matrix.generatedAt}\n`));

        // Summary
        console.log(chalk.bold('Summary'));
        console.log(`  Requirements: ${matrix.totalRequirements}`);
        console.log(`  Coverage: ${matrix.summary.coveragePercent}%`);
        console.log(`  Gaps: ${matrix.summary.gapCount}`);

        // Table
        const header = [
          chalk.bold('ID'),
          chalk.bold('Title'),
          chalk.bold('Owner'),
          chalk.bold('Status'),
          chalk.bold('AC'),
          chalk.bold('Tests'),
          chalk.bold('Gaps'),
        ];

        const rows = matrix.entries.map(e => [
          e.reqId,
          e.title.length > 30 ? e.title.slice(0, 29) + '…' : e.title,
          e.owner || chalk.red('(none)'),
          e.status,
          String(e.acceptanceCriteriaCount),
          String(e.testRefCount),
          e.gaps.length > 0 ? chalk.yellow(String(e.gaps.length)) : chalk.green('0'),
        ]);

        console.log(table([header, ...rows]));

        // Gaps
        if (matrix.gaps.length > 0) {
          console.log(chalk.bold.yellow('\nGaps'));
          for (const gap of matrix.gaps) {
            const color = gap.severity === 'critical' ? chalk.red
              : gap.severity === 'major' ? chalk.hex('#FF9500')
              : chalk.gray;
            console.log(`  ${color(`[${gap.severity}]`)} ${gap.message}`);
          }
        }

        // Assumptions
        if (matrix.assumptions.length > 0) {
          console.log(chalk.bold('\nAssumptions'));
          for (const a of matrix.assumptions) {
            console.log(chalk.gray(`  • ${a}`));
          }
        }
      }),
  );
