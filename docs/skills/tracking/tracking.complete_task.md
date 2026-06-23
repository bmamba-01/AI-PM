# tracking.complete_task

Use this before returning `completed`.

1. Update the assigned tracker item referenced by `tracking.external_task_id`.
2. Set the tracker status to the task contract's `tracking.done_status`.
3. Attach or reference the report path, artifact path, or evidence links.
4. Add a short completion summary that matches the delivered work.
5. If the configured tool is unavailable, return a dry-run payload only when the contract allows `dry_run` or `local_import`; otherwise return `blocked` or `needs_human_input`.

Always return `tracking_update` with:

- `attempted: true`
- matching `tool`, `external_task_id`, and `external_task_url`
- `result: updated|dry_run_only|failed`
- `status_after_update`
- `report_url`
- `evidence_refs`
