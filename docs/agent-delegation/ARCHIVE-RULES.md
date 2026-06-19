# Archive Rules

## When to archive

- A delegation prompt is fully completed and no longer needed
- A review file has been read and actioned
- A follow-up prompt has been superseded by a newer version
- A plan file is no longer the active plan

## Where to archive

- `docs/agent-delegation/archive/YYYY-MM-DD/` — by date
- `docs/plans/archive/` — for historical plans

## What NOT to archive

- Active delegation forecast (`2026-06-19-delegation-forecast.md`)
- Phase 2 prompts (still needed for current coding agents)
- Active plan files referenced in CLAUDE.md
- Memory index files (`.ai-pm/memory/`)
- This housekeeping prompt itself

## How to archive

```bash
# Move completed files
git mv docs/agent-delegation/2026-06-19-agent-1-prompt.md \
       docs/agent-delegation/archive/2026-06-19/

# Update memory index
# Edit .ai-pm/memory/artifacts.yaml to mark status: archived
```

## Review cycle

Review delegation files weekly:
1. Check `delegation-forecast.md` for completed tasks
2. Move completed prompt/review files to archive
3. Update `artifacts.yaml` with new archive paths
4. Clean up any orphaned files
