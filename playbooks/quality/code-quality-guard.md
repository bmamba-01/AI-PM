# Code Quality Guard Playbook

## Mission

Review human and AI-generated code against business requirements, technical quality, test evidence, and delivery risk before merge.

## When to Use

- PR opened or updated
- Pre-merge review on protected branches
- Failed CI or quality gate
- PM asks whether code is safe to merge
- Release readiness review

## Inputs

- PR or local diff
- Changed files list
- Requirements and acceptance criteria
- Test results and coverage report
- CI logs
- Architecture guidance
- Security policy (if applicable)

## Step-by-Step PR Review Procedure

1. Identify the linked requirement, user story, or change request.
2. Map changed files to requirements and acceptance criteria.
3. Inspect test evidence for each changed area.
4. Classify findings by severity.
5. Determine merge readiness.
6. Record recommendation and evidence paths.

## Evidence Checklist

- [ ] Requirement or linked work item identified
- [ ] Acceptance criteria listed and mapped to changed code
- [ ] Unit tests added or updated for logic changes
- [ ] Integration tests added or updated for API or data changes
- [ ] E2E tests added or updated for user-facing flows
- [ ] Coverage report reviewed for regressions
- [ ] CI status green for build, lint, tests, and security scan
- [ ] Secrets scan clean (no hardcoded credentials, tokens, or keys)
- [ ] Dependency audit reviewed for critical/high vulnerabilities
- [ ] Docs updated for user-visible or API changes

## Severity Classification

| Severity | Meaning | Example |
|----------|---------|---------|
| Critical | Merge blocker. Data loss, security breach, broken auth, payment risk. | Missing input validation on payment endpoint |
| High | Should block merge unless explicit exception approved. | Broken core workflow; missing rollback for DB migration |
| Medium | Should be fixed before merge; may be waived with documented risk acceptance. | Weak error handling returning 500 without context |
| Low | Nice to fix. Style, naming, small refactors. | Inconsistent log format |

## Merge Readiness Criteria

- All P0/P1 CI checks pass
- No critical or high open findings without explicit waiver
- Required tests present and passing
- Security scan clean for critical/high
- Rollback or mitigation documented for migration or infra changes

## Common Anti-Patterns to Catch

- AI-generated test files that assert nothing or use fake fixtures
- Overbroad refactors mixed with feature work in one PR
- Catch-all exception blocks that hide root cause
- Unused imports, dead code, or commented-out blocks
- Hardcoded URLs, credentials, or environment-specific values
- Missing `.env` validation or default secrets in config
- Large binary files or generated artifacts committed to repo

## Approval Rules

- Do not mark merge-ready without test or verification evidence.
- Prefer specific file and line references.
- Separate defects from style preferences.
- If requirement context is missing, note that business compliance cannot be fully verified.
- For AI-generated code, check for overbroad rewrites, fake tests, dead code, and unvalidated assumptions.

## Output Format

```yaml
merge_readiness: ready|not_ready|needs_human_decision
summary: string
critical_findings:
  - string
high_findings:
  - string
medium_findings:
  - string
missing_tests:
  - string
requirement_gaps:
  - string
verification_seen:
  - string
recommendation: string
```

## Related Playbooks

- `playbooks/quality/testing-strategy.md`
- `playbooks/requirements/acceptance-criteria.md` (if present)
- `playbooks/roles/developer.md`
