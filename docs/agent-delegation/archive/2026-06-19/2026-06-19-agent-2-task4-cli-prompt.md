# Coding Agent 2 — Approval Queue CLI Commands

> **Type:** 🖥️ CODING TASK  
> **Depends on:** Task 4 approval queue runtime (completed)  
> **Blocks:** Coding Agent 3 (UI wiring)

## Task

Create `packages/cli/src/commands/approval.ts` — 7 CLI commands for the approval queue, mapping 1:1 to the runtime contract API.

## Files to create/modify

- Create: `packages/cli/src/commands/approval.ts`
- Modify: `packages/cli/src/index.ts` (add export)
- Modify: `packages/cli/bin/ai-pm.js` (register command)

## Commands to implement

```
ai-pm approval list          --status <s> --priority <p> --json --limit <n>
ai-pm approval show <id>     --json --audit
ai-pm approval decide <id> <approve|reject|revision> --reason <t> --notes <t> --json --yes
ai-pm approval delegate <id> <user> --note <t> --json --yes
ai-pm approval count         --json
ai-pm approval policy list   --json
ai-pm approval policy revoke <id> --json --yes
```

## Key constraints

- Follow pattern from `packages/cli/src/commands/daily.ts` (Commander + chalk + ora)
- Bilingual EN/VI (msgs.en / msgs.vi pattern)
- For MVP: read/write directly to `.ai-pm/approvals.json` via `ApprovalQueue` from `@ai-pm/core/runtime`
- Skip HTTP client for now — use the store directly
- Confirmation prompts for decide/delegate/policy revoke (bypassable with --yes)
- Do NOT modify packages/mcp/ or packages/desktop/

## Context files to read

1. docs/product/approval-queue-cli-spec.md (full command spec)
2. packages/core/src/runtime/approvalQueue.ts (ApprovalQueue class)
3. packages/cli/src/commands/daily.ts (CLI pattern)
4. packages/cli/src/index.ts
5. packages/cli/bin/ai-pm.js

## Verification

```bash
pnpm --filter @ai-pm/cli build
pnpm --filter @ai-pm/core test
node packages/cli/bin/ai-pm.js approval list --json
```
