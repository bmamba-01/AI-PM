# Testing Strategy Playbook

## Mission

Ensure testing effort matches delivery risk and requirement importance.

## Test Levels

- unit tests for deterministic business logic
- integration tests for API, DB, MCP, and workflow boundaries
- e2e tests for critical user journeys
- contract tests for normalized MCP interfaces
- manual/UAT checks for business acceptance

## Risk-Based Test Selection

Use broader testing when:

- workflow affects external systems
- money, scope, timeline, or approvals are involved
- code changes shared infrastructure
- defects would affect client-visible output
- AI generated the implementation

Use narrower testing when:

- change is documentation-only
- behavior is isolated
- existing tests already cover the path

## Minimum Evidence

Every code-quality recommendation should report:

- tests run
- tests not run and why
- coverage gaps
- manual checks performed
- residual risk

## Agent Rules

- Do not claim quality gates passed without command output or explicit evidence.
- Do not invent test results.
- If tests cannot run, explain the blocker and recommend the next safest verification.

