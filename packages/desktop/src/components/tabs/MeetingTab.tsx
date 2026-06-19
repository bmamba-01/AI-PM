import { Project } from "@ai-pm/core";
import { Card, CardHeader, CardTitle, CardContent } from "../ui/card";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Users, FileText, CheckCircle2, AlertTriangle, Clock } from "lucide-react";

interface Props { project: Project }

export function MeetingTab({ project }: Props) {
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-foreground">Meeting Center</h2>
          <p className="text-sm text-muted-foreground">Agenda, minutes, and action items</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">Prepare Agenda</Button>
          <Button className="bg-[#007AFF] hover:bg-[#007AFF]/80 text-white">New Meeting</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card>
          <CardHeader><CardTitle className="text-sm">Today's Meetings</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {[
              { time: "10:00", title: "Daily Standup", status: "upcoming" },
              { time: "14:00", title: "Sprint Planning", status: "upcoming" },
              { time: "16:00", title: "Architecture Review", status: "upcoming" },
            ].map((m, i) => (
              <div key={i} className="flex items-center gap-3 p-2.5 rounded-lg glass hover:bg-white/5 transition-colors">
                <Clock className="w-4 h-4 text-muted-foreground shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-foreground">{m.title}</p>
                  <p className="text-xs text-muted-foreground">{m.time}</p>
                </div>
                <Badge variant="outline" className="text-[9px]">{m.status}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader><CardTitle className="text-sm">Recent Minutes</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {[
              { date: "Aug 9", title: "Sprint 12 Review", decisions: 3, actions: 5, attendees: 6 },
              { date: "Aug 7", title: "Architecture Sync", decisions: 2, actions: 3, attendees: 4 },
              { date: "Aug 5", title: "Client Check-in", decisions: 4, actions: 2, attendees: 5 },
            ].map((m, i) => (
              <div key={i} className="flex items-center gap-4 p-3 rounded-lg glass hover:bg-white/5 transition-colors">
                <div className="text-center shrink-0">
                  <p className="text-xs text-muted-foreground">{m.date}</p>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-foreground">{m.title}</p>
                  <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1"><CheckCircle2 className="w-3 h-3 text-[#34C759]" /> {m.decisions} decisions</span>
                    <span className="flex items-center gap-1"><FileText className="w-3 h-3 text-[#007AFF]" /> {m.actions} actions</span>
                    <span className="flex items-center gap-1"><Users className="w-3 h-3" /> {m.attendees}</span>
                  </div>
                </div>
                <Button size="sm" variant="ghost" className="text-xs text-[#007AFF]">View</Button>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-sm flex items-center gap-2"><FileText className="w-4 h-4 text-[#007AFF]" /> Draft MoM</CardTitle></CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <FileText className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p className="text-sm">Select a meeting to generate or edit minutes</p>
            <Button variant="outline" size="sm" className="mt-3">Upload Transcript</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
