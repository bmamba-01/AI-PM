# Agent 1 Prompt — MCP/CLI WIP Repair

> **Date:** 2026-06-19  
> **Requested by:** Orchestrator  
> **Priority:** Critical — blocks all runtime work  
> **Depends on:** None  
> **Blocks:** Agent 3 (MCP validation), Agent 4 (workflow schemas integration), all main-thread runtime tasks

---

## Task Contract

```yaml
task_id: agent-1-mcp-cli-repair
project_id: ai-pm-toolkit
requested_by: orchestrator
assigned_agent: developer
objective: |
  Repair the MCP and CLI packages so that pnpm --filter @ai-pm/mcp build
  and pnpm --filter @ai-pm/cli build both pass. Remove code that is
  outside package boundaries and fix all type/import errors introduced
  by earlier WIP work.
context:
  methodology: hybrid
  project_type: product_delivery
  source_refs:
    - type: file
      id: docs/superpowers/plans/2026-06-19-next-runtime-functions.md
      description: Active plan with known blockers section
    - type: file
      id: docs/superpowers/plans/2026-06-19-repo-status-report.md
      description: Review report with 5 identified blockers
    - type: file
      id: docs/agent-delegation/2026-06-19-delegation-forecast.md
      description: Delegation forecast showing Agent 1 scope
constraints:
  - Do not modify packages/core/ — it is currently green
  - Do not modify playbooks/, workflows/, templates/, or docs/operating-model/
  - Do not add new features — only repair what is broken
  - Do not change business logic in MCP registry/profile validation
  - Keep all changes minimal and focused on build repair
  - Every fix must be verifiable with pnpm --filter @ai-pm/mcp build
    and pnpm --filter @ai-pm/cli build
required_outputs:
  - name: build-repair-summary
    format: markdown
  - name: changed-files
    format: table
  - name: verification-results
    format: table
quality_gate:
  checklist_id: mcp-cli-repair-gate
  approval_required: false
deadline: as-soon-as-possible
```

---

## Prompt

```text
You are Agent 1 working on the AI-PM Toolkit repository.
Your task is to repair the MCP and CLI packages so they build cleanly.

## Step 0: Read context files (in order)

1. AGENTS.md
2. README.md
3. docs/superpowers/specs/2026-06-18-ai-pm-toolkit-design.md
4. docs/superpowers/plans/2026-06-19-next-runtime-functions.md
5. docs/superpowers/plans/2026-06-19-repo-status-report.md
6. docs/operating-model/subagent-protocol.md
7. packages/mcp/package.json
8. packages/mcp/tsconfig.json
9. packages/cli/package.json
10. packages/cli/tsconfig.json

## Step 1: Understand the current state

The repo has these known blockers preventing MCP and CLI from building:

**Blocker A — Root `mcp/` directory contains duplicate source files:**
- `mcp/src/connectionManager.ts` — duplicate of `packages/mcp/src/connectionManager.ts`,
  but with many errors: missing `fs` import, wrong variable name `index` vs `existingIndex`
  on line 134, undefined `configPath` on line 175, undefined `MCPConfig` type reference.
- `mcp/serverRegistry.ts` — duplicate `MCPRegistry` class that imports from
  `./connectionManager` (root level, not package level).

These files are OUTSIDE the package boundary and must be REMOVED.

**Blocker B — Circular self-export in `packages/mcp/src/registry/index.ts`:**
```ts
export * from "./configTypes.js";
export * from "./configLoader.js";
export * from "./configValidator.js";
export * from "./index.js";   // ← THIS IS A CIRCULAR IMPORT, DELETE THIS LINE
```

**Blocker C — CLI imports `validateConfigs` from wrong module:**
In `packages/cli/src/commands/mcp.ts` line 7:
```ts
import { validateConfigs, loadRegistry, loadProfile, loadBuiltinProfiles }
  from '@ai-pm/mcp/registry/configLoader';
```
But `validateConfigs` is exported from `configValidator.ts`, NOT `configLoader.ts`.

**Blocker D — MCP package.json missing exports:**
`packages/mcp/package.json` exports map is missing `./registry/configValidator`.
It only has `./registry/configLoader` and `./connectionManager`.

**Blocker E — MCP package.json may need `./registry` re-export:**
The `./registry` export in package.json points to `dist/registry/index.js` which
re-exports everything. After fixing Blocker B (circular import), this should work
if the CLI imports from `@ai-pm/mcp/registry` instead of `@ai-pm/mcp/registry/configLoader`.

## Step 2: Execute fixes

### Fix A — Remove duplicate files outside package boundary

Delete these files (they are NOT inside packages/mcp/):
- mcp/src/connectionManager.ts
- mcp/serverRegistry.ts

After deletion, verify that `mcp/` directory only contains:
- mcp/registry.yaml (YAML config — keep)
- mcp/profiles/*.yaml (YAML profiles — keep)
- mcp/contracts/*.md (contract docs — keep)
- mcp/examples/*.yaml (example configs — keep)
- mcp/src/ should NOT exist after cleanup

### Fix B — Remove circular self-export

Edit `packages/mcp/src/registry/index.ts`:
Remove the line: `export * from "./index.js";`

The file should become:
```ts
export * from "./configTypes.js";
export * from "./configLoader.js";
export * from "./configValidator.js";
```

### Fix C — Fix CLI import path

Edit `packages/cli/src/commands/mcp.ts` line 7.

Change:
```ts
import { validateConfigs, loadRegistry, loadProfile, loadBuiltinProfiles }
  from '@ai-pm/mcp/registry/configLoader';
```

To either:
Option 1 — Import from registry barrel (recommended if Blocker B is fixed):
```ts
import { loadRegistry, loadProfile, loadBuiltinProfiles }
  from '@ai-pm/mcp/registry/configLoader';
import { validateConfigs }
  from '@ai-pm/mcp/registry/configValidator';
```

Option 2 — If package.json doesn't export configValidator separately:
```ts
import { loadRegistry, loadProfile, loadBuiltinProfiles }
  from '@ai-pm/mcp/registry';
import { validateConfigs }
  from '@ai-pm/mcp/registry';
```

Choose the option that matches the package.json exports map after Fix D.

### Fix D — Add missing MCP package exports

Edit `packages/mcp/package.json`. Add this export entry:

```json
"./registry/configValidator": {
  "import": "./dist/registry/configValidator.js",
  "types": "./dist/registry/configValidator.d.ts"
}
```

OR update the existing `./registry` export to ensure it covers all three
sub-modules (configTypes, configLoader, configValidator). The barrel
`dist/registry/index.js` should handle this if the circular import is fixed.

## Step 3: Verify

Run these commands after all fixes:

```bash
# 1. Confirm duplicate files are gone
ls mcp/src/ 2>&1  # should say "No such file or directory"
ls mcp/serverRegistry.ts 2>&1  # should say "No such file or directory"

# 2. Confirm mcp/ only has config/docs files
find mcp -type f 2>&1

# 3. Build MCP package
pnpm --filter @ai-pm/mcp build

# 4. Build CLI package
pnpm --filter @ai-pm/cli build

# 5. Full repo build
pnpm build

# 6. Run core tests (should still pass)
pnpm --filter @ai-pm/core test

# 7. Check git status
git status --short
```

## Step 4: Report

Return your output using the subagent protocol output contract:

```yaml
task_id: agent-1-mcp-cli-repair
status: completed | blocked | failed
summary: one-line description of what you did
findings:
  - severity: info | medium | high | critical
    title: short title
    detail: what you found and what you did
    source_ref: file path
recommendations:
  - action: what should happen next
    owner: who should do it
    priority: medium | high
artifacts:
  - path_or_url: file path
    type: report | diff | test_result
confidence: 0-100
open_questions:
  - any remaining issues
audit:
  sources_used:
    - list of files you read
  assumptions:
    - any assumptions made
  approvals_required:
    - none expected for this repair
  next_agent_suggested: Agent 3 (MCP validation) can start after this
```

## Critical reminders

- Do NOT add new features.
- Do NOT refactor code style.
- Do NOT modify packages/core/.
- Do NOT change business logic.
- ONLY fix what is broken to make builds pass.
- Keep changes minimal — every changed line must be justified.
- If something is unclear, use `needs_human_input` status and explain.
```

---

## Expected Output Contract

```yaml
task_id: agent-1-mcp-cli-repair
status: completed
summary: >
  Removed duplicate MCP source files from root mcp/ directory,
  fixed circular self-export in registry barrel, corrected CLI
  import paths for validateConfigs, and added missing MCP package
  exports. Both @ai-pm/mcp and @ai-pm/cli now build successfully.
findings:
  - severity: critical
    title: Root mcp/src/ contained duplicate source files
    detail: >
      mcp/src/connectionManager.ts and mcp/serverRegistry.ts were
      duplicates of files in packages/mcp/src/ with additional type
      errors. Removed them.
    source_ref: mcp/src/connectionManager.ts, mcp/serverRegistry.ts
  - severity: critical
    title: Circular self-export in registry barrel
    detail: >
      packages/mcp/src/registry/index.ts exported from itself,
      creating infinite recursion. Removed the self-import line.
    source_ref: packages/mcp/src/registry/index.ts
  - severity: high
    title: CLI imported validateConfigs from wrong module
    detail: >
      validateConfigs lives in configValidator.ts but was imported
      from configLoader.ts. Fixed import path.
    source_ref: packages/cli/src/commands/mcp.ts
  - severity: medium
    title: MCP package.json missing configValidator export
    detail: >
      Added ./registry/configValidator export entry to
      packages/mcp/package.json.
    source_ref: packages/mcp/package.json
recommendations:
  - action: >
      Run pnpm --filter @ai-pm/mcp test to verify MCP tests pass
    owner: orchestrator
    priority: high
  - action: >
      Agent 3 (MCP validation) can now begin work
    owner: agent-3
    priority: medium
artifacts:
  - path_or_url: git diff output
    type: diff
  - path_or_url: build output
    type: test_result
confidence: 90
open_questions: []
audit:
  sources_used:
    - AGENTS.md
    - README.md
    - docs/superpowers/plans/2026-06-19-next-runtime-functions.md
    - docs/superpowers/plans/2026-06-19-repo-status-report.md
    - packages/mcp/package.json
    - packages/mcp/tsconfig.json
    - packages/mcp/src/registry/index.ts
    - packages/mcp/src/registry/configLoader.ts
    - packages/mcp/src/registry/configValidator.ts
    - packages/cli/src/commands/mcp.ts
    - packages/cli/package.json
    - mcp/src/connectionManager.ts (deleted)
    - mcp/serverRegistry.ts (deleted)
  assumptions:
    - Root mcp/ directory should only contain YAML/MD config files
    - No runtime code should exist outside packages/ directory
  approvals_required: []
  next_agent_suggested: Agent 3 (MCP validation layer)
```
