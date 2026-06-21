# Setup Existing Project

## Adopt

Add AI-PM files to an existing folder without overwriting human files.

```bash
node packages/cli/bin/ai-pm.js adopt --path /path/to/project --defaults --json
```

Use `--repair` only when you want missing AI-PM runtime files to be created in an already-adopted project.

## Setup Doctor

Check readiness before running workflows.

```bash
node packages/cli/bin/ai-pm.js setup doctor --json
```

Output: readiness score, blocking items, warnings, next commands.

## Setup Repair

Create missing runtime directories and empty state files.

```bash
node packages/cli/bin/ai-pm.js setup repair --json
```

## MCP Connector Setup

Setup doctor/repair does not configure external connectors. Use:

```bash
node packages/cli/bin/ai-pm.js mcp setup --connector github
node packages/cli/bin/ai-pm.js mcp doctor --profile default --json
```

## Overwrite Protection

`adopt` skips existing files unless `--repair` is passed.
