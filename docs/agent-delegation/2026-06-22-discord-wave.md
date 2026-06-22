# Discord Integration Wave — 6 Agents

> **Date:** 2026-06-22
> **Status:** Ready for execution
> **Design reference:** `docs/architecture/discord-setup-guide.md`
> **Priority:** High — core PM communication channel

## Architecture Summary

```text
Discord Server
├── #general (all bots, cross-role)
├── #daily-report (output, no bots)
├── #weekly-report (output, no bots)
├── #approvals (PM bot posts)
├── #agent-pm (PM Commander Hermes Bot)
├── #agent-qa (QA Hermes Bot)
├── #agent-dev (Developer Hermes Bot)
├── #agent-risk (Risk Hermes Bot)
├── #agent-reporting (Reporting Hermes Bot)
├── #agent-code-quality (Code Quality Hermes Bot)
└── #agent-ops (DevOps Hermes Bot)
```

Key principle: **One Hermes Bot per agent role, multiple bots per collaboration channel.**

---

## Agent 1 — Discord Adapter Package

**Objective:** Create the Discord adapter that connects Hermes Agent Bot to AI-PM server endpoints.

**Scope:**
- Create: `packages/server/src/chat/discordAdapter.ts`
- Create: `packages/server/src/chat/discordAdapter.test.ts`
- Modify: `packages/server/src/chat/` (register adapter)

**Required behavior:**
- Parse Discord messages into structured intents (query, action_proposal, approval_request)
- Map intents to local server API calls (`/api/chat/query`, `/api/chat/commands`, `/api/approvals`)
- Format responses as Discord embeds (structured cards with fields)
- Support multi-bot identity: each bot instance connects with its agent_id and role
- Handle graceful degradation when server is unreachable
- No direct external mutations — all through approval queue

**Context files:**
1. `docs/architecture/chat-command-gateway.md`
2. `docs/architecture/discord-setup-guide.md`
3. `packages/server/src/routes/chatGateway.ts`

**Verification:** `corepack pnpm@9.4.0 --filter @ai-pm/server test`

---

## Agent 2 — Discord Config Generator

**Objective:** Generate Discord server config files when user runs setup command.

**Scope:**
- Create: `packages/cli/src/commands/discord.ts`
- Create: `packages/cli/src/commands/discord.test.ts`
- Modify: `packages/cli/src/index.ts`
- Modify: `packages/cli/bin/ai-pm.js`

**Required behavior:**
- `ai-pm discord setup` — interactive wizard that generates `.ai-pm/discord/` config
- `ai-pm discord setup --defaults` — non-interactive, generates all 7 agent configs + 4 channel configs
- `ai-pm discord setup --agents pm,qa,dev` — generate only selected agent configs
- `ai-pm discord verify` — test Discord connection and bot status
- `ai-pm discord list-agents` — show configured agents and their channels
- `ai-pm discord invite` — generate bot invite links for each configured agent
- Output config files follow `docs/architecture/discord-setup-guide.md` format

**Context files:**
1. `docs/architecture/discord-setup-guide.md`
2. `packages/cli/src/commands/mcp.ts` (setup pattern reference)
3. `packages/cli/src/commands/init.ts` (config generation pattern)

**Verification:** `corepack pnpm@9.4.0 --filter @ai-pm/cli test`

---

## Agent 3 — Init Discord Integration

**Objective:** Add `--channel discord --adapter hermes` flag to `ai-pm init` that generates Discord config.

**Scope:**
- Modify: `packages/cli/src/commands/init.ts`
- Modify: `packages/cli/src/commands/init.test.ts`

**Required behavior:**
- `ai-pm init MyProject --channel discord --adapter hermes` generates `.ai-pm/discord/` with all agent configs
- Default when `--channel discord` is specified: generate all 7 agent configs
- Print Discord setup instructions after init completes
- Do NOT overwrite existing `.ai-pm/discord/` unless `--repair` is used
- Keep existing init behavior unchanged when no channel flag is provided

**Context files:**
1. `packages/cli/src/commands/init.ts`
2. `docs/architecture/discord-setup-guide.md` (config file format)
3. `examples/ai-pm-tm-test-project/.ai-pm/discord/` (if exists, for reference)

**Verification:** `corepack pnpm@9.4.0 --filter @ai-pm/cli test`

---

## Agent 4 — Discord Output Formatter

**Objective:** Create Discord-specific output formatters for daily briefing, weekly report, and approvals.

**Scope:**
- Create: `packages/server/src/chat/discordFormatter.ts`
- Create: `packages/server/src/chat/discordFormatter.test.ts`

**Required behavior:**
- `formatDailyBriefing(briefing)` → Discord embed with: title, top priorities, blockers, risks, approvals, source coverage, confidence
- `formatWeeklyReport(report)` → Discord embed with: summary, RAG status, decisions needed, next actions
- `formatApprovalNotification(item)` → Discord embed with: title, priority badge, target system, confidence, approve/reject buttons
- `formatApprovalDecision(item)` → Discord embed with: decision result, who decided, when
- All embeds use Discord color scheme: blue=info, green=success, red=error, yellow=warning
- Support `--json` output for debugging

**Context files:**
1. `docs/architecture/discord-setup-guide.md` (channel structure)
2. `packages/core/src/workflows/dailyBriefing.ts` (output shape)
3. `packages/core/src/workflows/weeklyReport.ts` (output shape)
4. `packages/core/src/runtime/approvalQueue.ts` (approval item shape)

**Verification:** `corepack pnpm@9.4.0 --filter @ai-pm/server test`

---

## Agent 5 — Discord Notification Service

**Objective:** Auto-post daily briefings, approval notifications, and weekly reports to Discord channels.

**Scope:**
- Create: `packages/server/src/chat/discordNotifier.ts`
- Create: `packages/server/src/chat/discordNotifier.test.ts`
- Modify: `packages/server/src/routes/chatGateway.ts` (add notification triggers)

**Required behavior:**
- Post daily briefing to `#daily-report` when `ai-pm daily brief` completes
- Post approval notification to `#approvals` when new approval item created
- Post approval decision to `#approvals` when decision made
- Post weekly report draft to `#weekly-report` when generated
- All posts go through approval queue — no auto-mutations
- Support webhook-based posting for simplicity (Discord webhook API)
- Graceful fallback: if Discord unreachable, log locally and queue for retry
- Rate limiting: max 5 messages per minute to avoid Discord rate limits

**Context files:**
1. `docs/architecture/discord-setup-guide.md` (output channels)
2. `packages/server/src/routes/chatGateway.ts` (existing server pattern)
3. `packages/core/src/runtime/approvalQueue.ts` (approval events)

**Verification:** `corepack pnpm@9.4.0 --filter @ai-pm/server test`

---

## Agent 6 — Discord Quickstart Guide + Integration Tests

**Objective:** Write Discord setup documentation and add integration tests.

**Scope:**
- Create: `docs/user/discord-setup-guide.md`
- Create: `packages/server/src/chat/discordIntegration.test.ts`
- Modify: `docs/user/mobile-chat-guide.md` (update Discord references)

**Required behavior:**
- Quickstart guide: step-by-step from `ai-pm init` to working Discord server
- Include: server creation, channel setup, role setup, bot invite, token config
- Include: troubleshooting common issues (bot not responding, rate limits, permissions)
- Integration tests: adapter → server → formatter → notification (mock Discord API)
- Test multi-bot scenario: 3 agents in #general, verify correct routing

**Context files:**
1. `docs/architecture/discord-setup-guide.md`
2. `packages/server/src/chat/` (all adapter/formatter/notifier files)
3. `docs/user/mobile-chat-guide.md`

**Verification:** `corepack pnpm@9.4.0 --filter @ai-pm/server test`

---

## Execution

All 6 tasks are parallel — no dependencies between them.

```
Agent 1: Discord adapter package
Agent 2: Discord config generator CLI
Agent 3: Init Discord integration
Agent 4: Discord output formatter
Agent 5: Discord notification service
Agent 6: Quickstart guide + integration tests
```

## Completion Gate

```bash
corepack pnpm@9.4.0 -r run build
corepack pnpm@9.4.0 -r run test
node packages/cli/bin/ai-pm.js discord --help
node packages/cli/bin/ai-pm.js discord list-agents
```
