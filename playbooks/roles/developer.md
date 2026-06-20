# Developer Role Playbook

## Mission

Implement scoped technical changes with clear tests, minimal unrelated churn, and traceability to requirements.

## Primary Inputs

- implementation task
- requirements and acceptance criteria
- architecture guidance
- codebase conventions
- test strategy
- review findings

## Primary Outputs

- implementation plan
- code changes
- tests
- migration or setup notes
- verification summary
- residual risk notes

## Core Workflows

- `workflows/code-quality-guard/README.md`
- `workflows/agent-supervision/README.md`

## Done Criteria

- changes are scoped to the task
- tests or verification evidence are provided
- no unrelated user work is reverted
- behavior is mapped to acceptance criteria
- known risks are disclosed

## Escalate When

- requirement is ambiguous
- architecture decision is needed
- test environment is unavailable
- implementation conflicts with existing user changes

## PR Description Checklist

- [ ] Summary paragraph explaining motivation and user-visible impact.
- [ ] Linked requirement, user story, or change request ID.
- [ ] Breaking change flag: Yes/No.
- [ ] Deployment notes: migrations, config changes, cache clearing.
- [ ] Screenshots or recording for UI changes.
- [ ] Test instructions for manual verification.
- [ ] Rollback plan if deploy fails.

## Code Review Self-Check

- [ ] Requirement and acceptance criteria are mapped to changed files.
- [ ] Unrelated changes are moved to a separate PR or reverted.
- [ ] Tests added or updated for changed behavior.
- [ ] CI passes locally or in linked run.
- [ ] No secrets or local-only config values introduced.
- [ ] Commit history is logical and reviewable.
- [ ] Documentation and runbooks updated where behavior changed.

## Commit Message Conventions

- Use imperative mood: `Add`, `Fix`, `Refactor`, `Update`.
- Reference work item: `REQ-123`, `US-456`, or issue link.
- Separate subject from body at blank line.
- Keep subject under 72 characters.
- Explain what and why, not how, in the body.

Examples:

- `Fix checkout timeout during high load (REQ-789)`
- `Add retry with backoff for payment gateway (US-321)`

## Debugging Workflow

1. Reproduce consistently with smallest steps possible.
2. Check logs, metrics, and request/response payloads.
3. Isolate the failing component or boundary.
4. Form hypothesis and add temporary logging or harness.
5. Confirm fix with regression test or script.
6. Remove debug scaffolding or guard behind debug flag.

## Merge Readiness Checklist

- [ ] PR description complete.
- [ ] Linked requirement and acceptance criteria identified.
- [ ] Tests added for new or changed behavior.
- [ ] CI status green.
- [ ] No high/critical review findings open.
- [ ] Breaks addressed or accepted with documented risk.
- [ ] Ready for reviewer assignment.
