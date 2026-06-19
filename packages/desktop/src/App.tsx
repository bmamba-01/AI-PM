import React from "react";
import { Sidebar, Header, ProjectView } from "./components";
import { useProjectStore } from "./state";
import { Layout } from "./components";
import { Zap } from "lucide-react";

export default function App() {
  const { initializeApp } = useProjectStore();

  React.useEffect(() => {
    initializeApp();
  }, []);

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
