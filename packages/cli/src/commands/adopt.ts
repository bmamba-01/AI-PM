import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { checkReadiness, determineSetupMode, DEFAULT_SETUP } from '@ai-pm/core/setup';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const CLI_PATH = path.resolve(__dirname, '../../bin/ai-pm.js');

export const adoptCommand = new Command('adopt')
  .description('Adopt an existing project for AI-PM Toolkit. With --defaults, writes AI-PM files via setup repair.')
  .option('--path <dir>', 'Project root path', process.cwd())
  .option('--defaults', 'Use default settings without prompts', false)
  .option('--json', 'Output as JSON', false)
  .action(async (opts) => {
    const spinner = opts.json ? null : ora('Analyzing project...').start();

    try {
      const mode = await determineSetupMode(opts.path);
      const readiness = await checkReadiness(opts.path);

      spinner?.succeed('Analysis complete');

      // If --defaults and there are blocking items, delegate to setup repair
      if (opts.defaults && readiness.blocking.length > 0) {
        if (!opts.json) {
          console.log(chalk.blue('\nAdopting project with defaults — running setup repair...\n'));
        }
        try {
          const repairOutput = execSync(`node "${CLI_PATH}" setup repair --path "${opts.path}" --json`, {
            encoding: 'utf-8',
            cwd: opts.path,
          });
          const repairResult = JSON.parse(repairOutput);

          if (opts.json) {
            const finalReadiness = await checkReadiness(opts.path);
            console.log(JSON.stringify({
              mode,
              readiness: finalReadiness,
              defaults: DEFAULT_SETUP,
              repair: repairResult,
            }, null, 2));
            return;
          }

          console.log(chalk.green(`\n✓ Repair created ${repairResult.created.length} items:`));
          for (const item of repairResult.created) {
            console.log(`  ✓ ${item}`);
          }
          console.log(chalk.blue('\nNext commands:'));
          const finalReadiness = await checkReadiness(opts.path);
          for (const cmd of finalReadiness.nextCommands) {
            console.log(`  ${cmd}`);
          }
          return;
        } catch (repairError) {
          if (!opts.json) {
            console.error(chalk.red(`Repair failed: ${String(repairError)}`));
          }
        }
      }

      // Analysis-only mode (no write)
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
        console.log(chalk.yellow('\nUse --defaults to auto-repair, or run "ai-pm setup repair" manually.'));
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
      spinner?.fail('Analysis failed');
      console.error(chalk.red(String(error)));
    }
  });
