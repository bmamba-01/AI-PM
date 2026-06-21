# Acceptance Matrix — AI-PM Toolkit v1.0

> **Date:** 2026-06-21
> **Purpose:** Map each business case requirement to test evidence for PM acceptance

## Business Case Requirements

### Local-First Architecture

| # | Requirement | Evidence | Status |
|---|---|---|---|
| L-1 | All data stored locally on user machine | `.ai-pm/` directory with memory, audit, approvals | ✅ |
| L-2 | No external API calls without explicit approval | Approval queue gates all mutations | ✅ |
| L-3 | Works offline with mock data | Mobile/desktop mock fallback when server unreachable | ✅ |
| L-4 | File-backed runtime stores | `ApprovalQueue`, `MemoryStore`, `LocalProjectStore` | ✅ |
| L-5 | Audit trail for every action | `LocalProjectStore.appendWorkflowAudit()` + JSONL | ✅ |

### Approval Gating

| # | Requirement | Evidence | Status |
|---|---|---|---|
| A-1 | All external mutations require PM approval | `ApprovalQueue.decide()` state machine | ✅ |
| A-2 | Approval supports approve/reject/revision/cancel | `DecidePayload` union type | ✅ |
| A-3 | Revision loop with max 3 rounds | `resubmit()` with revision_round limit | ✅ |
| A-4 | Rejection requires reason (min 10 chars) | `decide()` validation | ✅ |
| A-5 | Chat/mobile actions approval-gated | Server rejects mutations without approval | ✅ |

### Workflow Coverage

| # | Requirement | Evidence | Status |
|---|---|---|---|
| W-1 | Daily briefing generation | `generateDailyBriefing()` | ✅ |
| W-2 | Weekly status report | `generateWeeklyReport()` | ✅ |
| W-3 | Risk control summary | `generateRiskControlSummary()` | ✅ |
| W-4 | Traceability matrix | `buildTraceabilityMatrix()` | ✅ |
| W-5 | Code quality review | `codeQualityGuard.ts` | ✅ |
| W-6 | Test evidence parsing | `testEvidence.ts` | ✅ |
| W-7 | Scope verification (strict mode) | `runStrictVerification()` | ✅ |

### Multi-Surface Access

| # | Requirement | Evidence | Status |
|---|---|---|---|
| S-1 | CLI — all commands available | `ai-pm --help` shows all subcommands | ✅ |
| S-2 | Desktop — Electron app with tabs | `packages/desktop/` | ✅ |
| S-3 | Mobile — React Native with navigation | `packages/mobile/` | ✅ |
| S-4 | Server — local HTTP API | `packages/server/` routes | ✅ |
| S-5 | Chat gateway — read-only queries + action proposals | `/api/chat/*` endpoints | ✅ |

### MCP Integration

| # | Requirement | Evidence | Status |
|---|---|---|---|
| M-1 | MCP server configuration | `ai-pm mcp add/list/remove` | ✅ |
| M-2 | MCP profiles (default, offline-local) | `mcp/profiles/` | ✅ |
| M-3 | MCP doctor/validate | `ai-pm mcp doctor/validate` | ✅ |
| M-4 | Codebase memory MCP integration | `.claude/.mcp.json` seeded by init | ✅ |

### Project Setup

| # | Requirement | Evidence | Status |
|---|---|---|---|
| P-1 | New project initialization | `ai-pm init --methodology scrum` | ✅ |
| P-2 | Project scan with readiness score | `ai-pm project scan --json` | ✅ |
| P-3 | Profile with methodology, type, connectors | `.ai-pm/profile.yaml` | ✅ |
| P-4 | Agent entrypoints (AGENTS.md, CODEX.md, CLAUDE.md) | Created by init | ✅ |
| P-5 | Post-init readiness ≥ 80% | `project scan --json` after init | ✅ |

## Known Limitations

| # | Limitation | Mitigation | Deferred To |
|---|---|---|---|
| N-1 | No real-time WebSocket for live updates | Polling via IPC + refresh buttons | v1.1 |
| N-2 | No encrypted offline queue at rest | Local file system permissions | v1.1 |
| N-3 | No mobile push notifications | Manual refresh + status indicators | v1.1 |
| N-4 | No multi-user concurrent approval | Single PM user for v1.0 | v1.2 |
| N-5 | No cloud sync or backup | Local-first by design | v1.2 |
| N-6 | No real external CI/CD integration | Local fixture/mock mode only | v2.0 |
| N-7 | No real Jira/GitHub/Notion API calls | MCP connectors planned for v2.0 | v2.0 |

## Acceptance Decision

| Item | Decision |
|---|---|
| All core requirements met | ☐ Yes ☐ No |
| All security requirements met | ☐ Yes ☐ No |
| Documentation complete | ☐ Yes ☐ No |
| Build/test gate passes | ☐ Yes ☐ No |
| Known limitations acceptable | ☐ Yes ☐ No |
| **Release approved** | ☐ Yes ☐ No |

| Role | Name | Date | Decision |
|---|---|---|---|
| PM | | | ☐ Approve ☐ Reject |
| Tech Lead | | | ☐ Approve ☐ Reject |
