# Memory CLI Specification

**Date:** 2026-06-19  
**Status:** Implementation draft  
**Audience:** CLI users, AI agents  
**References:** [packages/core/src/runtime/memory.ts](../../packages/core/src/runtime/memory.ts)

## 1. Purpose

Expose the project runtime memory store (tasks, artifacts, lifecycle) through the `ai-pm memory` CLI family. Memory is local runtime data stored under `.ai-pm/memory/state.json` and is not committed to git.

## 2. Command Tree

```text
ai-pm memory
├── summary                 Show memory summary counts
├── tasks
│   └── list                List memory tasks
├── artifacts
│   ├── list                List memory artifacts
│   └── archive <id>        Archive an artifact
```

## 3. Commands

### 3.1 `ai-pm memory summary`

Show aggregate counts of tasks and artifacts.

**Options:**

| Option | Description | Default |
|---|---|---|
| `--json` | Output as JSON | false |

**JSON output:**

```json
{
  "totalTasks": 5,
  "completedTasks": 2,
  "totalArtifacts": 8,
  "archivedArtifacts": 1,
  "staleArtifacts": 3
}
```

**API mapping:** `MemoryStore.getSummary()`

---

### 3.2 `ai-pm memory tasks list`

List memory tasks with optional status filter.

**Options:**

| Option | Description | Default |
|---|---|---|
| `--status <status>` | Filter: pending, in_progress, completed, failed, cancelled | all |
| `--json` | Output as JSON | false |

**API mapping:** `MemoryStore.listTasks(filter)`

---

### 3.3 `ai-pm memory artifacts list`

List memory artifacts with optional status/type filter.

**Options:**

| Option | Description | Default |
|---|---|---|
| `--status <status>` | Filter: active, draft, archived, deleted | all |
| `--type <type>` | Filter by type (doc, schema, code, ...) | all |
| `--json` | Output as JSON | false |

**API mapping:** `MemoryStore.listArtifacts(filter)`

---

### 3.4 `ai-pm memory artifacts archive <artifact_id>`

Archive a memory artifact (sets status to `archived`, records reason and timestamp).

**Arguments:**

| Argument | Description |
|---|---|
| `artifact_id` | Artifact ID (UUID or short prefix) |

**Options:**

| Option | Description | Default |
|---|---|---|
| `--reason <text>` | Archive reason (min 3 characters) | "Archived via CLI by user" |
| `--json` | Output result as JSON | false |
| `--yes` | Skip confirmation prompt | false |

**API mapping:** `MemoryStore.archiveArtifact(id, reason)`

---

## 4. Init Bootstrap

`ai-pm init` creates the `.ai-pm/memory/` directory during project initialization:

```text
<project>/
├── .ai-pm/
│   ├── memory/          ← created by init
│   ├── audit/
│   └── approvals/
├── .gitignore           ← excludes .ai-pm/memory/, .ai-pm/audit/, .ai-pm/approvals*
├── README.md
└── packages/
```

The `.ai-pm/memory/` directory is git-ignored since it contains user-specific runtime state.

## 5. Error Handling

| Condition | Behavior |
|---|---|
| Missing `.ai-pm/memory/state.json` | Returns empty state (not an error) |
| Invalid artifact ID | "Artifact not found" error, exit 1 |
| Archive confirmation declined | "Cancelled" message, no action |

## 6. Shell Integration

```bash
# Get summary as JSON for scripting
ai-pm memory summary --json | jq '.totalTasks'

# List pending tasks
ai-pm memory tasks list --status pending --json

# Archive old artifacts without confirmation
ai-pm memory artifacts archive <id> --reason "Superseded" --yes
```
