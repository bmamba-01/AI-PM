# Troubleshooting

Common errors, build failures, test failures, and connectivity issues.

## Build Failures

### "Cannot find module '@ai-pm/...'"

Run `corepack pnpm@9.4.0 install` to install all workspace dependencies.

### "error TS2307: Cannot find module 'vitest'"

Test files are not excluded from build. Run `pnpm build` after test file changes, or check `tsconfig.json` excludes `*.test.ts`.

### "Port 3847 already in use"

Another process is using the port. Either stop it or the server will fail to start (desktop shows "Stopped" status).

## Test Failures

### "Commander parseAsync doesn't await async action"

Commander v12 has known issues with async action handlers. Use `process.argv` with `from: 'user'` and add a `setTimeout` delay:

```typescript
const originalArgv = process.argv;
process.argv = ['node', 'cmd', ...flags];
try {
  await cmd.parseAsync(process.argv, { from: 'user' });
  await new Promise(r => setTimeout(r, 100));
} finally {
  process.argv = originalArgv;
}
```

### "Schema validation: unknown format 'date-time'"

Ajv ignores format keywords by default. Install `ajv-formats`:

```bash
corepack pnpm@9.4.0 add ajv-formats
```

Then register in the validator:

```typescript
import addFormats from 'ajv-formats';
addFormats(ajv);
```

## CLI Issues

### "No MCP servers configured"

Run `ai-pm mcp list --json` to check available servers. Add one with `ai-pm mcp add`.

### "Approval item not found"

The item ID might be truncated. Use the full UUID, not the first 8 characters.

### "Cannot decide on item in 'approved' status"

You can only decide on `pending` or `revision_requested` items. Approved items are already decided.

## Desktop Issues

### Server shows "Stopped"

Click "Start" in the Dashboard server status panel. If it fails, check port 3847 availability.

### "No approval items found"

The approval queue is empty. Create items via CLI (`ai-pm approval create`) or wait for agent-proposed actions.

## Mobile Issues

### "Offline" status

The mobile app cannot reach the local server. Ensure:
1. Desktop app is running
2. Phone and laptop are on the same network
3. Firewall allows port 3847

### Data not syncing

Pull down to refresh. If still stuck, check server status in desktop dashboard.

## Memory Issues

### "store full" error in tests

The MemoryStore has a size limit. Use temp directories for tests and clean up in `afterEach`.

### Missing memory state

Run `ai-pm setup repair --path . --json` to create missing directories and state files.

## Schema Validation

### "Schema not found"

Check that the schema file exists at `schemas/workflows/<id>.output.schema.json`.

### Validation fails with missing columns

Ensure your data includes all `required_columns` defined in the schema. Use `ai-pm schema validate --json` to check.
