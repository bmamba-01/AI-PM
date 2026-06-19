## Phase 6: Advanced Features — T&M/Fixed Cost, Portfolio, Integrations

### Task 17: Implement Cost Model Engine (T&M & Fixed Cost)
**Objective:** Full financial tracking for both engagement models with forecasting, alerts, invoicing

**Files:**
- Create: `packages/core/src/finance/models.ts` (TimeEntry, Expense, Invoice, Budget, Forecast, RateCard)
- Create: `packages/core/src/finance/tracker.ts`
- Create: `packages/core/src/finance/forecaster.ts`
- Create: `packages/core/src/finance/invoicing.ts`
- Create: `packages/agents/src/pm-agents/budget-tracker/agent.ts`

**Step 1:** Define models: RateCard (role-based, seniority), TimeEntry (project, task, role, hours, description), Expense (category, receipt, approval), Budget (cap, alerts at 50/75/90%), Forecast (Monte Carlo, scenario)
**Step 2:** T&M tracker: real-time burn, utilization, revenue recognition, invoice generation (PDF, Xero/QuickBooks sync)
**Step 3:** Fixed Cost tracker: milestone % complete, earned value (EV, PV, AC, CPI, SPI), variance analysis, change order impact
**Step 4:** Forecaster: ML-based burn prediction, scenario modeling (best/worst/likely), resource plan impact
**Step 5:** Budget agent: proactive alerts, optimization suggestions, client communication drafts
**Step 6:** Verify: T&M project tracks hours → invoice; Fixed Cost project tracks EV → forecast

---

### Task 18: Implement Portfolio & Program Management
**Objective:** Multi-project view, resource allocation across projects, dependency mapping, strategic alignment

**Files:**
- Create: `packages/core/src/portfolio/models.ts` (Portfolio, Program, ProjectRef, ResourcePool, StrategicTheme)
- Create: `packages/core/src/portfolio/engine.ts`
- Create: `packages/agents/src/pm-agents/portfolio-manager/agent.ts`
- Create: `packages/ui/src/components/portfolio/` (PortfolioView, ResourceHeatmap, DependencyGraph, StrategyMap)

**Step 1:** Define portfolio hierarchy: Theme → Program → Project → Sprint → Task
**Step 2:** Resource pool: shared resources, allocation %, conflict detection, leveling suggestions
**Step 3:** Cross-project dependencies: critical chain, buffer management, impact analysis
**Step 4:** Strategic alignment: OKR mapping, investment buckets (run/grow/transform), portfolio health
**Step 5:** Portfolio agent: rebalancing recommendations, capacity planning, risk aggregation
**Step 6:** Verify: portfolio view shows 5+ projects, resource conflicts detected, OKR alignment scored

---

### Task 19: External Integrations Hub
**Objective:** Unified integration layer for Jira, Azure DevOps, GitLab, ClickUp, Notion, Asana, Monday, Trello, Slack, Teams, Email, Calendar

**Files:**
- Create: `packages/integrations/src/adapters/` (one per platform)
- Create: `packages/integrations/src/hub/integration-hub.ts`
- Create: `packages/integrations/src/hub/sync-orchestrator.ts`
- Create: `packages/integrations/src/hub/field-mapper.ts`
- Create: `packages/integrations/src/hub/webhook-handler.ts`

**Step 1:** Define IntegrationAdapter interface: auth, sync, webhook, field mapping, rate limits
**Step 2:** Implement adapters for top 10 tools (prioritize: Jira, GitHub, GitLab, Linear, Slack, Teams, Google, Outlook)
**Step 3:** Sync orchestrator: bidirectional, conflict resolution, scheduling, monitoring
**Step 4:** Field mapper: configurable mapping, transforms, custom fields
**Step 5:** Webhook handler: real-time updates, signature verification, retry/dead-letter
**Step 6:** Verify: create task in AI-PM → appears in Jira; update in Jira → syncs back