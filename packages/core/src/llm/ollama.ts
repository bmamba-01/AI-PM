import http from "node:http";

export interface OllamaConfig {
  host?: string;
  port?: number;
  model?: string;
  timeout?: number;
}

export interface GenerateOptions {
  model?: string;
  prompt: string;
  system?: string;
  temperature?: number;
  maxTokens?: number;
  stream?: boolean;
}

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export class OllamaClient {
  private host: string;
  private port: number;
  private defaultModel: string;
  private timeout: number;

  constructor(config: OllamaConfig = {}) {
    this.host = config.host || "localhost";
    this.port = config.port || 11434;
    this.defaultModel = config.model || "llama3.2";
    this.timeout = config.timeout || 30000;
  }

  private request(endpoint: string, body: any): Promise<any> {
    return new Promise((resolve, reject) => {
      const data = JSON.stringify(body);
      const req = http.request({
        hostname: this.host,
        port: this.port,
        path: endpoint,
        method: "POST",
        headers: { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(data) },
        timeout: this.timeout,
      }, (res) => {
        let chunks = "";
        res.on("data", (c) => chunks += c);
        res.on("end", () => { try { resolve(JSON.parse(chunks)); } catch { resolve(chunks); } });
      });
      req.on("error", reject);
      req.on("timeout", () => { req.destroy(); reject(new Error("Ollama timeout")); });
      req.write(data);
      req.end();
    });
  }

  async generate(options: GenerateOptions): Promise<string> {
    const result = await this.request("/api/generate", {
      model: options.model || this.defaultModel,
      prompt: options.prompt,
      system: options.system,
      options: { temperature: options.temperature ?? 0.7, num_predict: options.maxTokens ?? 2048 },
    });
    return typeof result === "string" ? result : result.response || "";
  }

  async chat(messages: ChatMessage[], model?: string): Promise<string> {
    const result = await this.request("/api/chat", {
      model: model || this.defaultModel,
      messages,
    });
    return result?.message?.content || "";
  }

  async isAvailable(): Promise<boolean> {
    try {
      await this.request("/api/tags", {});
      return true;
    } catch { return false; }
  }

  async listModels(): Promise<string[]> {
    try {
      const result = await this.request("/api/tags", {});
      return (result?.models || []).map((m: any) => m.name);
    } catch { return []; }
  }
}

