# Agent 2 Follow-up Prompt — README Trim

> **Date:** 2026-06-19  
> **Requested by:** Orchestrator  
> **Priority:** Low — non-blocking  
> **Depends on:** Agent 2 initial delivery (completed)  
> **Blocks:** Nothing — cosmetic fix

---

## Task Contract

```yaml
task_id: agent-2-readme-trim
project_id: ai-pm-toolkit
requested_by: orchestrator
assigned_agent: developer
objective: |
  Trim templates/README.md to list only the 9 templates that actually
  exist. Remove phantom category entries (especially planning/) and
  phantom template names that were never created.
context:
  methodology: hybrid
  project_type: product_delivery
  source_refs:
    - type: file
      id: templates/README.md
      description: Current README listing 33 template types, only 9 exist
    - type: file
      id: docs/agent-delegation/2026-06-19-agent-2-review.md
      description: Review findings showing README mismatch
constraints:
  - Do not create new templates — only edit README.md
  - Do not modify any existing template files
  - Do not modify packages/, mcp/, workflows/, or playbooks/
  - Keep the category directory structure so future templates can be added
  - List only templates that actually exist on disk
required_outputs:
  - name: updated-readme
    format: markdown
  - name: verification
    format: command-output
quality_gate:
  checklist_id: readme-trim-gate
  approval_required: false
deadline: low-priority
```

---

## Prompt

```text
You are Agent 2 working on the AI-PM Toolkit repository.
Your task is to fix templates/README.md to match reality.

## Problem

templates/README.md currently lists 7 categories with 33 template types.
Only 9 templates actually exist on disk. The README overpromises.
Specifically:

- `planning/` is listed but the directory does not exist
- `meetings/` lists agenda, MoM, decision log, action tracker — only agenda and MoM exist
- `reports/` lists daily, weekly, client, steering, sprint, release, budget — only daily and weekly exist
- `risks/` lists risk register, issue log, mitigation plan, escalation note — only risk register exists
- `requirements/` lists BRD, PRD, SRS, FRD, user story, acceptance criteria, traceability — only change-request and acceptance-criteria exist
- `qa/` lists test plan, test cases, UAT checklist, regression checklist — only test plan exists
- `code-review/` lists PR review, test gap analysis, merge readiness — only merge readiness exists

## What to do

1. Read templates/README.md
2. Run `find templates -type f` to confirm what actually exists
3. Edit templates/README.md so that:
   - Each category lists ONLY the templates that exist as files
   - The `planning/` category is removed entirely (directory does not exist)
   - The category structure is preserved so future templates can be added
   - A note is added that more templates will be added over time

## Target content for README.md

The updated README should look like this (or similar):

```markdown
# Templates

This directory stores reusable PM templates consumed by workflows and agents.

## Categories

- `meetings/`: agenda, minutes of meeting.
- `reports/`: daily briefing, weekly status.
- `risks/`: risk register.
- `requirements/`: change request, acceptance criteria.
- `qa/`: test plan.
- `code-review/`: merge readiness.

Additional templates (decision log, action tracker, WBS, roadmap, test cases,
UAT checklist, etc.) will be added as workflows mature.

Templates should stay generic. Project-specific outputs belong under the
relevant project workspace or local memory store.
```

## Verification

After editing, run:

```bash
# Confirm README exists and is readable
cat templates/README.md

# Confirm every template listed in README actually exists as a file
rg -o '`[^`]+\.md`' templates/README.md | tr -d '`' | while read f; do
  [ -f "templates/$f" ] && echo "OK: $f" || echo "MISSING: $f"
done

# Confirm no phantom directories
ls templates/planning/ 2>&1  # should say "No such file or directory"
```

## Return format

```yaml
task_id: agent-2-readme-trim
status: completed | blocked | failed
summary: one-line description
findings:
  - severity: info
    title: what you fixed
    detail: before/after
    source_ref: templates/README.md
recommendations:
  - action: none expected
    owner: none
    priority: low
artifacts:
  - path_or_url: templates/README.md
    type: diff
confidence: 95
open_questions: []
audit:
  sources_used:
    - templates/README.md
    - find templates -type f output
  assumptions:
    - README should match actual file inventory
  approvals_required: []
  next_agent_suggested: none
```
