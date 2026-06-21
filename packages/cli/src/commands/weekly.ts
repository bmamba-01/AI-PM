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

export function createWeeklyCommand(): Command {
  const cmd = new Command('weekly');

  cmd
    .description('Generate local-only weekly status report draft')
    .option('--format <type>', 'Output format: text, json, markdown, html', 'text')
    .option('--json', 'Output as JSON (alias for --format json)')
    .option('--output <dir>', 'Write draft files to specified directory')
    .option('--start <date>', 'Reporting start YYYY-MM-DD')
    .option('--end <date>', 'Reporting end YYYY-MM-DD')
    .action(async opts => {
    const lang = getLang();
    const msgsLang = msgs[lang];
    const format = opts.json ? 'json' : opts.format;
    const spinner = ora('Loading weekly data...').start();

    try {
      const projectRoot = process.cwd();
      const config = loadMcpConfig(projectRoot);
      const enabledServers = config.servers.filter(s => s.enabled).length;

      const weekBounds = opts.start && opts.end ? { start: opts.start, end: opts.end } : currentWeekBounds();
      const start = weekBounds.start;
      const end = weekBounds.end;
      const store = new LocalProjectStore(projectRoot) as any;
      const approvalQueue = new ApprovalQueue(projectRoot) as any;

      const weeklyItems = await store.loadWeeklyReportItems();
      const items = weeklyItems.length > 0 ? weeklyItems : [];

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

      // Render output
      let content: string;
      let ext: string;

      if (format === 'json') {
        content = JSON.stringify({ period: { start, end }, report: result.report, approvalItemId: result.approvalItemId }, null, 2);
        ext = 'json';
      } else if (format === 'html') {
        content = renderWeeklyHtml(result.report, start, end, msgsLang);
        ext = 'html';
      } else if (format === 'markdown') {
        content = renderWeeklyMarkdown(result.report, start, end, msgsLang);
        ext = 'md';
      } else {
        content = renderWeeklyText(result.report, start, end, msgsLang);
        if (result.approvalItemId) content += `\n\n${msgsLang.approvalQueued}: ${result.approvalItemId}`;
        else content += `\n\n${msgsLang.approvalFailed}`;
        ext = 'txt';
      }

      if (opts.output) {
        const { mkdirSync, writeFileSync } = await import('node:fs');
        const { join } = await import('node:path');
        mkdirSync(opts.output, { recursive: true });
        const filePath = join(opts.output, `weekly-status-${end}.${ext}`);
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
export const weeklyCommand = createWeeklyCommand();

// ── Formatters ──────────────────────────────────────────────────────────────

function renderWeeklyMarkdown(report: any, start: string, end: string, msgsLang: any): string {
  const lines: string[] = [];
  lines.push(`# ${msgsLang.title}`);
  lines.push(`\n**Reporting Period:** ${start} to ${end}`);
  lines.push(`\n**Accomplishments**`);
  lines.push(report.accomplishments.length ? report.accomplishments.map((l: string) => `- ${l}`).join('\n') : `- ${msgsLang.none}`);
  lines.push(`\n**Next Week**`);
  lines.push(report.nextWeekFocus.length ? report.nextWeekFocus.map((l: string) => `- ${l}`).join('\n') : `- ${msgsLang.none}`);
  lines.push(`\n**Risks**`);
  lines.push(report.riskSummary.length ? report.riskSummary.map((l: string) => `- ${l}`).join('\n') : `- ${msgsLang.none}`);
  lines.push(`\n**Decisions**`);
  lines.push(report.decisions.length ? report.decisions.map((l: string) => `- ${l}`).join('\n') : `- ${msgsLang.none}`);
  lines.push(`\n**Milestones**`);
  lines.push(report.milestones.length ? report.milestones.map((m: any) => `- ${m.name} (${m.dueDate}, ${m.daysRemaining} days)`).join('\n') : `- ${msgsLang.none}`);
  lines.push(`\n**Assumptions**`);
  lines.push(report.assumptions.map((a: string) => `- ${a}`).join('\n'));
  lines.push(`\n**Confidence:** ${report.confidence}%`);
  lines.push(`\n---\n*Generated by AI-PM Toolkit*`);
  return lines.join('\n');
}

function renderWeeklyHtml(report: any, start: string, end: string, msgsLang: any): string {
  const section = (title: string, items: string[]) =>
    `<h2>${title}</h2>\n<ul>${items.map(i => `<li>${i.replace(/&/g, '&amp;').replace(/</g, '&lt;')}</li>`).join('')}</ul>`;
  return `<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8"><title>${msgsLang.title}</title>
<style>body{font-family:sans-serif;max-width:800px;margin:0 auto;padding:2rem;color:#1a1a1a}
h1{border-bottom:2px solid #e5e7eb;padding-bottom:.5rem}ul{line-height:1.8}
.meta{color:#6b7280;font-size:.875rem}</style></head>
<body><h1>${msgsLang.title}</h1>
<p class="meta">${start} to ${end}</p>
${section('Accomplishments', report.accomplishments)}
${section('Next Week', report.nextWeekFocus)}
${section('Risks', report.riskSummary)}
${section('Decisions', report.decisions)}
${section('Milestones', report.milestones.map((m: any) => `${m.name} (${m.dueDate}, ${m.daysRemaining} days)`))}
${section('Assumptions', report.assumptions)}
<p><strong>Confidence:</strong> ${report.confidence}%</p>
<hr><p><em>Generated by AI-PM Toolkit</em></p></body></html>`;
}

function renderWeeklyText(report: any, start: string, end: string, msgsLang: any): string {
  const lines: string[] = [];
  lines.push(`${msgsLang.title}`);
  lines.push(`Reporting Period: ${start} to ${end}`);
  lines.push('');
  lines.push('Accomplishments');
  lines.push(report.accomplishments.length ? report.accomplishments.map((l: string) => `  - ${l}`).join('\n') : `  ${msgsLang.none}`);
  lines.push('');
  lines.push('Next Week');
  lines.push(report.nextWeekFocus.length ? report.nextWeekFocus.map((l: string) => `  - ${l}`).join('\n') : `  ${msgsLang.none}`);
  lines.push('');
  lines.push('Risks');
  lines.push(report.riskSummary.length ? report.riskSummary.map((l: string) => `  - ${l}`).join('\n') : `  ${msgsLang.none}`);
  lines.push('');
  lines.push('Decisions');
  lines.push(report.decisions.length ? report.decisions.map((l: string) => `  - ${l}`).join('\n') : `  ${msgsLang.none}`);
  lines.push('');
  lines.push('Milestones');
  lines.push(report.milestones.length ? report.milestones.map((m: any) => `  - ${m.name} (${m.dueDate}, ${m.daysRemaining} days)`).join('\n') : `  ${msgsLang.none}`);
  lines.push('');
  lines.push('Assumptions');
  report.assumptions.forEach((a: string) => lines.push(`  - ${a}`));
  lines.push('');
  lines.push(`Confidence: ${report.confidence}%`);
  return lines.join('\n');
}
