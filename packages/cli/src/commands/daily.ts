import { Command } from 'commander';
import chalk from 'chalk';
import { generateDailyBriefing, type DailyBriefingInputItem } from '@ai-pm/core/workflows';

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
  .description('Run daily PM workflows')
  .addCommand(
    new Command('brief')
      .description('Generate a daily PM briefing from available local context')
      .option('-p, --project <id>', 'Project ID', 'local-project')
      .option('--json', 'Print JSON output')
      .action((options: { project: string; json?: boolean }) => {
        const briefing = generateDailyBriefing({
          projectId: options.project,
          date: todayIso(),
          items: defaultLocalItems(),
          unavailableSources: ['online-mcp'],
          assumptions: ['Only local fallback context was used. Configure MCP connectors for live project data.'],
        });

        if (options.json) {
          console.log(JSON.stringify(briefing, null, 2));
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
      })
  );
