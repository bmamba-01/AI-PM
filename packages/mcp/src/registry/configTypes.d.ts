export type ConnectorCategory = "source_control" | "work_tracking" | "documentation" | "communication" | "calendar" | "local_memory";
export type WorkflowId = "daily-briefing" | "meeting-intelligence" | "scope-control" | "risk-control" | "reporting" | "code-quality-guard" | "agent-supervision" | "audit" | "workflow_state" | "all_workflows";
export interface RegistryDefaults {
    access_mode: string;
    mutation_policy: string;
    unavailable_behavior: string;
}
export interface RegistryServerEntry {
    category: string;
    priority: number;
    contracts: string[];
    required_for: string[];
    read_capabilities: string[];
    mutation_capabilities: string[];
}
export interface RegistryConfig {
    version: number;
    description?: string;
    defaults: RegistryDefaults;
    servers: Record<string, RegistryServerEntry>;
    approval_required_for_all_mutations?: boolean;
}
export interface ProfileServerEntry {
    minimum_servers?: string[];
    recommended_servers?: string[];
    degraded_sources?: Array<{
        name: string;
        fallback: string;
    }>;
}
export interface ProfileConfig {
    version: number;
    name: string;
    description?: string;
    enabled_servers?: string[];
    optional_servers?: string[];
    disabled_online_servers?: string[];
    workflow_expectations?: Record<string, ProfileServerEntry>;
    workflow_behavior?: Record<string, Record<string, boolean | string>>;
    connector_policies?: Record<string, string | number | boolean>;
}
//# sourceMappingURL=configTypes.d.ts.map