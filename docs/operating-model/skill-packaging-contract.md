# Skill Packaging Contract

## Purpose

Every core toolkit feature that may be delegated must exist in two forms:

1. human-readable operating docs
2. loadable runtime skill packages

Writing guidance only under `docs/` is not sufficient. A delegated agent must be able to load a packaged skill with a stable id, deterministic instructions, and tracker-aware completion rules.

## Runtime Packaging Requirement

The current runtime skill loader reads skills from:

- `~/.ai-pm/skills`
- `.ai-pm-skills/`

Each packaged skill must therefore include:

```text
.ai-pm-skills/<skill-id>/
├─ skill.json
└─ instructions.md
```

Minimum `skill.json` contract:

```json
{
  "id": "tracking.complete_task",
  "name": "Tracking Complete Task",
  "category": "tracking",
  "description": "Update the project-selected tracker before returning completed status.",
  "version": "1.0.0",
  "tags": ["tracking", "delegation", "completion"],
  "triggers": ["task completion", "mark task done", "update tracker"]
}
```

## Mandatory Skill Families

Wave 19 and later must package these as loadable skills, not docs only:

- `tracking.resolve_project_tracker`
- `tracking.create_task`
- `tracking.prepare_agent_contract`
- `tracking.complete_task`
- `tracking.block_task`
- `tracking.verify_completion`
- `tracking.sync_local_mirror`

The same rule applies later to other core feature families:

- onboarding/setup
- approvals
- memory
- reporting
- risk control
- scope control
- meeting intelligence
- code quality guard
- DevOps readiness

## Tracker-Aware Delegation Rules

If a project profile defines:

```yaml
tracking:
  system: notion|jira|linear|github|excel|local_memory
```

the orchestrator skill must:

1. resolve the active tracker from `.ai-pm/profile.yaml`
2. create or bind the external task before delegation
3. store `external_task_id` and `external_task_url`
4. inject the required completion skill into the agent contract
5. reject completion if the matching tracking update did not happen

## Status And Discovery Surface

The PM Commander needs one short discovery surface across CLI, desktop, and chat:

- CLI: `ai-pm skills list`, `ai-pm skills status`, `ai-pm skills show <id>`
- Desktop: Skills tab or dialog backed by the same registry
- Chat/mobile: `/skills`

All three surfaces must read from the same runtime registry and show:

- skill id
- owner: orchestrator | shared | agent
- category
- tracking tool used
- current project scope
- active delegated tasks using that skill
- task status by tool
- pending approvals
- last artifact or report path

## Required Link To Task Tracking

Every delegated task record must include:

- `tracking.tool`
- `tracking.external_task_id`
- `tracking.external_task_url`
- `skill_required.orchestrator_create`
- `skill_required.agent_complete`

Every completion record must include:

- `tracking_update.attempted`
- `tracking_update.result`
- `tracking_update.external_task_id`
- `artifacts`
- verification evidence

## Acceptance Gate

The toolkit is not considered skill-packaged for delegation until all of the following are true:

- packaged skills exist under `.ai-pm-skills/`
- the runtime skill loader can load them
- CLI exposes `skills` commands
- chat/mobile can surface `/skills`
- tracking-aware tasks can be created, completed, and verified through packaged skills
- the self-test project shows delegated task status by skill and by tracking tool
