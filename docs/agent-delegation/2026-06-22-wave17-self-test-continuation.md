# Wave 17 Self-Test Continuation Assignment

> Status: active delegation set  
> Created: 2026-06-22  
> Target project: `examples/ai-pm-tm-test-project`  
> Target completion date: 2026-06-28  
> Goal: close the remaining self-test gaps after the repo-level build/test gate is green.

## Required Reading For Every Agent

1. `AGENTS.md`
2. `docs/superpowers/specs/2026-06-18-ai-pm-toolkit-design.md`
3. `docs/superpowers/plans/2026-06-19-pm-orchestrator-master-plan.md`
4. `docs/superpowers/plans/2026-06-19-next-runtime-functions.md`
5. `docs/superpowers/plans/final-green-gate.md`
6. `examples/ai-pm-tm-test-project/AGENTS.md`
7. `examples/ai-pm-tm-test-project/.ai-pm/profile.yaml`
8. `docs/operating-model/subagent-protocol.md`

## Verified Baseline

Fresh verification on 2026-06-22:

```bash
corepack pnpm@9.4.0 -r run build
corepack pnpm@9.4.0 -r run test
node schemas/validate-fixtures.mjs
```

Observed results:

- Build: pass
- Tests: pass
- Schema fixtures: 32/32 pass
- Self-test setup doctor: score 100, no blocking findings
- Self-test project scan: score 100, ready true
- Self-test MCP doctor: parseable JSON, degraded because live external connectors are not configured
- Self-test approval queue: 1 pending weekly report approval

## Priority Finding

The pending weekly report approval in `examples/ai-pm-tm-test-project/.ai-pm/approvals.json` has `project_id: local-project`. The active project profile is `project_id: ai-pm-tm-test`. This must be fixed before any external publication or Notion/Discord sync work is considered complete.

## Agent 1: Weekly Project Scope Fix

**Objective:** Make weekly report outputs, approvals, audit records, and memory artifacts resolve the active project profile instead of `local-project`.

**Primary files:**

- `packages/core/src/workflows/weeklyReport.ts`
- `packages/core/src/workflows/weeklyReport.test.ts`
- `packages/core/src/workflows/weeklyReport.integration.test.ts`
- `packages/cli/src/commands/weekly.ts`
- `examples/ai-pm-tm-test-project/.ai-pm/approvals.json`

**Required work:**

- Load `.ai-pm/profile.yaml` when generating weekly reports for a project root.
- Use `profile.project.project_id` for report output, approval items, memory artifacts, and audit references.
- Add a regression test using a temp project profile with `project_id: alpha-weekly`.
- Do not mutate external systems.

**Verification:**

```bash
corepack pnpm@9.4.0 --filter @ai-pm/core test -- src/workflows/weeklyReport.test.ts src/workflows/weeklyReport.integration.test.ts
corepack pnpm@9.4.0 --filter @ai-pm/cli test -- src/commands/weekly.test.ts
node ..\..\packages\cli\bin\ai-pm.js weekly --json
```

Run the last command from `examples/ai-pm-tm-test-project` and confirm no newly generated approval uses `local-project`.

## Agent 2: Desktop Setup Gateway Electron Smoke

**Objective:** Prove the desktop setup gateway works in a real app runtime, not only unit tests.

**Primary files:**

- `packages/desktop/src/App.test.tsx`
- `packages/desktop/src/components/setup/`
- `packages/desktop/src/state/setup-store.ts`
- `docs/user/getting-started.md`
- `examples/ai-pm-tm-test-project/reports/`

**Required work:**

- Add or run a Playwright/Electron smoke for first launch with no selected project.
- Cover New Project, Use Existing Project, and Demo Project paths.
- Capture the CLI-equivalent commands shown or triggered by the UI.
- Write a report under `examples/ai-pm-tm-test-project/reports/desktop-setup-smoke-2026-06-22.md`.

**Verification:**

```bash
corepack pnpm@9.4.0 --filter @ai-pm/desktop build
corepack pnpm@9.4.0 --filter @ai-pm/desktop test
```

If the OS cannot launch Electron in the agent environment, record the exact blocker, command, and screenshot/log evidence in the report.

## Agent 3: Discord/Hermes One-PM Runtime Profile

**Objective:** Convert the Discord/Hermes design into a runnable one-PM self-test profile.

**Primary files:**

- `docs/architecture/discord-setup-guide.md`
- `examples/ai-pm-tm-test-project/integrations/discord-hermes.md`
- `packages/server/src/chat/hermesAdapter.ts`
- `packages/server/src/chat/hermesAdapter.test.ts`
- `packages/server/src/routes/chatGateway.integration.test.ts`

**Required work:**

- Reconcile the multi-agent Discord server template with the self-test project constraint: one PM role.
- Add a minimal one-PM Discord channel/profile variant for `#agent-pm`, `#daily-report`, `#weekly-report`, and `#approvals`.
- Ensure read-only commands return project-scoped data.
- Ensure mutation-like chat intents create approval proposals only.

**Verification:**

```bash
corepack pnpm@9.4.0 --filter @ai-pm/server test -- src/chat/hermesAdapter.test.ts src/routes/chatGateway.integration.test.ts
corepack pnpm@9.4.0 --filter @ai-pm/server build
```

## Agent 4: Notion Tracking Dry-Run Sync

**Objective:** Make Notion tracking actionable without unsafe live mutations.

**Primary files:**

- `examples/ai-pm-tm-test-project/integrations/notion/issues.csv`
- `examples/ai-pm-tm-test-project/integrations/notion/notion-database-schema.md`
- `mcp/contracts/`
- `mcp/profiles/`
- `docs/user/mcp-setup-guide.md`
- `packages/cli/src/commands/`

**Required work:**

- Add a dry-run Notion sync path or documented command contract that maps `issues.csv` rows to Notion database properties.
- Validate required fields: title, type, status, priority, owner, due date, source, acceptance criteria, verification, approval required.
- Keep live updates disabled unless an approval item exists and a Notion MCP/API token is configured.
- Add the weekly project-scope bug to the tracker if Agent 1 has not already closed it.

**Verification:**

```bash
node ..\..\packages\cli\bin\ai-pm.js project profile validate --json
node ..\..\packages\cli\bin\ai-pm.js mcp doctor --json
```

Run from `examples/ai-pm-tm-test-project`. Any dry-run command introduced by this task must also return parseable JSON with `--json`.

## Agent 5: Connector Health And Workflow Evidence Adoption

**Objective:** Make daily/weekly/reporting workflows expose connector health and evidence consistently.

**Primary files:**

- `packages/core/src/orchestrator/contextSnapshot.ts`
- `packages/core/src/workflows/dailyBriefing.ts`
- `packages/core/src/workflows/weeklyReport.ts`
- `packages/core/src/artifacts/`
- `packages/cli/src/commands/daily.ts`
- `packages/cli/src/commands/weekly.ts`

**Required work:**

- Ensure daily and weekly outputs include available and degraded sources from MCP context.
- Ensure reports persist artifact references in memory with project scope.
- Ensure missing external connectors degrade workflow confidence instead of failing local-first runs.
- Update or add tests that exercise a project with Notion/Discord configured but not live-connected.

**Verification:**

```bash
corepack pnpm@9.4.0 --filter @ai-pm/core test -- src/workflows/dailyBriefing.test.ts src/workflows/weeklyReport.test.ts src/orchestrator/contextSnapshot.test.ts
corepack pnpm@9.4.0 --filter @ai-pm/cli test -- src/commands/daily.test.ts src/commands/weekly.test.ts
```

## Agent 6: Final Release Readiness And Tracker Reconciliation

**Objective:** Keep the master plan, final green gate, self-test memory, and Notion import tracker aligned after Agents 1-5 finish.

**Primary files:**

- `docs/superpowers/plans/2026-06-19-pm-orchestrator-master-plan.md`
- `docs/superpowers/plans/2026-06-19-next-runtime-functions.md`
- `docs/superpowers/plans/final-green-gate.md`
- `examples/ai-pm-tm-test-project/.ai-pm/memory/state.json`
- `examples/ai-pm-tm-test-project/integrations/notion/issues.csv`
- `examples/ai-pm-tm-test-project/reports/`

**Required work:**

- Update task statuses from `Partial` to `Done` only when verification evidence exists.
- Add a release-readiness report for the 2026-06-28 target date.
- List every remaining blocker with owner, source file, and verification command.
- Do not mark live Notion or live Discord complete unless an actual live smoke was performed.

**Verification:**

```bash
corepack pnpm@9.4.0 -r run build
corepack pnpm@9.4.0 -r run test
node schemas/validate-fixtures.mjs
```

Also run the standard unresolved-marker scan from the master plan and report whether it has no matches.

## Output Contract

Each agent must report:

- objective handled
- sources inspected
- changes made
- risks or assumptions
- verification performed with command output summary
- next recommended action

No agent may send Discord messages, update Notion, mutate GitHub/Jira/Linear, publish reports, or change scope baselines without an explicit approval item and explicit PM approval.
