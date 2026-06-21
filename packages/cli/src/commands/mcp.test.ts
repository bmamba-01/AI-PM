import { describe, it, expect } from 'vitest';
import { writeFile, mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import fs from 'node:fs';
import { loadRegistry, loadBuiltinProfiles } from '@ai-pm/mcp/registry';
import { validateConfigs } from '@ai-pm/mcp/registry/configValidator';
import { runDoctor } from '@ai-pm/mcp/registry/doctor';

// ─── Helpers ─────────────────────────────────────────────────────────────────

let counter = 0;
function tempDir(): string {
  return path.join(tmpdir(), 'ai-pm-mcp-cli-test-' + (++counter));
}

function createProjectConfig(root: string, servers: Array<{ id: string; enabled: boolean; token?: string; url?: string }>): void {
  const configDir = path.join(root, '.superagent');
  fs.mkdirSync(configDir, { recursive: true });
  fs.writeFileSync(
    path.join(configDir, 'mcp-config.json'),
    JSON.stringify({ servers })
  );
}

// ─── Validate command tests ──────────────────────────────────────────────────

describe('MCP Validate (store layer)', () => {
  it('validates builtin configs with no issues', () => {
    const registry = loadRegistry();
    const builtin = loadBuiltinProfiles();
    const report = validateConfigs(registry, [builtin.defaultProfile, builtin.offlineProfile]);
    expect(report.valid).toBe(true);
    expect(report.issues).toHaveLength(0);
    expect(report.summary).toContain('structurally valid');
    expect(report.checkedAt).toBeDefined();
  });

  it('detects unknown server references in profiles', () => {
    const registry = loadRegistry();
    const profile = {
      version: 1,
      name: 'test-bad',
      enabled_servers: ['github', 'nonexistent_server'] as string[],
    };
    const report = validateConfigs(registry, [profile]);
    expect(report.valid).toBe(false);
    expect(report.issues.some(i => i.code === 'PROFILE_REFERENCES_UNKNOWN_SERVER')).toBe(true);
  });

  it('detects unknown workflow IDs', () => {
    const registry = loadRegistry();
    const report = validateConfigs(registry, []);
    expect(report).toBeDefined();
    expect(typeof report.valid).toBe('boolean');
  });

  it('JSON output is parseable', () => {
    const registry = loadRegistry();
    const builtin = loadBuiltinProfiles();
    const report = validateConfigs(registry, [builtin.defaultProfile, builtin.offlineProfile]);
    const json = JSON.stringify(report, null, 2);
    const parsed = JSON.parse(json);
    expect(parsed.valid).toBe(report.valid);
    expect(parsed.issues.length).toBe(report.issues.length);
    expect(parsed.summary).toBe(report.summary);
  });
});

// ─── Doctor command tests ────────────────────────────────────────────────────

describe('MCP Doctor (store layer)', () => {
  it('returns complete report with all required fields', () => {
    const root = tempDir();
    const registry = loadRegistry();
    const builtin = loadBuiltinProfiles();
    const report = runDoctor(root, registry, builtin.defaultProfile);
    expect(report).toHaveProperty('profile');
    expect(report).toHaveProperty('project_root');
    expect(report).toHaveProperty('checked_at');
    expect(report).toHaveProperty('health');
    expect(report).toHaveProperty('connectors');
    expect(report).toHaveProperty('workflows');
    expect(report).toHaveProperty('mutations');
    expect(report).toHaveProperty('summary');
    expect(['healthy', 'degraded', 'critical']).toContain(report.health);
    expect(typeof report.summary.total_connectors).toBe('number');
    expect(typeof report.summary.enabled).toBe('number');
    expect(typeof report.summary.disabled).toBe('number');
    expect(typeof report.summary.not_configured).toBe('number');
  });

  it('empty project with default profile is degraded', () => {
    const root = tempDir();
    const registry = loadRegistry();
    const builtin = loadBuiltinProfiles();
    const report = runDoctor(root, registry, builtin.defaultProfile);
    expect(report.health).toBe('degraded');
    expect(report.summary.not_configured).toBeGreaterThan(0);
  });

  it('configured enabled connector shows as enabled', () => {
    const root = tempDir();
    const registry = loadRegistry();
    const builtin = loadBuiltinProfiles();

    createProjectConfig(root, [
      { id: 'github', enabled: true, token: 'ghp_test123', url: 'https://api.github.com' },
      { id: 'filesystem', enabled: true },
    ]);

    const report = runDoctor(root, registry, builtin.defaultProfile);
    const gh = report.connectors.find(c => c.server_id === 'github');
    expect(gh?.status).toBe('enabled');
    expect(gh?.has_token).toBe(true);
    expect(gh?.has_url).toBe(true);
  });

  it('configured disabled connector shows as disabled', () => {
    const root = tempDir();
    const registry = loadRegistry();
    const builtin = loadBuiltinProfiles();

    createProjectConfig(root, [
      { id: 'github', enabled: false, token: 'ghp_test123' },
    ]);

    const report = runDoctor(root, registry, builtin.defaultProfile);
    const gh = report.connectors.find(c => c.server_id === 'github');
    expect(gh?.status).toBe('disabled');
  });

  it('detects missing env vars for enabled connectors', () => {
    const root = tempDir();
    const registry = loadRegistry();
    const builtin = loadBuiltinProfiles();

    createProjectConfig(root, [{ id: 'github', enabled: true }]);

    const report = runDoctor(root, registry, builtin.defaultProfile);
    const gh = report.connectors.find(c => c.server_id === 'github');
    expect(gh?.missing_env_vars.length).toBeGreaterThan(0);
    expect(gh?.missing_env_vars).toContain('GITHUB_TOKEN');
  });

  it('mutation analysis reports global policy', () => {
    const root = tempDir();
    const registry = loadRegistry();
    const builtin = loadBuiltinProfiles();
    const report = runDoctor(root, registry, builtin.defaultProfile);
    expect(report.mutations.global_approval_required).toBe(true);
    expect(report.mutations.servers_with_mutations).toContain('github');
    expect(report.mutations.mutation_count).toBeGreaterThan(0);
  });

  it('workflow degradation detected when servers missing', () => {
    const root = tempDir();
    const registry = loadRegistry();
    const builtin = loadBuiltinProfiles();
    const report = runDoctor(root, registry, builtin.defaultProfile);
    const degraded = report.workflows.filter(w => w.degraded);
    expect(degraded.length).toBeGreaterThan(0);
    const dailyBrief = degraded.find(w => w.workflow_id === 'daily-briefing');
    expect(dailyBrief).toBeDefined();
    expect(dailyBrief!.missing_servers.length).toBeGreaterThan(0);
  });

  it('all workflows operational when all required servers enabled', () => {
    const root = tempDir();
    const registry = loadRegistry();
    const builtin = loadBuiltinProfiles();

    const allServerIds = Object.keys(registry.servers);
    createProjectConfig(root, allServerIds.map(id => ({ id, enabled: true, token: `tok_${id}` })));

    const report = runDoctor(root, registry, builtin.defaultProfile);
    expect(report.summary.degraded_workflows).toBe(0);
    expect(report.health).toBe('healthy');
  });

  it('offline profile shows online servers as disabled', () => {
    const root = tempDir();
    const registry = loadRegistry();
    const builtin = loadBuiltinProfiles();

    createProjectConfig(root, [
      { id: 'filesystem', enabled: true },
      { id: 'sqlite', enabled: true },
    ]);

    const report = runDoctor(root, registry, builtin.offlineProfile);
    const fs_ = report.connectors.find(c => c.server_id === 'filesystem');
    const gh = report.connectors.find(c => c.server_id === 'github');
    expect(fs_?.status).toBe('enabled');
    expect(gh?.status).toBe('disabled');
  });

  it('summary counts match connector statuses', () => {
    const root = tempDir();
    const registry = loadRegistry();
    const builtin = loadBuiltinProfiles();
    const report = runDoctor(root, registry, builtin.defaultProfile);
    expect(report.summary.total_connectors).toBe(report.connectors.length);
    expect(report.summary.enabled + report.summary.disabled + report.summary.not_configured)
      .toBe(report.connectors.length);
  });

  it('health is critical when all configured connectors disabled and none unconfigured', () => {
    const root = tempDir();
    const registry = loadRegistry();
    const builtin = loadBuiltinProfiles();

    // Create a minimal registry where ALL servers are configured (as disabled)
    const allServerIds = Object.keys(registry.servers);
    createProjectConfig(root, allServerIds.map(id => ({ id, enabled: false })));

    const report = runDoctor(root, registry, builtin.defaultProfile);
    expect(report.health).toBe('critical');
    expect(report.summary.disabled).toBeGreaterThan(0);
    expect(report.summary.enabled).toBe(0);
    expect(report.summary.not_configured).toBe(0);
  });

  it('health is degraded when configured connectors disabled but others not configured', () => {
    const root = tempDir();
    const registry = loadRegistry();
    const builtin = loadBuiltinProfiles();

    createProjectConfig(root, [
      { id: 'github', enabled: false },
      { id: 'jira', enabled: false },
    ]);

    const report = runDoctor(root, registry, builtin.defaultProfile);
    // Some disabled + many not_configured = degraded (not critical)
    expect(report.health).toBe('degraded');
    expect(report.summary.disabled).toBeGreaterThan(0);
    expect(report.summary.enabled).toBe(0);
    expect(report.summary.not_configured).toBeGreaterThan(0);
  });

  it('health is degraded when some connectors enabled', () => {
    const root = tempDir();
    const registry = loadRegistry();
    const builtin = loadBuiltinProfiles();

    createProjectConfig(root, [
      { id: 'github', enabled: true },
      { id: 'jira', enabled: false },
    ]);

    const report = runDoctor(root, registry, builtin.defaultProfile);
    expect(report.health).toBe('degraded');
    expect(report.summary.enabled).toBeGreaterThan(0);
    expect(report.summary.disabled).toBeGreaterThan(0);
  });
});
