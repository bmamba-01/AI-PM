# Agent 4 Follow-up v2 — Schema Hardening + Test Fixtures

> **Date:** 2026-06-19  
> **Requested by:** Orchestrator  
> **Priority:** Medium — enables main-thread Task 5 (schema validation runtime)  
> **Depends on:** Agent 4 initial schemas + expansion (both completed)  
> **Blocks:** Main-thread Task 5 (Workflow Schema Validation)

---

## Task Contract

```yaml
task_id: agent-4-schema-hardening
project_id: ai-pm-toolkit
requested_by: orchestrator
assigned_agent: developer
objective: |
  Harden the schema layer: patch 3 missing fields in approval-item.schema.json,
  then create JSON test fixtures for every schema. Fixtures enable the main
  thread to build the runtime schema validation pipeline (Task 5).
context:
  methodology: hybrid
  project_type: product_delivery
  source_refs:
    - type: file
      id: docs/operating-model/approval-policy.md
      description: Defines approval record fields including target_id, expires_at, scope
    - type: file
      id: schemas/approval/approval-item.schema.json
      description: Current approval-item schema missing 3 fields
    - type: file
      id: schemas/workflows/README.md
      description: Existing schema catalog
    - type: file
      id: docs/superpowers/plans/2026-06-19-next-runtime-functions.md
      description: Task 5 depends on schema test fixtures
constraints:
  - Work only inside schemas/
  - Do not modify packages/, mcp/, playbooks/, workflows/, or docs/
  - Use draft 2020-12 JSON Schema
  - All fixtures must validate against their schema
  - Include both valid and invalid fixture cases
required_outputs:
  - name: patched-approval-schema
    format: json
  - name: test-fixtures
    format: json
  - name: updated-readme
    format: markdown
quality_gate:
  checklist_id: schema-hardening-gate
  approval_required: false
deadline: medium-priority
```

---

## Prompt

```text
You are Agent 4 working on the AI-PM Toolkit repository.
You previously created 11 JSON schemas across workflows/, audit/, approval/,
and subagent/. This task patches a gap and adds test fixtures.

## Step 0: Read context files

1. docs/operating-model/approval-policy.md
2. schemas/approval/approval-item.schema.json
3. schemas/workflows/README.md
4. schemas/workflows/daily-briefing.output.schema.json (as pattern for fixtures)
5. schemas/audit/audit-record.schema.json
6. schemas/subagent/subagent-task.schema.json
7. schemas/subagent/subagent-output.schema.json

## Step 1: Patch approval-item.schema.json

The approval policy defines these fields that are currently missing from
schemas/approval/approval-item.schema.json:

### Add `target_id` (required)

After `target_system`, add:

```json
"target_id": {
  "type": "string",
  "description": "ID of the specific item being acted upon (PR number, issue key, email ID, etc.)."
}
```

Add `"target_id"` to the top-level `"required"` array.

### Add `expires_at` (optional)

After `decided_at`, add:

```json
"expires_at": {
  "type": "string",
  "format": "date-time",
  "description": "ISO-8601 timestamp when this approval expires. After this time, re-approval is required."
}
```

### Add `scope` (required)

After `status`, add:

```json
"scope": {
  "type": "string",
  "enum": ["once", "similar_actions", "workflow_run"],
  "description": "Scope of this approval: once (single action), similar_actions (same type/target), workflow_run (all actions in a run)."
}
```

Add `"scope"` to the top-level `"required"` array.

### Final required array should be:

```json
"required": [
  "approval_id",
  "project_id",
  "action_type",
  "target_system",
  "target_id",
  "summary",
  "requested_by",
  "status",
  "scope",
  "created_at",
  "updated_at"
]
```

## Step 2: Create test fixtures

Create a `schemas/fixtures/` directory with valid and invalid JSON fixtures
for every schema. Each fixture file is a standalone JSON object.

### Structure

```
schemas/fixtures/
  workflows/
    daily-briefing.input.valid.json
    daily-briefing.input.invalid.json
    daily-briefing.output.valid.json
    daily-briefing.output.invalid.json
    meeting-intelligence.output.valid.json
    meeting-intelligence.output.invalid.json
    scope-control.output.valid.json
    scope-control.output.invalid.json
    risk-control.output.valid.json
    risk-control.output.invalid.json
    reporting.output.valid.json
    reporting.output.invalid.json
    code-quality-guard.output.valid.json
    code-quality-guard.output.invalid.json
  audit/
    audit-record.valid.json
    audit-record.invalid.json
  approval/
    approval-item.valid.json
    approval-item.invalid.json
  subagent/
    subagent-task.valid.json
    subagent-task.invalid.json
    subagent-output.valid.json
    subagent-output.invalid.json
```

### Fixture rules

**Valid fixtures** must:
- Contain ALL required fields with realistic sample data
- Use realistic enum values (not "test" or "foo")
- Pass validation against the schema when checked with ajv or similar
- Use ISO-8601 dates (e.g., "2026-06-19T09:00:00Z")
- Use realistic IDs (e.g., "PRJ-2026-001", "RISK-042", "CR-007")

**Invalid fixtures** must:
- Violate exactly ONE constraint each (e.g., missing required field, wrong enum value, confidence > 100)
- Include a `_violation` field explaining what is wrong (this field itself causes additionalProperties to fail, which is intentional for test harnesses — the test code should strip it before validation)

### Example valid fixture (daily-briefing.output)

```json
{
  "date": "2026-06-19T09:00:00Z",
  "project_id": "PRJ-2026-001",
  "top_priorities": [
    "Finalize API integration for Sprint 12 deliverable",
    "Review and approve change request CR-007 for scope adjustment"
  ],
  "meetings_to_prepare": [
    "10:00 Sprint Review — prepare demo of payment module",
    "14:00 Stakeholder sync — bring risk escalation for data migration"
  ],
  "urgent_blockers": [
    "CI pipeline broken on main since 06:30 — blocks all merges"
  ],
  "risks_to_review": [
    "RISK-015: Third-party API rate limit may impact launch timeline"
  ],
  "pending_approvals": [
    "CR-007: Scope change for additional reporting column"
  ],
  "suggested_followups": [
    "Send Slack message to DevOps re: CI pipeline status",
    "Prepare risk escalation draft for stakeholder meeting"
  ],
  "source_coverage": ["jira", "github", "calendar", "local_memory"],
  "unavailable_sources": ["slack"],
  "assumptions": [
    "Assumed Sprint 12 scope unchanged from last planning session"
  ],
  "confidence": 85,
  "proposed_external_actions": [
    {
      "action": "Post CI status update to team Slack channel",
      "target_system": "slack",
      "approval_required": true
    }
  ]
}
```

### Example invalid fixture (daily-briefing.output — missing confidence)

```json
{
  "_violation": "Missing required field 'confidence'",
  "date": "2026-06-19T09:00:00Z",
  "project_id": "PRJ-2026-001",
  "top_priorities": ["Fix CI pipeline"],
  "meetings_to_prepare": [],
  "urgent_blockers": [],
  "risks_to_review": [],
  "pending_approvals": [],
  "suggested_followups": [],
  "source_coverage": ["jira"],
  "assumptions": []
}
```

## Step 3: Update README

Update schemas/workflows/README.md:

1. Add a "Test Fixtures" section explaining the fixture structure and purpose
2. Note that valid fixtures pass schema validation and invalid fixtures each violate exactly one constraint
3. Mention that fixtures are consumed by the runtime validation pipeline (Task 5)

## Step 4: Verify

Run these commands:

```bash
# 1. Confirm all fixture files exist
find schemas/fixtures -type f | sort

# 2. Count: should be 28 fixture files (14 valid + 14 invalid)
find schemas/fixtures -type f | wc -l

# 3. Validate all valid fixtures parse as JSON
for f in schemas/fixtures/**/*.valid.json; do
  node -e "JSON.parse(require('fs').readFileSync('$f','utf8')); console.log('VALID: $f')" 2>&1
done

# 4. Validate all invalid fixtures parse as JSON (they are valid JSON, just invalid per schema)
for f in schemas/fixtures/**/*.invalid.json; do
  node -e "JSON.parse(require('fs').readFileSync('$f','utf8')); console.log('VALID JSON: $f')" 2>&1
done

# 5. Confirm approval-item.schema.json has target_id, expires_at, scope
rg "target_id|expires_at|scope" schemas/approval/approval-item.schema.json

# 6. Confirm README updated
rg "Test Fixtures|fixtures" schemas/workflows/README.md

# 7. No modifications outside schemas/
git diff --name-only schemas/
```

## Step 5: Report

```yaml
task_id: agent-4-schema-hardening
status: completed | blocked | failed
summary: one-line description
findings:
  - severity: info
    title: what you did
    detail: files changed, fields added, fixtures created
    source_ref: schemas/
recommendations:
  - action: main thread can now build schema validation runtime (Task 5)
    owner: main_thread
    priority: medium
artifacts:
  - path_or_url: schemas/fixtures/
    type: diff
confidence: 0-100
open_questions: []
audit:
  sources_used:
    - list of files read
  assumptions:
    - each invalid fixture violates exactly one constraint
    - _violation field is stripped before schema validation
  approvals_required: []
  next_agent_suggested: >
    Main thread Task 5 (Workflow Schema Validation) can begin.
    Agent 5 can start approval queue UX docs in parallel.
```
