import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { readFile } from 'node:fs/promises';
import { scanProject, loadProfile } from '@ai-pm/core/runtime';
import { table } from 'table';

const msgs = {
  en: {
    title: 'Project Scan',
    loading: 'Scanning project...',
    done: 'Scan complete',
    ready: 'Project is READY — all required files present',
    notReady: 'Project is NOT READY — missing required files',
    required: 'Required',
    optional: 'Optional',
    present: 'Present',
    missing: 'Missing',
    score: 'Readiness Score',
  },
  vi: {
    title: 'Quét Dự Án',
    loading: 'Đang quét dự án...',
    done: 'Quét hoàn tất',
    ready: 'Dự án SẴN SÀNG — tất cả file cần thiết đã có',
    notReady: 'Dự án CHƯA SẴN SÀNG — thiếu file bắt buộc',
    required: 'Bắt buộc',
    optional: 'Tùy chọn',
    present: 'Có',
    missing: 'Thiếu',
    score: 'Điểm Sẵn Sàng',
  },
};

function getLang(): keyof typeof msgs {
  return 'en';
}

export const projectCommand = new Command('project');

projectCommand
  .description('Manage and inspect AI-PM project configuration')
  .addCommand(
    new Command('scan')
      .description('Scan project for AI-PM operating layer readiness')
      .option('--json', 'Output as JSON')
      .option('--path <dir>', 'Project root to scan', process.cwd())
      .action(async (opts) => {
        const lang = getLang();
        const msgsLang = msgs[lang];
        const spinner = ora(msgsLang.loading).start();

        try {
          const result = await scanProject(opts.path);
          spinner.succeed(msgsLang.done);

          if (opts.json) {
            console.log(JSON.stringify(result, null, 2));
            return;
          }

          // Text output
          console.log(chalk.bold(`\n${msgsLang.title}\n`));

          // Score
          const scoreColor = result.score === 100 ? chalk.green :
                             result.score >= 70 ? chalk.yellow : chalk.red;
          console.log(`${msgsLang.score}: ${scoreColor(`${result.score}%`)}`);
          console.log(`${result.ready ? chalk.green(msgsLang.ready) : chalk.red(msgsLang.notReady)}\n`);

          // Summary
          console.log(chalk.gray(
            `${msgsLang.required}: ${result.passedRequired}/${result.totalRequired} | ` +
            `${msgsLang.optional}: ${result.passedOptional}/${result.totalOptional}\n`
          ));

          // Detail table
          const data = [
            [chalk.bold('Check'), chalk.bold('Status'), chalk.bold('Path')],
            ...result.checks.map(c => [
              c.label,
              c.present ? chalk.green(`✓ ${msgsLang.present}`) : (c.required ? chalk.red(`✗ ${msgsLang.missing}`) : chalk.gray(`○ ${msgsLang.missing}`)),
              c.path,
            ]),
          ];

          console.log(table(data));
        } catch (error) {
          spinner.fail(msgsLang.loading + ' failed');
          console.error(error);
        }
      })
  );

// ─── project profile validate ───────────────────────────────────────────────

const profileCommand = new Command('profile')
  .description('Manage project profile');

profileCommand
  .addCommand(
    new Command('validate')
      .description('Validate project profile against schema')
      .option('--json', 'Output as JSON', false)
      .option('--path <dir>', 'Project root', process.cwd())
      .action(async (opts) => {
        const result = await loadProfile(opts.path);

        if (opts.json) {
          console.log(JSON.stringify({
            valid: result.valid,
            errors: result.errors,
            warnings: result.warnings,
            profile: result.profile,
          }, null, 2));
          if (!result.valid) process.exitCode = 1;
          return;
        }

        // Text output
        console.log(chalk.bold('\n  Project Profile Validation\n'));

        if (result.valid) {
          console.log(chalk.green('  ✓ Profile is valid'));
        } else {
          console.log(chalk.red('  ✗ Profile has errors'));
        }

        if (result.errors.length > 0) {
          console.log(chalk.red('\n  Errors:'));
          for (const e of result.errors) {
            console.log(chalk.red(`    ✗ ${e}`));
          }
        }

        if (result.warnings.length > 0) {
          console.log(chalk.yellow('\n  Warnings:'));
          for (const w of result.warnings) {
            console.log(chalk.yellow(`    ⚠ ${w}`));
          }
        }

        // Show resolved profile summary
        const p = result.profile;
        console.log(chalk.blue('\n  Resolved Profile:'));
        console.log(`    project_id:  ${p.project.project_id}`);
        console.log(`    name:        ${p.project.name}`);
        console.log(`    root:        ${p.project.root}`);
        console.log(`    methodology: ${p.project.methodology ?? '(not set)'}`);
        console.log(`    type:        ${p.project.project_type ?? '(not set)'}`);
        console.log(`    timezone:    ${p.project.timezone}`);
        console.log(`    tags:        [${(p.project.tags ?? []).join(', ')}]`);
        console.log();

        if (!result.valid) process.exitCode = 1;
      })
  );

projectCommand.addCommand(profileCommand);
