# Agent 4 Follow-up v3 — Input Schemas for Remaining Workflows

> **Date:** 2026-06-19  
> **Requested by:** Orchestrator  
> **Priority:** Medium — completes the schema layer for full runtime validation  
> **Depends on:** Agent 4 v1 (7 workflow output schemas) + v2 (hardening + fixtures), both completed  
> **Blocks:** Main-thread Task 5 (Workflow Schema Validation) — input schemas enable validating workflow inputs, not just outputs

---

## Task Contract

```yaml
task_id: agent-4-input-schemas
project_id: ai-pm-toolkit
requested_by: orchestrator
assigned_agent: developer
objective: |
  Create input schemas for the 5 remaining workflows that currently lack them.
  Only daily-briefing has an input schema. Add input schemas for meeting-intelligence,
  scope-control, risk-control, reporting, and code-quality-guard, plus test fixtures.
context:
  methodology: hybrid
  project_type: product_delivery
  source_refs:
    - type: file
      id: schemas/workflows/daily-briefing.input.schema.json
      description: Existing input schema to use as pattern
    - type: file
      id: workflows/meeting-intelligence/README.md
      description: Workflow contract defining inputs
    - type: file
      id: workflows/scope-control/README.md
      description: Workflow contract defining inputs
    - type: file
      id: workflows/risk-control/README.md
      description: Workflow contract defining inputs
    - type: file
      id: workflows/reporting/README.md
      description: Workflow contract defining inputs
    - type: file
      id: workflows/code-quality-guard/README.md
      description: Workflow contract defining inputs
    - type: file
      id: schemas/workflows/README.md
      description: Schema catalog to update
constraints:
  - Work only inside schemas/
  - Do not modify packages/, mcp/, playbooks/, workflows/, or docs/
  - Use draft 2020-12 JSON Schema
  - Follow the same patterns as daily-briefing.input.schema.json
  - Each input schema must derive from the workflow README's Inputs section
  - All fixtures must be valid JSON
required_outputs:
  - name: input-schemas
    format: json
  - name: test-fixtures
    format: json
  - name: updated-readme
    format: markdown
quality_gate:
  checklist_id: input-schemas-gate
  approval_required: false
deadline: medium-priority
```

---

## Prompt

```text
You are Agent 4 working on the AI-PM Toolkit repository.
You previously created 7 output schemas, 4 shared schemas, and 20 test fixtures.
This task adds input schemas for the 5 remaining workflows.

## Step 0: Read context files

1. schemas/workflows/daily-briefing.input.schema.json (pattern to follow)
2. schemas/workflows/README.md (catalog to update)
3. workflows/meeting-intelligence/README.md
4. workflows/scope-control/README.md
5. workflows/risk-control/README.md
6. workflows/reporting/README.md
7. workflows/code-quality-guard/README.md

## Step 1: Create input schemas

Create these 5 files under schemas/workflows/:

### meeting-intelligence.input.schema.json

From the workflow README inputs:
- calendar event
- agenda or meeting objective
- previous meeting notes
- related issues or documents
- transcript or notes
- attendee list

Required fields: date, project_id, meeting_title

Optional fields: calendar_event, agenda, previous_notes, related_issues, transcript, attendees, methodology, project_type

### scope-control.input.schema.json

From the workflow README inputs:
- BRD, PRD, SRS, FRD
- user stories and acceptance criteria
- change requests
- client messages
- meeting decisions
- current backlog
- project type playbook

Required fields: project_id, source_ref, source_type

Optional fields: requirement_description, change_request, acceptance_criteria, client_message, meeting_decision, backlog_items, methodology, project_type

### risk-control.input.schema.json

From the workflow README inputs:
- risk register
- issue tracker
- blockers
- meeting notes
- emails
- PR and CI status
- delivery metrics
- budget or burn data

Required fields: project_id, signal_source

Optional fields: risk_register, issues, blockers, meeting_notes, emails, pr_status, ci_status, delivery_metrics, budget_data, methodology, project_type

### reporting.input.schema.json

From the workflow README inputs:
- issue tracker status
- milestone plan
- risk register
- scope changes
- budget or burn data
- meeting decisions
- quality reports
- pending approvals

Required fields: project_id, report_type, audience

Optional fields: issue_tracker, milestones, risks, scope_changes, budget_data, meeting_decisions, quality_reports, pending_approvals, methodology, project_type

### code-quality-guard.input.schema.json

From the workflow README inputs:
- PR or local diff
- changed files
- requirements and acceptance criteria
- test results
- coverage report
- CI logs
- architecture guidance

Required fields: project_id, change_ref

Optional fields: changed_files, diff_content, requirements, acceptance_criteria, test_results, coverage_report, ci_logs, architecture_guidance, methodology, project_type

## Step 2: Create fixtures

For each new input schema, create valid and invalid fixtures:

```
schemas/fixtures/workflows/
  meeting-intelligence.input.valid.json
  meeting-intelligence.input.invalid.json
  scope-control.input.valid.json
  scope-control.input.invalid.json
  risk-control.input.valid.json
  risk-control.input.invalid.json
  reporting.input.valid.json
  reporting.input.invalid.json
  code-quality-guard.input.valid.json
  code-quality-guard.input.invalid.json
```

Rules:
- Valid fixtures: all required fields present, realistic data, ISO-8601 dates
- Invalid fixtures: exactly ONE constraint violated, include _violation field explaining what
- Use realistic IDs (PROJ-2026-001, MEETING-042, etc.)

## Step 3: Update README

Update schemas/workflows/README.md:
1. Add input schemas to the Workflow Schema Files table
2. Update Design Decisions section — now all workflows have both input and output schemas
3. Update Assumptions — remove the note about intentionally omitting input schemas

## Step 4: Verify

```bash
# 1. Confirm all 5 new input schema files exist
ls schemas/workflows/*.input.schema.json

# 2. Count total schema files (should be 12: 7 workflow + 5 input)
find schemas/workflows -name "*.schema.json" | wc -l

# 3. Validate all new JSON files
for f in schemas/workflows/meeting-intelligence.input.schema.json \
         schemas/workflows/scope-control.input.schema.json \
         schemas/workflows/risk-control.input.schema.json \
         schemas/workflows/reporting.input.schema.json \
         schemas/workflows/code-quality-guard.input.schema.json; do
  node -e "JSON.parse(require('fs').readFileSync('$f','utf8')); console.log('VALID: $f')" 2>&1
done

# 4. Validate new fixtures
for f in schemas/fixtures/workflows/meeting-intelligence.input.*.json \
         schemas/fixtures/workflows/scope-control.input.*.json \
         schemas/fixtures/workflows/risk-control.input.*.json \
         schemas/fixtures/workflows/reporting.input.*.json \
         schemas/fixtures/workflows/code-quality-guard.input.*.json; do
  node -e "JSON.parse(require('fs').readFileSync('$f','utf8')); console.log('VALID: $f')" 2>&1
done

# 5. Confirm all schemas use draft 2020-12
rg '"\\$schema"' schemas/workflows/

# 6. Confirm README updated
rg "input.schema" schemas/workflows/README.md

# 7. No modifications outside schemas/
git diff --name-only schemas/
```

## Step 5: Report

```yaml
task_id: agent-4-input-schemas
status: completed | blocked | failed
summary: one-line description
findings:
  - severity: info
    title: what you created
    detail: files created, fixtures added
    source_ref: schemas/workflows/
recommendations:
  - action: main thread Task 5 can now validate both inputs and outputs
    owner: main_thread
    priority: medium
artifacts:
  - path_or_url: schemas/workflows/
    type: diff
confidence: 0-100
open_questions: []
audit:
  sources_used:
    - list of files read
  assumptions:
    - input schemas derive from workflow README Inputs sections
    - daily-briefing.input.schema.json is the reference pattern
  approvals_required: []
  next_agent_suggested: >
    Schema layer is now complete. Main thread can begin
    Task 2 (Audit CLI), Task 3 (Project Scan), Task 4
    (Approval Queue), or Task 5 (Schema Validation).
```
