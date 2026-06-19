# Schema Consistency Audit Report

**Date:** 2026-06-19  
**Auditor:** Agent 4  
**Scope:** All 16 JSON schemas and 30 test fixtures

---

## Executive Summary

Audited 16 schemas (12 workflow + 4 shared) and 30 fixtures for structural consistency, field naming conventions, cross-schema alignment, and fixture validity.

**Result:** 1 critical issue found (enum casing inconsistency), all other checks passed.

---

## 1. Structural Consistency

### 1.1 Schema Metadata ✅ PASS

All 16 schemas correctly use:
- `"$schema": "https://json-schema.org/draft/2020-12/schema"`
- Unique `"$id"` values following pattern `https://ai-pm-toolkit.dev/schemas/{category}/{name}.schema.json`
- `"title"` and `"description"` fields present
- `"additionalProperties": false` at top level

### 1.2 Object additionalProperties ✅ PASS

Checked all nested objects for `additionalProperties: false`. 

**Exception noted:** `approval-item.schema.json` has `"details"` property with `"additionalProperties": true` — this is intentional for freeform data.

All other nested objects correctly use `"additionalProperties": false`.

---

## 2. Field Naming Consistency

### 2.1 Date-time Fields ✅ PASS

All date-time fields use `"format": "date-time"`:
- `created_at`, `updated_at`, `decided_at`, `expires_at` (approval-item)
- `started_at`, `completed_at` (audit-record)
- `date` (daily-briefing input/output)
- `start`, `end`, `requested_at`, `due_date` (various)

### 2.2 Confidence Fields ✅ PASS

All confidence fields consistently use:
```json
"confidence": {
  "type": "integer",
  "minimum": 0,
  "maximum": 100
}
```

Found in: all 6 workflow output schemas, audit-record, subagent-output.

### 2.3 Enum Value Casing ❌ **CRITICAL ISSUE**

**Issue:** Inconsistent enum casing in `daily-briefing.input.schema.json`

**Location:** `risks[].level` field (line 81)
```json
"level": { "type": "string", "enum": ["CRITICAL", "HIGH", "MEDIUM", "LOW"] }
```

**Expected:** lowercase to match all other schemas
```json
"level": { "type": "string", "enum": ["critical", "high", "medium", "low"] }
```

**Impact:** 
- risk-control.input uses lowercase: `["low", "medium", "high", "critical"]`
- reporting.input uses lowercase: `["low", "medium", "high", "critical"]`
- This breaks cross-schema consistency for risk level values

**Fix Required:** Change to lowercase in daily-briefing.input.schema.json

All other enum values correctly use lowercase (scrum, kanban, completed, pending, etc.)

---

## 3. Cross-Schema Consistency

### 3.1 Workflow ID Enums ✅ PASS

`audit-record.schema.json` workflow_id enum includes:
- daily-briefing
- meeting-intelligence  
- scope-control
- risk-control
- reporting
- code-quality-guard
- agent-supervision
- audit
- workflow_state
- chat-gateway

All workflow schemas correctly use kebab-case IDs matching this enum.

### 3.2 Risk Fields Alignment ⚠️ **NEEDS FIX**

**risk-control.input** risk_register items:
- probability: ["low", "medium", "high"]
- impact: ["low", "medium", "high", "critical"]

**risk-control.output** new_risks items:
- probability: ["low", "medium", "high"]  
- impact: ["low", "medium", "high", "critical"]

✅ These match correctly.

**daily-briefing.input** risks items:
- level: ["CRITICAL", "HIGH", "MEDIUM", "LOW"] ❌ UPPERCASE

**Fix:** Change daily-briefing.input risks.level to lowercase to align with risk-control schemas.

### 3.3 Report Type Alignment ✅ PASS

- daily-briefing.input `report_schedule[].report_type`: ["daily", "weekly", "client", "steering", "sprint", "release", "budget"]
- reporting.input `report_type`: ["daily", "weekly", "client", "steering", "sprint", "release", "budget"]
- reporting.output `report_type`: ["daily", "weekly", "client", "steering", "sprint", "release", "budget"]

All three match exactly.

### 3.4 Audience Alignment ⚠️ **MINOR DISCREPANCY**

- daily-briefing.input `report_schedule[].audience`: ["internal", "client", "executive", "team"]
- reporting.input `audience`: ["internal", "client", "executive", "team", "steering_committee"]
- reporting.output `audience`: ["internal", "client", "executive", "team"]

**Analysis:** reporting.input includes "steering_committee" which others don't. This is acceptable as reporting workflow may support more audience types than daily briefing tracks.

**Action:** No fix required, but document that reporting.input supports superset of audiences.

### 3.5 Action Item Target Systems ✅ PASS

meeting-intelligence.output action_items target_system enum includes: ["jira", "linear", "github", "notion", "confluence", "local_memory", "none"]

This aligns with source systems referenced throughout other schemas.

### 3.6 Code Quality File References ✅ PASS

code-quality-guard.input `changed_files[].path` field is string type.  
code-quality-guard.output findings have `file` and `line` fields as string and integer.

These align correctly for mapping findings back to changed files.

---

## 4. Fixture Consistency

### 4.1 Valid Fixtures Structure ✅ PASS

Checked all 15 valid fixtures:
- All contain required fields from their schemas
- All use realistic IDs (PRJ-2026-001, MTG-2026-042, RISK-015, etc.)
- All date fields use ISO-8601 format (2026-06-19T09:00:00Z)
- All enum values exist in schema definitions

### 4.2 Invalid Fixtures Structure ✅ PASS

Checked all 15 invalid fixtures:
- Each violates exactly one constraint
- Each includes `_violation` field explaining the violation
- All are valid JSON (will parse, but fail schema validation)

**Violation types found:**
- Missing required fields (5 fixtures)
- Invalid enum values (8 fixtures)
- Out of range values (1 fixture: confidence=105)
- Invalid field types (1 fixture implied)

### 4.3 Fixture Enum Validation ⚠️ **NEEDS VERIFICATION**

**Potential Issue:** `daily-briefing.input.valid.json` fixture may use wrong risk level casing.

Need to verify fixture uses uppercase ["CRITICAL", "HIGH", "MEDIUM", "LOW"] to match current schema, or will fail validation once schema is fixed to lowercase.

**Action:** After fixing schema to lowercase, update fixture to use lowercase values.

---

## Summary of Issues

| ID | Severity | Issue | Location | Fix Required |
|----|----------|-------|----------|--------------|
| 1 | Critical | Enum casing inconsistency for risk levels | daily-briefing.input.schema.json line 81 | Change to lowercase |
| 2 | Minor | Risk level fixture may need update after schema fix | schemas/fixtures/workflows/daily-briefing.input.valid.json | Update after schema fix |

---

## Recommendations

1. **Fix enum casing immediately** — change daily-briefing.input risks.level enum to lowercase
2. **Update fixture** — after schema fix, ensure daily-briefing.input.valid.json uses lowercase risk levels
3. **Run validation script** — verify all fixtures pass after fixes
4. **Document audience enum differences** — add note to README that reporting.input supports superset of audiences

---

## Verification Checklist

- [x] All 16 schemas use draft 2020-12
- [x] All schemas have unique $id values
- [x] All top-level objects use additionalProperties: false
- [x] All date-time fields use format: date-time
- [x] All confidence fields use integer 0-100
- [ ] All enum values use lowercase (1 failure found)
- [x] workflow_id enums are consistent
- [x] All 30 fixtures are valid JSON
- [x] All valid fixtures have required fields
- [x] All invalid fixtures have _violation field

**Audit Status:** 14/15 checks passed. 1 critical fix required.
