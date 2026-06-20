import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { generateWeeklyReportForProject } from '@ai-pm/core/workflows';
import { LocalProjectStore } from '@ai-pm/core/runtime';
import { ApprovalQueue } from '@ai-pm/core/runtime';
import { loadMcpConfig } from '@ai-pm/mcp/connectionManager';

const msgs = {
  en: {
    title: 'Weekly Status Report',
    noData: 'No weekly items found. Use MCP connectors or update .ai-pm/weekly-items.json.',
    done: 'Done',
    error: 'Failed to generate weekly report',
    approvalQueued: 'Approval item queued',
    approvalFailed: 'Approval queue unavailable',
  },
  vi: {
    title: 'Báo Cáo Tuần',
    noData: 'Không tìm thấy dữ liệu tuần. Kết nối MCP hoặc cập nhật .ai-pm/weekly-items.json.',
    done: 'Xong',
    error: 'Không thể tạo báo cáo tuần',
    approvalQueued: 'Đã tạo mục phê duyệt',
    approvalFailed: 'Hàng đợi phê duyệt không khả dụng',
  },
};

function getLang(): 'en' | 'vi' {
  return 'en';
}

function currentWeekBounds(): { start: string; end: string } {
  const now = new Date();
  const day = now.getUTCDay() || 7;
  if (day !== 1) now.setUTCDate(now.getUTCDate() - day + 1);
  const start = now;
  start.setUTCHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 7);
  return {
    start: start.toISOString().slice(0, 10),
    end: end.toISOString().slice(0, 10),
  };
}

export const weeklyCommand = new Command('weekly');

weeklyCommand
  .description('Generate local-only weekly status report draft')
  .option('--output <format>', 'Output format: text, json, markdown', 'text')
  .option('--start <date>', 'Reporting start YYYY-MM-DD')
  .option('--end <date>', 'Reporting end YYYY-MM-DD')
  .action(async opts => {
    const lang = getLang();
    const msgsLang = msgs[lang];
    const spinner = ora('Loading weekly data...').start();

    try {
      const projectRoot = process.cwd();
      const config = loadMcpConfig(projectRoot);
      const enabledServers = config.servers.filter(s => s.enabled).length;

      const [start, end] = opts.start && opts.end ? [opts.start, opts.end] : currentWeekBounds();
      const store = new LocalProjectStore(projectRoot) as any;
      const approvalQueue = new ApprovalQueue(projectRoot) as any;

      const weeklyItems = await store.loadWeeklyReportItems();
      const items = weeklyItems.length > 0 ? weeklyItems : [];

      const itemsForInput = items.length
        ? items
        : [
            {
              source: 'local-memory',
              section: 'accomplishment',
              title: 'Review completed milestones and deliverables for this period.',
              status: 'unknown',
            },
            {
              source: 'local-memory',
              section: 'next_week',
              title: 'Queue follow-up priorities for next reporting period.',
              status: 'unknown',
            },
            {
              source: 'local-memory',
              section: 'risk',
              title: 'Reconcile risk register updates before weekly report.',
              status: 'unknown',
            },
          ];

      const assumptions = [
        ...(items.length === 0 ? [msgsLang.noData] : ['Live data from local weekly items.']),
        ...(enabledServers === 0 ? ['No MCP servers configured; local-only output.'] : []),
      ];

      const result = await generateWeeklyReportForProject({
        projectRoot,
        reportingPeriodStart: start,
        reportingPeriodEnd: end,
        store,
        approvalQueue,
      });

      spinner.succeed(msgsLang.done);

      console.log(`\n# ${msgsLang.title}`);
      console.log(`\n**Reporting Period:** ${start} to ${end}\n`);

      console.log('**Accomplishments**');
      console.log(result.report.accomplishments.length
        ? result.report.accomplishments.map(line => `- ${line}`).join('\n')
        : '- None');

      console.log('\n**Next Week**');
      console.log(result.report.nextWeekFocus.length
        ? result.report.nextWeekFocus.map(line => `- ${line}`).join('\n')
        : '- None');

      console.log('\n**Risks**');
      console.log(result.report.riskSummary.length
        ? result.report.riskSummary.map(line => `- ${line}`).join('\n')
        : '- None');

      console.log('\n**Decisions**');
      console.log(result.report.decisions.length
        ? result.report.decisions.map(line => `- ${line}`).join('\n')
        : '- None');

      console.log('\n**Milestones**');
      console.log(
        result.report.milestones.length
          ? result.report.milestones.map(m => `- ${m.name} (${m.dueDate}, ${m.daysRemaining} days)`).join('\n')
          : '- None',
      );

      console.log('\n**Assumptions**');
      result.report.assumptions.forEach(a => console.log(`- ${a}`));

      console.log('\n**Confidence:**', `${result.report.confidence}%`);

      if (result.approvalItemId) {
        console.log(`\n${msgsLang.approvalQueued}: ${result.approvalItemId}`);
      } else {
        console.log(`\n${msgsLang.approvalFailed}`);
      }
    } catch (error) {
      spinner.fail(msgsLang.error);
      console.error(error);
    }
  });
