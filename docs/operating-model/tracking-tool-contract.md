# Tracking Tool Contract

## Purpose

Every delegated task must be traceable in the project-selected tracking tool. The PM Commander cannot delegate an agent task as a loose prompt only. It must create or bind a tracked work item first, then pass that tracking reference to the agent.

## Source Of Truth

The active project profile selects the tracking system:

```yaml
tracking:
  system: notion|jira|linear|github|excel|local_memory
  mode: live|dry_run|local_import|manual
  database_name: string
  sync_policy: approval_required|read_only|local_only
```

For the AI-PM self-test project, `tracking.system` is `notion` and current mode is `local-import-ready`. Until a live Notion MCP/API connector is configured, the toolkit must produce dry-run or CSV-import updates rather than claiming live sync.

## Required Lifecycle

```text
PM request
→ resolve active project profile
→ resolve tracking tool and mode
→ create/bind tracker task
→ write local memory mirror
→ generate agent task contract with tracking id/url
→ agent performs work
→ agent updates tracker through required completion skill
→ agent returns output contract with tracking_update
→ PM Commander verifies tracker status and evidence
→ PM Commander marks orchestration completed
```

## Built-In Skill Registry

| Skill id | Owner | Purpose |
|---|---|---|
| `tracking.resolve_project_tracker` | Orchestrator | Read project profile and choose tracker adapter |
| `tracking.create_task` | Orchestrator | Create or bind a task in the configured tool before delegation |
| `tracking.prepare_agent_contract` | Orchestrator | Add tracking metadata and required completion skill to the agent prompt |
| `tracking.complete_task` | Agent | Update the configured tracker when work is completed |
| `tracking.block_task` | Agent | Mark or report blocked state with reason and required input |
| `tracking.verify_completion` | Orchestrator | Re-read tracker state and verify output evidence before accepting completion |
| `tracking.sync_local_mirror` | Orchestrator | Keep `.ai-pm/memory` aligned with the external tracker |

## Adapter Requirements

Every tracking adapter must implement the same logical operations:

```yaml
adapter_id: notion|jira|linear|github|excel|local_memory
capabilities:
  - create_task
  - get_task
  - update_status
  - attach_report
  - add_comment
  - list_project_tasks
safe_modes:
  - live
  - dry_run
  - local_import
mutation_policy:
  create_task: approval_required
  update_status: approval_required
  attach_report: approval_required
  add_comment: approval_required
```

When the project tracker is live but mutation approval has not been granted, the adapter must create an approval item and return `approval_required`. When the tracker is not connected, the adapter must return `dry_run_only` and write a local import artifact.

## Task Creation Payload

The PM Commander must create task payloads with these fields:

```yaml
project_id: string
title: string
description: string
assigned_agent: string
workflow_id: string
priority: critical|high|medium|low
status: ready|in_progress|blocked|done
due_date: ISO-8601|string
acceptance_criteria:
  - string
verification_commands:
  - string
source_refs:
  - string
local_memory_task_id: string
external_task_id: string
external_task_url: string
```

## Agent Completion Payload

Agents must return this completion payload even when the external tool is unavailable:

```yaml
task_id: string
project_id: string
tracking_update:
  tool: notion|jira|linear|github|excel|local_memory
  external_task_id: string
  external_task_url: string
  attempted: true
  result: updated|dry_run_only|blocked|failed
  status_after_update: done|blocked|needs_review
  report_url: string
  evidence_refs:
    - string
summary: string
verification:
  commands:
    - command: string
      result: pass|fail|not_run
      notes: string
```

The PM Commander must not accept `completed` unless `tracking_update.attempted` is true and the external task id matches the assigned task.

## Tool-Specific Completion Rules

### Notion

- Create or bind a Notion page in the configured project database.
- Store Notion page id and URL in the agent prompt.
- On completion, set the Status property to the configured done value, attach report/evidence links, and add a completion summary.
- If live Notion is unavailable, update the local CSV/import artifact and return `dry_run_only`.

### Jira

- Create or bind a Jira issue key.
- On completion, transition the issue to the configured done status and add a comment with verification evidence.
- If transition metadata is unavailable, return `needs_human_input`.

### Linear

- Create or bind a Linear issue id/key.
- On completion, move the issue to the configured done state and add a comment with report/evidence links.

### Excel

- Create or bind a row id in the configured workbook/table.
- On completion, update status, completed date, report path, agent id, and verification summary columns.

### Local Memory

- Create or bind a `.ai-pm/memory` task id.
- On completion, update task status and attach artifact refs.

## Verification Rules

The PM Commander validates:

- task exists in the configured tracker
- assigned agent matches the task contract
- status changed to the expected completion state or dry-run payload exists
- report/evidence links are present
- local memory mirror is synchronized
- no external mutation bypassed approval policy
