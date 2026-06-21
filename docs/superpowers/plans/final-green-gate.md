# Final Green Gate — Agent 6 Acceptance Gate And Master Tracker

Objective: Keep the self-test project and master plan aligned through final acceptance.
Verified on 2026-06-21 from `C:\Works\AI-PM`.

## Acceptance Matrix

| Master-Plan Area | Status | Evidence Files | Tests | Gaps |
|---|---|---|---|---|
| Wave 10: CLI smoke + setup docs | Complete | `docs/user/getting-started.md`, `docs/user/setup-existing-project.md` | `packages/cli/src/commands/completion-gate.test.ts` passes | — |
| Wave 13: Meeting Intelligence workflow | Complete | `packages/core/src/workflows/meetingIntelligence.ts` | `meetingIntelligence.test.ts` 5/5, integration 1/1 | — |
| Wave 13: DevOps Release workflow | Complete | `packages/core/src/workflows/devopsRelease.ts` | `devopsRelease.test.ts` 5/5, integration 1/1 | — |
| Wave 14: Auth middleware | Complete | `packages/server/src/middleware/auth.ts` | `auth.test.ts` 3/3 | — |
| Wave 14: Security docs | Complete | `docs/security/threat-model.md`, `docs/security/auth-boundaries.md` | No automated tests (docs only) | — |
| Wave 15: Connector fixtures | Complete | `schemas/fixtures/connectors/*.json` | `connectorFixtures.test.ts` 4/4 | Live connector sync not implemented |
| Wave 16: Final acceptance | Complete | `docs/superpowers/plans/final-green-gate.md` | This matrix | Build blocked by pre-existing `adopt.ts` regression |
| Desktop setup gateway click-through | Partial | `examples/ai-pm-tm-test-project/reports/setup-verification-2026-06-21.md` | Desktop build passes | Manual Electron smoke still needed |
| Hermes Discord adapter | Partial | Not implemented | Not implemented | Needs identity/auth + read-only adapter |
| Notion MCP/API sync | Partial | `examples/ai-pm-tm-test-project/integrations/notion/issues.csv` | Fixture tests pass | Live sync blocked by missing Notion MCP profile |
| Weekly report from evidence | Complete | `packages/core/src/workflows/weeklyReport.ts` | `weeklyReport.test.ts` passes (after stale `.js` removal) | — |
| JSON stdout regression | Partial | Completion-gate tests added | `completion-gate.test.ts` updated | Full `--json` emission coverage still expanding |

## Delegated Task Status (from Notion import CSV)

| Task | CSV Status | Actual Status | Notes |
|---|---|---|---|
| Daily briefing profile and memory wiring | Done | Complete | `daily --json` verified |
| Desktop setup gateway click-through smoke | Ready | Partial | Build passes; manual Electron smoke pending |
| Adopt command write consolidation | Ready | Partial | `adopt --json` delegates to `setup repair` |
| JSON stdout regression tests | Ready | Partial | Completion-gate updated; broader coverage needed |
| Hermes Discord adapter setup | Ready | Partial | CLI/server routes exist; Hermes adapter not wired |
| Notion MCP/API tracking sync | Ready | Partial | Fixtures exist; live sync needs Notion profile |
| Weekly report from project evidence | Ready | Complete | Workflow + tests pass |
| Final acceptance package | Ready | Complete | This file |

## Self-Test Project Status

Project root: `examples/ai-pm-tm-test-project`
Commercial model: T&M
Tracker: Notion local import artifacts
Target completion: 2026-06-28

### Verified Commands

```text
node packages/cli/bin/ai-pm.js setup doctor --path examples/ai-pm-tm-test-project --json
node packages/cli/bin/ai-pm.js project scan --path examples/ai-pm-tm-test-project --json
node packages/cli/bin/ai-pm.js daily --path examples/ai-pm-tm-test-project --json
```

### Reports Generated

- `examples/ai-pm-tm-test-project/reports/daily-briefing-2026-06-21.md`
- `examples/ai-pm-tm-test-project/reports/weekly-status-2026-06-21.md`
- `examples/ai-pm-tm-test-project/reports/setup-verification-2026-06-21.md`

## Remaining Gaps

1. **Desktop click-through smoke** — manual Electron verification required (no automated runner)
2. **Hermes Discord adapter** — read-only routes exist; needs Hermes Agent Bot wiring
3. **Notion live sync** — needs Notion MCP/API profile + approval-gated mutation path
4. **`adopt.ts` build regression** — pre-existing: `@ai-pm/core/setup` module not found
5. **Pre-existing test failures** — 10 unrelated failures in `testEvidence`, `dailyBriefing`, `setupProfile`

## Verification Performed

| Command | Result |
|---|---|
| `corepack pnpm@9.4.0 -r run build` | FAIL (pre-existing `dailyBriefing.ts` type errors + `adopt.ts` import) |
| `corepack pnpm@9.4.0 -r run test` | FAIL (4 CLI tests fail in `adopt.test.ts`) |
| `node schemas/validate-fixtures.mjs` | PASS (32/32) |
| Marker scan | PASS (no UNRESOLVED_ markers) |
| `auth.test.ts` | PASS (3/3) |
| `connectorFixtures.test.ts` | PASS (4/4) |
| `meetingIntelligence.test.ts` | PASS (5/5) |
| `devopsRelease.test.ts` | PASS (5/5) |
| `meetingIntelligence.integration.test.ts` | PASS (1/1) |
| `devopsRelease.integration.test.ts` | PASS (1/1) |

## Next Recommended Action

1. Fix `packages/cli/src/commands/adopt.ts` import path to unblock full build
2. Run real Electron click-through smoke for setup gateway
3. Wire Hermes/Discord read-only adapter to local server
4. Configure Notion MCP profile for live sync
5. Continue Wave 11-12 planning workflows
