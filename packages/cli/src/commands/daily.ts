import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { generateDailyBriefing, type DailyBriefingInputItem } from '@ai-pm/core/workflows';
import { LocalProjectStore, MemoryStore, ApprovalQueue } from '@ai-pm/core/runtime';
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

export function createDailyCommand(): Command {
  const cmd = new Command('daily');

  cmd
    .description('Generate daily briefing, deadline highlights, and report reminders')
    .option('--format <type>', 'Output format: text, json, markdown, html', 'text')
    .option('--json', 'Output as JSON (alias for --format json)')
    .option('--output <dir>', 'Write draft files to specified directory')
    .action(async (opts) => {
      const lang = getLang();
      const msgsLang = msgs[lang];
      const format = opts.json ? 'json' : opts.format;

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

      // Render output
      let content: string;
      let ext: string;

      if (format === 'json') {
        content = JSON.stringify(briefing, null, 2);
        ext = 'json';
      } else if (format === 'html') {
        content = renderHtml(briefing, msgsLang);
        ext = 'html';
      } else if (format === 'markdown') {
        content = renderMarkdown(briefing, msgsLang);
        ext = 'md';
      } else {
        // Text format (default)
        content = renderText(briefing, msgsLang);
        ext = 'txt';
      }

      if (opts.output) {
        const { mkdirSync, writeFileSync } = await import('node:fs');
        const { join } = await import('node:path');
        mkdirSync(opts.output, { recursive: true });
        const filePath = join(opts.output, `daily-briefing-${briefing.date}.${ext}`);
        writeFileSync(filePath, content, 'utf-8');
        console.log(chalk.green(`Draft written to ${filePath}`));
      } else {
        console.log(content);
      }
    } catch (error) {
      spinner.fail(msgsLang.error);
      console.error(error);
    }
  });

  return cmd;
}

/** Singleton for CLI bin (backward-compatible) */
export const dailyCommand = createDailyCommand();

// ── Formatters ──────────────────────────────────────────────────────────────

function renderMarkdown(briefing: any, msgsLang: any): string {
  const lines: string[] = [];
  lines.push(`# ${msgsLang.title}`);
  lines.push(`\n**Date:** ${briefing.date}`);
  lines.push(`\n**${msgsLang.priorities}:**`);
  lines.push(briefing.topPriorities.length
    ? briefing.topPriorities.map((item: string) => `- ${item}`).join('\n')
    : `- ${msgsLang.none}`);
  lines.push(`\n**${msgsLang.blockers}:**`);
  lines.push(briefing.urgentBlockers.length
    ? briefing.urgentBlockers.map((item: string) => `- ${item}`).join('\n')
    : `- ${msgsLang.none}`);
  lines.push(`\n**${msgsLang.risks}:**`);
  lines.push(briefing.risksToReview.length
    ? briefing.risksToReview.map((item: string) => `- ${item}`).join('\n')
    : `- ${msgsLang.none}`);
  lines.push(`\n**${msgsLang.approvals}:**`);
  lines.push(briefing.pendingApprovals.length
    ? briefing.pendingApprovals.map((item: string) => `- ${item}`).join('\n')
    : `- ${msgsLang.none}`);
  lines.push(`\n**${msgsLang.followups}:**`);
  lines.push(briefing.suggestedFollowups.length
    ? briefing.suggestedFollowups.map((item: string) => `- ${item}`).join('\n')
    : `- ${msgsLang.none}`);
  lines.push(`\n**${msgsLang.sources}:**`);
  lines.push(briefing.sourceCoverage.map((s: string) => `- ${s}`).join('\n'));
  lines.push(`\n**${msgsLang.assumptions}:**`);
  lines.push(briefing.assumptions.map((a: string) => `- ${a}`).join('\n'));
  lines.push(`\n**${msgsLang.confidence}:** ${briefing.confidence}%`);
  lines.push(`\n---\n*Generated by AI-PM Toolkit*`);
  return lines.join('\n');
}

function renderHtml(briefing: any, msgsLang: any): string {
  const section = (title: string, items: string[]) =>
    `<h2>${title}</h2>\n<ul>${items.map(i => `<li>${escHtml(i)}</li>`).join('')}</ul>`;
  const escHtml = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  return `<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8"><title>${msgsLang.title}</title>
<style>body{font-family:sans-serif;max-width:800px;margin:0 auto;padding:2rem;color:#1a1a1a}
h1{border-bottom:2px solid #e5e7eb;padding-bottom:.5rem}ul{line-height:1.8}
.section{margin-bottom:1.5rem}.meta{color:#6b7280;font-size:.875rem}</style></head>
<body><h1>${msgsLang.title}</h1><p class="meta">${briefing.date}</p>
${section(msgsLang.priorities, briefing.topPriorities)}
${section(msgsLang.blockers, briefing.urgentBlockers)}
${section(msgsLang.risks, briefing.risksToReview)}
${section(msgsLang.approvals, briefing.pendingApprovals)}
${section(msgsLang.followups, briefing.suggestedFollowups)}
${section(msgsLang.sources, briefing.sourceCoverage)}
${section(msgsLang.assumptions, briefing.assumptions)}
<p><strong>${msgsLang.confidence}:</strong> ${briefing.confidence}%</p>
<hr><p><em>Generated by AI-PM Toolkit</em></p></body></html>`;
}

function renderText(briefing: any, msgsLang: any): string {
  const lines: string[] = [];
  lines.push(`${msgsLang.title} - ${briefing.date}`);
  lines.push('');
  lines.push(`${msgsLang.priorities}:`);
  briefing.topPriorities.length
    ? briefing.topPriorities.forEach((item: string) => lines.push(`  - ${item}`))
    : lines.push(`  ${msgsLang.none}`);
  lines.push('');
  lines.push(`${msgsLang.blockers}:`);
  briefing.urgentBlockers.length
    ? briefing.urgentBlockers.forEach((item: string) => lines.push(`  - ${item}`))
    : lines.push(`  ${msgsLang.none}`);
  lines.push('');
  lines.push(`${msgsLang.risks}:`);
  briefing.risksToReview.length
    ? briefing.risksToReview.forEach((item: string) => lines.push(`  - ${item}`))
    : lines.push(`  ${msgsLang.none}`);
  lines.push('');
  lines.push(`${msgsLang.approvals}:`);
  briefing.pendingApprovals.length
    ? briefing.pendingApprovals.forEach((item: string) => lines.push(`  - ${item}`))
    : lines.push(`  ${msgsLang.none}`);
  lines.push('');
  lines.push(`${msgsLang.followups}:`);
  briefing.suggestedFollowups.length
    ? briefing.suggestedFollowups.forEach((item: string) => lines.push(`  - ${item}`))
    : lines.push(`  ${msgsLang.none}`);
  lines.push('');
  lines.push(`${msgsLang.sources}:`);
  briefing.sourceCoverage.forEach((s: string) => lines.push(`  - ${s}`));
  lines.push('');
  lines.push(`${msgsLang.assumptions}:`);
  briefing.assumptions.forEach((a: string) => lines.push(`  - ${a}`));
  lines.push('');
  lines.push(`${msgsLang.confidence}: ${briefing.confidence}%`);
  return lines.join('\n');
}
