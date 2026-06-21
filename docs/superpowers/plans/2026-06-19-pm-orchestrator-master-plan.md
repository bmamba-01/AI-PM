# PM Orchestrator Master Plan

> **Status:** Current implementation plan  
> **Updated:** 2026-06-20  
> **Owner:** Human PM  
> **Purpose:** Refocus AI-PM Toolkit on a personal PM command system for managing one or two large, complex software projects with AI-agent automation across laptop, CLI, desktop, and mobile/chat surfaces.

## 1. Business Case

The toolkit is for a technical Project Manager who personally manages one or two complex projects at the same time. The product must reduce manual control work across scope, timeline, cost, risk, meetings, reports, issue tracking, code quality, DevOps visibility, and stakeholder communication.

The toolkit should not become a generic SaaS platform first. It should become a local-first PM Orchestrator that can run on the PM's laptop, expose controlled command access through chat/mobile, and delegate bounded work to existing coding and assistant agents such as Codex, Claude Code, Claude Cowork, Hermes Agent, OpenClaw-style assistants, or other MCP-capable agents.

## 2. Review of Existing Plan

The design baseline in `docs/superpowers/specs/2026-06-18-ai-pm-toolkit-design.md` is still valid as the architectural reference. It correctly separates operating layer, MCP contracts, runtime, data, approval, and audit.

The previous active plan, `docs/superpowers/plans/2026-06-18-ai-pm-operating-layer.md`, is now completed baseline work. It should no longer be treated as the current execution plan.

The later runtime status documents are useful context, but they are too optimistic and too implementation-led. They focus on package build status and approval queue detail before locking the personal PM operating loop. They also do not make chat/mobile orchestration early enough for the stated business case.

The correct next phase is not "build more UI panels." The next phase is to define and implement a project-scoped PM Orchestrator loop that can:

- resolve the active project
- gather context from local memory and MCP connectors
- select a workflow
- assign work to specialist agents
- validate outputs
- request approval for mutations
- persist artifacts
- sync or publish outputs through approved tools
- report completion back to the PM

## 3. Product Shape

```text
Human PM
└─ PM Orchestrator
   ├─ Project Workspace Resolver
   ├─ Workflow Router
   ├─ Agent Capability Registry
   ├─ MCP Gateway
   ├─ Template and Artifact Factory
   ├─ Approval Gatekeeper
   ├─ Audit and Memory Store
   └─ Chat/Mobile Command Gateway
```

The runtime can reuse Hermes Agent or OpenClaw-style assistants for chat, voice, mobile reach, persistent memory, and scheduled automations. AI-PM Toolkit should provide the PM domain layer, project-scoped workflows, artifact contracts, and approval gates instead of rebuilding a general personal assistant from scratch.

## 4. Core Non-Negotiables

- Everything is project-scoped. A command must resolve `project_id`, methodology, project type, sources, and allowed connectors before acting.
- Local-first must work offline for docs, templates, local memory, audit logs, and draft artifacts.
- External mutations are approval-gated by default: email, chat, Jira, Linear, GitHub, Confluence, Notion, Drive, calendar, PR comments, issue updates, scope baseline changes, cost changes, and report publication.
- Agents may draft and propose. The orchestrator must validate and route. The PM owns final approval.
- Every meaningful run writes an audit record with inputs, agents, assumptions, outputs, approvals, and artifact references.
- Existing proven tools and MCP servers should be preferred over custom connector builds.
- Runtime packages must consume operating-layer docs, schemas, templates, and MCP profiles instead of duplicating policy.

## 5. Priority Workflows

### Daily PM Control

Purpose: morning and end-of-day command view.

Inputs: Gmail/Slack/Teams, calendar, Jira/Linear/GitHub issues, risks, approvals, PRs, deadlines, local notes.

Outputs: daily priorities, blockers, meetings to prepare, approvals waiting, risks to review, follow-up drafts, audit record.

### Weekly Report

Purpose: produce internal/client weekly status with evidence.

Inputs: issue tracker, milestones, scope baseline, risk register, budget/burn, meeting decisions, code quality signals.

Outputs: Markdown draft, HTML/email draft, optional Google Sheet/Drive artifact, publication approval item, completion report to PM.

### WBS and Project Plan

Purpose: create and maintain project structure for Waterfall/Hybrid/Fixed Cost and backlog-linked plans for Agile/T&M.

Outputs: WBS, milestone plan, dependency map, Gantt-compatible data, owner matrix, assumptions, change impact warnings.

### Scope Verification and Traceability

Purpose: strict control of requirement coverage and scope movement.

Outputs: requirement inventory, traceability matrix, acceptance criteria, ambiguity list, change request draft, UAT readiness summary.

### Risk and Issue Control

Purpose: active risk system, not passive register.

Outputs: risk candidates from issues/meetings/PR failures, severity/probability/impact, owner, mitigation, escalation drafts, next review date.

### Code Quality Guard

Purpose: supervise AI-generated and human code against business requirements.

Inputs: PR diff, tests, CI, requirement IDs, acceptance criteria, defect reports, architecture rules.

Outputs: merge readiness, missing tests, requirement mismatch, risk findings, suggested reviewer actions.

### Meeting Intelligence

Purpose: full meeting lifecycle.

Inputs: agenda, previous decisions, transcript/imported notes, project context.

Outputs: MoM, decisions, action items, risks, open questions, follow-up tasks, approval before publish.

### DevOps Work

Purpose: monitor delivery health from CI/CD, environments, releases, incidents, test automation, deployment risk, and rollback readiness.

Outputs: release readiness, failed check summary, incident risk, environment blocker list, deployment go/no-go checklist.

## 6. Template Strategy

Templates must be discoverable through `templates/templates.yaml` and usable by CLI, desktop, chat, and agents.

Required template families:

- daily briefing
- weekly report
- meeting agenda and minutes
- WBS
- project plan
- milestone plan
- traceability matrix
- risk register
- issue log
- change request
- acceptance criteria
- UAT sign-off
- user guide
- test plan
- merge readiness
- release readiness
- DevOps incident/release checklist
- budget/burn tracker

Required output formats:

- Markdown for agent-readable drafts
- YAML/JSON for machine-readable metadata and workflow input/output
- HTML for stakeholder-ready reports and email bodies
- XLSX/CSV-compatible tables for WBS, traceability matrix, risk register, issue log, budget/burn, and milestone tracking

## 7. MCP and Existing Tool Strategy

Prefer first-party or widely used MCP servers where available:

- GitHub MCP for repositories, issues, PRs, code review, and workflow signals.
- Atlassian Rovo MCP for Jira, Confluence, Bitbucket, and Compass.
- Linear MCP for issues, projects, milestones, initiatives, and product updates.
- Notion MCP for workspace docs and database-backed project artifacts.
- Slack MCP for chat/search/message context and approved messages.
- Figma MCP for design context and design-to-development support.
- Playwright MCP for browser automation and automation-test support.
- Google Workspace MCP or API-backed adapter for Gmail, Calendar, Drive, Docs, Sheets, and Meet transcript artifacts.
- Local filesystem and SQLite connectors for offline memory and audit.

Custom wrappers should be thin adapters around the registry, profile, permission, and audit model. Do not build full replacement clients for vendors unless no reliable MCP/API option exists.

## 8. Orchestrator Loop

Every orchestrated task follows this loop:

```text
intake
→ project resolution
→ context pack
→ workflow selection
→ agent assignment
→ agent execution
→ output validation
→ reviewer/gate check
→ artifact persistence
→ approved sync/publication
→ completion report
→ audit write
```

For example, weekly report generation:

```text
PM chat command
→ resolve project
→ gather Jira/Linear/GitHub/Gmail/Calendar/risk/budget context
→ assign Reporting Agent
→ assign Risk Agent and Code Quality Guard as supporting reviewers
→ validate report against weekly-report template
→ create Google Sheet/Drive or local artifact draft
→ queue publication approval
→ after approval, sync/publish
→ report completion to PM via chat and desktop
```

## 8A. Setup and Onboarding Gateway

The toolkit must not assume the PM starts from a prepared repository. First launch must route through a setup gateway before normal dashboard work.

Required setup paths:

- New Project: create a fresh local-first AI-PM project with one-click defaults and optional step-by-step configuration.
- Adopt Existing Project: select an existing Git/project folder, scan readiness, add missing AI-PM operating/runtime files, and preserve existing human files unless repair is explicitly requested.
- Demo Project: open a local example workspace for learning the UI without modifying real projects.

The desktop app is the primary onboarding surface. CLI is the automation source of truth. Mobile is read-only for setup status and must not create or adopt projects.

Setup completion must produce project profile readiness, memory/audit/approval readiness, template and artifact catalog readiness, MCP profile and connector doctor status, agent entrypoint readiness, and next commands for CLI and agent workers.

Every toolkit tab that needs setup must expose a short guide dialog with required setup, current readiness, primary action, and CLI equivalent.

Implementation plan:

- `docs/superpowers/plans/2026-06-21-setup-onboarding-gateway.md`

## 9. Revised Roadmap

### Phase 1: Stabilize and Re-anchor

- Make this file the current implementation plan in `AGENTS.md` and `README.md`.
- Mark prior plan files as historical unless referenced.
- Keep repo green with `pnpm build`, core tests, MCP tests, and CLI build.
- Review WIP files before merging agent outputs.

### Phase 1A: Setup and Onboarding Gateway

- Replace desktop first-run default project creation with a setup gateway.
- Add CLI automation for `init`, existing project adoption, setup doctor, and setup repair.
- Add one-click defaults and step-by-step setup mode.
- Add contextual guide dialogs across desktop toolkit tabs.
- Add read-only mobile setup status.

### Phase 2: Project-Scoped Orchestrator Contract

- Define project profile schema.
- Define agent capability registry.
- Define orchestrated task state machine.
- Extend subagent protocol with artifact handoff and validation gates.
- Add CLI design for `ai-pm orchestrator run`, `ai-pm project use`, and `ai-pm agent status`.

### Phase 3: Template and Artifact Factory

- Complete template catalog for the required PM artifacts.
- Add XLSX/CSV-compatible schemas for WBS, traceability, risk, issue, budget, and milestone tables.
- Add HTML report templates for weekly/client/steering outputs.
- Add template validation.

### Phase 4: MCP Gateway and Setup Wizard

- Support project-scoped connector profiles.
- Implement `ai-pm mcp validate`, `ai-pm mcp list`, `ai-pm mcp doctor`, and setup checks.
- Prefer external MCP server configuration over custom wrappers.
- Record read/write capability, approval rules, health, and degraded workflow behavior.

### Phase 5: Daily and Weekly Automation

- Upgrade daily briefing to use project profile and connector availability.
- Implement weekly report as the first full orchestrated multi-agent workflow.
- Persist artifacts and audit records.
- Support local artifact first, then Google Drive/Sheets sync behind approval.

### Phase 6: Chat/Mobile Command Gateway

- Choose first adapter: Hermes Telegram or OpenClaw-compatible gateway.
- Implement read-only commands first: daily brief, risk scan, weekly status draft, pending approvals.
- Add approval actions after identity and audit are reliable.

### Phase 7: Scope, Traceability, Risk, and Code Quality

- Implement traceability matrix generation and verification.
- Implement WBS/project plan outputs.
- Implement code quality supervision against PRs, requirements, tests, and CI.
- Implement DevOps/release readiness workflows.

## 10. Current Delegation Rule

Only delegate tasks that have clear file scope, success criteria, and verification commands. Each agent must:

- read `AGENTS.md`
- read this current implementation plan
- read the relevant workflow/playbook
- avoid broad refactors
- preserve user and other-agent changes
- report sources inspected, changes made, assumptions, verification, and next action

Current prompt set:

  - Remaining master plan assignment set: `docs/agent-delegation/2026-06-21-master-plan-remaining-assignments.md`
- Runtime implementation plan: `docs/superpowers/plans/2026-06-19-next-runtime-functions.md`
- Historical prompt sets are reference only unless a newer active plan explicitly names them.

## 11. Verification Gate

Before claiming a phase complete, run:

```bash
corepack pnpm@9.4.0 -r run test
corepack pnpm@9.4.0 -r run build
node schemas/validate-fixtures.mjs
rg -n "UNRESOLVED_|TODO_AGENT|PLACEHOLDER" AGENTS.md README.md docs playbooks workflows mcp templates packages --glob "!docs/superpowers/plans/*.md" --glob "!**/dist/**"
```

Warnings from Vite about Electron `fs` and `path` browser externalization are known build warnings, not current blockers, but should be tracked before desktop runtime hardening.

## 12. External References To Validate During Implementation

- GitHub MCP Server: https://github.com/github/github-mcp-server
- Atlassian Rovo MCP Server: https://support.atlassian.com/atlassian-rovo-mcp-server/docs/getting-started-with-the-atlassian-remote-mcp-server/
- Figma MCP Server: https://help.figma.com/hc/en-us/articles/32132100833559-Guide-to-the-Figma-MCP-server
- Playwright MCP: https://playwright.dev/docs/getting-started-mcp
- Linear MCP: https://linear.app/changelog/2025-05-01-mcp
- Notion MCP: https://developers.notion.com/guides/mcp/overview
- Slack MCP Server: https://docs.slack.dev/ai/slack-mcp-server
- Hermes Agent: https://github.com/NousResearch/hermes-agent
- OpenClaw: https://github.com/openclaw/openclaw
