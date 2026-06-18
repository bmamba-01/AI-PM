import { Command } from 'commander';
import inquirer from 'inquirer';
import chalk from 'chalk';
import ora from 'ora';
import {
  loadMcpConfig,
  saveMcpConfig,
  upsertMcpServer,
  removeMcpServer,
  setMcpServerEnabled,
  MCPServerConfig
} from '@ai-pm/mcp/connectionManager';
import { table } from 'table';

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
    actions: { list: 'List servers', add: 'Add server', remove: 'Remove server', toggle: 'Enable/Disable server' },
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
    actions: { list: 'Liệt kê server', add: 'Thêm server', remove: 'Xóa server', toggle: 'Bật/tắt server' },
    serverTypes: { github: 'GitHub', jira: 'Jira', linear: 'Linear', notion: 'Notion', slack: 'Slack', google: 'Google Workspace', custom: 'Tùy chỉnh' }
  }
};

function getLang(): keyof typeof msgs {
  // For now default to English; later read from project config
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
  );
