# Approval Queue CLI Specification

**Date:** 2026-06-19  
**Status:** Design draft  
**Audience:** CLI implementers (packages/cli), main thread Task 4  
**References:** [approval-queue-runtime-contract.md](../architecture/approval-queue-runtime-contract.md) §4, [approval-queue-ux.md](../product/approval-queue-ux.md) §2/§7, [mcp.ts](../../packages/cli/src/commands/mcp.ts) (pattern reference)

## 1. Purpose

Define the `ai-pm approval` command family so the CLI provides full approval queue access from the terminal. Every command maps 1:1 to an endpoint in the runtime contract API. The CLI follows the Commander.js + chalk + ora + inquirer patterns established in `packages/cli/src/commands/mcp.ts`.

## 2. Command Tree

```text
ai-pm approval
├── list          List approval items with filters
├── show <id>     Show full detail of a single item
├── decide <id> <decision>  Submit approve/reject/revision
├── delegate <id> <user>    Delegate to another approver
├── count         Show counts by status
└── policy
    ├── list      List auto-approval policy rules
    └── revoke <id>  Revoke a policy rule
```

## 3. Command Specifications

### 3.1 `ai-pm approval list`

List approval items with optional filters.

**Options:**

| Option | Description | Default |
|---|---|---|
| `--status <status>` | Filter by status: `pending`, `revision_requested`, `expired`, `approved`, `rejected`, `executed` | all |
| `--priority <priority>` | Filter by priority: `critical`, `high`, `medium`, `low` | all |
| `--workflow <id>` | Filter by originating workflow ID | all |
| `--json` | Output as JSON | false |
| `--limit <n>` | Max items to show | 20 |

**Table output:**

```text
┌──────────┬──────────────────────────────┬──────────┬───────────┬──────────┬──────┬────────────┐
│ ID       │ Title                        │ Priority │ Status    │ Source   │ Age  │ Target     │
├──────────┼──────────────────────────────┼──────────┼───────────┼──────────┼──────┼────────────┤
│ a1b2c3d4 │ Create Jira issue: DB migr.. │ high     │ pending   │ meeting  │ 2h   │ Jira       │
│ e5f6g7h8 │ Publish weekly client report │ medium   │ pending   │ reporting│ 45m  │ Confluence │
│ i9j0k1l2 │ PR #234 merge approval       │ critical │ expired   │ code_qa  │ 3d   │ GitHub     │
└──────────┴──────────────────────────────┴──────────┴───────────┴──────────┴──────┴────────────┘
```

- Priority column uses color: `critical` = red, `high` = orange, `medium` = yellow, `low` = gray.
- Status column uses color: `pending` = yellow, `revision_requested` = cyan, `expired` = red dim, `approved` = green, `rejected` = red, `executed` = green dim.
- Age is computed from `created_at` to now: `<Xm` (< 1h), `<Xh` (< 24h), `<Xd` (< 30d), `<XM` (months).
- Table rows are sorted by priority (critical > high > medium > low), then by `created_at` ascending.

**JSON output:**

```json
{
  "items": [ { /* ApprovalItem */ } ],
  "total": 12,
  "counts": {
    "pending": 5,
    "revision_requested": 2,
    "expired": 1,
    "approved": 3,
    "executed": 1
  }
}
```

**API mapping:** `GET /api/approvals` with query params `status`, `priority`, `workflow_id`, `limit`.

---

### 3.2 `ai-pm approval show <id>`

Show full detail of a single approval item.

**Arguments:**

| Argument | Description |
|---|---|
| `id` | Approval item ID (UUID or short prefix) |

**Options:**

| Option | Description | Default |
|---|---|---|
| `--json` | Output as JSON | false |
| `--audit` | Include full audit trail | false |

**Table output (default):**

```text
Approval Detail: a1b2c3d4

  Title:          Create Jira issue: Follow-up on database migration
  Type:           jira_issue_create
  Priority:       high (orange)
  Status:         pending (yellow)
  Confidence:     92% (green)

  Workflow:       meeting-intelligence
  Run ID:         f9e8d7c6
  Agent:          meeting-intel-agent-001 (meeting)
  Project:        proj-dashboard

  Target:         Jira PROJ-5678

  Description:
    After meeting on 2026-06-19, the team decided to proceed with
    the phased migration approach. A follow-up issue is needed to
    track the migration plan.

  Summary of Changes:
    Will create Jira issue PROJ-5678: 'Phased DB Migration Plan'
    assigned to @alex, priority High, sprint backlog.

  Source References:
    1. transcript — Meeting Intelligence Meeting (2026-06-19T16:30:00Z)
    2. jira — PROJ-1234 Database Migration Risk (2026-06-19T16:00:00Z)

  Created:    2026-06-19 16:35 UTC
  Deadline:   2026-06-19 18:00 UTC
  Revision:   Round 0 of 3
  Approvals:  pm-user-001

  Execution:  pending
  Policy:     none
```

**With `--audit`:**

```text
Audit Trail for a1b2c3d4:

  1. [2026-06-19 16:35:00] created      by agent:meeting-intel-agent-001
  2. [2026-06-19 16:35:01] submitted    by system
  3. [2026-06-19 16:35:01] status_change pending → pending (policy check: no match)
```

**JSON output:** Full `ApprovalItem` object. With `--audit`, wraps in `{ "item": ApprovalItem, "audit": ApprovalAuditRecord[] }`.

**API mapping:** `GET /api/approvals/:id` (+ `GET /api/approvals/:id/audit` if `--audit`).

---

### 3.3 `ai-pm approval decide <id> <decision>`

Submit a decision on an approval item.

**Arguments:**

| Argument | Description |
|---|---|
| `id` | Approval item ID |
| `decision` | `approve`, `reject`, or `revision` |

**Options:**

| Option | Description | Required |
|---|---|---|
| `--reason <text>` | Rejection reason (min 10 chars) | Required for `reject` |
| `--notes <text>` | Revision instructions (min 10 chars) | Required for `revision` |
| `--json` | Output result as JSON | false |
| `--yes` | Skip confirmation prompt | false |

**Behavior:**

1. Validate the item exists and is in a decidable state (`pending` or `revision_requested`).
2. Validate required options (`--reason` for reject, `--notes` for revision).
3. Unless `--yes` is passed, show a confirmation prompt:

```text
You are about to APPROVE item a1b2c3d4:
  Title:    Create Jira issue: Follow-up on database migration
  Target:   Jira PROJ-5678
  Priority: high

This will execute the mutation against Jira. Continue? (y/N)
```

4. Submit the decision via API.
5. Show result:

```text
✓ Approved a1b2c3d4
  Execution status: executing
  Target: Jira PROJ-5678
```

```text
✗ Rejected a1b2c3d4
  Reason: "The issue title is too vague. Please include the specific migration phases."
```

```text
↻ Revision requested for a1b2c3d4
  Notes: "Add a dependency on PROJ-1234 and include the phased timeline."
  Revision round: 1 of 3
```

**Error cases:**

| Condition | Error message |
|---|---|
| Item not found | `Error: Approval item <id> not found` |
| Item already decided | `Error: Item <id> is already <status> (decided at <time>)` |
| Item expired | `Error: Item <id> has expired. Re-queue from desktop or mobile.` |
| Not authorized | `Error: You are not in the designated approvers list for this item` |
| Missing --reason | `Error: --reason is required for rejection (min 10 characters)` |
| Missing --notes | `Error: --notes is required for revision request (min 10 characters)` |
| Revision limit reached | `Error: Revision limit (3 rounds) reached. Item escalated to PM Commander.` |

**API mapping:** `POST /api/approvals/:id/decide`

---

### 3.4 `ai-pm approval delegate <id> <user>`

Delegate an approval item to another user.

**Arguments:**

| Argument | Description |
|---|---|
| `id` | Approval item ID |
| `user` | Target user ID or display name |

**Options:**

| Option | Description | Default |
|---|---|---|
| `--note <text>` | Optional note for the delegate | null |
| `--json` | Output result as JSON | false |
| `--yes` | Skip confirmation prompt | false |

**Behavior:**

1. Validate the item exists and is in a decidable state.
2. Unless `--yes`, confirm:

```text
Delegate item a1b2c3d4 to @maria.santos?
  Title: Create Jira issue: Follow-up on database migration
  Note:  "Please review the migration scope before approving."
```

3. Submit delegation via API.
4. Show result:

```text
✓ Delegated a1b2c3d4 to @maria.santos
```

**API mapping:** `POST /api/approvals/:id/delegate`

---

### 3.5 `ai-pm approval count`

Show count of approval items by status.

**Options:**

| Option | Description | Default |
|---|---|---|
| `--json` | Output as JSON | false |

**Table output:**

```text
Approval Queue Status

┌───────────────────┬───────┐
│ Status            │ Count │
├───────────────────┼───────┤
│ pending           │     5 │
│ revision_requested│     2 │
│ expired           │     1 │
│ approved          │     3 │
│ executed          │     1 │
├───────────────────┼───────┤
│ Total             │    12 │
└───────────────────┴───────┘
```

- `pending` row highlighted yellow.
- `expired` row highlighted red.
- Total row in bold.

**JSON output:**

```json
{
  "pending": 5,
  "revision_requested": 2,
  "expired": 1,
  "approved": 3,
  "executed": 1
}
```

**API mapping:** `GET /api/approvals/count`

---

### 3.6 `ai-pm approval policy list`

List active auto-approval policy rules.

**Options:**

| Option | Description | Default |
|---|---|---|
| `--json` | Output as JSON | false |

**Table output:**

```text
Auto-Approval Policy Rules

┌──────────┬───────────────┬──────────────┬──────────────┬───────┬──────────┬─────────┐
│ ID       │ Item Type     │ Target       │ Role         │ Scope │ Uses     │ Expires │
├──────────┼───────────────┼──────────────┼──────────────┼───────┼──────────┼─────────┤
│ r1s2t3u4 │ jira_issue_*  │ jira         │ meeting      │ 3/∞   │ 3 of ∞   │ never   │
│ v5w6x7y8 │ report_*      │ confluence   │ reporting    │ run   │ 1 of 1   │ 2026-07 │
└──────────┴───────────────┴──────────────┴──────────────┴───────┴──────────┴─────────┘
```

- Scope column: `once` shows `1/1`, `similar_actions` shows `N/∞` or `N/M`, `workflow_run` shows `run`.
- Expires column: `never` if no expiry, otherwise the date.

**JSON output:** Array of `ApprovalPolicyRule` objects.

**API mapping:** `GET /api/approval-policies`

---

### 3.7 `ai-pm approval policy revoke <id>`

Revoke an auto-approval policy rule.

**Arguments:**

| Argument | Description |
|---|---|
| `id` | Policy rule ID |

**Options:**

| Option | Description | Default |
|---|---|---|
| `--json` | Output result as JSON | false |
| `--yes` | Skip confirmation prompt | false |

**Behavior:**

1. Confirm unless `--yes`:

```text
Revoke policy rule r1s2t3u4?
  Pattern: jira_issue_* → jira (role: meeting, scope: similar_actions)
```

2. Submit deletion via API.
3. Show result:

```text
✓ Policy rule r1s2t3u4 revoked
```

**API mapping:** `DELETE /api/approval-policies/:id`

## 4. Output Formatting Rules

### 4.1 Table vs JSON Decision

| Context | Default | Override |
|---|---|---|
| Interactive terminal | Table with colors | `--json` flag |
| Piped to file/program | Table without colors (auto-detected via `process.stdout.isTTY`) | `--json` flag |
| Scripting / CI | `--json` | always |

When `process.stdout.isTTY` is falsy, disable chalk colors automatically (use `chalk.level = 0`).

### 4.2 Color Coding

**Priority:**

| Priority | Color | Chalk |
|---|---|---|
| `critical` | Red | `chalk.red.bold` |
| `high` | Orange | `chalk.hex('#FF9500')` |
| `medium` | Yellow | `chalk.yellow` |
| `low` | Gray | `chalk.gray` |

**Status:**

| Status | Color | Chalk |
|---|---|---|
| `pending` | Yellow | `chalk.yellow` |
| `revision_requested` | Cyan | `chalk.cyan` |
| `expired` | Red dim | `chalk.red.dim` |
| `approved` | Green | `chalk.green` |
| `rejected` | Red | `chalk.red` |
| `cancelled` | Gray | `chalk.gray` |
| `executed` | Green dim | `chalk.green.dim` |
| `execution_failed` | Red bg | `chalk.bgRed.white` |

**Confidence:**

| Range | Color |
|---|---|
| ≥ 80 | `chalk.green` |
| 60–79 | `chalk.hex('#FF9500')` |
| < 60 | `chalk.red` |

### 4.3 Age Formatting

```
< 1 hour  → "Xm" (minutes)
< 24 hours → "Xh" (hours)
< 30 days  → "Xd" (days)
≥ 30 days  → "XM" (months)
```

### 4.4 Table Padding

Use the `table` npm package (already a dependency per mcp.ts). Column widths:

| Column | Max width | Truncate with |
|---|---|---|
| ID | 10 | — |
| Title | 30 | `…` |
| Priority | 8 | — |
| Status | 18 | — |
| Source | 12 | — |
| Age | 6 | — |
| Target | 12 | — |

## 5. Error Handling

### 5.1 Connection Errors

When the local server is unreachable:

```text
Error: Cannot connect to AI-PM local server at http://localhost:3847

  Ensure the server is running:
    ai-pm server start

  Or check the server URL in .ai-pm/config.json
```

- Exit code: `1`
- No stack trace in table mode; full error in JSON mode under `"error"` key.

### 5.2 Item Not Found

```text
Error: Approval item "a1b2c3d4" not found

  Run 'ai-pm approval list' to see available items.
```

- Exit code: `1`

### 5.3 Invalid State Transition

```text
Error: Cannot decide on item a1b2c3d4

  Current status: executed
  Requested decision: approve

  Only items in 'pending' or 'revision_requested' state can be decided.
```

- Exit code: `1`

### 5.4 Validation Errors

```text
Error: --reason is required for rejection

  Minimum 10 characters. Example:
    ai-pm approval decide a1b2c3d4 reject --reason "Title too vague, needs specifics"
```

- Exit code: `1`

### 5.5 Unauthorized

```text
Error: You are not in the designated approvers list for this item

  Assigned approvers: pm-user-001
  Current user: cli-user-002
```

- Exit code: `1`

### 5.6 Rate Limited

```text
Error: Rate limit exceeded (60 actions/minute)

  Please wait before retrying.
```

- Exit code: `1`

### 5.7 JSON Error Shape

All errors in `--json` mode return:

```json
{
  "error": {
    "code": "ITEM_NOT_FOUND",
    "message": "Approval item \"a1b2c3d4\" not found",
    "hint": "Run 'ai-pm approval list' to see available items."
  }
}
```

## 6. Confirmation Prompts

### 6.1 Commands Requiring Confirmation

| Command | Confirmation |
|---|---|
| `ai-pm approval decide <id> approve` | Yes — shows title, target, priority |
| `ai-pm approval decide <id> reject` | Yes — shows title, reason preview |
| `ai-pm approval decide <id> revision` | Yes — shows title, notes preview |
| `ai-pm approval delegate <id> <user>` | Yes — shows title, target user, note |
| `ai-pm approval policy revoke <id>` | Yes — shows rule pattern |

### 6.2 Commands Without Confirmation

| Command | Reason |
|---|---|
| `ai-pm approval list` | Read-only |
| `ai-pm approval show <id>` | Read-only |
| `ai-pm approval count` | Read-only |
| `ai-pm approval policy list` | Read-only |

### 6.3 Bypassing Confirmation

All confirmation prompts accept `--yes` (or `-y`) to skip. This is intended for scripted usage:

```bash
# Scripted approve
ai-pm approval decide a1b2c3d4 approve --yes

# Scripted reject
ai-pm approval decide a1b2c3d4 reject --reason "Scope creep detected" --yes
```

When `--yes` is used and the terminal is a TTY, still print the action summary before executing (no interactive prompt, but visible output).

## 7. Shell Integration

### 7.1 JSON Piping

All commands support `--json` for machine-readable output. Examples:

```bash
# Count pending items
ai-pm approval count --json | jq '.pending'

# List all critical pending items
ai-pm approval list --status pending --priority critical --json | jq '.items | length'

# Approve from script
ITEM_ID=$(ai-pm approval list --status pending --json | jq -r '.items[0].approval_id')
ai-pm approval decide "$ITEM_ID" approve --yes --json

# Export full audit trail
ai-pm approval show a1b2c3d4 --audit --json > audit-export.json
```

### 7.2 Exit Codes

| Code | Meaning |
|---|---|
| `0` | Success |
| `1` | General error (item not found, connection error, validation error) |
| `2` | Usage error (bad arguments, missing required options) |
| `3` | Authorization error (not in approvers list) |

### 7.3 Environment Variables

| Variable | Purpose | Default |
|---|---|---|
| `AI_PM_SERVER_URL` | Override local server URL | `http://localhost:3847` |
| `AI_PM_PROJECT` | Override current project ID | From `.ai-pm/config.json` |
| `AI_PM_USER` | Override current user ID | From `.ai-pm/config.json` |
| `AI_PM_JSON` | Force JSON output (any non-empty value) | not set |

`AI_PM_JSON` allows JSON output without `--json` flag, useful in CI:

```bash
AI_PM_JSON=1 ai-pm approval count | jq '.pending'
```

### 7.4 Shell Completion

The CLI should support bash/zsh completion via Commander's built-in completion command. Approval subcommands and their options should be completable:

```bash
ai-pm approval <TAB>          # list show decide delegate count policy
ai-pm approval list --<TAB>   # --status --priority --workflow --json --limit
ai-pm approval decide <TAB>   # (suggests pending item IDs from cache)
```

## 8. Workflow Examples

### 8.1 Morning Queue Review

A PM starts the day and reviews pending approvals from the terminal:

```bash
# Check how many items need attention
ai-pm approval count

# List all pending items
ai-pm approval list --status pending

# Review the most urgent one
ai-pm approval show a1b2c3d4 --audit

# Approve it
ai-pm approval decide a1b2c3d4 approve

# The next one needs revision
ai-pm approval decide e5f6g7h8 revision --notes "Include budget impact analysis in the report draft"

# Delegate a technical review to the tech lead
ai-pm approval delegate i9j0k1l2 @alex.chen --note "Please verify the migration plan before I approve"
```

### 8.2 Scripted Batch Check

A cron job or CI step checks for expired or critical items:

```bash
#!/bin/bash
# Check for critical pending items
CRITICAL=$(ai-pm approval list --status pending --priority critical --json | jq '.items | length')

if [ "$CRITICAL" -gt 0 ]; then
  echo "WARNING: $CRITICAL critical approval(s) pending"
  ai-pm approval list --status pending --priority critical
  # Could send notification via webhook here
  exit 1
fi

# Check for expired items
EXPIRED=$(ai-pm approval count --json | jq '.expired // 0')
if [ "$EXPIRED" -gt 0 ]; then
  echo "INFO: $EXPIRED expired approval(s) need re-queuing"
fi

echo "All clear."
exit 0
```

### 8.3 Policy Management

The PM sets up and manages auto-approval rules:

```bash
# List current policies
ai-pm approval policy list

# Revoke a stale policy
ai-pm approval policy revoke v5w6x7y8

# Verify revocation
ai-pm approval policy list --json | jq '.items | length'
```

Policy creation is not exposed via CLI — it is created through the desktop "Approve & Remember" action or directly via the API. The CLI manages existing policies only.

## 9. Implementation Notes

### 9.1 File Location

Create: `packages/cli/src/commands/approval.ts`

Modify: `packages/cli/src/index.ts` (add export)

Pattern: follow `mcp.ts` exactly — `Command` from commander, `chalk` for colors, `ora` for spinner, `table` for table output, `inquirer` for interactive prompts.

### 9.2 HTTP Client

The CLI calls the local server API. Use a simple fetch-based HTTP client (no external dependency needed — Node 18+ has built-in fetch). Wrap in a helper:

```typescript
async function api(method: string, path: string, body?: unknown): Promise<any> {
  const base = process.env.AI_PM_SERVER_URL || 'http://localhost:3847';
  const res = await fetch(`${base}${path}`, {
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

### 9.3 Short ID Resolution

Users may pass short prefixes of UUIDs. The CLI should resolve them:

1. If the input is a full UUID, use it directly.
2. If the input is 8+ chars, query `GET /api/approvals?search=<prefix>` (server-side prefix match).
3. If exactly one match, use it.
4. If multiple matches, show candidates and exit with error.

### 9.4 Bilingual Messages

Follow the `msgs.en`/`msgs.vi` pattern from `mcp.ts`. All user-facing strings go through the message catalog. Default language: `en`.

## 10. Open Questions (Resolved)

The following open questions from the UX and runtime contract specs are resolved for CLI purposes:

1. **Policy rules per-project or global?** Per-project. The CLI reads the current project from `AI_PM_PROJECT` env var or `.ai-pm/config.json`. All API calls include `project_id`.

2. **Keyboard-only workflows?** Not applicable to CLI — the CLI IS the keyboard interface. Confirmation prompts can be bypassed with `--yes`.

3. **Chat offline items?** Not relevant to CLI. The CLI talks to the local server directly.

4. **Mobile diff display?** Not relevant to CLI. The `show` command displays `summary_diff` inline.

5. **Max policy rules?** No CLI-side limit. The server enforces governance. If the server rejects a creation, the CLI surfaces the error.

6. **Multi-approver sequential or parallel?** Parallel (matches runtime contract default). The CLI does not implement multi-approver logic — it calls the API which handles threshold tracking.
