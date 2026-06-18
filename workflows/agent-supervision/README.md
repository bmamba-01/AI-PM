# Agent Supervision Workflow

## Purpose

Supervise work performed by agentic coding tools such as Codex, Claude Code, Cursor, Cline, or other autonomous coding agents.

## Triggers

- coding agent completes a task
- coding agent opens a PR
- PM asks for second review
- unexpected code churn appears
- test or CI failure follows agent work

## Inputs

- agent task prompt
- implementation plan
- changed files
- tests and command output
- agent summary
- requirement context
- git status and diff

## Steps

1. Load Developer, Tech Lead, QA, and Code Quality Guard playbooks.
2. Compare agent output against original task and acceptance criteria.
3. Inspect scope of changes for unrelated churn.
4. Verify test evidence and commands.
5. Review changed files for correctness, maintainability, and risk.
6. Identify missing follow-up work.
7. Produce supervision report.
8. Escalate if output is unsafe, incomplete, or overbroad.

## Output

```yaml
agent_under_review: string
task_alignment: aligned|partially_aligned|misaligned|unknown
scope_control: clean|minor_unrelated_changes|major_unrelated_changes
test_evidence: sufficient|insufficient|missing
findings:
  - severity: critical|high|medium|low|info
    detail: string
recommended_next_action: string
approval_required:
  - string
confidence: 0-100
```

## Approval Gates

Approval is required before merging, posting review comments externally, or asking another agent to perform destructive changes.

## Audit Fields

- supervised agent
- task prompt
- diff reference
- test evidence
- supervision result

