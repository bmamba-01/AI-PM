# Communication MCP Contract

## Purpose

Normalize Gmail, Slack, Teams, and other communication systems.

## Entities

```yaml
message:
  id: string
  channel_or_thread: string
  sender: string
  recipients:
    - string
  timestamp: string
  subject: string
  body_summary: string
  attachments:
    - string
  detected_actions:
    - string
  detected_decisions:
    - string
```

## Read Operations

- search messages
- read thread
- read attachments
- read channel history
- detect action requests

## Mutations

All mutations require approval:

- send message
- send email
- create draft for external recipient
- update message
- add public reaction or label when visible externally

## Degraded Mode

If communication systems are unavailable, workflows should use local meeting notes, exported messages, or manual summaries.

