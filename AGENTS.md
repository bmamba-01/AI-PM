# AI-PM Agent Entrypoint

This is the first file every AI agent must read before working in this repository.

## Canonical Plan

The latest design baseline is:

- `docs/superpowers/specs/2026-06-18-ai-pm-toolkit-design.md`

The current implementation plan is:

- `docs/superpowers/plans/2026-06-19-pm-orchestrator-master-plan.md`

Older files under `docs/plans/`, `docs/superagent-dashboard-spec.md`, and prior implementation plans are historical context. Do not treat them as active unless the current implementation plan explicitly references them.

## Repository Purpose

AI-PM Toolkit is a local-first operating system and runtime toolkit for a technical Project Manager. It helps AI agents support daily project control, meetings, reporting, risk, scope, timeline, methodology governance, MCP integrations, and code quality supervision.

The repository has two layers:

1. **AI-readable operating layer:** instructions, playbooks, workflow contracts, MCP contracts, templates.
2. **Runtime toolkit:** CLI, local server, desktop app, mobile companion, agent orchestrator, and MCP wrappers.

Build and modify the operating layer first. Runtime packages should consume these files instead of duplicating policy.

## Required Work Order

1. Read this file.
2. Read the canonical design spec.
3. Read the current implementation plan.
4. Inspect existing files before editing.
5. Select the relevant playbook and workflow.
6. Make focused changes.
7. Validate references and unresolved markers.
8. Summarize changed files, assumptions, and verification.

## Safe Defaults

- Treat all MCP access as read-only unless an approval policy explicitly allows mutation.
- Do not send emails, chat messages, PR comments, issue updates, or report publications without approval.
- Do not overwrite human work or revert unrelated files.
- Record meaningful assumptions in the output.
- Prefer small, auditable steps over broad rewrites.
- If project context is missing, degrade gracefully and state which data sources were unavailable.

## How To Pick Context

- For agent routing and delegation, read `docs/operating-model/agent-operating-model.md`.
- For subagent task format, read `docs/operating-model/subagent-protocol.md`.
- For external mutations, read `docs/operating-model/approval-policy.md`.
- For role-specific work, read `playbooks/roles/`.
- For methodology-specific work, read `playbooks/methodologies/`.
- For project commercial model, read `playbooks/project-types/`.
- For code review and testing, read `playbooks/quality/`.
- For executable workflows, read `workflows/<workflow>/README.md`.
- For integrations, read `mcp/registry.yaml` and `mcp/contracts/`.

## Agent Output Standard

Every substantial agent response should include:

- objective handled
- sources inspected
- changes made or analysis result
- risks or assumptions
- verification performed
- next recommended action

For delegated work, use the contracts in `docs/operating-model/subagent-protocol.md`.
