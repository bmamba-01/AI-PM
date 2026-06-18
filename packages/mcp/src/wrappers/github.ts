import { BaseMCPWrapper } from "./base.js";

export class GitHubMCPWrapper extends BaseMCPWrapper {
  constructor(token?: string) {
    super("github", "GitHub", "mcp-github");
    this.token = token || process.env.GITHUB_TOKEN || "";
  }
  private token: string;

  async connect(): Promise<void> {
    this.connection.status = "connected";
    this.connection.tools = [
      { name: "list_repos", description: "List repositories", inputSchema: { type: "object", properties: { owner: { type: "string" } } } },
      { name: "create_issue", description: "Create an issue", inputSchema: { type: "object", properties: { repo: { type: "string" }, title: { type: "string" }, body: { type: "string" } } } },
      { name: "list_prs", description: "List pull requests", inputSchema: { type: "object", properties: { repo: { type: "string" } } } },
      { name: "create_pr", description: "Create a pull request", inputSchema: { type: "object", properties: { repo: { type: "string" }, title: { type: "string" }, head: { type: "string" }, base: { type: "string" } } } },
    ];
  }

  async disconnect(): Promise<void> { this.connection.status = "disconnected"; }
  async healthCheck(): Promise<boolean> { return this.token.length > 0; }

  protected async executeTool(name: string, args: Record<string, any>): Promise<any> {
    const headers = { Authorization: `token ${this.token}`, Accept: "application/vnd.github.v3+json" };
    const base = "https://api.github.com";
    switch (name) {
      case "list_repos": {
        const res = await fetch(`${base}/user/repos`, { headers });
        return res.json();
      }
      case "create_issue": {
        const res = await fetch(`${base}/repos/${args.repo}/issues`, { method: "POST", headers: { ...headers, "Content-Type": "application/json" }, body: JSON.stringify({ title: args.title, body: args.body }) });
        return res.json();
      }
      default: throw new Error(`Unknown tool: ${name}`);
    }
  }
}
