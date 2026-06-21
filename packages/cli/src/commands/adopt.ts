import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { checkReadiness, determineSetupMode, DEFAULT_SETUP } from '@ai-pm/core/setup';

export const adoptCommand = new Command('adopt')
  .description('Adopt an existing project for AI-PM Toolkit')
  .option('--path <dir>', 'Project root path', process.cwd())
  .option('--defaults', 'Use default settings without prompts', false)
  .option('--json', 'Output as JSON', false)
  .action(async (opts) => {
    const spinner = ora('Analyzing project...').start();

    try {
      const mode = await determineSetupMode(opts.path);
      const readiness = await checkReadiness(opts.path);

      spinner.succeed('Analysis complete');

      if (opts.json) {
        console.log(JSON.stringify({
          mode,
          readiness,
          defaults: DEFAULT_SETUP,
        }, null, 2));
        return;
      }

      console.log(chalk.blue('\nAI-PM Project Adoption\n'));
      console.log(`Mode: ${mode}`);
      console.log(`Readiness: ${readiness.score}%`);
      console.log(`Checks: ${readiness.checks.filter(c => c.present).length}/${readiness.checks.length}`);

      if (readiness.blocking.length > 0) {
        console.log(chalk.yellow(`\nMissing required items (${readiness.blocking.length}):`));
        for (const item of readiness.blocking) {
          console.log(chalk.red(`  ✗ ${item}`));
        }
        console.log(chalk.yellow('\nRun setup repair to fix these issues.'));
      }

      if (readiness.warnings.length > 0) {
        console.log(chalk.yellow(`\nMissing optional items (${readiness.warnings.length}):`));
        for (const item of readiness.warnings) {
          console.log(chalk.yellow(`  ⚠ ${item}`));
        }
      }

      console.log(chalk.blue('\nNext commands:'));
      for (const cmd of readiness.nextCommands) {
        console.log(`  ${cmd}`);
      }
    } catch (error) {
      spinner.fail('Analysis failed');
      console.error(chalk.red(String(error)));
    }
  });
