# Coding Agent 1 — Task 2: Audit Inspection CLI

> **Date:** 2026-06-19  
> **Requested by:** Orchestrator  
> **Priority:** High — first runtime CLI command  
> **Depends on:** Agent 1 MCP/CLI repair (completed), Agent 4 audit-record schema  
> **Blocks:** Task 4 (Approval Queue), Task 5 (Schema Validation)  
> **Type:** 🖥️ CODING TASK — requires `pnpm install`, `pnpm build`, `pnpm test`

---

## Task Contract

```yaml
task_id: agent-1-audit-cli
project_id: ai-pm-toolkit
requested_by: orchestrator
assigned_agent: developer
objective: |
  Implement the `ai-pm audit list` CLI command. Add a loader function
  to LocalProjectStore that reads workflow audit records from JSONL,
  then create a CLI command that prints them as table or JSON.
context:
  methodology: hybrid
  project_type: product_delivery
  source_refs:
    - type: file
      id: packages/core/src/runtime/localProjectStore.ts
      description: Existing store with appendWorkflowAudit — add loadWorkflowAuditRecords
    - type: file
      id: packages/core/src/runtime/localProjectStore.test.ts
      description: Existing test pattern to follow
    - type: file
      id: packages/cli/src/commands/daily.ts
      description: CLI command pattern to follow (Commander + chalk + ora)
    - type: file
      id: packages/cli/src/index.ts
      description: CLI entry point — add auditCommand export
    - type: file
      id: schemas/audit/audit-record.schema.json
      description: Audit record schema for field reference
    - type: file
      id: docs/superpowers/plans/2026-06-19-next-runtime-functions.md
      description: Task 2 specification
constraints:
  - Follow existing code patterns (Commander.js, chalk, ora from daily.ts pattern)
  - Do NOT modify packages/mcp/ — it is already green
  - Do NOT modify packages/desktop/ or packages/mobile/
  - Tests must use temp directories (like existing localProjectStore.test.ts)
  - Build must pass: pnpm --filter @ai-pm/core build && pnpm --filter @ai-pm/cli build
  - Tests must pass: pnpm --filter @ai-pm/core test -- src/runtime/localProjectStore.test.ts
required_outputs:
  - name: core-store-loader
    format: typescript
  - name: cli-audit-command
    format: typescript
  - name: tests
    format: typescript
quality_gate:
  checklist_id: audit-cli-gate
  approval_required: false
deadline: high-priority
```

---

## Prompt

```text
You are a Coding Agent working on the AI-PM Toolkit repository.
Your task is to implement the `ai-pm audit list` CLI command.

## Step 0: Setup

```bash
cd /path/to/AI-PM
pnpm install
```

Read these files first:

1. packages/core/src/runtime/localProjectStore.ts
2. packages/core/src/runtime/localProjectStore.test.ts
3. packages/core/src/runtime/index.ts
4. packages/cli/src/commands/daily.ts
5. packages/cli/src/index.ts
6. schemas/audit/audit-record.schema.json
7. docs/superpowers/plans/2026-06-19-next-runtime-functions.md (Task 2)

## Step 1: Add loadWorkflowAuditRecords to LocalProjectStore

Edit `packages/core/src/runtime/localProjectStore.ts`.

Add this method to the `LocalProjectStore` class (after `appendWorkflowAudit`):

```typescript
async loadWorkflowAuditRecords(): Promise<WorkflowAuditRecord[]> {
  const auditPath = path.join(this.auditDir, 'workflow-runs.jsonl');
  try {
    const raw = await readFile(auditPath, 'utf-8');
    const lines = raw.trim().split('\n').filter(line => line.length > 0);
    const records: WorkflowAuditRecord[] = [];
    for (const line of lines) {
      try {
        const parsed = JSON.parse(line);
        if (isValidAuditRecord(parsed)) {
          records.push(parsed);
        } else {
          console.warn(`[audit] Skipping invalid record: ${line.slice(0, 80)}...`);
        }
      } catch {
        console.warn(`[audit] Skipping malformed JSON line: ${line.slice(0, 80)}...`);
      }
    }
    return records;
  } catch (error) {
    if (isNodeError(error) && error.code === 'ENOENT') return [];
    throw error;
  }
}
```

Add a validation helper function at the bottom of the file:

```typescript
function isValidAuditRecord(value: unknown): value is WorkflowAuditRecord {
  if (!value || typeof value !== 'object') return false;
  const r = value as Record<string, unknown>;
  return typeof r.runId === 'string'
    && typeof r.workflowId === 'string'
    && typeof r.projectId === 'string'
    && typeof r.status === 'string'
    && typeof r.startedAt === 'string'
    && typeof r.completedAt === 'string';
}
```

## Step 2: Add tests for loadWorkflowAuditRecords

Edit `packages/core/src/runtime/localProjectStore.test.ts`.

Add these test cases inside the existing `describe('LocalProjectStore')` block:

```typescript
it('loads empty list when audit file does not exist', async () => {
  const root = await tempRoot();
  const store = new LocalProjectStore(root);
  const records = await store.loadWorkflowAuditRecords();
  expect(records).toEqual([]);
});

it('loads workflow audit records from jsonl', async () => {
  const root = await tempRoot();
  const store = new LocalProjectStore(root);
  await store.ensureProjectDirs();

  // Append two records
  await store.appendWorkflowAudit({
    workflowId: 'daily-briefing',
    projectId: 'alpha',
    status: 'completed',
    startedAt: '2026-06-19T01:00:00.000Z',
    completedAt: '2026-06-19T01:00:01.000Z',
    outputSummary: '1 priority',
    sourceCoverage: ['local-memory'],
    assumptions: [],
  });
  await store.appendWorkflowAudit({
    workflowId: 'meeting-intelligence',
    projectId: 'beta',
    status: 'failed',
    startedAt: '2026-06-19T02:00:00.000Z',
    completedAt: '2026-06-19T02:00:02.000Z',
    outputSummary: 'transcript missing',
    sourceCoverage: [],
    assumptions: ['no transcript available'],
  });

  const records = await store.loadWorkflowAuditRecords();
  expect(records).toHaveLength(2);
  expect(records[0].workflowId).toBe('daily-briefing');
  expect(records[1].workflowId).toBe('meeting-intelligence');
  expect(records[1].status).toBe('failed');
});

it('skips invalid JSON lines and continues loading', async () => {
  const root = await tempRoot();
  const store = new LocalProjectStore(root);
  await store.ensureProjectDirs();
  const auditPath = path.join(root, '.ai-pm', 'audit', 'workflow-runs.jsonl');

  // Write a valid record, a bad line, then another valid record
  const line1 = JSON.stringify({ runId: 'r1', workflowId: 'daily-briefing', projectId: 'p1', status: 'completed', startedAt: '2026-06-19T01:00:00.000Z', completedAt: '2026-06-19T01:00:01.000Z', outputSummary: 'ok', sourceCoverage: [], assumptions: [] });
  const line2 = 'this is not json {{{';
  const line3 = JSON.stringify({ runId: 'r2', workflowId: 'reporting', projectId: 'p2', status: 'blocked', startedAt: '2026-06-19T03:00:00.000Z', completedAt: '2026-06-19T03:00:01.000Z', outputSummary: 'blocked', sourceCoverage: [], assumptions: [] });

  const { writeFile: wf } = await import('node:fs/promises');
  await wf(auditPath, [line1, line2, line3].join('\n') + '\n', 'utf-8');

  const records = await store.loadWorkflowAuditRecords();
  expect(records).toHaveLength(2);
  expect(records[0].runId).toBe('r1');
  expect(records[1].runId).toBe('r2');
});
```

## Step 3: Verify core tests pass

```bash
pnpm --filter @ai-pm/core test -- src/runtime/localProjectStore.test.ts
pnpm --filter @ai-pm/core build
```

## Step 4: Create audit CLI command

Create `packages/cli/src/commands/audit.ts`:

```typescript
import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { LocalProjectStore } from '@ai-pm/core/runtime';
import { table } from 'table';

const msgs = {
  en: {
    title: 'Audit Trail',
    loading: 'Loading audit records...',
    empty: 'No audit records found. Run a workflow first to generate records.',
    done: 'Done',
    runId: 'Run ID',
    workflow: 'Workflow',
    project: 'Project',
    status: 'Status',
    started: 'Started',
    completed: 'Completed',
    summary: 'Summary',
  },
  vi: {
    title: 'Nhật Ký Kiểm Toán',
    loading: 'Đang tải bản ghi kiểm toán...',
    empty: 'Không tìm thấy bản ghi kiểm toán nào. Chạy workflow trước để tạo bản ghi.',
    done: 'Xong',
    runId: 'Mã Chạy',
    workflow: 'Quy Trình',
    project: 'Dự Án',
    status: 'Trạng Thái',
    started: 'Bắt Đầu',
    completed: 'Hoàn Thành',
    summary: 'Tóm Tắt',
  },
};

function getLang(): keyof typeof msgs {
  return 'en';
}

export const auditCommand = new Command('audit');

auditCommand
  .description('View audit trail of workflow runs')
  .addCommand(
    new Command('list')
      .description('List workflow audit records')
      .option('--json', 'Output as JSON')
      .option('--limit <n>', 'Max records to show', '20')
      .action(async (opts) => {
        const lang = getLang();
        const msgsLang = msgs[lang];
        const spinner = ora(msgsLang.loading).start();

        try {
          const store = new LocalProjectStore(process.cwd());
          const records = await store.loadWorkflowAuditRecords();
          spinner.succeed(msgsLang.done);

          if (records.length === 0) {
            console.log(chalk.yellow(msgsLang.empty));
            return;
          }

          // Sort by startedAt descending (newest first), limit
          const limit = parseInt(opts.limit, 10) || 20;
          const sorted = records
            .sort((a, b) => b.startedAt.localeCompare(a.startedAt))
            .slice(0, limit);

          if (opts.json) {
            console.log(JSON.stringify(sorted, null, 2));
            return;
          }

          // Table output
          const statusColor = (s: string) => {
            if (s === 'completed') return chalk.green(s);
            if (s === 'failed') return chalk.red(s);
            if (s === 'blocked') return chalk.yellow(s);
            return s;
          };

          const data = [
            [chalk.bold(msgsLang.runId), chalk.bold(msgsLang.workflow), chalk.bold(msgsLang.project), chalk.bold(msgsLang.status), chalk.bold(msgsLang.started)],
            ...sorted.map(r => [
              r.runId.length > 12 ? r.runId.slice(0, 12) + '…' : r.runId,
              r.workflowId,
              r.projectId,
              statusColor(r.status),
              new Date(r.startedAt).toLocaleString(),
            ]),
          ];

          console.log(chalk.blue(`\n${msgsLang.title}\n`));
          console.log(table(data));
          console.log(chalk.gray(`Showing ${sorted.length} of ${records.length} records`));
        } catch (error) {
          spinner.fail(msgsLang.loading + ' failed');
          console.error(error);
        }
      })
  );
```

## Step 5: Register audit command

Edit `packages/cli/src/index.ts`:

Add import and export:

```typescript
export { runInit } from './commands/init.js';
export { mcpCommand } from './commands/mcp.js';
export { methodologyCommand } from './commands/methodology.js';
export { dailyCommand } from './commands/daily.js';
export { auditCommand } from './commands/audit.js';
```

Also check if there is a `bin/ai-pm.js` or main CLI entry file that registers commands with the program. If so, add:

```typescript
import { auditCommand } from './commands/audit.js';
program.addCommand(auditCommand);
```

If there is no such file, check how `dailyCommand` and `mcpCommand` are registered and follow the same pattern.

## Step 6: Build and verify

```bash
# Build core first (audit command depends on core)
pnpm --filter @ai-pm/core build

# Build CLI
pnpm --filter @ai-pm/cli build

# Run core tests
pnpm --filter @ai-pm/core test -- src/runtime/localProjectStore.test.ts

# Full build (ensure nothing else broke)
pnpm build

# Test the CLI command
node packages/cli/bin/ai-pm.js audit list --json
```

## Step 7: Report

Return your output using the subagent protocol output contract:

```yaml
task_id: agent-1-audit-cli
status: completed | blocked | failed
summary: one-line description
findings:
  - severity: info
    title: what you implemented
    detail: files created/modified, tests added, verification results
    source_ref: packages/
recommendations:
  - action: main thread can now proceed to Task 3 (Project Scan CLI)
    owner: main_thread
    priority: medium
artifacts:
  - path_or_url: packages/core/src/runtime/localProjectStore.ts
    type: diff
  - path_or_url: packages/cli/src/commands/audit.ts
    type: file
  - path_or_url: packages/core/src/runtime/localProjectStore.test.ts
    type: diff
confidence: 0-100
open_questions: []
audit:
  sources_used:
    - list of files read
  assumptions:
    - follows same pattern as daily.ts CLI command
    - JSONL format for audit records (one JSON per line)
    - missing file returns empty list, not error
  approvals_required: []
  next_agent_suggested: >
    Task 3 (Project Scan CLI) can begin next.
```

## Critical reminders

- 🖥️ This is a CODING task — you MUST run `pnpm install`, `pnpm build`, and `pnpm test`
- Do NOT modify packages/mcp/ or packages/desktop/
- Follow the exact pattern from daily.ts for CLI command structure
- Tests must use temp directories (follow existing test pattern)
- Invalid JSON lines in audit log must be skipped with warnings, not crash
- Missing audit file must return empty list, not throw
- After build, verify: `node packages/cli/bin/ai-pm.js audit list --json`
```
