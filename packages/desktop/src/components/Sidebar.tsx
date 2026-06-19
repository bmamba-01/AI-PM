import { useProjectStore, type ActiveView } from "../state";
import { Button } from "./ui/button";
import { cn } from "../lib/utils";
import {
  LayoutDashboard, CalendarClock, Columns3, Users,
  ListOrdered, GanttChart, ShieldAlert,
  GitPullRequest, FileBarChart,
  Server, Bot, Settings, FolderOpen, Plus, Zap
} from "lucide-react";

interface NavItem {
  id: ActiveView;
  label: string;
  icon: React.ElementType;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

const navSections: NavSection[] = [
  {
    title: "Operations",
    items: [
      { id: "daily-brief", label: "Daily Brief", icon: CalendarClock },
      { id: "sprint", label: "Sprint Board", icon: Columns3 },
      { id: "meeting", label: "Meeting Center", icon: Users },
    ],
  },
  {
    title: "Planning",
    items: [
      { id: "backlog", label: "Backlog", icon: ListOrdered },
      { id: "timeline", label: "Timeline", icon: GanttChart },
      { id: "risks", label: "Risks", icon: ShieldAlert },
    ],
  },
  {
    title: "Quality",
    items: [
      { id: "code-review", label: "Code Review", icon: GitPullRequest },
      { id: "reports", label: "Reports", icon: FileBarChart },
    ],
  },
  {
    title: "System",
    items: [
      { id: "mcp-servers", label: "MCP Servers", icon: Server },
      { id: "agents", label: "Agents", icon: Bot },
      { id: "settings", label: "Settings", icon: Settings },
    ],
  },
];

export function Sidebar() {
  const { currentProject, sidebarOpen, projects, setCurrentProject, activeView, setActiveView } = useProjectStore();

  if (!sidebarOpen) return null;

  return (
    <aside className="w-56 glass-strong flex flex-col h-full shrink-0 z-10 select-none">
      {/* Brand */}
      <div className="p-4 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg liquid-bg flex items-center justify-center glow-indigo">
            <Zap className="w-4 h-4 text-white" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-foreground tracking-tight">AI-PM</h1>
            <p className="text-[10px] text-muted-foreground">Toolkit</p>
          </div>
        </div>
      </div>

      {/* Dashboard quick link */}
      <div className="px-3 pb-1">
        <button
          onClick={() => setActiveView("dashboard")}
          className={cn(
            "w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-all duration-150",
            activeView === "dashboard"
              ? "bg-white/8 text-foreground"
              : "text-muted-foreground hover:text-foreground hover:bg-white/5"
          )}
        >
          <LayoutDashboard className="w-4 h-4 shrink-0" />
          <span className="font-medium">Dashboard</span>
        </button>
      </div>

      {/* Projects */}
      <div className="px-3 py-2">
        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest px-2 mb-1.5">Projects</p>
        <div className="space-y-0.5">
          {projects.map((project) => (
            <button
              key={project.id}
              onClick={() => setCurrentProject(project)}
              className={cn(
                "w-full text-left px-3 py-2 rounded-lg transition-all duration-150 group",
                currentProject?.id === project.id
                  ? "bg-white/8"
                  : "hover:bg-white/5"
              )}
            >
              <div className="flex items-center gap-2">
                <div className={cn(
                  "w-1.5 h-1.5 rounded-full shrink-0",
                  currentProject?.id === project.id ? "bg-[#007AFF]" : "bg-muted-foreground/30"
                )} />
                <span className={cn(
                  "text-sm truncate",
                  currentProject?.id === project.id ? "text-foreground font-medium" : "text-muted-foreground group-hover:text-foreground"
                )}>
                  {project.name}
                </span>
              </div>
            </button>
          ))}
          <button className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground rounded-lg hover:bg-white/5 transition-colors">
            <Plus className="w-3 h-3" /> New Project
          </button>
        </div>
      </div>

      <div className="glass-separator mx-3 my-1" />

      {/* Navigation sections */}
      <nav className="flex-1 overflow-y-auto px-3 py-1 space-y-3">
        {navSections.map((section) => (
          <div key={section.title}>
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest px-2 mb-1.5">{section.title}</p>
            <div className="space-y-0.5">
              {section.items.map((item) => {
                const Icon = item.icon;
                const isActive = activeView === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveView(item.id)}
                    className={cn(
                      "w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-all duration-150",
                      isActive
                        ? "bg-white/8 text-foreground"
                        : "text-muted-foreground hover:text-foreground hover:bg-white/5"
                    )}
                  >
                    <Icon className={cn("w-4 h-4 shrink-0", isActive && "text-[#007AFF]")} />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </nav>
    </aside>
  );
}
