# Discord Server Setup Guide — AI-PM Toolkit

**Date:** 2026-06-21
**Status:** Design draft
**Audience:** PM users setting up Discord integration via Hermes Agent Bot
**References:** `docs/product/approval-queue-ux.md`, `docs/architecture/chat-command-gateway.md`, `packages/server/src/routes/chatGateway.ts`

## 1. Architecture Overview

```text
Discord Server (AI-PM Managed)
├── #general (PM + team coordination)
├── #daily-report (Daily briefing output channel)
├── #weekly-report (Weekly report drafts + approvals)
├── #approvals (Approval queue notifications + decisions)
├── #agent-pm (PM Commander Hermes Bot)
├── #agent-qa (QA Hermes Bot)
├── #agent-dev (Developer Hermes Bot)
├── #agent-risk (Risk Hermes Bot)
├── #agent-reporting (Reporting Hermes Bot)
├── #agent-code-quality (Code Quality Hermes Bot)
└── #agent-ops (DevOps Hermes Bot)
```

### Design Principles

1. **One channel per agent role.** Each Hermes Bot connects to a dedicated channel. The bot only reads messages in its assigned channel and responds with role-appropriate actions.
2. **Separation of concerns.** Output channels (#daily-report, #weekly-report, #approvals) receive results. Agent channels (#agent-*) receive commands and proposals.
3. **Approval-gated mutations.** No bot can send messages, create issues, or publish reports without going through the approval queue.
4. **Multi-bot per channel.** For collaboration channels (#general), multiple Hermes Bots can be added to provide cross-role visibility.

## 2. Discord Server Template

### Channel Structure

| Channel | Purpose | Bots | Access |
|---------|---------|------|--------|
| `#general` | PM coordination, cross-role discussion | All Hermes Bots | Everyone |
| `#daily-report` | Daily briefing output (read-only from bots) | None (output only) | Everyone |
| `#weekly-report` | Weekly report drafts + review | None (output only) | Everyone |
| `#approvals` | Approval queue notifications | PM Bot (posts) | Everyone |
| `#agent-pm` | PM Commander commands + queries | PM Hermes Bot | PM + Admin |
| `#agent-qa` | QA review requests + test results | QA Hermes Bot | QA + PM |
| `#agent-dev` | Dev tasks + code quality requests | Developer Hermes Bot | Dev + PM |
| `#agent-risk` | Risk monitoring + escalation | Risk Hermes Bot | Risk + PM |
| `#agent-reporting` | Report generation requests | Reporting Hermes Bot | PM |
| `#agent-code-quality` | Code review + PR analysis | Code Quality Hermes Bot | Dev + PM |
| `#agent-ops` | DevOps + release readiness | DevOps Hermes Bot | DevOps + PM |

### Roles (Discord Roles)

| Role | Color | Access |
|------|-------|--------|
| PM | Blue | All channels, approval authority |
| Developer | Green | #agent-dev, #agent-code-quality, #general |
| QA | Yellow | #agent-qa, #general |
| Risk Manager | Red | #agent-risk, #general |
| DevOps | Purple | #agent-ops, #general |
| Stakeholder | Gray | #general, #daily-report, #weekly-report |

## 3. Hermes Bot Configuration

### Per-Agent Bot Setup

Each Hermes Bot connects to its assigned channel with a specific identity:

```yaml
# .ai-pm/discord/agents/pm.yaml
agent_id: pm-commander
role: pm_commander
channel: "#agent-pm"
display_name: "PM Commander"
capabilities:
  - query_daily_brief
  - query_pending_approvals
  - query_risks
  - create_approval_item
  - delegate_task
approval_required_for:
  - send_message_to_general
  - create_jira_issue
  - publish_report
  - update_confluence

# .ai-pm/discord/agents/qa.yaml
agent_id: qa-reviewer
role: qa
channel: "#agent-qa"
display_name: "QA Reviewer"
capabilities:
  - query_test_results
  - query_code_coverage
  - create_approval_item
approval_required_for:
  - approve_pr
  - merge_pr
  - send_message_to_general

# .ai-pm/discord/agents/dev.yaml
agent_id: developer
role: developer
channel: "#agent-dev"
display_name: "Developer Agent"
capabilities:
  - query_codebase
  - query_build_status
  - create_approval_item
approval_required_for:
  - comment_on_pr
  - update_github_issue
  - send_message_to_general

# .ai-pm/discord/agents/risk.yaml
agent_id: risk-monitor
role: risk
channel: "#agent-risk"
display_name: "Risk Monitor"
capabilities:
  - query_risk_register
  - query_blockers
  - create_approval_item
approval_required_for:
  - update_risk_register
  - escalate_to_stakeholder

# .ai-pm/discord/agents/reporting.yaml
agent_id: reporter
role: reporting
channel: "#agent-reporting"
display_name: "Report Generator"
capabilities:
  - query_weekly_report
  - query_daily_brief
  - create_approval_item
approval_required_for:
  - publish_report
  - send_email
  - update_confluence

# .ai-pm/discord/agents/code-quality.yaml
agent_id: code-reviewer
role: code_quality_guard
channel: "#agent-code-quality"
display_name: "Code Quality Guard"
capabilities:
  - query_code_review
  - query_test_coverage
  - create_approval_item
approval_required_for:
  - approve_pr
  - merge_pr
  - comment_on_pr

# .ai-pm/discord/agents/ops.yaml
agent_id: devops-agent
role: delivery_control
channel: "#agent-ops"
display_name: "DevOps Agent"
capabilities:
  - query_release_readiness
  - query_ci_status
  - create_approval_item
approval_required_for:
  - deploy
  - rollback
  - update_infrastructure
```

## 4. Hermes Agent Bot Integration

### How Multiple Bots Work in One Server

```
Discord Server
├── #agent-pm ──→ Hermes Bot (PM identity)
│                  ├── Reads: @PM_Commander mentions, commands
│                  ├── Writes: approval items, task delegation
│                  └── Forwards: daily briefs, risk alerts
├── #agent-qa ──→ Hermes Bot (QA identity)
│                  ├── Reads: @QA_Reviewer mentions, PR links
│                  ├── Writes: test results, approval items
│                  └── Forwards: coverage reports
├── #agent-dev ──→ Hermes Bot (Dev identity)
│                  ├── Reads: @Developer_Agent mentions, issue links
│                  ├── Writes: code queries, approval items
│                  └── Forwards: build status, PR updates
└── #general ──→ All bots (cross-role visibility)
                    ├── PM Bot: coordination messages
                    ├── QA Bot: review notifications
                    └── Dev Bot: status updates
```

### Multi-Bot Per Channel Pattern

For `#general` and collaboration channels, add multiple Hermes Bots:

```yaml
# .ai-pm/discord/server.yaml
server_id: "YOUR_SERVER_ID"
channels:
  general:
    bots:
      - agent_id: pm-commander
        permissions: ["read", "write"]
      - agent_id: qa-reviewer
        permissions: ["read"]
      - agent_id: developer
        permissions: ["read"]
  agent-pm:
    bots:
      - agent_id: pm-commander
        permissions: ["read", "write"]
        is_primary: true
  agent-qa:
    bots:
      - agent_id: qa-reviewer
        permissions: ["read", "write"]
        is_primary: true
```

## 5. Project Setup Flow

### After `ai-pm init`

When the PM runs `ai-pm init` with `--channel discord --adapter hermes`, the toolkit generates:

```
.ai-pm/discord/
├── server.yaml          # Server config, channels, bot assignments
├── agents/
│   ├── pm.yaml          # PM Commander bot config
│   ├── qa.yaml          # QA Reviewer bot config
│   ├── dev.yaml         # Developer bot config
│   ├── risk.yaml        # Risk Monitor bot config
│   ├── reporting.yaml   # Report Generator bot config
│   ├── code-quality.yaml # Code Quality Guard bot config
│   └── ops.yaml         # DevOps Agent bot config
├── channels/
│   ├── daily-report.yaml   # Output channel config
│   ├── weekly-report.yaml  # Output channel config
│   ├── approvals.yaml       # Approval notifications config
│   └── general.yaml         # Cross-role channel config
└── setup-instructions.md    # Step-by-step Discord server creation
```

### Setup Instructions Output

```bash
# After ai-pm init with Discord:
$ ai-pm init MyProject --channel discord --adapter hermes --json

✓ Created .ai-pm/discord/ with 7 agent configs and 4 channel configs

📋 Discord Server Setup Instructions:
1. Create a new Discord server (or use existing)
2. Create channels: #daily-report, #weekly-report, #approvals, #general,
   #agent-pm, #agent-qa, #agent-dev, #agent-risk, #agent-reporting,
   #agent-code-quality, #agent-ops
3. Create roles: PM (blue), Developer (green), QA (yellow), Risk Manager (red),
   DevOps (purple), Stakeholder (gray)
4. Add Hermes Agent Bot to each agent channel:
   - #agent-pm: Add PM Commander bot
   - #agent-qa: Add QA Reviewer bot
   - #agent-dev: Add Developer Agent bot
   - #agent-risk: Add Risk Monitor bot
   - #agent-reporting: Add Report Generator bot
   - #agent-code-quality: Add Code Quality Guard bot
   - #agent-ops: Add DevOps Agent bot
5. Add all bots to #general for cross-role visibility
6. Configure bot tokens in .env or ai-pm config:
   $ ai-pm setup discord --server-id YOUR_SERVER_ID --token BOT_TOKEN

📁 Config files generated:
   .ai-pm/discord/server.yaml
   .ai-pm/discord/agents/ (7 agent configs)
   .ai-pm/discord/channels/ (4 channel configs)
```

## 6. Hermes Bot Assignment Rules

### Channel-to-Bot Mapping

| Channel | Primary Bot | Secondary Bots | Action Trigger |
|---------|-------------|----------------|----------------|
| `#agent-pm` | PM Commander | — | @PM_Commander or `/pm` |
| `#agent-qa` | QA Reviewer | — | @QA_Reviewer or `/qa` |
| `#agent-dev` | Developer Agent | — | @Developer_Agent or `/dev` |
| `#agent-risk` | Risk Monitor | — | @Risk_Monitor or `/risk` |
| `#agent-reporting` | Report Generator | — | @Report_Generator or `/report` |
| `#agent-code-quality` | Code Quality Guard | — | @Code_Reviewer or `/review` |
| `#agent-ops` | DevOps Agent | — | @DevOps_Agent or `/ops` |
| `#general` | PM Commander | All others (read) | Cross-role coordination |
| `#daily-report` | — | All (read-only) | Output channel |
| `#weekly-report` | — | All (read-only) | Output channel |
| `#approvals` | PM Commander | All (notifications) | Approval queue updates |

### Role-Based Command Routing

```yaml
# .ai-pm/discord/command-routing.yaml
routing:
  - pattern: "/pm.*"
    agent: pm-commander
    channel: "#agent-pm"
    fallback: "#general"

  - pattern: "/qa.*"
    agent: qa-reviewer
    channel: "#agent-qa"
    fallback: "#general"

  - pattern: "/dev.*"
    agent: developer
    channel: "#agent-dev"
    fallback: "#general"

  - pattern: "/risk.*"
    agent: risk-monitor
    channel: "#agent-risk"
    fallback: "#general"

  - pattern: "/report.*"
    agent: reporter
    channel: "#agent-reporting"
    fallback: "#general"

  - pattern: "/review.*"
    agent: code-reviewer
    channel: "#agent-code-quality"
    fallback: "#general"

  - pattern: "/ops.*"
    agent: devops-agent
    channel: "#agent-ops"
    fallback: "#general"

  # Cross-role commands
  - pattern: "/daily"
    agent: reporter
    channel: "#agent-reporting"
    output: "#daily-report"

  - pattern: "/weekly"
    agent: reporter
    channel: "#agent-reporting"
    output: "#weekly-report"

  - pattern: "/approval.*"
    agent: pm-commander
    channel: "#approvals"
```

## 7. Output Channel Rules

| Channel | Content | Who Posts | Frequency |
|---------|---------|-----------|-----------|
| `#daily-report` | Daily briefing summary | PM Commander Bot (auto) | Daily 8:00 AM |
| `#weekly-report` | Weekly status draft | Report Generator Bot (on request) | Weekly / manual |
| `#approvals` | Approval notifications | PM Commander Bot | Real-time |
| `#general` | Cross-role updates | All bots (limited) | As needed |

### Auto-Post Rules

- **Daily briefing:** PM Commander Bot posts to `#daily-report` every morning after `ai-pm daily brief` completes.
- **Approval notifications:** When an approval item is created, PM Commander Bot posts to `#approvals` with details.
- **No auto-post for mutations:** Bots never auto-send messages to external channels without approval.

## 8. CLI Commands for Discord Setup

```bash
# Setup Discord integration
ai-pm setup discord --server-id SERVER_ID --token BOT_TOKEN

# Verify Discord connection
ai-pm setup discord --verify

# List configured agents
ai-pm setup discord --list-agents

# Generate bot invite links
ai-pm setup discord --invite

# Test agent connection
ai-pm setup discord --test --agent pm-commander
```

---

## 9. One-PM Self-Test Profile

For small projects where one PM handles all roles, use the one-PM profile variant.

### Profile Location

```
.ai-pm/discord/one-pm-profile.yaml
```

### Channel Structure (One-PM)

```text
Discord Server (One-PM)
├── #agent-pm          → Hermes Bot (PM identity)
├── #daily-report      → Daily briefing output
├── #weekly-report     → Weekly status output
└── #approvals         → Approval notifications
```

### Key Differences from Multi-Bot Template

| Aspect | Multi-Bot | One-PM |
|--------|-----------|--------|
| Channels | 10+ (#agent-pm, #agent-qa, #agent-dev, ...) | 4 (#agent-pm, #daily-report, #weekly-report, #approvals) |
| Roles | PM, Developer, QA, Risk, DevOps, Stakeholder | PM only |
| Bots | 7+ Hermes bots | 1 Hermes bot |
| Read-only commands | Per-role | All commands available to PM |
| Mutations | Per-role approval gates | All mutations → PM approval |

### One-PM Channel Config

```yaml
channels:
  "#agent-pm":
    purpose: "PM queries and commands via Hermes bot"
    bot: pm-commander
    permissions: ["read", "write"]
    read_commands:
      - daily_brief
      - weekly_status
      - risk_summary
      - pending_approvals
      - project_scan
    mutation_commands:
      - create_task
      - publish_report
      - send_email

  "#daily-report":
    purpose: "Daily briefing output (read-only)"
    bot: none
    permissions: ["read"]
    auto_post: daily_brief

  "#weekly-report":
    purpose: "Weekly status output (read-only)"
    bot: none
    permissions: ["read"]
    auto_post: weekly_status

  "#approvals":
    purpose: "Approval queue notifications"
    bot: pm-commander
    permissions: ["read"]
    auto_post: approval_items
```

### One-PM Safety Model

All commands are project-scoped to the active project profile:

| Command Type | Behavior | External System Impact |
|---|---|---|
| Read-only (daily_brief, weekly_status, ...) | Query project memory | None — local data only |
| Mutation (create_task, publish_report, ...) | Create approval proposal | None — awaiting PM approval |

**What NEVER happens from one-PM Discord:**
- No email sent
- No Jira/Linear/GitHub issue created
- No PR merged
- No report published
- No external system updated
- No Discord messages sent to external channels

### Verification

```bash
# Server tests
corepack pnpm@9.4.0 --filter @ai-pm/server test -- src/chat/hermesAdapter.test.ts src/routes/chatGateway.integration.test.ts

# Server build
corepack pnpm@9.4.0 --filter @ai-pm/server build
```
