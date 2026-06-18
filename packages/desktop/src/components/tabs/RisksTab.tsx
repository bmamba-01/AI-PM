import { Project } from "@ai-pm/core";

const risks = [
  { id: "R1", title: "Database migration timeline", level: "HIGH", category: "TECHNICAL", probability: 0.7, impact: 0.9, mitigation: "Parallel run old/new DB for 2 weeks", owner: "James", status: "MITIGATING" },
  { id: "R2", title: "Third-party API rate limits", level: "MEDIUM", category: "EXTERNAL", probability: 0.5, impact: 0.6, mitigation: "Implement caching + fallback", owner: "Maria", status: "MONITORING" },
  { id: "R3", title: "Key developer vacation Q3", level: "HIGH", category: "RESOURCE", probability: 1.0, impact: 0.8, mitigation: "Cross-train + document critical paths", owner: "Alex", status: "ASSESSED" }
];

const levelColors = { CRITICAL: "bg-red-600/20 text-red-400 border-red-500/30", HIGH: "bg-amber-600/20 text-amber-400 border-amber-500/30", MEDIUM: "bg-blue-600/20 text-blue-400 border-blue-500/30", LOW: "bg-green-600/20 text-green-400 border-green-500/30" };
const statusColors = { IDENTIFIED: "text-slate-400", ASSESSED: "text-blue-400", MITIGATING: "text-amber-400", MONITORING: "text-green-400", CLOSED: "text-slate-500" };

export function RisksTab({ project }: { project: Project }) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Risk Register</h2>
          <p className="text-slate-400">{risks.length} active risks • {risks.filter(r => r.level === "HIGH" || r.level === "CRITICAL").length} high/critical</p>
        </div>
        <button className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 rounded-lg text-sm font-medium">Add Risk</button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {risks.map(risk => (
          <div key={risk.id} className={`bg-slate-900 border rounded-xl p-5 ${levelColors[risk.level as keyof typeof levelColors]}`}>
            <div className="flex items-start justify-between mb-3">
              <span className="text-xs font-medium uppercase tracking-wider">{risk.id}</span>
              <span className={`px-2 py-0.5 text-xs rounded-full ${levelColors[risk.level as keyof typeof levelColors]}`}>{risk.level}</span>
            </div>
            <h3 className="font-medium text-white mb-2">{risk.title}</h3>
            <div className="space-y-2 text-sm text-slate-300">
              <div className="flex justify-between"><span>Category</span><span className="font-medium capitalize">{risk.category.toLowerCase()}</span></div>
              <div className="flex justify-between"><span>Probability</span><span className="font-medium">{Math.round(risk.probability * 100)}%</span></div>
              <div className="flex justify-between"><span>Impact</span><span className="font-medium">{Math.round(risk.impact * 100)}%</span></div>
              <div className="flex justify-between"><span>Score</span><span className="font-medium text-red-400">{Math.round(risk.probability * risk.impact * 100)}</span></div>
            </div>
            <div className="mt-3 p-3 bg-slate-800/50 rounded-lg text-xs text-slate-400">
              <p className="font-medium text-white mb-1">Mitigation</p>
              <p>{risk.mitigation}</p>
            </div>
            <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
              <span>Owner: <span className="text-white ml-1">{risk.owner}</span></span>
              <span className={`px-2 py-0.5 rounded ${statusColors[risk.status as keyof typeof statusColors]}`}>{risk.status.toLowerCase()}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
        <h3 className="font-medium text-white mb-4">Monte Carlo Simulation</h3>
        <div className="h-48 bg-slate-800/50 rounded-lg flex items-center justify-center text-slate-500">
          Chart visualization (completion date distribution) - coming soon
        </div>
      </div>
    </div>
  );
}