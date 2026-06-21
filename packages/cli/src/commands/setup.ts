import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { checkReadiness, formatReadinessSummary, determineSetupMode, DEFAULT_SETUP } from '@ai-pm/core/setup';

export const setupCommand = new Command('setup')
  .description('Manage AI-PM project setup');

// setup doctor
setupCommand.addCommand(
  new Command('doctor')
    .description('Check project readiness and suggest fixes')
    .option('--path <dir>', 'Project root path', process.cwd())
    .option('--json', 'Output as JSON', false)
    .action(async (opts) => {
      const spinner = ora('Running setup doctor...').start();

      try {
        const mode = await determineSetupMode(opts.path);
        const result = await checkReadiness(opts.path);

        spinner.succeed('Setup check complete');

        if (opts.json) {
          console.log(JSON.stringify({ ...result, mode }, null, 2));
          return;
        }

        console.log(formatReadinessSummary({ ...result, mode }));
      } catch (error) {
        spinner.fail('Setup check failed');
        console.error(chalk.red(String(error)));
      }
    })
);

// setup repair
setupCommand.addCommand(
  new Command('repair')
    .description('Create missing runtime directories and empty state files')
    .option('--path <dir>', 'Project root path', process.cwd())
    .option('--json', 'Output as JSON', false)
    .action(async (opts) => {
      const { mkdir, writeFile } = await import('node:fs/promises');
      const { join } = await import('node:path');

      const spinner = ora('Repairing project...').start();

      try {
        const projectRoot = opts.path;
        const created: string[] = [];

        // Create .ai-pm directories
        const dirs = [
          '.ai-pm/memory',
          '.ai-pm/audit',
          '.ai-pm/approvals',
        ];

        for (const dir of dirs) {
          const fullPath = join(projectRoot, dir);
          await mkdir(fullPath, { recursive: true });
          created.push(dir);
        }

        // Create empty state files
        const memoryState = {
          version: 1,
          project_id: '',
          tasks: [],
          artifacts: [],
          updated_at: new Date().toISOString(),
        };
        await writeFile(join(projectRoot, '.ai-pm', 'memory', 'state.json'), JSON.stringify(memoryState, null, 2));
        created.push('.ai-pm/memory/state.json');

        // Create empty approvals
        await writeFile(join(projectRoot, '.ai-pm', 'approvals.json'), '[]');
        created.push('.ai-pm/approvals.json');

        spinner.succeed(`Repair complete: ${created.length} items created`);

        if (opts.json) {
          console.log(JSON.stringify({ success: true, created, projectRoot }, null, 2));
          return;
        }

        console.log(chalk.green(`\n✓ Created ${created.length} items:`));
        for (const item of created) {
          console.log(`  ✓ ${item}`);
        }
        console.log(chalk.blue('\nRun "ai-pm setup doctor" to verify readiness.'));
      } catch (error) {
        spinner.fail('Repair failed');
        console.error(chalk.red(String(error)));
      }
    })
);
