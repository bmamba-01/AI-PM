import type { Skill } from "./loader.js";

export class SkillRegistry {
  private skills = new Map<string, Skill>();
  private byCategory = new Map<string, Skill[]>();

  register(skill: Skill): void {
    this.skills.set(skill.id, skill);
    const cat = this.byCategory.get(skill.category) || [];
    cat.push(skill);
    this.byCategory.set(skill.category, cat);
  }

  registerAll(skills: Skill[]): void { skills.forEach(s => this.register(s)); }

  get(id: string): Skill | undefined { return this.skills.get(id); }

  getByCategory(category: string): Skill[] { return this.byCategory.get(category) || []; }

  search(query: string): Skill[] {
    const q = query.toLowerCase();
    return [...this.skills.values()].filter(s =>
      s.name.toLowerCase().includes(q) ||
      s.description.toLowerCase().includes(q) ||
      s.tags.some(t => t.toLowerCase().includes(q))
    );
  }

  getAll(): Skill[] { return [...this.skills.values()]; }

  count(): number { return this.skills.size; }

  getStats(): Record<string, number> {
    const stats: Record<string, number> = {};
    for (const [cat, skills] of this.byCategory) stats[cat] = skills.length;
    return stats;
  }
}

