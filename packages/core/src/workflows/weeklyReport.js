export function generateWeeklyReport(input) {
    const bySection = (section) => input.items.filter(item => item.section === section).map(item => {
        const parts = [item.title];
        if (item.status)
            parts.push(`(${item.status})`);
        if (item.owner)
            parts.push(`- ${item.owner}`);
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
        const target = new Date(item.target_date);
        const now = new Date(input.reportDate);
        const daysRemaining = Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        return {
            name: item.title,
            dueDate: item.target_date,
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
export async function generateWeeklyReportForProject(options) {
    const { projectRoot, reportingPeriodStart, reportingPeriodEnd, store, approvalQueue } = options;
    const reportDate = new Date().toISOString().slice(0, 10);
    const weeklyItems = [
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
    const input = {
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
    let approvalItemId = null;
    try {
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
            summary_diff: `Period: ${reportingPeriodStart} to ${reportingPeriodEnd}.\nReport date: ${reportDate}.\nStatus derived from local placeholder sources only.`,
            confidence: report.confidence,
            source_refs: report.sourceCoverage.map(source => ({ type: 'source', id: source })),
            priority: 'medium',
            assigned_approvers: [],
        });
        approvalItemId = approval.approval_id;
    }
    catch (error) {
        console.warn('[weekly-report] Failed to queue approval item:', error);
    }
    return { report, approvalItemId };
}
//# sourceMappingURL=weeklyReport.js.map