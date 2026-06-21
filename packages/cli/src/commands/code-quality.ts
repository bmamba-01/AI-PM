import { Command } from 'commander';
import chalk from 'chalk';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { generateCodeQualityReview } from '@ai-pm/core/workflows';

export const codeQualityCommand = new Command('code-quality');

codeQualityCommand
  .description('Review local code changes against requirements and test evidence');

codeQualityCommand
  .command('review')
  .description('Review a local diff before merge')
  .requiredOption('--diff <file>', 'Path to a file containing git diff text')
  .requiredOption('--requirements <file>', 'Path to requirements or acceptance criteria text')
  .option('--tests <file>', 'Path to test evidence text')
  .option('--project-id <id>', 'Project id', 'local-project')
  .option('--json', 'Output as JSON', false)
  .action(async (opts) => {
    const cwd = process.cwd();

    async function readRequired(file: string, label: string): Promise<string> {
      const resolved = path.resolve(cwd, file);
      try {
        return await readFile(resolved, 'utf-8');
      } catch {
        console.error(chalk.red(`Cannot read ${label}: ${resolved}`));
        process.exit(1);
      }
    }

    const diffText = await readRequired(opts.diff, 'diff file');
    const requirementsText = await readRequired(opts.requirements, 'requirements file');
    const testEvidence = opts.tests
      ? await readRequired(opts.tests, 'test evidence file')
      : undefined;

    const result = generateCodeQualityReview({
      projectId: opts.projectId,
      diffText,
      requirementsText,
      testEvidence,
      knownRisks: ['Review is based on local files only.'],
      createdBy: 'ai-pm-cli',
    });

    if (opts.json) {
      console.log(JSON.stringify(result, null, 2));
      return;
    }

    const readinessColor = result.mergeReadiness === 'ready'
      ? chalk.green
      : result.mergeReadiness === 'not_ready'
        ? chalk.red
        : chalk.yellow;

    console.log(chalk.bold.blue('\nCode Quality Review'));
    console.log(`Merge readiness: ${readinessColor(result.mergeReadiness)}`);
    console.log(`Summary: ${result.summary}`);

    const printList = (title: string, items: string[]) => {
      if (items.length === 0) return;
      console.log(chalk.bold(`\n${title}`));
      for (const item of items) console.log(`- ${item}`);
    };

    printList('Critical Findings', result.criticalFindings);
    printList('High Findings', result.highFindings);
    printList('Medium Findings', result.mediumFindings);
    printList('Missing Tests', result.missingTests);
    printList('Requirement Gaps', result.requirementGaps);
    printList('Reviewer Actions', result.reviewerActions);
  });
