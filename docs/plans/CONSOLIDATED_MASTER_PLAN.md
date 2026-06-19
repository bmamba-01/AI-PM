# AI-PM Toolkit — Consolidated Master Plan

**Repo:** `C:\Works\AI-PM` (synced from `/home/claude/Works/AI-PM/`)  
**Created:** 2026-06-17  
**Target:** Desktop (Electron/Windows+Mac), Mobile (React Native iOS/Android), CLI — Offline/Online — All Project Types

---

## Architecture: 4-Layer Stack

```
┌─────────────────────────────────────────────────────────────┐
│  LAYER 4 — SKILL LIBRARIES                                  │
│  66 pm-skills + 38 Triple Diamond skills (pre-installed)   │
│  Hermes skills: pm-core, code-quality, methodology, finance │
└─────────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────────┐
│  LAYER 3 — MCP INTEGRATIONS (9+ servers)                   │
│  Jira/Linear · Slack/Teams · GitHub/GitLab · Google        │
│  Calendar · Gmail · Drive · Notion · Filesystem · Browser  │
│  ✓ Gmail + Cal + Drive already working via @dguido/google-workspace-mcp
└─────────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────────┐
│  LAYER 2 — AI AGENT ORCHESTRATION                           │
│  Router: Claude (reasoning/docs) · GPT-4o (code review)    │
│  Gemini (multimodal) · Ollama (offline/local)               │
│  Protocol: MCP standard · Quality gates · Agent pool       │
└─────────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────────┐
│  LAYER 1 — CORE PLATFORM                                    │
│  Desktop: Electron + React (Windows/Mac)                   │
│  Mobile: React Native (iOS/Android)                        │
│  Local DB: SQLite (offline-first) + CRDT sync              │
│  Local LLM: Ollama integration for offline mode            │
└─────────────────────────────────────────────────────────────┘
```

---

## 5 Core Modules

| Module | Name | Key Features |
|--------|------|--------------|
| **M1** | **Daily Ops** | Morning briefing (mail+task+risk), Email triage AI draft, EOD status auto-gen |
| **M2** | **Meeting Intelligence** | AI agenda prep → Live transcribe (Whisper) → Action items → Jira sync → Auto MoM |
| **M3** | **Project Control** | Scope tracker + WBS, Gantt + AI replanning, Risk register predict, Budget burn (T&M + Fixed) |
| **M4** | **Code Quality Guard** | PR review (complexity/smell), Test coverage gap, BRD/spec compliance, Supervise Cursor/Cline/Codex |
| **M5** | **Role Playbooks** | 6 roles (PM, Tech Lead, Dev, QA, BA, Stakeholder) with independent AI workflows + PM oversight |

---

## 4-Phase Roadmap (~10 Weeks)

| Phase | Weeks | Focus | Deliverables |
|-------|-------|-------|--------------|
| **1** | 2 | Core Platform + MCP + Skill Loader | Electron skeleton, 9 MCP connected, skill registry |
| **2** | 3 | Daily Ops + Meeting Intelligence | Morning brief, email AI, auto MoM, Whisper transcribe |
| **3** | 3 | Code Quality Guard + Role Playbooks | PR agent, BRD checker, 6 role workflows |
| **4** | 2 | Methodology Adapters + Polish + Mobile | Scrum/Waterfall/Hybrid, mobile app, release |

---

## Immediate Next Steps (Phase 1 — Week 1)

1. **Create project structure** in `C:\Works\AI-PM` (monorepo: packages/core, agents, mcp, ui, cli, mobile)
2. **Setup `package.json` + Electron + React boilerplate** (TypeScript, Vite, pnpm workspaces)
3. **Write MCP connector wrappers** — start with Gmail + Google Calendar (already working via `@dguido/google-workspace-mcp`)
4. **Create skill loader** — map 66 pm-skills + 38 Triple Diamond skills into context engine

---

## Merger Notes: User Requirements + Claude Plans

| User Requirement | Existing Plan Coverage | Action |
|------------------|------------------------|--------|
| Electron + React Native (not Hermes Ink) | Phase 5 had Hermes Ink | ✅ Switch to Electron + React Native |
| Ollama for offline LLM | Phase 1 mentioned local LLM | ✅ Add Ollama integration |
| Whisper for meeting transcribe | Phase 4 had meeting assistant | ✅ Add Whisper.cpp integration |
| 9 specific MCP servers | Phase 2 had 12 MCP | ✅ Align to 9 priority |
| 66 + 38 pre-installed skills | Phase 0 had custom skills | ✅ Load existing, not rewrite |
| Code Quality Guard supervising agentic coders | Phase 3 Code Quality Governor | ✅ Enhance with BRD compliance check |
| T&M + Fixed Cost budget | Phase 6 Finance | ✅ Keep |
| Scrum/Waterfall/Hybrid | Phase 4 Methodology | ✅ Keep |
| Role playbooks (6 roles) | Phase 4 Role Agents | ✅ Align to 6 specific roles |

---

## Consolidated Task Breakdown

### Phase 1: Foundation (2 weeks) — **Automated Plug-and-Play Architecture**

| Task | Description | Files |
|------|-------------|-------|
| 1.1 | Monorepo init: pnpm workspaces, TypeScript, ESLint, Prettier | `package.json`, `pnpm-workspace.yaml`, `tsconfig.base.json` |
| 1.2 | Electron + React desktop app skeleton (Vite, Tailwind) | `packages/desktop/` |
| 1.3 | React Native + Expo mobile app skeleton | `packages/mobile/` |
| 1.4 | SQLite + Drizzle ORM schema (offline-first) + **auto-migration** | `packages/core/src/db/` |
| 1.5 | CRDT sync engine (Yjs or Automerge) + **auto-reconnect** | `packages/core/src/sync/` |
| 1.6 | Ollama client + model manager (offline LLM) | `packages/core/src/llm/ollama.ts` |
| 1.7 | MCP registry + 9 connector wrappers + **health-check auto-retry** | `packages/mcp/` |
| 1.8 | Skill loader: pm-skills (66) + Triple Diamond (38) + **dynamic registry** | `packages/core/src/skills/loader.ts` |
| 1.9 | Hermes config for desktop plugin (optional) | `hermes-config/` |
| **1.10** | **CLI automation: `ai-pm init` — fully automated project setup** | `packages/cli/src/commands/init.ts` |
| **1.11** | **Agent orchestration framework: role auto-discovery & composition** | `packages/agents/orchestrator/` |
| **1.12** | **Methodology engine: auto-initialize Scrum/Kanban/Hybrid** | `packages/core/src/methodology/engine.ts` |
| **1.13** | **Sync state machine: automated conflict resolution & offline queue** | `packages/core/src/sync/state-machine.ts` |
| **1.14** | **Security vault: encrypted secrets + audit log auto-setup** | `packages/core/src/security/vault.ts` |
| **1.15** | **Shared plugin interfaces: zero-config third-party integration** | `packages/shared/src/interfaces/` |

### 🎯 Plug-and-Play Automation Targets (New)

| Target | Automation Level | Validation |
|--------|------------------|------------|
| Project bootstrap | `ai-pm init <name>` → full scaffold + MCP + skills + agents | < 2 min end-to-end |
| Role assignment | Auto-detect project type → assign PM/BA/Dev/QA/Stakeholder agents | Zero manual config |
| Methodology switch | `ai-pm methodology set <type>` → rebuild artifacts + workflows | Hot-swap < 5s |
| Offline→Online sync | Auto-detect connectivity → queue → flush with CRDT merge | Transparent |
| MCP reconnection | Health check every 30s → exponential backoff → auto-reconnect | 99.9% uptime |
| Skill hot-reload | File watcher → reload registry → notify agents | No restart needed |

### Phase 2: Daily Ops + Meeting Intelligence (3 weeks)

| Task | Description |
|------|-------------|
| 2.1 | Morning briefing agent: Gmail + Calendar + Tasks + Risks → digest |
| 2.2 | Email triage: categorize, draft replies, create tasks |
| 2.3 | EOD status generator: accomplishments, blockers, next day |
| 2.4 | Meeting prep: agenda from calendar + context docs |
| 2.5 | Whisper.cpp integration: live transcribe → segments |
| 2.6 | Action item extractor: LLM + pattern matching |
| 2.7 | Jira/Linear sync: push action items as issues |
| 2.8 | MoM generator: template + transcript + decisions + owners |

### Phase 3: Code Quality Guard + Role Playbooks (3 weeks)

| Task | Description |
|------|-------------|
| 3.1 | PR Review Agent: complexity, smells, security, deps |
| 3.2 | Test Coverage Gap Agent: map tests → BRD requirements |
| 3.3 | BRD/Spec Compliance Agent: semantic diff code vs acceptance criteria |
| 3.4 | Agentic Coder Supervisor: watch Cursor/Cline/Codex output, enforce gates |
| 3.5 | Quality Gate Pipeline: pre-commit → pre-push → pre-merge → post-deploy |
| 3.6 | Role: PM workflow (planning, tracking, reporting) |
| 3.7 | Role: Tech Lead workflow (arch review, tech debt, standards) |
| 3.8 | Role: Dev workflow (code gen, test gen, refactor, PR) |
| 3.9 | Role: QA workflow (test plan, exploratory, automation, bug triage) |
| 3.10 | Role: BA workflow (req analysis, AC, traceability) |
| 3.11 | Role: Stakeholder workflow (dashboard, approvals, comms) |

### Phase 4: Methodology + Polish + Mobile (2 weeks)

| Task | Description |
|------|-------------|
| 4.1 | Methodology Engine: Scrum / Waterfall / Hybrid adapters |
| 4.2 | Phase-gate (Waterfall) + Sprint cycle (Scrum) + Flow (Kanban) |
| 4.3 | Artifact templates: Charter, Backlog, Sprint Backlog, Increment |
| 4.4 | Desktop app polish: all views, offline indicator, sync status |
| 4.5 | Mobile app: 6 screens (Dashboard, Tasks, Approvals, Chat, Reports, Settings) |
| 4.6 | CLI tool: `ai-pm` with all core commands |
| 4.7 | Security: encryption, audit log, secrets vault |
| 4.8 | Tests: unit >90%, integration, e2e (Playwright/Detox) |
| 4.9 | Docs: user guide, admin guide, dev guide, API |
| 4.10 | Release: Electron builder, EAS mobile, npm CLI, auto-update |

---

## Success Criteria

- [ ] **Desktop**: Electron app runs Windows/Mac, offline-first, sync on reconnect
- [ ] **Mobile**: iOS/Android via Expo, push notifications, biometric auth
- [ ] **MCP**: 9 servers connected, health checks, auto-reconnect
- [ ] **Skills**: 104 skills loaded, searchable, composable
- [ ] **Daily Ops**: Morning brief <5s, email triage >90% accuracy, MoM <30s
- [ ] **Code Guard**: Catches 95%+ issues, BRD compliance >90%, supervises 3+ coding agents
- [ ] **Roles**: 6 playbooks executable independently
- [ ] **Methodology**: Switchable at project level, compliant artifacts
- [ ] **Tests**: CI green, coverage thresholds met
- [ ] **Release**: Signed installers, auto-update, app store ready

---

## Current Implementation Status

### ✅ Implemented / In Place
- Monorepo workspace structure already exists under `packages/core`, `packages/agents`, `packages/mcp`, `packages/desktop`, `packages/mobile`, `packages/cli`, `packages/shared`.
- Desktop package skeleton is present: Electron + React + Vite + Tailwind config.
- CLI package has `packages/cli/src/commands/init.ts` for `ai-pm init`.
- Master plan updated with plug-and-play automation targets: CLI automation, agent orchestration, methodology engine, sync state machine, security vault, shared plugin interfaces.

### 🚧 Needs Implementation
- Fix and validate `ai-pm init` end-to-end.
- Add Electron preload + main-process wiring for desktop dev/prod.
- Implement mobile/Expo skeleton.
- Implement core automation modules: DB migration, CRDT sync, methodology engine, security vault, MCP wrappers, skill loader, agent orchestrator.
- Add automated test suite and CI smoke tests.

### 🔜 Next Execution Priority
1. Make `ai-pm init <project>` create a working scaffold and pass smoke test.
2. Wire desktop Electron + React app and run dev build.
3. Implement Phase 1 core automation modules.
4. Add mobile skeleton and methodology/agent orchestration.

---

## Ready to Execute

**Next: Phase 1 Task 1.10 — Validate and complete `ai-pm init` automation.**