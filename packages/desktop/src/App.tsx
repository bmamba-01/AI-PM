import React from "react";
import { Sidebar, Header, ProjectView } from "./components";
import { useProjectStore } from "./state";
import { Layout } from "./components";
import { SetupGateway } from "./components/setup/SetupGateway";
import { NewProjectWizard } from "./components/setup/NewProjectWizard";
import { AdoptProjectWizard } from "./components/setup/AdoptProjectWizard";
import { CostModel, Methodology, ProjectType, RoleType, Status } from "@ai-pm/core/domain";

type SetupStep = "gateway" | "new_project" | "adopt";

export default function App() {
  const { initializeApp, currentProject, setCurrentProject } = useProjectStore();
  const [setupStep, setSetupStep] = React.useState<SetupStep | null>(null);

  React.useEffect(() => {
    initializeApp();
  }, []);

  // Show setup wizard if no project selected
  if (!currentProject && setupStep === null) {
    return (
      <Layout>
        <SetupGateway
          onNewProject={() => setSetupStep("new_project")}
          onAdoptExisting={() => setSetupStep("adopt")}
          onUseDemo={() => {
            // Use demo mode - create a default project with proper enum types
            const defaultProject = {
              id: crypto.randomUUID(),
              name: "Demo Project",
              description: "Pre-configured demo with sample data",
              key: "DEMO",
              type: ProjectType.SOFTWARE,
              methodology: Methodology.SCRUM,
              costModel: CostModel.FIXED_COST,
              startDate: new Date(),
              tags: ["demo"],
              status: Status.IN_PROGRESS,
              healthScore: 100,
              settings: {
                workingDays: [1, 2, 3, 4, 5],
                hoursPerDay: 8,
                autoAssign: false,
                notifications: { email: true, slack: false, push: true, inApp: true, digestFrequency: "daily" as const },
                integrations: {}
              },
              createdAt: new Date(),
              updatedAt: new Date(),
              createdBy: "system",
              version: 1
            };
            setCurrentProject(defaultProject);
          }}
        />
      </Layout>
    );
  }

  // Show setup wizard step
  if (!currentProject && setupStep) {
    return (
      <Layout>
        {setupStep === "new_project" && (
          <NewProjectWizard
            onComplete={(path) => {
              // After creation, re-initialize to pick up the new project
              initializeApp();
              setSetupStep(null);
            }}
            onBack={() => setSetupStep(null)}
          />
        )}
        {setupStep === "adopt" && (
          <AdoptProjectWizard
            onComplete={(path) => {
              initializeApp();
              setSetupStep(null);
            }}
            onBack={() => setSetupStep(null)}
          />
        )}
      </Layout>
    );
  }

  return (
    <Layout>
      {/* Floating glass orbs for depth */}
      <div className="glass-orb w-96 h-96 -top-48 -left-48" style={{ animationDelay: "0s" }} />
      <div className="glass-orb w-64 h-64 top-1/3 right-0" style={{ animationDelay: "-7s" }} />
      <div className="glass-orb w-80 h-80 bottom-0 left-1/3" style={{ animationDelay: "-14s" }} />
      <Header />
      <div className="flex-1 flex overflow-hidden">
        <Sidebar />
        <div className="flex-1 flex flex-col overflow-hidden">
          <ProjectView />
        </div>
      </div>
    </Layout>
  );
}
