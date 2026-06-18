# AI-PM Toolkit Design Specification

**Date:** 2026-06-18  
**Repository:** `C:\Works\AI-PM`  
**Status:** Design baseline  
**Audience:** Human PM owner, Codex, Claude Code, Claude Cowork, future project agents  

## 1. Purpose

AI-PM Toolkit is a local-first project management command system for a technical Project Manager who wants to use AI agents as daily operators, analysts, reviewers, and coordinators across complex software projects.

The product is not only a desktop or mobile application. The first deliverable is an AI-readable operating system inside the repository: agents must be able to open the GitHub folder, understand the rules, load the right playbooks, connect to approved MCP servers, execute PM workflows, supervise coding agents, and leave auditable outputs.

The runtime application comes after that operating system is stable. Desktop, mobile, chat gateway, CLI, local server, and MCP tooling should all execute the same underlying workflows instead of inventing separate behavior per interface.

## 2. Product Principles

1. **Agent-readable before UI-complete.** Every critical workflow must be understandable from repository documents and contracts before it appears as a button in the app.
2. **Local-first, online-enhanced.** Core project memory, templates, instructions, and audit logs must work offline. Online integrations enrich data through MCP servers when available.
3. **PM control remains explicit.** Agents may draft, analyze, recommend, and prepare actions. Destructive or externally visible actions require explicit policy and approval gates.
4. **Methodology-aware, not methodology-locked.** Scrum, Kanban, Waterfall, Hybrid, T&M, and Fixed Cost projects share a common domain model but use different governance rules.
5. **Quality gates are first-class.** AI-generated code and agent decisions must be reviewed against requirements, tests, risks, and project governance rules.
6. **Composable integrations.** Jira, Linear, Confluence, Notion, GitHub, GitLab, Gmail, Calendar, Slack, Teams, Drive, filesystem, browser, and local DB access should be represented as MCP capabilities with clear contracts.
7. **Auditability over magic.** Every meaningful agent action should record source data, reasoning summary, output, confidence, risks, and next action.

## 3. Scope

### In Scope

- AI-readable repository guidance for Codex, Claude Code, Claude Cowork, and similar coding agents.
- Agent operating model with commander, role agents, specialist agents, reviewer agents, and subagent task contracts.
- PM methodology playbooks for Scrum, Kanban, Waterfall, Hybrid, T&M, Fixed Cost, maintenance, and product delivery.
- MCP registry and integration contracts for project-management, communication, documentation, source-control, and local tools.
- Core PM workflows: daily briefing, meeting intelligence, scope control, timeline control, risk control, reporting, and code quality guard.
- Local runtime plan: CLI, local server, desktop app, mobile companion, chat gateway.
- Offline-first project memory and sync design.
- Governance, security, approval, and audit model.

### Out of Scope for This Design Baseline

- Full implementation of every MCP connector.
- Production-grade mobile application.
- Cloud multi-tenant SaaS backend.
- Replacing Jira, Linear, Confluence, Notion, GitHub, or GitLab.
- Training custom foundation models.
- Building new PM methodologies from scratch when standard approaches are sufficient.

## 4. Current Repository Assessment

The repository already contains a TypeScript monorepo skeleton:

- `packages/core`: domain, methodology, finance, skills, LLM, sync, security.
- `packages/agents`: agent pool and orchestrator stub.
- `packages/mcp`: MCP registry and wrapper stubs.
- `packages/cli`: CLI skeleton and init command.
- `packages/desktop`: Electron + React + Vite skeleton.
- `packages/mobile`: mobile package placeholder.
- `packages/shared`: shared package placeholder.
- `docs/plans`: several phase-based plans.

The main issue is not absence of code. The issue is that the plan currently mixes product layers:

- app implementation
- agent instructions
- MCP integration
- PM methodology
- chat gateway
- quality governance
- mobile/desktop UX

This design separates those layers, then rebuilds execution as vertical slices.

## 5. Target Architecture

```text
AI-PM Toolkit
├─ Agent Operating Layer
│  ├─ global instructions for Codex, Claude, and other agents
│  ├─ role playbooks
│  ├─ subagent task contracts
│  ├─ workflow execution rules
│  ├─ review and escalation rules
│  └─ quality gates
│
├─ PM Knowledge Layer
│  ├─ methodologies
│  ├─ project type governance
│  ├─ templates
│  ├─ report formats
│  ├─ risk and scope control models
│  └─ delivery lifecycle rules
│
├─ Integration Layer
│  ├─ MCP registry
│  ├─ MCP server profiles
│  ├─ normalized connector contracts
│  ├─ capability discovery
│  ├─ health checks
│  └─ offline fallbacks
│
├─ Orchestration Layer
│  ├─ PM Commander Agent
│  ├─ role agents
│  ├─ specialist agents
│  ├─ reviewer agents
│  ├─ task routing
│  ├─ approval gates
│  └─ audit logging
│
├─ Runtime Layer
│  ├─ CLI
│  ├─ local server
│  ├─ desktop app
│  ├─ mobile app
│  ├─ chat gateway
│  └─ background schedulers
│
└─ Data Layer
   ├─ SQLite local store
   ├─ vector/search index
   ├─ file-based project memory
   ├─ sync queue
   ├─ secrets vault
   └─ audit log
```

## 6. Repository Structure Target

```text
AI-PM/
├─ AGENTS.md
├─ CLAUDE.md
├─ CODEX.md
├─ README.md
├─ docs/
│  ├─ architecture/
│  ├─ operating-model/
│  ├─ plans/
│  ├─ product/
│  └─ superpowers/specs/
├─ playbooks/
│  ├─ roles/
│  ├─ methodologies/
│  ├─ project-types/
│  ├─ governance/
│  └─ quality/
├─ workflows/
│  ├─ daily-briefing/
│  ├─ meeting-intelligence/
│  ├─ scope-control/
│  ├─ risk-control/
│  ├─ reporting/
│  ├─ code-quality-guard/
│  └─ agent-supervision/
├─ mcp/
│  ├─ registry.yaml
│  ├─ profiles/
│  ├─ contracts/
│  └─ examples/
├─ templates/
│  ├─ requirements/
│  ├─ planning/
│  ├─ meetings/
│  ├─ reports/
│  ├─ risks/
│  ├─ qa/
│  └─ code-review/
├─ packages/
│  ├─ core/
│  ├─ agents/
│  ├─ mcp/
│  ├─ cli/
│  ├─ desktop/
│  ├─ mobile/
│  └─ shared/
└─ projects/
   └─ .gitkeep
```

The top-level docs and playbooks are intentionally outside `packages/`. They are source material for both humans and agents. Runtime packages should consume them rather than duplicate them.

## 7. Agent Operating Layer

### 7.1 Required Instruction Files

#### `AGENTS.md`

General instruction file for any AI agent opening the repository. It should define:

- product purpose
- repository map
- allowed and forbidden actions
- how to select playbooks
- how to use MCP profiles
- how to create task plans
- how to record decisions
- how to run validation
- how to escalate to the PM

#### `CLAUDE.md`

Claude-specific operating rules:

- how Claude Code should inspect context
- how Claude Cowork should act as a long-running collaborator
- how Claude should delegate subtasks
- how to produce review-oriented outputs
- how to avoid overwriting human work

#### `CODEX.md`

Codex-specific operating rules:

- how to inspect repo state
- how to use implementation plans
- how to work with tests and linting
- how to use MCP context safely
- how to review AI-generated code
- how to summarize changes for the PM

### 7.2 Agent Types

#### PM Commander Agent

Owns task intake, context assembly, routing, final synthesis, and human-facing communication.

Responsibilities:

- interpret user intent
- identify project, methodology, and project type
- load relevant playbooks
- query MCP/context sources
- decompose tasks into subagent work
- enforce approval gates
- synthesize outputs
- update audit log

#### Delivery Control Agent

Owns timeline, scope, dependency, milestones, and delivery status.

Responsibilities:

- detect schedule drift
- compare planned vs actual progress
- identify blocked dependencies
- recommend replanning options
- prepare steering updates

#### Risk & Issue Agent

Owns risk register, issue escalation, mitigation tracking, and early warning signals.

Responsibilities:

- scan Jira/Linear/GitHub issues and meeting notes
- detect emerging risks
- classify severity and probability
- propose mitigation and owner
- escalate overdue high-risk items

#### Meeting Intelligence Agent

Owns meeting preparation, transcript processing, decisions, action items, and minutes.

Responsibilities:

- prepare agenda from project context
- summarize transcript
- extract action items
- identify decisions and open questions
- sync follow-up tasks to work tracker

#### Reporting Agent

Owns daily, weekly, client, steering, and executive reporting.

Responsibilities:

- gather project facts
- create status reports
- identify RAG status
- explain timeline, scope, risk, budget, and quality variance
- produce bilingual reports when required

#### Code Quality Guard Agent

Owns review of AI-generated or human-generated code against technical and business requirements.

Responsibilities:

- inspect PRs and diffs
- map code changes to requirements and acceptance criteria
- identify missing tests
- flag architecture, security, maintainability, and regression risks
- supervise Codex, Claude Code, Cursor, Cline, and similar coding agents

#### Role Agents

Role agents execute role-specific tasks:

- BA Agent: requirements, BRD, user stories, acceptance criteria, traceability.
- Tech Lead Agent: architecture, technical standards, code review strategy, technical debt.
- Developer Agent: implementation planning, code changes, test creation, refactoring.
- QA Agent: test strategy, test cases, UAT support, bug triage, regression coverage.
- Stakeholder Agent: business summary, decisions, approvals, impact communication.

### 7.3 Subagent Task Contract

Every delegated task should follow a stable contract:

```yaml
task_id: string
project_id: string
requested_by: pm_commander
assigned_agent: ba|qa|dev|tech_lead|risk|reporting|meeting|code_quality
objective: string
context:
  methodology: scrum|kanban|waterfall|hybrid
  project_type: tm|fixed_cost|maintenance|product
  source_refs:
    - type: jira|linear|github|confluence|notion|file|email|calendar|transcript
      id: string
constraints:
  - string
required_outputs:
  - name: string
    format: markdown|json|yaml|table|diff|checklist
quality_gate:
  checklist_id: string
approval_required: true|false
deadline: ISO-8601
```

### 7.4 Subagent Output Contract

```yaml
task_id: string
status: completed|blocked|failed|needs_human_input
summary: string
findings:
  - severity: critical|high|medium|low|info
    title: string
    detail: string
    source_ref: string
recommendations:
  - action: string
    owner: string
    priority: critical|high|medium|low
artifacts:
  - path_or_url: string
    type: report|template|issue|pr|note|test_plan|risk_register
confidence: 0-100
open_questions:
  - string
audit:
  sources_used:
    - string
  assumptions:
    - string
  next_agent_suggested: string
```

## 8. PM Knowledge Layer

### 8.1 Methodology Playbooks

Each methodology playbook must define lifecycle, artifacts, ceremonies, control metrics, and governance.

#### Scrum

Required artifacts:

- product backlog
- sprint backlog
- increment
- sprint goal
- definition of ready
- definition of done
- retrospective actions

Required workflows:

- sprint planning
- daily scrum review
- backlog refinement
- sprint review
- retrospective
- velocity and burndown analysis

#### Kanban

Required artifacts:

- workflow board
- WIP limits
- service level expectation
- blocked-item policy
- cumulative flow report

Required workflows:

- flow review
- WIP breach detection
- cycle time analysis
- blocked work escalation

#### Waterfall

Required artifacts:

- project charter
- BRD
- SRS/FRD
- WBS
- project schedule
- risk register
- change request log
- UAT plan
- sign-off records

Required workflows:

- phase gate review
- requirement baseline
- change control
- milestone review
- UAT readiness
- production go/no-go

#### Hybrid

Required artifacts:

- high-level phase plan
- agile backlog inside delivery phases
- integration milestones
- phase-level sign-off
- sprint-level delivery metrics

Required workflows:

- phase governance
- sprint execution
- cross-team dependency review
- release readiness

### 8.2 Project Type Playbooks

#### T&M

Primary controls:

- burn rate
- capacity
- utilization
- budget forecast
- scope flexibility
- backlog priority
- timesheet variance

Agent focus:

- warn when burn increases without delivery progress
- identify low-value work
- optimize team allocation
- prepare transparent client updates

#### Fixed Cost

Primary controls:

- scope baseline
- change request discipline
- milestone acceptance
- cost-to-complete
- delivery risk
- margin protection

Agent focus:

- detect scope creep
- enforce change request flow
- map every change to cost/timeline impact
- escalate ambiguous requirements early

#### Maintenance

Primary controls:

- SLA
- incident priority
- recurring defect pattern
- support load
- release stability

Agent focus:

- triage issues
- detect recurring incidents
- suggest root-cause analysis
- produce SLA reports

#### Product Delivery

Primary controls:

- roadmap
- discovery insights
- feature adoption
- outcome metrics
- stakeholder feedback

Agent focus:

- connect requirements to outcomes
- summarize feedback
- identify roadmap risk
- support prioritization

## 9. Integration Layer

### 9.1 MCP Registry

The MCP registry should be a declarative source of available capabilities.

Example:

```yaml
servers:
  github:
    category: source_control
    required_for:
      - code_quality_guard
      - issue_tracking
    capabilities:
      - read_repositories
      - read_pull_requests
      - read_issues
      - comment_on_pr
    approval_required:
      - comment_on_pr
      - create_issue

  jira:
    category: work_tracking
    required_for:
      - sprint_control
      - risk_scan
      - reporting
    capabilities:
      - search_issues
      - read_sprints
      - create_issue
      - update_issue
    approval_required:
      - create_issue
      - update_issue
```

### 9.2 Connector Priority

Priority 1:

- GitHub
- Jira
- Linear
- Google Gmail
- Google Calendar
- Google Drive
- filesystem
- local SQLite

Priority 2:

- Confluence
- Notion
- Slack
- Microsoft Teams
- Outlook Calendar
- GitLab

Priority 3:

- Browser automation
- Figma
- Sentry
- CI systems
- Test management tools
- Finance/accounting systems

### 9.3 MCP Contract Categories

#### Work Tracker Contract

Used for Jira, Linear, GitHub Issues.

Normalized entities:

- issue
- epic
- sprint
- milestone
- assignee
- priority
- status
- blocker
- estimate
- due date

#### Documentation Contract

Used for Confluence, Notion, Google Drive, local files.

Normalized entities:

- page
- document
- section
- owner
- version
- approval status
- linked requirement

#### Source Control Contract

Used for GitHub, GitLab, local git.

Normalized entities:

- repository
- branch
- commit
- pull request
- diff
- review comment
- check run
- changed file

#### Communication Contract

Used for Gmail, Slack, Teams.

Normalized entities:

- message
- thread
- sender
- recipient
- timestamp
- attachment
- action request
- decision

#### Calendar Contract

Used for Google Calendar, Outlook.

Normalized entities:

- event
- attendee
- agenda
- meeting link
- recurrence
- accepted/declined status

## 10. Orchestration Layer

### 10.1 Routing Rules

PM Commander should route work by intent:

| Intent | Primary Agent | Reviewer |
|---|---|---|
| Daily summary | Reporting Agent | PM Commander |
| Meeting preparation | Meeting Agent | PM Commander |
| Requirement analysis | BA Agent | Tech Lead Agent |
| Sprint risk scan | Risk Agent | Delivery Control Agent |
| Timeline replanning | Delivery Control Agent | PM Commander |
| PR review | Code Quality Guard | Tech Lead Agent |
| Test strategy | QA Agent | BA Agent or Tech Lead Agent |
| Client report | Reporting Agent | PM Commander |

### 10.2 Approval Gates

Approval is required for:

- sending emails or chat messages externally
- creating or updating Jira/Linear/GitHub issues
- commenting on PRs
- changing project baseline scope
- changing milestone dates
- changing budget forecast
- closing risks or issues
- marking requirements as approved
- generating client-visible reports

Approval may be skipped only for read-only analysis, local drafts, and private summaries.

### 10.3 Agent Audit Log

Every workflow run should create an audit record:

```yaml
run_id: string
workflow_id: string
project_id: string
started_at: ISO-8601
completed_at: ISO-8601
trigger:
  type: manual|scheduled|chat|cli|desktop|mobile
  actor: string
agents:
  - id: string
    role: string
inputs:
  - source: string
    reference: string
outputs:
  - type: string
    reference: string
approvals:
  - required: true|false
    status: approved|rejected|not_required
risks_detected:
  - string
errors:
  - string
```

## 11. Core Workflows

### 11.1 Daily PM Briefing

Purpose: give the PM a reliable morning command view.

Inputs:

- emails since last briefing
- calendar events today and next 7 days
- Jira/Linear/GitHub issue changes
- risks and blockers
- due reports
- pending approvals
- open PRs

Outputs:

- top priorities today
- urgent blockers
- meetings requiring preparation
- risks requiring action
- stale items
- suggested messages or follow-ups

Acceptance criteria:

- can run from CLI
- can run from desktop
- can run from chat command
- works with partial MCP availability
- records sources and assumptions

### 11.2 Meeting Intelligence

Purpose: manage the full meeting lifecycle.

Stages:

1. Prepare agenda from project context.
2. Collect relevant issues, documents, and previous decisions.
3. Capture or import transcript.
4. Extract decisions, action items, risks, and open questions.
5. Draft MoM.
6. Prepare sync actions for Jira/Linear/Confluence/Notion.
7. Ask for approval before publishing.

Acceptance criteria:

- generated MoM separates facts, decisions, and assumptions
- action items have owner, due date, and target system
- unresolved questions are carried forward

### 11.3 Scope & Requirement Control

Purpose: prevent ambiguity, scope creep, and missing traceability.

Inputs:

- BRD/PRD/SRS
- user stories
- acceptance criteria
- client emails
- meeting decisions
- change requests
- issue tracker

Outputs:

- requirement inventory
- traceability matrix
- ambiguity list
- change impact analysis
- acceptance readiness checklist

Acceptance criteria:

- each requirement has source, owner, status, and acceptance signal
- fixed cost projects require change request recommendation for scope changes
- T&M projects require backlog/budget impact recommendation

### 11.4 Timeline & Delivery Control

Purpose: detect delivery drift and recommend replanning options.

Inputs:

- milestones
- sprint data
- issue status
- dependency map
- team capacity
- calendar constraints
- blockers

Outputs:

- delivery health
- critical risks
- delayed dependencies
- forecast change
- recovery options

Acceptance criteria:

- reports distinguish confidence from certainty
- recommendations include trade-offs
- changes to baseline require approval

### 11.5 Risk & Issue Control

Purpose: maintain an active risk system instead of a static register.

Inputs:

- risk register
- issue tracker
- meeting notes
- emails
- PR failures
- incident reports
- timeline drift

Outputs:

- new risk candidates
- severity/probability scoring
- mitigation plan
- owner recommendation
- escalation recommendation

Acceptance criteria:

- closed risks require evidence
- high risks require owner and next review date
- recurring issues can generate risk candidates

### 11.6 Reporting

Purpose: produce status reports for different audiences.

Report types:

- daily internal status
- weekly team report
- client status report
- steering committee report
- sprint report
- release readiness report
- budget/burn report

Outputs should include:

- RAG status
- scope status
- timeline status
- risk status
- budget status
- quality status
- decisions needed
- next actions

Acceptance criteria:

- client-facing reports exclude private internal notes
- generated reports cite source systems
- report confidence is visible

### 11.7 Code Quality Guard

Purpose: supervise code generated by AI coding agents and human developers.

Inputs:

- PR diff
- commit history
- requirement docs
- acceptance criteria
- test results
- coverage reports
- lint/typecheck/CI results

Checks:

- requirement compliance
- test coverage gap
- regression risk
- security risk
- architectural consistency
- maintainability
- dependency risk
- generated-code artifacts

Outputs:

- review findings
- missing tests
- requirement mismatch
- suggested fixes
- merge readiness

Acceptance criteria:

- high-risk findings include file/line references when available
- no merge recommendation without test evidence
- business compliance is checked, not just code style

## 12. Runtime Layer

### 12.1 CLI

CLI is the first runtime surface because it is easy for agents and humans to automate.

Target commands:

```bash
ai-pm init
ai-pm mcp check
ai-pm project scan
ai-pm daily brief
ai-pm meeting prepare
ai-pm meeting summarize
ai-pm report weekly
ai-pm risk scan
ai-pm scope check
ai-pm code review
ai-pm agent run
ai-pm audit list
```

### 12.2 Local Server

The local server coordinates:

- workflow execution
- MCP routing
- local DB access
- chat gateway callbacks
- desktop/mobile APIs
- background schedules
- approval queue

The local server should expose local-only APIs by default. Any remote access must require explicit configuration and authentication.

### 12.3 Desktop App

Desktop should be the PM command center.

Primary views:

- Command Center
- Daily Brief
- Agent Console
- MCP Manager
- Project Dashboard
- Scope Control
- Timeline/Gantt
- Risk Register
- Meeting Workspace
- Reports
- Code Quality Guard
- Settings/Vault

### 12.4 Mobile App

Mobile should not attempt to mirror the whole desktop app.

Primary functions:

- chat command
- daily brief
- approval queue
- urgent alerts
- risk/blocker view
- meeting summary
- quick report view

### 12.5 Chat Gateway

The chat gateway allows PM commands away from the laptop UI while the server runs on the laptop or controlled host.

Supported chat surfaces should be treated as adapters:

- Telegram
- Slack
- Teams
- Discord
- web chat

Flow:

```text
Chat App
→ Chat Gateway
→ Auth + Project Resolver
→ PM Commander
→ MCP/Data/Agents
→ Response
→ Audit Log
```

Security requirements:

- per-user authorization
- project selection
- command allowlist
- read-only default
- approval requirement for external mutations
- audit logging for every command

## 13. Data Layer

### 13.1 Local Store

SQLite should store:

- projects
- methodology state
- workflow runs
- agent tasks
- audit logs
- MCP connection status
- local cache snapshots
- approvals
- risks
- reports
- memory entries

### 13.2 File-Based Memory

Repository files should remain the canonical source for durable playbooks and templates. SQLite stores runtime state and indexed snapshots.

Memory categories:

- project facts
- decisions
- assumptions
- risks
- meeting notes
- agent outputs
- context snapshots
- approval records

### 13.3 Search Index

The toolkit should support keyword and semantic retrieval over:

- docs
- templates
- playbooks
- meeting notes
- reports
- requirements
- local project memory

Offline search must work at least with keyword search. Semantic search can use local embeddings or external models depending on configuration.

### 13.4 Sync

Sync should be queue-based:

- local writes first
- queued remote mutations
- conflict detection
- human review for destructive conflicts
- replay on reconnect

CRDT can be introduced for collaborative document editing later. It should not block the first useful workflows.

## 14. Security and Governance

### 14.1 Secrets

Secrets must not be stored in plain project files.

Use:

- OS keychain when available
- encrypted local vault as fallback
- environment variables for development

### 14.2 Permissions

Use least privilege:

- read-only by default
- explicit write scopes
- per-connector permission display
- per-workflow approval policy

### 14.3 Audit

Every external mutation must answer:

- who requested it
- which agent prepared it
- which source data was used
- what changed
- who approved it
- when it happened

### 14.4 Human Approval

Approval queue should support:

- approve
- reject
- request revision
- approve once
- approve similar future action by policy

## 15. Implementation Roadmap

### Phase 0: Design Reset and AI-Readable Operating System

Goal: make the repo useful to AI agents before the app is complete.

Deliverables:

- `AGENTS.md`
- `CLAUDE.md`
- `CODEX.md`
- `docs/operating-model/agent-operating-model.md`
- `docs/operating-model/subagent-protocol.md`
- `docs/operating-model/approval-policy.md`
- `playbooks/roles/*.md`
- `playbooks/methodologies/*.md`
- `playbooks/project-types/*.md`
- `playbooks/quality/*.md`
- `workflows/*/README.md`

Exit criteria:

- Codex or Claude can open the repo and explain how to run daily briefing, meeting summary, report generation, and code quality review.
- Each role agent has clear responsibilities, inputs, outputs, and done criteria.
- Subagent task and output contracts are documented.

### Phase 1: MCP Registry and Workflow Contracts

Goal: define integration contracts before implementing every connector.

Deliverables:

- `mcp/registry.yaml`
- `mcp/profiles/default.yaml`
- `mcp/profiles/offline-local.yaml`
- `mcp/contracts/work-tracker.md`
- `mcp/contracts/documentation.md`
- `mcp/contracts/source-control.md`
- `mcp/contracts/communication.md`
- `mcp/contracts/calendar.md`
- `mcp/contracts/local-memory.md`
- workflow input/output schemas

Exit criteria:

- The toolkit can describe which workflows are available with the current connector profile.
- Missing connectors degrade gracefully.
- MCP actions are classified as read-only or approval-required mutations.

### Phase 2: CLI Vertical Slice

Goal: build one complete workflow path without waiting for full UI.

Recommended first slice: Daily PM Briefing.

Deliverables:

- `ai-pm init`
- `ai-pm mcp check`
- `ai-pm daily brief`
- local SQLite schema for workflow runs and audit logs
- filesystem/local-memory connector
- stub or real connectors for GitHub and calendar/mail depending on available MCP setup

Exit criteria:

- CLI can generate a daily briefing from available local and MCP data.
- Briefing output includes sources, assumptions, and confidence.
- Audit log records workflow run.

### Phase 3: Agent Orchestrator Runtime

Goal: turn documented agent contracts into executable tasks.

Deliverables:

- agent registry
- task queue
- subagent routing
- output validator
- approval queue
- audit integration
- role-agent loaders from playbooks

Exit criteria:

- PM Commander can delegate at least three task types.
- Subagent outputs are validated against contract.
- Failed or low-confidence outputs are escalated.

### Phase 4: Meeting and Reporting Workflows

Goal: cover high-frequency PM work.

Deliverables:

- meeting prepare
- meeting summarize
- action item extraction
- weekly report
- client report draft
- approval before publish/sync

Exit criteria:

- Meeting summary creates decisions, actions, risks, and open questions.
- Weekly report summarizes timeline, scope, risk, budget, and quality.
- User can approve or revise generated external-facing outputs.

### Phase 5: Code Quality Guard

Goal: supervise agentic coding work.

Deliverables:

- PR/diff ingestion
- requirement-to-code review checklist
- test gap checker
- quality findings format
- merge readiness report
- coding-agent supervision playbook

Exit criteria:

- Code review output references changed files when available.
- Missing tests and requirement mismatches are highlighted.
- No merge-ready status is produced without test evidence.

### Phase 6: Local Server and Chat Gateway

Goal: allow PM command from chat/mobile contexts.

Deliverables:

- local API server
- command router
- chat gateway adapter skeleton
- authentication and project resolver
- approval queue API
- audit API

Exit criteria:

- Chat command can request daily brief or risk scan.
- Mutating commands require approval.
- Every chat command is audited.

### Phase 7: Desktop Command Center

Goal: create the full PM cockpit after workflows exist.

Deliverables:

- Command Center
- Agent Console
- MCP Manager
- Daily Brief view
- Risk view
- Scope view
- Meeting workspace
- Reports view
- Code Quality Guard view

Exit criteria:

- Desktop app invokes the same workflow engine as CLI.
- UI shows connector health and missing integration states.
- Approval queue is usable.

### Phase 8: Mobile Companion

Goal: provide lightweight mobile control.

Deliverables:

- chat command screen
- daily brief screen
- approval queue
- urgent alert notifications
- report viewer

Exit criteria:

- Mobile can read project state and approve queued actions.
- Mobile does not require full desktop feature parity.

## 16. Near-Term Execution Plan

The next implementation plan should focus only on Phase 0 and Phase 1.

Recommended task order:

1. Create top-level AI instruction files.
2. Create operating model docs.
3. Create role playbooks.
4. Create methodology playbooks.
5. Create project type playbooks.
6. Create workflow folders and README files.
7. Create MCP registry and contract docs.
8. Add repository index in README.
9. Add validation checklist for agents.
10. Review with Codex/Claude by asking them to explain how to execute core workflows.

Do not implement the desktop UI, mobile app, or full MCP wrappers until the operating layer is complete.

## 17. Success Criteria

### Repository Success

- A new AI agent can open the repo and understand the toolkit without private conversation context.
- Core workflows are documented with inputs, steps, outputs, and approval gates.
- Role agents have clear boundaries and handoff rules.
- MCP contracts are normalized across similar tools.

### PM Workflow Success

- Daily briefing reduces manual checking across mail, calendar, issue tracker, and docs.
- Meeting workflow produces actionable and auditable minutes.
- Reporting workflow produces stakeholder-ready drafts.
- Risk workflow detects emerging risks from multiple sources.
- Scope workflow distinguishes baseline, change request, and backlog refinement.

### Code Quality Success

- AI-generated code is checked against business requirements.
- Missing tests are identified before merge recommendation.
- PR review separates critical defects from style suggestions.
- Technical and business reviewers can inspect source evidence.

### Runtime Success

- CLI can execute core workflows.
- Desktop app uses the same workflow engine.
- Mobile and chat act as control surfaces, not separate systems.
- Offline mode works for local docs, templates, memory, and audit history.

## 18. Risks and Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Scope becomes too broad | Project stalls | Build vertical slices; freeze Phase 0/1 before UI expansion |
| MCP connectors differ by vendor | Integration instability | Normalize contracts and degrade gracefully |
| Agents produce confident but wrong outputs | PM decision risk | Require sources, confidence, assumptions, and review gates |
| Chat gateway exposes sensitive actions | Security risk | Read-only default, auth, approval queue, audit log |
| Desktop/mobile duplicate workflow logic | Maintenance burden | Shared workflow engine in core package |
| Offline sync becomes complex too early | Delays core value | Start with queue-based sync; add CRDT only where needed |
| Code review becomes style-only | False sense of quality | Require requirement compliance and test evidence checks |

## 19. Open Design Decisions

These decisions should be made during implementation planning:

1. Which chat adapter is first: Telegram, Slack, Teams, Discord, or web chat.
2. Which MCP profile is first: GitHub + local filesystem, or Jira + Google Workspace.
3. Whether local LLM support starts with Ollama only or allows provider abstraction immediately.
4. Whether workflow schemas use JSON Schema, Zod, or TypeScript-first validation.
5. Whether the first desktop version runs against the local server or direct Electron main-process services.

## 20. Recommended First Build Slice

Build this first:

```text
AI-readable operating layer
→ MCP registry and local profile
→ CLI daily briefing
→ audit log
→ PM Commander task routing
→ desktop read-only Daily Brief view
```

This slice proves the core idea:

- agents can understand the repo
- workflows have clear contracts
- data can come from MCP or local files
- outputs are auditable
- UI is a surface over the workflow engine

After this works, expand to meeting intelligence, reporting, code quality guard, chat gateway, and mobile companion.

