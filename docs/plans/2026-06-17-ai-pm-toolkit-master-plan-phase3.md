## Phase 3: Code Quality Governance & Agentic Coding Supervision

### Task 9: Implement Code Quality Governor Agent
**Objective:** Meta-agent that supervises all coding agents (Claude Code, Codex, Copilot, Cursor, etc.) enforcing quality gates

**Files:**
- Create: `packages/agents/src/pm-agents/code-quality-governor/agent.ts`
- Create: `packages/agents/src/pm-agents/code-quality-governor/quality-gates.ts`
- Create: `packages/agents/src/pm-agents/code-quality-governor/coding-agent-adapters/` (claude-code.ts, codex.ts, copilot.ts, cursor.ts)
- Create: `packages/agents/src/pm-agents/code-quality-governor/policies/` (typescript.ts, python.ts, react.ts, security.ts, performance.ts)

**Step 1:** Define QualityGate interface (pre-commit, pre-push, pre-merge, post-deploy)
**Step 2:** Write adapters for each coding agent CLI (spawn, monitor, parse output)
**Step 3:** Implement quality gates: lint, type-check, test coverage ≥80%, security scan, complexity, bundle size, dependency audit
**Step 4:** Write policy engine with project-type specific rules
**Step 5:** Implement verdict system: PASS / CONDITIONAL / BLOCK with actionable feedback
**Step 6:** Verify: governor blocks PR with failing gates, passes clean PR

---

### Task 10: Implement Test Orchestration Agent
**Objective:** Manages test strategy, generation, execution, and flakiness detection across coding agents

**Files:**
- Create: `packages/agents/src/pm-agents/test-strategy/agent.ts`
- Create: `packages/agents/src/pm-agents/test-strategy/test-planner.ts`
- Create: `packages/agents/src/pm-agents/test-strategy/coverage-analyzer.ts`
- Create: `packages/agents/src/pm-agents/test-strategy/flaky-detector.ts`
- Create: `packages/agents/src/pm-agents/test-strategy/test-generator.ts`

**Step 1:** Write test planner: creates test plan from requirements/stories (unit, integration, e2e, contract, performance, chaos)
**Step 2:** Write test generator: produces tests matching project patterns, business logic coverage
**Step 3:** Write coverage analyzer: identifies gaps, maps to business requirements
**Step 4:** Write flaky detector: historical analysis, auto-quarantine, root cause suggestions
**Step 5:** Verify: generates complete test suite for sample feature, detects gaps