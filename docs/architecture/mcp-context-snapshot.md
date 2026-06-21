# MCP/DB Context Snapshot

**Date:** 2026-06-21  
**Status:** Implemented  
**Audience:** Backend developers, orchestrator integrators  
**References:** [packages/core/src/orchestrator/contextSnapshot.ts](../../packages/core/src/orchestrator/contextSnapshot.ts), [mcp/registry.yaml](../../mcp/registry.yaml)

## 1. Purpose

Provide a local, queryable connector availability snapshot that the orchestrator can use to build project context packs without hitting external systems. All connector access is read-only — no vendor APIs are called.

## 2. Architecture

```text
┌─────────────────────────────────────────────────────┐
│              MCP Registry (YAML)                     │
│              mcp/registry.yaml                        │
└─────────────────────┬───────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────┐
│           Context Snapshot Module                     │
│  packages/core/src/orchestrator/contextSnapshot.ts   │
│                                                      │
│  ┌──────────────┐  ┌──────────────┐                 │
│  │ loadRegistry │  │ loadProfile  │                 │
│  └──────┬───────┘  └──────┬───────┘                 │
│         │                  │                         │
│         ▼                  ▼                         │
│  ┌──────────────────────────────┐                   │
│  │    buildContextPack()        │                   │
│  │    (pure/local API)          │                   │
│  └──────────────┬───────────────┘                   │
│                 │                                    │
│  ┌──────────────▼───────────────┐                   │
│  │     ContextPack output       │                   │
│  └──────────────────────────────┘                   │
└─────────────────────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────┐
│              Orchestrator                            │
│              (consumes ContextPack)                  │
└─────────────────────────────────────────────────────┘
```

## 3. Data Model

### 3.1 ConnectorSnapshot

```typescript
interface ConnectorSnapshot {
  connectorId: string;          // e.g., "github", "jira", "filesystem"
  category: string;             // e.g., "source_control", "work_tracking"
  enabled: boolean;             // true if connector is active in current profile
  health: 'healthy' | 'degraded' | 'unknown';
  readCapabilities: string[];   // e.g., ["read_repositories", "read_pull_requests"]
  mutationCapabilities: string[]; // e.g., ["create_issue", "merge_pr"]
  approvalRequired: boolean;    // whether mutations need approval
  degradedWorkflowBehavior: Record<string, unknown>;
}
```

### 3.2 ProfileSnapshot

```typescript
interface ProfileSnapshot {
  profileName: string;          // e.g., "offline-local", "default"
  description: string;
  enabledServers: string[];
  disabledServers: string[];
  workflowBehavior: Record<string, unknown>;
}
```

### 3.3 ContextPack

```typescript
interface ContextPack {
  projectRoot: string;
  snapshot: ConnectorSnapshot[];
  profile: ProfileSnapshot | null;
  availableCapabilities: {
    read: string[];             // union of all enabled read capabilities
    mutation: string[];         // union of all enabled mutation capabilities
  };
  requiredForWorkflows: Record<string, string[]>;  // workflow → connector IDs
  timestamp: string;
}
```

## 4. API

### 4.1 `buildContextPack(projectRoot, options?)`

Main entry point. Loads registry and optional profile, builds a complete context pack.

```typescript
const pack = await buildContextPack(process.cwd(), {
  registryPath: 'mcp/registry.yaml',   // optional, defaults to cwd
  profileName: 'offline-local',         // optional
  profilesDir: 'mcp/profiles',          // optional
});
```

### 4.2 `loadRegistry(path)` / `loadProfile(path)`

Load and parse YAML files. Return `null` if missing or invalid.

### 4.3 `buildSnapshot(registry, enabledConnectors)`

Pure function: builds connector snapshots from registry data.

### 4.4 `computeCapabilities(snapshots)`

Pure function: extracts unique read/mutation capabilities from enabled connectors.

### 4.5 `filterEnabled(pack)` / `getHealthSummary(pack)`

Utility functions for filtering and health reporting.

## 5. SQLite-Ready Data Shape

The `ContextPack` maps naturally to SQLite tables:

```sql
-- Connector snapshots
CREATE TABLE connector_snapshots (
  id INTEGER PRIMARY KEY,
  pack_id TEXT NOT NULL,
  connector_id TEXT NOT NULL,
  category TEXT,
  enabled BOOLEAN,
  health TEXT,
  read_capabilities TEXT,  -- JSON array
  mutation_capabilities TEXT,  -- JSON array
  approval_required BOOLEAN,
  FOREIGN KEY (pack_id) REFERENCES context_packs(id)
);

-- Context packs
CREATE TABLE context_packs (
  id TEXT PRIMARY KEY,
  project_root TEXT,
  profile_name TEXT,
  timestamp TEXT,
  available_read TEXT,  -- JSON array
  available_mutation TEXT  -- JSON array
);

-- Workflow requirements
CREATE TABLE workflow_requirements (
  id INTEGER PRIMARY KEY,
  pack_id TEXT NOT NULL,
  workflow_id TEXT NOT NULL,
  connector_ids TEXT,  -- JSON array
  FOREIGN KEY (pack_id) REFERENCES context_packs(id)
);
```

**Note:** SQLite runtime is not required for current implementation. This schema is provided for future reference when SQLite-backed persistence is added.

## 6. Integration with Orchestrator

The orchestrator can use the context pack to:

1. **Check connector availability** before running a workflow
2. **Determine degraded behavior** when connectors are unavailable
3. **Build capability reports** for agents
4. **Validate workflow requirements** against available connectors

```typescript
import { buildContextPack, filterEnabled } from '@ai-pm/core/orchestrator';

const pack = await buildContextPack(projectRoot, { profileName: 'offline-local' });
const enabled = filterEnabled(pack);

// Check if daily-briefing can run
const required = pack.requiredForWorkflows['daily-briefing'] ?? [];
const available = enabled.snapshot.map(s => s.connectorId);
const missing = required.filter(r => !available.includes(r));

if (missing.length > 0) {
  console.warn(`Missing connectors: ${missing.join(', ')}`);
  // Apply degraded behavior from profile
}
```

## 7. Test Coverage

- 15 test cases covering all public functions
- Tests use temp directories with sample YAML files
- Degrades gracefully when files are missing

## 8. Future Enhancements

- **Real health checks:** Ping MCP endpoints to determine actual health status
- **SQLite persistence:** Store snapshots in `.ai-pm/context-snapshots.db`
- **Real-time updates:** WebSocket notifications when connector status changes
- **Capability filtering:** Filter by specific capability requirements
