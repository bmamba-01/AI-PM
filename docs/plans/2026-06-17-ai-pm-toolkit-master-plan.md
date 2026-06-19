# AI-PM Toolkit Master Implementation Plan

> **For Hermes:** Use subagent-driven-development skill to implement this plan task-by-task.

**Goal:** Build a comprehensive desktop/mobile/offline/online AI-powered Project Management toolkit for tech PMs managing complex, high-stakes projects with full AI automation, agent orchestration, code quality governance, and methodology support (Waterfall/Agile/Scrum, T&M/Fixed Cost).

**Architecture:** Modular monorepo with Hermes Agent as the desktop host, embedding multiple AI agents (coding, research, QA, PM-specific) via MCP servers and native integrations. Local-first with cloud sync. Plugin architecture for extensibility.

**Tech Stack:** Hermes Agent (desktop), TypeScript/React (UI), Python (backend services), SQLite (local DB), MCP protocol (agent integration), Git (version control), various AI providers (OpenRouter, Anthropic, local LLMs).

---

## Phase 0: Foundation & Repository Setup

### Task 1: Initialize Monorepo Structure
**Objective:** Create standard monorepo layout with packages for core, agents, mcp-servers, ui, cli

**Files:**
- Create: `package.json` (root)
- Create: `pnpm-workspace.yaml`
- Create: `packages/core/package.json`
- Create: `packages/agents/package.json`
- Create: `packages/mcp-servers/package.json`
- Create: `packages/ui/package.json`
- Create: `packages/cli/package.json`
- Create: `tsconfig.base.json`
- Create: `.gitignore`
- Create: `README.md` (comprehensive)

**Step 1:** Write root package.json with workspaces config
**Step 2:** Write pnpm-workspace.yaml
**Step 3:** Write each package.json with proper dependencies
**Step 4:** Write tsconfig.base.json with strict settings
**Step 5:** Verify: `pnpm install` succeeds

---

### Task 2: Setup Hermes Agent Integration Config
**Objective:** Configure Hermes as the desktop host with all required MCP servers and skills

**Files:**
- Create: `hermes-config/config.yaml`
- Create: `hermes-config/skills/pm-core/` (custom skills)
- Create: `hermes-config/plugins/`
- Create: `hermes-config/mcp-servers.yaml`

**Step 1:** Write config.yaml with MCP servers for: GitHub, Linear, Google Workspace, File System, Browser, Terminal, Database
**Step 2:** Define custom PM skills: sprint-planning, risk-assessment, timeline-tracking, stakeholder-comms, code-quality-governance
**Step 3:** Verify: `hermes config validate` passes