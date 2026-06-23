# tracking.verify_completion

Use this before accepting agent completion.

1. Re-read the tracker item using the assigned `tracking.external_task_id`.
2. Verify the returned `tracking_update.external_task_id` matches the assigned task exactly.
3. Verify the tracker status changed to the expected done or blocked state, or that a valid dry-run payload exists.
4. Verify report or evidence references are present.
5. Reject the agent result if the tracker id is missing, mismatched, or not attempted.

Accept completion only when tracker state, output status, and evidence agree.
