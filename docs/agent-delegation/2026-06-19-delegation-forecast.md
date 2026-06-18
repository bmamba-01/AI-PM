# Delegation Forecast

This file predicts the next useful standalone tasks for agents after the current wave finishes. Do not start these until the current assigned task is either complete or explicitly abandoned.

## Current Wave

| Agent | Current Task | Expected Output | Blocking Risk |
|---|---|---|---|
| Agent 1 | Repair MCP/CLI WIP after scope mismatch | `packages/mcp` and `packages/cli` build again | High: current WIP breaks build |
| Agent 2 | Move/clean PM templates into `C:\Works\AI-PM\templates` | 9 templates under correct repo | Medium: wrong workspace path already happened once |
| Agent 3 | MCP registry/profile validation layer | `ai-pm mcp validate` | High: overlaps with Agent 1 if not coordinated |
| Agent 4 | Workflow JSON schemas | `schemas/workflows/*` | Low: docs-only if scoped correctly |
| Agent 5 | Approval queue UX/runtime contract docs | `docs/product`, `docs/architecture` | Low |
| Agent 6 | Desktop Daily Briefing panel | desktop read-only UI | Medium: desktop build must stay green |

## Next Delegatable Tasks

### Candidate A: Template Index and Metadata

Best for: Agent 2 after template relocation passes.

Scope:

- Add `templates/templates.yaml`.
- Add category, workflow mapping, approval requirement, output format, and owner role for each template.
- Do not edit runtime code.

Verification:

```bash
rg --files templates
rg -n "id:|workflow:|approval_required:|category:" templates/templates.yaml
```

### Candidate B: Workflow Schema Coverage Expansion

Best for: Agent 4 after first schema set passes.

Scope:

- Add schemas for audit record, approval item, subagent task, subagent output.
- Work only in `schemas/`.

Verification:

```bash
rg --files schemas
rg -n "\"\\$schema\"|\"required\"|\"properties\"" schemas
```

### Candidate C: Approval Queue CLI Spec

Best for: Agent 5 after approval UX docs.

Scope:

- Design CLI commands only as docs:
  - `ai-pm approval list`
  - `ai-pm approval approve <id>`
  - `ai-pm approval reject <id>`
  - `ai-pm approval revise <id>`
- Work only in `docs/product` and `docs/architecture`.

Verification:

```bash
rg -n "approval list|approval approve|approval reject|revision_requested" docs/product docs/architecture
```

### Candidate D: Desktop Daily Brief Runtime Wiring Plan

Best for: Agent 6 after static panel builds.

Scope:

- Write integration plan only.
- Do not implement IPC yet.
- Define data contract between CLI/core daily brief and desktop panel.

Verification:

```bash
rg -n "DailyBriefing|auditRef|sourceCoverage|confidence" docs/architecture docs/product
```

### Candidate E: MCP Validation Hardening

Best for: Agent 3 after `ai-pm mcp validate` works.

Scope:

- Add fixtures for invalid registry/profile cases.
- Add validation for duplicate profile entries, empty capabilities, and unknown workflow IDs.
- Keep read-only.

Verification:

```bash
pnpm --filter @ai-pm/mcp test -- src/registry/configValidator.test.ts
pnpm --filter @ai-pm/mcp build
```

## Main Thread Should Keep

Do not delegate these until repo is green:

- `ai-pm audit list`
- `ai-pm project scan`
- core approval queue runtime
- workflow schema runtime validator
- final MCP/CLI integration merge decisions

