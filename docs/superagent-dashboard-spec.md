# SuperAgent Dashboard Specification

**Version:** 1.0  
**Author:** Claude (Em)  
**Last Updated:** 2026-06-18  

---

## 1. Overview
The **SuperAgent Dashboard** is an Electron + React desktop application that serves as the central command center for project management. It integrates:

- **Daily Operations** (checklist, deadline highlights, meeting reminders)  
- **AI Agent Coordination** (Claude Cowork, Codex, VS Code Agent, custom agents)  
- **Continuous Memory** (project-level CLAUDE.md, keyword index, context snapshots)  
- **MCP Server Integration** (GitHub, Jira/Linear/Notion, Slack, Google Workspace, etc.)  

The dashboard displays real‑time data pulled exclusively from configured MCP servers. Any server that is not connected does not appear on the UI.

---

## 2. Architecture

```
┌─────────────────────────────────────────────────────┐
│   UI Layer (React)                                  │
│   - DashboardShell                               │
│   - Widgets (Checklist, Deadlines, Meetings, …)   │
│   - Navigation & Settings                        │
│                                                   │
│   Main Process (Electron)                         │
│   - Renderer ↔ Backend bridge                     │
│   - IPC for file operations, IPC messaging        │
│   - Scheduled Tasks (cron‑like)                   │
│   - MCP Router (fetchers, health‑check)           │
│   - AI Agent Adapter Layer                        │
│   - Memory Store (SQLite + CRDT)                 │
└─────────────────────────────────────────────────────┘
```

- **Renderer** runs in a sandboxed Chromium context.  
- **Main process** runs in a separate Node.js process with access to the file system and network.  
- **MCP Router** maintains a registry of enabled connectors; each fetcher validates health before returning data.  
- **AI Agent Adapter** exposes a `window.cowork.callMcpTool(name, args)` API for agents and a `window.cowork.askClaude(prompt, data[])` bridge for quick inference.

---

## 3. Data Flow

1. **Startup** → DashboardShell loads configuration from `project/.superagent/config.json`.  
2. **MCP Router** iterates over the registered connectors, invokes each fetcher once (cached for 30 s).  
3. Fetched data is normalized into a **dashboard payload** and sent via Electron IPC to the renderer.  
4. **Widgets** subscribe to specific payload fields (e.g., `tasks.todo`, `meetings.today`).  
5. **AI Agent Adapter** can request additional context (e.g., recent memory entries) and receive structured JSON responses.

---

## 4. MCP Server Contracts

| Server | Required Tool | Core Data Returned | Example Endpoints |
|--------|---------------|--------------------|-------------------|
| **GitHub** | `mcp__github__fetch_github` | Issues, PRs, repository tree | `/repos/{owner}/{repo}/issues` |
| **Jira** | `mcp__jira__fetch_jira` | Issues, sprints, components | `/search?jql=...` |
| **Notion** | `mcp__notion__fetch_notion` | Pages, databases, comments | `/v1/databases/{id}/query` |
| **Slack** | `mcp__slack__fetch_slack` | Threads, user presence, messages | `/conversations.history` |
| **Google Workspace** | `mcp__gmail__fetch_gmail` | Emails, calendar events, Drive files | `/messages`, `/events` |
| **Linear** | `mcp__linear__fetch_linear` | Issues, projects, workflows | `/issues` |
| **Outlook/Calendar** | `mcp__calendar__fetch_calendar` | Events, attendees, reminders | `/events` |

*All fetchers return `{content: string, structuredContent?: any, isError?: boolean}`.*

---

## 5. AI Agent Integration Layer

### 5.1 Protocol
- **Message Direction:** Agents → Dashboard (read‑only) via `window.cowork.callMcpTool(name, args)`; Dashboard → Agents (optional commands) via `window.cowork.runScheduledTask(taskId)` (user‑initiated).  
- **Context Sharing:** Agents may request memory snapshots via `window.cowork.callMcpTool('memory', {action: 'read', scope: 'project'})`.  
- **Keyword Capture:** Agents listen for user‑spoken or typed keywords (`remind`, `report`, `status`) and trigger appropriate UI updates.  

### 5.2 Supported Agents
- **Claude Cowork** (built‑in)  
- **Codex/App** (external command line)  
- **VS Code Agent** (via `"vscode-agent"` MCP)  
- **Custom AI Agents** registered under `agents/` with a `manifest.json` exposing `fetchMemory`, `executeCommand`.

### 5.3 Memory Access
Agents read/write to the **Continuous Memory Store** using the following schema:

```json
{
  "project_id": "string",
  "version": "semver",
  "entries": [
    {
      "id": "uuid",
      "timestamp": "ISO8601",
      "type": "CLAUDE|SKILL|KEYWORD",
      "content": "string",
      "metadata": { "key": "value" }
    }
  ]
}
```

---

## 6. Continuous Memory System

- **Storage Engine:** SQLite + WAL mode; CRDT replication for offline‑first sync.  
- **Schema** (`memory.db`):
  - `projects` (`id PRIMARY KEY`)  
  - `memory_entries` (`id, project_id, type, content, timestamp, metadata`)  
- **APIs:**
  - `memory.read(scope)` – returns array of entries.  
  - `memory.write(entry)` – inserts or updates.  
- **Versioning:** Each project has a `schema_version` field; upgrades are handled via migration scripts in `packages/core/src/memory/migrate.ts`.

---

## 7. Dashboard Widgets

| Widget | Data Source | Refresh Rate | UI Elements |
|--------|-------------|--------------|-------------|
| **Task Checklist** | `mcp__jira__fetch_jira` / `mcp__linear__fetch_linear` | 5 min | List of open items, assignee, priority, progress bar |
| **Deadline Highlights** | `mcp__calendar__fetch_calendar` | On change | Upcoming deadlines (next 7 days), colored indicators |
| **Meeting Overview** | `mcp__google__fetch_calendar` + `mcp__slack__fetch_slack` | 1 min | Today’s meetings, location/Teams link, agenda snippet |
| **Report Due Reminders** | Configurable rule engine (from `templates/report-schedule.yaml`) | 1 min | Due dates, responsible owner, status |
| **Risk & Issue Tracker** | `mcp__jira__fetch_jira` | 5 min | Open risks, severity, mitigation status |
| **Budget Tracker** | Custom connector (e.g., QuickBooks) | 15 min | Spend vs. forecast, variance chart |
| **AI Agent Status** | Internal health check | Real‑time | List of connected agents, last activity, error count |

All widgets display a **“Not Connected”** badge if the underlying MCP server is unavailable.

---

## 8. Template Library Integration

The dashboard pulls **pm‑skills** templates from the GitHub repository `https://github.com/product-on-purpose/pm-skills`. Integration steps:

1. **Template Registry** (`templates.yaml`) lists available templates with:
   - `id`
   - `name`
   - `category` (e.g., `PRD`, `Retro`, `RiskRegister`)
   - `source_url`
2. **Auto‑Download** on first use → place under `templates/<category>/`.  
3. **Execution** → Each template can be rendered as a markdown/HTML card on the dashboard or exported as PDF/Excel via built‑in converters.  
4. **Version Pinning** → Templates are cached with a SHA hash; updates are prompted by the user.

---

## 9. Bilingual Setup Dialogs (EN/VI)

- **Language Preference** stored in `project/.superagent/lang.json` (`"lang": "en"` or `"vi"`).  
- All UI strings, CLI prompts, and error messages are externalized into `resources/i18n/<lang>.json`.  
- **CLI Wizard** (`ai-pm init`) prompts for language selection and continues in the chosen language.  
- **Dashboard Labels** automatically switch via React i18next with lazy loading of language files.

---

## 10. Project Setup Wizard (`ai-pm init`)

### 10.1 Flow
1. **Prompt** for project name, description, and primary language.  
2. **Create Directory** `projects/<name>/` under workspace.  
3. **Scaffold**:
   - `src/` with TypeScript configs  
   - `templates/` (empty)  
   - `memory/` (initial `memory.db`)  
   - `mcp/` (sample connector configs)  
   - `docs/` with `superagent-dashboard-spec.md`  
4. **Install Dependencies** (`pnpm install`) and **run** `pnpm dev` to start the dashboard in watch mode.  
5. **Auto‑Generate** a default `templates.yaml` with sample pm‑skills templates.  

### 10.2 Output Example
```
[SuperAgent Init] Creating project "my‑product‑launch"...
[✔] Directory created: projects/my-product-launch
[✔] Files written: package.json, tsconfig.json, README.md
[✔] Init complete. Run `pnpm dev` to launch the dashboard.
```

---

## 11. Specification Document Lifecycle

- **Version Control:** Stored in `docs/` and tracked by Git.  
- **Review Cycle:** Every major release (≥ v0.3) triggers a **Specification Review** task.  
- **Update Process:** New features → create corresponding `Task` → update spec → commit.  

---

## 12. Future Extensions (Roadmap)

| Milestone | Feature |
|-----------|---------|
| **v0.4** | Real‑time collaborative editing (Yjs CRDT) on shared docs |
| **v0.5** | Voice‑activated commands via Whisper.cpp integration |
| **v0.6** | Plug‑in marketplace for third‑party MCP connectors |
| **v1.0** | Full‑stack mobile companion (React Native) with offline sync |

---

### Appendices

#### A. Command Reference
| Command | Description |
|---------|-------------|
| `ai-pm daily` | Runs morning briefing, deadline check, report reminder |
| `ai-pm init <name>` | Scaffold a new project |
| `ai-pm connect` | Launch MCP connection wizard |
| `ai-pm agent:run <agentId>` | Execute a registered AI agent |

#### B. Example Memory Entry
```json
{
  "id": "c3f9e2a1-7b4d-4f9c-ae31-9b6d3c1e9f2a",
  "project_id": "my-product-launch",
  "type": "CLAUDE",
  "timestamp": "2026-06-18T08:12:45.123Z",
  "content": "User requested daily status report. All blockers resolved.",
  "metadata": { "author": "Claude", "task": "daily-report" }
}
```

#### C. API Contracts
- **Fetch Payload**: `{content: string, structuredContent?: any}`
- **Error Payload**: `{isError: true, content: string}`
- **Agent Response**: `{text: string, structured?: any, isError?: boolean}`

--- 

*End of Specification*  