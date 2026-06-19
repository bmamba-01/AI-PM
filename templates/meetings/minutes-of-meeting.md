# Minutes of Meeting Template

## Purpose
Capture a concise, accurate, and actionable record of meeting proceedings. Serves as the official reference for decisions, action items, and discussions.

## When to Use
- Every formal project meeting (weekly sync, sprint review, stakeholder review, etc.)
- Ad-hoc decision meetings
- Any meeting where decisions or action items result

## Required Inputs
| Input | Source | Required |
|-------|--------|----------|
| Agenda document | `templates/meetings/agenda.md` | Yes |
| Attendee list (actual) | Meeting facilitator | Yes |
| Notes taken during meeting | Note-taker | Yes |
| Decisions made | Meeting discussion | Yes |
| Action items assigned | Meeting discussion | Yes |

---

## Markdown Body Template

```markdown
# [Meeting Title] - Minutes

**Date:** YYYY-MM-DD  
**Time:** HH:MM - HH:MM [Timezone]  
**Meeting ID:** [Optional: e.g., PROJ-2026-06-19-001]  
**Location/Link:** [Physical room or video conference link]  

---

## Attendees

### Present
- [Name] - [Role/Organization]
- [Name] - [Role/Organization]

### Absent (Notified)
- [Name] - [Role] - [Reason]

### Absent (No Notice)
- [Name] - [Role]

---

## Agenda Summary

| # | Topic | Presenter | Time Spent |
|---|-------|-----------|------------|
| 1 | [Topic 1] | [Name] | XX min |
| 2 | [Topic 2] | [Name] | XX min |
| 3 | [Topic 3] | [Name] | XX min |

---

## Discussion Highlights

### Topic 1: [Title]
**Summary:** [2-3 sentences capturing key points, concerns raised, data presented]  
**Key Points:**
- [Point 1]
- [Point 2]

### Topic 2: [Title]
**Summary:** [2-3 sentences]  
**Key Points:**
- [Point 1]
- [Point 2]

---

## Decisions Made

| Decision ID | Decision | Context / Rationale | Decision Maker(s) | Impact |
|-------------|----------|--------------------|-------------------|--------|
| DEC-001 | [Decision statement] | [Why this decision was made] | [Name/Role] | [Scope/Schedule/Budget/Quality] |
| DEC-002 | | | | |

---

## Action Items

| Action ID | Description | Owner | Due Date | Priority | Status | Related Decision |
|-----------|-------------|-------|----------|----------|--------|------------------|
| AI-001 | [Clear, actionable task] | [Name] | YYYY-MM-DD | High/Med/Low | Open | DEC-001 |
| AI-002 | | | | | Open | |
| AI-003 | | | | | Open | |

---

## Risks / Issues Raised

| ID | Description | Severity | Owner | Mitigation / Next Step |
|----|-------------|----------|-------|------------------------|
| RISK-001 | [New risk identified] | High/Med/Low | [Name] | [Action] |
| ISS-001 | [New issue identified] | Critical/High/Med | [Name] | [Action] |

---

## Parking Lot (Deferred Items)

| Item | Reason Deferred | Follow-up Meeting / Owner |
|------|-----------------|---------------------------|
| [Topic] | [Time ran out / Need more data] | [Date / Name] |

---

## Next Meeting

**Proposed Date:** YYYY-MM-DD  
**Proposed Time:** HH:MM [Timezone]  
**Proposed Agenda Focus:** [Key topics]

---

## Distribution List

- [Name] - [Role] - [Email]
- [Name] - [Role] - [Email]

---

## Approval

**Minutes Prepared By:** [Note-taker Name] - [Date]  
**Minutes Reviewed By:** [Facilitator Name] - [Date]  
**Minutes Approved By:** [Project Lead / Sponsor Name] - [Date]

---

### Attachments
- [Presentation slides](link)
- [Relevant documents](link)

```

---

## Approval Notes
- **Note-taker** prepares draft within 4 hours of meeting end.
- **Facilitator** reviews for accuracy within 24 hours.
- **Project Lead/Sponsor** approves final version (required for governance meetings).
- Approved minutes are immutable - corrections require an addendum.

## Source / Audit
- **Template Version:** 1.0
- **Created:** 2026-06-19
- **Source Workflow:** `workflows/meeting-intelligence/`
- **Related Templates:** `templates/meetings/agenda.md`
- **Governance:** ISO 9001 Clause 7.5 (Documented Information), PMBOK Manage Communications