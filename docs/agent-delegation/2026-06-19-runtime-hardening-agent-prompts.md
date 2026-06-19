# Runtime Hardening Agent Prompts

> These prompts are standalone. Each agent must read `AGENTS.md`, the current plan, and only work inside its assigned scope.

## Schema Agent: Ajv Format Hardening

```text
Objective: Make workflow schema validation enforce date-time formats without Ajv warnings.

Required reading:
- AGENTS.md
- docs/superpowers/plans/2026-06-19-next-runtime-functions.md
- packages/core/src/workflows/schemaValidation.ts
- packages/core/src/workflows/schemaValidation.test.ts
- packages/core/src/workflows/schemaValidation.integration.test.ts

Scope:
- Modify packages/core/package.json if a dependency is required.
- Modify packages/core/src/workflows/schemaValidation.ts.
- Modify schema validation tests only to assert stricter date-time behavior.
- Update pnpm-lock.yaml if dependency changes.

Requirements:
- Add and register ajv-formats, or use an equivalent minimal solution.
- `format: date-time` must reject invalid date-time values.
- Test output should no longer contain "unknown format \"date-time\" ignored".
- Keep missing-schema graceful degradation behavior.

Do not:
- Rewrite workflow schemas.
- Touch UI, CLI, MCP, or memory code.

Verification:
- pnpm --filter @ai-pm/core test -- src/workflows/schemaValidation.test.ts src/workflows/schemaValidation.integration.test.ts
- pnpm --filter @ai-pm/core build
```

## DB/Memory Agent: Memory CLI And Init Bootstrap

```text
Objective: Make the runtime memory system usable through CLI and initialized by project setup.

Required reading:
- AGENTS.md
- docs/superpowers/plans/2026-06-19-next-runtime-functions.md
- packages/core/src/runtime/memory.ts
- packages/core/src/runtime/memory.test.ts
- packages/cli/src/commands/init.ts
- packages/cli/src/index.ts

Scope:
- Modify packages/cli/src/commands/init.ts to create .ai-pm/memory/ during init.
- Create packages/cli/src/commands/memory.ts.
- Register memory command in packages/cli/src/index.ts and packages/cli/bin/ai-pm.js.
- Add focused tests only if an existing CLI test pattern exists; otherwise add a documented smoke command.
- Add docs/product/memory-cli-spec.md if command behavior needs documentation.

Required commands:
- ai-pm memory summary --json
- ai-pm memory tasks list --status <status> --json
- ai-pm memory artifacts list --status <status> --type <type> --json
- ai-pm memory artifacts archive <artifact_id> --reason <reason>

Rules:
- Use MemoryStore from @ai-pm/core/runtime.
- Treat .ai-pm/ as local runtime data; do not force it into git.
- Do not edit archive files.

Verification:
- pnpm --filter @ai-pm/core test -- src/runtime/memory.test.ts
- pnpm --filter @ai-pm/cli build
- node packages/cli/bin/ai-pm.js memory --help
- node packages/cli/bin/ai-pm.js memory summary --json
```

## API/IPC Agent: Desktop Approval Runtime Bridge

```text
Objective: Expose ApprovalQueue to the desktop renderer through Electron IPC so UI no longer needs Node/runtime imports.

Required reading:
- AGENTS.md
- docs/superpowers/plans/2026-06-19-next-runtime-functions.md
- packages/core/src/runtime/approvalQueue.ts
- packages/desktop/main.ts
- packages/desktop/preload.ts
- packages/desktop/src/global.d.ts
- packages/desktop/src/state/approval-store.ts

Scope:
- Modify packages/desktop/main.ts.
- Modify packages/desktop/preload.ts.
- Modify packages/desktop/src/global.d.ts.
- Do not modify React components except type compatibility requires it.

Required IPC methods:
- approvals:list(filter)
- approvals:count()
- approvals:decide(id, payload)
- approvals:get(id)

Rules:
- Main process owns ApprovalQueue and file-backed access.
- Renderer must not import ApprovalQueue or any Node fs-backed runtime.
- Preserve current MVP behavior if .ai-pm/approvals.json does not exist: return empty list/counts.

Verification:
- pnpm --filter @ai-pm/desktop build
- pnpm --filter @ai-pm/core test -- src/runtime/approvalQueue.test.ts src/runtime/approvalQueue.integration.test.ts
- rg -n "ApprovalQueue|node:fs|localStorage" packages/desktop/src/state packages/desktop/src/components/tabs/ApprovalsTab.tsx
```

## Desktop UI Agent: Approval Store IPC Wiring

```text
Objective: Replace desktop approval localStorage state with the IPC bridge created by the API/IPC Agent.

Required reading:
- AGENTS.md
- docs/superpowers/plans/2026-06-19-next-runtime-functions.md
- packages/desktop/src/state/approval-store.ts
- packages/desktop/src/components/tabs/ApprovalsTab.tsx
- packages/desktop/src/global.d.ts

Depends on:
- API/IPC Agent completion.

Scope:
- Modify packages/desktop/src/state/approval-store.ts.
- Modify packages/desktop/src/components/tabs/ApprovalsTab.tsx only if needed for loading/error states.

Requirements:
- Store calls window.electronAPI.approvals.*.
- No localStorage source of truth for approvals.
- No import from @ai-pm/core/runtime in renderer state.
- Empty approval queue displays a clear empty state.
- Decide actions refresh items and counts.

Verification:
- pnpm --filter @ai-pm/desktop build
- rg -n "localStorage|ApprovalQueue|@ai-pm/core/runtime" packages/desktop/src/state/approval-store.ts packages/desktop/src/components/tabs/ApprovalsTab.tsx
```

## Mobile UI/API Agent: Approval Local Server Client

```text
Objective: Prepare mobile approval UI for laptop-hosted local server access while keeping explicit mock fallback.

Required reading:
- AGENTS.md
- docs/superpowers/plans/2026-06-19-next-runtime-functions.md
- docs/product/approval-queue-mobile-components.md
- docs/architecture/approval-queue-runtime-contract.md
- packages/mobile/src/state/approval-store.ts
- packages/mobile/src/screens/ApprovalsScreen.tsx
- packages/mobile/src/screens/ApprovalDetailScreen.tsx

Scope:
- Modify packages/mobile/src/state/approval-store.ts.
- Modify mobile approval screens only if needed for offline/error indicators.
- Create docs/product/mobile-approval-api-client.md.

Requirements:
- Add a small fetch-based client with configurable base URL.
- Default to explicit mock mode if no server URL is configured.
- UI must show whether data source is "local server" or "mock fallback".
- Do not import Node-only runtime code.

Verification:
- pnpm --filter @ai-pm/mobile build
- rg -n "mock fallback|local server|fetch|baseUrl|@ai-pm/core/runtime" packages/mobile/src docs/product/mobile-approval-api-client.md
```

## Integration Test Agent: Runtime Boundary Checks

```text
Objective: Add verification for the CLI/runtime/UI boundary without broad implementation changes.

Required reading:
- AGENTS.md
- docs/superpowers/plans/2026-06-19-next-runtime-functions.md
- packages/core/src/runtime/approvalQueue.integration.test.ts
- packages/core/src/workflows/schemaValidation.integration.test.ts
- packages/cli/bin/ai-pm.js

Depends on:
- Schema Agent
- DB/Memory Agent
- API/IPC Agent
- Desktop UI Agent

Scope:
- Prefer tests and smoke scripts.
- Only modify implementation if a failing test proves a narrow defect.

Required checks:
- CLI smoke: ai-pm --help, approval --help, approval count --json, memory --help, memory summary --json.
- Core tests still pass.
- Desktop renderer state does not import Node-backed runtime.
- Mobile store has explicit mock fallback and local-server path.

Verification:
- pnpm --filter @ai-pm/core test
- pnpm --filter @ai-pm/cli build
- pnpm --filter @ai-pm/desktop build
- pnpm --filter @ai-pm/mobile build
- node packages/cli/bin/ai-pm.js approval count --json
- node packages/cli/bin/ai-pm.js memory summary --json
```
