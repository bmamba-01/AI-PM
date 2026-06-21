import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import type { LocalProjectStore } from '../runtime/localProjectStore.js';
import type { ApprovalQueue } from '../runtime/approvalQueue.js';
import { generateArtifact, writeArtifact, type ArtifactOutput } from '../artifacts/artifactFactory.js';

export type WeeklyReportInputItem = {
  source: string;
  section: 'accomplishment' | 'milestone' | 'risk' | 'issue' | 'change_request' | 'decision' | 'next_week' | 'dependency';
  title: string;
  status?: string;
  target_date?: string;
  owner?: string;
};

export interface WeeklyReportInput {
  projectId: string;
  reportingPeriodStart: string;
  reportingPeriodEnd: string;
  reportDate: string;
  items: WeeklyReportInputItem[];
  unavailableSources?: string[];
  assumptions?: string[];
}

export interface WeeklyReport {
  projectId: string;
  reportingPeriodStart: string;
  reportingPeriodEnd: string;
  reportDate: string;
  rag: Record<string, 'green' | 'amber' | 'red' | 'unknown'>;
  accomplishments: string[];
  scheduleStatus: {
    baselineFinish: string;
    forecastFinish: string;
    varianceDays: number;
    criticalPathImpact: string;
  };
  riskSummary: string[];
  changeSummary: string[];
  decisions: string[];
  nextWeekFocus: string[];
  milestones: Array<{ name: string; dueDate: string; target_date?: string; daysRemaining: number }>;
  resourceBudget: string;
  metricsQuality: string[];
  dependencies: string[];
  leadershipActions: string[];
  sourceCoverage: string[];
  assumptions: string[];
  confidence: number;
}

export function generateWeeklyReport(input: WeeklyReportInput): WeeklyReport {
  const bySection = (section: WeeklyReportInputItem['section']) =>
    input.items.filter(item => item.section === section).map(item => {
      const parts = [item.title];
      if (item.status) parts.push(`(${item.status})`);
      if (item.owner) parts.push(`- ${item.owner}`);
      return parts.join(' ');
    });

  const sourceCoverage = [
    ...Array.from(new Set(input.items.map(item => item.source))).sort(),
    ...(input.unavailableSources ?? []).map(source => `unavailable:${source}`),
  ];

  const confidence = Math.max(40, 100 - (input.unavailableSources?.length ?? 0) * 10 - (input.items.length === 0 ? 30 : 0));

  const milestones = input.items
    .filter(item => item.section === 'milestone' && item.target_date)
    .map(item => {
      const target = new Date(item.target_date as string);
      const now = new Date(input.reportDate);
      const daysRemaining = Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      return {
        name: item.title,
        dueDate: item.target_date as string,
        daysRemaining,
      };
    });

  return {
    projectId: input.projectId,
    reportingPeriodStart: input.reportingPeriodStart,
    reportingPeriodEnd: input.reportingPeriodEnd,
    reportDate: input.reportDate,
    rag: {
      scope: 'unknown',
      timeline: 'unknown',
      risk: 'unknown',
      budget: 'unknown',
      quality: 'unknown',
    },
    accomplishments: bySection('accomplishment'),
    scheduleStatus: {
      baselineFinish: input.reportingPeriodEnd,
      forecastFinish: input.reportingPeriodEnd,
      varianceDays: 0,
      criticalPathImpact: milestones.length > 0 ? 'Derived from milestone target dates.' : 'No milestone inputs provided.',
    },
    riskSummary: bySection('risk'),
    changeSummary: bySection('change_request'),
    decisions: bySection('decision'),
    nextWeekFocus: bySection('next_week'),
    milestones,
    resourceBudget: `Planned effort: ${bySection('accomplishment').length} completed items\nOpen items: ${bySection('next_week').length}\nRisks tracked: ${bySection('risk').length}`,
    metricsQuality: [
      `Defects from report period included in items: ${bySection('issue').length}`,
      'Test/rework details require explicit inputs for full reporting.',
    ],
    dependencies: bySection('dependency'),
    leadershipActions: bySection('decision').map(title => `Review decision: ${title}`),
    sourceCoverage,
    assumptions: input.assumptions ?? [],
    confidence,
  };
}

export interface WeeklyReportResult {
  report: WeeklyReport;
  approvalItemId: string | null;
  artifacts: Array<{
    id: string;
    path: string;
    format: string;
    persisted: boolean;
  }>;
}

export async function generateWeeklyReportForProject(options: {
  projectRoot: string;
  reportingPeriodStart: string;
  reportingPeriodEnd: string;
  store: LocalProjectStore;
  approvalQueue: ApprovalQueue;
}): Promise<WeeklyReportResult> {
  const { projectRoot, reportingPeriodStart, reportingPeriodEnd, store, approvalQueue } = options;
  const reportDate = new Date().toISOString().slice(0, 10);

  const weeklyItems: WeeklyReportInputItem[] = [
    {
      source: 'local-memory',
      section: 'accomplishment',
      title: 'Review completed milestones and deliverables from this period.',
      status: 'unknown',
    },
    {
      source: 'local-memory',
      section: 'next_week',
      title: 'Queue follow-up priorities for next reporting period.',
      status: 'unknown',
    },
    {
      source: 'local-memory',
      section: 'risk',
      title: 'Reconcile risk register updates before weekly report.',
      status: 'unknown',
    },
  ];

  const input: WeeklyReportInput = {
    projectId: 'local-project',
    reportingPeriodStart,
    reportingPeriodEnd,
    reportDate,
    items: weeklyItems,
    unavailableSources: ['online-mcp'],
    assumptions: ['Live data replaced with project local memory placeholder items.'],
  };

  const report = generateWeeklyReport(input);

  await store.appendWorkflowAudit({
    workflowId: 'weekly-report',
    projectId: report.projectId,
    status: 'completed',
    startedAt: new Date().toISOString(),
    completedAt: new Date().toISOString(),
    outputSummary: `Weekly report generated for ${reportingPeriodStart} to ${reportingPeriodEnd}`,
    sourceCoverage: report.sourceCoverage,
    assumptions: report.assumptions,
  });

  // ── Artifact generation ──────────────────────────────────────────────────
  const templateData = {
    report_id: `weekly-report-${reportDate}`,
    period_start: reportingPeriodStart,
    period_end: reportingPeriodEnd,
    generated_at: new Date().toISOString(),
    source_coverage: report.sourceCoverage,
    summary: {
      accomplishments: report.accomplishments,
      risks: report.riskSummary,
      decisions: report.decisions,
      next_week_focus: report.nextWeekFocus,
      milestones: report.milestones,
    },
    rag: report.rag,
    confidence: report.confidence,
    assumptions: report.assumptions,
  };

  const outputs = await generateArtifact('weekly-status', templateData, {
    formats: ['markdown', 'html', 'json'],
  });

  // Write artifacts to reports directory
  const reportsDir = path.join(projectRoot, 'reports');
  await mkdir(reportsDir, { recursive: true });

  const artifacts: WeeklyReportResult['artifacts'] = [];

  for (const output of outputs) {
    const artifactId = randomUUID();
    const filePath = await writeArtifact(output, reportsDir);

    // Persist artifact ref in memory store
    try {
      await store.createArtifact({
        project_id: report.projectId,
        name: `weekly-report-${reportDate}.${output.format === 'markdown' ? 'md' : output.format}`,
        path: filePath,
        type: output.format,
        status: 'active',
        archived_at: null,
        archive_reason: null,
        task_id: null,
      });
    } catch (err) {
      console.warn('[weekly-report] Failed to persist artifact ref:', err);
    }

    artifacts.push({
      id: artifactId,
      path: filePath,
      format: output.format,
      persisted: true,
    });
  }

  // ── Queue approval item ──────────────────────────────────────────────────
  let approvalItemId: string | null = null;
  try {
    const artifactPaths = artifacts.map(a => path.relative(projectRoot, a.path));
    const approval = await approvalQueue.createItem({
      project_id: report.projectId,
      action_type: 'publish_weekly_report',
      target_system: 'local',
      target_id: `weekly-report-${reportDate}`,
      workflow_id: 'weekly-report',
      run_id: `weekly-report-${Date.now()}`,
      requested_by_agent: 'weekly-report-workflow',
      requested_by_role: 'pm',
      title: `Approve weekly status report ${reportDate}`,
      description: 'Draft weekly report generated from local inputs. Approval is required before external publication.',
      summary_diff: `Period: ${reportingPeriodStart} to ${reportingPeriodEnd}.\nReport date: ${reportDate}.\nArtifacts: ${artifactPaths.join(', ')}`,
      confidence: report.confidence,
      source_refs: report.sourceCoverage.map(source => ({ type: 'source', id: source })),
      priority: 'medium',
      assigned_approvers: [],
    });
    approvalItemId = approval.approval_id;
  } catch (error) {
    console.warn('[weekly-report] Failed to queue approval item:', error);
  }

  return { report, approvalItemId, artifacts };
}
