# tracking.sync_local_mirror

Use this after task creation, status updates, and completion verification.

1. Update the `.ai-pm/memory` task record with the current tracker tool, mode, external id, URL, status, and artifact refs.
2. Preserve the same task identity across create, complete, block, and verify steps.
3. Store pending approval state when a live tracker mutation did not happen yet.
4. Do not overwrite a newer local record with older tracker data.
5. If sync fails, report the mismatch and keep the orchestration result open for review.

The local mirror must stay traceable by task id, skill id, and tracker id.
