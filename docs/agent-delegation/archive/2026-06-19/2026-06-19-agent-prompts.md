# Agent Delegation Prompts

Use these prompts with three independent agents after the 2026-06-18 prompts. Each task is standalone and must avoid the local memory/audit work owned by the main thread.

## Prompt 4: Workflow Schema Contracts

```text
You are Agent 4 working on the AI-PM Toolkit repository.

Start by reading these files in order:
1. AGENTS.md
2. README.md
3. docs/superpowers/specs/2026-06-18-ai-pm-toolkit-design.md
4. docs/operating-model/subagent-protocol.md
5. workflows/daily-briefing/README.md
6. workflows/meeting-intelligence/README.md
7. workflows/scope-control/README.md
8. workflows/risk-control/README.md
9. workflows/reporting/README.md
10. workflows/code-quality-guard/README.md

Your job:
- Create machine-readable JSON Schema files for workflow inputs and outputs.
- Work only inside schemas/workflows/.
- Do not modify packages/, mcp/, playbooks/, or existing workflow README files.
- Use draft 2020-12 JSON Schema.

Create:
- schemas/workflows/daily-briefing.input.schema.json
- schemas/workflows/daily-briefing.output.schema.json
- schemas/workflows/meeting-intelligence.output.schema.json
- schemas/workflows/scope-control.output.schema.json
- schemas/workflows/risk-control.output.schema.json
- schemas/workflows/reporting.output.schema.json
- schemas/workflows/code-quality-guard.output.schema.json
- schemas/workflows/README.md

Expected output:
1. Files created.
2. Any assumptions made while translating Markdown contracts to JSON Schema.
3. Verification commands you ran.

Validation commands:
rg --files schemas/workflows
rg -n "\"\\$schema\"|\"required\"|\"properties\"" schemas/workflows
```

## Prompt 5: Approval Queue UX Spec

```text
You are Agent 5 working on the AI-PM Toolkit repository.

Start by reading these files in order:
1. AGENTS.md
2. README.md
3. docs/superpowers/specs/2026-06-18-ai-pm-toolkit-design.md
4. docs/operating-model/approval-policy.md
5. workflows/reporting/README.md
6. workflows/meeting-intelligence/README.md
7. workflows/code-quality-guard/README.md
8. packages/desktop/src/App.tsx
9. packages/desktop/src/components/Layout.tsx
10. packages/mobile/src/App.tsx

Your job:
- Design the approval queue UX and runtime contract for desktop/mobile/chat.
- Work only inside docs/product/ and docs/architecture/.
- Do not modify packages/ code.

Create:
- docs/product/approval-queue-ux.md
- docs/architecture/approval-queue-runtime-contract.md

Cover:
- approval item states
- desktop view requirements
- mobile view requirements
- chat approval flow
- audit fields
- rejection and revision flow
- security constraints

Expected output:
1. UX/runtime decisions summary.
2. Files changed.
3. Open questions.
4. Verification commands you ran.

Validation commands:
rg -n "approve|reject|revision|audit|chat|mobile|desktop|security" docs/product docs/architecture
git diff --stat docs/product docs/architecture
```

## Prompt 6: Desktop Daily Brief View Design Patch

```text
You are Agent 6 working on the AI-PM Toolkit repository.

Start by reading these files in order:
1. AGENTS.md
2. README.md
3. docs/superpowers/specs/2026-06-18-ai-pm-toolkit-design.md
4. workflows/daily-briefing/README.md
5. packages/desktop/src/App.tsx
6. packages/desktop/src/components/Layout.tsx
7. packages/desktop/src/components/tabs/DashboardTab.tsx
8. packages/desktop/src/components/tabs/ReportsTab.tsx
9. packages/desktop/src/index.css

Your job:
- Add a read-only Daily Briefing panel to the desktop UI using static/sample data.
- Work only inside packages/desktop/src/components/tabs/ and package desktop UI components if needed.
- Do not modify packages/core, packages/cli, mcp, or local memory/audit code.
- Keep UI consistent with the existing desktop design.

Expected behavior:
- Dashboard shows top priorities, blockers, risks, meetings, source coverage, and confidence.
- It is clearly read-only/sample until wired to runtime.
- No new backend or IPC required.

Expected output:
1. Files changed.
2. Screenshot or description of layout if no screenshot tool is used.
3. Verification commands you ran.

Validation commands:
pnpm --filter @ai-pm/desktop build
git diff --stat packages/desktop/src/components/tabs
```

