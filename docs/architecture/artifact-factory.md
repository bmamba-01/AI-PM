# Artifact Factory and Template Registry

**Date:** 2026-06-19  
**Status:** Active  
**Owner:** Core team  
**Audience:** Runtime implementers, workflow authors

## Overview

The artifact factory centralizes local artifact rendering so that daily, weekly, risk, scope, traceability, code review, test plan, UAT, user guide, and DevOps readiness workflows do not each invent output formatting.

## Architecture

```
templates/templates.yaml          ← Template catalog (YAML)
        │
        ▼
packages/core/src/artifacts/
├── templateRegistry.ts           ← Load & validate catalog
├── artifactRenderer.ts           ← Render → Markdown | HTML | JSON
├── artifactFactory.ts            ← Orchestrator (generate + write)
└── index.ts                      ← Public API exports
```

## Template Catalog (`templates/templates.yaml`)

The catalog is a versioned YAML file listing all available templates. Each entry has:

| Field | Required | Description |
|-------|----------|-------------|
| `id` | yes | Unique template identifier |
| `path` | yes | Relative path for the rendered output |
| `category` | yes | Logical grouping (reports, meetings, risks, etc.) |
| `name` | yes | Human-readable name |
| `description` | yes | What this template produces |
| `workflow` | yes | Originating workflow (daily-briefing, reporting, etc.) |
| `approval_required` | yes | Whether PM approval is needed |
| `output_format` | yes | Primary format (markdown) |
| `owner_role` | yes | Role responsible for content |
| `required_inputs` | yes | Array of input field keys |
| `approval_gate` | no | Approval policy description |
| `source_workflow` | yes | Path to originating workflow |

## Required Template Families

The registry validates that these families exist:

| Family | Required Templates | Workflow |
|--------|-------------------|----------|
| `daily` | daily-briefing | daily-briefing |
| `weekly` | weekly-status | reporting |
| `risk` | risk-register | risk-control |
| `scope` | change-request, acceptance-criteria | scope-control |
| `traceability` | traceability-matrix | scope-control |
| `code_review` | merge-readiness | code-quality-guard |
| `test_plan` | test-plan | code-quality-guard |
| `uat` | uat-report | code-quality-guard |
| `user_guide` | user-guide | code-quality-guard |
| `devops_readiness` | devops-readiness | code-quality-guard |

## Render Formats

### Markdown
Default format. Produces a structured document with H1 title, blockquote description, H2 sections for each input field, and a footer with template/workflow metadata.

### HTML
Self-contained HTML document with inline CSS. Includes approval badge when `approval_required` is true. Suitable for email or browser preview.

### JSON
Structured JSON with `$schema` reference, `meta` block (template metadata + render timestamp), and `content` block (the input data). Suitable for programmatic consumption.

## Usage

```typescript
import {
  getCatalog,
  validateRegistry,
  generateArtifact,
  writeArtifact,
} from '@ai-pm/core/artifacts';

// Validate the catalog
const validation = await validateRegistry();
if (!validation.valid) {
  console.error('Missing families:', validation.missingFamilies);
}

// Generate an artifact
const outputs = await generateArtifact('daily-briefing', {
  completed_tasks: 'Task A, Task B',
  blockers: 'None',
  in_progress_tasks: 'Task C',
  risks: '1 medium risk',
  milestones: 'Sprint 13 planning',
  decisions: 'Approved scope change',
}, ['markdown', 'html', 'json']);

// Write to disk
for (const output of outputs) {
  const path = await writeArtifact(output, './output');
  console.log(`Written: ${path}`);
}
```

## Constraints

- No Google Drive/Sheets sync yet — output is local files only.
- Templates are loaded from disk, not embedded in code.
- The factory does not execute workflows — it only renders their output.
- Approval gates are metadata only; enforcement is handled by the approval queue runtime.

## Future Work

- Template versioning and migration
- Custom template overrides per project
- Remote template catalog (MCP-based)
- Email/Slack distribution of rendered artifacts
