#!/usr/bin/env node
import { runInit } from '../dist/commands/init.js';
import { mcpCommand } from '../dist/commands/mcp.js';
import { methodologyCommand } from '../dist/commands/methodology.js';
import { dailyCommand } from '../dist/commands/daily.js';
import { auditCommand } from '../dist/commands/audit.js';
import { projectCommand } from '../dist/commands/project.js';
import { approvalCommand } from '../dist/commands/approval.js';
import { memoryCommand } from '../dist/commands/memory.js';
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
  .action((name) => runInit(name));

program.addCommand(mcpCommand);
program.addCommand(methodologyCommand);
program.addCommand(dailyCommand);
program.addCommand(auditCommand);
program.addCommand(projectCommand);
program.addCommand(approvalCommand);
program.addCommand(memoryCommand);

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
  console.log(chalk.gray('  audit list               View workflow audit trail'));
  console.log(chalk.gray('  project scan             Scan project for readiness'));
  console.log(chalk.gray('  approval <subcommand>    Manage approval queue'));
  console.log(chalk.gray('  memory <subcommand>      Manage project runtime memory'));
}
