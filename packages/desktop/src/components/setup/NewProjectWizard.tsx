import React, { useState } from "react";
import { Button } from "../ui/button";
import { CheckCircle2, ArrowRight, ArrowLeft } from "lucide-react";

interface Props {
  onComplete: (projectRoot: string) => void;
  onBack: () => void;
}

const METHODOLOGIES = [
  { value: "scrum", label: "Scrum", desc: "Sprints, backlog, daily standups" },
  { value: "kanban", label: "Kanban", desc: "Continuous flow, WIP limits" },
  { value: "waterfall", label: "Waterfall", desc: "Phase-gated, sequential" },
  { value: "hybrid", label: "Hybrid", desc: "Mixed approach" },
];

const PROJECT_TYPES = [
  { value: "software", label: "Software", desc: "Application or service" },
  { value: "tm", label: "T&M", desc: "Time & material" },
  { value: "fixed_cost", label: "Fixed Cost", desc: "Fixed price deliverable" },
  { value: "product", label: "Product", desc: "Ongoing product development" },
];

export function NewProjectWizard({ onComplete, onBack }: Props) {
  const [step, setStep] = useState<"config" | "creating" | "done">("config");
  const [name, setName] = useState("my-project");
  const [methodology, setMethodology] = useState("scrum");
  const [projectType, setProjectType] = useState("software");
  const [error, setError] = useState<string | null>(null);
  const [readiness, setReadiness] = useState<any>(null);
  const [projectRoot, setProjectRoot] = useState<string | null>(null);

  async function handleCreate() {
    setStep("creating");
    try {
      const result = await window.electronAPI.setup.createProject(name, {
        methodology,
        project_type: projectType,
      });
      if (result.success) {
        setProjectRoot(result.projectRoot);
        setReadiness(result.readiness);
        setStep("done");
      } else {
        setError("Project creation failed");
        setStep("config");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
      setStep("config");
    }
  }

  if (step === "done") {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-lg text-center space-y-6">
          <CheckCircle2 className="w-16 h-16 mx-auto text-[#10b981]" />
          <h2 className="text-2xl font-bold text-foreground">Project Created</h2>
          <p className="text-muted-foreground">"{name}" is ready to use.</p>

          {readiness && (
            <div className="glass-card rounded-xl p-4 text-left">
              <p className="text-sm font-medium text-foreground mb-2">Readiness: {readiness.score}%</p>
              <div className="space-y-1">
                {(readiness.checks ?? readiness.blocking?.map((b: string) => ({ label: b, present: false })) ?? []).slice(0, 8).map((c: any) => (
                  <div key={c.id ?? c.label} className="flex items-center gap-2 text-xs">
                    <span className={c.present ? "text-[#10b981]" : "text-[#f59e0b]"}>{c.present ? "✓" : "○"}</span>
                    <span className="text-muted-foreground">{c.label}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <Button className="bg-[#6366f1] hover:bg-[#6366f1]/80 text-white" onClick={() => onComplete(projectRoot!)}>
            Open Dashboard
          </Button>
        </div>
      </div>
    );
  }

  if (step === "creating") {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-10 h-10 border-2 border-[#6366f1] border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-muted-foreground">Creating project...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex items-center justify-center p-8">
      <div className="w-full max-w-lg space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={onBack}>← Back</Button>
          <h2 className="text-xl font-semibold text-foreground">New Project</h2>
        </div>

        {error && (
          <div className="rounded-lg bg-[#ef4444]/10 border border-[#ef4444]/20 px-4 py-3 text-sm text-[#ef4444]">{error}</div>
        )}

        {/* Project name */}
        <div>
          <label className="text-xs text-muted-foreground block mb-1">Project Name</label>
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-[#6366f1]/50"
            placeholder="my-project"
          />
        </div>

        {/* Methodology */}
        <div>
          <label className="text-xs text-muted-foreground block mb-2">Methodology</label>
          <div className="grid grid-cols-2 gap-2">
            {METHODOLOGIES.map(m => (
              <button
                key={m.value}
                onClick={() => setMethodology(m.value)}
                className={`p-3 rounded-lg text-left transition-all border ${
                  methodology === m.value
                    ? "border-[#6366f1] bg-[#6366f1]/10"
                    : "border-white/10 bg-white/5 hover:bg-white/10"
                }`}
              >
                <span className="text-sm font-medium text-foreground">{m.label}</span>
                <p className="text-xs text-muted-foreground mt-0.5">{m.desc}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Project type */}
        <div>
          <label className="text-xs text-muted-foreground block mb-2">Project Type</label>
          <div className="grid grid-cols-2 gap-2">
            {PROJECT_TYPES.map(t => (
              <button
                key={t.value}
                onClick={() => setProjectType(t.value)}
                className={`p-3 rounded-lg text-left transition-all border ${
                  projectType === t.value
                    ? "border-[#6366f1] bg-[#6366f1]/10"
                    : "border-white/10 bg-white/5 hover:bg-white/10"
                }`}
              >
                <span className="text-sm font-medium text-foreground">{t.label}</span>
                <p className="text-xs text-muted-foreground mt-0.5">{t.desc}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-2">
          <Button variant="ghost" onClick={onBack}>Cancel</Button>
          <Button className="bg-[#6366f1] hover:bg-[#6366f1]/80 text-white" onClick={handleCreate} disabled={!name.trim()}>
            Create Project <ArrowRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
      </div>
    </div>
  );
}
