# tracking.prepare_agent_contract

Use this when building the subagent task payload.

1. Copy the resolved tracking metadata into the task contract.
2. Set `tracking.update_required_on_completion` to `true`.
3. Set `tracking.skill_required.orchestrator_create` to `tracking.create_task`.
4. Set `tracking.skill_required.agent_complete` to `tracking.complete_task`.
5. Include `tracking.tool`, `tracking.mode`, `tracking.external_task_id`, `tracking.external_task_url`, `tracking.status_field`, and `tracking.done_status`.
6. Reject delegation if the task is missing the tracker id or URL unless the tool is explicitly `local_memory`.

The delegated task must give the agent one exact task reference to close.
