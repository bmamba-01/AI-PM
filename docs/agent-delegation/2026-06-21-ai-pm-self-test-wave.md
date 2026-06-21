# AI-PM Self-Test Wave Assignment

> Status: active delegation set  
> Created: 2026-06-21  
> Target project: `examples/ai-pm-tm-test-project`  
> Target completion date: 2026-06-28  
> Business case: use AI-PM Toolkit to manage AI-PM itself as a one-PM T&M project, with Discord/Hermes as the chat gateway and Notion as the issue/feature tracker.

## Required Reading For Every Agent

1. `AGENTS.md`
2. `docs/superpowers/specs/2026-06-18-ai-pm-toolkit-design.md`
3. `docs/superpowers/plans/2026-06-19-pm-orchestrator-master-plan.md`
4. `docs/superpowers/plans/2026-06-19-next-runtime-functions.md`
5. `examples/ai-pm-tm-test-project/AGENTS.md`
6. `examples/ai-pm-tm-test-project/.ai-pm/profile.yaml`
7. `docs/operating-model/subagent-protocol.md`

## Current Verified Baseline

From `examples/ai-pm-tm-test-project`:

```bash
node ..\..\packages\cli\bin\ai-pm.js setup doctor --path . --json
node ..\..\packages\cli\bin\ai-pm.js project scan --json
node ..\..\packages\cli\bin\ai-pm.js project profile validate --json
node ..\..\packages\cli\bin\ai-pm.js memory summary --json
node ..\..\packages\cli\bin\ai-pm.js daily --json
node ..\..\packages\cli\bin\ai-pm.js mcp doctor --json
```

Known baseline:

- setup doctor score: 100
- project scan score: 100, ready true
- profile validation: valid
- memory tasks: 4 pending
- daily briefing reads `projectId: ai-pm-tm-test`
- MCP doctor JSON is parseable but health is degraded because live Notion/Discord connectors are not configured yet

## Agent 1: CLI Hardening And JSON Regression

**Objective:** Make CLI automation reliable for project self-management.

**Scope:**

- Add regression tests that assert `--json` stdout is parseable for setup, project, memory, daily, MCP, agent route, and adoption commands.
- Consolidate `adopt --defaults` write behavior or make its delegation to `setup repair` explicit in code, tests, and help text.
- Preserve current local-first behavior when external connectors are missing.

**Primary files:**

- `packages/cli/src/commands/*.ts`
- `packages/cli/src/commands/*.test.ts`
- `packages/cli/bin/ai-pm.js`
- `packages/core/src/runtime/projectProfile.ts`
- `packages/core/src/workflows/dailyBriefing.ts`

**Acceptance:**

- JSON commands emit no spinner/status text on stdout.
- Daily briefing uses project profile and memory when present.
- Adopt/setup commands have one clear write path.

**Verification:**

```bash
corepack pnpm@9.4.0 --filter @ai-pm/cli test
corepack pnpm@9.4.0 --filter @ai-pm/cli build
node packages/cli/bin/ai-pm.js mcp doctor --json | node -e "JSON.parse(require('fs').readFileSync(0,'utf8')); console.log('json-ok')"
```

## Agent 2: Desktop Setup Gateway Smoke

**Objective:** Prove desktop first-run/setup flow works interactively without bypassing setup.

**Scope:**

- Run or add a Playwright/Electron smoke for New Project, Adopt Existing Project, and Demo Project.
- Confirm desktop no longer opens `Dashboard (beta)` before a project is initialized or selected.
- Add failure screenshots or notes if the app cannot be launched in the current environment.

**Primary files:**

- `packages/desktop/src/App.tsx`
- `packages/desktop/src/components/setup/`
- `packages/desktop/src/state/project-store.ts`
- `packages/desktop/src/state/setup-store.ts`
- `docs/user/getting-started.md`

**Acceptance:**

- User can reach setup gateway from a clean state.
- New Project and Adopt Existing surface CLI-equivalent commands or actions.
- No renderer imports Node-only APIs.

**Verification:**

```bash
corepack pnpm@9.4.0 --filter @ai-pm/desktop build
corepack pnpm@9.4.0 --filter @ai-pm/desktop test
```

## Agent 3: Discord Hermes Read-Only Gateway

**Objective:** Define and smoke the Discord/Hermes command flow for phone-based project queries.

**Scope:**

- Build or document the first adapter contract for Hermes Agent Bot with Discord as the channel.
- Implement only read-only commands unless approval callback identity and audit are present.
- Map commands to project-scoped toolkit operations: daily brief, pending approvals, memory tasks, project scan, connector health.

**Primary files:**

- `examples/ai-pm-tm-test-project/integrations/discord-hermes.md`
- `docs/user/mobile-chat-guide.md`
- `packages/server/src/`
- `packages/mobile/src/`

**Acceptance:**

- Commands are project-scoped.
- Mutating actions create approval proposals only; they do not send Discord messages or update external systems directly.
- Setup doc includes local laptop server assumptions.

**Verification:**

```bash
corepack pnpm@9.4.0 --filter @ai-pm/server test
corepack pnpm@9.4.0 --filter @ai-pm/server build
```

## Agent 4: Notion Tracking Import And Sync Contract

**Objective:** Make Notion the source tracker for next issues/features without requiring unsafe live mutations.

**Scope:**

- Validate and improve the Notion database schema and `issues.csv` import file.
- Add a dry-run sync contract for creating/updating Notion issues when a Notion MCP/API token is available.
- Document approval-gated live sync, including required environment variables and rollback/audit expectations.

**Primary files:**

- `examples/ai-pm-tm-test-project/integrations/notion/notion-database-schema.md`
- `examples/ai-pm-tm-test-project/integrations/notion/issues.csv`
- `mcp/contracts/`
- `mcp/profiles/`
- `docs/user/mcp-setup-guide.md`

**Acceptance:**

- Current issues/features are importable into Notion as a database.
- Live Notion mutation remains disabled unless explicitly approved.
- Missing Notion connector degrades gracefully and is visible in MCP doctor output.

**Verification:**

```bash
node ..\..\packages\cli\bin\ai-pm.js mcp doctor --json
node ..\..\packages\cli\bin\ai-pm.js project profile validate --json
```

Run the commands from `examples/ai-pm-tm-test-project`.

## Agent 5: Workflow Evidence And Reports

**Objective:** Use the self-test project memory/tasks to generate actual PM artifacts.

**Scope:**

- Generate daily and weekly report artifacts from `examples/ai-pm-tm-test-project`.
- Persist report artifacts under `reports/` and register them in memory when supported.
- Ensure report content references project scope, target date 2026-06-28, Notion tracking, Discord/Hermes channel, and current gaps.

**Primary files:**

- `packages/core/src/workflows/weeklyReport.ts`
- `packages/cli/src/commands/weekly.ts`
- `examples/ai-pm-tm-test-project/reports/`
- `examples/ai-pm-tm-test-project/.ai-pm/memory/state.json`

**Acceptance:**

- Reports can be generated locally without external connectors.
- Missing connector data is listed as a degraded source, not a runtime failure.
- Generated artifacts are project-scoped.

**Verification:**

```bash
node ..\..\packages\cli\bin\ai-pm.js daily --format markdown --output reports
node ..\..\packages\cli\bin\ai-pm.js weekly --help
node ..\..\packages\cli\bin\ai-pm.js memory artifacts list --json
```

Run the commands from `examples/ai-pm-tm-test-project`.

## Agent 6: Acceptance Gate And Master Tracker

**Objective:** Keep the self-test project and master plan aligned through final acceptance.

**Scope:**

- Update final green gate and runtime plan with verified self-test status.
- Build an acceptance matrix mapping master plan requirements to evidence files, tests, and current gaps.
- Keep delegated task status synchronized with the Notion import CSV.

**Primary files:**

- `docs/superpowers/plans/final-green-gate.md`
- `docs/superpowers/plans/2026-06-19-next-runtime-functions.md`
- `examples/ai-pm-tm-test-project/plan/milestones.md`
- `examples/ai-pm-tm-test-project/integrations/notion/issues.csv`
- `examples/ai-pm-tm-test-project/reports/`

**Acceptance:**

- Each master-plan area has status: complete, partial, blocked, or not started.
- Every blocked item names the missing connector, runtime capability, or manual setup.
- Final acceptance target remains 2026-06-28.

**Verification:**

```bash
corepack pnpm@9.4.0 -r run build
corepack pnpm@9.4.0 -r run test
node schemas/validate-fixtures.mjs
# Run the standard unresolved-marker scan from the master plan.
```

## Output Contract

Each agent must report:

- objective handled
- sources inspected
- changes made
- risks or assumptions
- verification performed with command output summary
- next recommended action

No agent may send Discord messages, update Notion, mutate GitHub/Jira/Linear, publish reports, or change scope baselines without an explicit approval item.
