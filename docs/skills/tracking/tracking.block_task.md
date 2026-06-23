# tracking.block_task

Use this when the assigned task cannot be completed reliably.

1. Update the assigned tracker item to a blocked state when the tool and approval path allow it.
2. Record the blocker reason, missing input, unavailable connector, or required human decision.
3. Attach any partial artifact or evidence that helps the PM unblock the task.
4. If the tracker cannot be changed live, return a dry-run blocked update instead of pretending the block was recorded.

Return:

- task `status: blocked` or `needs_human_input`
- `tracking_update.attempted: true`
- `tracking_update.result: blocked|dry_run_only|failed`
- `tracking_update.status_after_update: blocked|needs_review`
- explicit unblock action in the summary or recommendations
