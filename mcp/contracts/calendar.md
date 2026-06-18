# Calendar MCP Contract

## Purpose

Normalize Google Calendar, Outlook Calendar, Teams meetings, and local calendar imports.

## Entities

```yaml
event:
  id: string
  title: string
  start: string
  end: string
  attendees:
    - string
  organizer: string
  location_or_link: string
  agenda: string
  related_documents:
    - string
  response_status: accepted|declined|tentative|unknown
```

## Read Operations

- list events
- read event detail
- read attendee status
- read event attachments
- detect recurring meetings

## Mutations

All mutations require approval:

- create event
- update event
- cancel event
- send invite
- add agenda or attachment

## Degraded Mode

If calendar is unavailable, meeting workflows should accept manual meeting metadata and mark calendar coverage unavailable.

