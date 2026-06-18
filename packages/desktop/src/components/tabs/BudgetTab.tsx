import { Project } from "@ai-pm/core";

export function BudgetTab({ project }: { project: Project }) {
  const costModel = project.costModel;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Budget & Financials</h2>
          <p className="text-slate-400">{costModel === "TIME_MATERIAL" ? "Time & Materials" : costModel === "FIXED_COST" ? "Fixed Cost" : "Milestone-based"} model</p>
        </div>
        <div className="flex gap-2">
          <button className="px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-sm">Log Time</button>
          <button className="px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-sm">Add Expense</button>
          <button className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 rounded-lg text-sm font-medium">Generate Invoice</button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        <BudgetCard title="Total Budget" value="$200,000" subtitle="Approved" />
        <BudgetCard title="Spent to Date" value="$127,500" subtitle="63.8%" trend="up" />
        <BudgetCard title="Forecast (EAC)" value="$195,000" subtitle="Within budget" trend="neutral" />
        <BudgetCard title="Remaining" value="$72,500" subtitle="36.3% left" trend="down" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card title="Burn Rate">
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-slate-400">Current burn</span>
              <span className="font-medium">$4,200/week</span>
            </div>
            <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
              <div className="h-full bg-indigo-500 rounded-full" style={{ width: "72%" }} />
            </div>
            <p className="text-xs text-slate-500">Projected end: Week 42 (on track)</p>
          </div>
        </Card>

        <Card title="Earned Value (Fixed Cost)">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div><p className="text-2xl font-bold text-white">$130k</p><p className="text-xs text-slate-400">PV (Planned)</p></div>
            <div><p className="text-2xl font-bold text-green-400">$127k</p><p className="text-xs text-slate-400">EV (Earned)</p></div>
            <div><p className="text-2xl font-bold text-amber-400">$125k</p><p className="text-xs text-slate-400">AC (Actual)</p></div>
            <div className="col-span-3 grid grid-cols-3 gap-4 text-center mt-4">
              <div><p className="text-lg font-bold text-green-400">0.98</p><p className="text-xs text-slate-400">CPI</p></div>
              <div><p className="text-lg font-bold text-green-400">0.98</p><p className="text-xs text-slate-400">SPI</p></div>
              <div><p className="text-lg font-bold text-green-400">1.0</p><p className="text-xs text-slate-400">TCPI</p></div>
            </div>
          </div>
        </Card>
      </div>

      <Card title="Recent Time Entries">
        <table className="w-full">
          <thead className="text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
            <tr><th className="p-4">Date</th><th className="p-4">User</th><th className="p-4">Task</th><th className="p-4">Hours</th><th className="p-4">Billable</th><th className="p-4">Status</th></tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {timeEntries.map(e => (
              <tr key={e.id} className="hover:bg-slate-800/50">
                <td className="p-4 text-sm text-slate-300">{e.date}</td>
                <td className="p-4 text-sm text-white">{e.user}</td>
                <td className="p-4 text-sm text-slate-300">{e.task}</td>
                <td className="p-4 text-sm font-medium text-indigo-400">{e.hours}h</td>
                <td className="p-4"><span className={`px-2 py-0.5 text-xs rounded ${e.billable ? "bg-green-600/20 text-green-400" : "bg-slate-600/20 text-slate-400"}`}>{e.billable ? "Yes" : "No"}</span></td>
                <td className="p-4"><span className={`px-2 py-0.5 text-xs rounded ${e.approved ? "bg-green-600/20 text-green-400" : "bg-amber-600/20 text-amber-400"}`}>{e.approved ? "Approved" : "Pending"}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

function BudgetCard({ title, value, subtitle, trend }: { title: string; value: string; subtitle: string; trend?: "up" | "down" | "neutral" }) {
  const trendColors = { up: "text-red-500", down: "text-green-500", neutral: "text-slate-500" };
  const trendIcons = { up: "↑", down: "↓", neutral: "→" };
  return (
    <Card className="p-4">
      <p className="text-sm text-slate-400">{title}</p>
      <p className="text-2xl font-bold text-white mt-1">{value}</p>
      <div className="mt-2 flex items-center gap-1 text-xs">
        <span className={trendColors[trend || "neutral"]}>{trend ? trendIcons[trend] : ""}</span>
        <span className="text-slate-500">{subtitle}</span>
      </div>
    </Card>
  );
}

function Card({ title, children, className = "" }: { title?: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-slate-900 border border-slate-800 rounded-xl p-5 ${className}`}>
      {title && <h3 className="font-medium text-white mb-4">{title}</h3>}
      {children}
    </div>
  );
}

const timeEntries = [
  { id: 1, date: "2024-08-10", user: "Alex Chen", task: "JWT token refresh", hours: 6, billable: true, approved: true },
  { id: 2, date: "2024-08-10", user: "Maria Santos", task: "Payment integration", hours: 7, billable: true, approved: true },
  { id: 3, date: "2024-08-09", user: "James Wilson", task: "CI/CD pipeline", hours: 4, billable: true, approved: false },
  { id: 4, date: "2024-08-09", user: "Sam Park", task: "Memory leak fix", hours: 5, billable: true, approved: true }
];