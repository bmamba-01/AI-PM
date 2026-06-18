# Codex Operating Guide

Codex must start with `AGENTS.md`.

## Active Plan

Use this design baseline:

- `docs/superpowers/specs/2026-06-18-ai-pm-toolkit-design.md`

Use this implementation plan:

- `docs/superpowers/plans/2026-06-18-ai-pm-operating-layer.md`

Older documents under `docs/plans/` are historical context unless explicitly referenced by the active plan.

## Codex Workflow

1. Read the active plan and relevant playbooks.
2. Inspect the current worktree.
3. Create or update the smallest set of files required.
4. Use `rg` to validate references and unresolved markers.
5. Run relevant tests or documentation checks.
6. Report what changed, what was verified, and what remains.

## Coding-Agent Supervision

When reviewing work from Codex, Claude Code, Cursor, Cline, or another agentic coding tool:

- compare code changes against requirements and acceptance criteria
- check whether tests cover the changed behavior
- inspect failure modes and edge cases
- separate critical defects from style preferences
- avoid merge-ready recommendations without test evidence

Use:

- `workflows/code-quality-guard/README.md`
- `playbooks/quality/code-quality-guard.md`
- `playbooks/quality/testing-strategy.md`
- `playbooks/quality/requirements-traceability.md`

## MCP Safety

Read-only MCP queries are allowed when configured. Mutations such as creating issues, updating tickets, sending messages, publishing reports, or commenting on PRs require the approval policy in `docs/operating-model/approval-policy.md`.

