export interface MCPServerConfig {
    id: string;
    name: string;
    type: 'github' | 'jira' | 'linear' | 'notion' | 'slack' | 'google' | 'custom';
    enabled: boolean;
    url?: string;
    token?: string;
    [key: string]: any;
}
export interface MCPConfig {
    version: string;
    servers: MCPServerConfig[];
}
/**
 * Get the path to the MCP config file for a given project root
 */
export declare function getMcpConfigPath(projectRoot: string): string;
/**
 * Load MCP config from file; returns default if file doesn't exist or invalid
 */
export declare function loadMcpConfig(projectRoot: string): MCPConfig;
/**
 * Save MCP config to file
 */
export declare function saveMcpConfig(projectRoot: string, config: MCPConfig): void;
/**
 * Add or update a server config
 */
export declare function upsertMcpServer(projectRoot: string, server: MCPServerConfig): MCPConfig;
/**
 * Remove a server by id
 */
export declare function removeMcpServer(projectRoot: string, serverId: string): MCPConfig;
/**
 * Enable/disable a server
 */
export declare function setMcpServerEnabled(projectRoot: string, serverId: string, enabled: boolean): MCPConfig;
//# sourceMappingURL=connectionManager.d.ts.map