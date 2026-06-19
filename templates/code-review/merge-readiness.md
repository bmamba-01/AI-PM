# Merge Readiness Template

## Purpose
Provide a lightweight, repeatable checklist for authors and reviewers to confirm that a PR is safe, complete, and ready to merge into the main branch. Reduce review cycles and merge-day incidents.

## When to Use
- Before requesting review on a PR
- During review, as a shared contract between author and reviewer
- Before merging any PR to protected branches (main, release, hotfix)
- As part of CI checks or bot prompts

## Required Inputs
| Input | Source | Required |
|-------|--------|----------|
| PR description / Jira / Linear ticket | Author | Yes |
| Linked requirement / acceptance criteria | PM / product | Yes |
| Unit / integration / E2E test results | CI pipeline / author | Yes |
| Security review for sensitive changes | Security / senior reviewer | If applicable |
| Performance / performance regression data | CI / perf team | If applicable |
| Breaking change notice | Author | Yes, if breaking API / data / UI |

---

## Markdown Body Template

```markdown
# Merge Readiness - [Feature / Fix Name]

**PR #:** [Number]  
**Repository:** [org/repo]  
**Branch:** [feature/xxx -> main]  
**Author:** [Name]  
**Reviewers:** [Name(s)]  
**Date:** YYYY-MM-DD  

---

## Summary

[One-paragraph description of the change, motivation, and user-visible impact.]

**Linked work item:** [JIRA-123 / Linear-ABC / REQ-456]  
**Breaking change:** Yes / No  
**Deployment notes:** [DB migration, config flag, cache invalidation, ...]

---

## Checks

| Category | Check | Result | Evidence / Notes |
|----------|-------|--------|------------------|
| Build | CI passes (lint, build) | Pass / Fail | [Run link] |
| Tests | Unit tests pass | Pass / Fail | Coverage: X% |
| Tests | Integration tests pass | Pass / Fail | |
| Tests | E2E tests pass | Pass / Fail | |
| Security | No secrets committed | Pass / Fail | gitleaks clean |
| Security | Dependency audit clean for CRITICAL/HIGH | Pass / Fail | npm audit / pip-audit |
| Performance | Latency / memory within budget | Pass / Fail | [Perf dashboard link] |
| Docs | README / API docs updated | Pass / Fail | |
| Breaking change | Changelog + migration guide | Pass / Fail | [Link] |
| Rollback | Rollback plan documented | Pass / Fail | [Link to runbook] |
| Monitoring | Dashboards / alerts updated | Pass / Fail | [Link] |

---

## Code Review

### Reviewer Checklist

- [ ] Logic is correct and matches the requirement / story
- [ ] Error handling and edge cases are addressed
- [ ] Tests are meaningful (not just coverage padding)
- [ ] No duplicated code or unnecessary complexity
- [ ] Logging is sufficient without leaking sensitive data
- [ ] Accessibility / UX considerations addressed (if UI change)

### Comments and Conditions

| # | Comment | Author Response | Resolved? |
|---|---------|-----------------|-----------|
| 1 | | | Yes / No |

---

## Acceptance Criteria Coverage

| AC ID | Verified By | Evidence |
|-------|-------------|----------|
| AC-01 | Unit test / manual demo | [Test file / video] |
| AC-02 | | |

---

## Merge Decision

| Decision | By | Date | Conditions (if merge blocked) |
|----------|----|------|-------------------------------|
| Merge | | | |
| Request changes | | | |
| Approve | | | |

**Merged by:** [Name]  
**Merged at:** YYYY-MM-DD HH:MM  
**Deployed to:** [env] at YYYY-MM-DD HH:MM  

---

## Post-Merge Actions

- [ ] Update project board / ticket status
- [ ] Notify stakeholders / team channel
- [ ] Monitor dashboard for 1h after deploy
- [ ] Close linked requirement / story (if applicable)

```

---

## Approval Notes
- **Author** is responsible for completing all **Checks** before requesting review.
- **Reviewer(s)** must verify that all required evidence is present; do not approve based on trust alone.
- **PM / Tech Lead** must approve for breaking changes or cross-cutting concerns.
- For protected branches with CI gates, merge is allowed only after **all required checks pass**.

## Source / Audit
- **Template Version:** 1.0
- **Created:** 2026-06-19
- **Source Workflow:** `workflows/code-quality-guard/`
- **Related Templates:** `templates/requirements/acceptance-criteria.md`, `playbooks/quality/code-quality-guard.md`
- **Governance:** GitFlow / Trunk-Based Development best practices; PMBOK Direct and Manage Project Work