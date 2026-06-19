import { Command } from 'commander';
import chalk from 'chalk';
import { table } from 'table';
import { MemoryStore, type TaskStatus, type ArtifactStatus } from '@ai-pm/core/runtime';

// ─── Valid status values ────────────────────────────────────────────────────

const VALID_TASK_STATUSES: TaskStatus[] = ['pending', 'in_progress', 'completed', 'failed', 'cancelled'];
const VALID_ARTIFACT_STATUSES: ArtifactStatus[] = ['active', 'draft', 'archived', 'deleted'];

function isValidTaskStatus(s: string): s is TaskStatus {
  return (VALID_TASK_STATUSES as string[]).includes(s);
}

function isValidArtifactStatus(s: string): s is ArtifactStatus {
  return (VALID_ARTIFACT_STATUSES as string[]).includes(s);
}

// ─── Short ID resolution ────────────────────────────────────────────────────

interface IdMatch {
  exact: boolean;
  matched: { id: string; label: string }[];
}

function resolveId(
  input: string,
  items: { id: string; label: string }[],
): IdMatch {
  // Exact match
  const exact = items.find(i => i.id === input);
  if (exact) return { exact: true, matched: [exact] };

  // Prefix match
  const prefixMatches = items.filter(i => i.id.startsWith(input));

  if (prefixMatches.length === 0) {
    return { exact: false, matched: [] };
  }

  if (prefixMatches.length === 1) {
    return { exact: false, matched: prefixMatches };
  }

  // Ambiguous — multiple matches
  return { exact: false, matched: prefixMatches };
}

// ─── Bilingual messages ──────────────────────────────────────────────────────

const msgs = {
  en: {
    title: 'Memory Store',
    summaryTitle: 'Memory Summary',
    tasksTitle: 'Memory Tasks',
    artifactsTitle: 'Memory Artifacts',
    loading: 'Loading...',
    done: 'Done',
    empty: 'No items found.',
    notFound: (type: string, id: string) => `${type} "${id}" not found.`,
    archived: (id: string) => `Artifact "${id}" archived.`,
    // Summary labels
    totalTasks: 'Total Tasks',
    completedTasks: 'Completed Tasks',
    totalArtifacts: 'Total Artifacts',
    archivedArtifacts: 'Archived Artifacts',
    staleArtifacts: 'Stale Artifacts',
    // Table headers
    hdrId: 'ID',
    hdrName: 'Name',
    hdrStatus: 'Status',
    hdrType: 'Type',
    hdrVersion: 'Ver',
    hdrAssigned: 'Assigned',
    hdrCreated: 'Created',
    hdrPath: 'Path',
    // Errors
    invalidTaskStatus: (s: string) => `Invalid task status "${s}". Allowed: ${VALID_TASK_STATUSES.join(', ')}`,
    invalidArtifactStatus: (s: string) => `Invalid artifact status "${s}". Allowed: ${VALID_ARTIFACT_STATUSES.join(', ')}`,
    ambiguousId: (input: string, matches: { id: string; label: string }[]) =>
      `Ambiguous ID "${input}". Did you mean:\n${matches.map(m => `  ${m.id.slice(0, 8)} — ${m.label}`).join('\n')}`,
    prefixNotFound: (input: string) => `No artifact found matching prefix "${input}".`,
    reasonTooShort: 'Reason must be at least 3 characters (or omit --reason to use default).',
  },
  vi: {
    title: 'Lưu Trữ Bộ Nhớ',
    summaryTitle: 'Tóm Tắt Bộ Nhớ',
    tasksTitle: 'Công Việc Bộ Nhớ',
    artifactsTitle: 'Sản Phẩm Bộ Nhớ',
    loading: 'Đang tải...',
    done: 'Xong',
    empty: 'Không tìm thấy mục nào.',
    notFound: (type: string, id: string) => `${type} "${id}" không tìm thấy.`,
    archived: (id: string) => `Sản phẩm "${id}" đã lưu trữ.`,
    totalTasks: 'Tổng Công Việc',
    completedTasks: 'Công Việc Hoàn Thành',
    totalArtifacts: 'Tổng Sản Phẩm',
    archivedArtifacts: 'Sản Phẩm Lưu Trữ',
    staleArtifacts: 'Sản Phẩm Cũ',
    hdrId: 'Mã',
    hdrName: 'Tên',
    hdrStatus: 'Trạng Thái',
    hdrType: 'Loại',
    hdrVersion: 'Ph.',
    hdrAssigned: 'Giao Cho',
    hdrCreated: 'Tạo',
    hdrPath: 'Đường Dẫn',
    invalidTaskStatus: (s: string) => `Trạng thái "${s}" không hợp lệ. Cho phép: ${VALID_TASK_STATUSES.join(', ')}`,
    invalidArtifactStatus: (s: string) => `Trạng thái "${s}" không hợp lệ. Cho phép: ${VALID_ARTIFACT_STATUSES.join(', ')}`,
    ambiguousId: (input: string, matches: { id: string; label: string }[]) =>
      `Mã "${input}" không rõ ràng. Bạn muốn:\n${matches.map(m => `  ${m.id.slice(0, 8)} — ${m.label}`).join('\n')}`,
    prefixNotFound: (input: string) => `Không tìm thấy sản phẩm nào khớp tiền tố "${input}".`,
    reasonTooShort: 'Lý do phải ít nhất 3 ký tự (hoặc bỏ qua --reason để dùng mặc định).',
  },
};

function getLang(): keyof typeof msgs {
  return 'en';
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const TASK_STATUS_COLORS: Record<string, (s: string) => string> = {
  pending: (s: string) => chalk.yellow(s),
  in_progress: (s: string) => chalk.blue(s),
  completed: (s: string) => chalk.green(s),
  failed: (s: string) => chalk.red(s),
  cancelled: (s: string) => chalk.gray(s),
};

const ARTIFACT_STATUS_COLORS: Record<string, (s: string) => string> = {
  active: (s: string) => chalk.green(s),
  draft: (s: string) => chalk.yellow(s),
  archived: (s: string) => chalk.gray(s),
  deleted: (s: string) => chalk.red(s),
};

function colorTaskStatus(s: string): string {
  return (TASK_STATUS_COLORS[s] ?? ((x: string) => x))(s);
}

function colorArtifactStatus(s: string): string {
  return (ARTIFACT_STATUS_COLORS[s] ?? ((x: string) => x))(s);
}

function truncate(s: string, max: number): string {
  return s.length > max ? s.slice(0, max - 1) + '…' : s;
}

function shortId(id: string): string {
  return id.slice(0, 8);
}

function validateReason(reason: string | undefined, json: boolean): string {
  if (!reason || reason.trim() === '') {
    return 'Archived via CLI by user';
  }
  if (reason.trim().length < 3) {
    const errMsg = 'Reason must be at least 3 characters (or omit --reason to use default).';
    if (json) {
      console.log(JSON.stringify({ error: { code: 'REASON_TOO_SHORT', message: errMsg } }, null, 2));
    } else {
      console.error(chalk.red(`Error: ${errMsg}`));
    }
    process.exit(1);
  }
  return reason.trim();
}

// ─── Parent command ──────────────────────────────────────────────────────────

export const memoryCommand = new Command('memory');

memoryCommand
  .description('Manage project runtime memory (tasks, artifacts, lifecycle)');

// ─── memory summary ──────────────────────────────────────────────────────────

memoryCommand
  .addCommand(
    new Command('summary')
      .description('Show memory summary counts')
      .option('--json', 'Output as JSON', false)
      .action(async (opts) => {
        const lang = getLang();
        const msgsLang = msgs[lang];
        const store = new MemoryStore(process.cwd());

        try {
          const summary = await store.getSummary();

          if (opts.json) {
            console.log(JSON.stringify(summary, null, 2));
            return;
          }

          console.log(chalk.bold(`\n${msgsLang.summaryTitle}\n`));
          const data = [
            [chalk.bold('Metric'), chalk.bold('Count')],
            [msgsLang.totalTasks, String(summary.totalTasks)],
            [msgsLang.completedTasks, chalk.green(String(summary.completedTasks))],
            [msgsLang.totalArtifacts, String(summary.totalArtifacts)],
            [msgsLang.archivedArtifacts, chalk.gray(String(summary.archivedArtifacts))],
            [msgsLang.staleArtifacts, summary.staleArtifacts > 0 ? chalk.yellow(String(summary.staleArtifacts)) : chalk.green('0')],
          ];
          console.log(table(data));
        } catch (error) {
          console.error(chalk.red(String(error)));
          process.exit(1);
        }
      })
  );

// ─── memory tasks ────────────────────────────────────────────────────────────

const tasksCommand = new Command('tasks')
  .description('Manage memory tasks');

tasksCommand
  .addCommand(
    new Command('list')
      .description('List memory tasks')
      .option('--status <status>', 'Filter by status: pending, in_progress, completed, failed, cancelled')
      .option('--json', 'Output as JSON', false)
      .action(async (opts) => {
        const lang = getLang();
        const msgsLang = msgs[lang];
        const store = new MemoryStore(process.cwd());

        // Validate status filter
        if (opts.status && !isValidTaskStatus(opts.status)) {
          if (opts.json) {
            console.log(JSON.stringify({ error: { code: 'INVALID_STATUS', message: msgsLang.invalidTaskStatus(opts.status) } }, null, 2));
          } else {
            console.error(chalk.red(`Error: ${msgsLang.invalidTaskStatus(opts.status)}`));
          }
          process.exit(1);
        }

        try {
          const filter = opts.status ? { status: opts.status as TaskStatus } : undefined;
          const tasks = await store.listTasks(filter);

          if (opts.json) {
            console.log(JSON.stringify({ tasks, total: tasks.length }, null, 2));
            return;
          }

          if (tasks.length === 0) {
            console.log(chalk.yellow(msgsLang.empty));
            return;
          }

          const data = [
            [chalk.bold(msgsLang.hdrId), chalk.bold(msgsLang.hdrName), chalk.bold(msgsLang.hdrStatus), chalk.bold(msgsLang.hdrAssigned), chalk.bold(msgsLang.hdrCreated)],
            ...tasks.map(t => [
              shortId(t.task_id),
              truncate(t.name, 30),
              colorTaskStatus(t.status),
              t.assigned_to,
              new Date(t.created_at).toISOString().slice(0, 10),
            ]),
          ];

          console.log(chalk.blue(`\n${msgsLang.tasksTitle}\n`));
          console.log(table(data));
          console.log(chalk.gray(`${tasks.length} task(s)`));
        } catch (error) {
          console.error(chalk.red(String(error)));
          process.exit(1);
        }
      })
  );

memoryCommand.addCommand(tasksCommand);

// ─── memory artifacts ────────────────────────────────────────────────────────

const artifactsCommand = new Command('artifacts')
  .description('Manage memory artifacts');

artifactsCommand
  .addCommand(
    new Command('list')
      .description('List memory artifacts')
      .option('--status <status>', 'Filter by status: active, draft, archived, deleted')
      .option('--type <type>', 'Filter by type (e.g., doc, schema, code)')
      .option('--json', 'Output as JSON', false)
      .action(async (opts) => {
        const lang = getLang();
        const msgsLang = msgs[lang];
        const store = new MemoryStore(process.cwd());

        // Validate status filter
        if (opts.status && !isValidArtifactStatus(opts.status)) {
          if (opts.json) {
            console.log(JSON.stringify({ error: { code: 'INVALID_STATUS', message: msgsLang.invalidArtifactStatus(opts.status) } }, null, 2));
          } else {
            console.error(chalk.red(`Error: ${msgsLang.invalidArtifactStatus(opts.status)}`));
          }
          process.exit(1);
        }

        try {
          const filter: { status?: ArtifactStatus; type?: string } = {};
          if (opts.status) filter.status = opts.status as ArtifactStatus;
          if (opts.type) filter.type = opts.type;

          const artifacts = await store.listArtifacts(
            Object.keys(filter).length > 0 ? filter : undefined
          );

          if (opts.json) {
            console.log(JSON.stringify({ artifacts, total: artifacts.length }, null, 2));
            return;
          }

          if (artifacts.length === 0) {
            console.log(chalk.yellow(msgsLang.empty));
            return;
          }

          const data = [
            [chalk.bold(msgsLang.hdrId), chalk.bold(msgsLang.hdrName), chalk.bold(msgsLang.hdrType), chalk.bold(msgsLang.hdrStatus), chalk.bold(msgsLang.hdrVersion), chalk.bold(msgsLang.hdrPath)],
            ...artifacts.map(a => [
              shortId(a.artifact_id),
              truncate(a.name, 25),
              a.type,
              colorArtifactStatus(a.status),
              String(a.version),
              truncate(a.path, 30),
            ]),
          ];

          console.log(chalk.blue(`\n${msgsLang.artifactsTitle}\n`));
          console.log(table(data));
          console.log(chalk.gray(`${artifacts.length} artifact(s)`));
        } catch (error) {
          console.error(chalk.red(String(error)));
          process.exit(1);
        }
      })
  );

artifactsCommand
  .addCommand(
    new Command('archive')
      .description('Archive a memory artifact')
      .argument('<artifact_id>', 'Artifact ID or short prefix (min 8 chars)')
      .option('--reason <text>', 'Archive reason (min 3 characters)')
      .option('--json', 'Output result as JSON', false)
      .option('--yes', 'Skip confirmation prompt', false)
      .action(async (artifactId: string, opts) => {
        const lang = getLang();
        const msgsLang = msgs[lang];
        const store = new MemoryStore(process.cwd());

        // Validate reason early
        const reason = validateReason(opts.reason, opts.json);

        try {
          // Load all artifacts for prefix resolution
          const allArtifacts = await store.listArtifacts();
          if (allArtifacts.length === 0) {
            const errMsg = msgsLang.notFound('Artifact', artifactId);
            if (opts.json) {
              console.log(JSON.stringify({ error: { code: 'NOT_FOUND', message: errMsg } }, null, 2));
            } else {
              console.error(chalk.red(errMsg));
            }
            process.exit(1);
          }

          // Resolve ID (exact or prefix)
          const candidates = allArtifacts.map(a => ({
            id: a.artifact_id,
            label: `${a.name} (${a.type}, v${a.version})`,
          }));

          const match = resolveId(artifactId, candidates);

          if (match.matched.length === 0) {
            const errMsg = msgsLang.prefixNotFound(artifactId);
            if (opts.json) {
              console.log(JSON.stringify({ error: { code: 'NOT_FOUND', message: errMsg } }, null, 2));
            } else {
              console.error(chalk.red(errMsg));
            }
            process.exit(1);
          }

          if (match.matched.length > 1 && !match.exact) {
            const errMsg = msgsLang.ambiguousId(artifactId, match.matched);
            if (opts.json) {
              console.log(JSON.stringify({ error: { code: 'AMBIGUOUS_ID', message: errMsg, matches: match.matched.map(m => ({ id: m.id, label: m.label })) } }, null, 2));
            } else {
              console.error(chalk.red(errMsg));
            }
            process.exit(1);
          }

          const resolvedId = match.matched[0].id;
          const artifact = allArtifacts.find(a => a.artifact_id === resolvedId)!;

          if (!opts.yes) {
            console.log(chalk.bold(`\nArchive artifact "${artifact.name}" (${shortId(artifact.artifact_id)})?`));
            console.log(`  Status: ${artifact.status}`);
            console.log(`  Type:   ${artifact.type}`);
            console.log(`  Reason: ${reason}`);
            console.log();

            const readline = await import('node:readline');
            const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
            const answer = await new Promise<string>(resolve => {
              rl.question('Continue? (y/N) ', resolve);
            });
            rl.close();

            if (answer.toLowerCase() !== 'y' && answer.toLowerCase() !== 'yes') {
              console.log(chalk.gray('Cancelled.'));
              return;
            }
          }

          const archived = await store.archiveArtifact(resolvedId, reason);

          if (opts.json) {
            console.log(JSON.stringify(archived, null, 2));
            return;
          }

          console.log(chalk.green(`✓ ${msgsLang.archived(shortId(archived.artifact_id))}`));
          console.log(`  Name:   ${archived.name}`);
          console.log(`  Reason: ${archived.archive_reason}`);
        } catch (error) {
          console.error(chalk.red(String(error)));
          process.exit(1);
        }
      })
  );

memoryCommand.addCommand(artifactsCommand);
