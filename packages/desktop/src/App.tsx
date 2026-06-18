import React from "react";
import { Sidebar, Header, ProjectView, AgentPanel } from "./components";
import { useProjectStore } from "./state";
import { Layout } from "./components";
import { Zap } from "lucide-react";

export default function App() {
  const { currentProject, initializeApp } = useProjectStore();

  React.useEffect(() => {
    initializeApp();
  }, []);

  if (!currentProject) {
    return (
      <div className="flex h-full w-full items-center justify-center relative">
        <div className="app-bg" />
        <div className="text-center glass-card p-10 liquid-border animate-float">
          <div className="w-14 h-14 rounded-xl liquid-bg flex items-center justify-center mx-auto mb-5 glow-indigo">
            <Zap className="w-7 h-7 text-white" />
          </div>
          <h2 className="text-lg font-semibold text-foreground mb-2">AI-PM Toolkit</h2>
          <p className="text-sm text-muted-foreground mb-5">Initializing dashboard...</p>
          <div className="w-48 h-1.5 rounded-full bg-secondary/50 mx-auto overflow-hidden">
            <div className="h-full rounded-full liquid-bg animate-liquid-flow" style={{ width: "60%" }} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <Layout>
      <Header />
      <div className="flex-1 flex overflow-hidden">
        <Sidebar />
        <div className="flex-1 flex flex-col overflow-hidden">
          <ProjectView />
        </div>
        <AgentPanel />
      </div>
    </Layout>
  );
}
