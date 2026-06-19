# Weekly Status Report Template

## Purpose
Deliver a structured weekly summary of delivery progress, health, and upcoming focus. Used by project managers, PMOs, and steering committees to track execution against plan.

## When to Use
- Every Friday or last working day of the week
- For SteerCo / leadership reviews
- When contractual reporting is required (weekly client reports)
- When phase/gate reviews are scheduled

## Required Inputs
| Input | Source | Required |
|-------|--------|----------|
| Weekly milestone/task completion | Task board, Git | Yes |
| Schedule variance (Baseline vs Actual) | Project schedule | Yes |
| Budget burn / forecast | Finance / PM | If budget-tracked |
| Risks and issues register | Risk/issue tracker | Yes |
| Decisions made this week | Meeting minutes | Yes |
| Next week's priority deliverables | Backlog / Sprint plan | Yes |
| Change requests submitted/approved | CR log | If under CM control |
| Quality metrics (defects, rework %) | QA metrics | Yes |

---

## Markdown Body Template

```markdown
# Weekly Status Report - [Project Name]

**Reporting Period:** YYYY-MM-DD to YYYY-MM-DD  
**Report Date:** YYYY-MM-DD  
**Prepared by:** [PM Name / AI-PM Agent]  
**Distribution:** [Stakeholder list]  

---

## Executive Summary

1-3 sentences on the overall health of the project and the single most important risk or decision this week.

---

## Health Dashboard

| KPI | Target | Actual | Trend | RAG |
|-----|--------|--------|-------|-----|
| Schedule (e.g., SPI) | 1.0 | X.XX | Stable/Up/Down | Green/Amber/Red |
| Cost (e.g., CPI) | 1.0 | X.XX | Stable/Up/Down | Green/Amber/Red |
| Scope change (CRs open) | <X | X | Stable | Green/Amber/Red |
| Defect escape / rework % | <X% | X% | Stable/Up/Down | Green/Amber/Red |
| Team utilization / capacity | X% | X% | Stable | Green/Amber/Red |

---

## Accomplishments This Week

| Deliverable / Milestone | Evidence | Notes |
|-------------------------|----------|-------|
| [Deliverable] | [Link/PR#] | [Acceptance confirmed / pending] |
| [Deliverable] | [Link] | [Partial complete] |

---

## Schedule Status

- **Baseline finish date:** YYYY-MM-DD
- **Current forecast finish date:** YYYY-MM-DD
- **Variance:** +X days / -X days
- **Critical path impact:** [Yes / No - describe if yes]

---

## Risk and Issue Summary

| ID | Title | Severity | Owner | Status | Next Action |
|----|-------|----------|-------|--------|-------------|
| RISK-XXX | [Title] | H/M/L | [Name] | Open/Monitoring/Closed | [Action by date] |
| ISS-XXX | [Title] | Critical/High/Med | [Name] | Open | [Action by date] |

---

## Changes This Week

| CR ID | Description | Type (Scope/Schedule/Cost/Quality) | Impact | Status |
|-------|-------------|------------------------------------|--------|--------|
| CR-00X | [Summary] | Scope | +X days / +$X | Pending / Approved / Rejected |

---

## Decisions Made This Week

| Decision | Rationale | Made By | Affects |
|----------|-----------|---------|--------|
| [Decision text] | [Context] | [Name/Role] | [Scope/Schedule/Budget/Quality] |

---

## Next Week's Focus

- [ ] [Priority 1 deliverable]
- [ ] [Priority 2]
- [ ] [Key review / demo / decision needed]

---

## Upcoming Milestones (Next 4 Weeks)

| Milestone | Due Date | Confidence | Dependencies / Risks |
|-----------|----------|------------|----------------------|
| [M1] | YYYY-MM-DD | High/Med/Low | [Notes] |

---

## Resource and Budget

- **Planned effort this week:** X person-days
- **Actual effort:** X person-days
- **Budget consumed this period:** $X
- **Forecast at completion:** $X (vs baseline $Y)

---

## Metrics and Quality

- Defects opened: X
- Defects closed: X
- Defect reopen rate: X%
- Test pass rate: X%
- Rework effort: X%

---

## Dependencies and External Blockers

| Dependency | Owner (External) | Due Date | Status | Risk If Late |
|------------|------------------|----------|--------|---------------|
| [Dep] | [Team/Org] | YYYY-MM-DD | Met / At risk / Late | [Impact] |

---

## Actions for Leadership / SteerCo

1. [Decision needed / Approval needed / Awareness item]

```

---

## Approval Notes
- **Project Manager** authorship required for governance-bound reports.
- **Functional Managers** validate resource/budget sections.
- **Project Sponsor** review for SteerCo distribution.
- **PMO** (if applicable) confirms template compliance and archive.

## Source / Audit
- **Template Version:** 1.0
- **Created:** 2026-06-19
- **Source Workflow:** `workflows/reporting/`
- **Related Templates:** `templates/reports/daily-briefing.md`
- **Governance:** PMBOK Monitor and Control Project Work; PRINCE2 Highlight Report