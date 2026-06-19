# Agent 1 Follow-up Prompt — Complete MCP/CLI Repair

> **Date:** 2026-06-19  
> **Requested by:** Orchestrator  
> **Priority:** Critical — blocks all runtime work  
> **Depends on:** Agent 1 initial WIP (partially completed)  
> **Blocks:** Agent 3, Agent 4, all main-thread runtime tasks

---

## Task Contract

```yaml
task_id: agent-1-mcp-cli-repair-v2
project_id: ai-pm-toolkit
requested_by: orchestrator
assigned_agent: developer
objective: |
  Complete the MCP/CLI build repair. You already made partial progress:
  added the validate command to CLI, added configLoader export to
  package.json, and reorganized registry/index.ts. Five critical
  blockers remain. Fix them all and verify both packages build.
context:
  methodology: hybrid
  project_type: product_delivery
  source_refs:
    - type: file
      id: docs/agent-delegation/2026-06-19-agent-1-review.md
      description: Detailed review of your partial progress and remaining blockers
    - type: file
      id: docs/superpowers/plans/2026-06-19-next-runtime-functions.md
      description: Active plan with blockers section
    - type: file
      id: docs/superpowers/plans/2026-06-19-repo-status-report.md
      description: Repo status report with 5 identified blockers
constraints:
  - Do not modify packages/core/ — it is currently green
  - Do not modify playbooks/, workflows/, templates/, or docs/operating-model/
  - Do not add new features — only repair what is broken
  - Do not change business logic in MCP registry/profile validation
  - Keep all changes minimal and focused on build repair
  - Every fix must be verifiable with pnpm build
required_outputs:
  - name: build-repair-summary
    format: markdown
  - name: changed-files
    format: table
  - name: verification-results
    format: table
quality_gate:
  checklist_id: mcp-cli-repair-gate-v2
  approval_required: false
deadline: as-soon-as-possible
```

---

## Prompt

```text
You are Agent 1 working on the AI-PM Toolkit repository.
You previously made partial progress on MCP/CLI build repair.
This prompt asks you to COMPLETE the remaining work.

## Step 0: Read context files

1. docs/agent-delegation/2026-06-19-agent-1-review.md
   (detailed review of your partial work and 5 remaining blockers)
2. packages/mcp/package.json
3. packages/mcp/tsconfig.json
4. packages/cli/package.json
5. packages/cli/tsconfig.json
6. packages/mcp/src/registry/index.ts
7. packages/mcp/src/registry/configLoader.ts
8. packages/mcp/src/registry/configValidator.ts
9. packages/cli/src/commands/mcp.ts

## Step 1: What you already did (KEEP these)

These changes are correct and should be preserved:

- packages/cli/src/commands/mcp.ts: validate command (lines 141-192) ✅
- packages/mcp/package.json: ./registry/configLoader export ✅

## Step 2: Fix remaining 5 blockers

### Fix A — Delete duplicate files outside package boundary

Run:
```bash
rm mcp/src/connectionManager.ts
rm mcp/serverRegistry.ts
```

Verify `mcp/` only contains YAML/MD files:
```bash
find mcp -type f
# Expected: registry.yaml, profiles/*.yaml, contracts/*.md, examples/*.yaml
# mcp/src/ directory should NOT exist
# mcp/serverRegistry.ts should NOT exist
```

### Fix B — Fix circular self-import in registry barrel

Edit `packages/mcp/src/registry/index.ts`.

Current content (WRONG):
```ts
export * from "./configTypes.js";
export * from "./configLoader.js";
export * from "./configValidator.js";
export * from "./index.js";   // ← THIS LINE MUST BE DELETED
```

Corrected content:
```ts
export * from "./configTypes.js";
export * from "./configLoader.js";
export * from "./configValidator.js";
```

DELETE line 4 (`export * from "./index.js";`). This is a circular self-import
that will cause build failure.

### Fix C — Fix CLI import path for validateConfigs

Edit `packages/cli/src/commands/mcp.ts` line 7.

Current (WRONG):
```ts
import { validateConfigs, loadRegistry, loadProfile, loadBuiltinProfiles }
  from '@ai-pm/mcp/registry/configLoader';
```

Corrected (split into two imports):
```ts
import { loadRegistry, loadProfile, loadBuiltinProfiles }
  from '@ai-pm/mcp/registry/configLoader';
import { validateConfigs }
  from '@ai-pm/mcp/registry/configValidator';
```

`validateConfigs` lives in `configValidator.ts`, NOT `configLoader.ts`.

### Fix D — Add configValidator export to package.json

Edit `packages/mcp/package.json`. Add this entry inside "exports":

```json
"./registry/configValidator": {
  "import": "./dist/registry/configValidator.js",
  "types": "./dist/registry/configValidator.d.ts"
}
```

Place it after the configLoader entry. The final exports block should have:
- "."
- "./registry"
- "./wrappers"
- "./registry/configLoader"
- "./registry/configValidator"   ← NEW
- "./connectionManager"

### Fix E — Fix MCPRegistry class location

`packages/mcp/src/registry/types.ts` currently contains a full MCPRegistry
class implementation. A file named `types.ts` should only contain type
definitions.

Two options (pick ONE):

Option 1 (recommended): Move the MCPRegistry class back into index.ts,
above the barrel exports:

```ts
// packages/mcp/src/registry/index.ts

import type { BaseMCPWrapper } from "../wrappers/base.js";

export class MCPRegistry {
  private connections = new Map<string, BaseMCPWrapper>();
  private healthCheckInterval = 30000;

  register(wrapper: BaseMCPWrapper): void {
    this.connections.set(wrapper.getConnection().id, wrapper);
  }

  async connectAll(): Promise<void> {
    for (const [id, wrapper] of this.connections) {
      try {
        await wrapper.connect();
        wrapper.startHealthCheck(this.healthCheckInterval);
        console.log(`[mcp] connected: ${id}`);
      } catch (err) {
        console.error(`[mcp] failed to connect ${id}:`, err);
      }
    }
  }

  async disconnectAll(): Promise<void> {
    for (const [id, wrapper] of this.connections) {
      wrapper.stopHealthCheck();
      try { await wrapper.disconnect(); } catch {}
      console.log(`[mcp] disconnected: ${id}`);
    }
  }

  async callTool(connectionId: string, toolName: string, args: Record<string, any>): Promise<any> {
    const wrapper = this.connections.get(connectionId);
    if (!wrapper) throw new Error(`Connection ${connectionId} not found`);
    return wrapper.callTool(toolName, args);
  }

  getStatus(): Record<string, any> {
    const status: Record<string, any> = {};
    for (const [id, wrapper] of this.connections) {
      status[id] = wrapper.getConnection();
    }
    return status;
  }

  getConnectedCount(): number {
    return [...this.connections.values()].filter(w => w.getConnection().status === "connected").length;
  }

  getTotalCount(): number { return this.connections.size; }
  setHealthCheckInterval(ms: number): void { this.healthCheckInterval = ms; }
}

export * from "./configTypes.js";
export * from "./configLoader.js";
export * from "./configValidator.js";
```

Then delete `packages/mcp/src/registry/types.ts` (or leave it empty
if other files import from it — check first with `rg "types" packages/mcp/src/`).

Option 2: Rename `types.ts` to `registry.ts` and update any imports.

Choose Option 1 unless you find that other files specifically import
from `./types.js`.

## Step 3: Verify

Run these commands AFTER all fixes:

```bash
# 1. Confirm duplicate files are gone
ls mcp/src/ 2>&1          # should say "No such file or directory"
ls mcp/serverRegistry.ts 2>&1  # should say "No such file or directory"

# 2. Confirm mcp/ only has config/docs files
find mcp -type f

# 3. Confirm no circular imports
rg "export.*from.*\"\.\/index" packages/mcp/src/registry/index.ts
# should return NOTHING

# 4. Confirm validateConfigs imported from correct module
rg "validateConfigs" packages/cli/src/commands/mcp.ts
# should show import from configValidator, NOT configLoader

# 5. Confirm configValidator export exists in package.json
rg "configValidator" packages/mcp/package.json

# 6. Build MCP package
pnpm --filter @ai-pm/mcp build

# 7. Build CLI package
pnpm --filter @ai-pm/cli build

# 8. Full repo build
pnpm build

# 9. Run core tests (should still pass)
pnpm --filter @ai-pm/core test

# 10. Check git status
git status --short
```

## Step 4: Report

Return your output using the subagent protocol output contract:

```yaml
task_id: agent-1-mcp-cli-repair-v2
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

- Your previous work (validate command, configLoader export) is GOOD. Keep it.
- Do NOT rewrite the validate command or configLoader export.
- Do NOT add new features.
- Do NOT refactor code style.
- Do NOT modify packages/core/.
- ONLY fix the 5 blockers listed above.
- Keep changes minimal — every changed line must be justified.
- If something is unclear, use `needs_human_input` status and explain.
```
