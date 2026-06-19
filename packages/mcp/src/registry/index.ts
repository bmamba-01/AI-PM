import type { BaseMCPWrapper } from "../wrappers/base.js";
export * from "./configTypes.js";
export * from "./configLoader.js";
export * from "./configValidator.js";

export class MCPRegistry {
  private connections = new Map<string, BaseMCPWrapper>();
  private healthCheckInterval = 30000;

  register(wrapper: BaseMCPWrapper): void {
    this.connections.set(wrapper.getConnection().id, wrapper);
  }

  async connectAll(): Promise<void> {
    for (const [id, wrapper] of this.connections) {
      try {
        await wrapper.connect();
        wrapper.startHealthCheck(this.healthCheckInterval);
        console.log(`[mcp] connected: ${id}`);
      } catch (err) {
        console.error(`[mcp] failed to connect ${id}:`, err);
      }
    }
  }

  async disconnectAll(): Promise<void> {
    for (const [id, wrapper] of this.connections) {
      wrapper.stopHealthCheck();
      try { await wrapper.disconnect(); } catch {}
      console.log(`[mcp] disconnected: ${id}`);
    }
  }

  async callTool(connectionId: string, toolName: string, args: Record<string, any>): Promise<any> {
    const wrapper = this.connections.get(connectionId);
    if (!wrapper) throw new Error(`Connection ${connectionId} not found`);
    return wrapper.callTool(toolName, args);
  }

  getStatus(): Record<string, any> {
    const status: Record<string, any> = {};
    for (const [id, wrapper] of this.connections) {
      status[id] = wrapper.getConnection();
    }
    return status;
  }

  getConnectedCount(): number {
    return [...this.connections.values()].filter(w => w.getConnection().status === "connected").length;
  }

  getTotalCount(): number { return this.connections.size; }

  setHealthCheckInterval(ms: number): void { this.healthCheckInterval = ms; }
}
