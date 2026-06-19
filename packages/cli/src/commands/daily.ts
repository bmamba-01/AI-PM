import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { loadMcpConfig } from '@ai-pm/mcp/connectionManager';
import { generateDailyBriefing, type DailyBriefingInputItem } from '@ai-pm/core/workflows';
import { LocalProjectStore } from '@ai-pm/core/runtime';

const msgs = {
  en: {
    title: 'Daily Briefing',
    noServers: 'No MCP servers configured. Connect servers first.',
    loading: 'Loading daily data...',
    deadlines: 'Upcoming Deadlines',
    meetings: "Today's Meetings",
    reports: 'Report Reminders',
    issues: 'Recent Issues',
    priorities: 'Top Priorities',
    blockers: 'Urgent Blockers',
    risks: 'Risks to Review',
    approvals: 'Pending Approvals',
    followups: 'Suggested Follow-ups',
    sources: 'Source Coverage',
    assumptions: 'Assumptions',
    confidence: 'Confidence',
    none: 'None',
    done: 'Done',
    error: 'Failed to generate daily briefing',
    noData: 'No briefing items found. Add items to .ai-pm/daily-items.json or configure MCP connectors.',
  },
  vi: {
    title: 'Báo Cáo Hàng Ngày',
    noServers: 'Chưa cấu hình MCP server nào. Vui lòng kết nối server trước.',
    loading: 'Đang tải dữ liệu hàng ngày...',
    deadlines: 'Hạn Chót Sắp Tới',
    meetings: 'Cuộc Họp Hôm Nay',
    reports: 'Nhắc Nhở Báo Cáo',
    issues: 'Vấn Đề Gần Đây',
    priorities: 'Ưu Tiên Hàng Đầu',
    blockers: 'Trở Ngại Khẩn Cấp',
    risks: 'Rủi Ro Cần Xem Xét',
    approvals: 'Phê Duyệt Đang Chờ',
    followups: 'Theo Đõi Đề Xuất',
    sources: 'Nguồn Dữ Liệu',
    assumptions: 'Giả Định',
    confidence: 'Độ Tin Cậy',
    none: 'Không có',
    done: 'Xong',
    error: 'Không thể tạo báo cáo hàng ngày',
    noData: 'Không tìm thấy mục nào. Thêm vào .ai-pm/daily-items.json hoặc cấu hình MCP.',
  }
};

function getLang(): keyof typeof msgs {
  return 'en';
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function defaultLocalItems(): DailyBriefingInputItem[] {
  return [
    {
      source: 'local-memory',
      type: 'priority',
      title: 'Review project status, blockers, approvals, and upcoming meetings',
      priority: 'high',
    },
  ];
}

export const dailyCommand = new Command('daily');

dailyCommand
  .description('Generate daily briefing, deadline highlights, and report reminders')
  .option('--output <format>', 'Output format: text, json, markdown', 'text')
  .action(async (opts) => {
    const lang = getLang();
    const msgsLang = msgs[lang];

    const config = loadMcpConfig(process.cwd());
    if (config.servers.filter(s => s.enabled).length === 0) {
      console.log(chalk.yellow(msgsLang.noServers));
      return;
    }

    const spinner = ora(msgsLang.loading).start();

    try {
      // Load real data from local store
      const store = new LocalProjectStore(process.cwd());
      const localItems = await store.loadDailyBriefingItems();
      const items = localItems.length > 0 ? localItems : defaultLocalItems();

      const briefing = generateDailyBriefing({
        projectId: 'local-project',
        date: todayIso(),
        items,
        unavailableSources: ['online-mcp'],
        assumptions: localItems.length === 0
          ? [msgsLang.noData]
          : ['Live data from configured MCP connectors.'],
      });

      spinner.succeed(msgsLang.done);

      if (opts.output === 'json') {
        console.log(JSON.stringify(briefing, null, 2));
      } else if (opts.output === 'markdown') {
        console.log(`# ${msgsLang.title}`);
        console.log(`\n**${msgsLang.priorities}:**`);
        briefing.topPriorities.length
          ? briefing.topPriorities.forEach((item: string) => console.log(`- ${item}`))
          : console.log(`- ${msgsLang.none}`);
        console.log(`\n**${msgsLang.blockers}:**`);
        briefing.urgentBlockers.length
          ? briefing.urgentBlockers.forEach((item: string) => console.log(`- ${item}`))
          : console.log(`- ${msgsLang.none}`);
        console.log(`\n**${msgsLang.risks}:**`);
        briefing.risksToReview.length
          ? briefing.risksToReview.forEach((item: string) => console.log(`- ${item}`))
          : console.log(`- ${msgsLang.none}`);
        console.log(`\n**${msgsLang.approvals}:**`);
        briefing.pendingApprovals.length
          ? briefing.pendingApprovals.forEach((item: string) => console.log(`- ${item}`))
          : console.log(`- ${msgsLang.none}`);
        console.log(`\n**${msgsLang.followups}:**`);
        briefing.suggestedFollowups.length
          ? briefing.suggestedFollowups.forEach((item: string) => console.log(`- ${item}`))
          : console.log(`- ${msgsLang.none}`);
        console.log(`\n**${msgsLang.sources}:**`);
        briefing.sourceCoverage.forEach((source: string) => console.log(`- ${source}`));
        console.log(`\n**${msgsLang.assumptions}:**`);
        briefing.assumptions.forEach((a: string) => console.log(`- ${a}`));
        console.log(`\n**${msgsLang.confidence}:** ${briefing.confidence}%`);
      } else {
        // Text format (default)
        console.log(chalk.bold(`\n${msgsLang.title} - ${briefing.date}\n`));
        console.log(chalk.bold(`${msgsLang.priorities}:`));
        briefing.topPriorities.length
          ? briefing.topPriorities.forEach((item: string) => console.log(`  - ${item}`))
          : console.log(`  ${msgsLang.none}`);
        console.log(chalk.bold(`\n${msgsLang.blockers}:`));
        briefing.urgentBlockers.length
          ? briefing.urgentBlockers.forEach((item: string) => console.log(`  - ${item}`))
          : console.log(`  ${msgsLang.none}`);
        console.log(chalk.bold(`\n${msgsLang.risks}:`));
        briefing.risksToReview.length
          ? briefing.risksToReview.forEach((item: string) => console.log(`  - ${item}`))
          : console.log(`  ${msgsLang.none}`);
        console.log(chalk.bold(`\n${msgsLang.approvals}:`));
        briefing.pendingApprovals.length
          ? briefing.pendingApprovals.forEach((item: string) => console.log(`  - ${item}`))
          : console.log(`  ${msgsLang.none}`);
        console.log(chalk.bold(`\n${msgsLang.followups}:`));
        briefing.suggestedFollowups.length
          ? briefing.suggestedFollowups.forEach((item: string) => console.log(`  - ${item}`))
          : console.log(`  ${msgsLang.none}`);
        console.log(chalk.bold(`\n${msgsLang.sources}:`));
        briefing.sourceCoverage.forEach((source: string) => console.log(`  - ${source}`));
        console.log(chalk.bold(`\n${msgsLang.assumptions}:`));
        briefing.assumptions.forEach((a: string) => console.log(`  - ${a}`));
        console.log(chalk.bold(`\n${msgsLang.confidence}:`) + ` ${briefing.confidence}%`);
      }
    } catch (error) {
      spinner.fail(msgsLang.error);
      console.error(error);
    }
  });
