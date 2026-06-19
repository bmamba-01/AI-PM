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
import addFormats from 'ajv-formats';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SCHEMAS_DIR = __dirname;
const FIXTURES_DIR = join(__dirname, 'fixtures');

// Map fixture paths to their corresponding schema
function findSchemaForFixture(fixturePath) {
  // fixtures/workflows/daily-briefing.output.valid.json
  //   → schemas/workflows/daily-briefing.output.schema.json
  const rel = fixturePath.replace(FIXTURES_DIR + '/', '').replace(FIXTURES_DIR + '\\', '');
  const parts = rel.split(/[/\\]/);
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

    const relFixture = fixturePath.replace(SCHEMAS_DIR + '\\', '').replace(SCHEMAS_DIR + '/', '');

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
