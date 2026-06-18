# Approval Policy

## Purpose

This policy defines when agents may act automatically and when they must ask for human approval.

## Default Rule

Agents are read-only by default. They may inspect, summarize, draft, classify, and recommend. They must not mutate external systems unless an approval rule explicitly allows it.

## Actions Allowed Without Approval

- read local repository files
- read local project memory
- read configured MCP data
- generate private drafts
- create local analysis files when requested
- run local validation commands
- summarize emails, issues, meetings, and documents
- propose changes to tickets, docs, reports, or PR comments

## Actions Requiring Approval

- send email
- send chat message
- publish meeting minutes
- publish client or stakeholder report
- create, update, transition, assign, or close Jira/Linear/GitHub/GitLab issues
- comment on pull requests
- merge pull requests
- change milestone date or project baseline
- change budget forecast or commercial assumptions
- mark requirement, UAT, milestone, or release as approved
- close or downgrade a high or critical risk
- delete or archive project data
- expose local server externally

## Approval Record

Every approved mutation should record:

```yaml
approval_id: string
requested_by: string
approved_by: string
action_type: string
target_system: string
target_id: string
summary: string
approved_at: ISO-8601
expires_at: ISO-8601|string
scope: once|similar_actions|workflow_run
```

## Rejection Handling

If approval is rejected, the agent should:

- keep the draft or proposed action if useful
- record the rejection reason
- avoid retrying the same action unchanged
- propose an alternative only if there is a materially different approach

## Emergency Escalation

Agents may mark an item as urgent, but urgency does not bypass approval for external mutations. For critical risks, the agent should prepare the fastest safe draft and ask for explicit confirmation.

