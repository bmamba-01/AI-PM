# Agent Operating Model

## Purpose

This document defines how AI agents collaborate inside AI-PM Toolkit. It is the runtime-independent operating model for Codex, Claude Code, Claude Cowork, and future local or remote agents.

## Capability Registry

The runtime capability registry (`packages/core/src/orchestrator/capabilityRegistry.ts`) provides a static, queryable registry of all agent roles. Use `ai-pm agent status --json` to query the full registry, or `ai-pm agent route --workflow <id> --json` to route a workflow to the best-fit agent.

Each agent role defines:
- Supported workflows
- Required inputs and output formats
- Approval boundaries
- Required and optional MCP capabilities

## Agent Hierarchy

```text
Human PM
└─ PM Commander Agent
   ├─ Delivery Control Agent
   ├─ Risk & Issue Agent
   ├─ Meeting Intelligence Agent
   ├─ Reporting Agent
   ├─ Code Quality Guard Agent
   └─ Role Agents
      ├─ BA Agent
      ├─ Tech Lead Agent
      ├─ Developer Agent
      ├─ QA Agent
      └─ Stakeholder Agent
```

## PM Commander Agent

The PM Commander is the default coordinator for user requests.

Responsibilities:

- classify the request intent
- identify project, methodology, and project type
- load relevant playbooks and workflows
- gather context from local files and available MCP servers
- split work into subagent tasks
- enforce approval policy
- synthesize outputs for the PM
- record assumptions, sources, and audit information

The PM Commander should not do every specialist task directly when a role or specialist agent has a better-defined playbook.

## Specialist Agents

### Delivery Control Agent

Owns timeline, milestones, dependencies, scope movement, capacity signals, and delivery forecast.

Use for:

- schedule drift analysis
- sprint or milestone health
- dependency review
- replanning options
- delivery RAG assessment

### Risk & Issue Agent

Owns risks, issues, blockers, escalation, mitigation, and recurring problem patterns.

Use for:

- risk scans
- blocker escalation
- mitigation planning
- overdue risk review
- issue-to-risk conversion

### Meeting Intelligence Agent

Owns meeting preparation, transcript processing, decisions, action items, and meeting minutes.

Use for:

- agenda preparation
- MoM generation
- action extraction
- decision extraction
- follow-up sync proposals

### Reporting Agent

Owns PM reports for internal, client, steering, sprint, release, and executive audiences.

Use for:

- daily briefing
- weekly status
- client report draft
- steering report
- release readiness report

### Code Quality Guard Agent

Owns review of code and PRs, especially work produced by AI coding agents.

Use for:

- PR review
- changed-file risk analysis
- requirement compliance checks
- missing-test detection
- merge readiness assessment

## Role Agents

Role agents follow `playbooks/roles/` and are registered in the capability registry.

| Role | Registry ID | Key Responsibilities |
|---|---|---|
| PM Agent | `pm-commander` | Project control, stakeholder communication, governance |
| BA Agent | `ba-analyst` | Requirements, AC, traceability, ambiguity detection |
| Tech Lead Agent | `tech-lead` | Architecture, standards, technical risk, review strategy |
| Developer Agent | `developer` | Implementation plan, code changes, refactor plan, test creation |
| QA Agent | `qa-engineer` | Test strategy, test cases, regression and UAT readiness |
| Stakeholder Agent | `delivery-control` | Business summary, decisions needed, approval framing |

## Routing Rules

| Request Intent | Primary Agent | Reviewer |
|---|---|---|
| Daily project status | Reporting Agent | PM Commander |
| Meeting agenda or minutes | Meeting Intelligence Agent | PM Commander |
| Scope or requirement change | BA Agent | PM Commander |
| Timeline or milestone risk | Delivery Control Agent | Risk & Issue Agent |
| Risk scan | Risk & Issue Agent | Delivery Control Agent |
| Client report | Reporting Agent | PM Commander |
| PR or code review | Code Quality Guard Agent | Tech Lead Agent |
| Test strategy | QA Agent | Tech Lead Agent |
| Technical architecture | Tech Lead Agent | PM Commander |
| Stakeholder decision summary | Stakeholder Agent | PM Commander |

## Context Loading Order

1. Active design and implementation plan from `AGENTS.md`.
2. Relevant workflow under `workflows/`.
3. Relevant role playbook under `playbooks/roles/`.
4. Relevant methodology under `playbooks/methodologies/`.
5. Relevant project type under `playbooks/project-types/`.
6. Quality playbooks when code, tests, or requirements are involved.
7. MCP registry and contracts when external systems are needed.
8. Local project files and runtime state.

## Execution States

Every delegated task moves through:

```text
requested → accepted → context_loaded → running → review_required → completed
                                  └──── blocked
                                  └──── failed
```

Blocked tasks must report the missing input or unavailable connector. Failed tasks must report the failure mode and any partial output that is safe to use.

## Escalation Rules

Escalate to the PM when:

- source data is contradictory
- required connector is unavailable and the decision is high impact
- external mutation is requested
- risk is high or critical
- scope baseline may change
- fixed-cost margin may be affected
- code is not merge-ready but pressure exists to merge
- agent confidence is below 70 for a decision-support output

## Audit Expectations

Every substantial workflow run should record:

- trigger
- sources used
- agents involved
- assumptions
- output artifacts
- approval status
- risks detected
- follow-up actions

