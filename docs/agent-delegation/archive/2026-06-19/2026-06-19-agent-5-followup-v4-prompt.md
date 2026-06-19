# Agent 5 Follow-up v4 — MCP Validation Hardening

> **Date:** 2026-06-19  
> **Requested by:** Orchestrator  
> **Priority:** Medium — improves MCP validation coverage after Agent 3's baseline  
> **Depends on:** Agent 3's MCP validation layer (completed), Agent 1's MCP/CLI repair (completed)  
> **Blocks:** Nothing — quality improvement for MCP validation

---

## Task Contract

```yaml
task_id: agent-5-mcp-validation-hardening
project_id: ai-pm-toolkit
requested_by: orchestrator
assigned_agent: developer
objective: |
  Harden the MCP validation layer with additional test fixtures, edge case
  coverage, and validation rules. Agent 3 created the baseline validation;
  this task adds depth: invalid registry/profile fixtures, duplicate detection,
  empty capability checks, and unknown workflow ID validation.
context:
  methodology: hybrid
  project_type: product_delivery
  source_refs:
    - type: file
      id: packages/mcp/src/registry/configValidator.ts
      description: Current validator implementation
    - type: file
      id: packages/mcp/src/registry/configValidator.test.ts
      description: Current test file
    - type: file
      id: packages/mcp/src/registry/configLoader.ts
      description: Config loader for reference
    - type: file
      id: mcp/registry.yaml
      description: Canonical registry
    - type: file
      id: mcp/profiles/default.yaml
      description: Default profile
    - type: file
      id: mcp/profiles/offline-local.yaml
      description: Offline profile
    - type: file
      id: docs/agent-delegation/2026-06-19-delegation-forecast.md
      description: Candidate E: MCP Validation Hardening
constraints:
  - Work only inside packages/mcp/ and mcp/
  - Do not modify packages/core/, packages/cli/, or other packages
  - All new tests must pass: pnpm --filter @ai-pm/mcp test
  - Build must still pass: pnpm --filter @ai-pm/mcp build
  - Keep read-only validation logic (no mutations)
required_outputs:
  - name: enhanced-tests
    format: typescript
  - name: validation-fixtures
    format: yaml
quality_gate:
  checklist_id: mcp-validation-hardening-gate
  approval_required: false
deadline: medium-priority
```

---

## Prompt

```text
You are Agent 5 working on the AI-PM Toolkit repository.
Agent 3 created the baseline MCP validation layer. This task hardens it.

## Step 0: Read context files

1. packages/mcp/src/registry/configValidator.ts (current validator)
2. packages/mcp/src/registry/configValidator.test.ts (current tests)
3. packages/mcp/src/registry/configLoader.ts (loader for reference)
4. packages/mcp/src/registry/configTypes.ts (type definitions)
5. mcp/registry.yaml (canonical registry)
6. mcp/profiles/default.yaml
7. mcp/profiles/offline-local.yaml

## Step 1: Add invalid test fixtures

Create fixture files under mcp/fixtures/ for invalid registry and profile cases:

### mcp/fixtures/invalid-registry-missing-servers.yaml

Registry with no `servers` key:
```yaml
version: 1
defaults:
  access_mode: read_only
  mutation_policy: allowed
  unavailable_behavior: degrade_gracefully
```

### mcp/fixtures/invalid-registry-bad-mutation-policy

Registry with mutation capabilities but no approval required:
```yaml
version: 1
defaults:
  access_mode: read_write
  mutation_policy: allowed
  unavailable_behavior: degrade_gracefully
approval_required_for_all_mutations: false
servers:
  github:
    category: source_control
    priority: 1
    contracts: ["source-control"]
    required_for: ["all_workflows"]
    read_capabilities: ["list_repos", "list_prs"]
    mutation_capabilities: ["create_issue", "create_pr"]
```

### mcp/fixtures/invalid-registry-duplicate-servers.yaml

Registry with duplicate server entries (same ID, different configs):
```yaml
version: 1
defaults:
  access_mode: read_only
  mutation_policy: approval_required
  unavailable_behavior: degrade_gracefully
servers:
  github:
    category: source_control
    priority: 1
    contracts: ["source-control"]
    required_for: ["all_workflows"]
    read_capabilities: ["list_repos"]
    mutation_capabilities: []
  github:
    category: documentation
    priority: 2
    contracts: ["documentation"]
    required_for: ["daily-briefing"]
    read_capabilities: ["search"]
    mutation_capabilities: []
```

### mcp/fixtures/invalid-profile-unknown-server.yaml

Profile referencing a server not in registry:
```yaml
version: 1
name: bad-profile
enabled_servers:
  - github
  - nonexistent-server
```

### mcp/fixtures/invalid-profile-empty-capabilities.yaml

Server with empty capability entries:
```yaml
version: 1
defaults:
  access_mode: read_only
  mutation_policy: approval_required
  unavailable_behavior: degrade_gracefully
servers:
  github:
    category: source_control
    priority: 1
    contracts: ["source-control"]
    required_for: ["all_workflows"]
    read_capabilities: ["", "  "]
    mutation_capabilities: [""]
```

### mcp/fixtures/invalid-registry-unknown-workflow.yaml

Server referencing unknown workflow ID:
```yaml
version: 1
defaults:
  access_mode: read_only
  mutation_policy: approval_required
  unavailable_behavior: degrade_gracefully
servers:
  custom-tool:
    category: documentation
    priority: 1
    contracts: ["documentation"]
    required_for: ["nonexistent-workflow", "another-fake"]
    read_capabilities: ["read"]
    mutation_capabilities: []
```

## Step 2: Add test cases

Edit `packages/mcp/src/registry/configValidator.test.ts`:

Add these test cases:

### Invalid registry tests

```typescript
it("rejects registry missing servers key", () => {
  // Use invalid-registry-missing-servers.yaml fixture
  // expect validation to fail with INVALID_REGISTRY_SHAPE or similar
});

it("warns about mutation capabilities without approval policy", () => {
  // Use invalid-registry-bad-mutation-policy.yaml fixture
  // expect MUTATION_POLICY_UNDEFINED warning
});

it("warns about empty capability entries", () => {
  // Use invalid-profile-empty-capabilities.yaml fixture
  // expect EMPTY_CAPABILITY_ENTRY warning
});

it("warns about unknown workflow IDs", () => {
  // Use invalid-registry-unknown-workflow.yaml fixture
  // expect UNKNOWN_WORKFLOW_ID warnings
});
```

### Profile tests

```typescript
it("rejects profile referencing unknown server", () => {
  // Use invalid-profile-unknown-server.yaml fixture
  // expect PROFILE_REFERENCES_UNKNOWN_SERVER error
});

it("detects duplicate profile entries", () => {
  // Create a profile with same server ID in enabled_servers and optional_servers
  // expect appropriate warning
});
```

### Edge case tests

```typescript
it("handles empty registry gracefully", () => {
  const emptyRegistry = { version: 1, defaults: { ... }, servers: {} };
  const report = validateConfigs(emptyRegistry, []);
  expect(report.valid).toBe(true);
  expect(report.issues).toHaveLength(0);
});

it("handles empty profiles array", () => {
  const registry = loadRegistry();
  const report = validateConfigs(registry, []);
  expect(report.valid).toBe(true);
});

it("validates contract files exist for all referenced contracts", () => {
  // Check that every contract referenced in registry has a corresponding .md file
});

it("validates profile workflow expectations reference valid servers", () => {
  // Create profile with workflow_expectations referencing non-existent server
});
```

## Step 3: Verify

```bash
# 1. Confirm fixture files created
ls mcp/fixtures/*.yaml

# 2. Run tests
pnpm --filter @ai-pm/mcp test -- src/registry/configValidator.test.ts

# 3. Build
pnpm --filter @ai-pm/mcp build

# 4. Count test cases (should increase)
grep -c "it(" packages/mcp/src/registry/configValidator.test.ts
```

## Step 4: Report

```yaml
task_id: agent-5-mcp-validation-hardening
status: completed | blocked | failed
summary: one-line description
findings:
  - severity: info
    title: what you added
    detail: fixtures created, test cases added, coverage improved
    source_ref: packages/mcp/src/registry/
recommendations:
  - action: main thread can now rely on hardened validation
    owner: main_thread
    priority: low
artifacts:
  - path_or_url: packages/mcp/src/registry/configValidator.test.ts
    type: diff
  - path_or_url: mcp/fixtures/
    type: diff
confidence: 0-100
open_questions: []
audit:
  sources_used:
    - list of files read
  assumptions:
    - fixtures are valid YAML but invalid per schema
    - test cases cover all validation code paths
  approvals_required: []
  next_agent_suggested: >
    MCP validation is now hardened. Agent 5 has completed all
    specification and validation work. Next agent work should
    focus on runtime implementation (main thread Tasks 2-5).
```
