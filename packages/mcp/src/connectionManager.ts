// MCP Connection Manager
// Handles loading/saving MCP server configurations per project

export interface MCPServerConfig {
  id: string; // kebab-case unique identifier
  name: string; // display name
  type: 'github' | 'jira' | 'linear' | 'notion' | 'slack' | 'google' | 'custom';
  enabled: boolean;
  // connection details (sensitive data should be stored in OS keyring or encrypted vault)
  // For MVP we store plaintext but note to improve later
  url?: string; // base URL for API
  token?: string; // personal access token or API key
  // additional fields per type can be added as needed
  [key: string]: any;
}

export interface MCPConfig {
  version: string;
  servers: MCPServerConfig[];
}

/**
 * Get the path to the MCP config file for a given project root
 */
export function getMcpConfigPath(projectRoot: string): string {
  return `${projectRoot}/.superagent/mcp-config.json`;
}

/**
 * Load MCP config from file; returns default if file doesn't exist or invalid
 */
export function loadMcpConfig(projectRoot: string): MCPConfig {
  const fs = require('fs');
  const path = require('path');
  const configPath = getMcpConfigPath(projectRoot);

  if (!fs.existsSync(configPath)) {
    return { version: '1.0', servers: [] };
  }

  try {
    const data = fs.readFileSync(configPath, 'utf-8');
    const parsed = JSON.parse(data) as MCPConfig;
    // simple validation
    if (!parsed.version || !Array.isArray(parsed.servers)) {
      return { version: '1.0', servers: [] };
    }
    return parsed;
  } catch (e) {
    console.warn('Failed to parse MCP config, using default:', e);
    return { version: '1.0', servers: [] };
  }
}

/**
 * Save MCP config to file
 */
export function saveMcpConfig(projectRoot: string, config: MCPConfig): void {
  const fs = require('fs');
  const path = require('path');
  const configPath = getMcpConfigPath(projectRoot);
  const dir = path.dirname(configPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  const data = JSON.stringify(config, null, 2);
  fs.writeFileSync(configPath, data, 'utf-8');
}

/**
 * Add or update a server config
 */
export function upsertMcpServer(projectRoot: string, server: MCPServerConfig): MCPConfig {
  const config = loadMcpConfig(projectRoot);
  const index = config.servers.findIndex(s => s.id === server.id);
  if (index >= 0) {
    config.servers[index] = server;
  } else {
    config.servers.push(server);
  }
  saveMcpConfig(projectRoot, config);
  return config;
}

/**
 * Remove a server by id
 */
export function removeMcpServer(projectRoot: string, serverId: string): MCPConfig {
  const config = loadMcpConfig(projectRoot);
  config.servers = config.servers.filter(s => s.id !== serverId);
  saveMcpConfig(projectRoot, config);
  return config;
}

/**
 * Enable/disable a server
 */
export function setMcpServerEnabled(projectRoot: string, serverId: string, enabled: boolean): MCPConfig {
  const config = loadMcpConfig(projectRoot);
  const server = config.servers.find(s => s.id === serverId);
  if (server) {
    server.enabled = enabled;
    saveMcpConfig(projectRoot, config);
  }
  return config;
}