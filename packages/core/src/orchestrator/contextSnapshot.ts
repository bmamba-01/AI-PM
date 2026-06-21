/**
 * MCP/DB Context Snapshot
 *
 * Reads existing MCP registry/profile files and produces a normalized
 * connector availability snapshot for orchestrator context packs.
 *
 * INTEGRATION ASSUMPTIONS:
 * - Registry YAML is at mcp/registry.yaml
 * - Profile YAMLs are at mcp/profiles/*.yaml
 * - Project config is at .superagent/mcp-config.json
 * - All connector access is read-only (no vendor API calls)
 *
 * Once Agent 1 merges, this module can be extended with:
 * - Real health checks (ping endpoints)
 * - SQLite-backed persistence
 * - Real-time status updates via WebSocket
 */

import { readFile } from 'node:fs/promises';
import { load as yamlLoad } from 'js-yaml';
import path from 'node:path';

// ─── Types ──────────────────────────────────────────────────────────────────

export type ConnectorHealth = 'healthy' | 'degraded' | 'unknown';

export type CapabilityType = 'read' | 'mutation';

export interface ConnectorSnapshot {
  connectorId: string;
  category: string;
  enabled: boolean;
  health: ConnectorHealth;
  readCapabilities: string[];
  mutationCapabilities: string[];
  approvalRequired: boolean;
  degradedWorkflowBehavior: Record<string, unknown>;
}

export interface ProfileSnapshot {
  profileName: string;
  description: string;
  enabledServers: string[];
  disabledServers: string[];
  workflowBehavior: Record<string, unknown>;
}

export interface ContextPack {
  projectRoot: string;
  snapshot: ConnectorSnapshot[];
  profile: ProfileSnapshot | null;
  availableCapabilities: {
    read: string[];
    mutation: string[];
  };
  requiredForWorkflows: Record<string, string[]>;
  timestamp: string;
}

// ─── Registry parser ────────────────────────────────────────────────────────

interface RegistryServer {
  category: string;
  priority?: number;
  contracts?: string[];
  required_for?: string[];
  read_capabilities?: string[];
  mutation_capabilities?: string[];
  approval_required?: boolean;
}

interface RegistryData {
  version: number;
  defaults: {
    access_mode: string;
    mutation_policy: string;
    unavailable_behavior: string;
  };
  servers: Record<string, RegistryServer>;
}

function parseRegistry(raw: string): RegistryData {
  const data = yamlLoad(raw) as Record<string, unknown>;
  return {
    version: (data.version as number) ?? 1,
    defaults: {
      access_mode: (data.defaults as Record<string, string>)?.access_mode ?? 'read_only',
      mutation_policy: (data.defaults as Record<string, string>)?.mutation_policy ?? 'approval_required',
      unavailable_behavior: (data.defaults as Record<string, string>)?.unavailable_behavior ?? 'degrade_gracefully',
    },
    servers: (data.servers as Record<string, RegistryServer>) ?? {},
  };
}

// ─── Profile parser ─────────────────────────────────────────────────────────

interface ProfileData {
  version: number;
  name: string;
  description: string;
  enabled_servers: string[];
  optional_servers?: string[];
  disabled_online_servers?: string[];
  workflow_behavior?: Record<string, unknown>;
  workflow_expectations?: Record<string, unknown>;
}

function parseProfile(raw: string): ProfileData {
  const data = yamlLoad(raw) as Record<string, unknown>;
  return {
    version: (data.version as number) ?? 1,
    name: (data.name as string) ?? 'unknown',
    description: (data.description as string) ?? '',
    enabled_servers: (data.enabled_servers as string[]) ?? [],
    optional_servers: (data.optional_servers as string[]) ?? [],
    disabled_online_servers: (data.disabled_online_servers as string[]) ?? [],
    workflow_behavior: (data.workflow_behavior as Record<string, unknown>) ?? {},
    workflow_expectations: (data.workflow_expectations as Record<string, unknown>) ?? {},
  };
}

// ─── Snapshot builder ───────────────────────────────────────────────────────

function buildConnectorSnapshot(
  connectorId: string,
  server: RegistryServer,
  enabled: boolean,
): ConnectorSnapshot {
  return {
    connectorId,
    category: server.category ?? 'unknown',
    enabled,
    health: enabled ? 'healthy' : 'unknown',
    readCapabilities: server.read_capabilities ?? [],
    mutationCapabilities: server.mutation_capabilities ?? [],
    approvalRequired: true, // default from registry defaults
    degradedWorkflowBehavior: {},
  };
}

// ─── Public API ─────────────────────────────────────────────────────────────

/**
 * Load and parse the MCP registry file.
 * Returns null if file not found or invalid.
 */
export async function loadRegistry(registryPath: string): Promise<RegistryData | null> {
  try {
    const raw = await readFile(registryPath, 'utf-8');
    return parseRegistry(raw);
  } catch {
    return null;
  }
}

/**
 * Load and parse a profile file.
 * Returns null if file not found or invalid.
 */
export async function loadProfile(profilePath: string): Promise<ProfileData | null> {
  try {
    const raw = await readFile(profilePath, 'utf-8');
    return parseProfile(raw);
  } catch {
    return null;
  }
}

/**
 * Build a connector snapshot from registry data.
 * This is a pure function — no network calls, no file I/O.
 */
export function buildSnapshot(
  registry: RegistryData,
  enabledConnectors: string[],
): ConnectorSnapshot[] {
  return Object.entries(registry.servers).map(([id, server]) =>
    buildConnectorSnapshot(id, server, enabledConnectors.includes(id)),
  );
}

/**
 * Build a profile snapshot from profile data.
 * This is a pure function — no network calls, no file I/O.
 */
export function buildProfileSnapshot(profile: ProfileData): ProfileSnapshot {
  return {
    profileName: profile.name,
    description: profile.description,
    enabledServers: profile.enabled_servers,
    disabledServers: profile.disabled_online_servers ?? [],
    workflowBehavior: profile.workflow_behavior ?? {},
  };
}

/**
 * Compute available capabilities from a list of connector snapshots.
 * Returns read and mutation capabilities across all enabled connectors.
 */
export function computeCapabilities(snapshots: ConnectorSnapshot[]): {
  read: string[];
  mutation: string[];
} {
  const readSet = new Set<string>();
  const mutationSet = new Set<string>();

  for (const snapshot of snapshots) {
    if (!snapshot.enabled) continue;
    for (const cap of snapshot.readCapabilities) readSet.add(cap);
    for (const cap of snapshot.mutationCapabilities) mutationSet.add(cap);
  }

  return {
    read: Array.from(readSet).sort(),
    mutation: Array.from(mutationSet).sort(),
  };
}

/**
 * Build required-for-workflows map from registry data.
 */
export function buildRequiredForWorkflows(registry: RegistryData): Record<string, string[]> {
  const map: Record<string, string[]> = {};

  for (const [connectorId, server] of Object.entries(registry.servers)) {
    if (!server.required_for) continue;
    for (const workflow of server.required_for) {
      if (!map[workflow]) map[workflow] = [];
      map[workflow].push(connectorId);
    }
  }

  return map;
}

/**
 * Build a full context pack from registry and optional profile data.
 * This is the main entry point for orchestrator context consumption.
 */
export async function buildContextPack(
  projectRoot: string,
  options: {
    registryPath?: string;
    profileName?: string;
    profilesDir?: string;
  } = {},
): Promise<ContextPack> {
  const registryPath = options.registryPath ?? path.join(projectRoot, 'mcp', 'registry.yaml');
  const profilesDir = options.profilesDir ?? path.join(projectRoot, 'mcp', 'profiles');

  // Load registry
  const registry = await loadRegistry(registryPath);
  if (!registry) {
    return {
      projectRoot,
      snapshot: [],
      profile: null,
      availableCapabilities: { read: [], mutation: [] },
      requiredForWorkflows: {},
      timestamp: new Date().toISOString(),
    };
  }

  // Load profile (optional)
  let profileData: ProfileData | null = null;
  if (options.profileName) {
    const profilePath = path.join(profilesDir, `${options.profileName}.yaml`);
    profileData = await loadProfile(profilePath);
  }

  // Determine enabled connectors
  const enabledConnectors = profileData?.enabled_servers ?? Object.keys(registry.servers);

  // Build snapshots
  const snapshot = buildSnapshot(registry, enabledConnectors);
  const profile = profileData ? buildProfileSnapshot(profileData) : null;
  const availableCapabilities = computeCapabilities(snapshot);
  const requiredForWorkflows = buildRequiredForWorkflows(registry);

  return {
    projectRoot,
    snapshot,
    profile,
    availableCapabilities,
    requiredForWorkflows,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Filter a context pack to only include enabled connectors.
 */
export function filterEnabled(pack: ContextPack): ContextPack {
  return {
    ...pack,
    snapshot: pack.snapshot.filter(s => s.enabled),
  };
}

/**
 * Get a summary of connector health for a context pack.
 */
export function getHealthSummary(pack: ContextPack): Record<ConnectorHealth, number> {
  const summary: Record<ConnectorHealth, number> = {
    healthy: 0,
    degraded: 0,
    unknown: 0,
  };

  for (const connector of pack.snapshot) {
    summary[connector.health]++;
  }

  return summary;
}
