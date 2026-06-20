import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import {
  generateRiskControlSummary,
  listProjectRisks,
  addProjectRisk,
  closeProjectRisk,
} from '@ai-pm/core/workflows';
import { MemoryStore, ApprovalQueue, LocalProjectStore } from '@ai-pm/core/runtime';

const msgs = {
  en: {
    title: 'Risk Register',
    noData: 'No risks found. Add risks via risk add.',
    done: 'Done',
    error: 'Failed to process risk command',
    approvalQueued: 'Approval item queued',
    approvalFailed: 'Approval queue unavailable',
  },
  vi: {
    title: 'Sổ Đăng Ký Rủi Ro',
    noData: 'Không có rủi ro. Dùng risk add để thêm.',
    done: 'Xong',
    error: 'Không thể xử lý lệnh risk',
    approvalQueued: 'Đã tạo mục phê duyệt',
    approvalFailed: 'Hàng đợi phê duyệt không khả dụng',
  },
};

function getLang(): 'en' | 'vi' {
  return 'en';
}

export const riskCommand = new Command('risk');

riskCommand
  .description('Manage project risk register')
  .action(async () => {
    const lang = getLang();
    const msgsLang = msgs[lang as 'en' | 'vi'];
    const spinner = ora('Loading risks...').start();
    try {
      const projectRoot = process.cwd();
      const store = new MemoryStore(projectRoot) as any;
      const risks = await listProjectRisks({ store });

      spinner.succeed(msgsLang.done);

      console.log(`\n# ${msgsLang.title}`);
      risks.length
        ? risks.forEach(risk => {
            console.log(`- ${risk.id}: ${risk.title} [${risk.status}] (${risk.probability}/${risk.impact})`);
          })
        : console.log(`- ${msgsLang.noData}`);
    } catch (error) {
      spinner.fail(msgsLang.error);
      console.error(error);
    }
  });

riskCommand
  .command('add')
  .description('Add a new risk')
  .requiredOption('--title <string>', 'Risk title')
  .option('--description <string>', 'Risk description', '')
  .option('--category <string>', 'Risk category', '')
  .requiredOption('--probability <string>', 'Risk probability: low|medium|high', 'medium')
  .requiredOption('--impact <string>', 'Risk impact: low|medium|high|critical', 'medium')
  .option('--owner <string>', 'Risk owner', '')
  .option('--mitigation <string>', 'Mitigation plan', '')
  .option('--due-date <string>', 'Due date YYYY-MM-DD')
  .action(async opts => {
    const lang = getLang();
    const msgsLang = msgs[lang as 'en' | 'vi'];
    const spinner = ora('Adding risk...').start();
    try {
      const projectRoot = process.cwd();
      const store = new MemoryStore(projectRoot) as any;
      const localStore = new LocalProjectStore(projectRoot) as any;
      const approvalQueue = new ApprovalQueue(projectRoot) as any;

      const result = await addProjectRisk({
        store,
        localStore,
        approvalQueue,
        input: {
          projectId: 'local-project',
          title: opts.title,
          description: opts.description,
          category: opts.category,
          probability: opts.probability,
          impact: opts.impact,
          owner: opts.owner,
          mitigation: opts.mitigation,
          dueDate: opts.dueDate,
        },
      });

      spinner.succeed(msgsLang.done);
      console.log(`Added risk: ${result.risk.id}`);
      if (result.approvalItemId) {
        console.log(`${msgsLang.approvalQueued}: ${result.approvalItemId}`);
      } else {
        console.log(msgsLang.approvalFailed);
      }
    } catch (error) {
      spinner.fail(msgsLang.error);
      console.error(error);
    }
  });

riskCommand
  .command('close <id>')
  .description('Close a risk with evidence')
  .option('--evidence <string>', 'Closure evidence', 'Closed by PM')
  .action(async (id, opts) => {
    const lang = getLang();
    const msgsLang = msgs[lang as 'en' | 'vi'];
    const spinner = ora('Closing risk...').start();
    try {
      const projectRoot = process.cwd();
      const store = new MemoryStore(projectRoot) as any;
      const localStore = new LocalProjectStore(projectRoot) as any;
      const approvalQueue = new ApprovalQueue(projectRoot) as any;

      const result = await closeProjectRisk({
        store,
        localStore,
        approvalQueue,
        riskId: id,
        evidence: opts.evidence,
      });

      if (!result.risk) {
        spinner.warn(`Risk ${id} not found`);
        return;
      }

      spinner.succeed(msgsLang.done);
      console.log(`Closed risk: ${result.risk.id}`);
      if (result.approvalItemId) {
        console.log(`${msgsLang.approvalQueued}: ${result.approvalItemId}`);
      } else {
        console.log(msgsLang.approvalFailed);
      }
    } catch (error) {
      spinner.fail(msgsLang.error);
      console.error(error);
    }
  });
