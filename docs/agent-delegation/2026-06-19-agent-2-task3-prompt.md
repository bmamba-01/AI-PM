# Coding Agent 2 — Task 3: Project Scan CLI

> **Date:** 2026-06-19  
> **Requested by:** Orchestrator  
> **Priority:** High — project readiness checker  
> **Depends on:** Agent 1 MCP/CLI repair (completed)  
> **Blocks:** Nothing — enables PMs to verify project setup  
> **Type:** 🖥️ CODING TASK — requires `pnpm install`, `pnpm build`, `pnpm test`

---

## Task Contract

```yaml
task_id: agent-2-project-scan
project_id: ai-pm-toolkit
requested_by: orchestrator
assigned_agent: developer
objective: |
  Implement `ai-pm project scan` — a command that checks whether a project
  folder has the required AI-PM operating layer files and reports readiness.
context:
  methodology: hybrid
  project_type: product_delivery
  source_refs:
    - type: file
      id: packages/core/src/runtime/localProjectStore.ts
      description: Existing runtime pattern
    - type: file
      id: packages/cli/src/commands/audit.ts
      description: CLI command pattern (if created by Agent 1, otherwise use daily.ts)
    - type: file
      id: packages/cli/src/commands/daily.ts
      description: CLI command pattern (Commander + chalk + ora)
    - type: file
      id: packages/cli/src/index.ts
      description: CLI entry point — add projectCommand export
    - type: file
      id: docs/superpowers/plans/2026-06-19-next-runtime-functions.md
      description: Task 3 specification
constraints:
  - Do NOT modify packages/mcp/ or packages/desktop/
  - Tests must use temp directories
  - Build must pass: pnpm --filter @ai-pm/core build && pnpm --filter @ai-pm/cli build
  - Tests must pass: pnpm --filter @ai-pm/core test -- src/runtime/projectScanner.test.ts
  - Command must NOT mutate files — read-only scan only
required_outputs:
  - name: project-scanner
    format: typescript
  - name: cli-project-command
    format: typescript
  - name: tests
    format: typescript
quality_gate:
  checklist_id: project-scan-gate
  approval_required: false
deadline: high-priority
```

---

## Prompt

```text
You are a Coding Agent working on the AI-PM Toolkit repository.
Your task is to implement the `ai-pm project scan` CLI command.

## Step 0: Setup

```bash
cd /path/to/AI-PM
pnpm install
```

Read these files first:

1. packages/core/src/runtime/localProjectStore.ts
2. packages/cli/src/commands/daily.ts (CLI pattern)
3. packages/cli/src/index.ts
4. docs/superpowers/plans/2026-06-19-next-runtime-functions.md (Task 3)

## Step 1: Create projectScanner.ts

Create `packages/core/src/runtime/projectScanner.ts`:

```typescript
import { access } from 'node:fs/promises';
import path from 'node:path';

export interface ScanCheck {
  id: string;
  label: string;
  path: string;
  required: boolean;
  present: boolean;
}

export interface ScanResult {
  projectRoot: string;
  score: number;         // percentage of required checks passed
  totalRequired: number;
  passedRequired: number;
  totalOptional: number;
  passedOptional: number;
  checks: ScanCheck[];
  ready: boolean;        // true if all required checks pass
}

const REQUIRED_CHECKS: Omit<ScanCheck, 'present'>[] = [
  { id: 'agents-md',       label: 'AGENTS.md',                  path: 'AGENTS.md',                       required: true },
  { id: 'readme-md',       label: 'README.md',                  path: 'README.md',                       required: true },
  { id: 'design-spec',     label: 'Design spec',                path: 'docs/superpowers/specs',           required: true },
  { id: 'active-plan',     label: 'Active plan',                path: 'docs/superpowers/plans',           required: true },
  { id: 'workflows-dir',   label: 'Workflows',                  path: 'workflows',                       required: true },
  { id: 'playbooks-dir',   label: 'Playbooks',                  path: 'playbooks',                       required: true },
  { id: 'mcp-registry',    label: 'MCP registry',               path: 'mcp/registry.yaml',               required: true },
  { id: 'templates-dir',   label: 'Templates',                  path: 'templates',                       required: false },
  { id: 'schemas-dir',     label: 'JSON schemas',               path: 'schemas',                         required: false },
  { id: 'operating-model', label: 'Operating model docs',       path: 'docs/operating-model',            required: false },
  { id: 'claude-md',       label: 'CLAUDE.md',                  path: 'CLAUDE.md',                       required: false },
  { id: 'codex-md',        label: 'CODEX.md',                   path: 'CODEX.md',                        required: false },
];

async function pathExists(projectRoot: string, relativePath: string): Promise<boolean> {
  try {
    await access(path.join(projectRoot, relativePath));
    return true;
  } catch {
    return false;
  }
}

export async function scanProject(projectRoot: string): Promise<ScanResult> {
  const checks: ScanCheck[] = [];

  for (const check of REQUIRED_CHECKS) {
    const present = await pathExists(projectRoot, check.path);
    checks.push({ ...check, present });
  }

  const requiredChecks = checks.filter(c => c.required);
  const optionalChecks = checks.filter(c => !c.required);
  const passedRequired = requiredChecks.filter(c => c.present).length;
  const passedOptional = optionalChecks.filter(c => c.present).length;

  const score = requiredChecks.length > 0
    ? Math.round((passedRequired / requiredChecks.length) * 100)
    : 100;

  return {
    projectRoot,
    score,
    totalRequired: requiredChecks.length,
    passedRequired,
    totalOptional: optionalChecks.length,
    passedOptional,
    checks,
    ready: passedRequired === requiredChecks.length,
  };
}
```

## Step 2: Create tests

Create `packages/core/src/runtime/projectScanner.test.ts`:

```typescript
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { scanProject } from './projectScanner.js';

const tempRoots: string[] = [];

async function tempRoot(): Promise<string> {
  const root = await mkdtemp(path.join(tmpdir(), 'ai-pm-scan-'));
  tempRoots.push(root);
  return root;
}

afterEach(async () => {
  await Promise.all(tempRoots.splice(0).map(root => rm(root, { recursive: true, force: true })));
});

describe('projectScanner', () => {
  it('returns low score for empty directory', async () => {
    const root = await tempRoot();
    const result = await scanProject(root);
    expect(result.ready).toBe(false);
    expect(result.score).toBe(0);
    expect(result.passedRequired).toBe(0);
    expect(result.checks.length).toBeGreaterThan(0);
  });

  it('returns ready=true when all required files exist', async () => {
    const root = await tempRoot();
    // Create all required paths
    await writeFile(path.join(root, 'AGENTS.md'), '', 'utf-8');
    await writeFile(path.join(root, 'README.md'), '', 'utf-8');
    await mkdir(path.join(root, 'docs', 'superpowers', 'specs'), { recursive: true });
    await mkdir(path.join(root, 'docs', 'superpowers', 'plans'), { recursive: true });
    await mkdir(path.join(root, 'workflows'), { recursive: true });
    await mkdir(path.join(root, 'playbooks'), { recursive: true });
    await writeFile(path.join(root, 'mcp', 'registry.yaml'), '', 'utf-8');

    const result = await scanProject(root);
    expect(result.ready).toBe(true);
    expect(result.score).toBe(100);
    expect(result.passedRequired).toBe(result.totalRequired);
  });

  it('marks individual missing files correctly', async () => {
    const root = await tempRoot();
    await writeFile(path.join(root, 'AGENTS.md'), '', 'utf-8');
    // Missing README.md, workflows, etc.

    const result = await scanProject(root);
    const agentsCheck = result.checks.find(c => c.id === 'agents-md');
    const readmeCheck = result.checks.find(c => c.id === 'readme-md');
    expect(agentsCheck?.present).toBe(true);
    expect(readmeCheck?.present).toBe(false);
  });

  it('optional files do not affect ready status', async () => {
    const root = await tempRoot();
    // Create only required files
    await writeFile(path.join(root, 'AGENTS.md'), '', 'utf-8');
    await writeFile(path.join(root, 'README.md'), '', 'utf-8');
    await mkdir(path.join(root, 'docs', 'superpowers', 'specs'), { recursive: true });
    await mkdir(path.join(root, 'docs', 'superpowers', 'plans'), { recursive: true });
    await mkdir(path.join(root, 'workflows'), { recursive: true });
    await mkdir(path.join(root, 'playbooks'), { recursive: true });
    await writeFile(path.join(root, 'mcp', 'registry.yaml'), '', 'utf-8');

    const result = await scanProject(root);
    expect(result.ready).toBe(true);
    // Optional files like CLAUDE.md, templates/, schemas/ may be missing
    expect(result.passedOptional).toBeLessThanOrEqual(result.totalOptional);
  });

  it('does not mutate any files', async () => {
    const root = await tempRoot();
    await writeFile(path.join(root, 'AGENTS.md'), 'test', 'utf-8');

    const before = await import('node:fs/promises').then(fs =>
      fs.readdir(root)
    );
    await scanProject(root);
    const after = await import('node:fs/promises').then(fs =>
      fs.readdir(root)
    );
    expect(after).toEqual(before);
  });
});
```

## Step 3: Verify core tests pass

```bash
pnpm --filter @ai-pm/core test -- src/runtime/projectScanner.test.ts
pnpm --filter @ai-pm/core build
```

## Step 4: Create CLI command

Create `packages/cli/src/commands/project.ts`:

```typescript
import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { scanProject } from '@ai-pm/core/runtime';
import { table } from 'table';

const msgs = {
  en: {
    title: 'Project Scan',
    loading: 'Scanning project...',
    done: 'Scan complete',
    ready: 'Project is READY — all required files present',
    notReady: 'Project is NOT READY — missing required files',
    required: 'Required',
    optional: 'Optional',
    present: 'Present',
    missing: 'Missing',
    score: 'Readiness Score',
    summary: 'Summary',
  },
  vi: {
    title: 'Quét Dự Án',
    loading: 'Đang quét dự án...',
    done: 'Quét hoàn tất',
    ready: 'Dự án SẴN SÀNG — tất cả file cần thiết đã có',
    notReady: 'Dự án CHƯA SẴN SÀNG — thiếu file bắt buộc',
    required: 'Bắt buộc',
    optional: 'Tùy chọn',
    present: 'Có',
    missing: 'Thiếu',
    score: 'Điểm Sẵn Sàng',
    summary: 'Tóm Tắt',
  },
};

function getLang(): keyof typeof msgs {
  return 'en';
}

export const projectCommand = new Command('project');

projectCommand
  .description('Manage and inspect AI-PM project configuration')
  .addCommand(
    new Command('scan')
      .description('Scan project for AI-PM operating layer readiness')
      .option('--json', 'Output as JSON')
      .option('--path <dir>', 'Project root to scan', process.cwd())
      .action(async (opts) => {
        const lang = getLang();
        const msgsLang = msgs[lang];
        const spinner = ora(msgsLang.loading).start();

        try {
          const result = await scanProject(opts.path);
          spinner.succeed(msgsLang.done);

          if (opts.json) {
            console.log(JSON.stringify(result, null, 2));
            return;
          }

          // Text output
          console.log(chalk.bold(`\n${msgsLang.title}\n`));

          // Score
          const scoreColor = result.score === 100 ? chalk.green :
                             result.score >= 70 ? chalk.yellow : chalk.red;
          console.log(`${msgsLang.score}: ${scoreColor(`${result.score}%`)}`);
          console.log(`${result.ready ? chalk.green(msgsLang.ready) : chalk.red(msgsLang.notReady)}\n`);

          // Summary
          console.log(chalk.gray(
            `${msgsLang.required}: ${result.passedRequired}/${result.totalRequired} | ` +
            `${msgsLang.optional}: ${result.passedOptional}/${result.totalOptional}\n`
          ));

          // Detail table
          const data = [
            [chalk.bold('Check'), chalk.bold('Status'), chalk.bold('Path')],
            ...result.checks.map(c => [
              c.label,
              c.present ? chalk.green(`✓ ${msgsLang.present}`) : (c.required ? chalk.red(`✗ ${msgsLang.missing}`) : chalk.gray(`○ ${msgsLang.missing}`)),
              c.path,
            ]),
          ];

          console.log(table(data));
        } catch (error) {
          spinner.fail(msgsLang.loading + ' failed');
          console.error(error);
        }
      })
  );
```

## Step 5: Register project command

Edit `packages/cli/src/index.ts`:

```typescript
export { runInit } from './commands/init.js';
export { mcpCommand } from './commands/mcp.js';
export { methodologyCommand } from './commands/methodology.js';
export { dailyCommand } from './commands/daily.js';
export { auditCommand } from './commands/audit.js';
export { projectCommand } from './commands/project.js';
```

Also register in the CLI program entry point (same place where other commands are registered).

## Step 6: Build and verify

```bash
pnpm --filter @ai-pm/core build
pnpm --filter @ai-pm/cli build
pnpm --filter @ai-pm/core test -- src/runtime/projectScanner.test.ts
pnpm build

# Test on the repo itself
node packages/cli/bin/ai-pm.js project scan
node packages/cli/bin/ai-pm.js project scan --json
```

## Step 7: Report

```yaml
task_id: agent-2-project-scan
status: completed | blocked | failed
summary: one-line description
findings:
  - severity: info
    title: what you implemented
    detail: files created/modified, tests added, verification results
    source_ref: packages/
recommendations:
  - action: main thread can proceed to Task 4 (Approval Queue Runtime)
    owner: main_thread
    priority: medium
artifacts:
  - path_or_url: packages/core/src/runtime/projectScanner.ts
    type: file
  - path_or_url: packages/cli/src/commands/project.ts
    type: file
  - path_or_url: packages/core/src/runtime/projectScanner.test.ts
    type: file
confidence: 0-100
open_questions: []
audit:
  sources_used:
    - list of files read
  assumptions:
    - required files match the AI-PM operating layer design spec
    - optional files enhance but don't gate readiness
    - command is read-only (no mutations)
  approvals_required: []
  next_agent_suggested: >
    Task 4 (Approval Queue Runtime) can begin next.
```

## Critical reminders

- 🖥️ CODING task — run `pnpm install`, `pnpm build`, `pnpm test`
- Do NOT modify packages/mcp/ or packages/desktop/
- Command must be READ-ONLY — never create or modify files
- Required files: AGENTS.md, README.md, design spec, active plan, workflows, playbooks, MCP registry
- Optional files: templates, schemas, CLAUDE.md, CODEX.md, operating model docs
- Score = percentage of required checks passed
- `ready` = all required checks pass
- After build, test on the repo itself: `node packages/cli/bin/ai-pm.js project scan`
```
