# Agent Delegation Prompts

Use these prompts with three independent agents. Each agent must start from the repository entrypoints and must not change runtime code unless the prompt explicitly allows it.

## Prompt 1: Operating Layer Consistency Review

```text
You are Agent 1 working on the AI-PM Toolkit repository.

Start by reading these files in order:
1. AGENTS.md
2. README.md
3. docs/superpowers/specs/2026-06-18-ai-pm-toolkit-design.md
4. docs/superpowers/plans/2026-06-18-ai-pm-operating-layer.md
5. docs/operating-model/agent-operating-model.md
6. docs/operating-model/subagent-protocol.md
7. docs/operating-model/approval-policy.md

Your job:
- Review the operating layer for contradictions, missing cross-references, vague rules, and places where another AI agent could misunderstand what to do.
- Check AGENTS.md, CLAUDE.md, CODEX.md, README.md, docs/operating-model, playbooks, workflows, and mcp docs.
- Do not modify package source code.
- Do not rewrite the whole documentation style.
- Make only small documentation patches that improve clarity, routing, or safety.

Expected output:
1. A short findings summary.
2. A list of files changed.
3. Any remaining concerns you did not fix.
4. Verification commands you ran.

Validation commands:
rg -n "2026-06-18-ai-pm-toolkit-design|2026-06-18-ai-pm-operating-layer|canonical" AGENTS.md CLAUDE.md CODEX.md README.md docs
rg -n "UNRESOLVED[_]MARKER|CHANGE[_]ME[_]MARKER|FIX[_]ME[_]MARKER" AGENTS.md CLAUDE.md CODEX.md README.md docs playbooks workflows mcp
git diff --stat
```

## Prompt 2: PM Template Library Baseline

```text
You are Agent 2 working on the AI-PM Toolkit repository.

Start by reading these files in order:
1. AGENTS.md
2. README.md
3. docs/superpowers/specs/2026-06-18-ai-pm-toolkit-design.md
4. templates/README.md
5. workflows/daily-briefing/README.md
6. workflows/meeting-intelligence/README.md
7. workflows/reporting/README.md
8. workflows/risk-control/README.md
9. workflows/scope-control/README.md
10. playbooks/project-types/tm.md
11. playbooks/project-types/fixed-cost.md

Your job:
- Create practical Markdown templates that agents and PMs can use immediately.
- Work only inside templates/.
- Do not modify runtime code.
- Do not modify mcp/, packages/, or workflows/.

Create these files:
- templates/meetings/agenda.md
- templates/meetings/minutes-of-meeting.md
- templates/reports/daily-briefing.md
- templates/reports/weekly-status.md
- templates/risks/risk-register.md
- templates/requirements/change-request.md
- templates/requirements/acceptance-criteria.md
- templates/qa/test-plan.md
- templates/code-review/merge-readiness.md

Each template must include:
- purpose
- when to use
- required inputs
- Markdown body template
- approval notes if relevant
- source/audit section

Expected output:
1. List of templates created.
2. Notes on how each template maps to workflows.
3. Verification commands you ran.

Validation commands:
rg --files templates
rg -n "Purpose|Required Inputs|Approval|Source|Audit" templates
git diff --stat templates
```

## Prompt 3: MCP Connector Implementation Matrix

```text
You are Agent 3 working on the AI-PM Toolkit repository.

Start by reading these files in order:
1. AGENTS.md
2. README.md
3. docs/superpowers/specs/2026-06-18-ai-pm-toolkit-design.md
4. mcp/registry.yaml
5. mcp/profiles/default.yaml
6. mcp/profiles/offline-local.yaml
7. mcp/contracts/work-tracker.md
8. mcp/contracts/documentation.md
9. mcp/contracts/source-control.md
10. mcp/contracts/communication.md
11. mcp/contracts/calendar.md
12. mcp/contracts/local-memory.md

Your job:
- Create a practical MCP implementation matrix for future connector work.
- Work only inside docs/architecture/ and mcp/examples/.
- Do not modify package source code.
- Do not change mcp/registry.yaml unless you find a clear contradiction; if you do, explain it first in your final response.

Create these files:
- docs/architecture/mcp-implementation-matrix.md
- docs/architecture/mcp-connector-lifecycle.md
- mcp/examples/project-mcp-profile.yaml

The matrix should cover:
- connector priority
- required workflows
- read capabilities
- mutation capabilities
- approval requirements
- degraded mode behavior
- first implementation recommendation

Expected output:
1. Summary of matrix decisions.
2. Files changed.
3. Any registry issues found.
4. Verification commands you ran.

Validation commands:
rg -n "github|jira|linear|filesystem|sqlite|approval|required_for|degraded" docs/architecture mcp/examples
git diff --stat docs/architecture mcp/examples
```

