# Agent 2 Follow-up v2 — Template Index and Metadata

> **Date:** 2026-06-19  
> **Requested by:** Orchestrator  
> **Priority:** Low — metadata layer for template discovery  
> **Depends on:** Agent 2 initial templates (completed), Agent 2 README trim (completed)  
> **Blocks:** Nothing — enables future template-aware workflows

---

## Task Contract

```yaml
task_id: agent-2-template-index
project_id: ai-pm-toolkit
requested_by: orchestrator
assigned_agent: developer
objective: |
  Create a machine-readable template index (YAML) that maps each template
  to its category, workflow, approval requirement, output format, and owner
  role. This enables runtime template discovery and workflow-aware template
  selection.
context:
  methodology: hybrid
  project_type: product_delivery
  source_refs:
    - type: file
      id: templates/README.md
      description: Current template inventory (9 templates, 6 categories)
    - type: file
      id: workflows/daily-briefing/README.md
      description: Workflow contract for daily briefing template mapping
    - type: file
      id: workflows/meeting-intelligence/README.md
      description: Workflow contract for meeting templates
    - type: file
      id: workflows/reporting/README.md
      description: Workflow contract for reporting templates
    - type: file
      id: workflows/risk-control/README.md
      description: Workflow contract for risk template
    - type: file
      id: workflows/scope-control/README.md
      description: Workflow contract for requirements templates
    - type: file
      id: workflows/code-quality-guard/README.md
      description: Workflow contract for QA and code review templates
    - type: file
      id: docs/operating-model/approval-policy.md
      description: Approval rules for template-generated outputs
constraints:
  - Work only inside templates/
  - Do not modify packages/, mcp/, workflows/, or docs/
  - Create templates/templates.yaml only
  - Do not modify any existing template files
required_outputs:
  - name: template-index
    format: yaml
quality_gate:
  checklist_id: template-index-gate
  approval_required: false
deadline: low-priority
```

---

## Prompt

```text
You are Agent 2 working on the AI-PM Toolkit repository.
You previously created 9 templates and trimmed the README.
This task creates a machine-readable template index.

## Step 0: Read context files

1. templates/README.md (current inventory)
2. workflows/daily-briefing/README.md
3. workflows/meeting-intelligence/README.md
4. workflows/reporting/README.md
5. workflows/risk-control/README.md
6. workflows/scope-control/README.md
7. workflows/code-quality-guard/README.md
8. docs/operating-model/approval-policy.md

## Step 1: Create templates/templates.yaml

Create a YAML file that catalogs all 9 templates with metadata:

```yaml
# AI-PM Template Index
# Machine-readable catalog for template discovery and workflow mapping.
# Last updated: 2026-06-19

version: 1
templates:
  - id: meeting-agenda
    path: meetings/agenda.md
    category: meetings
    name: Meeting Agenda
    description: Structured framework for planning and conducting effective project meetings
    workflow: meeting-intelligence
    approval_required: false
    output_format: markdown
    owner_role: pm
    required_inputs:
      - meeting_title
      - date_time
      - attendees
      - agenda_items
    source_workflow: workflows/meeting-intelligence/

  - id: meeting-mom
    path: meetings/minutes-of-meeting.md
    category: meetings
    name: Minutes of Meeting
    description: Concise, accurate, actionable record of meeting proceedings
    workflow: meeting-intelligence
    approval_required: true
    output_format: markdown
    owner_role: pm
    required_inputs:
      - meeting_title
      - date_time
      - attendees
      - discussion_notes
      - decisions
      - action_items
    approval_gate: >
      Note-taker prepares draft. Facilitator reviews. Project Lead/Sponsor
      approves final version for governance meetings.
    source_workflow: workflows/meeting-intelligence/

  - id: daily-briefing
    path: reports/daily-briefing.md
    category: reports
    name: Daily Briefing
    description: Concise daily project status snapshot for stakeholders
    workflow: daily-briefing
    approval_required: false
    output_format: markdown
    owner_role: pm
    required_inputs:
      - completed_tasks
      - in_progress_tasks
      - blockers
      - risks
      - milestones
      - decisions
    source_workflow: workflows/daily-briefing/

  - id: weekly-status
    path: reports/weekly-status.md
    category: reports
    name: Weekly Status Report
    description: Structured weekly summary of delivery progress and health
    workflow: reporting
    approval_required: true
    output_format: markdown
    owner_role: pm
    required_inputs:
      - milestone_completion
      - schedule_variance
      - budget_burn
      - risks
      - decisions
      - next_week_focus
    approval_gate: >
      PM authorship required. Functional Managers validate resource/budget.
      Project Sponsor review for SteerCo distribution.
    source_workflow: workflows/reporting/

  - id: risk-register
    path: risks/risk-register.md
    category: risks
    name: Risk Register
    description: Single authoritative list of project risks with assessment and tracking
    workflow: risk-control
    approval_required: true
    output_format: markdown
    owner_role: pm
    required_inputs:
      - risk_statement
      - category
      - likelihood
      - impact
      - owner
      - mitigation
    approval_gate: >
      Risk Owner validates assessment. PM consolidates and approves before
      distribution. SteerCo reviews high/critical risks.
    source_workflow: workflows/risk-control/

  - id: change-request
    path: requirements/change-request.md
    category: requirements
    name: Change Request
    description: Formal capture, assessment, and approval of scope/schedule/cost changes
    workflow: scope-control
    approval_required: true
    output_format: markdown
    owner_role: pm
    required_inputs:
      - change_description
      - business_justification
      - impact_assessment
      - alternatives
    approval_gate: >
      No work starts until CR formally approved. Change Authority must be
      identified. Sponsor approval for >10% budget or >20% timeline impact.
    source_workflow: workflows/scope-control/

  - id: acceptance-criteria
    path: requirements/acceptance-criteria.md
    category: requirements
    name: Acceptance Criteria
    description: Unambiguous, testable conditions for requirement acceptance
    workflow: scope-control
    approval_required: true
    output_format: markdown
    owner_role: ba
    required_inputs:
      - requirement_id
      - business_context
      - edge_cases
      - non_functional_constraints
    approval_gate: >
      PO approves before development. QA Lead reviews for testability.
      Tech Lead confirms non-functional criteria feasibility.
    source_workflow: workflows/scope-control/

  - id: test-plan
    path: qa/test-plan.md
    category: qa
    name: Test Plan
    description: Strategy, scope, resources, and exit criteria for system verification
    workflow: code-quality-guard
    approval_required: true
    output_format: markdown
    owner_role: qa
    required_inputs:
      - requirements
      - acceptance_criteria
      - test_environment
      - automation_frameworks
      - risk_register
    approval_gate: >
      QA Lead owns and approves before execution. Tech Lead confirms
      environment assumptions. PM validates schedule alignment.
    source_workflow: workflows/code-quality-guard/

  - id: merge-readiness
    path: code-review/merge-readiness.md
    category: code-review
    name: Merge Readiness
    description: Lightweight checklist for PR safety and completeness before merge
    workflow: code-quality-guard
    approval_required: true
    output_format: markdown
    owner_role: tech_lead
    required_inputs:
      - pr_description
      - linked_requirements
      - test_results
      - security_review
    approval_gate: >
      Author completes checks before review. Reviewer verifies evidence.
      PM/Tech Lead approve for breaking changes. CI gates must pass.
    source_workflow: workflows/code-quality-guard/
```

## Step 2: Verify

```bash
# 1. Confirm file created
ls templates/templates.yaml

# 2. Confirm valid YAML
node -e "const yaml = require('yaml'); const fs = require('fs'); yaml.parse(fs.readFileSync('templates/templates.yaml','utf8')); console.log('VALID YAML')"

# 3. Confirm all 9 templates indexed
grep -c "^  - id:" templates/templates.yaml

# 4. Confirm all required fields present
rg "id:|path:|category:|workflow:|approval_required:|output_format:|owner_role:" templates/templates.yaml | wc -l

# 5. Confirm no modifications outside templates/
git diff --name-only templates/
```

## Step 3: Report

```yaml
task_id: agent-2-template-index
status: completed | blocked | failed
summary: one-line description
findings:
  - severity: info
    title: what you created
    detail: templates.yaml with 9 entries, all metadata fields
    source_ref: templates/templates.yaml
recommendations:
  - action: runtime can now discover templates by category, workflow, or role
    owner: main_thread
    priority: low
artifacts:
  - path_or_url: templates/templates.yaml
    type: diff
confidence: 0-100
open_questions: []
audit:
  sources_used:
    - templates/README.md
    - workflow README files (6)
    - approval-policy.md
  assumptions:
    - template metadata matches workflow README contracts
    - approval_required flags align with approval-policy.md
  approvals_required: []
  next_agent_suggested: >
    Agent 2 template work is complete. All 9 templates created,
    README trimmed, and metadata index built.
```
