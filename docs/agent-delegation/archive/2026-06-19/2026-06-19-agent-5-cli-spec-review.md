# Agent 5 CLI Spec Review

**Reviewer:** Orchestrator  
**Date:** 2026-06-19  
**Input:** `docs/product/approval-queue-cli-spec.md` (749 lines)

---

## Scope check

Agent 5 was asked to design CLI commands for the approval queue, mapping 1:1 to the runtime contract API endpoints.

**8 files now form the approval queue spec layer:**

| File | Lines | Owner |
|------|-------|-------|
| `docs/product/approval-queue-ux.md` | 346 | Agent 5 |
| `docs/architecture/approval-queue-runtime-contract.md` | 618 | Agent 5 |
| `docs/product/approval-queue-cli-spec.md` | 749 | Agent 5 |
| **Total** | **1713** | |

---

## Cross-reference: CLI commands vs Runtime API

| Runtime endpoint | CLI command | Match |
|-----------------|-------------|-------|
| `GET /api/approvals` | `ai-pm approval list` | ✅ |
| `GET /api/approvals/:id` | `ai-pm approval show <id>` | ✅ |
| `GET /api/approvals/:id/audit` | `ai-pm approval show <id> --audit` | ✅ |
| `POST /api/approvals/:id/decide` | `ai-pm approval decide <id> <decision>` | ✅ |
| `POST /api/approvals/:id/delegate` | `ai-pm approval delegate <id> <user>` | ✅ |
| `POST /api/approvals/:id/re-submit` | — missing | ⚠️ |
| `GET /api/approvals/count` | `ai-pm approval count` | ✅ |
| `POST /api/approval-policies` | — not in scope (CLI creates via desktop only) | ✅ Intentional |
| `GET /api/approval-policies` | `ai-pm approval policy list` | ✅ |
| `DELETE /api/approval-policies/:id` | `ai-pm approval policy revoke <id>` | ✅ |
| `GET /api/approval-policies/match` | — system-internal only | ✅ Correct |

**9/11 endpoints covered.** The 2 missing are:
1. `POST /api/approvals/:id/re-submit` — agent-facing only, not for PM CLI. Correct omission.
2. `POST /api/approval-policies` — intentionally not exposed via CLI (§8.3). Correct design decision.

---

## Quality checks

| Check | Result |
|-------|--------|
| All 7 commands have full specs | ✅ |
| API mapping documented per command | ✅ 7/7 |
| Table output mockups | ✅ All read commands |
| JSON output shape | ✅ All commands |
| Error cases enumerated | ✅ 7 categories, specific messages |
| Exit codes defined | ✅ 0-3 |
| Confirmation prompts documented | ✅ Which commands, how to bypass |
| Shell integration (jq, env vars) | ✅ |
| Color coding rules | ✅ Priority, status, confidence |
| Age formatting | ✅ Xm/Xh/Xd/XM |
| Bilingual messages pattern | ✅ msgs.en / msgs.vi |
| Short ID resolution | ✅ Prefix match logic |
| HTTP client pattern | ✅ fetch-based, no new deps |
| Implementation file location | ✅ approval.ts |
| Workflow examples | ✅ 3 scenarios |
| Open questions resolved | ✅ 6/6 |

**No issues found.** Spec is thorough, implementation-ready, and aligns with all existing patterns.

---

## What this completes

Agent 5 has now delivered the full approval queue specification layer:

```
approval-queue-ux.md          → WHAT (UX states, flows, security)
approval-queue-runtime-contract.md → HOW (API, data model, SQLite, integration)
approval-queue-cli-spec.md    → CLI ACCESS (commands, formatting, errors)
```

Main thread Task 4 (Approval Queue Runtime) has everything it needs:
- Data model (TypeScript interface + SQLite schema)
- API endpoints (8 queue + 4 policy)
- State machine (10 states, full diagram)
- CLI commands (7 commands, 1:1 API mapping)
- Security constraints (10 rules)
- Agent integration flow (create, re-submit, escalation)
- Desktop/mobile/chat integration points

---

## Next task for Agent 5

Agent 5 has exhausted the approval queue spec scope. The next useful work is to design the **approval queue desktop and mobile component specs** — detailed component-level UI specs that Agent 6 can use to implement the actual React components.

This is distinct from the UX spec (which defines behavior) and the CLI spec (which defines terminal access). This new spec defines:
- React component tree for the approvals view
- State management (how desktop fetches/caches approval data)
- Component props and data flow
- Mobile component structure (React Native)
- Integration with existing desktop layout (sidebar, DailyBriefTab)
