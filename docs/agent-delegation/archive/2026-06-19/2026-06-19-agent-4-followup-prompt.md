# Agent 4 Follow-up Prompt — Schema Coverage Expansion

> **Date:** 2026-06-19  
> **Requested by:** Orchestrator  
> **Priority:** Medium — enables runtime validation tasks  
> **Depends on:** Agent 4 initial schemas (completed), Agent 1 MCP/CLI repair (completed)  
> **Blocks:** Task 4 (Approval Queue Runtime), Task 5 (Workflow Schema Validation)

---

## Task Contract

```yaml
task_id: agent-4-schema-expansion
project_id: ai-pm-toolkit
requested_by: orchestrator
assigned_agent: developer
objective: |
  Expand the JSON Schema coverage to include audit records, approval items,
  subagent task contracts, and subagent output contracts. These schemas
  complete the machine-readable contract layer for the runtime validation
  pipeline.
context:
  methodology: hybrid
  project_type: product_delivery
  source_refs:
    - type: file
      id: docs/operating-model/subagent-protocol.md
      description: Defines the subagent task and output YAML contracts
    - type: file
      id: docs/operating-model/approval-policy.md
      description: Defines approval gates and item states
    - type: file
      id: docs/superpowers/specs/2026-06-18-ai-pm-toolkit-design.md
      description: Design spec section 10.3 defines audit record format
    - type: file
      id: docs/superpowers/plans/2026-06-19-next-runtime-functions.md
      description: Active plan — Task 4 and Task 5 depend on these schemas
    - type: file
      id: schemas/workflows/README.md
      description: Existing schema set and design decisions
    - type: file
      id: docs/agent-delegation/2026-06-19-agent-4-followup-prompt.md
      description: This prompt
constraints:
  - Work only inside schemas/
  - Do not modify packages/, mcp/, playbooks/, workflows/, or docs/
  - Use draft 2020-12 JSON Schema
  - Follow the same patterns established in the existing workflow schemas
  - All schemas must be valid JSON
required_outputs:
  - name: new-schemas
    format: json
  - name: updated-readme
    format: markdown
  - name: assumptions-list
    format: markdown
quality_gate:
  checklist_id: schema-expansion-gate
  approval_required: false
deadline: medium-priority
```

---

## Prompt

```text
You are Agent 4 working on the AI-PM Toolkit repository.
You previously created 7 workflow JSON schemas in schemas/workflows/.
This task expands schema coverage to the remaining contract types.

## Step 0: Read context files

1. AGENTS.md
2. docs/operating-model/subagent-protocol.md
3. docs/operating-model/approval-policy.md
4. docs/superpowers/specs/2026-06-18-ai-pm-toolkit-design.md (section 10.3 for audit record format)
5. schemas/workflows/README.md
6. schemas/workflows/daily-briefing.output.schema.json (as pattern reference)
7. schemas/workflows/code-quality-guard.output.schema.json (as pattern reference)

## Step 1: Create shared schemas

Create these files under schemas/:

### schemas/audit/audit-record.schema.json

Schema for a single audit record. Every meaningful agent action must produce
one of these. Fields based on the design spec section 10.3 and the audit
objects already embedded in workflow output schemas:

Required fields:
- run_id (string, unique)
- workflow_id (string, enum of known workflow IDs)
- project_id (string)
- status (string: "completed" | "failed" | "partial" | "cancelled")
- started_at (string, date-time)
- completed_at (string, date-time)
- confidence (integer, 0-100)
- sources_used (array of strings)
- assumptions (array of strings)
- proposed_external_actions (array of objects with action, target_system, approval_required)

Optional fields:
- trigger (string: "cli" | "desktop" | "chat" | "scheduler" | "api")
- triggered_by (string: description of what triggered the run)
- unavailable_sources (array of strings)
- approval_status (string: "not_required" | "pending" | "approved" | "rejected")
- output_path (string: path to generated output file)
- error_message (string: if status is failed)

### schemas/approval/approval-item.schema.json

Schema for a single approval queue item. Based on the approval policy and
the runtime plan Task 4 (approval queue foundation):

Required fields:
- approval_id (string, unique)
- project_id (string)
- action_type (string: "change_request" | "scope_change" | "pr_merge" | "report_publish" | "risk_closure" | "budget_update" | "external_mutation")
- target_system (string)
- summary (string)
- requested_by (string)
- status (string: "pending" | "approved" | "rejected" | "revision_requested")
- created_at (string, date-time)
- updated_at (string, date-time)

Optional fields:
- details (object: freeform detail about the action)
- audit_ref (string: reference to the audit record that generated this item)
- review_notes (string: reviewer notes)
- decided_by (string)
- decided_at (string, date-time)

### schemas/subagent/subagent-task.schema.json

Schema for a subagent task contract. Based on the YAML contract in
docs/operating-model/subagent-protocol.md:

Required fields:
- task_id (string)
- project_id (string)
- requested_by (string: "pm_commander" | "human_pm" | "scheduler" | "chat_gateway" | "cli" | "desktop")
- assigned_agent (string)
- objective (string)
- constraints (array of strings)
- required_outputs (array of objects with name, format)
- quality_gate (object with checklist_id, approval_required)
- deadline (string)

Optional fields:
- context (object with methodology, project_type, source_refs)
- priority (string: "critical" | "high" | "medium" | "low")

### schemas/subagent/subagent-output.schema.json

Schema for a subagent output contract. Based on the YAML output contract:

Required fields:
- task_id (string)
- status (string: "completed" | "blocked" | "failed" | "needs_human_input")
- summary (string)
- findings (array of objects with severity, title, detail, source_ref)
- recommendations (array of objects with action, owner, priority)
- confidence (integer, 0-100)

Optional fields:
- artifacts (array of objects with path_or_url, type)
- open_questions (array of strings)
- audit (object with sources_used, assumptions, approvals_required, next_agent_suggested)

## Step 2: Update README

Update schemas/workflows/README.md to:
- Add a "Shared Schemas" section listing the new audit, approval, and subagent schemas
- Add brief descriptions of each shared schema
- Note that these schemas are consumed by the runtime validation pipeline (Task 4-5 in the active plan)

## Step 3: Verify

Run these commands:

```bash
# 1. Confirm all new files exist
find schemas -type f | sort

# 2. Validate all JSON files
for f in schemas/audit/*.json schemas/approval/*.json schemas/subagent/*.json; do
  node -e "JSON.parse(require('fs').readFileSync('$f','utf8')); console.log('VALID: $f')" 2>&1
done

# 3. Confirm all schemas use draft 2020-12
rg '"\\$schema"' schemas/

# 4. Confirm all schemas have required fields
rg '"required"' schemas/

# 5. Confirm README updated
rg "Shared Schemas|audit-record|approval-item|subagent-task|subagent-output" schemas/workflows/README.md

# 6. No modifications outside schemas/
git diff --name-only schemas/
```

## Step 4: Report

Return your output using the subagent protocol output contract:

```yaml
task_id: agent-4-schema-expansion
status: completed | blocked | failed
summary: one-line description
findings:
  - severity: info
    title: what you created
    detail: files created and key design decisions
    source_ref: schemas/
recommendations:
  - action: what should happen next
    owner: who should do it
    priority: medium
artifacts:
  - path_or_url: schemas/
    type: diff
confidence: 0-100
open_questions:
  - any assumptions or design decisions that need review
audit:
  sources_used:
    - list of files you read
  assumptions:
    - list of assumptions made
  approvals_required: []
  next_agent_suggested: >
    Main thread can begin Task 4 (Approval Queue Runtime) using
    schemas/approval/approval-item.schema.json and Task 5
    (Workflow Schema Validation) using the full schema set.
```
