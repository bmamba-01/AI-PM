# Meeting Intelligence Workflow

## Purpose

Manage meeting preparation, transcript analysis, minutes, decisions, action items, and follow-up sync.

## Triggers

- CLI: `ai-pm meeting prepare`
- CLI: `ai-pm meeting summarize`
- desktop meeting workspace
- chat command
- calendar event reminder

## Inputs

- calendar event
- agenda or meeting objective
- previous meeting notes
- related issues or documents
- transcript or notes
- attendee list

## Steps

1. Load PM and Meeting Intelligence context.
2. Identify meeting type and expected outcome.
3. Gather related decisions, risks, issues, and open actions.
4. Draft agenda before the meeting when requested.
5. Process transcript or notes after the meeting.
6. Extract decisions, action items, risks, blockers, and open questions.
7. Map action items to target systems such as Jira, Linear, or local memory.
8. Draft MoM.
9. Request approval before publishing or syncing external updates.

## Output

```yaml
meeting_id: string
summary: string
decisions:
  - decision: string
    owner: string
    source_ref: string
action_items:
  - action: string
    owner: string
    due_date: string
    target_system: string
risks:
  - string
open_questions:
  - string
publish_recommendation: string
confidence: 0-100
```

## Approval Gates

Approval is required before:

- sending MoM
- creating or updating work items
- publishing decisions to Confluence, Notion, or Drive

## Audit Fields

- meeting source
- transcript or notes source
- generated MoM path
- proposed external mutations
- approval record

