import fs from "node:fs";
import path from "node:path";

export interface Skill {
  id: string;
  name: string;
  category: string;
  description: string;
  version: string;
  owner?: 'orchestrator' | 'shared' | 'agent';
  author?: string;
  tags: string[];
  instructions: string;
  triggers?: string[];
  dependencies?: string[];
}

export interface SkillManifest {
  skills: Skill[];
  source: string;
  loadedAt: string;
}

export class SkillLoader {
  private searchPaths: string[];

  constructor(searchPaths?: string[]) {
    this.searchPaths = searchPaths || [
      path.join(process.env.HOME || "~", ".ai-pm", "skills"),
      path.join(process.cwd(), ".ai-pm-skills"),
    ];
  }

  async loadSkills(): Promise<Skill[]> {
    const skills: Skill[] = [];
    for (const searchPath of this.searchPaths) {
      if (!fs.existsSync(searchPath)) continue;
      const items = fs.readdirSync(searchPath, { withFileTypes: true });
      for (const item of items) {
        if (!item.isDirectory()) continue;
        const skillFile = path.join(searchPath, item.name, "skill.json");
        if (fs.existsSync(skillFile)) {
          try {
            const data = JSON.parse(fs.readFileSync(skillFile, "utf-8"));
            const mdFile = path.join(searchPath, item.name, "instructions.md");
            const instructions = fs.existsSync(mdFile) ? fs.readFileSync(mdFile, "utf-8") : "";
            skills.push({
              id: data.id || item.name,
              name: data.name || item.name,
              category: data.category || "general",
              description: data.description || "",
              version: data.version || "1.0.0",
              owner: data.owner,
              author: data.author,
              tags: data.tags || [],
              instructions: data.instructions || instructions,
              triggers: data.triggers,
              dependencies: data.dependencies,
            });
          } catch {}
        }
      }
    }
    return skills;
  }

  addSearchPath(p: string): void { this.searchPaths.push(p); }
}
