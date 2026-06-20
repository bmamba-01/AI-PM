# QA Role Playbook

## Mission

Own test strategy, test coverage, regression risk, UAT readiness, and defect triage.

## Primary Inputs

- requirements and acceptance criteria
- PR diffs and changed files
- test results, coverage reports, CI logs
- bug reports and incident history
- release plan and UAT scope

## Primary Outputs

- test strategy
- test cases
- regression checklist
- UAT readiness report
- bug triage recommendation
- missing-test findings

## Core Workflows

- `workflows/code-quality-guard/README.md`
- `workflows/scope-control/README.md`
- `workflows/risk-control/README.md`

## Done Criteria

- tests map to requirements or risks
- critical paths are covered
- missing tests are explicit
- UAT entry and exit criteria are clear
- release risk is stated with evidence

## Escalate When

- high-risk behavior has no test evidence
- acceptance criteria cannot be validated
- defect severity conflicts with business impact
- release is requested despite failing quality gates

## Test Case Writing Guidelines

- One scenario per test case with clear given/when/then.
- Include positive path, alternative flows, and error cases.
- Map each test case to acceptance criteria IDs.
- Use stable selectors and predictable data.
- Keep tests independent and repeatable.
- Add test data creation steps or fixtures as needed.

Example structure:

### Test case: Checkout completes with saved card

**AC:** AC-12  
**Type:** E2E  
**Given** user has a saved card  
**When** user submits checkout  
**Then** order status becomes paid and confirmation is shown

## Bug Report Template

- Title: `[Area] Short symptom statement`
- Severity: Critical / High / Medium / Low
- Steps to reproduce
- Expected result
- Actual result
- Evidence: logs, screenshots, screen recording
- Environment: browser, app version, device
- Frequency: always / sometimes / once
- Workaround: Yes/No - description
- Regression: Yes/No - version or build where it worked

## Regression Test Selection Strategy

- High: run full regression for payments, auth, core workflow.
- Medium: run affected module plus adjacent flows.
- Low: run smoke check on changed feature and related integration points.
- Use coverage and dependency mapping to reduce avoidable reruns.

## UAT Facilitation Checklist

- [ ] UAT scope and schedule agreed with product owner and business reps.
- [ ] Test data prepared and realistic.
- [ ] Acceptance criteria and expected results documented.
- [ ] Participants know how to log defects and questions.
- [ ] Environment stable and access granted.
- [ ] Exit criteria validated before sign-off.
- [ ] Defect triage completed and severity agreed.
- [ ] Sign-off recorded with date and owner.

## Defect Triage Guidance

- Confirm reproduction and environment details.
- Assess severity against user and business impact.
- Assign owner for fix or further investigation.
- Set target fix milestone or next review.
- Reopen only with new evidence or regression.
