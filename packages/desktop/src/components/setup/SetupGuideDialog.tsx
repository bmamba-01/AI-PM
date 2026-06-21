import { Card, CardContent } from "../ui/card";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import {
  X, HelpCircle, ArrowRight, Terminal, CheckCircle2,
  AlertTriangle, ExternalLink
} from "lucide-react";

interface SetupGuideDialogProps {
  title: string;
  purpose: string;
  requiredSetup: string[];
  currentReadiness?: { score: number; blocking: string[] };
  primaryAction?: { label: string; onClick: () => void };
  cliEquivalent?: string;
  onClose: () => void;
}

export function SetupGuideDialog({
  title,
  purpose,
  requiredSetup,
  currentReadiness,
  primaryAction,
  cliEquivalent,
  onClose,
}: SetupGuideDialogProps) {
  const allReady = currentReadiness
    ? currentReadiness.blocking.length === 0
    : false;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <Card className="glass w-full max-w-lg mx-4" onClick={e => e.stopPropagation()}>
        <CardContent className="p-6 space-y-4">
          {/* Header */}
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              <HelpCircle className="w-5 h-5 text-[#007AFF]" />
              <h3 className="text-lg font-semibold text-foreground">{title}</h3>
            </div>
            <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Purpose */}
          <p className="text-sm text-muted-foreground">{purpose}</p>

          {/* Required Setup */}
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Required Setup</p>
            <div className="space-y-1.5">
              {requiredSetup.map((item, i) => (
                <div key={i} className="flex items-center gap-2 text-sm">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#34C759] shrink-0" />
                  <span className="text-foreground">{item}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Readiness */}
          {currentReadiness && (
            <div className="glass-card rounded-lg p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-muted-foreground">Current Readiness</span>
                <Badge
                  variant="outline"
                  className="text-[10px]"
                  style={{
                    borderColor: allReady ? '#34C75940' : '#FF950040',
                    color: allReady ? '#34C759' : '#FF9500',
                  }}
                >
                  {currentReadiness.score}%
                </Badge>
              </div>
              {currentReadiness.blocking.length > 0 && (
                <div className="space-y-1">
                  {currentReadiness.blocking.slice(0, 3).map((item, i) => (
                    <div key={i} className="flex items-center gap-1.5 text-xs text-[#FF9500]">
                      <AlertTriangle className="w-3 h-3 shrink-0" />
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* CLI Equivalent */}
          {cliEquivalent && (
            <div className="glass-card rounded-lg p-3">
              <p className="text-xs font-medium text-muted-foreground mb-1">CLI Equivalent</p>
              <code className="text-xs text-[#34C759] font-mono">{cliEquivalent}</code>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 pt-2">
            {primaryAction && (
              <Button
                className="bg-[#007AFF] hover:bg-[#007AFF]/80 text-white"
                onClick={primaryAction.onClick}
              >
                {primaryAction.label}
                <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            )}
            <Button variant="ghost" onClick={onClose}>Close</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ── Guide entry point for tabs ───────────────────────────────────────────────

export function GuideButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="text-[10px] text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
      title="Setup guide"
    >
      <HelpCircle className="w-3 h-3" />
      Guide
    </button>
  );
}
