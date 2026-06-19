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
| `--status <status>` | Filter by status: `pending`, `in_progress`, `completed`, `failed`, `cancelled` | all |
| `--json` | Output as JSON | false |

**Valid task statuses:**

| Status | Description |
|---|---|
| `pending` | Not yet started |
| `in_progress` | Actively being worked on |
| `completed` | Done |
| `failed` | Did not complete successfully |
| `cancelled` | No longer needed |

**Error on invalid status (exit 1):**

```json
{
  "error": {
    "code": "INVALID_STATUS",
    "message": "Invalid task status \"bogus\". Allowed: pending, in_progress, completed, failed, cancelled"
  }
}
```

**API mapping:** `MemoryStore.listTasks(filter)`

---

### 3.3 `ai-pm memory artifacts list`

List memory artifacts with optional status/type filter.

**Options:**

| Option | Description | Default |
|---|---|---|
| `--status <status>` | Filter by status: `active`, `draft`, `archived`, `deleted` | all |
| `--type <type>` | Filter by type (doc, schema, code, ...) | all |
| `--json` | Output as JSON | false |

**Valid artifact statuses:**

| Status | Description |
|---|---|
| `active` | Currently in use |
| `draft` | Work in progress |
| `archived` | No longer active, kept for reference |
| `deleted` | Removed from active use |

**Error on invalid status (exit 1):**

```json
{
  "error": {
    "code": "INVALID_STATUS",
    "message": "Invalid artifact status \"bogus\". Allowed: active, draft, archived, deleted"
  }
}
```

**API mapping:** `MemoryStore.listArtifacts(filter)`

---

### 3.4 `ai-pm memory artifacts archive <artifact_id>`

Archive a memory artifact (sets status to `archived`, records reason and timestamp).

**Arguments:**

| Argument | Description |
|---|---|
| `artifact_id` | Artifact ID — full UUID or short prefix (min 1 character) |

**Options:**

| Option | Description | Default |
|---|---|---|
| `--reason <text>` | Archive reason (min 3 characters) | "Archived via CLI by user" |
| `--json` | Output result as JSON | false |
| `--yes` | Skip confirmation prompt | false |

**ID resolution rules:**

1. **Exact match** — full UUID matches an artifact → use it.
2. **Unique prefix** — short prefix matches exactly one artifact → resolve to it.
3. **No match** — prefix matches nothing → error: `"No artifact found matching prefix \"xyz\"."`
4. **Ambiguous** — prefix matches multiple artifacts → error listing candidates:

```json
{
  "error": {
    "code": "AMBIGUOUS_ID",
    "message": "Ambiguous ID \"48\". Did you mean:\n  480fc327 — design-doc.md (doc, v1)\n  48c850de — schema.json (schema, v1)",
    "matches": [
      { "id": "480fc327-...", "label": "design-doc.md (doc, v1)" },
      { "id": "48c850de-...", "label": "schema.json (schema, v1)" }
    ]
  }
}
```

**Reason validation:**

| Input | Behavior |
|---|---|
| No `--reason` flag | Uses default: `"Archived via CLI by user"` |
| `--reason` with < 3 characters | Error (exit 1): `"Reason must be at least 3 characters (or omit --reason to use default)."` |
| `--reason` with ≥ 3 characters | Uses provided value |

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

All error paths produce parseable JSON when `--json` is passed:

| Condition | Error code | Exit | Example |
|---|---|---|---|
| Missing `.ai-pm/memory/state.json` | — | 0 | Returns empty state (not an error) |
| Invalid artifact ID | `NOT_FOUND` | 1 | "No artifact found matching prefix ..." |
| Ambiguous artifact ID | `AMBIGUOUS_ID` | 1 | Lists matched candidates |
| Invalid task status | `INVALID_STATUS` | 1 | Lists allowed values |
| Invalid artifact status | `INVALID_STATUS` | 1 | Lists allowed values |
| Reason too short | — | 1 | "Reason must be at least 3 characters" |
| Archive confirmation declined | — | 0 | "Cancelled" message, no action |

JSON error shape:

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable description"
  }
}
```

## 6. Shell Integration

```bash
# Get summary as JSON for scripting
ai-pm memory summary --json | jq '.totalTasks'

# List pending tasks
ai-pm memory tasks list --status pending --json

# List active artifacts
ai-pm memory artifacts list --status active --json

# Archive by exact ID
ai-pm memory artifacts archive 1189803f-182b-47b1-b38d-4fe0ae3a52f1 --reason "Superseded" --yes

# Archive by short prefix
ai-pm memory artifacts archive 1189803f --reason "Old version" --yes

# Check invalid status (exit 1, parseable error)
ai-pm memory tasks list --status bogus --json | jq '.error.message'
```
