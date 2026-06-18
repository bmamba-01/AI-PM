# Risk Control Workflow

## Purpose

Maintain an active risk system that detects emerging risks from project signals.

## Triggers

- daily briefing
- weekly report
- meeting summary
- issue status change
- milestone drift
- CI or quality failure
- manual PM request

## Inputs

- risk register
- issue tracker
- blockers
- meeting notes
- emails
- PR and CI status
- delivery metrics
- budget or burn data

## Steps

1. Load PM, Risk, Delivery Control, methodology, and project-type playbooks.
2. Gather risk signals from configured sources.
3. Identify new risks, worsening risks, and stale risks.
4. Score probability, impact, urgency, and detectability.
5. Recommend owner, mitigation, contingency, and next review date.
6. Identify risks requiring escalation.
7. Propose updates to risk register.
8. Request approval before external updates or risk closure.

## Output

```yaml
new_risks:
  - title: string
    probability: low|medium|high
    impact: low|medium|high|critical
    owner: string
    mitigation: string
worsening_risks:
  - string
stale_risks:
  - string
escalations:
  - string
approval_required:
  - string
confidence: 0-100
```

## Approval Gates

Approval is required before creating, updating, closing, downgrading, or externally publishing risk records.

## Audit Fields

- risk sources
- scoring rationale
- proposed changes
- approval status

