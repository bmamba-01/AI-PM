# Subagent Protocol

## Purpose

This protocol standardizes delegation between the PM Commander and specialist or role agents. Agents should use this contract when work is split across subagents or when a task result must be auditable.

## Task Contract

```yaml
task_id: string
project_id: string
requested_by: pm_commander|human_pm|scheduler|chat_gateway|cli|desktop
assigned_agent: pm|ba|qa|developer|tech_lead|stakeholder|delivery_control|risk_issue|meeting|reporting|code_quality_guard
objective: string
tracking:
  tool: notion|jira|linear|github|excel|local_memory
  mode: live|dry_run|local_import|manual
  external_task_id: string
  external_task_url: string
  status_field: string
  done_status: string
  update_required_on_completion: true
  skill_required:
    orchestrator_create: string
    agent_complete: string
context:
  methodology: scrum|kanban|waterfall|hybrid|unknown
  project_type: tm|fixed_cost|maintenance|product_delivery|unknown
  source_refs:
    - type: jira|linear|github|gitlab|confluence|notion|file|email|calendar|chat|transcript|local_db
      id: string
      description: string
constraints:
  - string
required_outputs:
  - name: string
    format: markdown|json|yaml|table|diff|checklist
quality_gate:
  checklist_id: string
  approval_required: true|false
deadline: ISO-8601|string
```

## Output Contract

```yaml
task_id: string
status: completed|blocked|failed|needs_human_input
summary: string
tracking_update:
  tool: notion|jira|linear|github|excel|local_memory
  external_task_id: string
  external_task_url: string
  attempted: true|false
  result: updated|dry_run_only|blocked|failed
  status_after_update: string
  report_url: string
  evidence_refs:
    - string
findings:
  - severity: critical|high|medium|low|info
    title: string
    detail: string
    source_ref: string
recommendations:
  - action: string
    owner: string
    priority: critical|high|medium|low
artifacts:
  - path_or_url: string
    type: report|template|issue|pr|note|test_plan|risk_register|review
confidence: 0-100
open_questions:
  - string
audit:
  sources_used:
    - string
  assumptions:
    - string
  approvals_required:
    - string
  next_agent_suggested: string
```

## Quality Rules

- Do not return `completed` if required source data was unavailable and no fallback was valid.
- Do not return `completed` if `tracking.update_required_on_completion` is true and the agent did not attempt the required tracking update.
- If the tracking tool is unavailable, return `blocked` or `needs_human_input` unless the task contract explicitly allows `dry_run` or `local_import` completion.
- The PM Commander must reject an agent output whose `tracking_update.external_task_id` does not match the assigned task contract.
- Use `needs_human_input` when a decision depends on business judgment.
- Use `blocked` when a connector, file, credential, or required artifact is missing.
- Use `failed` when the agent attempted the task but could not produce a reliable result.
- Confidence below 70 requires explicit assumptions and reviewer recommendation.
- External mutations must be returned as proposed actions, not executed directly, unless approval is already recorded.

## Handoff Format

When an agent hands work to another agent, include:

- original objective
- tracking tool, external task id, and external task URL
- summarized context
- exact source references
- current assumptions
- output expected from the next agent
- time or priority constraint

## Tracking Tool Contract

The PM Commander must resolve the tracking tool from the active project profile before delegating work. If a project is configured with `tracking.system: notion`, the commander creates or updates the Notion task first, then passes the Notion page id and URL in the subagent task contract.

The same rule applies to other trackers:

| `tracking.tool` | External task identifier | Completion update |
|---|---|---|
| `notion` | Notion page id | Set status property, attach report/evidence URL, add completion summary |
| `jira` | Jira issue key | Transition issue, add comment with evidence, attach links |
| `linear` | Linear issue id/key | Move status, add comment, attach links |
| `github` | GitHub issue/PR number | Add label/status comment, link artifacts |
| `excel` | Workbook path + row id | Update row status and report columns |
| `local_memory` | `.ai-pm/memory` task id | Update memory task and artifact refs |

Agents must use the `skill_required.agent_complete` instruction specified in the task. If the tool is unavailable, the agent must still produce a dry-run payload showing the exact update it would have made.

## Reviewer Contract

Reviewer agents must check:

- whether the assigned agent used the right playbook
- whether outputs match the requested format
- whether findings are supported by sources
- whether approval rules were followed
- whether risks and open questions are visible

For code review, reviewers must also check:

- requirement compliance
- test evidence
- changed-file risk
- regression potential
- security and maintainability concerns
