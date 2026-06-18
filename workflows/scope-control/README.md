# Scope Control Workflow

## Purpose

Detect requirement ambiguity, scope movement, baseline changes, and delivery impact.

## Triggers

- new requirement
- client email
- meeting decision
- backlog refinement
- change request
- PR claiming requirement completion

## Inputs

- BRD, PRD, SRS, FRD
- user stories and acceptance criteria
- change requests
- client messages
- meeting decisions
- current backlog
- project type playbook

## Steps

1. Load BA, PM, methodology, and project-type playbooks.
2. Identify current scope baseline.
3. Extract requirement or requested change.
4. Check source, owner, acceptance criteria, and approval state.
5. Compare against baseline and active backlog.
6. Classify as clarification, backlog refinement, scope change, or defect.
7. For fixed cost, prepare change request recommendation when baseline changes.
8. For T&M, prepare priority, budget, and timeline impact.
9. Produce traceability and impact summary.

## Output

```yaml
scope_item: string
classification: clarification|backlog_refinement|scope_change|defect|unknown
source_ref: string
baseline_impact: none|low|medium|high
timeline_impact: none|low|medium|high
budget_impact: none|low|medium|high
acceptance_criteria_status: clear|missing|ambiguous
recommended_action: string
approval_required: true|false
```

## Approval Gates

Approval is required before changing scope baseline, creating change requests, or marking requirements approved.

## Audit Fields

- source requirement
- baseline compared
- project type rules applied
- impact assessment
- approval need

