# Agent 5 Follow-up Prompt — Approval Queue CLI Spec

> **Date:** 2026-06-19  
> **Requested by:** Orchestrator  
> **Priority:** Medium — complements runtime contract for CLI-first workflow  
> **Depends on:** Agent 5 initial deliverables (approval-queue-ux.md + approval-queue-runtime-contract.md)  
> **Blocks:** Main-thread Task 4 (Approval Queue Runtime) — CLI spec informs the CLI command implementation

---

## Task Contract

```yaml
task_id: agent-5-approval-cli-spec
project_id: ai-pm-toolkit
requested_by: orchestrator
assigned_agent: developer
objective: |
  Design the CLI command spec for the approval queue. The runtime contract
  defines the HTTP API; this task defines the CLI commands that PMs will use
  from the terminal to interact with the same queue.
context:
  methodology: hybrid
  project_type: product_delivery
  source_refs:
    - type: file
      id: docs/architecture/approval-queue-runtime-contract.md
      description: Full runtime contract with API endpoints, data model, state machine
    - type: file
      id: docs/product/approval-queue-ux.md
      description: UX spec with states, flows, security constraints
    - type: file
      id: docs/superpowers/plans/2026-06-19-next-runtime-functions.md
      description: Active plan — Task 4 (approval queue runtime) references CLI commands
    - type: file
      id: packages/cli/src/commands/mcp.ts
      description: Existing CLI command pattern to follow
constraints:
  - Work only inside docs/product/ and docs/architecture/
  - Do not modify packages/ code
  - Do not modify existing docs files — only create new ones
  - Follow the existing CLI command patterns (Commander.js style from mcp.ts)
  - Each command must map to an API endpoint in the runtime contract
required_outputs:
  - name: cli-spec-doc
    format: markdown
quality_gate:
  checklist_id: approval-cli-spec-gate
  approval_required: false
deadline: medium-priority
```

---

## Prompt

```text
You are Agent 5 working on the AI-PM Toolkit repository.
You previously created the approval queue UX spec and runtime contract.
This task designs the CLI commands for the approval queue.

## Step 0: Read context files

1. docs/architecture/approval-queue-runtime-contract.md (§4 Local Server API)
2. docs/product/approval-queue-ux.md (§2 States, §7 Rejection/Revision)
3. packages/cli/src/commands/mcp.ts (existing CLI pattern to follow)
4. packages/cli/src/index.ts (CLI entry point)
5. docs/superpowers/plans/2026-06-19-next-runtime-functions.md (Task 4)

## Step 1: Design CLI commands

Create docs/product/approval-queue-cli-spec.md

Design these commands, each mapping to the runtime contract API:

### ai-pm approval list

List approval items with filters.

Options:
--status <status>       Filter by status (pending, revision_requested, expired, approved, rejected, executed)
--priority <priority>   Filter by priority (critical, high, medium, low)
--workflow <id>         Filter by originating workflow
--json                  Output as JSON (for scripting)
--limit <n>             Max items to show (default: 20)

Output (table mode):
| ID | Title | Priority | Status | Source | Age | Target |

Output (JSON mode):
Full ApprovalItem array with counts.

Maps to: GET /api/approvals

### ai-pm approval show <id>

Show full detail of a single approval item.

Options:
--json                  Output as JSON
--audit                 Include full audit trail

Output: Full item detail including description, summary_diff, source_refs, confidence, audit trail.

Maps to: GET /api/approvals/:id (+ GET /api/approvals/:id/audit if --audit)

### ai-pm approval decide <id> <decision>

Submit a decision on an approval item.

Arguments:
id          Approval item ID
decision    approve | reject | revision

Options:
--reason <text>         Required for reject (min 10 chars)
--notes <text>          Required for revision (min 10 chars)
--json                  Output result as JSON

Behavior:
- approve: confirms, shows execution status
- reject: requires --reason, shows rejection confirmation
- revision: requires --notes, shows revision submission confirmation

Maps to: POST /api/approvals/:id/decide

### ai-pm approval delegate <id> <user>

Delegate an approval item to another user.

Arguments:
id          Approval item ID
user        Target user ID or name

Options:
--note <text>           Optional note for the delegate
--json                  Output result as JSON

Maps to: POST /api/approvals/:id/delegate

### ai-pm approval count

Show count of approval items by status.

Options:
--json                  Output as JSON

Output (table mode):
| Status | Count |
|--------|-------|
| pending | 5 |
| revision_requested | 2 |
| ... | ... |

Output (JSON mode):
{ "pending": 5, "revision_requested": 2, ... }

Maps to: GET /api/approvals/count

### ai-pm approval policy list

List active auto-approval policy rules.

Options:
--json                  Output as JSON

Output: List of policy rules with pattern, scope, use_count, expires_at.

Maps to: GET /api/approval-policies

### ai-pm approval policy revoke <id>

Revoke an auto-approval policy rule.

Arguments:
id          Policy rule ID

Options:
--json                  Output result as JSON

Maps to: DELETE /api/approval-policies/:id

## Step 2: Document patterns

In the spec doc, also document:

1. **Output formatting rules** — when to use table vs JSON, color coding for priority/status
2. **Error handling** — what happens when item not found, already decided, expired, unauthorized
3. **Confirmation prompts** — which commands require interactive confirmation (approve, reject) vs which are safe (list, show, count)
4. **Shell integration** — how to pipe JSON output to jq, how to use in scripts
5. **Workflow examples** — 2-3 real-world usage scenarios showing command sequences

## Step 3: Verify

```bash
# 1. Confirm file created
ls docs/product/approval-queue-cli-spec.md

# 2. Confirm it references the runtime contract API endpoints
rg -n "GET /api/approvals|POST /api/approvals|DELETE /api/approval" docs/product/approval-queue-cli-spec.md

# 3. Confirm it covers all planned commands
rg -n "ai-pm approval" docs/product/approval-queue-cli-spec.md

# 4. No modifications outside docs/
git diff --name-only docs/
```

## Step 4: Report

```yaml
task_id: agent-5-approval-cli-spec
status: completed | blocked | failed
summary: one-line description
findings:
  - severity: info
    title: what you created
    detail: commands designed, patterns documented
    source_ref: docs/product/approval-queue-cli-spec.md
recommendations:
  - action: main thread can implement CLI commands in Task 4
    owner: main_thread
    priority: medium
artifacts:
  - path_or_url: docs/product/approval-queue-cli-spec.md
    type: report
confidence: 0-100
open_questions:
  - any design decisions left open
audit:
  sources_used:
    - list of files read
  assumptions:
    - CLI commands map 1:1 to HTTP API endpoints
    - Commander.js pattern from mcp.ts is the reference
  approvals_required: []
  next_agent_suggested: >
    Main thread Task 4 (Approval Queue Runtime) now has
    full specs: UX, runtime contract, and CLI commands.
```
