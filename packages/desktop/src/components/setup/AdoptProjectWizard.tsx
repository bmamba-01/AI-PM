import React, { useState } from "react";
import { Button } from "../ui/button";
import { CheckCircle2, ArrowRight, ArrowLeft, AlertTriangle } from "lucide-react";

interface Props {
  onComplete: (projectRoot: string) => void;
  onBack: () => void;
}

type Step = "select" | "scanning" | "scan-result" | "adopting" | "done" | "error";

export function AdoptProjectWizard({ onComplete, onBack }: Props) {
  const [step, setStep] = useState<Step>("select");
  const [path, setPath] = useState("");
  const [readiness, setReadiness] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleBrowse() {
    const selected = await window.electronAPI.dialog.openFile();
    if (selected) setPath(selected);
  }

  async function handleScan() {
    if (!path.trim()) return;
    setStep("scanning");
    try {
      const result = await window.electronAPI.setup.scan(path.trim());
      setReadiness(result);
      setStep("scan-result");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Scan failed");
      setStep("select");
    }
  }

  async function handleAdopt() {
    setStep("adopting");
    try {
      const result = await window.electronAPI.setup.adopt(path.trim());
      if (result.success) {
        setStep("done");
      } else {
        setError("Adoption failed");
        setStep("scan-result");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Adoption failed");
      setStep("select");
    }
  }

  if (step === "done") {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-lg text-center space-y-6">
          <CheckCircle2 className="w-16 h-16 mx-auto text-[#10b981]" />
          <h2 className="text-2xl font-bold text-foreground">Project Adopted</h2>
          <p className="text-muted-foreground text-sm">AI-PM runtime files have been added to your project.</p>
          <Button className="bg-[#6366f1] hover:bg-[#6366f1]/80 text-white" onClick={() => onComplete(path)}>
            Open Dashboard
          </Button>
        </div>
      </div>
    );
  }

  if (step === "scanning" || step === "adopting") {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-10 h-10 border-2 border-[#6366f1] border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-muted-foreground">{step === "scanning" ? "Scanning project..." : "Adopting project..."}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex items-center justify-center p-8">
      <div className="w-full max-w-lg space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={onBack}>← Back</Button>
          <h2 className="text-xl font-semibold text-foreground">Use Existing Project</h2>
        </div>

        {error && (
          <div className="rounded-lg bg-[#ef4444]/10 border border-[#ef4444]/20 px-4 py-3 text-sm text-[#ef4444]">{error}</div>
        )}

        <div>
          <label className="text-xs text-muted-foreground block mb-1">Project Path</label>
          <div className="flex gap-2">
            <input
              value={path}
              onChange={e => setPath(e.target.value)}
              className="flex-1 rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-[#6366f1]/50"
              placeholder="C:\Projects\my-project"
            />
            <Button variant="outline" onClick={handleBrowse}>Browse</Button>
          </div>
        </div>

        {/* Scan result */}
        {step === "scan-result" && readiness && (
          <div className="glass-card rounded-xl p-4 space-y-3">
            <div className="flex items-center gap-2">
              {readiness.score >= 80 ? (
                <CheckCircle2 className="w-5 h-5 text-[#10b981]" />
              ) : readiness.score >= 50 ? (
                <AlertTriangle className="w-5 h-5 text-[#f59e0b]" />
              ) : (
                <AlertTriangle className="w-5 h-5 text-[#ef4444]" />
              )}
              <span className="text-sm font-medium text-foreground">Readiness: {readiness.score}%</span>
            </div>

            {readiness.checks?.map((c: any) => (
              <div key={c.id} className="flex items-center gap-2 text-xs">
                <span className={c.present ? "text-[#10b981]" : "text-[#64748b]"}>{c.present ? "✓" : "○"}</span>
                <span className="text-muted-foreground">{c.label}</span>
                {c.required && <span className="text-[10px] text-[#f59e0b]">required</span>}
              </div>
            ))}

            <Button className="w-full bg-[#10b981] hover:bg-[#10b981]/80 text-white" onClick={handleAdopt}>
              Adopt Project <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        )}

        {/* Actions */}
        {step === "select" && (
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="ghost" onClick={onBack}>Cancel</Button>
            <Button className="bg-[#6366f1] hover:bg-[#6366f1]/80 text-white" onClick={handleScan} disabled={!path.trim()}>
              Scan Project <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
