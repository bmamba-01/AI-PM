# Daily Briefing Template

## Purpose
Provide a concise, repeatable daily project status snapshot for stakeholders and the delivery team. Surface the most important changes, blockers, and priorities so everyone starts the day aligned.

## When to Use
- End of each business day for active delivery sprints
- Before stand-up or leadership syncs
- When status is requested by sponsor/steering committee
- After major incidents or scope changes

## Required Inputs
| Input | Source | Required |
|-------|--------|----------|
| Completed tasks since last briefing | Task board / Git PRs | Yes |
| In-progress tasks and owners | Task board | Yes |
| Blockers / impediments | Scrum master / team leads | Yes |
| Risks requiring attention | Risk register | Yes |
| Upcoming milestones / deadlines | Release plan | Yes |
| Key decisions made | Meeting minutes / Slack | Yes |
| Team capacity / bandwidth | Resource plan | As available |

---

## Markdown Body Template

```markdown
# Daily Briefing - [Project Name]

**Date:** YYYY-MM-DD  
**Prepared by:** [AI-PM / PM Name]  
**Distribution:** [Team, stakeholder list]  

---

## At a Glance

| Dimension | Status | Trend |
|-----------|--------|-------|
| Schedule | Green / Amber / Red | Up/Stable/Down |
| Scope | Green / Amber / Red | Up/Stable/Down |
| Budget | Green / Amber / Red | Up/Stable/Down |
| Quality | Green / Amber / Red | Up/Stable/Down |
| Team morale | Green / Amber / Red | Up/Stable/Down |

---

## What Was Completed Yesterday / Today

| Task / Deliverable | Owner | Evidence (PR / Doc / Link) | Notes |
|--------------------|-------|----------------------------|-------|
| [Task title] | [Name] | [PR #123] | [Accepted / Needs rework] |
| [Task title] | [Name] | - | [Completed but not yet merged] |

---

## In Progress

| Task | Owner | Expected Completion | Status | Blockers |
|------|-------|---------------------|--------|----------|
| [Task] | [Name] | YYYY-MM-DD | Green/Amber/Red | [Blocker or None] |

---

## Blockers and Impediments

| ID | Blocker | Impact | Owner Working On It | ETA to Clear |
|----|---------|--------|---------------------|--------------|
| B-001 | [Description] | [Blocks X, Y, Z] | [Name] | YYYY-MM-DD |
| B-002 | [Description] | [Blocks X] | [Name] | TBD |

---

## Risks to Watch

| Risk | Current Likelihood / Impact | Owner | Mitigation Status |
|------|-----------------------------|-------|-------------------|
| [Risk title] | L: H/M/L - I: H/M/L | [Name] | [Planned / In progress / Done] |

---

## Milestones and Deadlines

| Milestone | Due Date | Days Remaining | Status |
|-----------|----------|----------------|--------|
| [Name] | YYYY-MM-DD | X | Green / Amber / Red |

---

## Key Decisions (Last 24h)

| Decision | Context | Made By | Impact |
|----------|---------|---------|--------|
| [Decision] | [Why] | [Name/Role] | [Scope / Schedule / Budget] |

---

## Ask / Support Needed

- [ ] [Specific ask to leadership / other teams]
- [ ] [Resource request]

---

## Upcoming Events

| Event | Date / Time | Participants |
|-------|-------------|--------------|
| [Demo] | YYYY-MM-DD HH:MM | [List] |
| [Review] | YYYY-MM-DD HH:MM | [List] |

```

---

## Approval Notes
- **AI-PM Agent** generates draft by aggregating Git, PR, task data, then surfaces it in chat or email.
- **Project Manager / Scrum Master** reviews and adjusts priority wording before distribution.
- **Sponsor / SteerCo** (if audience includes execs) may need one-paragraph executive summary added.

## Source / Audit
- **Template Version:** 1.0
- **Created:** 2026-06-19
- **Source Workflow:** `workflows/daily-briefing/`
- **Related Templates:** `templates/reports/weekly-status.md`
- **Governance:** PMBOK Monitor and Control Project Work