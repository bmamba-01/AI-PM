# Discord Hermes Agent Bot Setup

## Mode

- Adapter: Hermes Agent Bot
- Runtime server: PM laptop local server
- Channel: Discord
- Permission: read-only by default

## Architecture

```text
User on phone (Discord/Hermes)
  → Hermes adapter (parse intent)
  → Local server API (http://localhost:3847)
  → Chat gateway routes (read-only + approval proposals)
  → Approval queue (PM reviews on desktop)
  → Approved → executed
```

**Assumptions:**
- Local server running: `ai-pm server start` or desktop app
- Phone and laptop on same network, or tunnel (ngrok)
- No cloud backend — all data stays local
- Auth token configured for non-localhost access

## Allowed Read Commands

| Command | Description | Example Phrasing |
|---|---|---|
| `daily_brief` | Today's priorities, blockers, approvals | "Give me the daily brief" |
| `weekly_status` | Past week summary | "What's the weekly status?" |
| `risk_summary` | Failed tasks, stale artifacts | "Show me risk summary" |
| `pending_approvals` | Items awaiting decision | "Any pending approvals?" |
| `project_scan` | Project readiness check | "Run project scan" |

## Approval-Gated Actions (Create Proposal Only)

| Command | What Happens | What Does NOT Happen |
|---|---|---|
| `create_task` | Creates approval item in queue | Does NOT create Jira/Linear issue |
| `publish_report` | Creates approval item in queue | Does NOT send email or publish |
| `send_email` | Creates approval item in queue | Does NOT send any email |

**After a mutation:** Check approval queue on desktop or `ai-pm approval list`.

## Safety Model

- **Read-only operations:** query project memory, read approval queue, list tasks, check risks
- **Mutation operations:** create approval proposal only — never execute directly
- **What NEVER happens from chat:** no email sent, no issue created, no PR merged, no report published — all require PM approval on desktop

## Network Access

| Scenario | Setup |
|---|---|
| Phone on same WiFi | Use laptop LAN IP: `http://192.168.x.x:3847` |
| Remote access | Use ngrok: `ngrok http 3847` |
| Desktop (local) | No auth required, `http://localhost:3847` |

## Auth Token

```bash
# Server side
export AI_PM_AUTH_TOKEN=your-secret-token

# Chat client header:
# Authorization: Bearer your-secret-token
```

Localhost connections (desktop/mobile app) do not require tokens.

## Hermes Adapter

The adapter lives at `packages/server/src/chat/hermesAdapter.ts`:

- **parseIntent()** — maps natural language to structured commands
- **executeIntent()** — routes read-only to server queries, mutations to approval queue
- **No external API calls** — local data only

### Intent Examples

```text
"Give me the daily brief"     → { command: "daily_brief" }
"Create a task for DB migration" → { command: "create_task", text: "..." }
"Publish the weekly report"   → { command: "publish_report" }
```

### Response Format

```json
{
  "intent": { "command": "daily_brief", "params": {} },
  "status": "success | approval_required | error",
  "data": { "message": "...", "hint": "..." },
  "suggestion": "POST /api/approvals/:id/decide ..."
}
```

## Local Test Commands

```bash
# Server health
curl http://localhost:3847/api/health

# Chat gateway
curl -X POST http://localhost:3847/api/chat/query \
  -H 'Content-Type: application/json' \
  -d '{"command": "daily_brief"}'

# CLI equivalents
node ../../packages/cli/bin/ai-pm.js setup doctor --path . --json
node ../../packages/cli/bin/ai-pm.js project scan --json
node ../../packages/cli/bin/ai-pm.js daily --json
node ../../packages/cli/bin/ai-pm.js approval count --json
```

## Network Access

| Scenario | Setup |
|---|---|
| Phone on same WiFi | Use laptop LAN IP: `http://192.168.x.x:3847` |
| Remote access | Use ngrok: `ngrok http 3847` |
| Desktop (local) | No auth required, `http://localhost:3847` |

## Auth Token

```bash
# Server side
export AI_PM_AUTH_TOKEN=your-secret-token

# Chat client header:
# Authorization: Bearer your-secret-token
```

Localhost connections (desktop/mobile app) do not require tokens.

## What NEVER Happens from Chat

- No email sent without approval
- No Jira/Linear/GitHub issue created without approval
- No PR merged without approval
- No report published without approval
- No external system updated without approval

## Known Limitations (First Slice)

- Intent parsing is keyword-based (not NLU)
- Read commands return server API hints (not full data)
- No session state across messages
- No file/image attachment handling
- No multi-turn conversation context

---

## One-PM Self-Test Profile

This project uses a one-PM profile where a single PM role handles all Discord channels.

### Profile

See `.ai-pm/discord/one-pm-profile.yaml`.

### Channels

| Channel | Purpose |
|---|---|
| `#agent-pm` | PM queries and commands |
| `#daily-report` | Daily briefing output |
| `#weekly-report` | Weekly status output |
| `#approvals` | Approval notifications |

### One-PM Safety

- All commands are project-scoped to `ai-pm-tm-test`
- Read-only commands query project memory store
- Mutations (create_task, publish_report, send_email) create approval proposals only
- No external system is contacted without PM approval
- No Discord messages sent to external channels

### Verification

```bash
# Server tests (includes one-PM project-scoped assertions)
corepack pnpm@9.4.0 --filter @ai-pm/server test -- src/chat/hermesAdapter.test.ts src/routes/chatGateway.integration.test.ts

# Server build
corepack pnpm@9.4.0 --filter @ai-pm/server build
```
