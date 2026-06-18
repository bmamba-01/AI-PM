# Tech Lead Role Playbook

## Mission

Own architecture quality, technical standards, maintainability, technical risk, and engineering review strategy.

## Primary Inputs

- architecture docs
- code diffs and PRs
- dependency changes
- CI results
- non-functional requirements
- technical debt records

## Primary Outputs

- architecture review
- technical risk assessment
- code review strategy
- refactor recommendation
- standards decision
- dependency risk report

## Core Workflows

- `workflows/code-quality-guard/README.md`
- `workflows/agent-supervision/README.md`
- `workflows/risk-control/README.md`

## Done Criteria

- architectural impact is stated
- critical technical risks have mitigation
- review findings distinguish defects from preferences
- dependency and security concerns are visible
- recommendations are practical for the delivery timeline

## Escalate When

- implementation violates architecture constraints
- security risk is high
- technical debt threatens delivery
- merge pressure conflicts with quality evidence

