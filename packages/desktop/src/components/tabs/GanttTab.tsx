import { Project } from "@ai-pm/core";

export function GanttTab({ project }: { project: Project }) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Timeline (Gantt)</h2>
          <p className="text-slate-400">Project schedule with dependencies and critical path</p>
        </div>
        <div className="flex gap-2">
          <select className="px-3 py-2 glass-input rounded-lg text-foreground text-sm">
            <option>Week View</option>
            <option>Month View</option>
            <option>Quarter View</option>
          </select>
          <button className="px-4 py-2 bg-[#007AFF] hover:bg-[#007AFF]/80 rounded-lg text-sm font-medium text-white">
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
            Add Task
          </button>
        </div>
      </div>

      <div className="glass-card rounded-xl overflow-hidden">
        <div className="p-4 border-b border-white/5">
          <div className="flex gap-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-1"><span className="w-3 h-3 bg-red-500 rounded" /> Critical Path</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 bg-amber-500 rounded" /> At Risk</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 bg-green-500 rounded" /> On Track</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 bg-slate-500 rounded" /> Not Started</span>
          </div>
        </div>
        <div className="p-8 text-center text-muted-foreground">
          <svg className="w-16 h-16 mx-auto mb-4 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
          </svg>
          <p className="text-lg">Gantt chart visualization</p>
          <p className="mt-1">Full timeline view with drag-and-drop scheduling coming soon</p>
        </div>
      </div>
    </div>
  );
}