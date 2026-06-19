# Agent 6 Follow-up Prompt — Fix daily.ts + Build Approval Panel

> **Date:** 2026-06-19  
> **Requested by:** Orchestrator  
> **Priority:** High — daily.ts regression must be fixed before other work  
> **Depends on:** Agent 6 initial delivery (DashboardTab + daily.ts), Agent 5 component specs  
> **Blocks:** Nothing, but daily.ts fix is required before any CLI integration work

---

## Task Contract

```yaml
task_id: agent-6-fix-and-approval-panel
project_id: ai-pm-toolkit
requested_by: orchestrator
assigned_agent: developer
objective: |
  Two tasks: (1) Fix the daily.ts regression where runtime logic was
  replaced with hardcoded mocks, and (2) build the approval queue
  desktop panel using Agent 5's component specs.
context:
  methodology: hybrid
  project_type: product_delivery
  source_refs:
    - type: file
      id: packages/cli/src/commands/daily.ts
      description: Current file with regression — runtime logic replaced by mocks
    - type: file
      id: docs/superpowers/plans/2026-06-18-cli-daily-briefing.md
      description: Original plan for daily briefing CLI
    - type: file
      id: packages/core/src/workflows/dailyBriefing.ts
      description: Core workflow function that daily.ts should call
    - type: file
      id: packages/core/src/runtime/localProjectStore.ts
      description: Local project store for reading data
    - type: file
      id: docs/product/approval-queue-desktop-components.md
      description: Component spec for approval queue panel
    - type: file
      id: docs/product/approval-queue-ux.md
      description: UX spec for approval states and flows
    - type: file
      id: docs/architecture/approval-queue-runtime-contract.md
      description: Runtime contract with API endpoints
    - type: file
      id: packages/desktop/src/components/tabs/DashboardTab.tsx
      description: Current desktop dashboard with Daily Briefing panel
    - type: file
      id: packages/desktop/src/components/Layout.tsx
      description: Desktop sidebar and layout
    - type: file
      id: packages/desktop/src/state/project-store.ts
      description: Zustand store with ActiveView type
constraints:
  - Task 1 (daily.ts fix): MUST preserve the bilingual messages and output format options from current file, but RESTORE the runtime logic from the original file
  - Task 2 (approval panel): Work only inside packages/desktop/src/
  - Do not modify packages/core/ or packages/mcp/
  - Follow existing component patterns (glass-card, Card, Badge from UI library)
  - Approval panel uses mock data initially (like Daily Briefing panel)
  - Every new component must have clear "Sample Data" indicator
required_outputs:
  - name: fixed-daily-ts
    format: typescript
  - name: approval-panel
    format: typescript
quality_gate:
  checklist_id: agent-6-fix-and-panel-gate
  approval_required: false
deadline: high-priority (fix) + medium-priority (panel)
```

---

## Prompt

```text
You are Agent 6 working on the AI-PM Toolkit repository.
You previously created a Daily Briefing panel in DashboardTab and modified daily.ts.
There is a regression in daily.ts that must be fixed first.

## TASK 1: Fix daily.ts regression (HIGH PRIORITY)

### Problem

The original daily.ts had runtime logic:
- Imported `generateDailyBriefing` from `@ai-pm/core/workflows`
- Imported `LocalProjectStore` from `@ai-pm/core/runtime`
- Read real project data from `.ai-pm/daily-items.json`
- Had fallback logic when no data was available

Your version replaced all of this with hardcoded mock data and removed the core imports.

### What to do

1. Read the ORIGINAL file content from git:
```bash
git show HEAD:packages/cli/src/commands/daily.ts
```

2. Read the CURRENT file:
```
packages/cli/src/commands/daily.ts
```

3. Create a MERGED version that:
   - KEEPS your bilingual messages (msgs.en / msgs.vi) ✅
   - KEEPS your output format options (--output text/json/markdown) ✅
   - KEEPS your ora spinner ✅
   - RESTORES the original runtime imports:
     ```typescript
     import { generateDailyBriefing, type DailyBriefingInputItem } from '@ai-pm/core/workflows';
     import { LocalProjectStore } from '@ai-pm/core/runtime';
     ```
   - RESTORES the `todayIso()` helper function
   - RESTORES the `defaultLocalItems()` function
   - RESTORES the `LocalProjectStore` usage to load real data
   - RESTORES the `generateDailyBriefing()` call
   - MERGES your bilingual messages INTO the original structure
   - MERGES your output format logic INTO the original action handler

The result should be a file that:
- Uses real runtime logic (not hardcoded mocks)
- Has bilingual support (EN/VI)
- Supports --output text/json/markdown
- Has the MCP config check
- Has proper error handling

### Verification

```bash
# 1. Confirm runtime imports are present
grep -n "generateDailyBriefing\|LocalProjectStore" packages/cli/src/commands/daily.ts

# 2. Confirm bilingual messages are present
grep -n "msgs\.\(en\|vi\)" packages/cli/src/commands/daily.ts

# 3. Confirm output format options
grep -n "output.*json\|output.*markdown" packages/cli/src/commands/daily.ts

# 4. Confirm no hardcoded mock data blocks
grep -n "Submit sprint report\|Review PR #142" packages/cli/src/commands/daily.ts
# Should return NO matches — these are hardcoded mocks that should be removed
```

## TASK 2: Build Approval Queue Desktop Panel (MEDIUM PRIORITY)

After fixing daily.ts, build the approval queue panel.

### Step 0: Read component spec

Read these files:
1. docs/product/approval-queue-desktop-components.md (full spec)
2. docs/product/approval-queue-ux.md §3 (desktop view requirements)
3. docs/architecture/approval-queue-runtime-contract.md §4 (API endpoints)
4. packages/desktop/src/components/tabs/DashboardTab.tsx (pattern reference)
5. packages/desktop/src/state/project-store.ts (ActiveView type)

### Step 1: Update ActiveView type

Edit `packages/desktop/src/state/project-store.ts`:

Add `"approvals"` to the ActiveView union type:

```typescript
export type ActiveView =
  | "dashboard" | "daily-brief" | "sprint" | "meeting"
  | "backlog" | "timeline" | "risks"
  | "code-review" | "reports"
  | "mcp-servers" | "agents" | "settings"
  | "approvals";  // NEW
```

### Step 2: Add sidebar navigation

Edit `packages/desktop/src/components/Sidebar.tsx`:

Add an "Approvals" nav item in the Operations section:

```typescript
{ id: "approvals", label: "Approvals", icon: ShieldCheck },
```

Add a badge showing pending count (use mock count initially):

```typescript
{view === "approvals" && pendingCount > 0 && (
  <span className="ml-auto text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-[#FF3B30] text-white">
    {pendingCount > 99 ? '99+' : pendingCount}
  </span>
)}
```

### Step 3: Create ApprovalsTab component

Create `packages/desktop/src/components/tabs/ApprovalsTab.tsx`:

Build the three-column layout from the component spec:

```
ApprovalsTab (main container, flex row)
├── ApprovalListPanel (left, 320px)
│   ├── Filter tabs (All | Pending | Revision | Expired | Completed)
│   └── ApprovalListItem[] (mock data)
├── ApprovalDetailPanel (center, flex-1)
│   ├── Header (title, workflow badge, confidence)
│   ├── Meta (agent, target, dates)
│   ├── Diff preview
│   ├── Source refs
│   └── Action buttons (Approve, Reject, Revision, Delegate)
└── ApprovalAuditPanel (right, 280px, collapsible)
    └── Audit trail entries
```

Use MOCK DATA for all items (like Daily Briefing panel). Include:
- 3-4 mock approval items with different statuses (pending, revision_requested, approved, expired)
- Realistic titles ("Create Jira issue: Follow-up on DB migration", "Publish weekly client report", "PR #234 merge approval")
- Different priorities (critical, high, medium, low)
- Different target systems (Jira, GitHub, Confluence)
- Confidence scores (92, 78, 65)
- Sample audit trail entries

Add "Sample Data" badge in the header.

### Step 4: Wire ApprovalsTab into ProjectView

Edit `packages/desktop/src/components/ProjectView.tsx`:

Add the approvals view to the views map:

```typescript
"approvals": <ApprovalsTab project={currentProject} />,
```

### Step 5: Verify

```bash
# 1. daily.ts has runtime imports
grep -n "generateDailyBriefing\|LocalProjectStore" packages/cli/src/commands/daily.ts

# 2. daily.ts has bilingual support
grep -n "msgs\.\(en\|vi\)" packages/cli/src/commands/daily.ts

# 3. ApprovalsTab exists
ls packages/desktop/src/components/tabs/ApprovalsTab.tsx

# 4. ActiveView includes approvals
grep -n "approvals" packages/desktop/src/state/project-store.ts

# 5. Sidebar has approvals nav item
grep -n "approvals" packages/desktop/src/components/Sidebar.tsx

# 6. No hardcoded mock data in daily.ts
! grep -n "Submit sprint report" packages/cli/src/commands/daily.ts

# 7. Try desktop build (may need pnpm install first)
pnpm --filter @ai-pm/desktop build 2>&1 | tail -5

# 8. Try CLI build
pnpm --filter @ai-pm/cli build 2>&1 | tail -5
```

## Step 6: Report

```yaml
task_id: agent-6-fix-and-approval-panel
status: completed | blocked | failed
summary: one-line description
findings:
  - severity: info | high | critical
    title: what you did
    detail: files changed, regression fixed, panel built
    source_ref: packages/
recommendations:
  - action: what should happen next
    owner: who should do it
    priority: medium
artifacts:
  - path_or_url: packages/
    type: diff
confidence: 0-100
open_questions: []
audit:
  sources_used:
    - list of files read
  assumptions:
    - approval panel uses mock data (will be wired to runtime later)
    - daily.ts restore uses original runtime logic
  approvals_required: []
  next_agent_suggested: >
    Agent 6 can next build the approval queue mobile screen
    using the mobile component spec from Agent 5.
```
