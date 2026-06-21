import { Command } from 'commander';
import inquirer from 'inquirer';
import chalk from 'chalk';
import ora from 'ora';
import { loadMcpConfig, MCPServerConfig, removeMcpServer, setMcpServerEnabled, upsertMcpServer } from '@ai-pm/mcp/connectionManager';
import { table } from 'table';
import { loadRegistry, loadProfile, loadBuiltinProfiles, validateConfigs, runDoctor } from '@ai-pm/mcp/registry';

// Bilingual messages
const msgs = {
  en: {
    listHeader: 'Configured MCP Servers',
    addPrompt: 'Add a new MCP server',
    selectType: 'Select server type:',
    enterId: 'Enter server ID (kebab-case):',
    enterName: 'Enter display name:',
    enterUrl: 'Enter base URL (optional):',
    enterToken: 'Enter personal access token:',
    serverAdded: 'Server added successfully.',
    serverRemoved: 'Server removed.',
    invalidJson: 'Invalid JSON in mcp-config.json, resetting.',
    noServers: 'No servers configured.',
    toggleOn: 'Server enabled.',
    toggleOff: 'Server disabled.',
    chooseAction: 'Choose action:',
    actions: { list: 'List servers', add: 'Add server', remove: 'Remove server', toggle: 'Enable/Disable server', validate: 'Validate config' },
    serverTypes: { github: 'GitHub', jira: 'Jira', linear: 'Linear', notion: 'Notion', slack: 'Slack', google: 'Google Workspace', custom: 'Custom' }
  },
  vi: {
    listHeader: 'Các Server MCP Đã Cấu Hình',
    addPrompt: 'Thêm server MCP mới',
    selectType: 'Chọn loại server:',
    enterId: 'Nhập server ID (kebab-case):',
    enterName: 'Nhập tên hiển thị:',
    enterUrl: 'Nhập URL cơ sở (tùy chọn):',
    enterToken: 'Nhập token truy cập cá nhân:',
    serverAdded: 'Server đã được thêm thành công.',
    serverRemoved: 'Server đã xóa.',
    invalidJson: 'JSON không hợp lệ trong mcp-config.json, đang làm lại.',
    noServers: 'Chưa có server nào được cấu hình.',
    toggleOn: 'Server đã bật.',
    toggleOff: 'Server đã tắt.',
    chooseAction: 'Chọn hành động:',
    actions: { list: 'Liệt kê server', add: 'Thêm server', remove: 'Xóa server', toggle: 'Bật/tắt server', validate: 'Kiểm tra cấu hình' },
    serverTypes: { github: 'GitHub', jira: 'Jira', linear: 'Linear', notion: 'Notion', slack: 'Slack', google: 'Google Workspace', custom: 'Tùy chỉnh' }
  }
};

function getLang(): keyof typeof msgs {
  return 'en';
}

export const mcpCommand = new Command('mcp');

mcpCommand
  .description('Manage MCP server connections')
  .addCommand(
    new Command('list')
      .description('List configured MCP servers')
      .action(() => {
        const lang = getLang();
        const msgsLang = msgs[lang];
        const config = loadMcpConfig(process.cwd());
        if (config.servers.length === 0) {
          console.log(chalk.yellow(msgsLang.noServers));
          return;
        }

        const data = [
          [chalk.bold('ID'), chalk.bold('Name'), chalk.bold('Type'), chalk.bold('Status')],
          ...config.servers.map(s => [
            s.id,
            s.name,
            msgsLang.serverTypes[s.type as keyof typeof msgsLang.serverTypes],
            s.enabled ? chalk.green('ON') : chalk.red('OFF')
          ])
        ];

        console.log(chalk.blue(msgsLang.listHeader));
        console.log(table(data));
      })
  )
  .addCommand(
    new Command('add')
      .description('Add a new MCP server')
      .action(async () => {
        const lang = getLang();
        const msgsLang = msgs[lang];
        const answers = await inquirer.prompt([
          { type: 'input', name: 'id', message: msgsLang.enterId, validate: (v: string) => /^[a-z0-9]+(-[a-z0-9]+)*$/.test(v) || 'Must be kebab-case' },
          { type: 'input', name: 'name', message: msgsLang.enterName },
          {
            type: 'list',
            name: 'type',
            message: msgsLang.selectType,
            choices: Object.keys(msgsLang.serverTypes)
          },
          { type: 'input', name: 'url', message: msgsLang.enterUrl },
          { type: 'password', name: 'token', message: msgsLang.enterToken }
        ]);

        const server: MCPServerConfig = {
          id: answers.id,
          name: answers.name,
          type: answers.type,
          enabled: true,
          url: answers.url,
          token: answers.token
        };

        upsertMcpServer(process.cwd(), server);
        console.log(chalk.green(msgsLang.serverAdded));
      })
  )
  .addCommand(
    new Command('remove')
      .description('Remove an MCP server')
      .argument('<id>', 'Server ID to remove')
      .action((id: string) => {
        const lang = getLang();
        const msgsLang = msgs[lang];
        removeMcpServer(process.cwd(), id);
        console.log(chalk.green(msgsLang.serverRemoved));
      })
  )
  .addCommand(
    new Command('toggle')
      .description('Enable or disable an MCP server')
      .argument('<id>', 'Server ID to toggle')
      .action((id: string) => {
        const lang = getLang();
        const msgsLang = msgs[lang];
        const config = loadMcpConfig(process.cwd());
        const server = config.servers.find(s => s.id === id);
        if (!server) {
          console.log(chalk.red('Server not found'));
          return;
        }

        const enabled = !server.enabled;
        setMcpServerEnabled(process.cwd(), id, enabled);
        console.log(chalk.green(enabled ? msgsLang.toggleOn : msgsLang.toggleOff));
      })
  )
  .addCommand(
    new Command('validate')
      .description('Validate MCP configuration against registry contracts')
      .option('--json', 'Output as JSON')
      .option('--profile <path>', 'Optional project profile to validate')
      .action(async (opts) => {
        const lang = getLang();
        const msgsLang = msgs[lang];

        try {
          const registry = loadRegistry();
          const builtin = loadBuiltinProfiles();
          const profiles = [builtin.defaultProfile, builtin.offlineProfile];

          if (opts.profile) {
            profiles.push(loadProfile(opts.profile));
          }

          const validation = validateConfigs(registry, profiles);

          if (opts.json) {
            console.log(JSON.stringify(validation, null, 2));
            return;
          }

          if (validation.valid) {
            console.log(chalk.green('MCP configuration is valid.'));
            console.log(validation.summary);
            return;
          }

          console.log(chalk.red('MCP configuration validation failed.'));
          console.log(validation.summary);
          console.log('\nFailures:');
          for (const issue of validation.issues) {
            const prefix = issue.severity === 'error' ? chalk.red('[ERROR]') : chalk.yellow('[WARN]');
            console.log(`${prefix} ${issue.code}: ${issue.message}`);
            if (issue.context) {
              console.log(`  context: ${JSON.stringify(issue.context)}`);
            }
          }
        } catch (error) {
          console.error(chalk.red('Validation failed with error:'), error);
        }
      })
  )
  .addCommand(
    new Command('doctor')
      .description('Inspect project MCP setup and report health')
      .option('--json', 'Output as JSON')
      .option('--profile <name>', 'Profile name to use', 'default')
      .action(async (opts) => {
        const spinner = ora('Running MCP health check...').start();

        try {
          const registry = loadRegistry();
          const builtin = loadBuiltinProfiles();
          let profile = builtin.defaultProfile;
          if (opts.profile === 'offline-local' || opts.profile === 'offline') {
            profile = builtin.offlineProfile;
          }

          const report = runDoctor(process.cwd(), registry, profile);
          spinner.succeed('Health check complete');

          if (opts.json) {
            console.log(JSON.stringify(report, null, 2));
            return;
          }

          // Text output
          const healthColors = {
            healthy: chalk.green,
            degraded: chalk.yellow,
            critical: chalk.red,
          };
          const healthIcons = { healthy: '✓', degraded: '⚠', critical: '✗' };

          console.log(chalk.bold('\nMCP Doctor Report\n'));
          console.log(`Profile: ${report.profile}`);
          console.log(`Project: ${report.project_root}`);
          console.log(`Health:  ${healthColors[report.health](healthIcons[report.health] + ' ' + report.health)}\n`);

          // Connector summary
          console.log(chalk.bold('Connectors:'));
          const connectorData = [
            [chalk.bold('ID'), chalk.bold('Category'), chalk.bold('Status'), chalk.bold('Token'), chalk.bold('Mutations')],
            ...report.connectors.map(c => [
              c.server_id,
              c.category,
              c.status === 'enabled' ? chalk.green('enabled') :
                c.status === 'disabled' ? chalk.red('disabled') : chalk.gray('not configured'),
              c.has_token ? chalk.green('✓') : chalk.gray('—'),
              c.mutation_capabilities.length > 0 ? chalk.yellow(String(c.mutation_capabilities.length)) : chalk.gray('—'),
            ]),
          ];
          console.log(table(connectorData));

          // Workflow degradation
          const degraded = report.workflows.filter(w => w.degraded);
          if (degraded.length > 0) {
            console.log(chalk.bold(chalk.yellow('Degraded Workflows:')));
            for (const w of degraded) {
              console.log(`  ${chalk.yellow('⚠')} ${w.workflow_id}: ${w.degraded_reasons.join('; ')}`);
            }
          } else {
            console.log(chalk.green('All workflows operational.'));
          }

          // Mutation summary
          if (report.mutations.servers_with_mutations.length > 0) {
            console.log(chalk.bold('\nMutation Approval:'));
            console.log(`  Global policy: ${report.mutations.global_approval_required ? chalk.green('approval required') : chalk.yellow('not enforced')}`);
            console.log(`  Servers with mutations: ${report.mutations.servers_with_mutations.join(', ')}`);
          }

          // Summary
          console.log(chalk.bold('\nSummary:'));
          console.log(`  Connectors: ${report.summary.enabled} enabled, ${report.summary.disabled} disabled, ${report.summary.not_configured} not configured`);
          console.log(`  Workflows:  ${report.summary.degraded_workflows} degraded / ${report.summary.total_workflows} total`);

        } catch (error) {
          spinner.fail('Health check failed');
          console.error(chalk.red(String(error)));
        }
      })
  );

export default mcpCommand;
