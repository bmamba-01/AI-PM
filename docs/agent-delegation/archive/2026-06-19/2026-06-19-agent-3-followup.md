# Agent 3 Follow-Up Prompt

Use this prompt for the same agent that created the MCP implementation matrix.

```text
You are Agent 3 continuing MCP work on the AI-PM Toolkit repository.

Start by reading these files in order:
1. AGENTS.md
2. README.md
3. docs/superpowers/specs/2026-06-18-ai-pm-toolkit-design.md
4. docs/architecture/mcp-implementation-matrix.md
5. docs/architecture/mcp-connector-lifecycle.md
6. mcp/registry.yaml
7. mcp/profiles/default.yaml
8. mcp/profiles/offline-local.yaml
9. mcp/examples/project-mcp-profile.yaml
10. packages/mcp/src/registry/index.ts
11. packages/mcp/src/connectionManager.ts
12. packages/cli/src/commands/mcp.ts

Your job:
- Build the first implementation-ready MCP registry/profile validation layer.
- Focus on read-only validation and status reporting. Do not implement real external connector calls.
- Do not modify docs/architecture unless you find a contradiction while implementing.
- Do not touch local memory/audit code under packages/core/src/runtime.
- Do not touch desktop/mobile UI.

Required implementation:
1. Add TypeScript types for the YAML registry/profile shape in packages/mcp.
2. Add a loader that reads:
   - mcp/registry.yaml
   - mcp/profiles/default.yaml
   - mcp/profiles/offline-local.yaml
   - optionally a project profile path passed by caller
3. Add validation that detects:
   - profile server IDs missing from registry
   - workflow recommended/minimum servers missing from registry
   - mutation capabilities present while global approval policy is missing
   - connector contracts referenced by registry but missing under mcp/contracts/
4. Add CLI command:
   - ai-pm mcp validate
   - ai-pm mcp validate --profile mcp/examples/project-mcp-profile.yaml
5. Output should be human-readable by default and JSON with --json.

Constraints:
- If you need a YAML parser, check package.json first. If no YAML parser exists, add a small dependency deliberately and explain why.
- Keep validation read-only.
- Do not store tokens.
- Do not call external MCP servers.
- Keep existing mcp add/list/remove/toggle behavior working.

Expected files to modify or create:
- packages/mcp/package.json if a YAML parser dependency is needed
- packages/mcp/src/registry/configTypes.ts
- packages/mcp/src/registry/configLoader.ts
- packages/mcp/src/registry/configValidator.ts
- packages/mcp/src/registry/index.ts
- packages/mcp/src/registry/configValidator.test.ts
- packages/cli/src/commands/mcp.ts
- packages/cli/package.json only if CLI needs direct dependency changes

Expected output:
1. Summary of implementation.
2. Files changed.
3. Validation failures found in current registry/profile, if any.
4. Commands run and results.
5. Any follow-up needed before real connector implementation.

Verification commands:
pnpm --filter @ai-pm/mcp test -- src/registry/configValidator.test.ts
pnpm --filter @ai-pm/mcp build
pnpm --filter @ai-pm/cli build
node packages/cli/bin/ai-pm.js mcp validate --json
node packages/cli/bin/ai-pm.js mcp validate --profile mcp/examples/project-mcp-profile.yaml --json
git diff --stat packages/mcp packages/cli
```

