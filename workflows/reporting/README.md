# Reporting Workflow

## Purpose

Generate accurate PM reports for internal, client, steering, sprint, release, and executive audiences.

## Triggers

- CLI report command
- scheduled weekly report
- steering committee preparation
- sprint close
- release readiness review
- client status request

## Inputs

- issue tracker status
- milestone plan
- risk register
- scope changes
- budget or burn data
- meeting decisions
- quality reports
- pending approvals

## Steps

1. Identify audience and report type.
2. Load PM, Reporting, methodology, and project-type playbooks.
3. Gather facts from available MCP and local sources.
4. Separate internal notes from external-facing facts.
5. Assess RAG status for scope, timeline, risk, budget, and quality.
6. Identify decisions needed and next actions.
7. Draft report.
8. Request approval before publishing externally.

## Output

```yaml
report_type: daily|weekly|client|steering|sprint|release|budget
audience: internal|client|executive|team
rag:
  scope: red|amber|green|unknown
  timeline: red|amber|green|unknown
  risk: red|amber|green|unknown
  budget: red|amber|green|unknown
  quality: red|amber|green|unknown
summary: string
decisions_needed:
  - string
next_actions:
  - owner: string
    action: string
source_coverage:
  - string
confidence: 0-100
```

## Approval Gates

Approval is required before sending or publishing client, stakeholder, steering, or executive reports.

## Audit Fields

- audience
- source systems
- generated report path
- redactions
- approval status

