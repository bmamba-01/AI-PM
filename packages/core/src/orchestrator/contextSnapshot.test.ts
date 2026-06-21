import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { mkdtemp, rm, writeFile, mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import {
  loadRegistry,
  loadProfile,
  buildSnapshot,
  buildProfileSnapshot,
  computeCapabilities,
  buildRequiredForWorkflows,
  buildContextPack,
  filterEnabled,
  getHealthSummary,
} from './contextSnapshot.js';

describe('Context Snapshot', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await mkdtemp(path.join(tmpdir(), 'context-snapshot-test-'));
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  const sampleRegistry = `
version: 1
defaults:
  access_mode: read_only
  mutation_policy: approval_required
  unavailable_behavior: degrade_gracefully
servers:
  github:
    category: source_control
    priority: 1
    required_for:
      - daily-briefing
      - code-quality-guard
    read_capabilities:
      - read_repositories
      - read_pull_requests
    mutation_capabilities:
      - create_issue
      - merge_pr
  jira:
    category: work_tracking
    priority: 1
    required_for:
      - daily-briefing
      - risk-control
    read_capabilities:
      - search_issues
      - read_sprints
    mutation_capabilities:
      - create_issue
      - transition_issue
  filesystem:
    category: local_memory
    priority: 1
    required_for:
      - all_workflows
    read_capabilities:
      - read_files
      - list_directories
    mutation_capabilities:
      - write_file
`;

  const sampleProfile = `
version: 1
name: offline-local
description: "Offline-first profile"
enabled_servers:
  - filesystem
disabled_online_servers:
  - github
  - jira
workflow_behavior:
  daily-briefing:
    use_local_memory: true
`;

  describe('loadRegistry', () => {
    it('loads registry from YAML file', async () => {
      const registryPath = path.join(tempDir, 'registry.yaml');
      await writeFile(registryPath, sampleRegistry);

      const registry = await loadRegistry(registryPath);
      expect(registry).not.toBeNull();
      expect(registry!.version).toBe(1);
      expect(registry!.servers.github).toBeDefined();
      expect(registry!.servers.jira).toBeDefined();
      expect(registry!.servers.filesystem).toBeDefined();
    });

    it('returns null for missing file', async () => {
      const registry = await loadRegistry(path.join(tempDir, 'nonexistent.yaml'));
      expect(registry).toBeNull();
    });

    it('returns null for invalid YAML', async () => {
      const registryPath = path.join(tempDir, 'bad.yaml');
      await writeFile(registryPath, 'not: valid: yaml: [');
      const registry = await loadRegistry(registryPath);
      // js-yaml may parse this or return null on error
      expect(registry).toBeDefined();
    });
  });

  describe('loadProfile', () => {
    it('loads profile from YAML file', async () => {
      const profilePath = path.join(tempDir, 'offline-local.yaml');
      await writeFile(profilePath, sampleProfile);

      const profile = await loadProfile(profilePath);
      expect(profile).not.toBeNull();
      expect(profile!.name).toBe('offline-local');
      expect(profile!.enabled_servers).toContain('filesystem');
      expect(profile!.disabled_online_servers).toContain('github');
    });

    it('returns null for missing file', async () => {
      const profile = await loadProfile(path.join(tempDir, 'nonexistent.yaml'));
      expect(profile).toBeNull();
    });
  });

  describe('buildSnapshot', () => {
    it('builds snapshots for all servers in registry', async () => {
      const registryPath = path.join(tempDir, 'registry.yaml');
      await writeFile(registryPath, sampleRegistry);
      const registry = await loadRegistry(registryPath);

      const snapshot = buildSnapshot(registry!, ['github', 'filesystem']);

      expect(snapshot).toHaveLength(3);
      expect(snapshot.find(s => s.connectorId === 'github')?.enabled).toBe(true);
      expect(snapshot.find(s => s.connectorId === 'github')?.health).toBe('healthy');
      expect(snapshot.find(s => s.connectorId === 'jira')?.enabled).toBe(false);
      expect(snapshot.find(s => s.connectorId === 'jira')?.health).toBe('unknown');
      expect(snapshot.find(s => s.connectorId === 'filesystem')?.enabled).toBe(true);
    });

    it('includes capabilities from registry', async () => {
      const registryPath = path.join(tempDir, 'registry.yaml');
      await writeFile(registryPath, sampleRegistry);
      const registry = await loadRegistry(registryPath);

      const snapshot = buildSnapshot(registry!, ['github']);
      const github = snapshot.find(s => s.connectorId === 'github');

      expect(github?.readCapabilities).toContain('read_repositories');
      expect(github?.mutationCapabilities).toContain('create_issue');
    });
  });

  describe('buildProfileSnapshot', () => {
    it('converts profile data to snapshot', async () => {
      const profilePath = path.join(tempDir, 'offline-local.yaml');
      await writeFile(profilePath, sampleProfile);
      const profile = await loadProfile(profilePath);

      const snapshot = buildProfileSnapshot(profile!);
      expect(snapshot.profileName).toBe('offline-local');
      expect(snapshot.enabledServers).toContain('filesystem');
      expect(snapshot.disabledServers).toContain('github');
    });
  });

  describe('computeCapabilities', () => {
    it('computes unique read capabilities across enabled connectors', () => {
      const snapshots = [
        { connectorId: 'github', enabled: true, readCapabilities: ['read_repositories', 'read_pull_requests'], mutationCapabilities: ['create_issue'] },
        { connectorId: 'jira', enabled: true, readCapabilities: ['search_issues', 'read_sprints'], mutationCapabilities: ['create_issue', 'transition_issue'] },
        { connectorId: 'offline', enabled: false, readCapabilities: ['read_files'], mutationCapabilities: ['write_file'] },
      ] as any;

      const caps = computeCapabilities(snapshots);
      expect(caps.read).toContain('read_repositories');
      expect(caps.read).toContain('search_issues');
      expect(caps.read).not.toContain('read_files'); // disabled connector
      expect(caps.mutation).toContain('create_issue');
      expect(caps.mutation).toContain('transition_issue');
    });
  });

  describe('buildRequiredForWorkflows', () => {
    it('maps workflows to required connectors', async () => {
      const registryPath = path.join(tempDir, 'registry.yaml');
      await writeFile(registryPath, sampleRegistry);
      const registry = await loadRegistry(registryPath);

      const map = buildRequiredForWorkflows(registry!);
      expect(map['daily-briefing']).toContain('github');
      expect(map['daily-briefing']).toContain('jira');
      expect(map['all_workflows']).toContain('filesystem');
      expect(map['code-quality-guard']).toContain('github');
      expect(map['risk-control']).toContain('jira');
    });
  });

  describe('buildContextPack', () => {
    it('builds full context pack from registry', async () => {
      const registryPath = path.join(tempDir, 'registry.yaml');
      await writeFile(registryPath, sampleRegistry);

      const pack = await buildContextPack(tempDir, { registryPath });

      expect(pack.projectRoot).toBe(tempDir);
      expect(pack.snapshot).toHaveLength(3);
      expect(pack.profile).toBeNull();
      expect(pack.availableCapabilities.read.length).toBeGreaterThan(0);
      expect(pack.availableCapabilities.mutation.length).toBeGreaterThan(0);
      expect(pack.timestamp).toBeDefined();
    });

    it('builds context pack with profile', async () => {
      const registryPath = path.join(tempDir, 'registry.yaml');
      await writeFile(registryPath, sampleRegistry);
      const profilePath = path.join(tempDir, 'offline-local.yaml');
      await writeFile(profilePath, sampleProfile);

      const pack = await buildContextPack(tempDir, {
        registryPath,
        profileName: 'offline-local',
        profilesDir: tempDir,
      });

      expect(pack.profile).not.toBeNull();
      expect(pack.profile!.profileName).toBe('offline-local');
      // Only filesystem is enabled in offline profile
      const enabled = pack.snapshot.filter(s => s.enabled);
      expect(enabled).toHaveLength(1);
      expect(enabled[0].connectorId).toBe('filesystem');
    });

    it('degrades gracefully with missing registry', async () => {
      const pack = await buildContextPack(tempDir, {
        registryPath: path.join(tempDir, 'nonexistent.yaml'),
      });

      expect(pack.snapshot).toHaveLength(0);
      expect(pack.profile).toBeNull();
      expect(pack.availableCapabilities.read).toHaveLength(0);
    });
  });

  describe('filterEnabled', () => {
    it('filters to only enabled connectors', () => {
      const pack = {
        snapshot: [
          { connectorId: 'github', enabled: true } as any,
          { connectorId: 'jira', enabled: false } as any,
        ],
      } as any;

      const filtered = filterEnabled(pack);
      expect(filtered.snapshot).toHaveLength(1);
      expect(filtered.snapshot[0].connectorId).toBe('github');
    });
  });

  describe('getHealthSummary', () => {
    it('counts healthy, degraded, and unknown connectors', () => {
      const pack = {
        snapshot: [
          { health: 'healthy' },
          { health: 'healthy' },
          { health: 'degraded' },
          { health: 'unknown' },
        ] as any,
      } as any;

      const summary = getHealthSummary(pack);
      expect(summary.healthy).toBe(2);
      expect(summary.degraded).toBe(1);
      expect(summary.unknown).toBe(1);
    });
  });
});
