# tracking.resolve_project_tracker

Use this before any delegated task.

1. Read `.ai-pm/profile.yaml` for `tracking.system`, `tracking.mode`, `tracking.status_field`, and `tracking.done_status`.
2. Resolve one tracker only: `notion`, `jira`, `linear`, `github`, `excel`, or `local_memory`.
3. Record the resolved tool and mode in the orchestration context.
4. If tracking config is missing, fall back to `local_memory` and state that assumption.
5. If the configured tracker is unavailable, keep the configured tool, downgrade execution to its safe fallback mode, and report the limitation.

Return:

- `tracking.tool`
- `tracking.mode`
- `tracking.status_field`
- `tracking.done_status`
- any fallback or approval assumptions
