# Documentation MCP Contract

## Purpose

Normalize Confluence, Notion, Google Drive, and local document sources.

## Entities

```yaml
document:
  id: string
  title: string
  type: page|doc|sheet|slide|markdown|pdf
  owner: string
  version: string
  updated_at: string
  approval_status: draft|reviewed|approved|unknown
  url_or_path: string
  linked_requirements:
    - string
```

## Read Operations

- search documents
- read document content
- read metadata
- read comments
- read version history when available

## Mutations

All mutations require approval:

- create document
- update document
- publish document
- share document
- comment on document

## Degraded Mode

If documentation MCP is unavailable, agents should use local `docs/`, `playbooks/`, `templates/`, and user-provided files.

