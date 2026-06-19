import React from "react";
import { Project } from "@ai-pm/core";

const backlogItems = [
  { id: 1, title: "User authentication system", type: "EPIC", priority: "P0", points: 21, status: "READY", assignee: "—" },
  { id: 2, title: "JWT token management", type: "STORY", priority: "P0", points: 5, status: "READY", assignee: "Alex" },
  { id: 3, title: "Password reset flow", type: "STORY", priority: "P1", points: 3, status: "REFINEMENT", assignee: "—" },
  { id: 4, title: "Social login (Google, GitHub)", type: "STORY", priority: "P2", points: 8, status: "BACKLOG", assignee: "—" },
  { id: 5, title: "API rate limiting", type: "STORY", priority: "P1", points: 5, status: "READY", assignee: "Maria" },
  { id: 6, title: "Request logging middleware", type: "STORY", priority: "P2", points: 2, status: "BACKLOG", assignee: "—" },
  { id: 7, title: "Database migration system", type: "EPIC", priority: "P0", points: 13, status: "REFINEMENT", assignee: "—" },
  { id: 8, title: "Automated backup strategy", type: "STORY", priority: "P1", points: 5, status: "BACKLOG", assignee: "James" }
];

const priorityColors = { P0: "bg-red-600/20 text-red-400", P1: "bg-amber-600/20 text-amber-400", P2: "bg-blue-600/20 text-blue-400", P3: "bg-slate-600/20 text-slate-400" };
const typeColors = { EPIC: "bg-purple-600/20 text-purple-400", STORY: "bg-indigo-600/20 text-indigo-400", TASK: "bg-green-600/20 text-green-400" };

export function BacklogTab({ project }: { project: Project }) {
  const [filter, setFilter] = React.useState("all");
  const [search, setSearch] = React.useState("");

  const filtered = backlogItems.filter(item => {
    if (filter !== "all" && item.status !== filter) return false;
    if (search && !item.title.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Product Backlog</h2>
          <p className="text-slate-400">{backlogItems.length} items • {backlogItems.reduce((a, b) => a + (b.points || 0), 0)} total points</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <input
            type="text"
            placeholder="Search backlog..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="px-4 py-2 glass-input rounded-lg text-white placeholder-muted-foreground w-64"
          />
          <select
            value={filter}
            onChange={e => setFilter(e.target.value)}
            className="px-4 py-2 glass-input rounded-lg text-white"
          >
            <option value="all">All Status</option>
            <option value="READY">Ready</option>
            <option value="REFINEMENT">Refinement</option>
            <option value="BACKLOG">Backlog</option>
          </select>
          <button className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 rounded-lg text-sm font-medium flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
            Add Item
          </button>
        </div>
      </div>

      <div className="glass-card overflow-hidden">
        <table className="w-full">
          <thead className="bg-white/5">
            <tr className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
              <th className="p-4">Priority</th>
              <th className="p-4">Type</th>
              <th className="p-4">Title</th>
              <th className="p-4">Points</th>
              <th className="p-4">Status</th>
              <th className="p-4">Assignee</th>
              <th className="p-4 w-24">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {filtered.map(item => (
              <tr key={item.id} className="hover:bg-white/5 transition-colors cursor-pointer">
                <td className="p-4">
                  <span className={`px-2 py-0.5 text-xs rounded font-medium ${priorityColors[item.priority as keyof typeof priorityColors]}`}>{item.priority}</span>
                </td>
                <td className="p-4">
                  <span className={`px-2 py-0.5 text-xs rounded ${typeColors[item.type as keyof typeof typeColors]}`}>{item.type}</span>
                </td>
                <td className="p-4">
                  <p className="font-medium text-white">{item.title}</p>
                </td>
                <td className="p-4 text-primary font-medium">{item.points} pts</td>
                <td className="p-4">
                  <span className={`px-2 py-0.5 text-xs rounded bg-white/5 text-muted-foreground capitalize`}>{item.status.toLowerCase()}</span>
                </td>
                <td className="p-4 text-muted-foreground">{item.assignee}</td>
                <td className="p-4">
                  <div className="flex items-center gap-1">
                    <button className="p-1.5 hover:bg-white/10 rounded" title="Estimate"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg></button>
                    <button className="p-1.5 hover:bg-white/10 rounded" title="Split"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg></button>
                    <button className="p-1.5 hover:bg-white/10 rounded" title="AI Refine"><svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /></svg></button>
                    <button className="p-1.5 hover:bg-white/10 rounded" title="More"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" /></svg></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}