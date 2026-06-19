# Test Plan Template

## Purpose
Define the strategy, scope, resources, schedule, and exit criteria for verifying that a system meets its requirements. Serve as the basis for test execution, defect tracking, and release decisions.

## When to Use
- For each major release or milestone
- When a new test environment or test automation framework is introduced
- Before UAT or production deployment
- When audits or compliance require documented testing evidence

## Required Inputs
| Input | Source | Required |
|-------|--------|----------|
| Requirements / user stories | Product backlog / SRS | Yes |
| Acceptance criteria | Per requirement / story | Yes |
| Test environment details | DevOps / infrastructure | Yes |
| Automation frameworks and tools | QA / DevOps | As applicable |
| Risk register (risk-based testing input) | PM / risk log | Yes |
| Entry / exit criteria | PM / QA lead | Yes |

---

## Markdown Body Template

```markdown
# Test Plan - [Project / Component Name]

**Test Plan ID:** TP-001  
**Version:** 1.0  
**Date:** YYYY-MM-DD  
**Author:** [QA Lead / PM]  
**Reviewers:** [PM, Tech Lead, PO]  
**Status:** Draft / In Review / Approved  

---

## Introduction

- **Project / Product under test:** [Name]
- **Purpose:** [Objective of this test plan]
- **Scope:** [High-level in/out of scope]
- **References:** [SRS link, architecture doc, user stories]

---

## Test Strategy

| Test Type | Purpose | Entry Criteria | Exit Criteria |
|-----------|---------|----------------|----------------|
| Unit | Validate individual functions/modules | Code complete, PR merged to test branch | All unit tests pass, coverage >= target % |
| Integration | Verify component interactions | API contract ready, test env up | Pass rate >= target%, P1/P2 defects resolved |
| E2E / UI | Validate user flows | Staging deployed, test data loaded | Pass rate >= target%, no critical defects open |
| Performance | Meet NFRs (throughput, latency, scale) | Load test env ready, scripts ready | P95 <= target, no memory leaks |
| Security | Identify vulnerabilities | App deployed to security test env | No critical/high vulnerabilities |
| Regression | Ensure stability after changes | Build deployed to regression env | All regression suites pass |
| UAT | Business validation by PO/users | Staging sign-off, UAT data ready | All critical AC signed off |

---

## Test Environment

| Component | Details |
|-----------|---------|
| Application URL | [URL] |
| Database | [Version, connection string placeholder] |
| Test data | [Data source, refresh cadence] |
| Browsers / devices | [Chrome, Safari, iOS 16, Android 13, ...] |
| Test frameworks | [pytest, Cypress, Playwright, JMeter, ...] |
| Defect tracking | [Link to board] |

---

## Deliverables

- Test cases / suites (automated + manual)
- Test data sets
- Defect reports
- Test summary report (metrics, pass/fail, open defects)
- Sign-off record

---

## Schedule

| Phase | Start | End | Dependencies |
|-------|-------|-----|--------------|
| Test case design | YYYY-MM-DD | YYYY-MM-DD | Requirements baselined |
| Environment setup | YYYY-MM-DD | YYYY-MM-DD | Infra ready |
| Execution - Unit | YYYY-MM-DD | YYYY-MM-DD | CI pipeline green |
| Execution - Integration | YYYY-MM-DD | YYYY-MM-DD | APIs stable |
| Execution - E2E | YYYY-MM-DD | YYYY-MM-DD | UI stable |
| Execution - Performance | YYYY-MM-DD | YYYY-MM-DD | Load scripts ready |
| UAT | YYYY-MM-DD | YYYY-MM-DD | E2E sign-off |
| Test summary report | YYYY-MM-DD | YYYY-MM-DD | UAT complete |

---

## Roles and Responsibilities

| Role | Responsibilities |
|------|-----------------|
| QA Lead | Overall test execution, reporting, defect triage |
| Developers | Unit tests, bug fixes, code reviews |
| DevOps | Test environment, CI/CD, data refresh |
| Product Owner | Acceptance of fixes, UAT participation |
| PM | Tracking, escalation, release readiness |

---

## Entry Criteria

- [ ] Requirements baselined and approved
- [ ] Test environment deployed and accessible
- [ ] Test data prepared
- [ ] Test cases reviewed
- [ ] CI/CD pipeline functional

---

## Exit Criteria

- [ ] [X]% of test cases executed
- [ ] 100% of P1/P2 defects fixed and verified
- [ ] [X]% of P3 defects fixed or deferred with approval
- [ ] Test summary report approved
- [ ] UAT sign-off obtained (if applicable)

---

## Risk and Assumptions

- **Assumptions:** [List]
- **Risks:** [From risk register, e.g., "Late delivery of test data" - mitigation: use synthetic data]

---

## Defect Management

| Severity | Priority | Examples | SLA |
|----------|----------|----------|-----|
| Critical | P0 | System down, data loss | Fix within 24h |
| High | P1 | Core workflow broken | Fix within 3 days |
| Medium | P2 | Non-critical issue | Fix within 2 weeks |
| Low | P3 | Cosmetic, minor UX | Backlog / fix later |

---

## Approval

| Role | Name | Decision | Date | Signature |
|------|------|----------|------|-----------|
| QA Lead | | Approve | | |
| Tech Lead | | Approve | | |
| Product Owner | | Acknowledge | | |
| Project Manager | | Approve | | |

```

---

## Approval Notes
- **QA Lead** owns test plan and must approve before execution begins.
- **Tech Lead** confirms environment and data assumptions are realistic.
- **PM** validates schedule and dependencies align with release plan.
- Test plan changes after go-live require version bump and re-approval.

## Source / Audit
- **Template Version:** 1.0
- **Created:** 2026-06-19
- **Source Workflow:** `workflows/code-quality-guard/`
- **Related Templates:** `playbooks/quality/testing-strategy.md`, `templates/requirements/acceptance-criteria.md`
- **Governance:** IEEE 829 (legacy, widely referenced); ISO/IEC 33063; PMBOK Control Quality