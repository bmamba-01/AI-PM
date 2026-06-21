import * as fs from 'node:fs';
import * as path from 'node:path';

// ─── Messages ─────────────────────────────────────────────────────────────────

const msgs = {
  en: {
    creating: 'Creating project',
    done: 'created successfully!',
    nextSteps: 'Next steps',
    nextCommands: [
      'ai-pm project scan',
      'ai-pm memory summary --json',
      'ai-pm approval count --json',
    ],
    errExists: (name: string) => `Folder "${name}" already exists. Aborting.`,
  },
  vi: {
    creating: 'Đang tạo dự án',
    done: 'đã tạo thành công!',
    nextSteps: 'Các bước tiếp theo',
    nextCommands: [
      'ai-pm project scan',
      'ai-pm memory summary --json',
      'ai-pm approval count --json',
    ],
    errExists: (name: string) => `Thư mục "${name}" đã tồn tại. Dừng lại.`,
  },
};

function getLang(): keyof typeof msgs {
  return 'en';
}

// ─── Template content ─────────────────────────────────────────────────────────

function agentsMd(name: string): string {
  return `# ${name} — Agent Entrypoint

## Purpose

This project is managed with AI-PM Toolkit. AI agents should read this file first.

## Project

- **Name:** ${name}
- **Managed by:** AI-PM Toolkit
- **Local-first:** yes

## Safe Defaults

- Treat MCP access as read-only unless approved.
- Do not publish, send, merge, or mutate external systems without approval.
- Do not overwrite human work or revert unrelated files.
- Record assumptions and sources in output.

## Commands

\`\`\`bash
ai-pm project scan          # Check project readiness
ai-pm memory summary        # View memory state
ai-pm approval list         # View approval queue
ai-pm daily brief           # Generate daily briefing
\`\`\`
`;
}

function codexMd(name: string): string {
  return `# ${name} — Codex Guide

## How to Work

1. Read this file and AGENTS.md first.
2. Run \`ai-pm project scan\` to verify project readiness.
3. Inspect existing files before editing.
4. Make focused changes.
5. Run \`ai-pm project scan\` again to verify.

## What NOT to Do

- Do not modify \`.ai-pm/\` runtime data directly.
- Do not commit secrets or tokens.
- Do not create files outside the project scope.
`;
}

function claudeMd(name: string): string {
  return `# ${name} — Claude Guide

## How to Work

1. Read AGENTS.md and this file before starting.
2. Use \`ai-pm\` CLI for project state queries.
3. Respect approval gates for external mutations.
4. Keep changes scoped and auditable.

## Verification

After changes, run:
\`\`\`bash
ai-pm project scan
\`\`\`
`;
}

function profileYaml(name: string, options?: InitOptions): string {
  const methodology = options?.methodology ?? (options?.defaults ? 'scrum' : undefined);
  const projectType = options?.projectType ?? (options?.defaults ? 'fixed_cost' : undefined);
  const connectorProfile = options?.connectorProfile ?? (options?.defaults ? 'offline-local' : undefined);
  const methodLine = methodology ? `methodology: "${methodology}"` : 'methodology: null   # scrum | kanban | waterfall | hybrid';
  const projectTypeLine = projectType ? `project_type: "${projectType}"` : 'project_type: null  # tm | fixed_cost | maintenance | product';
  const connectorProfileLine = connectorProfile ? `connector_profile: "${connectorProfile}"` : 'connector_profile: null';
  return `version: 1
project:
  name: "${name}"
  ${methodLine}
  ${projectTypeLine}
  tags: []
source_systems:
  jira: false
  github: false
  linear: false
  confluence: false
  notion: false
  gmail: false
connectors:
  ${connectorProfileLine}
  github:
    enabled: false
    repo: null
  jira:
    enabled: false
    project_key: null
  linear:
    enabled: false
    team_id: null
  calendar:
    enabled: false
  email:
    enabled: false
artifacts:
  root: "."
  reports: "reports"
  templates: "templates"
  notes: "notes"
`;
}

function gitignore(): string {
  return [
    '# Dependencies',
    'node_modules/',
    '',
    '# Build outputs',
    'dist/',
    'build/',
    '',
    '# AI-PM runtime state (local, not committed)',
    '.ai-pm/memory/',
    '.ai-pm/audit/',
    '.ai-pm/approvals/',
    '.ai-pm/approvals.json',
    '.ai-pm/artifacts/',
    '.ai-pm/chat/',
    '.ai-pm/orchestrator/',
    '',
    '# Environment & secrets',
    '.env',
    '.env.*',
    '!.env.example',
    '',
    '# OS files',
    '.DS_Store',
    'Thumbs.db',
    '',
    '# IDE',
    '.vscode/',
    '.idea/',
    '',
  ].join('\n');
}

function memoryStateJson(projectName: string): string {
  return JSON.stringify({
    version: 1,
    project_id: '',
    tasks: [],
    artifacts: [],
    updated_at: new Date().toISOString(),
  }, null, 2) + '\n';
}

function approvalsJson(): string {
  return '[]\n';
}

// ─── Main init function ───────────────────────────────────────────────────────

export interface InitOptions {
  defaults?: boolean;
  methodology?: string;
  projectType?: string;
  commercialModel?: string;
  connectorProfile?: string;
  json?: boolean;
}

export function runInit(projectName: string, options?: InitOptions) {
  const lang = getLang();
  const t = msgs[lang];
  const root = process.cwd();
  const target = path.join(root, projectName);

  if (fs.existsSync(target)) {
    console.error(t.errExists(projectName));
    process.exit(1);
  }

  if (!options?.json) {
    console.log(`${t.creating} "${projectName}"...`);
  }

  // ── Create directories ──

  const dirs = [
    '.ai-pm/memory',
    '.ai-pm/audit',
    '.ai-pm/approvals',
    '.ai-pm/artifacts',
    '.ai-pm/chat',
    'reports',
    'artifacts',
    'requirements',
    'risks',
    'meetings',
    'templates',
    'notes',
    'workflows',
    'playbooks',
    'docs/superpowers/specs',
    'docs/superpowers/plans',
    'docs/operating-model',
    'mcp',
  ];
  for (const d of dirs) {
    fs.mkdirSync(path.join(target, d), { recursive: true });
  }

  // ── Seed runtime files ──

  fs.writeFileSync(path.join(target, '.ai-pm/memory/state.json'), memoryStateJson(projectName));
  fs.writeFileSync(path.join(target, '.ai-pm/approvals.json'), approvalsJson());
  fs.writeFileSync(path.join(target, '.ai-pm/audit/workflow-runs.jsonl'), '');

  // ── Seed MCP registry (empty, ready for configuration) ──

  fs.writeFileSync(
    path.join(target, 'mcp', 'registry.yaml'),
    `# MCP Server Registry\n# Add MCP servers here or use 'ai-pm mcp add' to configure.\nservers: []\n`
  );

  // ── Project profile ──

  fs.writeFileSync(path.join(target, '.ai-pm/profile.yaml'), profileYaml(projectName, options));

  // ── Agent entrypoints ──

  fs.writeFileSync(path.join(target, 'AGENTS.md'), agentsMd(projectName));
  fs.writeFileSync(path.join(target, 'CODEX.md'), codexMd(projectName));
  fs.writeFileSync(path.join(target, 'CLAUDE.md'), claudeMd(projectName));

  // ── .gitignore ──

  fs.writeFileSync(path.join(target, '.gitignore'), gitignore());

  // ── MCP config for codebase-memory-mcp ──
  const claudeMcpDir = path.join(target, '.claude');
  fs.mkdirSync(claudeMcpDir, { recursive: true });
  fs.writeFileSync(
    path.join(claudeMcpDir, '.mcp.json'),
    JSON.stringify({
      mcpServers: {
        'codebase-memory-mcp': {
          command: 'codebase-memory-mcp',
          args: [],
        },
      },
    }, null, 2) + '\n'
  );

  // ── README ──

  fs.writeFileSync(
    path.join(target, 'README.md'),
    `# ${projectName}\n\nInitialized with AI-PM Toolkit.\n\n## Getting Started\n\n\`\`\`bash\nai-pm project scan\nai-pm memory summary\nai-pm daily brief\n\`\`\`\n`
  );

  // ── Summary ──

  const nextCommands = ['cd ' + projectName, ...t.nextCommands, 'ai-pm project scan --json'];
  const created = [
    '.ai-pm/',
    '.ai-pm/profile.yaml',
    '.ai-pm/audit/workflow-runs.jsonl',
    '.ai-pm/memory/state.json',
    '.ai-pm/approvals.json',
    'AGENTS.md',
    'CODEX.md',
    'CLAUDE.md',
    '.gitignore',
    '.claude/.mcp.json',
    'reports/',
    'artifacts/',
    'requirements/',
    'risks/',
    'meetings/',
    'templates/',
    'notes/',
    'README.md',
  ];

  if (options?.json) {
    console.log(JSON.stringify({
      success: true,
      projectName,
      path: target,
      defaults: Boolean(options.defaults),
      methodology: options.methodology ?? (options.defaults ? 'scrum' : null),
      projectType: options.projectType ?? (options.defaults ? 'fixed_cost' : null),
      commercialModel: options.commercialModel ?? null,
      connectorProfile: options.connectorProfile ?? (options.defaults ? 'offline-local' : null),
      created,
      nextCommands,
    }, null, 2));
    return;
  }

  console.log(`  ✓ .ai-pm/ (runtime dirs + seeds)`);
  console.log(`  ✓ .ai-pm/profile.yaml${options?.methodology ? ` (methodology: ${options.methodology})` : ''}`);
  console.log(`  ✓ .ai-pm/audit/workflow-runs.jsonl (empty)`);
  console.log(`  ✓ .ai-pm/memory/state.json`);
  console.log(`  ✓ .ai-pm/approvals.json (empty)`);
  console.log(`  ✓ AGENTS.md, CODEX.md, CLAUDE.md`);
  console.log(`  ✓ .gitignore`);
  console.log(`  ✓ .claude/.mcp.json (codebase-memory-mcp)`);
  console.log(`  ✓ reports/, artifacts/, requirements/, risks/, meetings/`);
  console.log(`  ✓ templates/, notes/`);
  console.log(`  ✓ README.md`);
  console.log(`\n✅ "${projectName}" ${t.done}`);
  console.log(`\n${t.nextSteps}:`);
  for (const cmd of nextCommands) {
    console.log(`  ${cmd}`);
  }
}
