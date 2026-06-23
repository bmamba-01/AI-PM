#!/usr/bin/env node
import { runInit } from '../dist/commands/init.js';
import { mcpCommand } from '../dist/commands/mcp.js';
import { methodologyCommand } from '../dist/commands/methodology.js';
import { dailyCommand } from '../dist/commands/daily.js';
import { weeklyCommand } from '../dist/commands/weekly.js';
import { auditCommand } from '../dist/commands/audit.js';
import { projectCommand } from '../dist/commands/project.js';
import { approvalCommand } from '../dist/commands/approval.js';
import { memoryCommand } from '../dist/commands/memory.js';
import { schemaCommand } from '../dist/commands/schema.js';
import { orchestratorCommand, agentCommand } from '../dist/commands/orchestrator.js';
import { riskCommand } from '../dist/commands/risk.js';
import { traceabilityCommand } from '../dist/commands/traceability.js';
import { codeQualityCommand } from '../dist/commands/code-quality.js';
import { adoptCommand } from '../dist/commands/adopt.js';
import { setupCommand } from '../dist/commands/setup.js';
import { trackingCommand } from '../dist/commands/tracking.js';
import { skillsCommand } from '../dist/commands/skills.js';
import { Command } from 'commander';
import chalk from 'chalk';

const program = new Command();

program
  .name('ai-pm')
  .description('AI-PM Toolkit CLI')
  .version('0.1.0');

program
  .command('init')
  .description('Initialize a new AI-PM project')
  .argument('[name]', 'Project name', 'my-ai-pm-project')
  .option('--defaults', 'Use default setup settings')
  .option('--methodology <method>', 'Project methodology (scrum, kanban, waterfall, hybrid)')
  .option('--project-type <type>', 'Project type')
  .option('--commercial-model <model>', 'Commercial model')
  .option('--connector-profile <profile>', 'Connector profile')
  .option('--json', 'Output as JSON')
  .action((name, opts) => runInit(name, {
    defaults: opts.defaults,
    methodology: opts.methodology,
    projectType: opts.projectType,
    commercialModel: opts.commercialModel,
    connectorProfile: opts.connectorProfile,
    json: opts.json,
  }));

program.addCommand(mcpCommand);
program.addCommand(methodologyCommand);
program.addCommand(dailyCommand);
program.addCommand(weeklyCommand);
program.addCommand(auditCommand);
program.addCommand(projectCommand);
program.addCommand(approvalCommand);
program.addCommand(memoryCommand);
program.addCommand(schemaCommand);
program.addCommand(orchestratorCommand);
program.addCommand(agentCommand);
program.addCommand(riskCommand);
program.addCommand(traceabilityCommand);
program.addCommand(codeQualityCommand);
program.addCommand(adoptCommand);
program.addCommand(setupCommand);
program.addCommand(trackingCommand);
program.addCommand(skillsCommand);

program.on('command', () => {});

program.parse(process.argv);

if (!process.argv.slice(2).length) {
  console.log(chalk.blue('AI-PM Toolkit'));
  console.log(chalk.gray('Usage: ai-pm <command>'));
  console.log(chalk.gray('Commands:'));
  console.log(chalk.gray('  init <name>              Initialize a new AI-PM project'));
  console.log(chalk.gray('  mcp <subcommand>         Manage MCP server connections'));
  console.log(chalk.gray('  methodology <subcommand>  Manage project methodology'));
  console.log(chalk.gray('  daily brief              Generate daily PM briefing'));
  console.log(chalk.gray('  weekly report            Generate weekly status report draft'));
  console.log(chalk.gray('  audit list               View workflow audit trail'));
  console.log(chalk.gray('  project scan             Scan project for readiness'));
  console.log(chalk.gray('  approval <subcommand>    Manage approval queue'));
  console.log(chalk.gray('  memory <subcommand>      Manage project runtime memory'));
  console.log(chalk.gray('  approval <subcommand>    Manage approval queue'));
  console.log(chalk.gray('  memory <subcommand>      Manage project runtime memory'));
  console.log(chalk.gray('  schema <subcommand>      Validate workflow outputs against JSON schemas'));
  console.log(chalk.gray('  risk <subcommand>        Manage project risk register'));
  console.log(chalk.gray('  traceability build       Build scope traceability matrix'));
  console.log(chalk.gray('  code-quality review      Review local diff against requirements'));
  console.log(chalk.gray('  tracking <subcommand>    Manage tracker-scoped delegated tasks'));
  console.log(chalk.gray('  skills <subcommand>      Inspect packaged skills and skill status'));
}
