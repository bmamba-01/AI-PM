# Agent 5 Follow-up v2 — Approval Queue Component Specs

> **Date:** 2026-06-19  
> **Requested by:** Orchestrator  
> **Priority:** Medium — enables Agent 6 to implement desktop/mobile approval UI  
> **Depends on:** Agent 5's full approval queue spec layer (UX + runtime contract + CLI spec, all completed)  
> **Blocks:** Agent 6 (Desktop Daily Brief Panel) — component specs define the React components Agent 6 will build

---

## Task Contract

```yaml
task_id: agent-5-component-specs
project_id: ai-pm-toolkit
requested_by: orchestrator
assigned_agent: developer
objective: |
  Design the React component specs for the approval queue on desktop and mobile.
  The UX spec defines behavior, the runtime contract defines API, the CLI spec
  defines terminal access. This spec defines the actual React component tree,
  props, state management, and data flow that Agent 6 will implement.
context:
  methodology: hybrid
  project_type: product_delivery
  source_refs:
    - type: file
      id: docs/product/approval-queue-ux.md
      description: UX spec defining states, views, layouts per surface
    - type: file
      id: docs/architecture/approval-queue-runtime-contract.md
      description: Runtime contract with API endpoints and data model
    - type: file
      id: docs/product/approval-queue-cli-spec.md
      description: CLI spec (completed, for context)
    - type: file
      id: packages/desktop/src/App.tsx
      description: Desktop app entry point and layout
    - type: file
      id: packages/desktop/src/components/Layout.tsx
      description: Desktop sidebar and main content area
    - type: file
      id: packages/desktop/src/components/tabs/DailyBriefTab.tsx
      description: DailyBrief tab with pending approvals card
    - type: file
      id: packages/mobile/src/App.tsx
      description: Mobile app entry point
constraints:
  - Work only inside docs/product/ and docs/architecture/
  - Do not modify packages/ code
  - Follow existing component patterns from the desktop and mobile packages
  - Each component must map to the runtime contract API
  - Specs must be detailed enough for Agent 6 to implement without ambiguity
required_outputs:
  - name: desktop-component-spec
    format: markdown
  - name: mobile-component-spec
    format: markdown
quality_gate:
  checklist_id: component-spec-gate
  approval_required: false
deadline: medium-priority
```

---

## Prompt

```text
You are Agent 5 working on the AI-PM Toolkit repository.
You previously created the approval queue UX spec, runtime contract, and CLI spec.
This task designs the React component specs for desktop and mobile.

## Step 0: Read context files

1. docs/product/approval-queue-ux.md (§3 Desktop, §4 Mobile)
2. docs/architecture/approval-queue-runtime-contract.md (§4 API, §6 Desktop Integration, §7 Mobile Integration)
3. packages/desktop/src/App.tsx
4. packages/desktop/src/components/Layout.tsx
5. packages/desktop/src/components/tabs/DailyBriefTab.tsx
6. packages/mobile/src/App.tsx
7. packages/cli/src/commands/approval.ts (if it exists, for pattern reference)

## Step 1: Design desktop component spec

Create docs/product/approval-queue-desktop-components.md

### Component Tree

```
ApprovalsView (new top-level view)
├── ApprovalFilters (filter tabs: All | Pending | Revision | Expired | Completed)
├── ApprovalQueueList (left panel — scrollable list)
│   └── ApprovalQueueItem (single row — priority badge, title, source, age, target)
├── ApprovalDetail (center panel — full item detail)
│   ├── ApprovalHeader (title, type badge, priority, status, confidence)
│   ├── ApprovalContent (description, summary_diff, source_refs)
│   ├── ApprovalActions (approve, reject, revision, delegate buttons)
│   └── ApprovalAuditTrail (collapsible — audit records, revision history)
└── ApprovalBadge (sidebar notification badge — pending count)
```

### For each component, document:

1. **Props interface** — TypeScript props with types
2. **State management** — what data it fetches, how it caches, what events it subscribes to
3. **API calls** — which endpoints it calls and when
4. **User interactions** — click handlers, keyboard shortcuts, confirmation flows
5. **Edge cases** — empty states, loading states, error states, offline states

### Key integration points:

- **Sidebar:** Add "Approvals" nav item under Operations section. The `ActiveView` type must include `"approvals"`. Badge shows live pending count.
- **DailyBriefTab:** The "Pending Approvals" card becomes a link to ApprovalsView with `?status=pending` filter.
- **WebSocket:** Subscribe to `approval:created`, `approval:decided`, `approval:status_changed`, `approval:count_updated` events for real-time updates.
- **State store:** Use the existing desktop state management pattern (check project-store.ts for the pattern). Approval state lives in the local server, not in the desktop store — the desktop is a thin renderer.

### Layout spec:

- Three-column layout: left (queue list, 320px), center (detail, flex), right (audit, 280px collapsible)
- Right panel collapses to icon on narrow windows (< 1200px)
- Filter tabs at top of left panel
- Action buttons fixed at bottom of center panel
- Keyboard shortcuts: A (approve), R (reject), V (revision), D (delegate), ↑/↓ (navigate), Enter (open), Esc (close)

## Step 2: Design mobile component spec

Create docs/product/approval-queue-mobile-components.md

### Component Tree

```
ApprovalsScreen (new bottom tab)
├── ApprovalFilterChips (filter chips: All | Pending | Urgent | Done)
├── ApprovalList (scrollable FlatList)
│   └── ApprovalListItem (card — priority dot, title, source, age)
│       └── SwipeActions (swipe-right: approve, swipe-left: reject)
├── ApprovalDetailScreen (full-screen modal)
│   ├── ApprovalDetailHeader (title, badges)
│   ├── ApprovalDetailContent (description, diff preview — collapsible)
│   └── ApprovalDetailActions (fixed bottom — approve, reject, revision, delegate)
└── OfflineIndicator (banner when offline — "Queued — will sync when online")
```

### For each component, document:

1. **Props interface** — React Native props with types
2. **Navigation** — how it connects to React Navigation (screen name, params)
3. **State management** — fetch pattern, cache strategy, offline handling
4. **Pull-to-refresh** — implementation notes
5. **Push notification deep-linking** — how tapping a notification opens the detail screen

### Key integration points:

- **Bottom tab bar:** Add "Approvals" tab with count badge
- **Dashboard card:** "Pending Approvals" summary card (max 3 items, "See all" link)
- **Offline:** Cache last-fetched pending items in encrypted local storage. Queue approve/reject/revision actions. Sync on reconnect. Visual indicator.
- **Push notifications:** Subscribe to `approval:created` (critical/high only) and `approval:status_changed` (assigned to user)

## Step 3: Verify

```bash
# 1. Confirm both files created
ls docs/product/approval-queue-desktop-components.md docs/product/approval-queue-mobile-components.md

# 2. Confirm component tree documented
rg -n "Component Tree|Props interface|State management" docs/product/approval-queue-desktop-components.md docs/product/approval-queue-mobile-components.md

# 3. Confirm API calls documented
rg -n "GET /api|POST /api|DELETE /api" docs/product/approval-queue-desktop-components.md docs/product/approval-queue-mobile-components.md

# 4. No modifications outside docs/
git diff --name-only docs/
```

## Step 4: Report

```yaml
task_id: agent-5-component-specs
status: completed | blocked | failed
summary: one-line description
findings:
  - severity: info
    title: what you created
    detail: files created, components designed
    source_ref: docs/product/
recommendations:
  - action: Agent 6 can now implement desktop approval panel
    owner: agent_6
    priority: medium
artifacts:
  - path_or_url: docs/product/approval-queue-desktop-components.md
    type: report
  - path_or_url: docs/product/approval-queue-mobile-components.md
    type: report
confidence: 0-100
open_questions: []
audit:
  sources_used:
    - list of files read
  assumptions:
    - desktop uses existing state management pattern
    - mobile uses React Navigation
    - both surfaces are thin renderers over local server API
  approvals_required: []
  next_agent_suggested: >
    Agent 6 can implement the desktop approval panel using
    the component specs. Agent 5 has completed the full
    approval queue specification layer.
```
