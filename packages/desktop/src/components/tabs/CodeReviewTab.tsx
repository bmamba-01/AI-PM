import { Project } from "@ai-pm/core";
import { Card, CardHeader, CardTitle, CardContent } from "../ui/card";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { GitPullRequest, AlertTriangle, CheckCircle2, XCircle, FileCode } from "lucide-react";

interface Props { project: Project }

export function CodeReviewTab({ project }: Props) {
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-foreground">Code Quality Guard</h2>
          <p className="text-sm text-muted-foreground">PR review, test coverage, and merge readiness</p>
        </div>
        <Button className="bg-[#007AFF] hover:bg-[#007AFF]/80 text-white">
          Review PR
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Open PRs</p>
                <p className="text-2xl font-bold text-foreground">4</p>
              </div>
              <GitPullRequest className="w-5 h-5 text-[#007AFF]" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Critical Findings</p>
                <p className="text-2xl font-bold text-[#FF3B30]">2</p>
              </div>
              <AlertTriangle className="w-5 h-5 text-[#FF3B30]" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Merge Ready</p>
                <p className="text-2xl font-bold text-[#34C759]">1</p>
              </div>
              <CheckCircle2 className="w-5 h-5 text-[#34C759]" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-sm">Pull Requests</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {[
            { id: "#234", title: "Payment integration", author: "Maria", status: "review", findings: 1, tests: true },
            { id: "#233", title: "JWT token refresh", author: "Alex", status: "review", findings: 3, tests: false },
            { id: "#231", title: "Rate limiting middleware", author: "Maria", status: "ready", findings: 0, tests: true },
            { id: "#230", title: "Memory leak fix", author: "Sam", status: "changes", findings: 2, tests: true },
          ].map((pr, i) => (
            <div key={i} className="flex items-center gap-4 p-3 rounded-lg glass hover:bg-white/5 transition-colors">
              <GitPullRequest className="w-4 h-4 text-muted-foreground shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-mono text-[#007AFF]">{pr.id}</span>
                  <span className="text-sm font-medium text-foreground truncate">{pr.title}</span>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">by {pr.author} • {pr.findings} findings • {pr.tests ? "tests ✓" : "no tests"}</p>
              </div>
              <Badge variant={
                pr.status === "ready" ? "success" :
                pr.status === "changes" ? "destructive" : "secondary"
              } className="text-[9px]">
                {pr.status === "ready" ? "Ready" : pr.status === "changes" ? "Changes" : "Review"}
              </Badge>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
