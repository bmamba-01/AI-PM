# PM Orchestrator Agent Prompts

> Use these as standalone prompts for separate agents. Each agent must work only in its assigned scope and must not overwrite unrelated work.

## Agent 1: Orchestrator Contract and Project Scope

```text
Objective: Define the project-scoped PM Orchestrator contract for AI-PM Toolkit.

Required reading:
- AGENTS.md
- docs/superpowers/specs/2026-06-18-ai-pm-toolkit-design.md
- docs/superpowers/plans/2026-06-19-pm-orchestrator-master-plan.md
- docs/operating-model/agent-operating-model.md
- docs/operating-model/subagent-protocol.md
- docs/operating-model/approval-policy.md

Scope:
- Create docs/architecture/pm-orchestrator-contract.md.
- Create docs/architecture/project-workspace-model.md.
- Update docs/operating-model/subagent-protocol.md only if needed to add artifact handoff, reviewer gate, and orchestrator loop fields.

Required content:
- Project resolution rules for managing 1-2 active projects.
- Orchestrated task state machine from intake to audit.
- Agent capability registry concept.
- Artifact handoff contract: local path, external URL, owner, approval state, source refs.
- Gate behavior for approval, reviewer, validation, and low-confidence outputs.
- Example weekly report handoff where the Reporting Agent saves a draft artifact and reports completion to PM Orchestrator.

Do not:
- Implement runtime TypeScript.
- Modify packages/.
- Change MCP registry.

Verification:
- rg -n "project_id|artifact|approval|orchestrator|state machine|weekly report" docs/architecture docs/operating-model
- pnpm --filter @ai-pm/core test

Output standard:
- objective handled
- sources inspected
- changes made
- assumptions or risks
- verification performed
- next recommended action
```

## Agent 2: Template and Artifact Catalog Expansion

```text
Objective: Expand templates so the toolkit covers the PM artifacts required for large project control.

Required reading:
- AGENTS.md
- docs/superpowers/plans/2026-06-19-pm-orchestrator-master-plan.md
- templates/README.md
- templates/templates.yaml
- workflows/daily-briefing/README.md
- workflows/reporting/README.md
- workflows/scope-control/README.md
- workflows/risk-control/README.md
- workflows/code-quality-guard/README.md

Scope:
- Work only under templates/.
- Add missing Markdown templates for WBS, project plan, milestone plan, traceability matrix, issue log, UAT sign-off, user guide, release readiness, DevOps incident/release checklist, and budget/burn tracker.
- Add HTML templates for weekly/client/steering reports if templates/html/ does not exist.
- Add CSV/XLSX-friendly schema notes for table-based artifacts under templates/tables/.
- Update templates/templates.yaml to include every template.
- Update templates/README.md to match actual files.

Required behavior:
- Every template must include purpose, when to use, required inputs, body, approval notes, source/audit notes.
- Every template must be project-scoped and include source references.
- Keep files ASCII unless an existing file requires otherwise.

Do not:
- Modify packages/.
- Modify docs outside templates/README.md.
- Add generated binary XLSX files yet.

Verification:
- rg --files templates
- rg -n "Purpose|Required Inputs|Approval|Source|project_id|source_refs" templates
- pnpm --filter @ai-pm/core test

Output standard:
- objective handled
- sources inspected
- changes made
- assumptions or risks
- verification performed
- next recommended action
```

## Agent 3: MCP Reuse-First Gateway Plan

```text
Objective: Rework the MCP plan around existing popular MCP servers and project-scoped connector profiles.

Required reading:
- AGENTS.md
- docs/superpowers/plans/2026-06-19-pm-orchestrator-master-plan.md
- docs/architecture/mcp-implementation-matrix.md
- docs/architecture/mcp-connector-lifecycle.md
- mcp/registry.yaml
- mcp/profiles/default.yaml
- mcp/profiles/offline-local.yaml
- mcp/contracts/*.md
- packages/mcp/src/registry/*

Scope:
- Create docs/architecture/mcp-reuse-first-gateway.md.
- Update mcp/examples/project-mcp-profile.yaml if needed to show per-project connectors, read/write permissions, and degraded behavior.
- Do not implement new vendor wrappers unless needed to fix tests.

Required content:
- Prioritized connector list: GitHub, Atlassian/Jira/Confluence, Linear, Google Workspace, Slack/Teams, Notion, Figma, Playwright, filesystem, SQLite.
- For each connector: preferred existing MCP/server, data needed by PM workflows, mutation policy, degraded mode.
- Setup wizard requirements for `ai-pm mcp doctor` and project-scoped profiles.
- Explicit statement that custom wrappers are thin adapters, not full replacements.

Verification:
- pnpm --filter @ai-pm/mcp test
- pnpm --filter @ai-pm/cli build
- rg -n "GitHub|Atlassian|Linear|Google|Slack|Notion|Figma|Playwright|degraded|approval" docs/architecture mcp/examples

Output standard:
- objective handled
- sources inspected
- changes made
- assumptions or risks
- verification performed
- next recommended action
```

## Agent 4: Chat and Hermes/OpenClaw Command Gateway

```text
Objective: Design the laptop-hosted chat/mobile command gateway using Hermes Agent or OpenClaw-style assistants instead of building a new general assistant.

Required reading:
- AGENTS.md
- docs/superpowers/plans/2026-06-19-pm-orchestrator-master-plan.md
- docs/operating-model/approval-policy.md
- docs/product/approval-queue-ux.md
- docs/architecture/approval-queue-runtime-contract.md
- packages/mobile/src/screens/ChatScreen.tsx
- packages/agents/src/orchestrator.ts

Scope:
- Create docs/architecture/chat-command-gateway.md.
- Create docs/product/chat-command-cli-spec.md.
- Work only in docs/ unless a broken reference must be corrected.

Required content:
- First adapter recommendation: Hermes Telegram by default, with OpenClaw-compatible gateway as alternate.
- Command model for mobile/chat: daily brief, weekly report draft, risk scan, pending approvals, project switch, agent status.
- Authentication and project resolution.
- Read-only default and approval flow for mutations.
- How completion is reported back to PM after an agent finishes a task.
- Example command: "generate weekly report for project X, save to Google Sheet draft, ask me before publishing."

Do not:
- Implement Telegram/Slack/Teams runtime code.
- Add secrets or tokens.
- Modify package code.

Verification:
- rg -n "Telegram|Hermes|OpenClaw|approval|project_id|weekly report|Google Sheet|read-only" docs/architecture docs/product
- pnpm --filter @ai-pm/core test

Output standard:
- objective handled
- sources inspected
- changes made
- assumptions or risks
- verification performed
- next recommended action
```
