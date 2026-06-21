import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { checkReadiness, formatReadinessSummary, determineSetupMode, DEFAULT_SETUP } from '@ai-pm/core/setup';

async function pathExists(filePath: string): Promise<boolean> {
  const { access } = await import('node:fs/promises');
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function writeFileIfMissing(filePath: string, content: string, created: string[], label: string): Promise<void> {
  const { mkdir, writeFile } = await import('node:fs/promises');
  const { dirname } = await import('node:path');
  if (await pathExists(filePath)) return;
  await mkdir(dirname(filePath), { recursive: true });
  await writeFile(filePath, content);
  created.push(label);
}

export const setupCommand = new Command('setup')
  .description('Manage AI-PM project setup');

// setup doctor
setupCommand.addCommand(
  new Command('doctor')
    .description('Check project readiness and suggest fixes')
    .option('--path <dir>', 'Project root path', process.cwd())
    .option('--json', 'Output as JSON', false)
    .action(async (opts) => {
      const spinner = opts.json ? null : ora('Running setup doctor...').start();

      try {
        const mode = await determineSetupMode(opts.path);
        const result = await checkReadiness(opts.path);

        spinner?.succeed('Setup check complete');

        if (opts.json) {
          console.log(JSON.stringify({ ...result, mode }, null, 2));
          return;
        }

        console.log(formatReadinessSummary({ ...result, mode }));
      } catch (error) {
        spinner?.fail('Setup check failed');
        console.error(chalk.red(String(error)));
      }
    })
);

// setup repair
setupCommand.addCommand(
  new Command('repair')
    .description('Create missing runtime directories and empty state files')
    .option('--path <dir>', 'Project root path', process.cwd())
    .option('--json', 'Output as JSON', false)
    .action(async (opts) => {
      const { mkdir } = await import('node:fs/promises');
      const { join } = await import('node:path');

      const spinner = opts.json ? null : ora('Repairing project...').start();

      try {
        const projectRoot = opts.path;
        const created: string[] = [];

        // Create .ai-pm directories
        const dirs = [
          '.ai-pm/memory',
          '.ai-pm/audit',
          '.ai-pm/approvals',
          'reports',
          'artifacts',
          'requirements',
          'risks',
          'meetings',
          'templates',
          'notes',
        ];

        for (const dir of dirs) {
          const fullPath = join(projectRoot, dir);
          const existed = await pathExists(fullPath);
          await mkdir(fullPath, { recursive: true });
          if (!existed) created.push(dir);
        }

        // Create missing state files without overwriting local runtime data.
        const memoryState = {
          version: 1,
          project_id: projectRoot,
          tasks: [],
          artifacts: [],
          updated_at: new Date().toISOString(),
        };
        await writeFileIfMissing(
          join(projectRoot, '.ai-pm', 'memory', 'state.json'),
          JSON.stringify(memoryState, null, 2) + '\n',
          created,
          '.ai-pm/memory/state.json',
        );

        await writeFileIfMissing(join(projectRoot, '.ai-pm', 'approvals.json'), '[]\n', created, '.ai-pm/approvals.json');
        await writeFileIfMissing(join(projectRoot, '.ai-pm', 'audit', 'workflow-runs.jsonl'), '', created, '.ai-pm/audit/workflow-runs.jsonl');
        await writeFileIfMissing(
          join(projectRoot, '.ai-pm', 'profile.yaml'),
          `version: 1\nproject:\n  name: "${projectRoot.split(/[\\\\/]/).filter(Boolean).pop() ?? 'ai-pm-project'}"\n  methodology: "scrum"\n  project_type: "fixed_cost"\n  tags: []\nsource_systems:\n  jira: false\n  github: false\n  linear: false\n  confluence: false\n  notion: false\n  gmail: false\nconnectors:\n  connector_profile: "offline-local"\nartifacts:\n  root: "."\n  reports: "reports"\n  templates: "templates"\n  notes: "notes"\n`,
          created,
          '.ai-pm/profile.yaml',
        );

        spinner?.succeed(`Repair complete: ${created.length} items created`);

        if (opts.json) {
          console.log(JSON.stringify({ success: true, created, projectRoot }, null, 2));
          return;
        }

        console.log(chalk.green(`\n✓ Created ${created.length} items:`));
        for (const item of created) {
          console.log(`  ✓ ${item}`);
        }
        console.log(chalk.blue('\nRun "ai-pm setup doctor" to verify readiness.'));
      } catch (error) {
        spinner?.fail('Repair failed');
        console.error(chalk.red(String(error)));
      }
    })
);
