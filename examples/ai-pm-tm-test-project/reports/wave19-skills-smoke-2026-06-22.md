# Wave 19 Skills Smoke - 2026-06-22

## Objective

Prepare the self-test workspace so wave 19 can prove one real tracking-by-skill loop in local-import mode:

1. resolve the project tracker
2. create a tracked task
3. complete it through the required tracking skill
4. verify completion
5. expose the result through the future `skills status` read model

## Prepared Local Fixtures

| Fixture | Purpose |
|---|---|
| `.ai-pm/tracking/tasks.json` | Local mirror for one completed notion/local_import loop and one ready follow-up task |
| `.ai-pm/memory/skills-status.json` | Read model fixture for `ai-pm skills status` and chat/mobile `/skills` |
| `.ai-pm/approvals.json` | Pending approval proving live Notion mutation is still gated |
| `integrations/notion/issues.csv` | Local import rows that match the wave 19 smoke tasks |
| `.ai-pm/audit/workflow-runs.jsonl` | Local evidence that the smoke fixture was prepared |

## Loop Evidence

### Completed dry-run loop

- local task id: `local-wave19-smoke-001`
- external tracker id: `notion-local-wave19-smoke-001`
- tracker mode: `local_import`
- orchestrator create skill: `tracking.create_task`
- agent completion skill: `tracking.complete_task`
- completion result: `dry_run_only`
- output artifact: `reports/wave19-skills-smoke-2026-06-22.md`

### Active follow-up task

- local task id: `local-wave19-smoke-002`
- external tracker id: `notion-local-wave19-smoke-002`
- purpose: keep one active tracker-bound task visible for later `skills status --json`
- pending approval: `approval-wave19-notion-live-sync`

## Important Constraint

No file in this workspace claims that live Notion sync already happened. The fixture is explicitly local-import and approval-gated until a real Notion MCP/API connector is configured.

## Suggested Verification After Integration

Run from `C:\Works\AI-PM`:

```bash
node packages/cli/bin/ai-pm.js tracking resolve --path examples/ai-pm-tm-test-project --json
node packages/cli/bin/ai-pm.js tracking create --path examples/ai-pm-tm-test-project --title "wave19 smoke" --agent reporting --workflow weekly-report --json
node packages/cli/bin/ai-pm.js tracking complete --path examples/ai-pm-tm-test-project --task notion-local-wave19-smoke-001 --json
node packages/cli/bin/ai-pm.js tracking verify --path examples/ai-pm-tm-test-project --task notion-local-wave19-smoke-001 --json
node packages/cli/bin/ai-pm.js skills status --path examples/ai-pm-tm-test-project --json
```

If `tracking complete` still requires the agent payload path instead of a `--task` flag, use the integrated CLI shape from wave 19 Agent 2 or Agent 4. The fixture ids above are the stable local references.
