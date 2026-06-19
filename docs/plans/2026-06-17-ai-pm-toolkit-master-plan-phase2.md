## Phase 2: AI Agent Orchestration & MCP Integration

### Task 6: Define Agent Registry & Orchestration Layer
**Objective:** Central registry for all AI agents (coding, research, QA, PM, analysis) with capability discovery, routing, and load balancing

**Files:**
- Create: `packages/agents/src/registry/agent-registry.ts`
- Create: `packages/agents/src/registry/capabilities.ts`
- Create: `packages/agents/src/orchestrator/task-router.ts`
- Create: `packages/agents/src/orchestrator/agent-pool.ts`
- Create: `packages/agents/src/orchestrator/execution-engine.ts`

**Step 1:** Define AgentCapability interface (code-gen, code-review, test-gen, research, analysis, pm-planning, risk-assessment, doc-gen, translate)
**Step 2:** Write agent registry with registration, discovery, health checks
**Step 3:** Write task router matching tasks to best agent by capability, cost, latency
**Step 4:** Write agent pool with concurrency limits, queue management
**Step 5:** Write execution engine with streaming, checkpointing, rollback
**Step 6:** Verify: register 3+ agents, route tasks correctly

---

### Task 7: Integrate Standard MCP Servers
**Objective:** Configure and wrap recommended MCP servers as first-class agents

**MCP Servers to Integrate:**
- `@modelcontextprotocol/server-github` — GitHub operations (issues, PRs, repos, actions)
- `@modelcontextprotocol/server-linear` — Linear issue tracking
- `@modelcontextprotocol/server-filesystem` — Local file operations
- `@modelcontextprotocol/server-browser` — Web research, scraping
- `@modelcontextprotocol/server-postgres` / `server-sqlite` — Database queries
- `@modelcontextprotocol/server-gdrive` — Google Drive/Docs/Sheets
- `@modelcontextprotocol/server-gmail` — Email management
- `@modelcontextprotocol/server-slack` — Team communication
- `@dguido/google-workspace-mcp` — Full Google Workspace (verified working)
- `mcp-server-docker` — Container management
- `mcp-server-kubernetes` — K8s cluster ops
- `mcp-server-terraform` — IaC management

**Files:**
- Create: `packages/mcp-servers/src/wrappers/` (one per MCP)
- Create: `packages/mcp-servers/src/registry/mcp-registry.ts`
- Create: `packages/mcp-servers/src/config/mcp-config.yaml`

**Step 1:** Write wrapper class for each MCP exposing standardized AgentCapability interface
**Step 2:** Write MCP registry with auto-discovery from config
**Step 3:** Write health checks, auth management, token refresh
**Step 4:** Verify: each MCP server connects, lists tools, executes sample call

---

### Task 8: Implement Specialized PM Agents
**Objective:** Build domain-specific agents for PM workflows

**Agents to Build:**
- **SprintPlannerAgent** — Capacity planning, story point estimation, dependency mapping
- **RiskAnalystAgent** — Risk identification, Monte Carlo simulation, mitigation planning
- **TimelineOptimizerAgent** — Critical path, resource leveling, what-if scenarios
- **StakeholderCommsAgent** — Status reports, executive summaries, meeting prep/notes
- **CodeQualityGovernorAgent** — Oversees coding agents, enforces standards, gates merges
- **TestStrategyAgent** — Test planning, coverage analysis, flaky test detection
- **ScopeGuardianAgent** — Scope creep detection, change impact analysis
- **BudgetTrackerAgent** — Burn rate, forecasting, T&M vs Fixed Cost tracking

**Files:**
- Create: `packages/agents/src/pm-agents/` (one per agent)
- Create: `packages/agents/src/pm-agents/base/pm-agent-base.ts`
- Create: `packages/agents/src/pm-agents/factory.ts`

**Step 1:** Write base PM agent class with project context, methodology awareness
**Step 2:** Implement each specialized agent with prompts, tools, output schemas
**Step 3:** Write factory for agent instantiation with config
**Step 4:** Verify: each agent produces valid output for sample scenarios