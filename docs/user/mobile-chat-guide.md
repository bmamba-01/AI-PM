# Mobile & Chat Guide

Server configuration, offline mode, and approval actions.

## Mobile App

The mobile app connects to the local server running on your laptop.

### Setup

1. Start the desktop app (server starts automatically on port 3847)
2. Open mobile app → Dashboard → "Connect to Server"
3. Enter `http://<your-laptop-ip>:3847`

### Offline Mode

If the server is unreachable, the mobile app falls back to mock data:
- Approval list shows local cache
- Actions are queued for sync when connection is restored
- Status shows "Offline" indicator

### Approval Actions

From the mobile app:
1. Tap an approval item to see details
2. Swipe right → Approve
3. Swipe left → Reject (with reason)
4. Tap "Revision" → Add revision notes
5. Tap "Delegate" → Choose another user

### Create Approval

Tap "+" to create a new approval request:
- Title and description
- Priority (critical/high/medium/low)
- Target system (Jira, GitHub, etc.)
- Summary of changes

## Chat Adapter

The chat adapter allows natural language commands through Hermes/OpenClaw/Telegram/Discord.

### Local Laptop Server Requirement

The chat gateway runs on your **local server** (port 3847). For phone access:
- Same WiFi: use laptop's LAN IP (e.g., `http://192.168.1.100:3847`)
- Remote: use ngrok or similar tunneling
- Security: configure `AI_PM_AUTH_TOKEN` for non-localhost access

Start the server: `ai-pm server start` or launch desktop app (server starts automatically).

### Available Commands

| Intent | Example | Action | Approval Required |
|--------|---------|--------|-------------------|
| `daily_brief` | "Give me the daily brief" | Returns daily brief summary | No |
| `weekly_status` | "What's the weekly status?" | Returns weekly status | No |
| `risk_summary` | "Show me risk summary" | Returns risk signals | No |
| `pending_approvals` | "Any pending approvals?" | Returns pending count | No |
| `create_task` | "Create a task for DB migration" | Creates approval proposal | **Yes** |
| `publish_report` | "Publish the weekly report" | Creates approval proposal | **Yes** |
| `send_email` | "Send email to client" | Creates approval proposal | **Yes** |
| `project_scan` | "Run project scan" | Returns CLI hint | No |

### Chat Actions

Chat cannot directly execute mutations. All write operations go through the approval queue:

1. User sends command via chat
2. Adapter parses intent
3. **Read commands:** adapter queries local server, returns JSON
4. **Mutation commands:** adapter creates approval proposal in queue
5. PM reviews on desktop/mobile/CLI
6. Only approved actions execute

### What NEVER Happens from Chat

- No email sent without approval
- No Jira/Linear/GitHub issue created without approval
- No PR merged without approval
- No report published without approval
- No external system updated without approval

### Token Authentication

Chat connections require a token:

```bash
# Server side
export AI_PM_AUTH_TOKEN=your-secret-token

# Chat client
Authorization: Bearer your-secret-token
```

Localhost connections (desktop) do not require tokens.

### Hermes Adapter (Discord)

The Hermes adapter (`packages/server/src/chat/hermesAdapter.ts`) maps natural language to structured commands:

- Parses intent → command + params
- Read-only commands → local server query
- Mutations → approval queue (no external execution)
- Returns structured JSON for chat formatting

See `examples/ai-pm-tm-test-project/integrations/discord-hermes.md` for setup.

### Troubleshooting

| Issue | Solution |
|---|---|
| "Cannot connect to server" | Run `ai-pm server start` on laptop |
| "Unknown command" | Use: daily brief, weekly status, risk summary, pending approvals |
| "Approval required" | Correct — check approval queue on desktop |
| Phone can't reach laptop | Ensure same network or configure tunnel (ngrok) |
| Commands return empty data | Run `ai-pm setup doctor` to verify project readiness |
