import { Project } from "@ai-pm/core";
import { Card, CardHeader, CardTitle, CardContent } from "../ui/card";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import {
  AlertTriangle, Clock, Calendar, CheckCircle2, Mail,
  ShieldAlert, MessageSquare, ArrowRight
} from "lucide-react";
import { useProjectStore } from "../../state";

interface Props { project: Project }

export function DailyBriefTab({ project }: Props) {
  const { setActiveView } = useProjectStore();
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-foreground">Daily Brief</h2>
          <p className="text-sm text-muted-foreground">{new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })} • {project.name}</p>
        </div>
        <Button className="bg-[#007AFF] hover:bg-[#007AFF]/80 text-white">
          Refresh Brief <ArrowRight className="w-4 h-4 ml-1" />
        </Button>
      </div>

      {/* Top Priorities */}
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-[#34C759]" /> Top Priorities</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {["Complete JWT token refresh — blocked by PR review", "Finalize sprint backlog for Sprint 13", "Review database migration risk mitigation plan"].map((item, i) => (
            <div key={i} className="flex items-start gap-3 p-3 rounded-lg glass hover:bg-white/5 transition-colors">
              <span className="text-xs font-mono text-muted-foreground mt-0.5">{i + 1}</span>
              <p className="text-sm text-foreground">{item}</p>
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Urgent Blockers */}
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><AlertTriangle className="w-4 h-4 text-[#FF3B30]" /> Urgent Blockers</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {["API rate limit hit — affecting payment integration tests", "CI pipeline failing on main branch"].map((item, i) => (
              <div key={i} className="flex items-start gap-2 p-2.5 rounded-lg bg-[#FF3B30]/8 border border-[#FF3B30]/15">
                <ShieldAlert className="w-4 h-4 text-[#FF3B30] shrink-0 mt-0.5" />
                <p className="text-sm text-foreground">{item}</p>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Meetings Today */}
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Calendar className="w-4 h-4 text-[#007AFF]" /> Meetings Today</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {[
              { time: "10:00", title: "Daily Standup", needs: "None" },
              { time: "14:00", title: "Sprint Planning", needs: "Backlog review" },
              { time: "16:00", title: "Architecture Review", needs: "DB migration plan" },
            ].map((m, i) => (
              <div key={i} className="flex items-center gap-3 p-2.5 rounded-lg glass hover:bg-white/5 transition-colors">
                <span className="text-sm font-mono text-muted-foreground w-12 shrink-0">{m.time}</span>
                <div className="flex-1">
                  <p className="text-sm font-medium text-foreground">{m.title}</p>
                  <p className="text-xs text-muted-foreground">Prep: {m.needs}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Risks to Review */}
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><ShieldAlert className="w-4 h-4 text-[#FF9500]" /> Risks to Review</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {["DB migration timeline (HIGH) — next review today", "Key developer vacation Q3 — cross-training overdue"].map((item, i) => (
              <div key={i} className="flex items-start gap-2 p-2.5 rounded-lg bg-[#FF9500]/8 border border-[#FF9500]/15">
                <p className="text-sm text-foreground">{item}</p>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Pending Approvals */}
        <Card
          className="cursor-pointer hover:bg-white/5 transition-colors"
          onClick={() => setActiveView("approvals")}
        >
          <CardHeader><CardTitle className="flex items-center gap-2"><Mail className="w-4 h-4 text-[#AF52DE]" /> Pending Approvals</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {["Change request CR-014: Add OAuth2 scope", "PR #234: Payment integration — awaiting merge approval"].map((item, i) => (
              <div key={i} className="flex items-center justify-between p-2.5 rounded-lg glass hover:bg-white/5 transition-colors">
                <p className="text-sm text-foreground">{item}</p>
                <Button size="sm" variant="ghost" className="text-xs text-[#007AFF]">Review</Button>
              </div>
            ))}
            <div className="flex justify-end pt-1">
              <span className="text-xs text-[#007AFF] flex items-center gap-1">
                View all approvals <ArrowRight className="w-3 h-3" />
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Source Coverage */}
      <Card>
        <CardContent>
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span>Sources:</span>
            <Badge variant="outline" className="text-[9px]">Calendar ✓</Badge>
            <Badge variant="outline" className="text-[9px]">Jira ✓</Badge>
            <Badge variant="outline" className="text-[9px]">GitHub ✓</Badge>
            <Badge variant="outline" className="text-[9px]">Risk Register ✓</Badge>
            <Badge variant="destructive" className="text-[9px]">Gmail ✗</Badge>
            <span className="ml-auto">Confidence: <span className="text-[#34C759] font-medium">85%</span></span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
