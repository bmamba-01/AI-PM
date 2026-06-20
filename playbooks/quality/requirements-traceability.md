# Requirements Traceability Playbook

## Mission

Connect requirements, acceptance criteria, implementation, tests, defects, and approvals so the project retains a clear audit trail from intent to validation.

## When to Use

- BRD review
- backlog refinement
- PR review
- test planning
- UAT readiness
- change request analysis

## Traceability Schema

```yaml
requirement_id: string
source: string
description: string
owner: string
status: draft|approved|changed|implemented|validated|rejected
acceptance_criteria:
  - string
linked_work_items:
  - string
linked_code_refs:
  - string
linked_tests:
  - string
risks:
  - string
approval_ref: string
```

## Traceability Matrix Template

| Requirement ID | Source | AC IDs | Work Items | Code Refs | Tests | Approval | Status |
|---------------|--------|--------|-----------|-----------|-------|-----------|--------|
| REQ-001 | BRD-v2 | AC-01..04 | JIRA-221 | repo/file.py | TP-001 | CR-011 | implemented |

## Linking Requirements to Tests

1. Start from requirement or user story ID.
2. List all acceptance criteria IDs.
3. Map each AC to one or more test cases or automated checks.
4. Test case ID format: `TC-REQ-<id>-<seq>`.
5. Record evidence path: test file, screenshot, run output, or UAT sign-off.

Example:
- REQ-101 -> AC-11, AC-12
- AC-11 -> TC-REQ-101-01 -> run ID `run-2026-06-19-payments`
- AC-12 -> TC-REQ-101-02 -> manual UAT sign-off

## Change Request Impact Analysis Steps

1. Identify requirement or backlog item affected by the change.
2. Check current approval and linked tests.
3. Determine if acceptance criteria must change.
4. Estimate test and verification effort.
5. Propose updated traceability entries.
6. Request approval before updating baseline.

## Rules

- Every requirement should have a source.
- Every acceptance criterion should be testable or explicitly marked as non-testable business judgment.
- Every implemented requirement should link to work item and verification evidence.
- Scope changes after baseline must reference approval or change request.
- Missing traceability is a project risk, not only documentation debt.

## Agent Use

Use this playbook during:

- BRD review
- backlog refinement
- PR review
- test planning
- UAT readiness
- change request analysis

## Minimum Traceability Expectations

- Approved requirements have AC IDs assigned.
- Implemented work has code references.
- Tested items have linked test evidence.
- UAT items have sign-off record or explicit rationale.
