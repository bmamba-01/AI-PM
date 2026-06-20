# CLI Reference

The `ai-pm` CLI provides project management operations from the terminal.

## Installation

```bash
pnpm install
node packages/cli/bin/ai-pm.js --help
```

## Commands

### `ai-pm init`

Initialize a new AI-PM project scaffold.

```bash
ai-pm init                    # Interactive setup
ai-pm init --name "MyProject" # Non-interactive
```

Creates `.ai-pm/` directory, `AGENTS.md`, and project config.

---

### `ai-pm project scan`

Scan the current project for required files and readiness score.

```bash
ai-pm project scan            # Table output
ai-pm project scan --json     # JSON output
```

Returns score 0–100 based on presence of `AGENTS.md`, `README.md`, design specs, workflows, playbooks, and MCP registry.

---

### `ai-pm audit list`

View the audit trail of workflow runs.

```bash
ai-pm audit list              # Table output
ai-pm audit list --json       # JSON output
ai-pm audit list --limit 50   # Show more records
```

---

### `ai-pm approval`

Manage the approval queue for external mutations.

#### `ai-pm approval list`

```bash
ai-pm approval list                        # All items
ai-pm approval list --status pending       # Filter by status
ai-pm approval list --priority high        # Filter by priority
ai-pm approval list --workflow daily-briefing  # Filter by workflow
ai-pm approval list --json                 # JSON output
ai-pm approval list --limit 10             # Limit results
```

#### `ai-pm approval show <id>`

```bash
ai-pm approval show a1d5b4c6-7f9c-...     # Full detail
ai-pm approval show a1d5b4c6 --json       # JSON output
```

#### `ai-pm approval decide <id> <decision>`

```bash
ai-pm approval decide a1d5b4c6 approve
ai-pm approval decide a1d5b4c6 reject --reason "Needs more detail in the summary"
ai-pm approval decide a1d5b4c6 revision --notes "Add budget impact analysis"
ai-pm approval decide a1d5b4c6 approve --yes  # Skip confirmation
```

Decisions: `approve`, `reject` (requires `--reason`), `revision` (requires `--notes`).

#### `ai-pm approval delegate <id> <user>`

```bash
ai-pm approval delegate a1d5b4c6 pm-user-02 --note "Review and approve"
```

#### `ai-pm approval count`

```bash
ai-pm approval count          # Status table
ai-pm approval count --json   # JSON output
```

#### `ai-pm approval policy list`

```bash
ai-pm approval policy list    # List auto-approval rules
```

---

### `ai-pm mcp`

Manage MCP server configurations.

```bash
ai-pm mcp validate            # Validate MCP config
```

---

### `ai-pm daily`

Daily briefing operations.

```bash
ai-pm daily                   # Generate daily briefing
```

---

### `ai-pm methodology`

Methodology governance commands.

```bash
ai-pm methodology             # Check methodology compliance
```

---

### `ai-pm memory`

Memory system operations.

```bash
ai-pm memory                  # View memory state
```

## Global Options

| Flag | Description |
|---|---|
| `--json` | Output as JSON instead of formatted table |
| `--yes`, `-y` | Skip confirmation prompts |
| `--help`, `-h` | Show help for any command |

## Output Formats

- **Table** (default): Colored terminal output using `chalk` and `table`
- **JSON** (`--json`): Machine-readable JSON output for scripting

## Bilingual Support

The CLI supports English (`en`) and Vietnamese (`vi`) messages. Language detection is based on project configuration.
