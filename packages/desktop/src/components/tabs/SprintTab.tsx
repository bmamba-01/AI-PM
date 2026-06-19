import { Project } from "@ai-pm/core";

interface SprintTabProps {
  project: Project;
}

export function SprintTab({ project }: SprintTabProps) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Current Sprint</h2>
          <p className="text-slate-400">Sprint 12 • Aug 12 – Aug 25 • 42 pts committed</p>
        </div>
        <div className="flex gap-2">
          <button className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 rounded-lg text-sm font-medium">Start Sprint</button>
          <button className="px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-sm">Plan Next</button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        <SprintColumn title="To Do" status="TODO" color="slate" items={todoItems} />
        <SprintColumn title="In Progress" status="IN_PROGRESS" color="blue" items={inProgressItems} />
        <SprintColumn title="In Review" status="IN_REVIEW" color="amber" items={inReviewItems} />
        <SprintColumn title="Done" status="DONE" color="green" items={doneItems} />
      </div>
    </div>
  );
}

interface SprintColumnProps {
  title: string;
  status: string;
  color: string;
  items: any[];
}

function SprintColumn({ title, status, color, items }: SprintColumnProps) {
  return (
    <div className="glass-card flex flex-col h-[600px]">
      <div className="p-4 border-b border-white/5">
        <div className="flex items-center justify-between">
          <h3 className="font-medium text-white capitalize">{title.toLowerCase()}</h3>
          <span className={`px-2 py-0.5 text-xs rounded-full bg-${color}-600/20 text-${color}-300`}>{items.length}</span>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {items.map((item, i) => (
          <SprintTaskCard key={i} item={item} color={color} />
        ))}
        <div className="border-2 border-dashed border-white/10 rounded-lg p-4 text-center text-muted-foreground">
          Drop tasks here
        </div>
      </div>
    </div>
  );
}

function SprintTaskCard({ item, color }: { item: any; color: string }) {
  return (
    <div className="glass p-3 hover:border-primary/30 transition-all duration-200 cursor-pointer rounded-lg">
      <div className="flex items-start gap-2">
        <span className={`w-2 h-2 rounded mt-2 bg-${color}-500 flex-shrink-0`} />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-white truncate">{item.title}</p>
          <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
            <span className="px-1.5 py-0.5 bg-white/5 rounded">{item.type}</span>
            {item.points && <span className="text-primary">{item.points} pts</span>}
            {item.assignee && <span>{item.assignee}</span>}
          </div>
        </div>
      </div>
    </div>
  );
}

const todoItems = [
  { title: "Design user authentication flow", type: "FEATURE", points: 5, assignee: "Alex" },
  { title: "Write API documentation", type: "DOCUMENTATION", points: 3, assignee: "Maria" },
  { title: "Setup CI/CD pipeline", type: "TECH_DEBT", points: 8, assignee: "James" }
];

const inProgressItems = [
  { title: "Implement JWT token refresh", type: "FEATURE", points: 5, assignee: "Alex" },
  { title: "Fix memory leak in webpack", type: "BUG", points: 3, assignee: "Sam" }
];

const inReviewItems = [
  { title: "Add rate limiting middleware", type: "FEATURE", points: 3, assignee: "Maria" }
];

const doneItems = [
  { title: "Setup project repository", type: "FEATURE", points: 2, assignee: "Team" },
  { title: "Configure ESLint + Prettier", type: "TECH_DEBT", points: 1, assignee: "Alex" },
  { title: "Write unit tests for auth", type: "TESTING", points: 5, assignee: "Maria" }
];