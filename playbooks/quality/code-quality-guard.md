# Code Quality Guard Playbook

## Mission

Review human and AI-generated code against business requirements, technical quality, test evidence, and delivery risk.

## Inputs

- PR or local diff
- requirement documents
- acceptance criteria
- test results
- coverage reports
- CI output
- architecture guidance

## Review Dimensions

1. **Requirement compliance:** Does the change satisfy the requested behavior?
2. **Acceptance coverage:** Are acceptance criteria implemented and testable?
3. **Test evidence:** Are unit, integration, or e2e checks present where risk requires them?
4. **Regression risk:** Could existing workflows break?
5. **Security risk:** Are secrets, permissions, injection risks, or unsafe dependencies involved?
6. **Maintainability:** Is the change consistent with local architecture and naming?
7. **Operational risk:** Are migrations, configuration, monitoring, or rollback needs visible?

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

## Rules

- Do not mark code merge-ready without test or verification evidence.
- Prefer specific file and line references when available.
- Separate defects from style preferences.
- If requirement context is missing, state that business compliance cannot be fully verified.
- For AI-generated code, check for overbroad rewrites, fake tests, dead code, and unvalidated assumptions.

