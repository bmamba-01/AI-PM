# Acceptance Criteria Template

## Purpose
Define unambiguous, testable conditions that must be satisfied for a requirement, feature, or deliverable to be accepted. Basis for test design, user validation, and release decisions.

## When to Use
- During requirement elaboration (before design/development)
- As part of user story / feature definition of done
- During QA test case design
- During user acceptance testing (UAT)
- For contractually-bound deliverables

## Required Inputs
| Input | Source | Required |
|-------|--------|----------|
| Requirement / user story ID and description | Product backlog / requirements doc | Yes |
| Business context and user value | Product owner / business analyst | Yes |
| Edge cases and error handling | Technical analysis | Yes |
| Non-functional constraints | Architecture / NFR doc | As applicable |
| Regulatory / compliance needs | Compliance / legal | As applicable |

---

## Markdown Body Template

```markdown
# Acceptance Criteria - [Requirement / Feature Name]

**Requirement ID:** REQ-XXX / US-XXX  
**Title:** [Short descriptive title]  
**Priority:** Must have / Should have / Could have / Won't have  
**Source:** [User story / stakeholder request / regulation]  
**Version:** 1.0  
**Last updated:** YYYY-MM-DD  

---

## User Story (if applicable)

> As a [role],  
> I want [capability],  
> So that [business value].

---

## Context

[Brief description of the problem, current behavior, and desired outcome. Attach mockups, data models, or process diagrams as needed.]

---

## Acceptance Criteria

### Functional

| # | Given | When | Then | Testable? |
|---|-------|------|------|-----------|
| AC-01 | [Precondition / initial state] | [Action / trigger] | [Expected outcome / system behavior] | [Yes / No] |
| AC-02 | | | | [Yes / No] |
| AC-03 | | | | [Yes / No] |

### Edge Cases and Error Handling

| # | Scenario | Expected Behavior | Error Message / Code |
|---|----------|-------------------|----------------------|
| AC-04 | [Invalid input / timeout / missing permission] | [System response] | [Message / code] |

### Non-Functional

| # | Attribute | Target / Constraint | Verification Method |
|---|-----------|--------------------|--------------------|
| AC-05 | Performance | e.g., P95 latency < 500ms for API | Load test |
| AC-06 | Security | e.g., No PII in logs / OAuth required | Static analysis / manual review |
| AC-07 | Availability | e.g., 99.9% during business hours | Uptime monitoring |
| AC-08 | Compatibility | e.g., Chrome latest 2 versions | Browser matrix |

### Regulatory / Compliance (if applicable)

| # | Requirement | Evidence Required |
|---|-------------|-------------------|
| AC-09 | e.g., GDPR: user deletion within 72h | SOP + test script |

---

## Definition of Done Mapping

- [ ] Code complete and reviewed
- [ ] Unit tests written and passing (>=X% coverage)
- [ ] Integration tests passing
- [ ] Documentation updated (user guide, API docs)
- [ ] Security / privacy review completed (if applicable)
- [ ] Performance criteria met
- [ ] Product Owner sign-off
- [ ] UAT sign-off (if required)

---

## Test Design Notes

[Guidance for QA: data setup, test environment assumptions, known limitations, third-party services to mock.]

---

## References

- **Requirement:** [Link to REQ / user story]
- **Design doc:** [Link]
- **API spec:** [Link]
- **Mockup:** [Link]

```

---

## Approval Notes
- **Product Owner** approves acceptance criteria before development starts.
- **QA Lead** reviews criteria for testability and edge case coverage.
- **Tech Lead** confirms non-functional criteria are technically feasible.
- Criteria changes after baseline approval require a Change Request (CR).

## Source / Audit
- **Template Version:** 1.0
- **Created:** 2026-06-19
- **Source Workflow:** `workflows/scope-control/`, `playbooks/quality/requirements-traceability.md`
- **Related Templates:** `templates/requirements/change-request.md`
- **Governance:** ISTQB Glossary; PMBOK Validate Scope; ISO/IEC 25010 Quality Model