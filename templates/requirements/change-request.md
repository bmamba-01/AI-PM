# Change Request Template

## Purpose
Formally capture, assess, approve/reject, and trace changes to project scope, schedule, cost, or quality. Ensure no unauthorized change reaches the delivery team.

## When to Use
- When any stakeholder requests a new feature, requirement change, or scope addition after baseline approval
- When a change is identified that affects schedule, cost, quality, or resources
- For both internal (product owner) and external (client, vendor) changes
- Before implementing any deviation from the approved baseline

## Required Inputs
| Input | Source | Required |
|-------|--------|----------|
| Change description | Requestor | Yes |
| Reason / business justification | Requestor | Yes |
| Impact assessment (scope/schedule/cost/quality) | PM + relevant lead | Yes |
| Alternatives considered | PM / team | Yes |
| Approval from change authority | CCB / Sponsor / PO | Yes (before implementation) |

---

## Markdown Body Template

```markdown
# Change Request - [Project Name]

**CR ID:** CR-00X  
**Title:** [Short descriptive title]  
**Submitted by:** [Name / Role]  
**Date submitted:** YYYY-MM-DD  
**Status:** Submitted / Under Review / Approved / Rejected / Implemented / Withdrawn  
**Change Authority:** [CCB / Sponsor / PO - who can approve]  

---

## Description of Change

[Describe the requested change clearly. What is the current state? What is the requested future state? Include references to affected documents or components.]

---

## Reason / Business Justification

[Why is this change needed? What problem does it solve or what value does it deliver? Quantify if possible.]

---

## Impact Assessment

### Scope
- **Items added/modified/removed:** [List]
- **Requirements affected:** [IDs/titles]
- **Downstream impacts:** [Other teams, integrations, docs]

### Schedule
- **Current baseline finish:** YYYY-MM-DD
- **Proposed finish:** YYYY-MM-DD
- **Variance:** +X days / -X days
- **Critical path impact:** [Yes/No - explain]

### Cost
- **Cost impact:** +$X / -$X / neutral
- **Budget line affected:** [If tracked separately]
- **ROI / payback:** [If applicable]

### Quality
- **Acceptance criteria change:** [Yes/No]
- **Test/rework effort:** [Estimate]
- **Risk of regression:** [H/M/L]

### Resources
- **Additional resources needed:** [Yes/No - detail]
- **Skill requirements:** [If different]

---

## Alternatives Considered

| Alternative | Description | Pros | Cons | Recommendation |
|-------------|-------------|------|------|----------------|
| A | [Option A] | [Pros] | [Cons] | [Recommended / Not recommended] |
| B | [Option B] | [Pros] | [Cons] | [Recommended / Not recommended] |
| C | No change (reject CR) | Preserves baseline | Loses benefit | [If proposed] |

---

## Implementation Plan (if approved)

| Step | Activity | Owner | Due Date | Dependencies |
|------|----------|-------|----------|--------------|
| 1 | [Task] | [Name] | YYYY-MM-DD | - |
| 2 | [Task] | [Name] | YYYY-MM-DD | [Depends on] |

---

## Approval

| Role | Name | Decision | Date | Signature |
|------|------|----------|------|-----------|
| Project Manager | | Approve / Reject | | |
| Change Authority (CCB/Sponsor) | | Approve / Reject | | |
| Product Owner (if scope change) | | Approve / Reject | | |

---

## Implementation Tracking

| Step | Status | Actual Start | Actual End | Notes |
|------|--------|--------------|------------|-------|
| 1 | Not started / In progress / Done | | | |
| 2 | | | | |

---

## Closure

**Implemented by:** [Name]  
**Implemented date:** YYYY-MM-DD  
**Baseline updated:** [Yes / No - if yes, which documents]  
**Lessons learned:** [Notes from this change for future]

```

---

## Approval Notes
- **No work shall start on the change until CR is formally approved.** Workaround or emergency changes require immediate post-hoc CR submission.
- **Change Authority** must be clearly identified in the project's IDS (Issue Decision Structure).
- For scope changes affecting more than 10% of baseline budget or more than 20% of timeline, Sponsor approval is mandatory.

## Source / Audit
- **Template Version:** 1.0
- **Created:** 2026-06-19
- **Source Workflow:** `workflows/scope-control/`
- **Related Templates:** `templates/risks/risk-register.md`, `templates/requirements/acceptance-criteria.md`
- **Governance:** PMBOK Perform Integrated Change Control; PRINCE2 Change Control