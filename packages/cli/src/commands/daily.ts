import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { loadMcpConfig } from '@ai-pm/mcp/connectionManager';

const msgs = {
  en: {
    title: 'Daily Briefing',
    noServers: 'No MCP servers configured. Connect servers first.',
    loading: 'Loading daily data...',
    deadlines: 'Upcoming Deadlines',
    meetings: "Today's Meetings",
    reports: 'Report Reminders',
    issues: 'Recent Issues',
    none: 'None',
    done: 'Done',
  },
  vi: {
    title: 'Báo Cáo Hàng Ngày',
    noServers: 'Chưa cấu hình MCP server nào. Vui lòng kết nối server trước.',
    loading: 'Đang tải dữ liệu hàng ngày...',
    deadlines: 'Hạn Chót Sắp Tới',
    meetings: 'Cuộc Họp Hôm Nay',
    reports: 'Nhắc Nhở Báo Cáo',
    issues: 'Vấn Đề Gần Đây',
    none: 'Không có',
    done: 'Xong',
  }
};

function getLang(): keyof typeof msgs {
  return 'en';
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
      // Placeholder: In real implementation, this would call MCP tools
      const briefing = {
        date: new Date().toISOString().split('T')[0],
        deadlines: [
          { title: 'Submit sprint report', dueDate: '2026-06-20' },
          { title: 'Review PR #142', dueDate: '2026-06-21' },
        ],
        meetings: [
          { title: 'Daily Standup', time: '10:00' },
          { title: 'Sprint Planning', time: '14:00' },
        ],
        reports: [
          { title: 'Weekly Status Report', dueDate: '2026-06-21' },
        ],
        issues: [
          { title: 'API latency spike', severity: 'high' },
          { title: 'UI bug in settings page', severity: 'medium' },
        ],
      };

      spinner.succeed(msgsLang.done);

      if (opts.output === 'json') {
        console.log(JSON.stringify(briefing, null, 2));
      } else if (opts.output === 'markdown') {
        console.log(`# ${msgsLang.title}`);
        console.log(`\n**${msgsLang.deadlines}:**`);
        briefing.deadlines.forEach((d) => console.log(`- ${d.title} (${d.dueDate})`));
        console.log(`\n**${msgsLang.meetings}:**`);
        briefing.meetings.forEach((m) => console.log(`- ${m.title} at ${m.time}`));
        console.log(`\n**${msgsLang.reports}:**`);
        briefing.reports.forEach((r) => console.log(`- ${r.title} (${r.dueDate})`));
        console.log(`\n**${msgsLang.issues}:**`);
        briefing.issues.forEach((i) => console.log(`- ${i.title} [${i.severity}]`));
      } else {
        console.log(chalk.bold(`\n${msgsLang.title} - ${briefing.date}\n`));
        console.log(`${msgsLang.deadlines}:`);
        briefing.deadlines.length ? briefing.deadlines.forEach((d: any) => console.log(`  - ${d.title} (${d.dueDate})`)) : console.log(`  ${msgsLang.none}`);
        console.log(`\n${msgsLang.meetings}:`);
        briefing.meetings.length ? briefing.meetings.forEach((m: any) => console.log(`  - ${m.title} at ${m.time}`)) : console.log(`  ${msgsLang.none}`);
        console.log(`\n${msgsLang.reports}:`);
        briefing.reports.length ? briefing.reports.forEach((r: any) => console.log(`  - ${r.title} (${r.dueDate})`)) : console.log(`  ${msgsLang.none}`);
        console.log(`\n${msgsLang.issues}:`);
        briefing.issues.length ? briefing.issues.forEach((i: any) => console.log(`  - ${i.title} [${i.severity}]`)) : console.log(`  ${msgsLang.none}`);
      }
    } catch (error) {
      spinner.fail('Failed to generate daily briefing');
      console.error(error);
    }
  });