import { useProjectStore } from "../state";
import { Tabs, TabList, Tab, TabPanel } from "./Tabs";
import { DashboardTab } from "./tabs/DashboardTab";
import { SprintTab } from "./tabs/SprintTab";
import { BacklogTab } from "./tabs/BacklogTab";
import { GanttTab } from "./tabs/GanttTab";
import { RisksTab } from "./tabs/RisksTab";
import { BudgetTab } from "./tabs/BudgetTab";
import { ReportsTab } from "./tabs/ReportsTab";
import { FolderOpen } from "lucide-react";

export function ProjectView() {
  const { currentProject } = useProjectStore();

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

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <Tabs defaultValue="dashboard">
        <TabList>
          <Tab value="dashboard">Dashboard</Tab>
          <Tab value="sprint">Sprint</Tab>
          <Tab value="backlog">Backlog</Tab>
          <Tab value="gantt">Gantt</Tab>
          <Tab value="risks">Risks</Tab>
          <Tab value="budget">Budget</Tab>
          <Tab value="reports">Reports</Tab>
        </TabList>

        <TabPanel value="dashboard"><DashboardTab project={currentProject} /></TabPanel>
        <TabPanel value="sprint"><SprintTab project={currentProject} /></TabPanel>
        <TabPanel value="backlog"><BacklogTab project={currentProject} /></TabPanel>
        <TabPanel value="gantt"><GanttTab project={currentProject} /></TabPanel>
        <TabPanel value="risks"><RisksTab project={currentProject} /></TabPanel>
        <TabPanel value="budget"><BudgetTab project={currentProject} /></TabPanel>
        <TabPanel value="reports"><ReportsTab project={currentProject} /></TabPanel>
      </Tabs>
    </div>
  );
}
