# Release Checklist — AI-PM Toolkit v1.0

> **Date:** 2026-06-21
> **Status:** Draft
> **Purpose:** Every item must be true before v1.0 release

## 1. Core Runtime

- [ ] `ApprovalQueue` — full CRUD + state machine (create, decide, resubmit, getCounts)
- [ ] `MemoryStore` — tasks, artifacts, lifecycle (create, update, complete, archive, stale detection)
- [ ] `LocalProjectStore` — audit trail, daily briefing items
- [ ] `projectScanner` — readiness checks (required + optional), score computation
- [ ] `buildTraceabilityMatrix` — gap detection, coverage, strict verification
- [ ] All core tests pass (`pnpm --filter @ai-pm/core test`)

## 2. CLI

- [ ] `ai-pm init` — new project with `--methodology`, `--defaults`, `--json`
- [ ] `ai-pm project scan` — readiness score with `--json`
- [ ] `ai-pm approval list/show/decide/create/resubmit/count` — full queue management
- [ ] `ai-pm memory summary/tasks/artifacts` — runtime memory inspection
- [ ] `ai-pm daily brief` / `ai-pm weekly report` — briefing generation
- [ ] `ai-pm traceability build` — requirement traceability matrix
- [ ] `ai-pm code-quality review` — local diff review
- [ ] `ai-pm orchestrator run/status/list` — workflow orchestration
- [ ] `ai-pm agent status/route` — agent capability registry
- [ ] `ai-pm schema validate/list` — workflow output validation
- [ ] All CLI tests pass (`pnpm --filter @ai-pm/cli test`)
- [ ] CLI builds clean (`pnpm --filter @ai-pm/cli build`)

## 3. Desktop App

- [ ] Electron app starts without crash
- [ ] Setup gateway shows on first launch (no fabricated project)
- [ ] Daily Brief tab loads real data via IPC
- [ ] Reports tab shows audit runs and artifacts
- [ ] Approval queue — full approve/reject/revision flow
- [ ] QA tab — code quality findings, test evidence, release readiness
- [ ] MCP servers tab — server management
- [ ] Command center tab — quick commands
- [ ] Settings — server configuration, health check
- [ ] Desktop builds clean (`pnpm --filter @ai-pm/desktop build`)

## 4. Mobile App

- [ ] React Navigation with all screens
- [ ] Command Center — daily brief, weekly status, risk summary, pending approvals
- [ ] Approvals — list, detail, swipe actions, create, offline queue
- [ ] Action Proposal screen — action details, approve/reject
- [ ] Setup Status — readiness score, profile, server health
- [ ] Settings — server URL configuration, health check
- [ ] Data source indicator (local server vs mock fallback)
- [ ] Offline action queue with sync
- [ ] Mobile builds clean (`pnpm --filter @ai-pm/mobile build`)

## 5. Local Server

- [ ] HTTP server starts on configurable port
- [ ] Approval queue API — full CRUD
- [ ] Memory API — tasks, artifacts, summary
- [ ] Chat gateway — commands, queries, actions, history
- [ ] Audit trail API — run records
- [ ] Server health endpoint
- [ ] All server tests pass (`pnpm --filter @ai-pm/server test`)

## 6. MCP Integration

- [ ] MCP registry loading and validation
- [ ] MCP profiles (default, offline-local)
- [ ] MCP doctor command
- [ ] MCP validate command
- [ ] All MCP tests pass (`pnpm --filter @ai-pm/mcp test`)

## 7. Documentation

- [ ] `AGENTS.md` — agent entrypoint
- [ ] `docs/developer/api-reference.md` — runtime API reference
- [ ] `docs/developer/cli-reference.md` — CLI command reference
- [ ] `docs/developer/desktop-architecture.md` — desktop architecture
- [ ] `docs/developer/mobile-architecture.md` — mobile architecture
- [ ] `docs/developer/local-server-api.md` — server API reference
- [ ] `docs/developer/testing-guide.md` — testing guide
- [ ] `docs/developer/contributing.md` — contribution guidelines
- [ ] `docs/product/release-checklist.md` — this file
- [ ] `docs/product/acceptance-matrix.md` — acceptance criteria

## 8. Schemas

- [ ] Approval item schema validated
- [ ] Audit record schema validated
- [ ] Workflow output schemas (daily, weekly, risk, traceability, code quality)
- [ ] Test evidence schema validated
- [ ] All fixture validations pass (`node schemas/validate-fixtures.mjs`)

## 9. Security

- [ ] No credentials in profile.yaml or .mcp.json
- [ ] All mutations approval-gated
- [ ] Audit trail for every action
- [ ] No external publish without approval
- [ ] Offline queue encrypted at rest
- [ ] Server token auth for chat/mobile

## 10. Build & CI

- [ ] `pnpm -r run build` — all packages build clean
- [ ] `pnpm -r run test` — all tests pass
- [ ] `node schemas/validate-fixtures.mjs` — all fixtures valid
- [ ] Completion gate passes
- [ ] No unresolved markers in AGENTS.md, README, docs, playbooks, workflows, mcp, templates
