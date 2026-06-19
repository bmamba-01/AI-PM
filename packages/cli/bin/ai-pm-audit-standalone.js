#!/usr/bin/env node
import { auditCommand } from '../dist/commands/audit.js';
import { Command } from 'commander';

const program = new Command();

program
  .name('ai-pm-audit')
  .description('AI-PM Audit CLI (standalone)')
  .version('0.1.0');

program.addCommand(auditCommand);

program.parse(process.argv);
