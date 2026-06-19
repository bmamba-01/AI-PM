# Agent 6 Follow-up v2 — Approval Queue Mobile Screen

> **Date:** 2026-06-19  
> **Requested by:** Orchestrator  
> **Priority:** Medium — completes the approval queue UI across all surfaces  
> **Depends on:** Agent 6 desktop work (completed), Agent 5 mobile component spec (completed)  
> **Blocks:** Nothing — mobile is the final UI surface for the approval queue

---

## Task Contract

```yaml
task_id: agent-6-approval-mobile
project_id: ai-pm-toolkit
requested_by: orchestrator
assigned_agent: developer
objective: |
  Build the approval queue mobile screen using Agent 5's mobile component
  spec. Replace the existing ApprovalsScreen stub with a functional UI
  using mock data.
context:
  methodology: hybrid
  project_type: product_delivery
  source_refs:
    - type: file
      id: docs/product/approval-queue-mobile-components.md
      description: Full mobile component spec with navigation, props, state
    - type: file
      id: docs/product/approval-queue-ux.md
      description: UX spec §4 (mobile view requirements)
    - type: file
      id: packages/mobile/src/App.tsx
      description: React Navigation setup and RootStackParamList
    - type: file
      id: packages/mobile/src/screens/ApprovalsScreen.tsx
      description: Existing stub to replace
constraints:
  - Work only inside packages/mobile/src/
  - Do not modify packages/core/, packages/cli/, or packages/desktop/
  - Follow existing mobile patterns (React Navigation, StyleSheet)
  - Use mock data initially (will be wired to runtime later)
  - All screens must have "Sample Data" indicator
required_outputs:
  - name: approval-mobile-screens
    format: typescript
quality_gate:
  checklist_id: approval-mobile-gate
  approval_required: false
deadline: medium-priority
```

---

## Prompt

```text
You are Agent 6 working on the AI-PM Toolkit repository.
You previously completed the desktop approval panel and fixed the daily.ts regression.
This task builds the mobile approval queue screens.

## Step 0: Read context files

1. docs/product/approval-queue-mobile-components.md (full spec)
2. docs/product/approval-queue-ux.md §4 (mobile requirements)
3. packages/mobile/src/App.tsx (navigation setup)
4. packages/mobile/src/screens/ApprovalsScreen.tsx (existing stub)
5. docs/architecture/approval-queue-runtime-contract.md §4 (API endpoints)

## Step 1: Update RootStackParamList

Edit `packages/mobile/src/App.tsx`:

Add `ApprovalDetail` screen to the navigation type:

```typescript
export type RootStackParamList = {
  Dashboard: undefined;
  Tasks: undefined;
  Approvals: undefined;
  ApprovalDetail: { approvalId: string };
  Chat: undefined;
  Reports: undefined;
  Settings: undefined;
};
```

Add the screen to the Stack.Navigator:

```typescript
<Stack.Screen name="Approvals" component={ApprovalsScreen} options={{ title: 'Approvals' }} />
<Stack.Screen name="ApprovalDetail" component={ApprovalDetailScreen} options={{ title: 'Approval Detail' }} />
```

## Step 2: Build ApprovalsScreen

Replace `packages/mobile/src/screens/ApprovalsScreen.tsx` with a full implementation:

### Component structure (from spec):

```
ApprovalsScreen
├── ApprovalFilterChips (horizontal ScrollView: All | Pending | Urgent | Done)
├── ApprovalCountBadge (header right, live count)
├── FlatList<ApprovalItem>
│   └── ApprovalListItem
│       ├── PriorityDot (colored)
│       ├── Title (truncated, 2 lines)
│       ├── MetaRow (workflow · target_system · age)
│       └── SwipeActions (swipe-right = approve, swipe-left = reject)
└── "Sample Data" banner at top
```

### Mock data (4 items):

```typescript
const mockApprovals = [
  {
    id: "APR-001",
    title: "Create Jira issue: Follow-up on DB migration",
    status: "pending",
    priority: "critical",
    targetSystem: "jira",
    confidence: 92,
    requestedBy: "AI Agent",
    requestedAt: "2026-06-19T08:30:00Z",
  },
  {
    id: "APR-002",
    title: "Publish weekly client report",
    status: "revision_requested",
    priority: "high",
    targetSystem: "confluence",
    confidence: 78,
    requestedBy: "AI Agent",
    requestedAt: "2026-06-18T16:45:00Z",
  },
  {
    id: "APR-003",
    title: "PR #234 merge approval",
    status: "approved",
    priority: "medium",
    targetSystem: "github",
    confidence: 95,
    requestedBy: "AI Agent",
    requestedAt: "2026-06-17T14:20:00Z",
  },
  {
    id: "APR-004",
    title: "Update sprint velocity metrics",
    status: "expired",
    priority: "low",
    targetSystem: "jira",
    confidence: 65,
    requestedBy: "AI Agent",
    requestedAt: "2026-06-15T10:00:00Z",
  },
];
```

### Filter chips:

```typescript
const filters = ["All", "Pending", "Urgent", "Done"] as const;
```

- "All" = all items
- "Pending" = status === "pending"
- "Urgent" = priority === "critical" || priority === "high"
- "Done" = status === "approved" || status === "expired"

### List item card:

Each item shows:
- Priority dot (critical=red, high=orange, medium=blue, low=green)
- Title (truncated to 2 lines)
- Meta row: workflow name · target system · age (e.g., "2h ago", "3d ago")
- Status badge (colored)
- Tap navigates to ApprovalDetailScreen

### Swipe actions (from spec):

Use `react-native-gesture-handler` Swipeable:
- Swipe right → green background → Approve action
- Swipe left → red background → Reject action
- Only enabled for `pending` and `revision_requested` items
- 80px threshold

If Swipeable is not available, use long-press menu instead:
- Long press shows ActionSheet with Approve/Reject/Details options

## Step 3: Build ApprovalDetailScreen

Create `packages/mobile/src/screens/ApprovalDetailScreen.tsx`:

### Component structure (from spec):

```
ApprovalDetailScreen (full-screen scrollable)
├── ScrollView
│   ├── ApprovalDetailHeader
│   │   ├── Title
│   │   ├── Status badge
│   │   ├── Priority badge
│   │   ├── Confidence score (compact)
│   │   ├── Target system + target ID
│   │   ├── Created at / Deadline
│   │   └── Revision round (if > 0)
│   ├── ApprovalChangePreview (collapsible, defaults collapsed)
│   ├── ApprovalSourceRefs (collapsible)
│   └── ApprovalRevisionHistory (if revision_round > 0)
│
└── ApprovalActionSheet (fixed bottom bar)
    ├── ApproveButton (primary, green)
    ├── RejectButton (destructive, opens reason input)
    ├── RequestRevisionButton (secondary, opens comment input)
    └── DelegateButton (tertiary link)
```

### Navigation params:

```typescript
type Props = NativeStackScreenProps<RootStackParamList, 'ApprovalDetail'>;
```

Read `approvalId` from route params, find item in mock data.

### Action buttons:

- Approve: shows confirmation alert, then goes back to list
- Reject: shows TextInput sheet for reason (min 10 chars), then goes back
- Request Revision: shows TextInput sheet for instructions (min 10 chars), then goes back
- Delegate: shows user picker (mock list of users), then goes back

After any action, `navigation.goBack()` and list refreshes via useFocusEffect.

## Step 4: Update bottom tab bar

If the bottom tab bar doesn't already include an Approvals tab, add it:

```typescript
<Tab.Screen name="Approvals" component={ApprovalsScreen} options={{ tabBarBadge: 3 }} />
```

Use a mock badge count (3) initially.

## Step 5: Verify

```bash
# 1. ApprovalsScreen exists and is updated
wc -l packages/mobile/src/screens/ApprovalsScreen.tsx

# 2. ApprovalDetailScreen exists
ls packages/mobile/src/screens/ApprovalDetailScreen.tsx

# 3. RootStackParamList includes ApprovalDetail
grep -n "ApprovalDetail" packages/mobile/src/App.tsx

# 4. Mock data present (not empty)
grep -c "APR-00" packages/mobile/src/screens/ApprovalsScreen.tsx

# 5. Sample Data indicator
grep -n "Sample Data" packages/mobile/src/screens/ApprovalsScreen.tsx

# 6. Swipe or long-press actions
grep -n "Swipeable\|ActionSheet\|Alert.alert" packages/mobile/src/screens/ApprovalsScreen.tsx

# 7. Try mobile build (may need pnpm install first)
pnpm --filter @ai-pm/mobile build 2>&1 | tail -10
```

## Step 6: Report

```yaml
task_id: agent-6-approval-mobile
status: completed | blocked | failed
summary: one-line description
findings:
  - severity: info
    title: what you built
    detail: files created/modified, screens implemented
    source_ref: packages/mobile/src/
recommendations:
  - action: wire mobile screens to runtime approval queue when ready
    owner: developer
    priority: low
artifacts:
  - path_or_url: packages/mobile/src/
    type: diff
confidence: 0-100
open_questions: []
audit:
  sources_used:
    - list of files read
  assumptions:
    - mobile uses mock data (will be wired to runtime later)
    - Swipeable available from react-native-gesture-handler
    - ApprovalDetail is nested in Approvals stack navigator
  approvals_required: []
  next_agent_suggested: >
    Agent 6 has completed all UI surfaces for the approval queue.
    The full stack is now: specs (Agent 5) + desktop (Agent 6) +
    mobile (Agent 6). Main thread can begin runtime implementation.
```
