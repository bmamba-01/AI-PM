# Risk Register Template

## Purpose
Maintain a single, authoritative list of project risks with assessment, ownership, and mitigation tracking. Used by PM, risk officer, and steering committee for proactive risk management.

## When to Use
- Ongoing throughout the project lifecycle
- During risk review workshops (sprint planning, phase gates)
- When new risks are identified from incidents, audits, or external changes
- As input to project status and steering committee reporting

## Required Inputs
| Input | Source | Required |
|-------|--------|----------|
| Risk statement and description | Project team, lessons learned | Yes |
| Risk category | RBS (Risk Breakdown Structure) | Yes |
| Likelihood (qualitative or quantitative) | Team assessment / historical data | Yes |
| Impact (scope/schedule/cost/quality) | PM assessment | Yes |
| Risk owner | Assignment meeting | Yes |
| Mitigation actions | Brainstorming / SME input | Yes |
| Contingency plan | PM + risk owner | If high |

---

## Markdown Body Template

```markdown
# Risk Register - [Project Name]

**As of:** YYYY-MM-DD  
**Prepared by:** [PM / Risk Owner]  
**Review cadence:** [Weekly / Bi-weekly / Monthly]  

---

## Risk Summary

| Severity | Count |
|----------|-------|
| Critical | X |
| High | X |
| Medium | X |
| Low | X |
| Total | X |

---

## Risk Register

| ID | Risk Description | Category | Likelihood | Impact | Score | Owner | Mitigation | Contingency | Status | Review Date |
|----|-----------------|----------|------------|--------|-------|-------|------------|-------------|--------|-------------|
| RISK-001 | [Clear description of risk event] | Technical / Schedule / Cost / Scope / External / Organizational | H/M/L | H/M/L | Numeric or H/M/L | [Name] | [Planned controls] | [Fallback if risk materializes] | Open / Monitoring / Closed | YYYY-MM-DD |
| RISK-002 | | | | | | | | | | |

---

## Risk Categories (Reference)

- **Technical:** Technology maturity, integration complexity, performance
- **Schedule:** Dependency delays, estimation gaps, resource availability
- **Cost:** Budget overruns, exchange rates, vendor pricing
- **Scope:** Requirement volatility, gold plating, change control gaps
- **External:** Regulatory, market, vendor, third-party dependencies
- **Organizational:** Resource turnover, stakeholder alignment, governance

---

## Mitigation Action Tracker

| Risk ID | Action | Owner | Due Date | Status | Evidence / Outcome |
|---------|--------|-------|----------|--------|--------------------|
| RISK-001 | [Action] | [Name] | YYYY-MM-DD | Not started / In progress / Done | - |
| RISK-002 | [Action] | [Name] | YYYY-MM-DD | | |

---

## Escalation Criteria

| Severity | Escalation Path | Timeout |
|----------|-----------------|---------|
| Critical | - Sponsor - SteerCo | 24h |
| High | - PM + Functional Manager | 48h |
| Medium | - PM | 1 week |
| Low | - Risk owner backlog | Next review |

---

## Closed Risks (Last 30 Days)

| ID | Description | Closure Reason | Closed Date |
|----|-------------|----------------|-------------|
| RISK-0XX | [Summary] | Mitigated / No longer valid / Accepted | YYYY-MM-DD |

---

## Audit Trail

| Date | Updated By | Change Description |
|------|------------|--------------------|
| YYYY-MM-DD | [Name] | Initial register populated |
| YYYY-MM-DD | [Name] | Added RISK-001, updated RISK-007 assessment |
| YYYY-MM-DD | [Name] | Closed RISK-003 |

```

---

## Approval Notes
- **Risk Owner** validates likelihood/impact assessment for each owned risk.
- **Project Manager** consolidates and approves register before distribution.
- **SteerCo / Change Control Board** reviews high/critical risks at each meeting.
- Any risk moved to **Critical** requires immediate escalation and documented contingency activation plan.

## Source / Audit
- **Template Version:** 1.0
- **Created:** 2026-06-19
- **Source Workflow:** `workflows/risk-control/`
- **Related Templates:** `templates/requirements/change-request.md`
- **Governance:** ISO 31000 Risk Management; PMBOK Project Risk Management