# Tracking Skills

This folder mirrors the packaged tracking runtime skills under `.ai-pm-skills/`.

| Skill id | Owner | Purpose |
|---|---|---|
| `tracking.resolve_project_tracker` | orchestrator | Resolve the active tracker tool, mode, and status mapping from the project profile |
| `tracking.create_task` | orchestrator | Create or bind the delegated task in the tracker and local memory |
| `tracking.prepare_agent_contract` | orchestrator | Inject tracker metadata and required completion skill into the subagent contract |
| `tracking.complete_task` | agent | Update the assigned tracker item before returning `completed` |
| `tracking.block_task` | agent | Record blocked state and unblock requirements |
| `tracking.verify_completion` | orchestrator | Re-read tracker state and reject mismatched completion payloads |
| `tracking.sync_local_mirror` | orchestrator | Keep `.ai-pm/memory` aligned with tracker state and artifacts |

Each page below mirrors the runtime `instructions.md` content for the same skill id.
