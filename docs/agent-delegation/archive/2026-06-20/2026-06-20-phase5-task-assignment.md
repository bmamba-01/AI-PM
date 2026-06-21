# Phase 5 Task Assignment — Superseded

> Superseded on 2026-06-20 by `docs/agent-delegation/2026-06-20-wave6-assignment.md`.
> Do not use this file for new work unless the PM explicitly reactivates it.

# Historical Phase 5 Task Assignment — 6 Agents

> **Date:** 2026-06-20
> **Status:** All Phase 1-4 work complete. 6 agents idle.

## Current State Summary

| Package | Tests | Build | Status |
|---------|-------|-------|--------|
| @ai-pm/core | 115 | PASS | ✅ |
| @ai-pm/mcp | 26 | PASS | ✅ |
| @ai-pm/cli | — | PASS | ✅ |
| @ai-pm/desktop | — | PASS | ✅ |
| @ai-pm/mobile | — | PASS | ✅ |
| @ai-pm/server | — | PASS | ✅ |

## Phase 5 Tasks (6 agents, all parallel)

### Agent 1: CLI Experience Enhancement

**Scope:** Polish CLI commands with better UX, colors, and help text.
**Files to modify:**
- `packages/cli/src/commands/approval.ts` — add colored output, better table formatting
- `packages/cli/src/commands/memory.ts` — add colored output, progress indicators
- `packages/cli/src/commands/audit.ts` — add colored output, better table formatting
- `packages/cli/src/commands/project.ts` — add colored output, progress indicators

**What to do:**
1. Add chalk colors to all CLI outputs (priority colors, status colors, confidence colors)
2. Add table formatting with `table` package (already a dependency)
3. Add progress spinners with `ora` (already a dependency)
4. Add `--verbose` flag for detailed output
5. Add `--quiet` flag for minimal output
6. Improve error messages with suggestions
7. Add command aliases (e.g., `ai-pm app` as alias for `ai-pm approval`)
8. Add `ai-pm approval show <id>` command
9. Add `ai-pm approval create` command
10. Add `ai-pm memory tasks create` command
11. Add `ai-pm memory tasks complete <id>` command
12. Add `ai-pm memory artifacts archive <id>` command

**Verification:**
```bash
pnpm --filter @ai-pm/cli build
node packages/cli/bin/ai-pm.js --help
node packages/cli/bin/ai-pm.js approval --help
node packages/cli/bin/ai-pm.js memory --help
node packages/cli/bin/ai-pm.js audit --help
node packages/cli/bin/ai-pm.js project --help
```

### Agent 2: Desktop UI Enhancement

**Scope:** Polish desktop approval panel with better UX, animations, and interactions.
**Files to modify:**
- `packages/desktop/src/components/tabs/ApprovalsTab.tsx`
- `packages/desktop/src/components/tabs/DashboardTab.tsx`
- `packages/desktop/src/components/tabs/DailyBriefTab.tsx`

**What to do:**
1. Add approval action confirmation dialogs
2. Add approval status history timeline
3. Add approval priority color coding
4. Add approval confidence score visualization
5. Add approval creation form
6. Add bulk approval actions
7. Add approval filter persistence (remember last filter)
8. Add approval search functionality
9. Add approval export to JSON/CSV
10. Add keyboard shortcuts for approve/reject
11. Add approval notification system
12. Add approval audit trail viewer

**Verification:**
```bash
pnpm --filter @ai-pm/desktop build
```

### Agent 3: Mobile UI Enhancement

**Scope:** Polish mobile approval panel with better UX, gestures, and offline support.
**Files to modify:**
- `packages/mobile/src/screens/ApprovalsScreen.tsx`
- `packages/mobile/src/screens/ApprovalDetailScreen.tsx`
- `packages/mobile/src/state/approval-store.ts`

**What to do:**
1. Add pull-to-refresh on approval list
2. Add swipe actions for approve/reject
3. Add approval action confirmation sheets
4. Add approval status history timeline
5. Add approval priority color coding
6. Add approval confidence score visualization
7. Add approval creation form
8. Add approval filter persistence
9. Add approval search functionality
10. Add approval export to JSON
11. Add offline mode indicator
12. Add approval notification badges

**Verification:**
```bash
pnpm --filter @ai-pm/mobile build
```

### Agent 4: Test Coverage Expansion

**Scope:** Add more tests for edge cases, error handling, and integration scenarios.
**Files to create:**
- `packages/cli/src/commands/approval.test.ts` (expand)
- `packages/cli/src/commands/memory.test.ts` (new)
- `packages/cli/src/commands/audit.test.ts` (expand)
- `packages/cli/src/commands/project.test.ts` (expand)
- `packages/core/src/workflows/schemaValidation.edge.test.ts` (new)
- `packages/core/src/runtime/memory.edge.test.ts` (expand)

**What to do:**
1. Add CLI command integration tests
2. Add schema validation edge case tests
3. Add memory store edge case tests
4. Add approval queue edge case tests
5. Add project scanner edge case tests
6. Add local server API endpoint tests
7. Add IPC bridge tests
8. Add mobile approval store tests

**Verification:**
```bash
pnpm --filter @ai-pm/core test
pnpm build
```

### Agent 5: Documentation Expansion

**Scope:** Write comprehensive documentation for the AI-PM Toolkit.
**Files to create:**
- `docs/developer/api-reference.md` — API reference for all runtime functions
- `docs/developer/cli-reference.md` — CLI command reference
- `docs/developer/desktop-architecture.md` — Desktop app architecture
- `docs/developer/mobile-architecture.md` — Mobile app architecture
- `docs/developer/local-server-api.md` — Local server API reference
- `docs/developer/testing-guide.md` — How to run and write tests
- `docs/developer/contributing.md` — Contributing guidelines

**What to do:**
1. Write API reference for all runtime functions
2. Write CLI command reference with examples
3. Write desktop app architecture documentation
4. Write mobile app architecture documentation
5. Write local server API reference
6. Write testing guide
7. Write contributing guidelines

**Verification:**
```bash
ls docs/developer/*.md
```

### Agent 6: Playbook Enrichment (Continue)

**Scope:** Continue enriching playbooks with more detailed procedures and examples.
**Files to modify:**
- `playbooks/quality/code-quality-guard.md` (expand)
- `playbooks/quality/testing-strategy.md` (expand)
- `playbooks/quality/requirements-traceability.md` (expand)
- `playbooks/roles/pm.md` (expand)
- `playbooks/roles/developer.md` (expand)
- `playbooks/roles/qa.md` (expand)

**What to do:**
1. Add detailed PR review checklists
2. Add test case writing guidelines
3. Add bug report templates
4. Add sprint ceremony checklists
5. Add stakeholder communication templates
6. Add risk escalation decision trees
7. Add code review self-check lists
8. Add debugging workflows
9. Add regression test selection strategies
10. Add UAT facilitation checklists

**Verification:**
```bash
for f in playbooks/**/*.md; do echo "$(wc -l < "$f") $f"; done | sort -n
```

## Execution Order

All 6 agents can work in parallel. No dependencies between them.

```
Agent 1: CLI Enhancement
Agent 2: Desktop UI Enhancement
Agent 3: Mobile UI Enhancement
Agent 4: Test Coverage Expansion
Agent 5: Documentation Expansion
Agent 6: Playbook Enrichment (continue)
```

## Files to create/modify

| Agent | Files |
|-------|-------|
| Agent 1 | packages/cli/src/commands/*.ts |
| Agent 2 | packages/desktop/src/components/tabs/*.tsx |
| Agent 3 | packages/mobile/src/screens/*.tsx, packages/mobile/src/state/*.ts |
| Agent 4 | packages/cli/src/commands/*.test.ts, packages/core/src/**/*.test.ts |
| Agent 5 | docs/developer/*.md |
| Agent 6 | playbooks/**/*.md |
