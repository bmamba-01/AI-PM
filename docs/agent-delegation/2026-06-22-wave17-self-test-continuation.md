# Wave-17 Self-Test Continuation — AI-PM Gate G17

## Agent 6 Assignment (Business Development)

**Status**: done  
**Kickoff**: 2026-06-22  
**Deliverable**: AI-PM call narrative + competitor gap map for product narrative section in AI-PM review.

### 1. Differentiated AI-PM Capabilities (3–5)

| # | Capability | Why Differentiated |
|---|-----------|-------------------|
| 1 | **Local-first PM Orchestrator** | Runs on PM laptop, works offline for docs/templates/audit/memory. Competitors (Jira, Monday, Asana, Shortcut) require cloud connectivity and vendor SaaS accounts. |
| 2 | **Project-scoped Agent Delegation Loop** | Every command resolves project_id → creates/binds tracker task → assigns to specialist agent → validates output → returns approval gate. Competitors treat tasks as tickets; AI-PM treats them as agent-contractable work. |
| 3 | **Approval-gated External Mutations** | Email, chat, Jira/Linear/GitHub/Notion updates, PR comments, scope/cost changes are draft-only by default. Competitors auto-write to external systems on save/submit. |
| 4 | **MCP-native Integration Registry** | Consumes existing proven MCP servers (GitHub, Linear, Notion, Slack, Google Workspace, Playwright) instead of rebuilding connectors. Competitors build custom integrations locked to their platform. |
| 5 | **Chat/Mobile Command Gateway** | Same orchestrator reachable through Hermes/Cowork chat or mobile, bounded scoped commands, persistent memory/sessions. Competitors need separate mobile apps and admin console. |

### 2. Call Narrative

> AI-PM is a **personal PM Orchestrator** for technical managers who run 1–2 complex projects. It sits on your laptop, reads your project context (tracker, repo, docs, calendar, memory), and routes bounded work to specialist agents instead of forcing you to switch between Jira, Notion, Gmail, and a dozen dashboards.
>
> **What it does:** Resolves active project, creates tracker-scoped tasks, delegates to agents, validates outputs, writes audit records, and only syncs externally after you approve.
>
> **What it does NOT do:** It is not a generic SaaS project platform. It does not auto-publish reports, auto-assign tickets to teams, or aggregate multi-team enterprise portfolios. It replaces manual PM control work, not collaborative team workflows.
>
> **Versus competitors:**
> - vs **Jira/Linear/Asana**: those are team-ticket systems. AI-PM is a PM command layer that *uses* those trackers for binding but keeps orchestration local.
> - vs **Notion/Airtable**: those are flexible workspace databases. AI-PM is a workflow runtime with approval gates, agent handoff, and audit.
> - vs **Generic AI coding assistants**: those are code-reactive. AI-PM is project-scoped and drives agents ahead of code changes.
>
> **One-line pitch:** *Your PM workstation, automated by agents, not another SaaS tab.*

### 3. Competitor Gap Map

| Competitor | Track Issues | Agent Delegation | Local-first | Approval-gated Sync | Chat/Mobile Control | PM Scope |
|-----------|----------|----------|----------|----------------|----------------|--------|
| **Jira** | ✅ | ❌ (Automation only; no agent loop) | ❌ | ❌ (auto-update) | ❌ | Team |
| **Linear** | ✅ | ❌ | ❌ | ❌ | ❌ | Team |
| **Shortcut** | ✅ | ❌ | ❌ | ❌ | ❌ | Team |
| **Notion** | ⚠️ (manual DB) | ❌ | ❌ | ❌ | ⚠️ (app only) | Workspace |
| **Airtable** | ⚠️ (manual DB) | ❌ | ❌ | ❌ | ⚠️ (app only) | Workspace |
| **Monday.com** | ✅ | ❌ (integrations) | ❌ | ❌ | ⚠️ | Team/Enterprise |
| **Asana** | ✅ | ❌ | ❌ | ❌ | ⚠️ | Team |
| **AI-PM** | ✅ (via tracker bind) | ✅ (orchestrator loop) | ✅ (offline) | ✅ (default) | ✅ (Hermes/chat) | 1–2 projects |

### Output Location
This document is the Agent 6 deliverable for Wave-17 / Gate G17.
