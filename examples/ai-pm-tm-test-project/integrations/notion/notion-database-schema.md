# Notion Database Schema

Database name: `AI-PM Toolkit T&M Test`

## Properties

| Property | Type | Required | Notes |
|---|---|---|---|
| Title | Title | Yes | Issue or feature name |
| Type | Select | Yes | Feature, Bug, Task, Risk, Chore |
| Status | Select | Yes | Backlog, Ready, In Progress, Review, Done, Blocked |
| Priority | Select | Yes | Critical, High, Medium, Low |
| Owner | Person/Text | Yes | `PM` for this test project |
| Sprint | Select | Yes | `Sprint 2026-06-21` |
| Due Date | Date | Yes | Must not exceed 2026-06-28 |
| Source | Select | Yes | CLI, Desktop, Mobile, MCP, Chat, Docs |
| Acceptance Criteria | Text | Yes | Clear done condition |
| Verification | Text | Yes | Command or manual smoke |
| Approval Required | Checkbox | Yes | True for external mutations |
| External System | Multi-select | No | Notion, Discord, Hermes, MCP |
| External Issue ID | Text | No | ID in external system (Jira, GitHub, etc.) |
| External Link | URL | No | Direct link to external issue |
| Sync Status | Select | No | synced, pending_sync, sync_failed, manual_only |
| Last Synced At | Date | No | When last synced to Notion |

## Sync Policy

Until Notion MCP/API is connected, use `issues.csv` as the source file for import. Any automated Notion write must create an approval item first.

## Sync Flow

```
Import from issues.csv → Notion database
  - Validate CSV against schema
  - Map columns to Notion properties
  - Import rows as Notion database pages
  - Set sync_status: synced
  - Set last_synced_at: current timestamp
```

## Degraded Mode

When Notion MCP/API is not available:
- All items marked as `sync_status: manual_only`
- UI shows degraded badge
- `mcp doctor` reports missing Notion token
- CLI includes degraded source note in output
