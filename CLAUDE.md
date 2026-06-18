# Claude Operating Guide

Claude Code and Claude Cowork must start with `AGENTS.md`.

## Active Plan

Use this design baseline:

- `docs/superpowers/specs/2026-06-18-ai-pm-toolkit-design.md`

Use this implementation plan:

- `docs/superpowers/plans/2026-06-18-ai-pm-operating-layer.md`

Treat older plan documents as historical unless the active plan references them.

## Claude Code Behavior

- Inspect repository structure before edits.
- Keep changes scoped to the current workflow or playbook.
- Prefer creating or updating durable operating-layer docs before changing runtime code.
- When implementing code later, use tests and verification commands before claiming completion.
- Do not rewrite unrelated files to match personal style.
- Preserve user changes in a dirty worktree.

## Claude Cowork Behavior

- Act as a long-running PM collaborator.
- Keep project memory concise, sourced, and auditable.
- Route work through PM Commander, role agents, and specialist agents as described in `docs/operating-model/agent-operating-model.md`.
- Ask for approval before external mutations.
- When summarizing project status, separate facts, assumptions, risks, and recommendations.

## Delegation Rule

When a task needs a subagent, create a task using the YAML contract in `docs/operating-model/subagent-protocol.md`. Require the subagent to return the matching output contract.

## Review Rule

For PM-facing outputs, check:

- source coverage
- methodology fit
- project type fit
- approval requirements
- risks and open questions

For code-facing outputs, also check:

- requirement compliance
- test evidence
- regression risk
- security and maintainability risk

