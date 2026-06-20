# Wave 7 Assignment — 6 Agents

> **Date:** 2026-06-20  
> **Status:** Wave 6 complete. All 6 agents idle.  
> **Codebase:** 12,919 lines TypeScript across 8 packages.

## Agent 1: CLI Completion Gate Test Suite

Create a single integration test file that runs the full verification gate and asserts every check passes.

**File:** `packages/cli/src/commands/completion-gate.test.ts`

```typescript
it('full verification gate passes', async () => {
  // Test ai-pm --help exits 0
  // Test ai-pm approval count --json returns valid JSON
  // Test ai-pm memory summary --json returns valid JSON
  // Test ai-pm audit list --json returns valid JSON
  // Test ai-pm project scan --json returns { ready: boolean, score: number }
  // Test ai-pm schema list --json returns valid array
  // Test ai-pm weekly --help exits 0
  // Test ai-pm init --help exits 0
});
```

Verify: `pnpm --filter @ai-pm/cli test`

---

## Agent 2: Schema Validate from CLI File Input

Expand schema CLI to support piping stdin and validating raw JSON strings.

**Files:** `packages/cli/src/commands/schema.ts`, `schema.test.ts`

Add:
- `ai-pm schema validate --workflow daily-briefing --input -` (stdin)
- `ai-pm schema validate --workflow daily-briefing --json-string '{"date":"2026-06-20",...}'`
- `ai-pm schema inspect <workflow-id>` — show schema structure (required fields, enums, types)

Verify: `pnpm --filter @ai-pm/cli test && pnpm --filter @ai-pm/cli build`

---

## Agent 3: Server OpenAPI / API Docs Generation

Auto-generate API documentation from the server route definitions.

**Files:**
- Create: `docs/architecture/local-server-api-openapi.yaml`
- Create: `packages/server/src/generate-api-docs.ts` (script to generate YAML from routes)

What to do:
1. Manually create `docs/architecture/local-server-api-openapi.yaml` following OpenAPI 3.0 spec
2. Document all 13 endpoints (approval + memory + health)
3. Include request/response schemas, error codes, auth model
4. Add example curl commands for each endpoint

Verify: `ls docs/architecture/local-server-api-openapi.yaml`

---

## Agent 4: Desktop Approvals Tab Real Data Wiring

Wire the ApprovalsTab to use real IPC data instead of any remaining mock/seed data.

**Files:**
- `packages/desktop/src/components/tabs/ApprovalsTab.tsx`
- `packages/desktop/src/state/approval-store.ts`

What to do:
1. Remove any SEED_ITEMS or hardcoded mock data arrays
2. Ensure all data comes from `window.electronAPI.approvals.*`
3. Add creation form: button to create new approval items
4. Add audit trail panel showing approval history
5. Add keyboard shortcuts: A=approve, R=reject, V=revision, Esc=close

Verify: `pnpm --filter @ai-pm/desktop build`

---

## Agent 5: Mobile Approval Actions Full Implementation

Complete all approval actions in the mobile detail screen.

**Files:**
- `packages/mobile/src/screens/ApprovalDetailScreen.tsx`
- `packages/mobile/src/screens/ApprovalsScreen.tsx`

What to do:
1. Wire approve/reject/revision buttons to store actions
2. Add creation form for new approval items
3. Add audit trail section showing approval history
4. Add pull-to-refresh on the list screen
5. Add "No approvals yet" empty state when queue is empty

Verify: `pnpm --filter @ai-pm/mobile build`

---

## Agent 6: Risk Control Workflow Slice

Build the next workflow after weekly report: risk register local workflow.

**Files:**
- Create: `packages/core/src/workflows/riskControl.ts`
- Create: `packages/core/src/workflows/riskControl.test.ts`
- Export from `packages/core/src/workflows/index.ts`
- Create: `packages/cli/src/commands/risk.ts`
- Register in CLI

What to do:
1. `ai-pm risk list` — list risks from memory/artifacts
2. `ai-pm risk add --title "X" --probability high --impact high --owner "Y"` — add risk
3. `ai-pm risk close <id>` — close a risk with evidence
4. Persist to memory store
5. Use risk register template from `templates/risks/risk-register.md`
6. Queue approval for risk closure

Verify: `pnpm --filter @ai-pm/core test && pnpm --filter @ai-pm/cli build`

---

## Execution

All 6 tasks are parallel. No dependencies.

```
Agent 1: CLI completion gate tests
Agent 2: Schema CLI stdin + inspect
Agent 3: OpenAPI docs generation
Agent 4: Desktop ApprovalsTab real data
Agent 5: Mobile approval actions
Agent 6: Risk control workflow slice
```
