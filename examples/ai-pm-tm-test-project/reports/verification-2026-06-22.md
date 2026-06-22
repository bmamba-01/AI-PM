# Verification Report - 2026-06-22

## Repo Gate

Run from `C:\Works\AI-PM`.

| Command | Result |
|---|---|
| `corepack pnpm@9.4.0 -r run build` | Pass |
| `corepack pnpm@9.4.0 -r run test` | Pass |
| `node schemas/validate-fixtures.mjs` | Pass, 32/32 |
| Standard unresolved-marker scan | Pass, no matches |

## Self-Test Project Smoke

Run from `examples/ai-pm-tm-test-project`.

| Command | Result |
|---|---|
| `node ..\..\packages\cli\bin\ai-pm.js setup doctor --path . --json` | Score 100, 0 blocking, 0 warnings |
| `node ..\..\packages\cli\bin\ai-pm.js project scan --json` | Score 100, ready true, 7/7 required |
| `node ..\..\packages\cli\bin\ai-pm.js memory summary --json` | 7 tasks, 1 completed, 4 artifacts |
| `node ..\..\packages\cli\bin\ai-pm.js daily --json` | Project `ai-pm-tm-test`, Scrum, T&M |
| `node ..\..\packages\cli\bin\ai-pm.js mcp doctor --json` | Parseable JSON, health degraded because live external connectors are not configured |
| `node ..\..\packages\cli\bin\ai-pm.js approval count --json` | 1 pending approval |

## Findings

- The pending weekly report approval still uses `project_id: local-project`. Wave 17 Agent 1 owns this fix.
- Desktop unit tests pass, but real Electron setup click-through remains pending.
- Hermes adapter tests exist and pass, but real Discord/Hermes runtime smoke remains pending.
- Notion remains local-import/dry-run only until MCP/API credentials and approval-gated live mutation are configured.

## Active Assignment

- `docs/agent-delegation/2026-06-22-wave17-self-test-continuation.md`
