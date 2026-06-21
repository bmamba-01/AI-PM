# Setup Verification - 2026-06-21

## Project

- Name: AI-PM Toolkit T&M Test Project
- Project ID: `ai-pm-tm-test`
- Commercial model: T&M / `time_and_material`
- Methodology: Scrum
- Role model: one PM role
- Primary channel: Discord via Hermes Agent Bot
- Tracker: Notion, currently prepared through local import artifacts
- Target completion date: 2026-06-28

## Verification Commands

Run from `examples/ai-pm-tm-test-project`.

| Command | Result |
|---|---|
| `node ..\..\packages\cli\bin\ai-pm.js setup doctor --path . --json` | Score 100, no blocking findings |
| `node ..\..\packages\cli\bin\ai-pm.js project scan --json` | Score 100, `ready: true` |
| `node ..\..\packages\cli\bin\ai-pm.js project profile validate --json` | Valid profile |
| `node ..\..\packages\cli\bin\ai-pm.js memory summary --json` | 4 tasks, 2 artifacts |
| `node ..\..\packages\cli\bin\ai-pm.js daily --json` | Reads `projectId: ai-pm-tm-test`, Scrum, T&M, and 4 active memory tasks |
| `node ..\..\packages\cli\bin\ai-pm.js mcp doctor --json` | Parseable JSON, health degraded due missing live connector configuration |

## Current Gaps

- Notion is prepared as local CSV/schema import. Live Notion sync still needs Notion MCP/API configuration and explicit mutation approval.
- Discord/Hermes is documented as the target channel. Read-only command adapter still needs runtime smoke.
- MCP doctor shows degraded health because external connectors are intentionally not configured in this local test project yet.

## Active Tracking Artifacts

- `integrations/notion/notion-database-schema.md`
- `integrations/notion/issues.csv`
- `.ai-pm/memory/state.json`
- `plan/milestones.md`
