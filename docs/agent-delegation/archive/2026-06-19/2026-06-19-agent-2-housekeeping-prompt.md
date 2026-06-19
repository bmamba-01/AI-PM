# Coding Agent 2 — Repo Housekeeping: Archive + Memory Index

> **Type:** 🖥️ CODING TASK  
> **Priority:** High — repo đang lộn xộn sau nhiều wave delegation  
> **Depends on:** Nothing — standalone task  
> **Blocks:** Nothing — improves maintainability

## Problem

Repo đã phát triển qua nhiều waves delegation. Hiện tại có:
- 20+ delegation prompt files trong `docs/agent-delegation/`
- 10+ review files
- Multiple plan files (một số đã historical)
- Templates README lists phantom entries
- Không có cách nào biết file nào đang active, file nào đã completed/archived

## Task

### Part 1: Create `.ai-pm/memory/` structure

Create a machine-readable memory index that tracks project state:

```
.ai-pm/memory/
├── tasks.yaml          # All tasks with status, owner, dates
├── agents.yaml         # Agent status and assignments
├── artifacts.yaml      # All docs/files with lifecycle state
└── archive/            # Moved completed/outdated files
```

### Part 2: Populate `tasks.yaml`

```yaml
version: 1
tasks:
  - id: task-1-stabilization
    name: "Stabilization Gate"
    status: completed
    completed_by: agent-1
    completed_at: 2026-06-19
    
  - id: task-2-audit-cli
    name: "Audit Inspection CLI"
    status: completed
    completed_by: coding-agent-1
    completed_at: 2026-06-19
    files:
      - packages/core/src/runtime/localProjectStore.ts
      - packages/cli/src/commands/audit.ts
    
  - id: task-3-project-scan
    name: "Project Scan CLI"
    status: completed
    completed_by: coding-agent-2
    completed_at: 2026-06-19
    files:
      - packages/core/src/runtime/projectScanner.ts
      - packages/cli/src/commands/project.ts

  # ... thêm tất cả tasks đã completed và in-progress
```

### Part 3: Populate `agents.yaml`

```yaml
version: 1
agents:
  - id: agent-1
    name: "MCP Repair"
    status: completed
    tasks_completed: [task-1-stabilization]
    
  - id: coding-agent-1
    name: "Runtime Developer"
    status: available
    tasks_completed: [task-2-audit-cli]
    
  # ... tất cả agents
```

### Part 4: Populate `artifacts.yaml`

Track ALL docs with lifecycle:

```yaml
version: 1
artifacts:
  - id: delegation-agent-1-prompt
    path: docs/agent-delegation/2026-06-19-agent-1-prompt.md
    type: delegation-prompt
    status: archived  # task completed
    completed_by: agent-1
    created_at: 2026-06-19
    
  - id: delegation-agent-1-review
    path: docs/agent-delegation/2026-06-19-agent-1-review.md
    type: review
    status: archived
    created_at: 2026-06-19

  - id: plan-next-runtime
    path: docs/superpowers/plans/2026-06-19-next-runtime-functions.md
    type: plan
    status: active
    created_at: 2026-06-19
    
  # ... tất cả files trong docs/
```

### Part 5: Create archive directory and move completed files

```bash
mkdir -p docs/agent-delegation/archive/2026-06-19
```

Move ALL completed delegation prompts and reviews to archive:
- All `*-prompt.md` files for completed tasks → archive
- All `*-review.md` files → archive
- All `*-followup-prompt.md` files for completed agents → archive

Keep only:
- Active plan files
- Active delegation forecast
- Phase 2 prompt files (still needed)
- This housekeeping prompt itself

### Part 6: Add archive rules to docs

Create `docs/agent-delegation/ARCHIVE-RULES.md`:

```markdown
# Archive Rules

## When to archive
- A delegation prompt is fully completed and no longer needed
- A review file has been read and actioned
- A follow-up prompt has been superseded by a newer version
- A plan file is no longer the active plan

## Where to archive
- `docs/agent-delegation/archive/YYYY-MM-DD/` — by date
- `docs/plans/archive/` — for historical plans

## What NOT to archive
- Active delegation forecast (2026-06-19-delegation-forecast.md)
- Phase 2 prompts (still needed for current coding agents)
- Active plan files referenced in CLAUDE.md
```

## Files to create/modify

- Create: `.ai-pm/memory/tasks.yaml`
- Create: `.ai-pm/memory/agents.yaml`
- Create: `.ai-pm/memory/artifacts.yaml`
- Create: `docs/agent-delegation/ARCHIVE-RULES.md`
- Create: `docs/agent-delegation/archive/2026-06-19/` (directory)
- Move: completed prompt/review files to archive
- Modify: `.gitignore` if needed

## Verification

```bash
# All files accounted for
find docs/agent-delegation -type f | wc -l

# Archive directory has moved files
ls docs/agent-delegation/archive/2026-06-19/

# Memory files are valid YAML
node -e "const yaml = require('yaml'); const fs = require('fs'); yaml.parse(fs.readFileSync('.ai-pm/memory/tasks.yaml','utf8')); console.log('tasks.yaml OK')"
node -e "const yaml = require('yaml'); const fs = require('fs'); yaml.parse(fs.readFileSync('.ai-pm/memory/agents.yaml','utf8')); console.log('agents.yaml OK')"
node -e "const yaml = require('yaml'); const fs = require('fs'); yaml.parse(fs.readFileSync('.ai-pm/memory/artifacts.yaml','utf8')); console.log('artifacts.yaml OK')"
```
