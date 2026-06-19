## Phase 5: Desktop UI (Hermes), Mobile, CLI

### Task 14: Build Hermes Desktop UI
**Objective:** Main PM dashboard in Hermes with project overview, timeline, risks, team, AI agent panel

**Files:**
- Create: `packages/ui/src/app/` (React + Ink for TUI, or Electron/React for GUI)
- Create: `packages/ui/src/components/` (ProjectView, SprintBoard, TimelineGantt, RiskMatrix, TeamView, AgentPanel, ChatInterface)
- Create: `packages/ui/src/hooks/` (useProject, useAgents, useSync, useOffline)
- Create: `packages/ui/src/state/` (Zustand/Redux store with persistence)
- Create: `packages/ui/hermes-plugin/` (Hermes plugin entry point)

**Step 1:** Choose UI framework: Ink (TUI in Hermes) or Electron/React (GUI). Recommend Ink for Hermes-native.
**Step 2:** Project dashboard: health score, burndown, risk heatmap, budget burn, team capacity
**Step 3:** Sprint board: drag-drop, inline AI actions (estimate, split, refine)
**Step 4:** Timeline/Gantt: critical path, dependencies, what-if slider
**Step 5:** Risk matrix: probability × impact, mitigation tracking, Monte Carlo toggle
**Step 6:** Agent panel: running agents, task queue, quality gates, intervene/approve
**Step 7:** Chat interface: conversational PM agent, context-aware, multi-turn
**Step 8:** Offline indicator, sync status, conflict resolution UI
**Step 9:** Verify: all views render, interactions work, offline mode functional

---

### Task 15: Build Mobile Companion (React Native / Expo)
**Objective:** Mobile app for quick actions, notifications, approvals, status checks

**Files:**
- Create: `packages/mobile/` (Expo + React Native)
- Create: `packages/mobile/src/screens/` (Dashboard, MyTasks, Approvals, Notifications, Chat, Reports)
- Create: `packages/mobile/src/services/` (sync, push, offline-queue, biometric-auth)

**Step 1:** Setup Expo with TypeScript, Hermes engine
**Step 2:** Dashboard: project health cards, quick metrics
**Step 3:** My Tasks: assigned, due soon, blocked — with AI actions (update, delegate, split)
**Step 4:** Approvals: PR reviews, scope changes, budget requests — one-tap approve/request-changes
**Step 5:** Notifications: real-time (WebSocket), offline queue, priority channels
**Step 6:** Chat: PM agent conversation, voice input, file/image sharing
**Step 7:** Reports: weekly snapshot, export PDF, share
**Step 8:** Biometric auth, offline-first with background sync
**Step 9:** Verify: iOS/Android builds, push notifications, offline sync

---

### Task 16: Build CLI Tool (ai-pm)
**Objective:** Terminal-first interface for automation, scripting, CI/CD integration

**Files:**
- Create: `packages/cli/src/commands/` (project, sprint, task, risk, agent, sync, report, config)
- Create: `packages/cli/src/lib/` (api-client, output-formatters, config-manager)
- Create: `packages/cli/bin/ai-pm`

**Step 1:** Setup with Commander.js, TypeScript, global install support
**Step 2:** `ai-pm project init|list|switch|status` — project management
**Step 3:** `ai-pm sprint plan|start|review|close` — sprint lifecycle
**Step 4:** `ai-pm task create|assign|estimate|complete|block` — task ops
**Step 5:** `ai-pm risk add|assess|mitigate|report` — risk management
**Step 6:** `ai-pm agent run|list|stop|logs` — agent orchestration
**Step 7:** `ai-pm sync push|pull|status|resolve` — data sync
**Step 8:** `ai-pm report daily|weekly|sprint|executive|export` — reporting
**Step 9:** `ai-pm config set|get|edit|doctor` — configuration
**Step 10:** Shell completions (bash, zsh, fish), man pages
**Step 11:** Verify: all commands work, CI/CD pipeline integration