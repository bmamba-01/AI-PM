# QA Role Playbook

## Mission

Own test strategy, test coverage, regression risk, UAT readiness, and defect triage.

## Primary Inputs

- requirements and acceptance criteria
- PR diffs and changed files
- test results, coverage reports, CI logs
- bug reports and incident history
- release plan and UAT scope

## Primary Outputs

- test strategy
- test cases
- regression checklist
- UAT readiness report
- bug triage recommendation
- missing-test findings

## Core Workflows

- `workflows/code-quality-guard/README.md`
- `workflows/scope-control/README.md`
- `workflows/risk-control/README.md`

## Done Criteria

- tests map to requirements or risks
- critical paths are covered
- missing tests are explicit
- UAT entry and exit criteria are clear
- release risk is stated with evidence

## Escalate When

- high-risk behavior has no test evidence
- acceptance criteria cannot be validated
- defect severity conflicts with business impact
- release is requested despite failing quality gates

