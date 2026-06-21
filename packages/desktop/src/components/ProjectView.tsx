import { useProjectStore } from "../state";
import { DashboardTab } from "./tabs/DashboardTab";
import { DailyBriefTab } from "./tabs/DailyBriefTab";
import { SprintTab } from "./tabs/SprintTab";
import { MeetingTab } from "./tabs/MeetingTab";
import { BacklogTab } from "./tabs/BacklogTab";
import { GanttTab } from "./tabs/GanttTab";
import { RisksTab } from "./tabs/RisksTab";
import { CodeReviewTab } from "./tabs/CodeReviewTab";
import { ReportsTab } from "./tabs/ReportsTab";
import { McpServersTab } from "./tabs/McpServersTab";
import { AgentsTab } from "./tabs/AgentsTab";
import { SettingsTab } from "./tabs/SettingsTab";
import { ApprovalsTab } from "./tabs/ApprovalsTab";
import { CommandCenterTab } from "./tabs/CommandCenterTab";
import { FolderOpen } from "lucide-react";

export function ProjectView() {
  const { currentProject, activeView } = useProjectStore();

  if (!currentProject) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center glass-card p-10 liquid-border">
          <FolderOpen className="w-12 h-12 mx-auto text-muted-foreground/30 mb-3" />
          <h3 className="text-lg font-medium text-foreground">Select a project</h3>
          <p className="text-sm text-muted-foreground mt-1">Choose a project from the sidebar to get started</p>
        </div>
      </div>
    );
  }

  // System views don't need a project
  if (activeView === "mcp-servers") return <McpServersTab />;
  if (activeView === "agents") return <AgentsTab />;
  if (activeView === "settings") return <SettingsTab />;

  // Project views
  const views: Record<string, React.ReactNode> = {
    "dashboard": <DashboardTab project={currentProject} />,
    "daily-brief": <DailyBriefTab project={currentProject} />,
    "sprint": <SprintTab project={currentProject} />,
    "meeting": <MeetingTab project={currentProject} />,
    "backlog": <BacklogTab project={currentProject} />,
    "timeline": <GanttTab project={currentProject} />,
    "risks": <RisksTab project={currentProject} />,
    "code-review": <CodeReviewTab project={currentProject} />,
    "reports": <ReportsTab project={currentProject} />,
    "approvals": <ApprovalsTab project={currentProject} />,
    "command-center": <CommandCenterTab project={currentProject} />,
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden p-4">
      {views[activeView] || <DashboardTab project={currentProject} />}
    </div>
  );
}
