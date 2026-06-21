# Notion Tracking Contract

## Purpose

Notion database as issue/feature tracker for the AI-PM project.

## Database Schema

See `examples/ai-pm-tm-test-project/integrations/notion/notion-database-schema.md`.

| Property | Type | Purpose |
|----------|------|---------|
| Title | title | Issue/feature name |
| Type | select | feature, bug, task, risk, chore |
| Status | select | backlog, ready, in_progress, review, done, blocked |
| Priority | select | critical, high, medium, low |
| Owner | text | Responsible person |
| Sprint | select | Sprint label |
| Due Date | date | Target date |
| Source | select | CLI, desktop, mobile, mcp, chat, docs |
| Acceptance Criteria | text | Clear done condition |
| Verification | text | Command or manual smoke |
| Approval Required | checkbox | External mutation gate |
| External System | multi-select | Target systems |
| External Issue ID | text | ID in external system (Jira, GitHub, etc.) |
| External Link | url | Direct link to external issue |
| Sync Status | select | synced, pending_sync, sync_failed, manual_only |
| Last Synced At | date | When last synced |

## Sync Rules

1. **Import only first:** Use `issues.csv` for initial database population. No automated sync until explicitly approved.
2. **All mutations approval-gated:** Creating or updating Notion database rows requires PM approval.
3. **Dry-run default:** The sync contract validates what would be written without executing.
4. **Rollback:** Synced rows include `sync_status` and `last_synced_at` to track what was written.
5. **Conflict resolution:** If Notion data was changed manually, skip sync rather than overwrite.

## Degraded Mode

If Notion MCP/API is not available:
- Mark `sync_status: manual_only` for all items
- Show degraded badge in UI
- CLI output includes degraded source note
- `mcp doctor` reports Notion as unavailable with missing token warning

## Environment Variables

```bash
# Required for live sync (optional — offline-first is default)
NOTION_API_TOKEN=ntn_xxxxx
NOTION_DATABASE_ID=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

## Approval Flow

```
Agent proposes sync
  → dry-run validation
  → PM approval via approval queue
  → sync execution (if approved)
  → audit record
  → rollback on failure
```

## Rollback

Synced items store their Notion page IDs. On rollback:
1. Delete or revert Notion pages
2. Update `sync_status: rolled_back`
3. Record in audit trail
