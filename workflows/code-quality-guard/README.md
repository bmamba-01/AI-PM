# Code Quality Guard Workflow

## Purpose

Review code changes, especially AI-generated code, against requirements, tests, architecture, and delivery risk.

## Triggers

- PR opened or updated
- local diff review request
- pre-merge review
- failed CI
- PM asks whether code is safe to merge

## Inputs

- PR or local diff
- changed files
- requirements and acceptance criteria
- test results
- coverage report
- CI logs
- architecture guidance

## Steps

1. Load Code Quality Guard, Tech Lead, QA, and BA playbooks.
2. Identify change intent from PR, issue, or task.
3. Map changed files to requirements and acceptance criteria.
4. Inspect tests and verification evidence.
5. Review regression, security, maintainability, and operational risks.
6. Classify findings by severity.
7. Determine merge readiness.
8. Request approval before commenting on PR or changing status.

## Output

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
approval_required:
  - string
confidence: 0-100
```

## Approval Gates

Approval is required before posting PR comments, changing labels, approving PRs, requesting changes, or merging.

## Audit Fields

- PR or diff reference
- requirements used
- tests inspected
- findings
- recommendation

