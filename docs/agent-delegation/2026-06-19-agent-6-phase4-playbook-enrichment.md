# Coding Agent 6 — Phase 4: Playbook Enrichment

> **Type:** Docs task (no code changes)
> **Priority:** Medium — improves agent-readability of playbooks
> **Depends on:** Nothing — standalone
> **Blocks:** Nothing

## Task

Enrich the existing playbooks with more detailed procedures, checklists, and examples. Current playbooks are thin (43-54 lines each). They need to be actionable for AI agents.

## Files to modify

All files in `playbooks/`:

### Quality playbooks (highest priority)

1. `playbooks/quality/code-quality-guard.md` (54 lines → target 120+)
   - Add: step-by-step PR review checklist
   - Add: severity classification guide (critical/high/medium/low with examples)
   - Add: merge readiness criteria
   - Add: common anti-patterns to catch

2. `playbooks/quality/testing-strategy.md` (46 lines → target 100+)
   - Add: test pyramid guidance (unit/integration/e2e ratios)
   - Add: when to write each test type
   - Add: coverage targets by project phase
   - Add: CI/CD test pipeline recommendations

3. `playbooks/quality/requirements-traceability.md` (46 lines → target 100+)
   - Add: traceability matrix template
   - Add: how to link requirements to tests
   - Add: change request impact analysis steps

### Role playbooks (second priority)

4. `playbooks/roles/pm.md` (48 lines → target 100+)
   - Add: daily standup preparation checklist
   - Add: sprint planning facilitation guide
   - Add: stakeholder communication templates
   - Add: risk escalation decision tree

5. `playbooks/roles/developer.md` (44 lines → target 90+)
   - Add: PR description checklist
   - Add: code review self-check before requesting review
   - Add: commit message conventions
   - Add: debugging workflow

6. `playbooks/roles/qa.md` (44 lines → target 90+)
   - Add: test case writing guidelines
   - Add: bug report template
   - Add: regression test selection strategy
   - Add: UAT facilitation checklist

### Methodology playbooks (third priority)

7. `playbooks/methodologies/scrum.md` — add sprint ceremony checklists
8. `playbooks/methodologies/kanban.md` — add WIP limit guidance
9. `playbooks/methodologies/waterfall.md` — add phase gate criteria
10. `playbooks/methodologies/hybrid.md` — add when to use hybrid approach

### Project type playbooks (fourth priority)

11. `playbooks/project-types/tm.md` — add T&M reporting cadence
12. `playbooks/project-types/fixed-cost.md` — add scope control procedures
13. `playbooks/project-types/product-delivery.md` — add release readiness checklist
14. `playbooks/project-types/maintenance.md` — add SLA tracking guidance

## Key constraints

- Only modify playbooks/ files — no code changes
- Each playbook should be self-contained (agent can read just one)
- Use checklists (checkbox format) for actionable items
- Include concrete examples, not just theory
- Reference other playbooks where relevant (cross-links)

## Verification

```bash
# All playbooks should be longer than before
for f in playbooks/**/*.md; do echo "$(wc -l < "$f") $f"; done | sort -n

# No broken cross-references
rg -n "playbooks/" playbooks/ | grep -v ".md:.*#" | head -20
```
