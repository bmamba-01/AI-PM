# Workflow JSON Schemas

Machine-readable JSON Schema definitions for all AI-PM Toolkit workflow inputs and outputs.

## Shared Schemas

The following shared schemas are used across multiple workflows and runtime components:

| File | Description |
|------|-------------|
| `../audit/audit-record.schema.json` | Schema for a single audit record. Every meaningful agent action must produce one of these. Based on design spec section 10.3. |
| `../approval/approval-item.schema.json` | Schema for a single approval queue item. Used by the runtime validation pipeline (Task 4) to manage approval workflows. |
| `../subagent/subagent-task.schema.json` | Schema for subagent task contracts. Defines the structure for delegating work between agents. |
| `../subagent/subagent-output.schema.json` | Schema for subagent output contracts. Defines the structure for returning results from delegated work. |

These schemas are consumed by:
- **Runtime validation pipeline** (Task 4-5 in the active implementation plan)
- **Agent orchestrator** for task delegation and result processing
- **Approval queue system** for managing external mutations
- **Audit log system** for recording all meaningful agent actions

## Workflow Schema Files

| File | Description |
|------|-------------|
| `daily-briefing.input.schema.json` | Input contract for the Daily PM Briefing workflow |
| `daily-briefing.output.schema.json` | Output contract for the Daily PM Briefing workflow |
| `meeting-intelligence.input.schema.json` | Input contract for the Meeting Intelligence workflow |
| `meeting-intelligence.output.schema.json` | Output contract for the Meeting Intelligence workflow |
| `scope-control.input.schema.json` | Input contract for the Scope & Requirement Control workflow |
| `scope-control.output.schema.json` | Output contract for the Scope & Requirement Control workflow |
| `risk-control.input.schema.json` | Input contract for the Risk & Issue Control workflow |
| `risk-control.output.schema.json` | Output contract for the Risk & Issue Control workflow |
| `reporting.input.schema.json` | Input contract for the Reporting workflow |
| `reporting.output.schema.json` | Output contract for the Reporting workflow |
| `code-quality-guard.input.schema.json` | Input contract for the Code Quality Guard workflow |
| `code-quality-guard.output.schema.json` | Output contract for the Code Quality Guard workflow |

## Schema Version

All schemas use **JSON Schema draft 2020-12**.

## Design Decisions

1. **All workflows now have both input and output schemas** — input schemas define the data requirements from MCP sources and local context, while output schemas define the structured results.
2. **Input schemas model MCP data sources** — each input schema structures the data that would be gathered from Jira, GitHub, Calendar, Email, and other MCP connectors as defined in the workflow README files.
3. **Each output schema includes an `audit` object** — aligned with the design spec requirement for every meaningful agent action to record source data, reasoning, and next action.
4. **Confidence is a required field** on every output schema — the design spec requires confidence below 70 to trigger explicit assumptions and reviewer recommendation.
5. **Approval-required fields are explicit** — aligning with the approval gate model from the design spec.
6. **Findings include file/line references** where available — the code quality guard output schema supports this per the acceptance criteria.
7. **RAG status is a nested object** — the reporting output uses a structured RAG object for each project dimension rather than a flat string.

## Assumptions

- All workflow outputs follow the subagent output contract pattern with workflow-specific extensions.
- All workflow inputs model the data sources listed in workflow README files under "Inputs" sections.
- Input schemas derive their structure from MCP connector contracts and the subagent task contract.
- The `confidence` field uses integer 0-100 matching the subagent protocol.
- Audit fields are optional within each output but recommended by the design spec.

## Usage

These schemas can be used for:

- **Runtime validation** — validate workflow outputs against the schema before returning results.
- **Agent contracts** — enforce that agent outputs conform to the expected structure.
- **Documentation** — serve as the authoritative source of truth for workflow I/O contracts.
- **Testing** — generate test fixtures and validate outputs in CI.

## Validation

To validate a workflow output against its schema:

```bash
# Using ajv-cli or similar tool
npx ajv-cli validate -s schemas/workflows/daily-briefing.output.schema.json -d output.json

# Using a JSON Schema validator in code
# import schema from './schemas/workflows/daily-briefing.output.schema.json';
# const validate = ajv.compile(schema);
# const valid = validate(workflowOutput);
```

## Test Fixtures

The `schemas/fixtures/` directory contains test fixtures for all schemas:

- **Valid fixtures** (`*.valid.json`): Contain all required fields with realistic sample data, use realistic enum values, and pass validation against their schemas. These demonstrate correct usage and can be used for integration testing.

- **Invalid fixtures** (`*.invalid.json`): Each violates exactly one constraint (missing required field, wrong enum value, value out of range, etc.). They include a `_violation` field explaining what is wrong. Test harnesses should strip this field before validation.

Fixture structure:
- `fixtures/workflows/*.valid.json` and `*.invalid.json` — workflow output fixtures
- `fixtures/audit/*.valid.json` and `*.invalid.json` — audit record fixtures
- `fixtures/approval/*.valid.json` and `*.invalid.json` — approval item fixtures
- `fixtures/subagent/*.valid.json` and `*.invalid.json` — subagent task/output fixtures

These fixtures are consumed by:
- **Runtime validation pipeline** (Task 5) for testing schema validation logic
- **Integration tests** to verify workflow execution produces valid outputs
- **Documentation** as reference examples of correct schema usage

## Relationship to Other Contracts

- **Subagent Task Contract** (`docs/operating-model/subagent-protocol.md`): defines the general task and output contract that all workflows build upon.
- **MCP Contracts** (`mcp/contracts/`): define the normalized data sources that feed workflow inputs.
- **Playbooks** (`playbooks/`): provide methodology and project-type rules that influence workflow behavior.
- **Audit Log** (design spec section 10.3): defines the audit record format for workflow runs.
