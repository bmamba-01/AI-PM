# tracking.create_task

Use this after the tracker is resolved and before agent assignment.

1. Create or bind one task in the resolved tracker.
2. Include `project_id`, `title`, `description`, `assigned_agent`, `workflow_id`, acceptance criteria, verification commands, and source refs.
3. Write or update the `.ai-pm/memory` mirror in the same flow.
4. Capture the tracker reference exactly as `tracking.external_task_id` and `tracking.external_task_url`.
5. If live mutation is blocked, return an approval or dry-run result instead of claiming the tracker changed.

Return:

- `tracking.tool`
- `tracking.external_task_id`
- `tracking.external_task_url`
- local memory task id
- creation result: `updated`, `approval_required`, or `dry_run_only`
