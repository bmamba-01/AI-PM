import { useProjectStore } from "../state";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { FolderOpen, Plus, ChevronLeft } from "lucide-react";

export function Sidebar() {
  const { currentProject, sidebarOpen, toggleSidebar, projects, setCurrentProject } = useProjectStore();

  if (!sidebarOpen) return null;

  return (
    <aside className="w-64 glass-strong flex flex-col h-full shrink-0 z-10">
      {/* Brand */}
      <div className="p-4 border-b border-white/5">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg liquid-bg flex items-center justify-center glow-indigo">
            <FolderOpen className="w-4 h-4 text-white" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-foreground tracking-tight">AI-PM Toolkit</h1>
            <p className="text-[10px] text-muted-foreground">Project Management</p>
          </div>
        </div>
      </div>

      {/* Projects list */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest px-2 mb-2">Projects</p>
        {projects.map((project) => (
          <button
            key={project.id}
            onClick={() => setCurrentProject(project)}
            className={`w-full text-left px-3 py-2.5 rounded-lg transition-all duration-200 group ${
              currentProject?.id === project.id
                ? "glass-card glow-indigo"
                : "hover:bg-white/5"
            }`}
          >
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${
                currentProject?.id === project.id ? "bg-primary animate-glow-pulse" : "bg-muted-foreground/40"
              }`} />
              <span className={`text-sm font-medium ${
                currentProject?.id === project.id ? "text-foreground" : "text-muted-foreground group-hover:text-foreground"
              }`}>
                {project.name}
              </span>
            </div>
            <div className="flex items-center gap-1.5 mt-1 ml-4">
              <Badge variant="outline" className="text-[9px] px-1.5 py-0">{project.key}</Badge>
              <span className="text-[10px] text-muted-foreground">{project.methodology}</span>
            </div>
          </button>
        ))}

        {projects.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <FolderOpen className="w-8 h-8 mx-auto mb-2 opacity-30" />
            <p className="text-xs">No projects yet</p>
            <Button variant="ghost" size="sm" className="mt-2 text-xs text-primary">
              <Plus className="w-3 h-3" /> Create Project
            </Button>
          </div>
        )}
      </nav>

      {/* Footer */}
      <div className="p-3 border-t border-white/5">
        <Button variant="ghost" size="sm" onClick={toggleSidebar} className="w-full text-muted-foreground text-xs">
          <ChevronLeft className="w-4 h-4" /> Collapse
        </Button>
      </div>
    </aside>
  );
}
