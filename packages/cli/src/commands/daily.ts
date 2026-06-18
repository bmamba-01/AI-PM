import { Command } from 'commander';
import chalk from 'chalk';
import { generateDailyBriefing, type DailyBriefingInputItem } from '@ai-pm/core/workflows';
import { LocalProjectStore } from '@ai-pm/core/runtime';

function todayIso(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
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
  .description('Run daily PM workflows')
  .addCommand(
    new Command('brief')
      .description('Generate a daily PM briefing from available local context')
      .option('-p, --project <id>', 'Project ID', 'local-project')
      .option('--json', 'Print JSON output')
      .action(async (options: { project: string; json?: boolean }) => {
        const startedAt = new Date().toISOString();
        const store = new LocalProjectStore(process.cwd());
        const localItems = await store.loadDailyBriefingItems();
        const items = localItems.length > 0 ? localItems : defaultLocalItems();
        const assumptions = localItems.length > 0
          ? ['Local project memory was loaded from .ai-pm/daily-items.json. Configure MCP connectors for live project data.']
          : ['Only local fallback context was used. Configure .ai-pm/daily-items.json or MCP connectors for project data.'];

        const briefing = generateDailyBriefing({
          projectId: options.project,
          date: todayIso(),
          items,
          unavailableSources: ['online-mcp'],
          assumptions,
        });

        const auditRef = await store.appendWorkflowAudit({
          workflowId: 'daily-briefing',
          projectId: options.project,
          status: 'completed',
          startedAt,
          completedAt: new Date().toISOString(),
          outputSummary: `${briefing.topPriorities.length} priorities, ${briefing.urgentBlockers.length} blockers, ${briefing.risksToReview.length} risks`,
          sourceCoverage: briefing.sourceCoverage,
          assumptions: briefing.assumptions,
        });

        if (options.json) {
          console.log(JSON.stringify({ ...briefing, auditRef }, null, 2));
          return;
        }

        console.log(chalk.blue(`Daily Briefing: ${briefing.projectId} (${briefing.date})`));
        console.log(chalk.gray(`Confidence: ${briefing.confidence}`));
        console.log('');
        console.log(chalk.bold('Top priorities'));
        for (const item of briefing.topPriorities) console.log(`- ${item}`);
        console.log('');
        console.log(chalk.bold('Source coverage'));
        for (const source of briefing.sourceCoverage) console.log(`- ${source}`);
        console.log('');
        console.log(chalk.bold('Assumptions'));
        for (const assumption of briefing.assumptions) console.log(`- ${assumption}`);
        console.log('');
        console.log(chalk.bold('Audit'));
        console.log(`- ${auditRef}`);
      })
  );
