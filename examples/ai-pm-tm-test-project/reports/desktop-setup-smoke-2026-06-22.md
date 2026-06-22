# Desktop Setup Gateway — Smoke Test Report

**Date:** 2026-06-22
**Agent:** Agent 2 (Desktop Setup Gateway Electron Smoke)
**Status:** Complete with environment limitation noted

## 1. Objective

Prove the desktop setup gateway works in a real app runtime, not only unit tests. Cover New Project, Adopt Existing, and Demo Project paths. Capture CLI-equivalent commands.

## 2. Verification Commands Run

```bash
corepack pnpm@9.4.0 --filter @ai-pm/desktop build   → pass (7.71s)
corepack pnpm@9.4.0 --filter @ai-pm/desktop test     → 9/9 pass
```

## 3. Test Coverage

### 3.1 Setup Store State Machine (`src/state/setup-store.test.ts`)

| Test | What it proves |
|---|---|
| starts at gateway step | Initial state is `'gateway'`, no project selected |
| startNewProject transitions to wizard | `step → 'new_project_wizard'`, `mode → 'new_project'` |
| startAdoptExisting transitions to adopt wizard | `step → 'adopt_wizard'`, `mode → 'adopt_existing'` |
| setSelectedPath updates path | Path state updates correctly |
| reset returns to gateway | Full state reset (step, mode, readiness, error) |
| setStep updates step directly | Direct step control works |
| has sensible defaults | Scrum, software, fixed_cost, Asia/Saigon, offline-local |

### 3.2 App Routing (`src/App.test.tsx`)

| Test | What it proves |
|---|---|
| renders SetupGateway when no project selected | Setup wizard shows "Welcome to AI-PM Toolkit" with 3 options |
| does NOT show Dashboard when no project | No sidebar/project view rendered before initialization |

## 4. CLI-Equivalent Commands

Each setup path in the desktop UI maps to these CLI commands:

### 4.1 New Project

| UI Action | CLI Equivalent |
|---|---|
| SetupGateway → click "New Project" | `ai-pm init <name> --defaults --json` |
| NewProjectWizard → fill form → create | `ai-pm init <name> --methodology scrum --type software --json` |
| After creation → scan | `ai-pm project scan --json` |

**SetupWizard CLI equivalent:** `ai-pm setup repair --path . --json`

### 4.2 Use Existing Project (Adopt)

| UI Action | CLI Equivalent |
|---|---|
| SetupGateway → click "Use Existing Project" | `ai-pm init --adopt <path> --json` |
| AdoptProjectWizard → select folder | `ai-pm project scan --path <folder> --json` |
| Scan → shows readiness score | `ai-pm setup doctor --json` |
| Adopt → write missing files | `ai-pm init --adopt <path> --defaults --json` |

### 4.3 Demo Project

| UI Action | CLI Equivalent |
|---|---|
| SetupGateway → click "Demo Project" | `ai-pm init DemoProject --defaults --json` |
| Creates in-memory project with sample data | `ai-pm daily run --json` (generates sample briefing) |

### 4.4 Post-Setup

| UI Action | CLI Equivalent |
|---|---|
| Dashboard loads after setup | `ai-pm project scan --json` |
| Refresh server status | `ai-pm mcp doctor --json` |

## 5. Electron Smoke Test — Environment Limitation

**Blocker:** This agent runs in a headless environment without a display server (no X11/Wayland). Electron requires a display to launch.

**Evidence:**
- `process.env.DISPLAY` is undefined
- No `xvfb-run` or `xvfb` available
- Electron CLI (`npx electron .`) would fail with: `Error: no display`

**Mitigation:** All setup gateway logic is covered by vitest unit/integration tests that verify:
1. SetupGateway renders when no project is selected (App.test.tsx)
2. Setup store state machine transitions correctly (setup-store.test.ts)
3. No Dashboard is shown before project initialization
4. No Node-only imports exist in renderer code

**Manual verification required:** To fully prove Electron runtime behavior, run on a machine with display:

```bash
# From desktop package
corepack pnpm@9.4.0 --filter @ai-pm/desktop build
cd packages/desktop
node ../../node_modules/.bin/electron .
# → Should show SetupGateway with 3 options
# → Click "Demo Project" → Dashboard loads
# → Close app → reopen → SetupGateway shows again (no project persisted in demo mode)
```

## 6. No Node-only Imports in Renderer

Verified with grep — zero `import ... from 'node:...'` or `require('fs')` or `require('path')` in any `src/**/*.{ts,tsx}` file. All renderer code uses:
- Browser APIs (crypto.randomUUID, window.electronAPI IPC bridge)
- React/Zustand state management
- Tailwind CSS for styling

## 7. Conclusion

| Check | Status |
|---|---|
| Build passes | ✅ |
| Unit tests pass (9/9) | ✅ |
| Setup gateway renders correctly | ✅ (tested) |
| No Dashboard before project init | ✅ (tested) |
| No Node-only imports in renderer | ✅ (verified) |
| CLI-equivalent commands documented | ✅ |
| Electron smoke (full runtime) | ⚠️ Requires display — manual verification recommended |

**Next recommended action:** Manual Electron smoke on a display-equipped machine to close the runtime verification gap.
