# Testing Strategy Playbook

## Mission

Ensure testing effort matches delivery risk and requirement importance.

## Test Pyramid

Prefer the following distribution for mature codebases:

- Unit: 60-70%
- Integration: 20-30%
- E2E: 10-15%
- Contract: for MCP/integration boundaries
- Manual/UAT: business acceptance only

## When to Write Each Test Type

- Unit: deterministic business logic, utilities, parsers, validators, calculations.
- Integration: API routes, DB access, MCP boundaries, messaging between services.
- E2E: critical user journeys, login-to-complete flows, cross-service transactions.
- Contract: MCP schemas, external provider interfaces, library version boundaries.
- Manual/UAT: business acceptance flows that are too expensive to automate or require judgment.

## Coverage Targets by Phase

| Phase | Unit | Integration | E2E |
|-------|------|-------------|-----|
| Prototype | 40% | 20% | 5% |
| Active development | 70% | 30% | 10% |
| Stabilization | 80% | 40% | 20% |
| Maintenance/Migration | keep current or regress no more than 5pp | | |

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

## CI/CD Test Pipeline Recommendations

- Run unit tests on every commit.
- Run integration tests on PRs touching service boundaries.
- Run E2E suite on main branch merges and before release candidate.
- Flake detection: rerun once, then quarantine if repeated.
- Block merge on P1/P2 test failures unless documented exception approved.

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
