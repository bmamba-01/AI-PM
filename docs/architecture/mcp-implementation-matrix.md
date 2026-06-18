# MCP Implementation Matrix

**Version:** 1  
**Date:** 2026-06-19  
**Purpose:** Guide connector implementation priority, capabilities, and degraded behavior for MCP integration work.

## Matrix

| Connector | Priority | Category | Required Workflows | Read Capabilities | Mutation Capabilities | Approval Required | Degraded Mode Behavior |
|---|---|---|---|---|---|---|---|
| filesystem | 1 | local_memory | all_workflows | read_files, list_directories, search_text | write_file, update_file, create_directory | Approval required for published artifacts or external decisions; private local workflow files may be written by policy | Primary fallback; all workflows can operate on local docs and templates |
| sqlite | 1 | local_memory | audit, workflow_state | read_project_state, read_audit_log, read_workflow_runs | write_audit_log, write_workflow_run, update_project_state | Approval required when representing external decisions or published artifacts | Audit and workflow state use local-only history; agents continue without losing state |
| github | 1 | source_control, work_tracker | code-quality-guard, daily-briefing, agent-supervision | read_repositories, read_branches, read_commits, read_pull_requests, read_issues, read_checks | create_issue, update_issue, comment_on_pr, approve_pr, request_pr_changes, merge_pr | All mutations | Fall back to local git and manually imported issue lists |
| jira | 1 | work_tracking | daily-briefing, scope-control, risk-control, reporting | search_issues, read_epics, read_sprints, read_boards, read_versions | create_issue, update_issue, transition_issue, assign_issue, comment_on_issue | All mutations | Fall back to local exports or manually maintained issue files |
| linear | 1 | work_tracking | daily-briefing, scope-control, risk-control, reporting | search_issues, read_projects, read_cycles, read_teams | create_issue, update_issue, assign_issue, comment_on_issue | All mutations | Fall back to local project notes |
| google_gmail | 1 | communication | daily-briefing, meeting-intelligence, reporting | search_messages, read_threads, read_attachments | send_email, create_draft, add_label | All mutations | Skip external email context; agents use meeting notes and manual summaries |
| google_calendar | 1 | calendar | daily-briefing, meeting-intelligence | list_events, read_event, read_attendees | create_event, update_event, send_invite | All mutations | Accept manual meeting metadata; mark calendar coverage unavailable |
| google_drive | 1 | documentation | meeting-intelligence, scope-control, reporting | search_files, read_document, read_metadata | create_document, update_document, share_document | All mutations | Use local repository docs, playbooks, and templates |
| confluence | 2 | documentation | scope-control, meeting-intelligence, reporting | search_pages, read_page, read_comments | create_page, update_page, comment_on_page | All mutations | Use local docs and manual imports |
| notion | 2 | documentation | scope-control, reporting | search_pages, read_page, query_database | create_page, update_page, update_database_item | All mutations | Use local docs and manual imports |
| slack | 2 | communication | daily-briefing, risk-control, chat-gateway | read_channels, read_threads, search_messages | send_message, update_message | All mutations | Use exported transcripts and local summaries |
| teams | 2 | communication, calendar | meeting-intelligence, chat-gateway | read_chats, read_channels, read_meetings | send_message, update_message, create_meeting | All mutations | Use local meeting notes and calendar import |

## Workflow Minimum Server Requirements

| Workflow | Minimum Servers | Recommended Servers |
|---|---|---|
| daily-briefing | filesystem | google_gmail, google_calendar, github, jira, linear |
| meeting-intelligence | filesystem | google_calendar, google_drive, jira |
| scope-control | filesystem | jira, google_drive |
| risk-control | filesystem | jira, slack |
| reporting | filesystem | jira, google_drive |
| code-quality-guard | filesystem | github, jira |

## First Implementation Recommendation

Based on the canonical design spec and Phase 1/Phase 2 exit criteria, the recommended first connector set is:

**Core local foundation (implement first):**
- filesystem — universal fallback and local playbook/template access
- sqlite — audit log, workflow state, and project memory persistence

**Primary online connectors (implement in parallel with CLI slice):**
- github — source control and issue tracking for `code-quality-guard` and `daily-briefing`
- google_gmail — communication context for `daily-briefing`
- google_calendar — meeting context for `daily-briefing` and `meeting-intelligence`
- jira — work tracking for `daily-briefing`, `scope-control`, `risk-control`, `reporting`

This set supports the recommended first build slice:
- AI-readable operating layer
- MCP registry and local profile
- CLI daily briefing
- audit log
- PM Commander task routing
- desktop read-only Daily Brief view

## Approval Policy Summary

- Default access mode: `read_only`
- Default mutation policy: `approval_required`
- Global override in registry: `approval_required_for_all_mutations: true`
- Per-connector contract rules: all mutations require approval unless an explicit exception is documented in a future policy update
- Approval queue actions: approve, reject, request_revision, approve_once, approve_similar_by_policy

## Degradation Principles

1. **Local-first:** `filesystem` is the minimum fallback. `sqlite` is the target local runtime store; until it is implemented, file-backed `.ai-pm/` storage may satisfy local audit and workflow state needs.
2. **Graceful skip:** When an online connector is missing, the workflow runs and flags the missing source rather than failing.
3. **Manual input path:** Missing connectors should allow agents to request human-provided context as a fallback.
4. **Audit transparency:** Every degraded run must record which sources were unavailable and what fallback path was used.
