import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { LocalProjectStore } from '@ai-pm/core/runtime';
import { table } from 'table';

const msgs = {
  en: {
    title: 'Audit Trail',
    loading: 'Loading audit records...',
    empty: 'No audit records found. Run a workflow first to generate records.',
    done: 'Done',
    runId: 'Run ID',
    workflow: 'Workflow',
    project: 'Project',
    status: 'Status',
    started: 'Started',
    completed: 'Completed',
    summary: 'Summary',
  },
  vi: {
    title: 'Nhật Ký Kiểm Toán',
    loading: 'Đang tải bản ghi kiểm toán...',
    empty: 'Không tìm thấy bản ghi kiểm toán nào. Chạy workflow trước để tạo bản ghi.',
    done: 'Xong',
    runId: 'Mã Chạy',
    workflow: 'Quy Trình',
    project: 'Dự Án',
    status: 'Trạng Thái',
    started: 'Bắt Đầu',
    completed: 'Hoàn Thành',
    summary: 'Tóm Tắt',
  },
};

function getLang(): keyof typeof msgs {
  return 'en';
}

export const auditCommand = new Command('audit');

auditCommand
  .description('View audit trail of workflow runs')
  .addCommand(
    new Command('list')
      .description('List workflow audit records')
      .option('--json', 'Output as JSON')
      .option('--limit <n>', 'Max records to show', '20')
      .action(async (opts) => {
        const lang = getLang();
        const msgsLang = msgs[lang];
        const spinner = ora(msgsLang.loading).start();

        try {
          const store = new LocalProjectStore(process.cwd());
          const records = await store.loadWorkflowAuditRecords();
          spinner.succeed(msgsLang.done);

          if (records.length === 0) {
            console.log(chalk.yellow(msgsLang.empty));
            return;
          }

          // Sort by startedAt descending (newest first), limit
          const limit = parseInt(opts.limit, 10) || 20;
          const sorted = records
            .sort((a, b) => b.startedAt.localeCompare(a.startedAt))
            .slice(0, limit);

          if (opts.json) {
            console.log(JSON.stringify(sorted, null, 2));
            return;
          }

          // Table output
          const statusColor = (s: string) => {
            if (s === 'completed') return chalk.green(s);
            if (s === 'failed') return chalk.red(s);
            if (s === 'blocked') return chalk.yellow(s);
            return s;
          };

          const data = [
            [chalk.bold(msgsLang.runId), chalk.bold(msgsLang.workflow), chalk.bold(msgsLang.project), chalk.bold(msgsLang.status), chalk.bold(msgsLang.started)],
            ...sorted.map(r => [
              r.runId.length > 12 ? r.runId.slice(0, 12) + '…' : r.runId,
              r.workflowId,
              r.projectId,
              statusColor(r.status),
              new Date(r.startedAt).toLocaleString(),
            ]),
          ];

          console.log(chalk.blue(`\n${msgsLang.title}\n`));
          console.log(table(data));
          console.log(chalk.gray(`Showing ${sorted.length} of ${records.length} records`));
        } catch (error) {
          spinner.fail(msgsLang.loading + ' failed');
          console.error(error);
        }
      })
  );
