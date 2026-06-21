import React from "react";
import { Button } from "../ui/button";

interface Props {
  onNewProject: () => void;
  onAdoptExisting: () => void;
  onUseDemo: () => void;
}

export function SetupGateway({ onNewProject, onAdoptExisting, onUseDemo }: Props) {
  return (
    <div className="flex-1 flex items-center justify-center p-8">
      <div className="w-full max-w-2xl space-y-8">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-[#6366f1] to-[#8b5cf6] flex items-center justify-center shadow-lg shadow-[#6366f1]/20">
            <span className="text-2xl">🧠</span>
          </div>
          <h1 className="text-3xl font-bold text-foreground mb-2">AI-PM Toolkit</h1>
          <p className="text-muted-foreground">Set up your AI-powered project management workspace</p>
        </div>

        <div className="grid grid-cols-1 gap-4">
          <button onClick={onNewProject} className="glass-card rounded-xl p-6 text-left hover:border-[#6366f1]/40 transition-all group">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-lg bg-[#6366f1]/15 flex items-center justify-center shrink-0">
                <span className="text-lg">📂</span>
              </div>
              <div className="flex-1">
                <h3 className="text-foreground font-semibold mb-1">New Project</h3>
                <p className="text-sm text-muted-foreground">Create a fresh AI-PM project with profile, agent docs, memory store, and approval queue.</p>
                <p className="text-xs text-muted-foreground mt-2">Includes methodology, connector profile, and directory structure.</p>
              </div>
              <span className="text-muted-foreground group-hover:text-foreground transition-colors">→</span>
            </div>
          </button>

          <button onClick={onAdoptExisting} className="glass-card rounded-xl p-6 text-left hover:border-[#10b981]/40 transition-all group">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-lg bg-[#10b981]/15 flex items-center justify-center shrink-0">
                <span className="text-lg">📁</span>
              </div>
              <div className="flex-1">
                <h3 className="text-foreground font-semibold mb-1">Use Existing Project</h3>
                <p className="text-sm text-muted-foreground">Add AI-PM runtime files to an existing project folder. Scans first, then adopts.</p>
                <p className="text-xs text-muted-foreground mt-2">Won't overwrite your existing files.</p>
              </div>
              <span className="text-muted-foreground group-hover:text-foreground transition-colors">→</span>
            </div>
          </button>

          <button onClick={onUseDemo} className="glass-card rounded-xl p-6 text-left hover:border-[#f59e0b]/40 transition-all group">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-lg bg-[#f59e0b]/15 flex items-center justify-center shrink-0">
                <span className="text-lg">🧪</span>
              </div>
              <div className="flex-1">
                <h3 className="text-foreground font-semibold mb-1">Demo Project</h3>
                <p className="text-sm text-muted-foreground">Jump straight in with a pre-configured demo project.</p>
                <p className="text-xs text-muted-foreground mt-2">Scrum methodology, software project type, sample data.</p>
              </div>
              <span className="text-muted-foreground group-hover:text-foreground transition-colors">→</span>
            </div>
          </button>
        </div>

        <p className="text-center text-xs text-muted-foreground">
          All data stays local. No external APIs contacted during setup.
        </p>
      </div>
    </div>
  );
}
