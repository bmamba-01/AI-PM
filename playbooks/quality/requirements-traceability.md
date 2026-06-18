# Requirements Traceability Playbook

## Mission

Connect requirements, acceptance criteria, implementation, tests, defects, and approvals.

## Traceability Fields

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

