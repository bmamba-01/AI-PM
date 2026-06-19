# Agent 1 WIP Review — MCP/CLI Repair Scope

**Reviewer:** Orchestrator  
**Date:** 2026-06-19  
**Scope checked:** Repair MCP/CLI WIP so `@ai-pm/mcp build` and `@ai-pm/cli build` pass  
**Source:** Delegation forecast + 2026-06-19-agent-1-prompt.md

---

## Scope history

Agent 1 was originally assigned "Operating Layer Consistency Review" (2026-06-18-agent-prompts.md Prompt 1). It was then re-assigned to "Repair MCP/CLI WIP after scope mismatch" per the delegation forecast. This review checks the MCP/CLI repair scope.

---

## What Agent 1 has DONE (partial progress)

### 1. `packages/mcp/package.json` — added configLoader export

Added:
```json
"./registry/configLoader": {
  "import": "./dist/registry/configLoader.js",
  "types": "./dist/registry/configLoader.d.ts"
}
```
**Status:** Done. But `./registry/configValidator` export is still MISSING.

### 2. `packages/cli/src/commands/mcp.ts` — added validate command

Added a full `validate` subcommand (lines 141-192) with `--json` and `--profile` options. Added import line for registry functions. Added bilingual messages for "validate" action.

**Status:** Done. But the import is WRONG — `validateConfigs` is imported from `@ai-pm/mcp/registry/configLoader` but it lives in `configValidator.ts`.

### 3. `packages/mcp/src/registry/index.ts` — changed from class to barrel exports

Replaced the MCPRegistry class with barrel re-exports:
```ts
export * from "./configTypes.js";
export * from "./configLoader.js";
export * from "./configValidator.js";
export * from "./index.js";   // ← CIRCULAR SELF-IMPORT
```

**Status:** Partially done. Line 4 (`export * from "./index.js"`) is a circular self-import that will cause build failure or undefined behavior.

### 4. `packages/mcp/src/registry/types.ts` — now contains MCPRegistry class

The MCPRegistry class (formerly in index.ts) appears to have been moved here. However, a file named `types.ts` containing a full class implementation is misleading. This should be `registry.ts` or the class should stay in `index.ts` alongside the barrel exports.

---

## What Agent 1 has NOT DONE (remaining blockers)

### Blocker A: Root `mcp/` duplicate files still exist

```
mcp/src/connectionManager.ts    ← STILL EXISTS (should be deleted)
mcp/serverRegistry.ts           ← STILL EXISTS (should be deleted)
```

These are duplicates of files in `packages/mcp/src/` with additional type errors. They must be removed.

### Blocker B: Circular self-import in registry barrel

`packages/mcp/src/registry/index.ts` line 4:
```ts
export * from "./index.js";  // ← imports itself, infinite loop
```
Must be deleted.

### Blocker C: CLI imports validateConfigs from wrong module

`packages/cli/src/commands/mcp.ts` line 7:
```ts
import { validateConfigs, loadRegistry, loadProfile, loadBuiltinProfiles }
  from '@ai-pm/mcp/registry/configLoader';
```
`validateConfigs` is exported from `configValidator.ts`, not `configLoader.ts`. This import will fail at build time.

### Blocker D: Missing configValidator export in package.json

`packages/mcp/package.json` has no `./registry/configValidator` entry. Even if the CLI import is fixed, TypeScript won't resolve the module.

### Blocker E: MCPRegistry class in wrong file

`packages/mcp/src/registry/types.ts` contains a full class implementation. The file name `types.ts` implies type definitions only. This should be renamed to `registry.ts` or the class should be kept in `index.ts`.

---

## Status summary

| Blocker | Description | Status |
|---------|-------------|--------|
| A | Root `mcp/src/` and `mcp/serverRegistry.ts` exist | NOT FIXED |
| B | Circular self-import in `registry/index.ts` | NOT FIXED |
| C | CLI imports `validateConfigs` from `configLoader` | NOT FIXED |
| D | Missing `configValidator` export in `package.json` | NOT FIXED |
| E | MCPRegistry class in `types.ts` (wrong name) | NOT FIXED |

**Completion estimate:** ~20% done. The validate command was added correctly, but 5 critical blockers remain unfixed. Builds will still fail.

---

## Recommended approach for follow-up

Agent 1 should NOT start from scratch. The validate command and configLoader export are good work. The follow-up prompt should instruct Agent 1 to:

1. Delete root `mcp/src/connectionManager.ts` and `mcp/serverRegistry.ts`
2. Fix `registry/index.ts` — remove circular self-import, keep barrel exports, move MCPRegistry class to proper location
3. Add `configValidator` export to `package.json`
4. Fix CLI import — split `validateConfigs` to import from `configValidator`
5. Verify both builds pass
