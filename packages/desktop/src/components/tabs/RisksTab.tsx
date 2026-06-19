import { Project } from "@ai-pm/core";

const risks = [
  { id: "R1", title: "Database migration timeline", level: "HIGH", category: "TECHNICAL", probability: 0.7, impact: 0.9, mitigation: "Parallel run old/new DB for 2 weeks", owner: "James", status: "MITIGATING" },
  { id: "R2", title: "Third-party API rate limits", level: "MEDIUM", category: "EXTERNAL", probability: 0.5, impact: 0.6, mitigation: "Implement caching + fallback", owner: "Maria", status: "MONITORING" },
  { id: "R3", title: "Key developer vacation Q3", level: "HIGH", category: "RESOURCE", probability: 1.0, impact: 0.8, mitigation: "Cross-train + document critical paths", owner: "Alex", status: "ASSESSED" }
];

const levelColors = { CRITICAL: "bg-[#FF3B30]/15 text-[#FF3B30] border-[#FF3B30]/25", HIGH: "bg-[#FF9500]/15 text-[#FF9500] border-[#FF9500]/25", MEDIUM: "bg-[#007AFF]/15 text-[#007AFF] border-[#007AFF]/25", LOW: "bg-[#34C759]/15 text-[#34C759] border-[#34C759]/25" };
const statusColors = { IDENTIFIED: "text-muted-foreground", ASSESSED: "text-[#007AFF]", MITIGATING: "text-[#FF9500]", MONITORING: "text-[#34C759]", CLOSED: "text-muted-foreground" };

export function RisksTab({ project }: { project: Project }) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Risk Register</h2>
          <p className="text-muted-foreground">{risks.length} active risks • {risks.filter(r => r.level === "HIGH" || r.level === "CRITICAL").length} high/critical</p>
        </div>
        <button className="px-4 py-2 bg-[#007AFF] hover:bg-[#007AFF]/80 rounded-lg text-sm font-medium text-white">Add Risk</button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {risks.map(risk => (
          <div key={risk.id} className={`glass-card rounded-xl p-5 ${levelColors[risk.level as keyof typeof levelColors]}`}>
            <div className="flex items-start justify-between mb-3">
              <span className="text-xs font-medium uppercase tracking-wider">{risk.id}</span>
              <span className={`px-2 py-0.5 text-xs rounded-full ${levelColors[risk.level as keyof typeof levelColors]}`}>{risk.level}</span>
            </div>
            <h3 className="font-medium text-foreground mb-2">{risk.title}</h3>
            <div className="space-y-2 text-sm text-muted-foreground">
              <div className="flex justify-between"><span>Category</span><span className="font-medium text-foreground capitalize">{risk.category.toLowerCase()}</span></div>
              <div className="flex justify-between"><span>Probability</span><span className="font-medium text-foreground">{Math.round(risk.probability * 100)}%</span></div>
              <div className="flex justify-between"><span>Impact</span><span className="font-medium text-foreground">{Math.round(risk.impact * 100)}%</span></div>
              <div className="flex justify-between"><span>Score</span><span className="font-medium text-[#FF3B30]">{Math.round(risk.probability * risk.impact * 100)}</span></div>
            </div>
            <div className="mt-3 p-3 glass rounded-lg text-xs text-muted-foreground">
              <p className="font-medium text-foreground mb-1">Mitigation</p>
              <p>{risk.mitigation}</p>
            </div>
            <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
              <span>Owner: <span className="text-foreground ml-1">{risk.owner}</span></span>
              <span className={`px-2 py-0.5 rounded ${statusColors[risk.status as keyof typeof statusColors]}`}>{risk.status.toLowerCase()}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="glass-card rounded-xl p-5">
        <h3 className="font-medium text-foreground mb-4">Monte Carlo Simulation</h3>
        <div className="h-48 glass rounded-lg flex items-center justify-center text-muted-foreground">
          Chart visualization (completion date distribution) - coming soon
        </div>
      </div>
    </div>
  );
}