/**
 * MCP Doctor — inspect project MCP setup against registry and profile.
 *
 * Reports:
 * - Which servers are configured, enabled, disabled, or missing
 * - Missing env vars for online connectors
 * - Mutation approval requirements
 * - Degraded workflows due to missing/disabled connectors
 * - Overall health status
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import type { RegistryConfig, ProfileConfig } from "./configTypes.js";

// ── Types ──────────────────────────────────────────────────────────────────

export interface ConnectorReport {
  server_id: string;
  category: string;
  status: "enabled" | "disabled" | "not_configured";
  configured: boolean;
  has_token: boolean;
  has_url: boolean;
  missing_env_vars: string[];
  mutation_capabilities: string[];
  approval_required: boolean;
}

export interface WorkflowDegradation {
  workflow_id: string;
  required_servers: string[];
  available_servers: string[];
  missing_servers: string[];
  degraded: boolean;
  degraded_reasons: string[];
}

export interface MutationReport {
  global_approval_required: boolean;
  servers_with_mutations: string[];
  mutation_count: number;
}

export interface DoctorReport {
  profile: string;
  project_root: string;
  checked_at: string;
  health: "healthy" | "degraded" | "critical";
  connectors: ConnectorReport[];
  workflows: WorkflowDegradation[];
  mutations: MutationReport;
  summary: {
    total_connectors: number;
    enabled: number;
    disabled: number;
    not_configured: number;
    total_workflows: number;
    degraded_workflows: number;
    total_mutations: number;
  };
}

// ── Env var mappings ────────────────────────────────────────────────────────

const SERVER_ENV_VARS: Record<string, string[]> = {
  github: ["GITHUB_TOKEN", "GITHUB_API_TOKEN"],
  jira: ["JIRA_API_TOKEN", "JIRA_EMAIL"],
  linear: ["LINEAR_API_KEY", "LINEAR_TEAM_ID"],
  google_gmail: ["GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET", "GOOGLE_REFRESH_TOKEN"],
  google_calendar: ["GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET", "GOOGLE_REFRESH_TOKEN"],
  google_drive: ["GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET", "GOOGLE_REFRESH_TOKEN"],
  confluence: ["CONFLUENCE_BASE_URL", "CONFLUENCE_API_TOKEN"],
  notion: ["NOTION_API_KEY", "NOTION_VERSION"],
  slack: ["SLACK_BOT_TOKEN", "SLACK_APP_TOKEN"],
  teams: ["TEAMS_APP_ID", "TEAMS_APP_SECRET"],
};

// ── Project MCP config loader ───────────────────────────────────────────────

interface ProjectConfig {
  servers: Array<{
    id: string;
    enabled: boolean;
    token?: string;
    url?: string;
  }>;
}

function loadProjectConfig(projectRoot: string): ProjectConfig {
  const configPath = path.join(projectRoot, ".superagent", "mcp-config.json");
  try {
    const raw = fs.readFileSync(configPath, "utf-8");
    const parsed = JSON.parse(raw);
    return { servers: Array.isArray(parsed.servers) ? parsed.servers : [] };
  } catch {
    return { servers: [] };
  }
}

// ── Main doctor function ────────────────────────────────────────────────────

export function runDoctor(
  projectRoot: string,
  registry: RegistryConfig,
  profile: ProfileConfig,
): DoctorReport {
  const now = new Date().toISOString();
  const projectConfig = loadProjectConfig(projectRoot);

  // ── Connector analysis ─────────────────────────────────────────────────
  const connectors = Object.entries(registry.servers).map(([serverId, serverEntry]) => {
    const projectServer = projectConfig.servers.find(s => s.id === serverId);
    const isConfigured = !!projectServer;
    const isEnabled = isConfigured && projectServer!.enabled;
    const hasToken = isConfigured ? Boolean(projectServer!.token) : false;
    const hasUrl = isConfigured ? Boolean(projectServer!.url) : false;

    // Check profile enabled/disabled status
    const profileEnabled = (profile.enabled_servers ?? []).includes(serverId);
    const profileDisabled = (profile.disabled_online_servers ?? []).includes(serverId);

    // Determine status — project config takes priority over profile
    let status: ConnectorReport["status"];
    if (isConfigured) {
      // Project explicitly configured this server — use project config
      status = isEnabled ? "enabled" : "disabled";
    } else if (profileDisabled) {
      // Profile explicitly disables this server (e.g., offline-local profile)
      status = "disabled";
    } else {
      status = "not_configured";
    }

    // Check env vars
    const envVars = SERVER_ENV_VARS[serverId] ?? [];
    const missingEnvVars = envVars.filter(envVar => !process.env[envVar]);

    return {
      server_id: serverId,
      category: serverEntry.category,
      status,
      configured: isConfigured,
      has_token: hasToken,
      has_url: hasUrl,
      missing_env_vars: missingEnvVars,
      mutation_capabilities: serverEntry.mutation_capabilities,
      approval_required: serverEntry.mutation_capabilities.length > 0,
    };
  });

  // ── Workflow degradation analysis ──────────────────────────────────────
  const enabledServerIds = connectors
    .filter(c => c.status === "enabled")
    .map(c => c.server_id);

  const workflows = analyzeWorkflowDegradation(registry, connectors);

  // ── Mutation analysis ──────────────────────────────────────────────────
  const serversWithMutations = Object.entries(registry.servers)
    .filter(([_, server]) => server.mutation_capabilities.length > 0)
    .map(([id, server]) => ({ id, count: server.mutation_capabilities.length }));

  const mutations: MutationReport = {
    global_approval_required: registry.approval_required_for_all_mutations === true,
    servers_with_mutations: serversWithMutations.map(s => s.id),
    mutation_count: serversWithMutations.reduce((sum, s) => sum + s.count, 0),
  };

  // ── Summary ────────────────────────────────────────────────────────────
  const enabled = connectors.filter(c => c.status === "enabled").length;
  const disabled = connectors.filter(c => c.status === "disabled").length;
  const notConfigured = connectors.filter(c => c.status === "not_configured").length;
  const degradedWorkflows = workflows.filter(w => w.degraded).length;

  // ── Health determination ────────────────────────────────────────────────
  // healthy:   no workflow degradation, or all required servers are available
  // degraded:  some workflows degraded (missing required servers)
  // critical:  all configured connectors are disabled AND workflows degraded
  let health: DoctorReport["health"] = "healthy";
  if (degradedWorkflows > 0) {
    health = "degraded";
  }
  if (degradedWorkflows > 0 && enabled === 0 && disabled > 0 && notConfigured === 0) {
    health = "critical";
  }

  return {
    profile: profile.name,
    project_root: projectRoot,
    checked_at: now,
    health,
    connectors,
    workflows,
    mutations,
    summary: {
      total_connectors: connectors.length,
      enabled,
      disabled,
      not_configured: notConfigured,
      total_workflows: workflows.length,
      degraded_workflows: degradedWorkflows,
      total_mutations: mutations.mutation_count,
    },
  };
}

// ── Workflow degradation analysis ───────────────────────────────────────────

function analyzeWorkflowDegradation(
  registry: RegistryConfig,
  connectors: ConnectorReport[],
): WorkflowDegradation[] {
  const enabledServerIds = connectors
    .filter(c => c.status === "enabled")
    .map(c => c.server_id);

  // Build a map of workflow_id → servers that require it
  const workflowMap: Record<string, { required: Set<string>; available: Set<string> }> = {};

  for (const [serverId, serverEntry] of Object.entries(registry.servers)) {
    for (const wf of serverEntry.required_for) {
      if (wf === "all_workflows") continue;
      if (!workflowMap[wf]) {
        workflowMap[wf] = { required: new Set(), available: new Set() };
      }
      workflowMap[wf].required.add(serverId);
      if (enabledServerIds.includes(serverId)) {
        workflowMap[wf].available.add(serverId);
      }
    }
  }

  return Object.entries(workflowMap).map(([workflowId, { required, available }]) => {
    const missing = Array.from(required).filter(id => !available.has(id));
    const degraded = missing.length > 0;
    const degradedReasons: string[] = [];
    if (degraded) {
      degradedReasons.push(
        `Missing required server(s): ${missing.join(", ")}`,
      );
    }

    return {
      workflow_id: workflowId,
      required_servers: Array.from(required).sort(),
      available_servers: Array.from(available).sort(),
      missing_servers: missing.sort(),
      degraded,
      degraded_reasons: degradedReasons,
    };
  });
}
