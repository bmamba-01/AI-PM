# MCP Connector Lifecycle

**Version:** 1  
**Date:** 2026-06-19  
**Audience:** Implementers adding new MCP connectors to AI-PM Toolkit.

## Lifecycle Stages

### 1. Registry Declaration

Add the connector to `mcp/registry.yaml` under `servers:`. Required fields:

- `category`: one of `source_control`, `work_tracking`, `documentation`, `communication`, `calendar`, `local_memory`
- `priority`: `1` (core), `2` (enhanced), `3` (advanced)
- `contracts`: list of MCP contract categories this connector fulfills
- `required_for`: list of workflow IDs that depend on this connector
- `read_capabilities`: list of read operations supported
- `mutation_capabilities`: list of mutation operations supported (empty if read-only)

Optional fields:
- `mutation_policy`: override per-connector mutation policy if it differs from global default
- `degraded_mode`: custom degraded behavior guidance

### 2. Contract Assignment

Map the connector to one or more contracts in `mcp/contracts/`:

- `source-control.md` — for git hosting platforms
- `work-tracker.md` — for issue and sprint trackers
- `documentation.md` — for knowledge bases and cloud storage
- `communication.md` — for email and chat platforms
- `calendar.md` — for calendar systems
- `local-memory.md` — for local file and database systems

A connector may fulfill multiple contracts (e.g., GitHub fulfills `source-control` and `work-tracker` via Issues).

### 3. Profile Integration

Add the connector to the appropriate MCP profile:

- `mcp/profiles/default.yaml` — if the connector is part of the recommended online profile
  - `enabled_servers`: active connectors
  - `optional_servers`: connectors that enhance workflows but are not required for core operation
  - `workflow_expectations.<workflow>`: define `minimum_servers` and `recommended_servers` per workflow

- `mcp/profiles/offline-local.yaml` — if the connector is optional or explicitly disabled for offline operation
  - `enabled_servers`: local-only connectors
  - `disabled_online_servers`: connectors that require network access

### 4. Degraded Mode Specification

Document how each workflow behaves when this connector is unavailable:

- Which capabilities are lost?
- What local fallback is used?
- What manual input does the agent request from the user?
- How is the missing source marked in audit output?

### 5. Approval Rules

Define mutation approval requirements:

- Global default: all mutations require approval
- Per-operation override: only if a future policy explicitly exempts an operation
- The matrix in `mcp-implementation-matrix.md` must reflect these rules

### 6. Implementation Order

Connectors are implemented in priority order. `filesystem` is the minimum local fallback; `sqlite` is the target local runtime store for durable workflow state when the file-backed `.ai-pm/` store is outgrown.

1. **Phase 0:** Local foundation (`filesystem`, file-backed `.ai-pm/` store, then `sqlite`) — required before online connectors become dependable
2. **Phase 1:** Primary online connectors (`github`, `jira`, `linear`, `google_gmail`, `google_calendar`, `google_drive`) — support the recommended first build slice
3. **Phase 2:** Secondary connectors (`confluence`, `notion`, `slack`, `teams`) — enhance existing workflows
4. **Phase 3:** Advanced connectors (browser automation, Figma, Sentry, CI systems, finance tools) — added as integrations mature

## Validation Checklist

When adding a new connector, verify:

- [ ] Server entry exists in `mcp/registry.yaml`
- [ ] Contract category is assigned and documented in `mcp/contracts/<contract>.md`
- [ ] Profile entries are updated in `mcp/profiles/default.yaml` and/or `mcp/profiles/offline-local.yaml`
- [ ] Matrix entry is added or updated in `docs/architecture/mcp-implementation-matrix.md`
- [ ] Degraded behavior is defined and documented
- [ ] Approval requirements are explicit
- [ ] No contradiction exists against global default mutations-require-approval policy

## Maintenance Rules

- If a connector is removed from `mcp/registry.yaml`, remove it from all profiles and update `mcp-implementation-matrix.md`.
- If a new capability is added to a connector, update both `registry.yaml` and the matrix.
- If the global default mutation policy changes, update `registry.yaml` defaults and re-evaluate all per-connector overrides.
- Run validation grep after changes:
  - `rg -n "github|jira|linear|filesystem|sqlite|approval|required_for|degraded" docs/architecture mcp/examples`
