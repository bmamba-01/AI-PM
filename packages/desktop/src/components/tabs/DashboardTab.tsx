import { Project } from "@ai-pm/core";
import { Card, CardHeader, CardTitle, CardContent } from "../ui/card";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import {
  Heart, DollarSign, AlertTriangle, TrendingUp,
  Clock, Users, ArrowUpRight, ArrowDownRight, Minus,
  Activity, Calendar, CheckCircle2, GitPullRequest,
  Rocket, MessageSquare
} from "lucide-react";

interface DashboardTabProps {
  project: Project;
}

export function DashboardTab({ project }: DashboardTabProps) {
  return (
    <div className="space-y-5">
      {/* Stat cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Health Score" value={`${project.healthScore}%`} icon={Heart} trend="up" color="emerald" />
        <StatCard title="Budget Used" value="65%" icon={DollarSign} trend="neutral" color="amber" />
        <StatCard title="Active Risks" value="3" icon={AlertTriangle} trend="down" color="red" />
        <StatCard title="Team Velocity" value="42 pts" icon={TrendingUp} trend="up" color="cyan" />
      </div>

      {/* Sprint progress + Budget burn */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-primary" /> Sprint Progress
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Completed</span>
                <span className="font-medium text-foreground">28 / 42 pts</span>
              </div>
              <div className="h-2.5 rounded-full bg-secondary/50 overflow-hidden">
                <div className="h-full rounded-full liquid-bg animate-liquid-flow" style={{ width: "67%" }} />
              </div>
              <p className="text-xs text-muted-foreground">6 days remaining</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-amber-400" /> Budget Burn
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Spent</span>
                <span className="font-medium text-foreground">$127,500 / $200,000</span>
              </div>
              <div className="h-2.5 rounded-full bg-secondary/50 overflow-hidden">
                <div className="h-full rounded-full bg-gradient-to-r from-amber-500 to-amber-400" style={{ width: "64%" }} />
              </div>
              <p className="text-xs text-muted-foreground">On track for Fixed Cost model</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Activity + Meetings */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-cyan-400" /> Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ActivityFeed />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-purple-400" /> Upcoming
            </CardTitle>
          </CardHeader>
          <CardContent>
            <MeetingList />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function StatCard({ title, value, icon: Icon, trend, color }: {
  title: string;
  value: string;
  icon: React.ElementType;
  trend: "up" | "down" | "neutral";
  color: string;
}) {
  const colorMap: Record<string, string> = {
    emerald: "text-emerald-400",
    amber: "text-amber-400",
    red: "text-red-400",
    cyan: "text-cyan-400",
  };
  const trendConfig = {
    up: { icon: ArrowUpRight, color: "text-emerald-400", label: "+12%" },
    down: { icon: ArrowDownRight, color: "text-red-400", label: "-3%" },
    neutral: { icon: Minus, color: "text-muted-foreground", label: "0%" },
  };
  const t = trendConfig[trend];
  const TrendIcon = t.icon;

  return (
    <Card className="liquid-border group hover:scale-[1.02] transition-transform duration-300">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-muted-foreground font-medium">{title}</p>
          <p className="text-2xl font-bold text-foreground mt-1 glow-text">{value}</p>
        </div>
        <div className={`p-2 rounded-xl glass-card ${colorMap[color]}`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
      <div className="mt-3 flex items-center gap-1.5 text-xs">
        <TrendIcon className={`w-3.5 h-3.5 ${t.color}`} />
        <span className={t.color}>{t.label}</span>
        <span className="text-muted-foreground">vs last period</span>
      </div>
    </Card>
  );
}

function ActivityFeed() {
  const activities = [
    { time: "2h ago", user: "Alex Chen", action: "completed", target: "API authentication refactor", type: "task", icon: CheckCircle2, iconColor: "text-emerald-400" },
    { time: "4h ago", user: "Maria Santos", action: "opened PR", target: "Payment integration", type: "pr", icon: GitPullRequest, iconColor: "text-cyan-400" },
    { time: "6h ago", user: "System", action: "deployed", target: "v2.1.0 to staging", type: "deploy", icon: Rocket, iconColor: "text-purple-400" },
    { time: "1d ago", user: "James Wilson", action: "commented on", target: "Risk: Database migration", type: "risk", icon: MessageSquare, iconColor: "text-amber-400" }
  ];

  return (
    <div className="space-y-2.5">
      {activities.map((a, i) => {
        const Icon = a.icon;
        return (
          <div key={i} className="flex items-start gap-3 p-3 rounded-lg glass-card hover:bg-white/5 transition-colors group">
            <div className="w-8 h-8 rounded-lg glass-card flex items-center justify-center shrink-0">
              <Icon className={`w-4 h-4 ${a.iconColor}`} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-foreground">
                <span className="font-medium">{a.user}</span>{" "}
                <span className="text-muted-foreground">{a.action}</span>{" "}
                <span className="font-medium text-primary">{a.target}</span>
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">{a.time}</p>
            </div>
            <Badge variant="secondary" className="text-[9px] shrink-0">{a.type}</Badge>
          </div>
        );
      })}
    </div>
  );
}

function MeetingList() {
  const meetings = [
    { time: "10:00", title: "Daily Standup", type: "standup" },
    { time: "14:00", title: "Sprint Planning", type: "planning" },
    { time: "16:00", title: "Architecture Review", type: "review" }
  ];

  return (
    <div className="space-y-2.5">
      {meetings.map((m, i) => (
        <div key={i} className="flex items-center gap-3 p-3 rounded-lg glass-card hover:bg-white/5 transition-colors">
          <div className="text-sm font-mono text-muted-foreground w-12 shrink-0">{m.time}</div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground">{m.title}</p>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{m.type}</p>
          </div>
          <Button size="sm" variant="ghost" className="text-[10px] text-primary shrink-0">
            Join
          </Button>
        </div>
      ))}
    </div>
  );
}
