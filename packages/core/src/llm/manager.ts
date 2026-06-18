import { OllamaClient, type GenerateOptions } from "./ollama.js";

export type ModelProvider = "ollama" | "openai" | "anthropic" | "gemini";

export interface ModelRoute {
  provider: ModelProvider;
  model: string;
  capabilities: string[];
  priority: number;
}

export class ModelManager {
  private ollama: OllamaClient;
  private routes: ModelRoute[] = [];
  private fallbackOrder: ModelProvider[] = ["ollama"];

  constructor(ollamaConfig?: any) {
    this.ollama = new OllamaClient(ollamaConfig);
    // Default route: use Ollama for everything offline
    this.routes = [
      { provider: "ollama", model: "llama3.2", capabilities: ["reasoning", "code", "docs", "chat"], priority: 1 },
      { provider: "ollama", model: "codellama", capabilities: ["code"], priority: 2 },
    ];
  }

  async route(taskType: string, prompt: string, options?: Partial<GenerateOptions>): Promise<string> {
    const matched = this.routes
      .filter(r => r.capabilities.includes(taskType))
      .sort((a, b) => a.priority - b.priority);

    for (const route of matched) {
      if (route.provider === "ollama") {
        try {
          const available = await this.ollama.isAvailable();
          if (!available) continue;
          return await this.ollama.generate({ ...options, prompt, model: route.model });
        } catch (err) {
          console.warn(`[model-manager] ${route.provider}/${route.model} failed:`, err);
          continue;
        }
      }
    }
    throw new Error(`No available model for task: ${taskType}`);
  }

  async healthCheck(): Promise<Record<ModelProvider, boolean>> {
    return { ollama: await this.ollama.isAvailable(), openai: false, anthropic: false, gemini: false };
  }
}

