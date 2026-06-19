# AI-PM Toolkit

AI-PM Toolkit is a local-first project management operating system and runtime toolkit for technical Project Managers using AI agents.

It is designed for complex software projects where the PM needs AI support for daily operations, meetings, reporting, scope, timeline, risk, methodology governance, MCP integrations, and code quality supervision.

## Read This First

For AI agents:

1. `AGENTS.md`
2. `docs/superpowers/specs/2026-06-18-ai-pm-toolkit-design.md`
3. `docs/superpowers/plans/2026-06-19-pm-orchestrator-master-plan.md`

For Claude:

- `CLAUDE.md`

For Codex:

- `CODEX.md`

Older documents under `docs/plans/` and `docs/superagent-dashboard-spec.md` are historical context unless the current implementation plan explicitly references them.

## Current Canonical Baseline

- Design spec: `docs/superpowers/specs/2026-06-18-ai-pm-toolkit-design.md`
- Implementation plan: `docs/superpowers/plans/2026-06-19-pm-orchestrator-master-plan.md`

## Repository Map

```text
AGENTS.md                     General entrypoint for all AI agents
CLAUDE.md                     Claude Code and Claude Cowork guide
CODEX.md                      Codex guide
docs/operating-model/         Agent model, subagent protocol, approval policy
docs/superpowers/specs/       Canonical design specifications
docs/superpowers/plans/       Active implementation plans
playbooks/roles/              PM, BA, QA, Dev, Tech Lead, Stakeholder playbooks
playbooks/methodologies/      Scrum, Kanban, Waterfall, Hybrid governance
playbooks/project-types/      T&M, Fixed Cost, Maintenance, Product Delivery rules
playbooks/quality/            Code quality, testing, requirements traceability
workflows/                    Executable PM workflow contracts
mcp/                          MCP registry, profiles, and normalized contracts
templates/                    PM templates grouped by purpose
packages/                     Runtime monorepo packages
projects/                     Local project workspaces
```

## Runtime Packages

```text
packages/core       Domain, methodology, finance, skills, LLM, sync, security
packages/agents     Agent pool and orchestration runtime
packages/mcp        MCP registry and wrappers
packages/cli        ai-pm command line
packages/desktop    Electron + React desktop app
packages/mobile     Mobile companion package
packages/shared     Shared types and utilities
```

Runtime packages should consume the operating-layer files instead of duplicating policy.

## First Build Slice

The recommended first implementation slice is:

```text
AI-readable operating layer
→ MCP registry and local profile
→ CLI daily briefing
→ audit log
→ PM Commander task routing
→ desktop read-only Daily Brief view
```

## Development Commands

```bash
pnpm install
pnpm build
pnpm test
pnpm --filter @ai-pm/cli build
pnpm --filter @ai-pm/desktop dev
```

## Agent Safety Rules

- Read `AGENTS.md` before doing work.
- Treat MCP access as read-only unless approval is recorded.
- Do not publish, send, merge, close, or mutate external systems without approval.
- Do not treat old plan files as active if they conflict with the canonical baseline.
- Preserve human changes in the worktree.
