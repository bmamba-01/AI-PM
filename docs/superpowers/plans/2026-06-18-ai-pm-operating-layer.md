# AI-PM Operating Layer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the AI-readable operating layer and MCP contract baseline so Codex, Claude Code, Claude Cowork, and other agents can operate this repository consistently.

**Architecture:** The repository root becomes the agent entrypoint through `AGENTS.md`, `CLAUDE.md`, and `CODEX.md`. Durable PM knowledge lives in `playbooks/`, executable workflow contracts live in `workflows/`, and integration definitions live in `mcp/`. Runtime packages must consume these files instead of duplicating behavior.

**Tech Stack:** Markdown, YAML, TypeScript monorepo, MCP-compatible connector definitions, local-first workflow and audit model.

---

## Canonical Source

The latest design baseline is:

- `docs/superpowers/specs/2026-06-18-ai-pm-toolkit-design.md`

Older documents under `docs/plans/` and `docs/superagent-dashboard-spec.md` are historical context unless a newer plan explicitly references them.

## File Structure

- `AGENTS.md`: mandatory first-read entrypoint for all agents.
- `CLAUDE.md`: Claude Code and Claude Cowork operating rules.
- `CODEX.md`: Codex operating rules.
- `docs/operating-model/agent-operating-model.md`: agent hierarchy, routing, and responsibilities.
- `docs/operating-model/subagent-protocol.md`: task and output contracts.
- `docs/operating-model/approval-policy.md`: approval and mutation rules.
- `playbooks/roles/*.md`: PM, BA, QA, Dev, Tech Lead, Stakeholder role playbooks.
- `playbooks/methodologies/*.md`: Scrum, Kanban, Waterfall, Hybrid governance playbooks.
- `playbooks/project-types/*.md`: T&M, Fixed Cost, Maintenance, Product Delivery controls.
- `playbooks/quality/*.md`: code quality guard, testing, requirements traceability.
- `workflows/*/README.md`: executable workflow contracts for core PM work.
- `mcp/registry.yaml`: canonical MCP capability registry.
- `mcp/profiles/*.yaml`: default and offline connector profiles.
- `mcp/contracts/*.md`: normalized integration contracts.
- `README.md`: repository index that points agents to the new canonical plan.

## Tasks

### Task 1: Create Agent Entrypoints

**Files:**
- Create: `AGENTS.md`
- Create: `CLAUDE.md`
- Create: `CODEX.md`

- [x] Add clear "read this first" guidance.
- [x] Point every agent to the canonical design spec and this plan.
- [x] Define safe defaults: inspect before editing, read-only MCP unless approved, audit meaningful actions.
- [x] Define how to select playbooks and workflows.

### Task 2: Create Operating Model Docs

**Files:**
- Create: `docs/operating-model/agent-operating-model.md`
- Create: `docs/operating-model/subagent-protocol.md`
- Create: `docs/operating-model/approval-policy.md`

- [x] Document PM Commander, role agents, specialist agents, and reviewers.
- [x] Document task routing rules.
- [x] Document subagent task YAML and output YAML contracts.
- [x] Document which actions require human approval.

### Task 3: Create Role Playbooks

**Files:**
- Create: `playbooks/roles/pm.md`
- Create: `playbooks/roles/ba.md`
- Create: `playbooks/roles/qa.md`
- Create: `playbooks/roles/developer.md`
- Create: `playbooks/roles/tech-lead.md`
- Create: `playbooks/roles/stakeholder.md`

- [x] Each role defines responsibilities, inputs, outputs, workflows, done criteria, and escalation rules.
- [x] Each role references the relevant workflow folders.

### Task 4: Create Methodology and Project-Type Playbooks

**Files:**
- Create: `playbooks/methodologies/scrum.md`
- Create: `playbooks/methodologies/kanban.md`
- Create: `playbooks/methodologies/waterfall.md`
- Create: `playbooks/methodologies/hybrid.md`
- Create: `playbooks/project-types/tm.md`
- Create: `playbooks/project-types/fixed-cost.md`
- Create: `playbooks/project-types/maintenance.md`
- Create: `playbooks/project-types/product-delivery.md`

- [x] Define artifacts, ceremonies, control metrics, governance rules, and AI-agent focus for each playbook.
- [x] Make fixed cost and T&M governance explicitly different.

### Task 5: Create Quality Playbooks

**Files:**
- Create: `playbooks/quality/code-quality-guard.md`
- Create: `playbooks/quality/testing-strategy.md`
- Create: `playbooks/quality/requirements-traceability.md`

- [x] Define how agents review AI-generated code.
- [x] Require test evidence before merge readiness.
- [x] Require mapping code changes to requirements and acceptance criteria.

### Task 6: Create Core Workflow Contracts

**Files:**
- Create: `workflows/daily-briefing/README.md`
- Create: `workflows/meeting-intelligence/README.md`
- Create: `workflows/scope-control/README.md`
- Create: `workflows/risk-control/README.md`
- Create: `workflows/reporting/README.md`
- Create: `workflows/code-quality-guard/README.md`
- Create: `workflows/agent-supervision/README.md`

- [x] Each workflow defines trigger, inputs, steps, outputs, approval gates, and audit fields.
- [x] Each workflow supports partial MCP availability.

### Task 7: Create MCP Registry and Contracts

**Files:**
- Create: `mcp/registry.yaml`
- Create: `mcp/profiles/default.yaml`
- Create: `mcp/profiles/offline-local.yaml`
- Create: `mcp/contracts/work-tracker.md`
- Create: `mcp/contracts/documentation.md`
- Create: `mcp/contracts/source-control.md`
- Create: `mcp/contracts/communication.md`
- Create: `mcp/contracts/calendar.md`
- Create: `mcp/contracts/local-memory.md`

- [x] Classify connector capabilities as read-only or approval-required mutation.
- [x] Normalize entities across similar tools.
- [x] Define graceful degradation when a connector is missing.

### Task 8: Update README

**Files:**
- Modify: `README.md`

- [x] Add the canonical source section.
- [x] Add repository map.
- [x] Add instructions for AI agents and human PMs.

### Task 9: Validate

**Commands:**

```bash
rg -n "latest design baseline|canonical|2026-06-18-ai-pm-toolkit-design" .
rg -n "UNRESOLVED[_]MARKER|CHANGE[_]ME[_]MARKER|FIX[_]ME[_]MARKER" AGENTS.md CLAUDE.md CODEX.md docs/operating-model playbooks workflows mcp
git status --short
```

**Expected:**

- New canonical spec references appear in entrypoint files and README.
- No unresolved markers in the new operating-layer files.
- Git status shows only intended documentation changes plus any pre-existing user work.
