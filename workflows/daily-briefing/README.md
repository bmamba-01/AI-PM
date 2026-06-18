# Daily Briefing Workflow

## Purpose

Create a morning command view for the PM from local memory and available MCP sources.

## Triggers

- CLI: `ai-pm daily brief`
- desktop: Daily Brief view
- chat: "daily brief" or equivalent command
- scheduler: morning workday schedule

## Inputs

- calendar events today and next 7 days
- unread or important emails
- changed issues, PRs, bugs, and blockers
- risk register
- pending approvals
- report schedule
- local project memory

## Steps

1. Identify project, methodology, and project type.
2. Load PM role playbook and relevant methodology/project-type playbooks.
3. Query available MCP sources according to `mcp/registry.yaml`.
4. Fall back to local files and memory when a connector is unavailable.
5. Classify items into priorities, meetings, blockers, risks, approvals, and follow-ups.
6. Detect conflicts, stale items, and missing owners.
7. Draft the PM briefing.
8. Record source coverage and assumptions.

## Output

```yaml
date: ISO-8601
project_id: string
top_priorities:
  - string
meetings_to_prepare:
  - string
urgent_blockers:
  - string
risks_to_review:
  - string
pending_approvals:
  - string
suggested_followups:
  - string
source_coverage:
  - string
assumptions:
  - string
confidence: 0-100
```

## Approval Gates

No approval is needed to generate the briefing. Approval is required before sending any follow-up message or updating external work items.

## Audit Fields

- run time
- sources queried
- unavailable connectors
- assumptions
- generated output path
- proposed external actions

