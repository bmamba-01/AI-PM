# Delegation Forecast

> **Last updated:** 2026-06-19 (post all wave-1 completions)

## Completed Wave — All Agents

| Agent | Task | Status | Output |
|---|---|---|---|
| Agent 1 | Repair MCP/CLI WIP | ✅ Done | `packages/mcp` and `packages/cli` build again |
| Agent 2 | Move/clean PM templates | ✅ Done | 9 templates in `templates/` (README trim pending) |
| Agent 3 | MCP registry/profile validation | ✅ Done | `ai-pm mcp validate` works |
| Agent 4 | Workflow JSON schemas (7) | ✅ Done | `schemas/workflows/` |
| Agent 4 | Schema expansion (4) | ✅ Done | `schemas/audit/`, `schemas/approval/`, `schemas/subagent/` |
| Agent 4 | Schema hardening + fixtures | ✅ Done | 3 fields patched, 20 test fixtures |
| Agent 5 | Approval queue UX spec | ✅ Done | `docs/product/approval-queue-ux.md` |
| Agent 5 | Approval queue runtime contract | ✅ Done | `docs/architecture/approval-queue-runtime-contract.md` |
| Agent 5 | Approval queue CLI spec | ✅ Done | `docs/product/approval-queue-cli-spec.md` |

## In-flight / Not Started

| Agent | Task | Status |
|---|---|---|
| Agent 6 | Desktop Daily Briefing panel | Not started |

## Repo Status

**GREEN.** All packages build. All core tests pass. No blockers.

## Main Thread — Ready to Start

| Task | Plan Reference | Status |
|------|---------------|--------|
| `ai-pm audit list` | Task 2 | Ready |
| `ai-pm project scan` | Task 3 | Ready |
| Core approval queue runtime | Task 4 | Ready — full specs available |
| Workflow schema validation | Task 5 | Ready — schemas + fixtures available |

## Next Delegatable Tasks

### Agent 4: Input Schemas for Remaining Workflows

Currently only `daily-briefing` has an input schema. The other 6 workflows rely on the subagent task contract for inputs, but runtime validation benefits from explicit input schemas. Agent 4 should create:

- `schemas/workflows/meeting-intelligence.input.schema.json`
- `schemas/workflows/scope-control.input.schema.json`
- `schemas/workflows/risk-control.input.schema.json`
- `schemas/workflows/reporting.input.schema.json`
- `schemas/workflows/code-quality-guard.input.schema.json`
- Valid + invalid fixtures for each

See: `2026-06-19-agent-4-followup-v3-prompt.md`

### Agent 2: README Trim (low priority)

Fix `templates/README.md` to list only the 9 templates that actually exist.

See: `2026-06-19-agent-2-followup-prompt.md`

### Agent 6: Desktop Daily Brief Panel

Static read-only UI panel using sample data.

See: `2026-06-18-agent-prompts.md` Prompt 6

### Agent 5: Resolved Open Questions (optional)

10 open questions in UX spec + runtime contract need PM owner decisions before full implementation.
