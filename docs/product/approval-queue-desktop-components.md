# Approval Queue Desktop Component Specification

**Date:** 2026-06-19  
**Status:** Design draft  
**Audience:** Desktop implementers (Agent 6, packages/desktop)  
**References:** [approval-queue-ux.md](../product/approval-queue-ux.md) §3, [approval-queue-runtime-contract.md](../architecture/approval-queue-runtime-contract.md) §4, [approval-queue-cli-spec.md](../product/approval-queue-cli-spec.md)

## 1. Component Tree

```text
ApprovalsTab
├── ApprovalToolbar
│   ├── ApprovalFilterTabs        (All | Pending | Revision | Expired | Completed)
│   ├── ApprovalBulkActions       (batch approve/reject, same workflow + target only)
│   └── ApprovalSearchInput       (optional text search)
│
├── ApprovalListPanel             (left column, ~320px)
│   └── ApprovalListItem[]        (one per item, clickable)
│       ├── PriorityBadge         (colored dot)
│       ├── Title (truncated)
│       ├── SourceWorkflowBadge
│       ├── AgeIndicator
│       └── QuickStatusBadge
│
├── ApprovalDetailPanel           (center column, flex-1)
│   ├── ApprovalHeader
│   │   ├── Title
│   │   ├── SourceWorkflowBadge
│   │   └── ConfidenceScore       (arc indicator)
│   ├── ApprovalMeta
│   │   ├── RequestingAgent       (name + role)
│   │   ├── TargetSystem          (e.g., "Jira PROJ-1234")
│   │   ├── CreatedAt / Deadline
│   │   └── RevisionRound         (if > 0)
│   ├── ApprovalDiffPreview       (diff / email body / PR comment draft)
│   ├── ApprovalSourceRefs        (list of MCP data used)
│   └── ApprovalActionBar
│       ├── ApproveButton
│       ├── ApproveAndRememberButton
│       ├── RejectButton
│       ├── RequestRevisionButton
│       └── DelegateButton
│
└── ApprovalAuditPanel            (right column, collapsible, ~280px)
    ├── ApprovalAuditTrail        (revision history)
    ├── RelatedItems              (same workflow run)
    └── AuditLogLink              (link to originating audit entry)
```

## 2. Integration Points

### 2.1 State Management

The approvals view integrates with the existing Zustand store (`packages/desktop/src/state/project-store.ts`).

**Add to `ActiveView` union:**

```typescript
export type ActiveView =
  | "dashboard" | "daily-brief" | "sprint" | "meeting"
  | "backlog" | "timeline" | "risks"
  | "code-review" | "reports"
  | "mcp-servers" | "agents" | "settings"
  | "approvals";  // NEW
```

**New `ApprovalState` slice (separate store or extend project-store):**

```typescript
interface ApprovalState {
  // Data
  items: ApprovalItem[];
  selectedItem: ApprovalItem | null;
  counts: Record<string, number>;
  policies: ApprovalPolicyRule[];

  // UI state
  filter: ApprovalFilter;
  isLoading: boolean;
  error: string | null;

  // Actions
  fetchItems: (filters?: ApprovalFilter) => Promise<void>;
  fetchItemDetail: (id: string) => Promise<void>;
  decide: (id: string, decision: 'approve' | 'reject' | 'revision', payload: DecidePayload) => Promise<void>;
  delegate: (id: string, userId: string, note?: string) => Promise<void>;
  fetchCounts: () => Promise<void>;
  fetchPolicies: () => Promise<void>;
  revokePolicy: (id: string) => Promise<void>;
  selectItem: (item: ApprovalItem | null) => void;
  refresh: () => Promise<void>;
}

interface ApprovalFilter {
  status?: string;
  priority?: string;
  workflow?: string;
  search?: string;
}

interface DecidePayload {
  reason?: string;    // required for reject
  notes?: string;     // required for revision
}
```

### 2.2 Navigation

Approvals is a sidebar view, not a routed screen. It follows the same pattern as Dashboard, Sprint, Risks, etc.

**Sidebar entry (Sidebar.tsx):**

Add to the "Operations" section in `navSections`:

```typescript
{ id: "approvals", label: "Approvals", icon: ShieldCheck },
```

The badge count is a live indicator next to the nav item:

```typescript
// In Sidebar.tsx, after the label:
{pendingCount > 0 && (
  <span className="ml-auto text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-[#FF3B30] text-white">
    {pendingCount > 99 ? '99+' : pendingCount}
  </span>
)}
```

**ProjectView routing:**

```typescript
// In ProjectView.tsx views map:
"approvals": <ApprovalsTab project={currentProject} />,
```

### 2.3 Header Integration

The header shows a pulsing bell icon when critical/high items are pending.

```typescript
// In Header.tsx, add notification bell:
<NotificationBell count={criticalCount} />
```

The bell uses the existing glass-card pattern. When count > 0, it pulses with a red dot overlay.

## 3. Props Interface

### 3.1 ApprovalsTab (main container)

```typescript
interface ApprovalsTabProps {
  project: Project;
}
```

No additional props — the component reads from the Zustand approval store. The `project` prop is passed through for API scoping (project_id parameter).

### 3.2 ApprovalListPanel

```typescript
interface ApprovalListPanelProps {
  items: ApprovalItem[];
  selectedId: string | null;
  onSelect: (item: ApprovalItem) => void;
  isLoading: boolean;
  filter: ApprovalFilter;
  onFilterChange: (filter: ApprovalFilter) => void;
  counts: Record<string, number>;
}
```

### 3.3 ApprovalListItem

```typescript
interface ApprovalListItemProps {
  item: ApprovalItem;
  isSelected: boolean;
  onClick: () => void;
  showBulkCheckbox?: boolean;
  bulkSelected?: boolean;
  onBulkToggle?: () => void;
}
```

### 3.4 ApprovalDetailPanel

```typescript
interface ApprovalDetailPanelProps {
  item: ApprovalItem | null;
  onDecide: (decision: 'approve' | 'reject' | 'revision', payload: DecidePayload) => void;
  onDelegate: (userId: string, note?: string) => void;
  isDeciding: boolean;
}
```

### 3.5 ApprovalActionBar

```typescript
interface ApprovalActionBarProps {
  status: ApprovalStatus;
  onApprove: () => void;
  onApproveAndRemember: () => void;
  onReject: () => void;
  onRequestRevision: () => void;
  onDelegate: () => void;
  isDeciding: boolean;
}
```

Button visibility by status:

| Status | Approve | Approve & Remember | Reject | Revision | Delegate |
|---|---|---|---|---|---|
| `pending` | ✓ | ✓ | ✓ | ✓ | ✓ |
| `revision_requested` | ✓ | ✓ | ✓ | ✓ | ✓ |
| `expired` | ✗ (re-queue first) | ✗ | ✗ | ✗ | ✗ |
| `approved` | ✗ | ✗ | ✗ | ✗ | ✗ |
| `rejected` | ✗ | ✗ | ✗ | ✗ | ✗ |
| `executing` | ✗ | ✗ | ✗ | ✗ | ✗ |
| `executed` | ✗ | ✗ | ✗ | ✗ | ✗ |
| `execution_failed` | ✓ (retry) | ✗ | ✓ | ✓ | ✓ |

### 3.6 ApprovalAuditPanel

```typescript
interface ApprovalAuditPanelProps {
  item: ApprovalItem;
  isCollapsed: boolean;
  onToggle: () => void;
}
```

### 3.7 ApprovalDiffPreview

```typescript
interface ApprovalDiffPreviewProps {
  summaryDiff: string;
  itemType: string;          // determines rendering style
  targetSystem: string;
}
```

Rendering by `itemType`:

| itemType | Preview style |
|---|---|
| `github_pr_comment`, `github_pr_merge` | Code diff with syntax highlighting |
| `jira_issue_*` | Field change table (old → new) |
| `email_send` | Email body preview (plain text or markdown) |
| `report_publish` | Markdown rendered preview |
| `confluence_*`, `notion_*` | Page content preview |
| `scope_baseline_change`, `milestone_date_change` | Side-by-side diff |
| Default | Plain text with monospace font |

### 3.8 ConfidenceScore

```typescript
interface ConfidenceScoreProps {
  score: number;    // 0–100
  size?: 'sm' | 'md' | 'lg';
}
```

Visual: filled arc indicator. Green ≥ 80, amber 60–79, red < 60. Size `sm` = 32px diameter (list), `md` = 48px (detail), `lg` = 64px (full detail).

### 3.9 NotificationBell (header)

```typescript
interface NotificationBellProps {
  count: number;    // critical + high count
  onClick?: () => void;
}
```

## 4. API Calls and Fetch Pattern

### 4.1 Local Server API Base

```typescript
const API_BASE = 'http://localhost:3847';
```

### 4.2 Fetch Pattern

All API calls follow this pattern:

```typescript
async function apiFetch<T>(method: string, path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: { message: res.statusText } }));
    throw new Error(err.error?.message || `HTTP ${res.status}`);
  }
  return res.json();
}
```

### 4.3 API Endpoints Used

| Action | Method | Endpoint | Trigger |
|---|---|---|---|
| List items | `GET` | `/api/approvals?status=X&priority=Y&workflow=Z&limit=N` | On view mount, filter change, refresh |
| Get detail | `GET` | `/api/approvals/:id` | Item selected in list |
| Get audit trail | `GET` | `/api/approvals/:id/audit` | Audit panel expanded |
| Get counts | `GET` | `/api/approvals/count` | On mount, after decision, periodic |
| Decide | `POST` | `/api/approvals/:id/decide` | Approve/Reject/Revision button |
| Delegate | `POST` | `/api/approvals/:id/delegate` | Delegate button |
| List policies | `GET` | `/api/approval-policies` | Approve & Remember modal |
| Revoke policy | `DELETE` | `/api/approval-policies/:id` | Policy list revoke button |

### 4.4 Cache Strategy

| Data | Cache | TTL | Invalidation |
|---|---|---|---|
| Item list | Zustand store | 30 seconds | On filter change, after decision, manual refresh |
| Item detail | Zustand store | 30 seconds | On select, after decision |
| Counts | Zustand store | 15 seconds | On mount, after decision, periodic (every 15s) |
| Audit trail | Not cached | — | Fetch on demand when audit panel opened |
| Policies | Zustand store | 60 seconds | After revoke, manual refresh |

### 4.5 Periodic Refresh

The approvals tab subscribes to a 15-second interval for count updates when the view is active. On count change, the list is NOT auto-refreshed — only the badge updates. A "New items available" banner appears at the top of the list if the count increased.

```typescript
// In ApprovalsTab mount:
useEffect(() => {
  if (activeView !== 'approvals') return;
  const interval = setInterval(() => fetchCounts(), 15_000);
  return () => clearInterval(interval);
}, [activeView]);
```

### 4.6 Offline Handling

Desktop is online-only (connects to local server). If the server is unreachable:

- Show a full-width error banner: "Cannot connect to local server. Ensure ai-pm server is running."
- Hide the detail panel and show an empty state with a retry button.
- The `isOnline` flag from the project store is used to toggle the banner.

## 5. Pull-to-Refresh

Desktop does not use pull-to-refresh. Instead:

- A **Refresh** button in the `ApprovalToolbar` (top-right, uses the `RefreshCw` icon from lucide-react).
- Keyboard shortcut: `Ctrl+R` / `Cmd+R` when the approvals tab is active.
- After any decision (approve/reject/revision), the list auto-refreshes.
- A "Last updated: X seconds ago" timestamp is shown next to the refresh button.

## 6. Push Notification Deep-Linking

Desktop does not use mobile push notifications. Instead:

- **In-app notification bell** in the header shows count of critical + high items.
- Clicking the bell navigates to the approvals tab with `status=pending&priority=critical,high` pre-filtered.
- When a new critical/high item arrives (detected by periodic count check), a toast notification appears:

```typescript
// Toast notification on new critical/high items:
toast({
  title: "New approval required",
  description: `${item.title} (${item.priority})`,
  action: {
    label: "Review",
    onClick: () => {
      setActiveView("approvals");
      selectItem(item);
    }
  }
});
```

## 7. Visual Requirements

### 7.1 Color System (matches existing glass-card theme)

| Element | Style |
|---|---|
| Priority: critical | `bg-[#FF3B30]` dot, text `text-[#FF3B30]` |
| Priority: high | `bg-[#FF9500]` dot, text `text-[#FF9500]` |
| Priority: medium | `bg-[#FFCC00]` dot, text `text-[#FFCC00]` |
| Priority: low | `bg-[#8E8E93]` dot, text `text-[#8E8E93]` |
| Status: pending | Badge `text-[#FFCC00]` |
| Status: revision_requested | Badge `text-[#5AC8FA]` |
| Status: expired | Badge `text-[#FF3B30]` dim |
| Status: approved | Badge `text-[#34C759]` |
| Status: rejected | Badge `text-[#FF3B30]` |
| Confidence ≥ 80 | `text-[#34C759]` |
| Confidence 60–79 | `text-[#FF9500]` |
| Confidence < 60 | `text-[#FF3B30]` |

### 7.2 Layout

- Three-column layout: `grid-cols-[320px_1fr_280px]` (audit panel collapsible).
- When audit panel is collapsed: `grid-cols-[320px_1fr]`.
- Minimum width for detail panel: 400px.
- List items use `glass-card` with `hover:bg-white/5` transition.
- Selected item has `liquid-border` glow effect.

### 7.3 Responsive Behavior

- Below 1200px: audit panel auto-collapses.
- Below 900px: list panel collapses to icon-only mode (priority dot + status badge), detail panel takes full width.
- Below 768px: show a "Use mobile app for approval actions" message with a link.

## 8. Keyboard Shortcuts

| Key | Action | Context |
|---|---|---|
| `A` | Approve selected item | Detail panel focused |
| `R` | Reject selected item | Detail panel focused |
| `V` | Request revision | Detail panel focused |
| `D` | Delegate | Detail panel focused |
| `↑` / `↓` | Navigate list | List panel focused |
| `Enter` | Open detail of selected item | List panel focused |
| `Esc` | Close detail panel / deselect | Any |
| `Ctrl+R` / `Cmd+R` | Refresh | Approvals tab active |
| `/` | Focus search input | Approvals tab active |

## 9. Empty States

### 9.1 No Items

```text
┌─────────────────────────────────────┐
│                                     │
│     ✓  All caught up!               │
│                                     │
│  No pending approval items.         │
│  Agent actions will appear here     │
│  when they need your review.        │
│                                     │
└─────────────────────────────────────┘
```

### 9.2 No Results for Filter

```text
┌─────────────────────────────────────┐
│                                     │
│  No items match the current filter. │
│                                     │
│  [Clear Filters]                    │
│                                     │
└─────────────────────────────────────┘
```

### 9.3 Server Unreachable

```text
┌─────────────────────────────────────┐
│  ⚠ Cannot connect to local server  │
│                                     │
│  Ensure the server is running:      │
│    ai-pm server start               │
│                                     │
│  [Retry Connection]                 │
│                                     │
└─────────────────────────────────────┘
```
