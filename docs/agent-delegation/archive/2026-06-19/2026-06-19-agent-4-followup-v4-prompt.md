# Agent 4 Follow-up v4 — Schema Consistency Audit + Validation Script

> **Date:** 2026-06-19  
> **Requested by:** Orchestrator  
> **Priority:** Medium — quality gate before runtime consumption  
> **Depends on:** Agent 4 v1-v3 (all schemas + fixtures completed)  
> **Blocks:** Main-thread Task 5 — validation script provides the tooling to verify schemas work

---

## Task Contract

```yaml
task_id: agent-4-schema-audit
project_id: ai-pm-toolkit
requested_by: orchestrator
assigned_agent: developer
objective: |
  Audit all 16 schemas for internal consistency, then create a Node.js
  validation script that programmatically validates all 30 fixtures against
  their schemas. This is the final quality gate before the schema layer
  is consumed by runtime code.
context:
  methodology: hybrid
  project_type: product_delivery
  source_refs:
    - type: file
      id: schemas/workflows/README.md
      description: Schema catalog with 16 schemas documented
    - type: file
      id: schemas/workflows/daily-briefing.input.schema.json
      description: Reference schema for pattern consistency check
    - type: file
      id: schemas/approval/approval-item.schema.json
      description: Shared schema for consistency check
    - type: file
      id: schemas/audit/audit-record.schema.json
      description: Shared schema for consistency check
    - type: file
      id: schemas/subagent/subagent-task.schema.json
      description: Shared schema for consistency check
    - type: file
      id: schemas/subagent/subagent-output.schema.json
      description: Shared schema for consistency check
constraints:
  - Work only inside schemas/ — do not modify packages/, docs/, or any other directory
  - The validation script must be a standalone Node.js script (no new dependencies beyond ajv)
  - The script must be runnable with: node schemas/validate-fixtures.mjs
  - All 30 fixtures must pass validation (valid ones pass, invalid ones fail exactly 1 constraint)
required_outputs:
  - name: audit-report
    format: markdown
  - name: validation-script
    format: javascript
quality_gate:
  checklist_id: schema-audit-gate
  approval_required: false
deadline: medium-priority
```

---

## Prompt

```text
You are Agent 4 working on the AI-PM Toolkit repository.
You previously created 16 schemas and 30 test fixtures.
This task is the final quality gate: audit consistency and create a validation script.

## Step 0: Read context files

1. schemas/workflows/README.md (schema catalog)
2. schemas/workflows/daily-briefing.input.schema.json (pattern reference)
3. schemas/workflows/daily-briefing.output.schema.json (pattern reference)
4. schemas/approval/approval-item.schema.json
5. schemas/audit/audit-record.schema.json
6. schemas/subagent/subagent-task.schema.json
7. schemas/subagent/subagent-output.schema.json

## Step 1: Consistency Audit

Check these consistency rules across all 16 schemas:

### 1.1 Structural consistency
- All schemas use "$schema": "https://json-schema.org/draft/2020-12/schema"
- All schemas have unique "$id" values
- All schemas have "title" and "description"
- All schemas use "additionalProperties": false at the top level
- All object properties use "additionalProperties": false

### 1.2 Field naming consistency
- All date-time fields use "format": "date-time"
- All confidence fields are "type": "integer", "minimum": 0, "maximum": 100
- All enum values use lowercase (e.g., "low" not "Low")
- workflow_id enums are consistent across schemas that reference them

### 1.3 Cross-schema consistency
- risk-control.input risk_register item fields match risk-control.output new_risks item fields
- reporting.input data sources align with reporting.output source_coverage
- meeting-intelligence.input attendee_list aligns with meeting-intelligence.output action_items
- code-quality-guard.input changed_files aligns with code-quality-guard.output findings file/line fields
- audit-record.workflow_id enum includes all workflow IDs used in other schemas

### 1.4 Fixture consistency
- Each valid fixture has all required fields from its schema
- Each invalid fixture violates exactly one constraint
- Each invalid fixture has a _violation field explaining the violation
- No fixture uses enum values not defined in the schema

Write the audit results to schemas/CONSISTENCY-AUDIT.md.

## Step 2: Create validation script

Install ajv if not present:
```bash
cd /sessions/relaxed-eager-fermat/mnt/AI-PM && npm install ajv --save-dev --break-system-packages 2>/dev/null || true
```

Create schemas/validate-fixtures.mjs:

```javascript
#!/usr/bin/env node
/**
 * Schema validation script for AI-PM Toolkit.
 * Validates all test fixtures against their schemas.
 *
 * Usage: node schemas/validate-fixtures.mjs
 *
 * Exit codes:
 *   0 = all fixtures pass as expected
 *   1 = a valid fixture failed validation (bug in fixture or schema)
 *   2 = an invalid fixture passed validation (bug in fixture or schema)
 *   3 = script error (missing file, parse error, etc.)
 */

import { readFileSync, readdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import Ajv from 'ajv';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SCHEMAS_DIR = __dirname;
const FIXTURES_DIR = join(__dirname, 'fixtures');

// Map fixture paths to their corresponding schema
function findSchemaForFixture(fixturePath) {
  // fixtures/workflows/daily-briefing.output.valid.json
  //   → schemas/workflows/daily-briefing.output.schema.json
  const rel = fixturePath.replace(FIXTURES_DIR + '/', '');
  const parts = rel.split('/');
  const isWorkflow = parts[0] === 'workflows';

  if (isWorkflow) {
    // fixtures/workflows/X.valid.json → schemas/workflows/X.schema.json
    const name = parts[1].replace('.valid.json', '').replace('.invalid.json', '');
    return join(SCHEMAS_DIR, 'workflows', `${name}.schema.json`);
  } else {
    // fixtures/audit/X.valid.json → schemas/audit/X.schema.json
    const category = parts[0];
    const name = parts[1].replace('.valid.json', '').replace('.invalid.json', '');
    return join(SCHEMAS_DIR, category, `${name}.schema.json`);
  }
}

function main() {
  const ajv = new Ajv({ allErrors: true });

  // Find all fixture files
  const fixtureFiles = [];
  function walkDir(dir) {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) {
        walkDir(full);
      } else if (entry.name.endsWith('.json')) {
        fixtureFiles.push(full);
      }
    }
  }
  walkDir(FIXTURES_DIR);

  let passed = 0;
  let failed = 0;
  let unexpected = 0;

  for (const fixturePath of fixtureFiles) {
    const schemaPath = findSchemaForFixture(fixturePath);
    const isInvalid = fixturePath.includes('.invalid.');

    if (!existsSync(schemaPath)) {
      console.error(`❌ Schema not found for ${fixturePath}`);
      unexpected++;
      continue;
    }

    const schema = JSON.parse(readFileSync(schemaPath, 'utf-8'));
    const fixture = JSON.parse(readFileSync(fixturePath, 'utf-8'));
    const validate = ajv.compile(schema);

    // Strip _violation field before validation
    const { _violation, ...testData } = fixture;
    const valid = validate(testData);

    const relFixture = fixturePath.replace(SCHEMAS_DIR + '/', '');

    if (isInvalid) {
      if (valid) {
        console.error(`❌ INVALID fixture passed validation: ${relFixture}`);
        console.error(`   Expected violation: ${_violation || 'unknown'}`);
        unexpected++;
      } else {
        console.log(`✅ Invalid fixture correctly rejected: ${relFixture}`);
        console.log(`   Violation: ${_violation || 'N/A'}`);
        passed++;
      }
    } else {
      if (valid) {
        console.log(`✅ Valid fixture passed: ${relFixture}`);
        passed++;
      } else {
        console.error(`❌ Valid fixture FAILED: ${relFixture}`);
        console.error(`   Errors:`, validate.errors);
        failed++;
      }
    }
  }

  console.log(`\n--- Results ---`);
  console.log(`Passed: ${passed}/${fixtureFiles.length}`);
  console.log(`Failed: ${failed}`);
  console.log(`Unexpected: ${unexpected}`);

  if (failed > 0) process.exit(1);
  if (unexpected > 0) process.exit(2);
  process.exit(0);
}

main();
```

## Step 3: Run validation

```bash
cd /sessions/relaxed-eager-fermat/mnt/AI-PM
node schemas/validate-fixtures.mjs
```

If any fixtures fail, fix them:
- Valid fixture failures: add missing required fields or fix enum values
- Invalid fixture passes: fix the fixture to actually violate a constraint

## Step 4: Verify

```bash
# 1. Audit report exists
ls schemas/CONSISTENCY-AUDIT.md

# 2. Validation script exists
ls schemas/validate-fixtures.mjs

# 3. Validation script runs and passes
node schemas/validate-fixtures.mjs

# 4. No modifications outside schemas/
git diff --name-only schemas/
```

## Step 5: Report

```yaml
task_id: agent-4-schema-audit
status: completed | blocked | failed
summary: one-line description
findings:
  - severity: info
    title: what you found and fixed
    detail: consistency issues found, fixtures fixed, validation results
    source_ref: schemas/
recommendations:
  - action: main thread Task 5 can now use the validation script
    owner: main_thread
    priority: medium
artifacts:
  - path_or_url: schemas/CONSISTENCY-AUDIT.md
    type: report
  - path_or_url: schemas/validate-fixtures.mjs
    type: diff
confidence: 0-100
open_questions: []
audit:
  sources_used:
    - list of files read
  assumptions:
    - ajv is available as a dependency
    - all 30 fixtures are valid JSON
  approvals_required: []
  next_agent_suggested: >
    Schema layer is fully audited and validated. Main thread
    can begin Tasks 2-5 with confidence in schema quality.
    Agent 4 schema work is complete.
```
