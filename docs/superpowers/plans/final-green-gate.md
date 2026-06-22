# Final Green Gate — Agent 6 Acceptance Gate And Master Tracker

Objective: Keep the self-test project and master plan aligned through final acceptance.
Verified on 2026-06-22 from `C:\Works\AI-PM`.

## Acceptance Matrix

| Master-Plan Area | Status | Evidence Files | Tests | Gaps |
|---|---|---|---|---|
| Wave 10: CLI smoke + setup docs | Complete | `docs/user/getting-started.md`, `docs/user/setup-existing-project.md` | `packages/cli/src/commands/completion-gate.test.ts` passes | — |
| Wave 13: Meeting Intelligence workflow | Complete | `packages/core/src/workflows/meetingIntelligence.ts` | `meetingIntelligence.test.ts` 5/5, integration 1/1 | — |
| Wave 13: DevOps Release workflow | Complete | `packages/core/src/workflows/devopsRelease.ts` | `devopsRelease.test.ts` 5/5, integration 1/1 | — |
| Wave 14: Auth middleware | Complete | `packages/server/src/middleware/auth.ts` | `auth.test.ts` 3/3 | — |
| Wave 14: Security docs | Complete | `docs/security/threat-model.md`, `docs/security/auth-boundaries.md` | No automated tests (docs only) | — |
| Wave 15: Connector fixtures | Complete | `schemas/fixtures/connectors/*.json` | `connectorFixtures.test.ts` 4/4 | Live connector sync not implemented |
| Wave 16: Final acceptance | Complete | `docs/superpowers/plans/final-green-gate.md` | Full build/test gate passes on 2026-06-22 | Needs final release packaging |
| Desktop setup gateway click-through | Partial | `examples/ai-pm-tm-test-project/reports/setup-verification-2026-06-21.md` | Desktop build passes | Manual Electron smoke still needed |
| Hermes Discord adapter | Partial | `packages/server/src/chat/hermesAdapter.ts`, `examples/ai-pm-tm-test-project/integrations/discord-hermes.md`, `docs/architecture/discord-setup-guide.md` | `hermesAdapter.test.ts` 25/25 | Needs real Discord/Hermes runtime smoke |
| Notion MCP/API sync | Partial | `examples/ai-pm-tm-test-project/integrations/notion/issues.csv` | Fixture tests pass | Live sync blocked by missing Notion MCP profile |
| Weekly report from evidence | Complete | `packages/core/src/workflows/weeklyReport.ts` | `weeklyReport.test.ts` passes (after stale `.js` removal) | — |
| JSON stdout regression | Complete | `packages/cli/src/commands/json-regression.test.ts` | 30 JSON regression tests pass | — |

## Delegated Task Status (from Notion import CSV)

| Task | CSV Status | Actual Status | Notes |
|---|---|---|---|
| Daily briefing profile and memory wiring | Done | Complete | `daily --json` verified |
| Desktop setup gateway click-through smoke | Partial | Partial | Build/unit tests pass; manual Electron smoke pending |
| Adopt command write consolidation | Partial | Complete | `adopt --defaults --json` writes files and is covered by JSON regression tests |
| JSON stdout regression tests | Partial | Complete | 30 JSON regression tests pass |
| Hermes Discord adapter setup | Partial | Partial | Server adapter tests pass; real Discord/Hermes runtime smoke pending |
| Notion MCP/API tracking sync | Ready | Partial | Fixtures exist; live sync needs Notion profile |
| Weekly report from project evidence | Ready | Complete | Workflow + tests pass |
| Final acceptance package | Done | Partial | Gate passes; final release/package checklist still needed |

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

1. **Weekly report project scope** — pending approval currently records `project_id: local-project`; it must use `ai-pm-tm-test`.
2. **Desktop click-through smoke** — manual or Playwright/Electron verification required for New Project, Use Existing Project, and Demo Project.
3. **Hermes Discord adapter** — server adapter tests pass; real Discord/Hermes runtime smoke and one-PM channel profile are still needed.
4. **Notion live sync** — needs Notion MCP/API profile, dry-run sync command, and approval-gated mutation path.
5. **Release packaging** — final executable/package checklist still needs to be assembled and verified.

## Verification Performed

| Command | Result |
|---|---|
| `corepack pnpm@9.4.0 -r run build` | PASS |
| `corepack pnpm@9.4.0 -r run test` | PASS |
| `node schemas/validate-fixtures.mjs` | PASS (32/32) |
| Marker scan | PASS (no UNRESOLVED_ markers) |
| `auth.test.ts` | PASS (3/3) |
| `connectorFixtures.test.ts` | PASS (4/4) |
| `meetingIntelligence.test.ts` | PASS (5/5) |
| `devopsRelease.test.ts` | PASS (5/5) |
| `meetingIntelligence.integration.test.ts` | PASS (1/1) |
| `devopsRelease.integration.test.ts` | PASS (1/1) |

## Next Recommended Action

1. Fix weekly report approval and artifact project scope.
2. Run real Electron click-through smoke for setup gateway.
3. Wire Hermes/Discord read-only adapter to a runnable local server profile.
4. Configure Notion MCP/API dry-run and live approval-gated sync path.
5. Assemble final release packaging and acceptance checklist.
