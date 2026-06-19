## Phase 4: Methodology Framework & Daily Workflows

### Task 11: Implement Methodology Engine
**Objective:** Pluggable methodology support (Waterfall, Scrum, Kanban, Hybrid) with phase/gate definitions, ceremonies, artifacts

**Files:**
- Create: `packages/core/src/methodology/types.ts`
- Create: `packages/core/src/methodology/engine.ts`
- Create: `packages/core/src/methodology/definitions/` (waterfall.ts, scrum.ts, kanban.ts, hybrid.ts)
- Create: `packages/core/src/methodology/ceremonies/` (sprint-planning.ts, daily-standup.ts, retrospective.ts, review.ts, gate-review.ts)
- Create: `packages/core/src/methodology/artifacts/` (charter.ts, backlog.ts, sprint-backlog.ts, increment.ts, lessons-learned.ts)

**Step 1:** Define Methodology interface: phases, gates, ceremonies, artifacts, roles, metrics
**Step 2:** Implement Waterfall: Requirements → Design → Implementation → Verification → Maintenance with gate reviews
**Step 3:** Implement Scrum: Sprint cycle, roles (PO, SM, Dev), events, artifacts, Definition of Done
**Step 4:** Implement Kanban: WIP limits, flow metrics, continuous delivery
**Step 5:** Implement Hybrid: Phase-gate + sprints, configurable per project
**Step 6:** Write methodology engine: project initialization, phase transitions, compliance checking
**Step 7:** Verify: create project with each methodology, run ceremony, produce artifacts

---

### Task 12: Implement Daily PM Workflow Automation
**Objective:** Automate standup prep, email triage, calendar sync, meeting notes, action items, status reports

**Files:**
- Create: `packages/agents/src/pm-agents/daily-workflow/agent.ts`
- Create: `packages/agents/src/pm-agents/daily-workflow/standup-prep.ts`
- Create: `packages/agents/src/pm-agents/daily-workflow/email-triage.ts`
- Create: `packages/agents/src/pm-agents/daily-workflow/meeting-assistant.ts`
- Create: `packages/agents/src/pm-agents/daily-workflow/status-reporter.ts`
- Create: `packages/agents/src/pm-agents/daily-workflow/calendar-sync.ts`

**Step 1:** Standup prep: pulls Jira/Linear/GitHub updates, identifies blockers, generates talking points
**Step 2:** Email triage: categorizes (urgent, action-needed, FYI, spam), drafts replies, creates tasks
**Step 3:** Meeting assistant: joins (via calendar), transcribes, extracts decisions/action-items/risks, updates tracker
**Step 4:** Status reporter: generates daily/weekly/executive reports from project data
**Step 5:** Calendar sync: two-way with Google/Outlook, protects focus time, suggests meeting times
**Step 6:** Verify: end-to-end daily workflow with mock data

---

### Task 13: Implement Role-Based Workflows for Team
**Objective:** Define AI-assisted workflows for each role: Dev, QA, Designer, BA, PO, SM, Tech Lead, Stakeholder

**Files:**
- Create: `packages/core/src/roles/definitions.ts`
- Create: `packages/agents/src/role-agents/` (developer.ts, qa.ts, designer.ts, ba.ts, po.ts, sm.ts, tech-lead.ts, stakeholder.ts)
- Create: `packages/ui/src/components/role-dashboards/` (one per role)

**Step 1:** Define role capabilities, tool access, agent permissions
**Step 2:** Developer agent: code-gen, refactor, test-gen, PR description, architecture decisions
**Step 3:** QA agent: test planning, exploratory testing guide, bug reproduction, automation
**Step 4:** Designer agent: design system compliance, accessibility check, handoff specs
**Step 5:** BA agent: requirement analysis, acceptance criteria, traceability matrix
**Step 6:** PO agent: backlog prioritization, release planning, stakeholder alignment
**Step 7:** SM agent: impediment tracking, velocity forecasting, retrospective facilitation
**Step 8:** Tech Lead agent: architecture review, tech debt tracking, code quality overview
**Step 9:** Stakeholder agent: executive dashboard, approval workflows, communication digests
**Step 10:** Verify: each role dashboard shows relevant info, agents produce role-appropriate output