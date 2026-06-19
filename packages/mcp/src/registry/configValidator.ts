import fs from "fs";
import path from "path";
import yaml from "yaml";
import type { RegistryConfig, ProfileConfig, WorkflowId } from "./configTypes.js";

export interface ValidationIssue {
  severity: "error" | "warning" | "info";
  code: string;
  message: string;
  context?: Record<string, string | undefined>;
}

export interface ValidationReport {
  valid: boolean;
  issues: ValidationIssue[];
  summary: string;
  checkedAt: string;
}

export function validateConfigs(
  registry: RegistryConfig,
  profiles: ProfileConfig[] = []
): ValidationReport {
  const issues: ValidationIssue[] = [];
  const checkedAt = new Date().toISOString();

  // Guard: if registry shape is invalid, report error and skip further checks
  if (!registry || typeof registry !== "object" || !registry.defaults || !registry.servers || typeof registry.servers !== "object") {
    issues.push({
      severity: "error",
      code: "INVALID_REGISTRY_SHAPE",
      message: "Registry is missing required keys (defaults, servers).",
    });
    const summary = "1 error(s), 0 warning(s), 0 info(s) — configuration has violations";
    return { valid: false, issues, summary, checkedAt };
  }

  validateGlobalApprovalPolicy(registry, issues);
  validateContractReferences(registry, issues);
  validateWorkflowServerReferences(registry, issues);
  validateProfileReferences(registry, profiles, issues);

  const errors = issues.filter(i => i.severity === "error");
  const warnings = issues.filter(i => i.severity === "warning");
  const infos = issues.filter(i => i.severity === "info");

  const summary = [
    `${errors.length} error(s), ${warnings.length} warning(s), ${infos.length} info(s)`,
    errors.length === 0 ? "configuration is structurally valid" : "configuration has violations",
  ].join(" — ");

  return {
    valid: errors.length === 0,
    issues,
    summary,
    checkedAt,
  };
}

function validateGlobalApprovalPolicy(registry: RegistryConfig, issues: ValidationIssue[]): void {
  const hasMutationCapabilities = Object.values(registry.servers).some(
    s => s.mutation_capabilities.length > 0
  );

  if (!hasMutationCapabilities) return;

  const defaultPolicy = registry.defaults.mutation_policy;
  const globalOverride = registry.approval_required_for_all_mutations;

  if (defaultPolicy !== "approval_required" && globalOverride !== true) {
    issues.push({
      severity: "warning",
      code: "MUTATION_POLICY_UNDEFINED",
      message:
        "Global mutation policy is not set to approval_required, but connectors declare mutation capabilities.",
      context: {
        defaults_mutation_policy: defaultPolicy,
        approval_required_for_all_mutations: String(globalOverride),
      },
    });
  }
}

function validateContractReferences(registry: RegistryConfig, issues: ValidationIssue[]): void {
  const contractsDir = resolveContractsDir();
  if (!fs.existsSync(contractsDir)) {
    issues.push({
      severity: "error",
      code: "CONTRACTS_DIR_MISSING",
      message: `Contracts directory not found at ${contractsDir}`,
    });
    return;
  }

  const existingFiles = new Set(
    fs
      .readdirSync(contractsDir)
      .filter((f): f is string => typeof f === "string" && f.endsWith(".md"))
      .map(f => f.replace(/\.md$/, ""))
  );

  const referenced = new Set<string>();
  for (const server of Object.values(registry.servers)) {
    for (const contract of server.contracts) {
      referenced.add(contract);
    }
  }

  for (const contract of referenced) {
    if (!existingFiles.has(contract)) {
      issues.push({
        severity: "error",
        code: "MISSING_CONTRACT_FILE",
        message: `Contract "${contract}" is referenced in registry but not found under mcp/contracts/`,
        context: { contract, contracts_dir: contractsDir },
      });
    }
  }
}

function validateWorkflowServerReferences(registry: RegistryConfig, issues: ValidationIssue[]): void {
  for (const [serverId, server] of Object.entries(registry.servers)) {
    for (const workflow of server.required_for) {
      if (workflow === "all_workflows") continue;
      if (!isKnownWorkflow(workflow)) {
        issues.push({
          severity: "warning",
          code: "UNKNOWN_WORKFLOW_ID",
          message: `Server "${serverId}" references unknown workflow "${workflow}" in required_for.`,
          context: { server_id: serverId, workflow_id: workflow },
        });
      }
    }
  }

  for (const server of Object.values(registry.servers)) {
    const missingCapabilities = server.read_capabilities.filter(
      cap => typeof cap !== "string" || cap.trim() === ""
    );
    const missingMutations = server.mutation_capabilities.filter(
      cap => typeof cap !== "string" || cap.trim() === ""
    );

    if (missingCapabilities.length > 0 || missingMutations.length > 0) {
      issues.push({
        severity: "warning",
        code: "EMPTY_CAPABILITY_ENTRY",
        message: `Server has empty or invalid capability entries.`,
        context: {
          read_capabilities: missingCapabilities.join(", ") || undefined,
          mutation_capabilities: missingMutations.join(", ") || undefined,
        },
      });
    }
  }
}

function validateProfileReferences(
  registry: RegistryConfig,
  profiles: ProfileConfig[],
  issues: ValidationIssue[]
): void {
  const serverIds = new Set(Object.keys(registry.servers));

  for (const profile of profiles) {
    const profileLabel = profile.name || "unnamed";

    const allReferenced = new Set<string>([
      ...(profile.enabled_servers ?? []),
      ...(profile.optional_servers ?? []),
      ...(profile.disabled_online_servers ?? []),
    ]);

    for (const id of allReferenced) {
      if (!serverIds.has(id)) {
        issues.push({
          severity: "error",
          code: "PROFILE_REFERENCES_UNKNOWN_SERVER",
          message: `Profile "${profileLabel}" references server "${id}" which is not defined in registry.`,
          context: { profile_name: profileLabel, server_id: id },
        });
      }
    }

    const workflowExpectations = (profile as unknown as Record<string, unknown>)
      .workflow_expectations as Record<string, { minimum_servers?: string[]; recommended_servers?: string[] }> | undefined;

    if (!workflowExpectations) continue;

    for (const [workflow, expectation] of Object.entries(workflowExpectations)) {
      const workflowLabel = workflow as WorkflowId;

      const minServers = Array.isArray(expectation.minimum_servers) ? expectation.minimum_servers : [];
      const recServers = Array.isArray(expectation.recommended_servers) ? expectation.recommended_servers : [];

      for (const serverId of minServers) {
        if (!serverIds.has(serverId)) {
          issues.push({
            severity: "error",
            code: "WORKFLOW_MINIMUM_SERVER_MISSING",
            message: `Workflow "${workflowLabel}" minimum server "${serverId}" is not in registry.`,
            context: { workflow_id: workflowLabel, server_id: serverId, profile_name: profileLabel },
          });
        }
      }

      for (const serverId of recServers) {
        if (!serverIds.has(serverId)) {
          issues.push({
            severity: "warning",
            code: "WORKFLOW_RECOMMENDED_SERVER_MISSING",
            message: `Workflow "${workflowLabel}" recommended server "${serverId}" is not in registry.`,
            context: { workflow_id: workflowLabel, server_id: serverId, profile_name: profileLabel },
          });
        }
      }
    }
  }
}

const KNOWN_WORKFLOWS = new Set([
  "daily-briefing",
  "meeting-intelligence",
  "scope-control",
  "risk-control",
  "reporting",
  "code-quality-guard",
  "agent-supervision",
  "audit",
  "workflow_state",
  "chat-gateway",
  "all_workflows",
]);

function isKnownWorkflow(id: string): id is WorkflowId {
  return KNOWN_WORKFLOWS.has(id);
}

function resolveContractsDir(): string {
  const here = path.resolve(__dirname, "../../../../../mcp/contracts");
  const candidates = [
    here,
    path.resolve(process.cwd(), "mcp/contracts"),
    path.resolve(process.cwd(), "../../mcp/contracts"),
  ];
  for (const dir of candidates) {
    if (fs.existsSync(dir)) return dir;
  }
  return here;
}

export { resolveContractsDir };
