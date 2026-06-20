# PM Role Playbook

## Mission

Own project control across scope, timeline, cost, risk, quality, communication, and stakeholder decisions.

## Primary Inputs

- project charter, BRD, backlog, WBS, roadmap, contract model
- Jira, Linear, GitHub Issues, or equivalent work tracker
- calendar, email, meeting notes, stakeholder messages
- risk register, budget data, release plan, quality reports

## Primary Outputs

- daily briefing
- weekly status report
- risk and issue escalation
- decision request
- scope impact summary
- delivery health summary
- stakeholder communication draft

## Core Workflows

- `workflows/daily-briefing/README.md`
- `workflows/reporting/README.md`
- `workflows/risk-control/README.md`
- `workflows/scope-control/README.md`
- `workflows/meeting-intelligence/README.md`

## Done Criteria

- output separates facts, assumptions, risks, and recommendations
- source systems or local files are cited
- approval needs are visible
- project type and methodology are respected
- next action has owner and urgency

## Escalate When

- scope baseline may change
- fixed-cost margin may be affected
- timeline forecast changes materially
- high or critical risks lack owners
- stakeholder decision is needed
- source data conflicts

## Daily Checklist

- [ ] Review overnight blockers and new risks from daily briefing sources.
- [ ] Confirm today's meeting schedule and required attendees.
- [ ] Verify action owners and due dates from prior minutes.
- [ ] Check milestone trend and budget burn since last report.
- [ ] Flag approval items before they become blockers.
- [ ] Queue standup summary notes and status updates.

## Standup Preparation Checklist

- [ ] Completed work since last standup from task and PR systems.
- [ ] In-progress items and expected finish today or tomorrow.
- [ ] Active blockers and who is unblocking them.
- [ ] New risks or issues discovered overnight.
- [ ] Pending approvals needed from this group.
- [ ] Schedule conflicts or meetings to reschedule.

## Sprint Planning Facilitation

- [ ] Load current backlog and baseline scope for sprint.
- [ ] Identify capacity and known absences.
- [ ] Confirm definition of ready and definition of done.
- [ ] Prioritize by business value and risk reduction.
- [ ] Assign owners for each selected item.
- [ ] Reserve buffer for incidents and support.
- [ ] Capture sprint goal and success criteria.
- [ ] Record dependencies and external commitments.

## Stakeholder Communication Templates

- Status request digest: current RAG, top blockers, next decision date.
- Escalation request: risk, impact, options, recommended action, decision owner.
- Schedule change notice: current date, proposed date, cause, mitigation, acceptance required.
- Scope note: requested change, baseline impact, approval path.

## Risk Escalation Decision Tree

- Low: track in risk register, review at next regular review.
- Medium: PM adds mitigation action, owner assigned, due date set.
- High: PM and functional manager notified, contingency prepped.
- Critical: PM and sponsor notified within 24h, contingency activated if approved.

## Release Readiness Checks

- [ ] Acceptance criteria met for all scope items.
- [ ] Test summary report approved.
- [ ] Regression suite passed.
- [ ] Performance and security checks cleared.
- [ ] Deployment plan and rollback plan documented.
- [ ] Stakeholders briefed and launch window confirmed.

## Reporting Cadence

- Daily: internal status shortlist.
- Weekly: formal status report for team and governance.
- Milestone: formal milestone review with evidence.
- Ad hoc: when risk changes grade or decision required.
