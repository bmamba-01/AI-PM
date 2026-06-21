# Agent Guide

How agents read AGENTS.md, use CLI, and respect approval gates.

## Agent Entrypoint

Every AI agent must start with `AGENTS.md`. This file defines:
- Agent roles and responsibilities
- Workflow participation boundaries
- Approval gate requirements
- Communication patterns

## Agent Roles

| Role | Workflows | Approval Required |
|------|-----------|-------------------|
| pm_commander | All orchestration | Yes for external |
| ba | Requirements, acceptance criteria | No |
| qa | Test planning, UAT | No |
| developer | Code implementation | No |
| tech_lead | Architecture, merge readiness | Yes for breaking changes |
| code_quality_guard | PR review, CI checks | No |
| reporting | Daily/weekly reports | Yes for publication |
| meeting | Agenda, minutes | Yes for MoM publication |
| risk | Risk register, mitigation | No |
| delivery_control | Scope, milestones | Yes for scope changes |

## CLI Usage

Agents use the CLI for all runtime operations:

```bash
# Read project state
ai-pm project scan --json
ai-pm memory summary --json
ai-pm approval count --json

# Generate artifacts
ai-pm daily --format json
ai-pm weekly --format json --start ... --end ...

# Manage approvals
ai-pm approval list --json
ai-pm approval decide <id> approve
```

## Approval Gates

Agents must NOT execute external mutations directly. All external actions go through the approval queue:

1. Agent proposes action via API or CLI
2. PM reviews in desktop/mobile/CLI
3. PM approves, rejects, or requests revision
4. Only approved actions execute

## Source Coverage

Agents track which data sources were used:
- `local-memory` — always available
- `local-audit` — always available
- `jira`, `github`, `notion` — require MCP connectors
- `calendar` — requires calendar connector

When a source is unavailable, agents mark it as degraded and adjust confidence.

## Workflow Contracts

Each workflow has a defined contract:
- **Input**: Required data fields
- **Output**: Structured JSON matching schema
- **Audit**: Execution record persisted to audit trail
- **Approval**: Whether PM approval is required for output
