import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { scanProject } from '@ai-pm/core/runtime';
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
