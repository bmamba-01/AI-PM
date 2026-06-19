import React from "react";
import { Project } from "@ai-pm/core";

export function ReportsTab({ project }: { project: Project }) {
  const [period, setPeriod] = React.useState("weekly");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Reports & Exports</h2>
          <p className="text-muted-foreground">Generate and schedule automated reports</p>
        </div>
        <div className="flex gap-2">
          <select value={period} onChange={e => setPeriod(e.target.value)} className="px-3 py-2 glass-input rounded-lg text-foreground text-sm">
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="sprint">Sprint</option>
            <option value="monthly">Monthly</option>
            <option value="quarterly">Quarterly</option>
          </select>
          <button className="px-4 py-2 bg-[#007AFF] hover:bg-[#007AFF]/80 rounded-lg text-sm font-medium text-white">Generate Report</button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {reportTemplates.map(t => (
          <ReportCard key={t.id} template={t} />
        ))}
      </div>

      <Card title="Scheduled Reports">
        <table className="w-full">
          <thead className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
            <tr><th className="p-4">Report</th><th className="p-4">Frequency</th><th className="p-4">Recipients</th><th className="p-4">Last Sent</th><th className="p-4">Next Run</th><th className="p-4">Actions</th></tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {scheduledReports.map(r => (
              <tr key={r.id} className="hover:bg-white/5">
                <td className="p-4 text-sm font-medium text-foreground">{r.name}</td>
                <td className="p-4 text-sm text-muted-foreground">{r.frequency}</td>
                <td className="p-4 text-sm text-muted-foreground">{r.recipients.join(", ")}</td>
                <td className="p-4 text-sm text-muted-foreground">{r.lastSent}</td>
                <td className="p-4 text-sm text-muted-foreground">{r.nextRun}</td>
                <td className="p-4"><button className="px-2 py-1 text-xs glass hover:bg-white/5 rounded">Edit</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

interface ReportCardProps {
  template: { id: string; name: string; description: string; format: string[]; icon: string };
}

function ReportCard({ template }: ReportCardProps) {
  const icons: Record<string, JSX.Element> = {
    dashboard: <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>,
    chart: <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>,
    list: <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>
  };

  return (
    <Card className="p-5 hover:border-white/14 transition-colors cursor-pointer">
      <div className="flex items-start justify-between mb-4">
        <div className="p-3 bg-[#007AFF]/15 rounded-lg text-[#007AFF]">{icons[template.icon]}</div>
        <span className="px-2 py-0.5 text-xs glass rounded text-muted-foreground">{template.format.join(", ")}</span>
      </div>
      <h3 className="font-medium text-foreground mb-1">{template.name}</h3>
      <p className="text-sm text-muted-foreground">{template.description}</p>
      <div className="mt-4 pt-4 border-t border-white/5 flex items-center justify-between">
        <span className="text-xs text-muted-foreground">Updated 2 days ago</span>
        <button className="px-3 py-1.5 text-sm bg-[#007AFF] hover:bg-[#007AFF]/80 rounded-lg text-white">Generate</button>
      </div>
    </Card>
  );
}

function Card({ title, children, className = "" }: { title?: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`glass-card rounded-xl p-5 ${className}`}>
      {title && <h3 className="font-medium text-foreground mb-4">{title}</h3>}
      {children}
    </div>
  );
}

const reportTemplates = [
  { id: "daily-standup", name: "Daily Standup Summary", description: "Yesterday's progress, today's plan, blockers", format: ["PDF", "Slack", "Email"], icon: "dashboard" },
  { id: "weekly-status", name: "Weekly Status Report", description: "Sprint progress, risks, budget, team health", format: ["PDF", "HTML", "Email"], icon: "chart" },
  { id: "sprint-review", name: "Sprint Review", description: "Completed work, demo notes, retrospective actions", format: ["PDF", "HTML"], icon: "list" },
  { id: "executive-summary", name: "Executive Summary", description: "High-level KPIs, milestones, budget, risks", format: ["PDF", "PPTX"], icon: "chart" },
  { id: "risk-report", name: "Risk Assessment", description: "Risk register, Monte Carlo, mitigation status", format: ["PDF", "XLSX"], icon: "list" },
  { id: "budget-forecast", name: "Budget Forecast", description: "Burn rate, EAC, variance analysis, scenarios", format: ["PDF", "XLSX"], icon: "chart" }
];

const scheduledReports = [
  { id: 1, name: "Weekly Status Report", frequency: "Weekly (Mon 9am)", recipients: ["pm@company.com", "tech-lead@company.com"], lastSent: "2024-08-05", nextRun: "2024-08-12" },
  { id: 2, name: "Daily Standup Summary", frequency: "Daily (weekdays 9am)", recipients: ["team@company.com"], lastSent: "2024-08-09", nextRun: "2024-08-12" },
  { id: 3, name: "Executive Summary", frequency: "Monthly (1st Mon)", recipients: ["cto@company.com", "vp-eng@company.com"], lastSent: "2024-07-01", nextRun: "2024-09-02" }
];