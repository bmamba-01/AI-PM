import { Command } from 'commander';
import chalk from 'chalk';
import inquirer from 'inquirer';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { ApprovalQueue, type ApprovalItem } from '@ai-pm/core/runtime';
import { table } from 'table';

// ─── Bilingual messages ──────────────────────────────────────────────────────

const msgs = {
  en: {
    title: 'Approval Queue',
    listTitle: 'Approval Items',
    countTitle: 'Approval Queue Status',
    detailTitle: 'Approval Detail',
    policyTitle: 'Approval Policies',
    empty: 'No approval items found.',
    noPolicies: 'No approval policies configured.',
    notFound: (id: string) => `Approval item "${id}" not found.`,
    invalidState: (id: string, status: string) => `Cannot decide on item ${id} (status: ${status}). Only pending or revision_requested items can be decided.`,
    approved: (id: string) => `Approved ${id}`,
    rejected: (id: string) => `Rejected ${id}`,
    revisionRequested: (id: string) => `Revision requested for ${id}`,
    delegated: (id: string, user: string) => `Delegated ${id} to ${user}`,
    confirmApprove: 'Approve',
    confirmReject: 'Reject',
    confirmRevision: 'Request Revision',
    confirmDelegate: 'Delegate',
    continuePrompt: 'Continue? (y/N)',
    // Table headers
    hdrId: 'ID',
    hdrTitle: 'Title',
    hdrPriority: 'Priority',
    hdrStatus: 'Status',
    hdrSource: 'Source',
    hdrAge: 'Age',
    hdrTarget: 'Target',
    // Detail labels
    lblTitle: 'Title',
    lblType: 'Type',
    lblPriority: 'Priority',
    lblStatus: 'Status',
    lblConfidence: 'Confidence',
    lblWorkflow: 'Workflow',
    lblRunId: 'Run ID',
    lblAgent: 'Agent',
    lblProject: 'Project',
    lblTarget: 'Target',
    lblDescription: 'Description',
    lblSummary: 'Summary of Changes',
    lblSources: 'Source References',
    lblCreated: 'Created',
    lblDeadline: 'Deadline',
    lblRevision: 'Revision',
    lblDecision: 'Decision',
    lblExecution: 'Execution',
    lblError: 'Error',
    // Errors
    errMissingReason: 'Error: --reason is required for rejection (min 10 characters)',
    errMissingNotes: 'Error: --notes is required for revision request (min 10 characters)',
  },
  vi: {
    title: 'Hàng Đợi Phê Duyệt',
    listTitle: 'Mục Phê Duyệt',
    countTitle: 'Trạng Thái Hàng Đợi',
    detailTitle: 'Chi Tiết Phê Duyệt',
    policyTitle: 'Chính Sách Phê Duyệt',
    empty: 'Không tìm thấy mục phê duyệt nào.',
    noPolicies: 'Chưa cấu hình chính sách phê duyệt nào.',
    notFound: (id: string) => `Không tìm thấy mục phê duyệt "${id}".`,
    invalidState: (id: string, status: string) => `Không thể quyết định mục ${id} (trạng thái: ${status}).`,
    approved: (id: string) => `Đã phê duyệt ${id}`,
    rejected: (id: string) => `Đã từ chối ${id}`,
    revisionRequested: (id: string) => `Yêu cầu chỉnh sửa ${id}`,
    delegated: (id: string, user: string) => `Đã ủy quyền ${id} cho ${user}`,
    confirmApprove: 'Phê Duyệt',
    confirmReject: 'Từ Chối',
    confirmRevision: 'Yêu Cầu Chỉnh Sửa',
    confirmDelegate: 'Ủy Quyền',
    continuePrompt: 'Tiếp tục? (y/N)',
    hdrId: 'Mã',
    hdrTitle: 'Tiêu Đề',
    hdrPriority: 'Ưu Tiên',
    hdrStatus: 'Trạng Thái',
    hdrSource: 'Nguồn',
    hdrAge: 'Tuổi',
    hdrTarget: 'Đích',
    lblTitle: 'Tiêu Đề',
    lblType: 'Loại',
    lblPriority: 'Ưu Tiên',
    lblStatus: 'Trạng Thái',
    lblConfidence: 'Độ Tin Cậy',
    lblWorkflow: 'Quy Trình',
    lblRunId: 'Mã Chạy',
    lblAgent: 'Đại Diện',
    lblProject: 'Dự Án',
    lblTarget: 'Đích',
    lblDescription: 'Mô Tả',
    lblSummary: 'Tóm Tắt Thay Đổi',
    lblSources: 'Nguồn Tham Chiếu',
    lblCreated: 'Tạo',
    lblDeadline: 'Hạn',
    lblRevision: 'Phiên Bản',
    lblDecision: 'Quyết Định',
    lblExecution: 'Thực Thi',
    lblError: 'Lỗi',
    errMissingReason: 'Lỗi: --reason bắt buộc khi từ chối (tối thiểu 10 ký tự)',
    errMissingNotes: 'Lỗi: --notes bắt buộc khi yêu cầu chỉnh sửa (tối thiểu 10 ký tự)',
  },
};

function getLang(): keyof typeof msgs {
  return 'en';
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const PRIORITY_COLORS: Record<string, (s: string) => string> = {
  critical: (s: string) => chalk.red.bold(s),
  high: (s: string) => chalk.hex('#FF9500')(s),
  medium: (s: string) => chalk.yellow(s),
  low: (s: string) => chalk.gray(s),
};

const STATUS_COLORS: Record<string, (s: string) => string> = {
  pending: (s: string) => chalk.yellow(s),
  revision_requested: (s: string) => chalk.cyan(s),
  expired: (s: string) => chalk.red.dim(s),
  approved: (s: string) => chalk.green(s),
  rejected: (s: string) => chalk.red(s),
  cancelled: (s: string) => chalk.gray(s),
  executing: (s: string) => chalk.blue(s),
  executed: (s: string) => chalk.green.dim(s),
  execution_failed: (s: string) => chalk.bgRed.white(s),
  draft: (s: string) => chalk.gray(s),
};

function colorPriority(p: string): string {
  return (PRIORITY_COLORS[p] ?? ((s: string) => s))(p);
}

function colorStatus(s: string): string {
  return (STATUS_COLORS[s] ?? ((x: string) => x))(s);
}

function confidenceColor(score: number): string {
  if (score >= 80) return chalk.green(`${score}%`);
  if (score >= 60) return chalk.hex('#FF9500')(`${score}%`);
  return chalk.red(`${score}%`);
}

function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.max(0, Math.floor(diffMs / 60000));
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d`;
  return `${Math.floor(days / 30)}M`;
}

function truncate(s: string, max: number): string {
  return s.length > max ? s.slice(0, max - 1) + '…' : s;
}

function approvalsFilePath(projectRoot: string): string {
  return path.join(projectRoot, '.ai-pm', 'approvals.json');
}

async function readAllApprovals(projectRoot: string): Promise<ApprovalItem[]> {
  try {
    const raw = await readFile(approvalsFilePath(projectRoot), 'utf-8');
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error: unknown) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return [];
    throw error;
  }
}

async function writeAllApprovals(projectRoot: string, items: ApprovalItem[]): Promise<void> {
  await mkdir(path.dirname(approvalsFilePath(projectRoot)), { recursive: true });
  await writeFile(approvalsFilePath(projectRoot), JSON.stringify(items, null, 2), 'utf-8');
}

// ─── Parent command ──────────────────────────────────────────────────────────

export const approvalCommand = new Command('approval');

approvalCommand
  .description('Manage the approval queue for external mutations');

// ─── approval list ───────────────────────────────────────────────────────────

approvalCommand
  .addCommand(
    new Command('list')
      .description('List approval items with filters')
      .option('--status <status>', 'Filter by status')
      .option('--priority <priority>', 'Filter by priority')
      .option('--workflow <id>', 'Filter by originating workflow')
      .option('--json', 'Output as JSON', false)
      .option('--limit <n>', 'Max items to show', '20')
      .action(async (opts) => {
        const lang = getLang();
        const msgsLang = msgs[lang];
        const queue = new ApprovalQueue(process.cwd());

        try {
          const items = await queue.listItems({
            status: opts.status,
            priority: opts.priority,
          });

          let filtered = items;
          if (opts.workflow) {
            filtered = items.filter(i => i.workflow_id === opts.workflow);
          }

          const limit = parseInt(opts.limit, 10) || 20;
          const limited = filtered.slice(0, limit);
          const counts = await queue.getCounts();

          if (opts.json) {
            console.log(JSON.stringify({ items: limited, total: filtered.length, counts }, null, 2));
            return;
          }

          if (limited.length === 0) {
            console.log(chalk.yellow(msgsLang.empty));
            return;
          }

          const data = [
            [chalk.bold(msgsLang.hdrId), chalk.bold(msgsLang.hdrTitle), chalk.bold(msgsLang.hdrPriority), chalk.bold(msgsLang.hdrStatus), chalk.bold(msgsLang.hdrSource), chalk.bold(msgsLang.hdrAge), chalk.bold(msgsLang.hdrTarget)],
            ...limited.map(item => [
              item.approval_id.slice(0, 8),
              truncate(item.title, 30),
              colorPriority(item.priority),
              colorStatus(item.status),
              item.requested_by_role,
              timeAgo(item.created_at),
              item.target_system,
            ]),
          ];

          console.log(chalk.blue(`\n${msgsLang.listTitle}\n`));
          console.log(table(data));
          console.log(chalk.gray(`Showing ${limited.length} of ${filtered.length} items`));
        } catch (error) {
          console.error(chalk.red(String(error)));
        }
      })
  );

// ─── approval show ───────────────────────────────────────────────────────────

approvalCommand
  .addCommand(
    new Command('show')
      .description('Show full detail of a single approval item')
      .argument('<id>', 'Approval item ID')
      .option('--json', 'Output as JSON', false)
      .option('--audit', 'Include full audit trail', false)
      .action(async (id: string, opts) => {
        const lang = getLang();
        const msgsLang = msgs[lang];
        const queue = new ApprovalQueue(process.cwd());

        try {
          const item = await queue.getItem(id);
          if (!item) {
            console.error(chalk.red(msgsLang.notFound(id)));
            process.exit(1);
          }

          if (opts.json) {
            console.log(JSON.stringify(item, null, 2));
            return;
          }

          console.log(chalk.bold(`\n${msgsLang.detailTitle}: ${item.approval_id.slice(0, 8)}\n`));
          const field = (label: string, value: string) =>
            console.log(`  ${label.padEnd(16)} ${value}`);

          field(msgsLang.lblTitle, item.title);
          field(msgsLang.lblType, item.action_type);
          field(msgsLang.lblPriority, colorPriority(item.priority));
          field(msgsLang.lblStatus, colorStatus(item.status));
          field(msgsLang.lblConfidence, confidenceColor(item.confidence));
          console.log();
          field(msgsLang.lblWorkflow, item.workflow_id);
          field(msgsLang.lblRunId, item.run_id);
          field(msgsLang.lblAgent, `${item.requested_by_agent} (${item.requested_by_role})`);
          field(msgsLang.lblProject, item.project_id);
          console.log();
          field(msgsLang.lblTarget, `${item.target_system} ${item.target_id}`);
          console.log();
          console.log(`  ${msgsLang.lblDescription}:`);
          console.log(`    ${item.description}`);
          console.log();
          console.log(`  ${msgsLang.lblSummary}:`);
          console.log(`    ${item.summary_diff}`);
          console.log();

          if (item.source_refs.length > 0) {
            console.log(`  ${msgsLang.lblSources}:`);
            item.source_refs.forEach((ref, i) => {
              console.log(`    ${i + 1}. ${ref.type} — ${ref.title ?? ref.id}`);
            });
            console.log();
          }

          field(msgsLang.lblCreated, new Date(item.created_at).toISOString().replace('T', ' ').slice(0, 19) + ' UTC');
          if (item.deadline) field(msgsLang.lblDeadline, new Date(item.deadline).toISOString().replace('T', ' ').slice(0, 19) + ' UTC');
          field(msgsLang.lblRevision, `Round ${item.revision_round} of 3`);
          if (item.decided_by) field(msgsLang.lblDecision, `${item.decision} by ${item.decided_by}`);
          if (item.rejection_reason) field(msgsLang.lblError, item.rejection_reason);
          if (item.revision_notes) field('Revision Notes', item.revision_notes);
          console.log();
          field(msgsLang.lblExecution, item.execution_status);
          if (item.execution_error) field(msgsLang.lblError, item.execution_error);
        } catch (error) {
          console.error(chalk.red(String(error)));
        }
      })
  );

// ─── approval decide ─────────────────────────────────────────────────────────

approvalCommand
  .addCommand(
    new Command('decide')
      .description('Submit a decision on an approval item')
      .argument('<id>', 'Approval item ID')
      .argument('<decision>', 'Decision: approve, reject, or revision')
      .option('--reason <text>', 'Rejection reason (min 10 chars, required for reject)')
      .option('--notes <text>', 'Revision instructions (min 10 chars, required for revision)')
      .option('--json', 'Output result as JSON', false)
      .option('--yes', 'Skip confirmation prompt', false)
      .action(async (id: string, decision: string, opts) => {
        const lang = getLang();
        const msgsLang = msgs[lang];
        const queue = new ApprovalQueue(process.cwd());

        const decisionMap: Record<string, string> = {
          approve: 'approve',
          reject: 'reject',
          revision: 'revision_requested',
        };
        const mappedDecision = decisionMap[decision];
        if (!mappedDecision) {
          console.error(chalk.red(`Invalid decision "${decision}". Use: approve, reject, or revision`));
          process.exit(2);
        }

        if (mappedDecision === 'reject' && (!opts.reason || opts.reason.length < 10)) {
          console.error(chalk.red(msgsLang.errMissingReason));
          process.exit(2);
        }
        if (mappedDecision === 'revision_requested' && (!opts.notes || opts.notes.length < 10)) {
          console.error(chalk.red(msgsLang.errMissingNotes));
          process.exit(2);
        }

        try {
          const item = await queue.getItem(id);
          if (!item) {
            console.error(chalk.red(msgsLang.notFound(id)));
            process.exit(1);
          }

          if (!['pending', 'revision_requested'].includes(item.status)) {
            console.error(chalk.red(msgsLang.invalidState(id, item.status)));
            process.exit(1);
          }

          if (!opts.yes) {
            const decisionLabel =
              mappedDecision === 'approve' ? msgsLang.confirmApprove :
              mappedDecision === 'reject' ? msgsLang.confirmReject :
              msgsLang.confirmRevision;

            console.log(chalk.bold(`\nYou are about to ${decisionLabel.toUpperCase()} item ${id.slice(0, 8)}:`));
            console.log(`  Title:    ${item.title}`);
            console.log(`  Target:   ${item.target_system} ${item.target_id}`);
            console.log(`  Priority: ${item.priority}`);
            console.log();

            const { confirm } = await inquirer.prompt([{
              type: 'confirm',
              name: 'confirm',
              message: msgsLang.continuePrompt,
              default: false,
            }]);

            if (!confirm) {
              console.log(chalk.gray('Cancelled.'));
              return;
            }
          }

          const result = await queue.decide(id, {
            decided_by: 'cli-user',
            decision: mappedDecision as 'approve' | 'reject' | 'revision_requested',
            reason: opts.reason,
            notes: opts.notes,
          });

          if (opts.json) {
            console.log(JSON.stringify(result, null, 2));
            return;
          }

          if (mappedDecision === 'approve') {
            console.log(chalk.green(`✓ ${msgsLang.approved(id.slice(0, 8))}`));
          } else if (mappedDecision === 'reject') {
            console.log(chalk.red(`✗ ${msgsLang.rejected(id.slice(0, 8))}`));
            console.log(`  Reason: "${opts.reason}"`);
          } else {
            console.log(chalk.cyan(`↻ ${msgsLang.revisionRequested(id.slice(0, 8))}`));
            console.log(`  Notes: "${opts.notes}"`);
            console.log(`  Revision round: ${result.revision_round} of 3`);
          }
        } catch (error) {
          console.error(chalk.red(String(error)));
          process.exit(1);
        }
      })
  );

// ─── approval delegate ───────────────────────────────────────────────────────

approvalCommand
  .addCommand(
    new Command('delegate')
      .description('Delegate an approval item to another user')
      .argument('<id>', 'Approval item ID')
      .argument('<user>', 'Target user ID or name')
      .option('--note <text>', 'Optional note for the delegate')
      .option('--json', 'Output result as JSON', false)
      .option('--yes', 'Skip confirmation prompt', false)
      .action(async (id: string, user: string, opts) => {
        const lang = getLang();
        const msgsLang = msgs[lang];

        try {
          const items = await readAllApprovals(process.cwd());
          const item = items.find(i => i.approval_id === id);
          if (!item) {
            console.error(chalk.red(msgsLang.notFound(id)));
            process.exit(1);
          }

          if (!['pending', 'revision_requested'].includes(item.status)) {
            console.error(chalk.red(msgsLang.invalidState(id, item.status)));
            process.exit(1);
          }

          if (!opts.yes) {
            console.log(chalk.bold(`\nDelegate item ${id.slice(0, 8)} to ${user}?`));
            console.log(`  Title: ${item.title}`);
            if (opts.note) console.log(`  Note:  ${opts.note}`);
            console.log();

            const { confirm } = await inquirer.prompt([{
              type: 'confirm',
              name: 'confirm',
              message: msgsLang.continuePrompt,
              default: false,
            }]);

            if (!confirm) {
              console.log(chalk.gray('Cancelled.'));
              return;
            }
          }

          const now = new Date().toISOString();
          item.delegated_to = user;
          item.updated_at = now;
          if (opts.note) item.revision_notes = opts.note;

          await writeAllApprovals(process.cwd(), items);

          if (opts.json) {
            console.log(JSON.stringify(item, null, 2));
            return;
          }

          console.log(chalk.green(`✓ ${msgsLang.delegated(id.slice(0, 8), user)}`));
          if (opts.note) console.log(`  Note: "${opts.note}"`);
        } catch (error) {
          console.error(chalk.red(String(error)));
          process.exit(1);
        }
      })
  );

// ─── approval count ──────────────────────────────────────────────────────────

approvalCommand
  .addCommand(
    new Command('count')
      .description('Show count of approval items by status')
      .option('--json', 'Output as JSON', false)
      .action(async (opts) => {
        const lang = getLang();
        const msgsLang = msgs[lang];
        const queue = new ApprovalQueue(process.cwd());

        try {
          const counts = await queue.getCounts();

          if (opts.json) {
            console.log(JSON.stringify(counts, null, 2));
            return;
          }

          console.log(chalk.bold(`\n${msgsLang.countTitle}\n`));
          const total = Object.values(counts).reduce((a, b) => a + b, 0);
          const data = [
            [chalk.bold('Status'), chalk.bold('Count')],
            ...Object.entries(counts).map(([status, count]) => [
              colorStatus(status),
              String(count),
            ]),
            [chalk.bold('Total'), chalk.bold(String(total))],
          ];
          console.log(table(data));
        } catch (error) {
          console.error(chalk.red(String(error)));
        }
      })
  );

// ─── approval policy list ────────────────────────────────────────────────────

const policyCommand = new Command('policy')
  .description('Manage auto-approval policy rules');

policyCommand
  .addCommand(
    new Command('list')
      .description('List active auto-approval policy rules')
      .option('--json', 'Output as JSON', false)
      .action(async (opts) => {
        const lang = getLang();
        const msgsLang = msgs[lang];

        if (opts.json) {
          console.log(JSON.stringify({ policies: [], total: 0 }, null, 2));
          return;
        }

        console.log(chalk.bold(`\n${msgsLang.policyTitle}\n`));
        console.log(chalk.gray(msgsLang.noPolicies));
        console.log(chalk.gray('Create policies using "Approve & Remember" in the desktop app.'));
      })
  );

policyCommand
  .addCommand(
    new Command('revoke')
      .description('Revoke an auto-approval policy rule')
      .argument('<id>', 'Policy rule ID')
      .option('--json', 'Output result as JSON', false)
      .option('--yes', 'Skip confirmation prompt', false)
      .action(async (id: string, opts) => {
        if (!opts.yes) {
          const { confirm } = await inquirer.prompt([{
            type: 'confirm',
            name: 'confirm',
            message: `Revoke policy rule ${id}? Continue? (y/N)`,
            default: false,
          }]);
          if (!confirm) {
            console.log(chalk.gray('Cancelled.'));
            return;
          }
        }

        if (opts.json) {
          console.log(JSON.stringify({ revoked: false, message: 'Policy store not yet implemented' }, null, 2));
          return;
        }

        console.log(chalk.yellow(`⚠ Policy store not yet implemented. Revoke for "${id}" would happen here.`));
      })
  );

approvalCommand.addCommand(policyCommand);
