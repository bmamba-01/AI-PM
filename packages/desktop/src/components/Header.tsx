import { useProjectStore } from "../state";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { PanelLeftOpen, PanelLeftClose, Zap, Circle } from "lucide-react";

export function Header() {
  const { currentProject, currentUser, isOnline, syncStatus, toggleSidebar, sidebarOpen } = useProjectStore();

  return (
    <header className="glass-strong h-14 flex items-center justify-between px-5 z-10 shrink-0">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={toggleSidebar} className="text-muted-foreground hover:text-foreground">
          {sidebarOpen ? <PanelLeftClose className="w-5 h-5" /> : <PanelLeftOpen className="w-5 h-5" />}
        </Button>

        {currentProject && (
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-primary" />
              <h2 className="font-semibold text-foreground">{currentProject.name}</h2>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="default">{currentProject.key}</Badge>
              <Badge variant="secondary">{currentProject.methodology}</Badge>
              <Badge variant="outline">{currentProject.costModel}</Badge>
            </div>
          </div>
        )}
      </div>

      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <Circle
            className={`w-2 h-2 fill-current ${isOnline ? "text-[#34C759]" : "text-[#FF3B30]"}`}
          />
          <span className="text-xs text-muted-foreground capitalize">{syncStatus}</span>
        </div>

        {currentUser && (
          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-medium text-foreground">{currentUser.name}</p>
              <p className="text-xs text-muted-foreground capitalize">{currentUser.role.toLowerCase()}</p>
            </div>
            <div className="w-8 h-8 rounded-full liquid-bg flex items-center justify-center font-medium text-white text-sm glow-indigo">
              {currentUser.name.charAt(0)}
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
