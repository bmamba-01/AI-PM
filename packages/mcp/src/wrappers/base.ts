export interface MCPTool {
  name: string;
  description: string;
  inputSchema: any;
}

export interface MCPResource {
  uri: string;
  name: string;
  mimeType?: string;
}

export interface MCPConnection {
  id: string;
  name: string;
  server: string;
  status: "connected" | "disconnected" | "error";
  tools: MCPTool[];
  resources: MCPResource[];
  lastHealthCheck: string | null;
  errorCount: number;
}

export abstract class BaseMCPWrapper {
  protected connection: MCPConnection;
  private healthCheckInterval: ReturnType<typeof setInterval> | null = null;

  constructor(id: string, name: string, server: string) {
    this.connection = { id, name, server, status: "disconnected", tools: [], resources: [], lastHealthCheck: null, errorCount: 0 };
  }

  abstract connect(): Promise<void>;
  abstract disconnect(): Promise<void>;
  abstract healthCheck(): Promise<boolean>;

  async callTool(name: string, args: Record<string, any>): Promise<any> {
    if (this.connection.status !== "connected") throw new Error(`${this.connection.name} not connected`);
    return this.executeTool(name, args);
  }

  protected abstract executeTool(name: string, args: Record<string, any>): Promise<any>;

  startHealthCheck(intervalMs = 30000): void {
    this.healthCheckInterval = setInterval(async () => {
      try {
        const ok = await this.healthCheck();
        this.connection.status = ok ? "connected" : "error";
        this.connection.lastHealthCheck = new Date().toISOString();
        if (!ok) this.connection.errorCount++;
      } catch {
        this.connection.status = "error";
        this.connection.errorCount++;
      }
    }, intervalMs);
  }

  stopHealthCheck(): void {
    if (this.healthCheckInterval) clearInterval(this.healthCheckInterval);
  }

  getConnection(): MCPConnection { return { ...this.connection }; }
}
