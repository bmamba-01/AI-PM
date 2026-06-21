# Setup Onboarding Gateway Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make AI-PM Toolkit usable from first launch by providing a guided setup gateway for new projects, existing project adoption, one-click defaults, CLI automation, and readiness checks.

**Architecture:** Setup policy belongs in `packages/core` and `packages/cli`. Desktop and mobile consume setup/readiness APIs instead of duplicating project bootstrap logic. The desktop first-run surface is the primary UX, while CLI remains the automation source of truth for agents and repeatable setup.

**Tech Stack:** TypeScript, Commander CLI, Electron IPC, React desktop renderer, React Native mobile companion, local `.ai-pm/` runtime state, existing project scanner and MCP doctor.

---

## Product Requirements

The PM must be able to open the desktop app and immediately choose one of three paths:

1. `New Project`: create a fresh AI-PM project with one-click default settings or step-by-step configuration.
2. `Adopt Existing Project`: select an existing Git/project folder, scan it, add AI-PM operating files without overwriting human files, and verify readiness.
3. `Demo Project`: open a local demo workspace for exploring the UI without contaminating real project data.

Every path must end with a readiness screen that shows:

- project profile status
- memory/audit/approval store status
- templates/artifact catalog status
- MCP profile and connector health
- agent entrypoint status (`AGENTS.md`, `CODEX.md`, `CLAUDE.md`)
- next recommended commands

Setup must be available from both:

- Desktop UI: first-run gateway, setup wizard, repair/re-run setup action, contextual guide dialogs.
- CLI: scriptable commands for new setup, existing project adoption, setup doctor, and setup repair.

No setup step may store secrets in committed files. Connector credentials must use env vars or local ignored files.

## File Structure

- `packages/core/src/setup/setupProfile.ts`: shared setup option model, defaults, validation, and readiness result types.
- `packages/core/src/setup/setupProfile.test.ts`: unit tests for defaults and readiness result shaping.
- `packages/cli/src/commands/init.ts`: extend existing new-project init to share setup defaults and expose `--defaults`, `--methodology`, `--project-type`, `--commercial-model`, and `--connector-profile`.
- `packages/cli/src/commands/adopt.ts`: add existing-project adoption command.
- `packages/cli/src/commands/setup.ts`: add `ai-pm setup doctor` and `ai-pm setup repair`.
- `packages/cli/src/commands/setup.test.ts`: CLI tests for new/adopt/doctor/repair behavior.
- `packages/desktop/main.ts`: expose setup/adopt/doctor/repair through IPC.
- `packages/desktop/preload.ts`: expose typed setup APIs to renderer.
- `packages/desktop/src/state/setup-store.ts`: renderer state for setup gateway.
- `packages/desktop/src/components/setup/SetupGateway.tsx`: first-run route with New/Existing/Demo actions.
- `packages/desktop/src/components/setup/NewProjectWizard.tsx`: one-click defaults and step-by-step setup.
- `packages/desktop/src/components/setup/AdoptProjectWizard.tsx`: folder selection, scan, adoption preview, readiness.
- `packages/desktop/src/components/setup/SetupGuideDialog.tsx`: contextual guide dialog reusable by toolkit tabs.
- `packages/mobile/src/screens/SetupStatusScreen.tsx`: read-only setup/readiness status for mobile.
- `docs/user/getting-started.md`: user guide for desktop and CLI setup.
- `docs/user/setup-existing-project.md`: existing project adoption guide.

## Task 1: Core Setup Contract

**Files:**

- Create: `packages/core/src/setup/setupProfile.ts`
- Create: `packages/core/src/setup/setupProfile.test.ts`
- Modify: `packages/core/src/index.ts`

- [ ] Define `SetupMode`, `SetupOptions`, `SetupReadinessCheck`, and `SetupReadinessResult`.
- [ ] Implement `defaultSetupOptions(mode)` with PM-safe defaults:
  - methodology: `scrum`
  - project_type: `software`
  - commercial_model: `fixed_cost`
  - timezone: `Asia/Saigon`
  - connector_profile: `offline-local`
  - approval policy: all external mutations require approval
- [ ] Implement `summarizeSetupReadiness(checks)` returning score, blocking items, warnings, and next commands.
- [ ] Add unit tests for new project defaults, existing project defaults, and readiness scoring.
- [ ] Export setup contracts from core.

**Verification:**

```bash
corepack pnpm@9.4.0 --filter @ai-pm/core test -- src/setup/setupProfile.test.ts
corepack pnpm@9.4.0 --filter @ai-pm/core build
```

## Task 2: CLI New Project And Existing Project Setup

**Files:**

- Modify: `packages/cli/src/commands/init.ts`
- Create: `packages/cli/src/commands/adopt.ts`
- Create: `packages/cli/src/commands/setup.ts`
- Modify: `packages/cli/src/index.ts`
- Modify: `packages/cli/bin/ai-pm.js`
- Modify: `packages/cli/src/commands/init.test.ts`
- Create: `packages/cli/src/commands/setup.test.ts`

- [ ] Extend `ai-pm init <name>` with `--defaults`, `--methodology`, `--project-type`, `--commercial-model`, `--connector-profile`, and `--json`.
- [ ] Add `ai-pm adopt --path <existingProject> --defaults --json`.
- [ ] Adoption must create only missing AI-PM files and must not overwrite existing `AGENTS.md`, `CODEX.md`, `CLAUDE.md`, `.gitignore`, or `.ai-pm/profile.yaml` unless `--repair` is explicitly passed.
- [ ] Add `ai-pm setup doctor --path <project> --json` combining project scan, profile validation, MCP doctor summary, and setup readiness score.
- [ ] Add `ai-pm setup repair --path <project> --json` to create missing runtime directories and seed empty memory/audit/approval files.
- [ ] Add tests for new project defaults, existing project adoption, overwrite protection, doctor output, and repair output.

**Verification:**

```bash
corepack pnpm@9.4.0 --filter @ai-pm/cli test
node packages/cli/bin/ai-pm.js init DemoPM --defaults --json
node packages/cli/bin/ai-pm.js adopt --path . --defaults --json
node packages/cli/bin/ai-pm.js setup doctor --path . --json
```

## Task 3: Desktop First-Run Gateway

**Files:**

- Modify: `packages/desktop/main.ts`
- Modify: `packages/desktop/preload.ts`
- Modify: `packages/desktop/src/global.d.ts`
- Create: `packages/desktop/src/state/setup-store.ts`
- Create: `packages/desktop/src/components/setup/SetupGateway.tsx`
- Create: `packages/desktop/src/components/setup/NewProjectWizard.tsx`
- Create: `packages/desktop/src/components/setup/AdoptProjectWizard.tsx`
- Modify: `packages/desktop/src/App.tsx`
- Modify: `packages/desktop/src/state/project-store.ts`

- [ ] Replace automatic first-run creation of `Dashboard (beta)` with setup gateway routing.
- [ ] Add `window.electronAPI.setup` methods: `initProject`, `adoptProject`, `setupDoctor`, `setupRepair`, `selectDirectory`.
- [ ] `SetupGateway` must show three primary actions: New Project, Use Existing Project, Demo Project.
- [ ] `NewProjectWizard` must support one-click defaults and step-by-step fields.
- [ ] `AdoptProjectWizard` must show folder scan result before writing files.
- [ ] Completion screen must show readiness score and next actions.
- [ ] Renderer must not import Node modules or core runtime directly.

**Verification:**

```bash
corepack pnpm@9.4.0 --filter @ai-pm/desktop build
```

Manual smoke:

```text
Open desktop app with empty local project store.
Expected: SetupGateway appears instead of Dashboard (beta).
Click New Project with defaults.
Expected: project is created, readiness screen appears, dashboard can open.
Click Use Existing Project in a clean app profile.
Expected: folder scan appears before adoption writes files.
```

## Task 4: Guided Toolkit Dialogs

**Files:**

- Create: `packages/desktop/src/components/setup/SetupGuideDialog.tsx`
- Modify: `packages/desktop/src/components/tabs/DashboardTab.tsx`
- Modify: `packages/desktop/src/components/tabs/McpServersTab.tsx`
- Modify: `packages/desktop/src/components/tabs/CommandCenterTab.tsx`
- Modify: `packages/desktop/src/components/tabs/ReportsTab.tsx`
- Modify: `packages/desktop/src/components/tabs/ApprovalsTab.tsx`

- [ ] Add a reusable guide dialog with: purpose, required setup, current readiness, primary action, CLI equivalent.
- [ ] Add guide entry points to dashboard, MCP servers, command center, reports, and approvals.
- [ ] Guide text must be operational and short; do not add marketing copy.
- [ ] Each dialog must include the CLI equivalent command, for example `ai-pm setup doctor --path <project> --json`.
- [ ] Do not duplicate business logic in UI; read readiness from setup IPC/state.

**Verification:**

```bash
corepack pnpm@9.4.0 --filter @ai-pm/desktop build
```

## Task 5: Mobile Setup Status

**Files:**

- Create: `packages/mobile/src/screens/SetupStatusScreen.tsx`
- Modify: `packages/mobile/src/App.tsx`
- Modify: `packages/mobile/src/state/command-center.ts`

- [ ] Add read-only setup status screen that calls the local server setup/readiness endpoint when available.
- [ ] Show offline message when laptop server is unreachable.
- [ ] Show project name, readiness score, connector status, pending approvals count, and next recommended command.
- [ ] Mobile must not create or adopt projects; setup remains desktop/CLI controlled.

**Verification:**

```bash
corepack pnpm@9.4.0 --filter @ai-pm/mobile build
```

## Task 6: Setup Documentation And E2E Gate

**Files:**

- Create: `docs/user/getting-started.md`
- Create: `docs/user/setup-existing-project.md`
- Modify: `README.md`
- Modify: `packages/cli/src/commands/completion-gate.test.ts`
- Modify: `docs/superpowers/plans/2026-06-19-next-runtime-functions.md`

- [ ] Document desktop first-run setup.
- [ ] Document CLI new project setup.
- [ ] Document existing project adoption and overwrite rules.
- [ ] Document repair flow and setup doctor output.
- [ ] Add completion-gate smoke checks for `init --defaults --json`, `adopt --help`, and `setup doctor --json`.
- [ ] Update runtime plan verification gate after implementation.

**Verification:**

```bash
corepack pnpm@9.4.0 --filter @ai-pm/cli test -- src/commands/completion-gate.test.ts
corepack pnpm@9.4.0 -r run build
corepack pnpm@9.4.0 -r run test
node schemas/validate-fixtures.mjs
```

## Acceptance Criteria

- A first-time desktop user sees setup choices before any dashboard.
- A PM can create a new project with one click using safe defaults.
- A PM can adopt an existing project folder without overwriting human files.
- A PM can run equivalent CLI commands in scripts or from another agent.
- Setup completion gives a readiness score and concrete next commands.
- Toolkit tabs expose contextual guide dialogs with CLI equivalents.
- All setup writes are project-scoped.
- External connector credentials are never committed by setup.
- Desktop, CLI, and mobile builds remain green.
