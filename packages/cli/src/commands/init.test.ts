import { mkdtemp, rm, readFile, access } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { runInit } from './init.js';

const tempRoots: string[] = [];

async function tempRoot(): Promise<string> {
  const root = await mkdtemp(path.join(tmpdir(), 'ai-pm-init-'));
  tempRoots.push(root);
  return root;
}

afterEach(async () => {
  await Promise.all(tempRoots.splice(0).map(root => rm(root, { recursive: true, force: true })));
});

async function fileExists(p: string): Promise<boolean> {
  try {
    await access(p);
    return true;
  } catch {
    return false;
  }
}

describe('init command', () => {
  it('creates .ai-pm/memory/ directory', async () => {
    const root = await tempRoot();
    const cwd = process.cwd;
    process.cwd = () => root;
    try {
      runInit('test-project');
      expect(await fileExists(path.join(root, 'test-project', '.ai-pm', 'memory'))).toBe(true);
    } finally {
      process.cwd = cwd;
    }
  });

  it('creates .ai-pm/audit/ directory', async () => {
    const root = await tempRoot();
    const cwd = process.cwd;
    process.cwd = () => root;
    try {
      runInit('test-project');
      expect(await fileExists(path.join(root, 'test-project', '.ai-pm', 'audit'))).toBe(true);
    } finally {
      process.cwd = cwd;
    }
  });

  it('creates .ai-pm/approvals/ directory', async () => {
    const root = await tempRoot();
    const cwd = process.cwd;
    process.cwd = () => root;
    try {
      runInit('test-project');
      expect(await fileExists(path.join(root, 'test-project', '.ai-pm', 'approvals'))).toBe(true);
    } finally {
      process.cwd = cwd;
    }
  });

  it('creates AGENTS.md with content', async () => {
    const root = await tempRoot();
    const cwd = process.cwd;
    process.cwd = () => root;
    try {
      runInit('test-project');
      const content = await readFile(path.join(root, 'test-project', 'AGENTS.md'), 'utf-8');
      expect(content).toContain('Agent Entrypoint');
      expect(content).toContain('test-project');
    } finally {
      process.cwd = cwd;
    }
  });

  it('creates CODEX.md with content', async () => {
    const root = await tempRoot();
    const cwd = process.cwd;
    process.cwd = () => root;
    try {
      runInit('test-project');
      const content = await readFile(path.join(root, 'test-project', 'CODEX.md'), 'utf-8');
      expect(content).toContain('Codex Guide');
      expect(content).toContain('test-project');
    } finally {
      process.cwd = cwd;
    }
  });

  it('creates CLAUDE.md with content', async () => {
    const root = await tempRoot();
    const cwd = process.cwd;
    process.cwd = () => root;
    try {
      runInit('test-project');
      const content = await readFile(path.join(root, 'test-project', 'CLAUDE.md'), 'utf-8');
      expect(content).toContain('Claude Guide');
      expect(content).toContain('test-project');
    } finally {
      process.cwd = cwd;
    }
  });

  it('creates profile.yaml with project name', async () => {
    const root = await tempRoot();
    const cwd = process.cwd;
    process.cwd = () => root;
    try {
      runInit('test-project');
      const content = await readFile(path.join(root, 'test-project', '.ai-pm', 'profile.yaml'), 'utf-8');
      expect(content).toContain('name: "test-project"');
      expect(content).toContain('version: 1');
    } finally {
      process.cwd = cwd;
    }
  });

  it('creates .ai-pm/memory/state.json', async () => {
    const root = await tempRoot();
    const cwd = process.cwd;
    process.cwd = () => root;
    try {
      runInit('test-project');
      const content = await readFile(path.join(root, 'test-project', '.ai-pm', 'memory', 'state.json'), 'utf-8');
      const parsed = JSON.parse(content);
      expect(parsed.version).toBe(1);
      expect(Array.isArray(parsed.tasks)).toBe(true);
      expect(Array.isArray(parsed.artifacts)).toBe(true);
    } finally {
      process.cwd = cwd;
    }
  });

  it('creates .ai-pm/approvals.json', async () => {
    const root = await tempRoot();
    const cwd = process.cwd;
    process.cwd = () => root;
    try {
      runInit('test-project');
      const content = await readFile(path.join(root, 'test-project', '.ai-pm', 'approvals.json'), 'utf-8');
      const parsed = JSON.parse(content);
      expect(Array.isArray(parsed)).toBe(true);
      expect(parsed.length).toBe(0);
    } finally {
      process.cwd = cwd;
    }
  });

  it('creates .gitignore with .ai-pm/ exclusions', async () => {
    const root = await tempRoot();
    const cwd = process.cwd;
    process.cwd = () => root;
    try {
      runInit('test-project');
      const content = await readFile(path.join(root, 'test-project', '.gitignore'), 'utf-8');
      expect(content).toContain('.ai-pm/memory/');
      expect(content).toContain('.ai-pm/audit/');
      expect(content).toContain('.ai-pm/approvals/');
      expect(content).toContain('.ai-pm/approvals.json');
      expect(content).toContain('node_modules/');
    } finally {
      process.cwd = cwd;
    }
  });

  it('creates reports, templates, notes directories', async () => {
    const root = await tempRoot();
    const cwd = process.cwd;
    process.cwd = () => root;
    try {
      runInit('test-project');
      expect(await fileExists(path.join(root, 'test-project', 'reports'))).toBe(true);
      expect(await fileExists(path.join(root, 'test-project', 'templates'))).toBe(true);
      expect(await fileExists(path.join(root, 'test-project', 'notes'))).toBe(true);
    } finally {
      process.cwd = cwd;
    }
  });

  it('creates artifacts, requirements, risks, meetings directories', async () => {
    const root = await tempRoot();
    const cwd = process.cwd;
    process.cwd = () => root;
    try {
      runInit('test-project');
      expect(await fileExists(path.join(root, 'test-project', 'artifacts'))).toBe(true);
      expect(await fileExists(path.join(root, 'test-project', 'requirements'))).toBe(true);
      expect(await fileExists(path.join(root, 'test-project', 'risks'))).toBe(true);
      expect(await fileExists(path.join(root, 'test-project', 'meetings'))).toBe(true);
    } finally {
      process.cwd = cwd;
    }
  });

  it('creates .ai-pm/artifacts and .ai-pm/chat runtime dirs', async () => {
    const root = await tempRoot();
    const cwd = process.cwd;
    process.cwd = () => root;
    try {
      runInit('test-project');
      expect(await fileExists(path.join(root, 'test-project', '.ai-pm', 'artifacts'))).toBe(true);
      expect(await fileExists(path.join(root, 'test-project', '.ai-pm', 'chat'))).toBe(true);
    } finally {
      process.cwd = cwd;
    }
  });

  it('seeds profile.yaml with all schema fields', async () => {
    const root = await tempRoot();
    const cwd = process.cwd;
    process.cwd = () => root;
    try {
      runInit('test-project');
      const content = await readFile(path.join(root, 'test-project', '.ai-pm', 'profile.yaml'), 'utf-8');
      expect(content).toContain('name: "test-project"');
      expect(content).toContain('version: 1');
      expect(content).toContain('methodology:');
      expect(content).toContain('project_type:');
      expect(content).toContain('connectors:');
      expect(content).toContain('github:');
      expect(content).toContain('jira:');
      expect(content).toContain('linear:');
      expect(content).toContain('calendar:');
      expect(content).toContain('email:');
      expect(content).toContain('artifacts:');
    } finally {
      process.cwd = cwd;
    }
  });

  it('.gitignore excludes new .ai-pm subdirectories', async () => {
    const root = await tempRoot();
    const cwd = process.cwd;
    process.cwd = () => root;
    try {
      runInit('test-project');
      const content = await readFile(path.join(root, 'test-project', '.gitignore'), 'utf-8');
      expect(content).toContain('.ai-pm/artifacts/');
      expect(content).toContain('.ai-pm/chat/');
      expect(content).toContain('.ai-pm/memory/');
      expect(content).toContain('.ai-pm/orchestrator/');
    } finally {
      process.cwd = cwd;
    }
  });

  it('.claude/.mcp.json seeds codebase-memory-mcp', async () => {
    const root = await tempRoot();
    const cwd = process.cwd;
    process.cwd = () => root;
    try {
      runInit('test-project');
      const content = await readFile(path.join(root, 'test-project', '.claude', '.mcp.json'), 'utf-8');
      const parsed = JSON.parse(content);
      expect(parsed.mcpServers).toBeDefined();
      expect(parsed.mcpServers['codebase-memory-mcp']).toBeDefined();
      expect(parsed.mcpServers['codebase-memory-mcp'].command).toBe('codebase-memory-mcp');
      // No credentials in the config
      expect(content).not.toMatch(/token|secret|password|api_key|apikey/i);
    } finally {
      process.cwd = cwd;
    }
  });

  it('profile.yaml contains no credentials', async () => {
    const root = await tempRoot();
    const cwd = process.cwd;
    process.cwd = () => root;
    try {
      runInit('test-project');
      const content = await readFile(path.join(root, 'test-project', '.ai-pm', 'profile.yaml'), 'utf-8');
      expect(content).not.toMatch(/token|secret|password|api_key|apikey|credential/i);
    } finally {
      process.cwd = cwd;
    }
  });

  it('creates README.md', async () => {
    const root = await tempRoot();
    const cwd = process.cwd;
    process.cwd = () => root;
    try {
      runInit('test-project');
      const content = await readFile(path.join(root, 'test-project', 'README.md'), 'utf-8');
      expect(content).toContain('# test-project');
      expect(content).toContain('AI-PM Toolkit');
    } finally {
      process.cwd = cwd;
    }
  });

  it('does not overwrite existing directory', async () => {
    const root = await tempRoot();
    const target = path.join(root, 'existing-project');
    const { mkdirSync, writeFileSync } = await import('node:fs');
    mkdirSync(target, { recursive: true });
    writeFileSync(path.join(target, 'marker.txt'), 'keep-me');

    const cwd = process.cwd;
    process.cwd = () => root;
    try {
      expect(() => runInit('existing-project')).toThrow();
    } finally {
      process.cwd = cwd;
    }
  });

  it('handles custom project name', async () => {
    const root = await tempRoot();
    const cwd = process.cwd;
    process.cwd = () => root;
    try {
      runInit('my-cool-project');
      expect(await fileExists(path.join(root, 'my-cool-project', 'AGENTS.md'))).toBe(true);
      const content = await readFile(path.join(root, 'my-cool-project', 'AGENTS.md'), 'utf-8');
      expect(content).toContain('my-cool-project');
    } finally {
      process.cwd = cwd;
    }
  });
});
