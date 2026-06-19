# AI-PM Toolkit — Master Plan Index

**Repo:** `C:\Works\AI-PM`  
**Created:** 2026-06-17  
**Target:** Desktop (Hermes), Mobile, CLI — Offline/Online — All Project Types

---

## Plan Documents

| Phase | File | Focus |
|-------|------|-------|
| 0 | `2026-06-17-ai-pm-toolkit-master-plan.md` | Foundation, Repo Setup, Hermes Config |
| 1 | `2026-06-17-ai-pm-toolkit-master-plan-phase1.md` | Domain Models, SQLite DB, Sync Engine |
| 2 | `2026-06-17-ai-pm-toolkit-master-plan-phase2.md` | Agent Orchestration, MCP Integration, PM Agents |
| 3 | `2026-06-17-ai-pm-toolkit-master-plan-phase3.md` | Code Quality Governor, Test Strategy Agent |
| 4 | `2026-06-17-ai-pm-toolkit-master-plan-phase4.md` | Methodology Engine, Daily Workflows, Role Agents |
| 5 | `2026-06-17-ai-pm-toolkit-master-plan-phase5.md` | Hermes Desktop UI, Mobile (React Native), CLI |
| 6 | `2026-06-17-ai-pm-toolkit-master-plan-phase6.md` | T&M/Fixed Cost Finance, Portfolio, Integrations |
| 7 | `2026-06-17-ai-pm-toolkit-master-plan-phase7.md` | Security, Tests, Docs, Release, Success Criteria |

---

## Quick Start

```bash
cd /c/Works/AI-PM
pnpm install                    # After Phase 0 Task 1
hermes config validate          # After Phase 0 Task 2
pnpm db:migrate                 # After Phase 1 Task 4
```

---

## Execution Command

```bash
# Use subagent-driven-development skill for task-by-task execution
# Each task: delegate_task → spec review → code review → commit
```