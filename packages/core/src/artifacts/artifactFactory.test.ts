import { describe, expect, it, beforeEach } from 'vitest';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  loadTemplateCatalog,
  validateTemplateFamilies,
  getTemplateById,
  getTemplatesByCategory,
  getTemplatesByWorkflow,
  listTemplateFamilies,
  type TemplateCatalog,
} from './templateRegistry.js';
import { renderArtifact, type RenderFormat } from './artifactRenderer.js';
import { getCatalog, validateRegistry, generateArtifact } from './artifactFactory.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const TEMPLATES_PATH = resolve(__dirname, '..', '..', '..', '..', 'templates', 'templates.yaml');

describe('Template Registry', () => {
  let catalog: TemplateCatalog;

  beforeEach(async () => {
    catalog = await loadTemplateCatalog(TEMPLATES_PATH);
  });

  it('loads all templates from YAML', () => {
    expect(catalog.templates.length).toBeGreaterThanOrEqual(10);
  });

  it('each template has required fields', () => {
    for (const tmpl of catalog.templates) {
      expect(tmpl.id).toBeTruthy();
      expect(tmpl.name).toBeTruthy();
      expect(tmpl.category).toBeTruthy();
      expect(tmpl.workflow).toBeTruthy();
      expect(tmpl.path).toBeTruthy();
      expect(tmpl.owner_role).toBeTruthy();
      expect(Array.isArray(tmpl.required_inputs)).toBe(true);
    }
  });

  it('validates all required families are present', () => {
    const result = validateTemplateFamilies(catalog);
    expect(result.valid).toBe(true);
    expect(result.missingFamilies).toHaveLength(0);
    expect(result.errors).toHaveLength(0);
  });

  it('detects missing families when template is removed', () => {
    const partialCatalog: TemplateCatalog = {
      version: 1,
      templates: catalog.templates.filter(t => t.id !== 'daily-briefing'),
    };
    const result = validateTemplateFamilies(partialCatalog);
    expect(result.valid).toBe(false);
    expect(result.missingFamilies).toContain('daily');
  });

  it('detects duplicate IDs', () => {
    const withDup: TemplateCatalog = {
      version: 1,
      templates: [...catalog.templates, { ...catalog.templates[0] }],
    };
    const result = validateTemplateFamilies(withDup);
    expect(result.duplicateIds).toContain(catalog.templates[0].id);
  });

  it('getTemplateById finds existing template', () => {
    const tmpl = getTemplateById(catalog, 'daily-briefing');
    expect(tmpl).toBeDefined();
    expect(tmpl!.name).toBe('Daily Briefing');
  });

  it('getTemplateById returns undefined for unknown id', () => {
    expect(getTemplateById(catalog, 'nonexistent')).toBeUndefined();
  });

  it('getTemplatesByCategory filters correctly', () => {
    const reports = getTemplatesByCategory(catalog, 'reports');
    expect(reports.length).toBeGreaterThanOrEqual(1);
    for (const t of reports) {
      expect(t.category).toBe('reports');
    }
  });

  it('getTemplatesByWorkflow filters correctly', () => {
    const qc = getTemplatesByWorkflow(catalog, 'code-quality-guard');
    expect(qc.length).toBeGreaterThanOrEqual(1);
    for (const t of qc) {
      expect(t.workflow).toBe('code-quality-guard');
    }
  });

  it('listTemplateFamilies returns all families', () => {
    const families = listTemplateFamilies();
    expect(families).toContain('daily');
    expect(families).toContain('weekly');
    expect(families).toContain('risk');
    expect(families).toContain('scope');
    expect(families).toContain('traceability');
    expect(families).toContain('code_review');
    expect(families).toContain('test_plan');
    expect(families).toContain('uat');
    expect(families).toContain('user_guide');
    expect(families).toContain('devops_readiness');
  });
});

describe('Artifact Renderer', () => {
  let catalog: TemplateCatalog;

  beforeEach(async () => {
    catalog = await loadTemplateCatalog(TEMPLATES_PATH);
  });

  it('renders markdown with all fields', () => {
    const tmpl = getTemplateById(catalog, 'daily-briefing')!;
    const data = { completed_tasks: 'Task A', blockers: 'Blocker B' };
    const rendered = renderArtifact(tmpl, data, 'markdown');

    expect(rendered.format).toBe('markdown');
    expect(rendered.content).toContain('Daily Briefing');
    expect(rendered.content).toContain('Task A');
    expect(rendered.content).toContain('Blocker B');
    expect(rendered.metadata.templateId).toBe('daily-briefing');
    expect(rendered.metadata.templateName).toBe('Daily Briefing');
  });

  it('renders markdown with missing fields as not-provided', () => {
    const tmpl = getTemplateById(catalog, 'daily-briefing')!;
    const rendered = renderArtifact(tmpl, {}, 'markdown');

    expect(rendered.content).toContain('[Not provided]');
  });

  it('renders markdown with array fields as bullet list', () => {
    const tmpl = getTemplateById(catalog, 'risk-register')!;
    const data = {
      risk_statement: 'Test risk',
      category: 'technical',
      likelihood: 'high',
      impact: 'high',
      owner: 'Tech Lead',
      mitigation: ['Plan A', 'Plan B'],
    };
    const rendered = renderArtifact(tmpl, data, 'markdown');
    expect(rendered.content).toContain('- Plan A');
    expect(rendered.content).toContain('- Plan B');
  });

  it('renders HTML with all sections', () => {
    const tmpl = getTemplateById(catalog, 'weekly-status')!;
    const data = {
      milestone_completion: '75%',
      schedule_variance: '-2 days',
      budget_burn: '$50K / $100K',
      risks: '2 medium',
      decisions: 'Approved scope change',
      next_week_focus: 'API integration',
    };
    const rendered = renderArtifact(tmpl, data, 'html');

    expect(rendered.format).toBe('html');
    expect(rendered.content).toContain('<!DOCTYPE html>');
    expect(rendered.content).toContain('Weekly Status Report');
    expect(rendered.content).toContain('75%');
    expect(rendered.content).toContain('AI-PM Toolkit');
  });

  it('renders HTML with approval badge when required', () => {
    const tmpl = getTemplateById(catalog, 'weekly-status')!;
    const rendered = renderArtifact(tmpl, {}, 'html');
    expect(rendered.content).toContain('Approval Required');
  });

  it('renders JSON with correct schema reference', () => {
    const tmpl = getTemplateById(catalog, 'daily-briefing')!;
    const data = { completed_tasks: 'Done', blockers: 'None' };
    const rendered = renderArtifact(tmpl, data, 'json');

    expect(rendered.format).toBe('json');
    const parsed = JSON.parse(rendered.content);
    expect(parsed.$schema).toContain('daily-briefing');
    expect(parsed.meta.templateId).toBe('daily-briefing');
    expect(parsed.content.completed_tasks).toBe('Done');
  });

  it('JSON metadata includes all required fields', () => {
    const tmpl = getTemplateById(catalog, 'test-plan')!;
    const rendered = renderArtifact(tmpl, {}, 'json');
    const parsed = JSON.parse(rendered.content);

    expect(parsed.meta.templateId).toBe('test-plan');
    expect(parsed.meta.templateName).toBe('Test Plan');
    expect(parsed.meta.category).toBe('qa');
    expect(parsed.meta.workflow).toBe('code-quality-guard');
    expect(parsed.meta.ownerRole).toBe('qa');
    expect(parsed.meta.approvalRequired).toBe(true);
    expect(parsed.meta.renderedAt).toBeTruthy();
    expect(parsed.meta.version).toBe('1.0.0');
  });
});

describe('Artifact Factory', () => {
  it('getCatalog returns catalog', async () => {
    const cat = await getCatalog(TEMPLATES_PATH);
    expect(cat.templates.length).toBeGreaterThanOrEqual(10);
  });

  it('validateRegistry returns valid result', async () => {
    const result = await validateRegistry(TEMPLATES_PATH);
    expect(result.valid).toBe(true);
    expect(result.missingFamilies).toHaveLength(0);
  });

  it('generateArtifact produces all three formats', async () => {
    const outputs = await generateArtifact(
      'daily-briefing',
      { completed_tasks: 'Done', blockers: 'None', in_progress_tasks: 'Working' },
      { formats: ['markdown', 'html', 'json'], outputPath: '/tmp/test-output' },
    );

    expect(outputs).toHaveLength(3);
    expect(outputs.map(o => o.format).sort()).toEqual(['html', 'json', 'markdown']);
    for (const o of outputs) {
      expect(o.content.length).toBeGreaterThan(0);
      expect(o.metadata.templateId).toBe('daily-briefing');
    }
  });

  it('generateArtifact throws for unknown template', async () => {
    await expect(generateArtifact('nonexistent', {})).rejects.toThrow('not found');
  });

  it('generateArtifact defaults to all local artifact formats', async () => {
    const outputs = await generateArtifact('daily-briefing', { completed_tasks: 'Done' }, ['markdown', 'html', 'json']);
    expect(outputs).toHaveLength(3);
    expect(outputs.map(o => o.format).sort()).toEqual(['html', 'json', 'markdown']);
  });
});

describe('Template table_schema field', () => {
  it('risk-register template has table_schema', async () => {
    const catalog = await loadTemplateCatalog(TEMPLATES_PATH);
    const tmpl = getTemplateById(catalog, 'risk-register');
    expect(tmpl).toBeDefined();
    expect(tmpl!.table_schema).toBe('risk-register');
  });

  it('traceability-matrix template has table_schema', async () => {
    const catalog = await loadTemplateCatalog(TEMPLATES_PATH);
    const tmpl = getTemplateById(catalog, 'traceability-matrix');
    expect(tmpl!.table_schema).toBe('traceability-matrix');
  });

  it('uat-report template has table_schema', async () => {
    const catalog = await loadTemplateCatalog(TEMPLATES_PATH);
    const tmpl = getTemplateById(catalog, 'uat-report');
    expect(tmpl!.table_schema).toBe('uat-signoff');
  });

  it('devops-readiness template has table_schema', async () => {
    const catalog = await loadTemplateCatalog(TEMPLATES_PATH);
    const tmpl = getTemplateById(catalog, 'devops-readiness');
    expect(tmpl!.table_schema).toBe('release-readiness');
  });

  it('daily-briefing template has no table_schema', async () => {
    const catalog = await loadTemplateCatalog(TEMPLATES_PATH);
    const tmpl = getTemplateById(catalog, 'daily-briefing');
    expect(tmpl!.table_schema).toBeUndefined();
  });
});

describe('CSV rendering', () => {
  let catalog: TemplateCatalog;

  beforeEach(async () => {
    catalog = await loadTemplateCatalog(TEMPLATES_PATH);
  });

  it('renders CSV with tabular rows data', () => {
    const tmpl = getTemplateById(catalog, 'risk-register')!;
    const data = {
      rows: [
        { risk_id: 'R-1', risk_statement: 'API rate limits', category: 'technical', probability: 'medium', impact: 'high', owner: 'TL', status: 'open' },
        { risk_id: 'R-2', risk_statement: 'Key dev leave', category: 'resource', probability: 'high', impact: 'medium', owner: 'PM', status: 'mitigated' },
      ],
    };
    const rendered = renderArtifact(tmpl, data, 'csv');
    expect(rendered.format).toBe('csv');
    const lines = rendered.content.trim().split('\n');
    expect(lines[0]).toContain('risk_id');
    expect(lines[0]).toContain('risk_statement');
    expect(lines.length).toBe(3); // header + 2 rows
  });

  it('renders CSV key-value fallback when no rows', () => {
    const tmpl = getTemplateById(catalog, 'daily-briefing')!;
    const data = { completed_tasks: 'Task A', blockers: 'None' };
    const rendered = renderArtifact(tmpl, data, 'csv');
    const lines = rendered.content.trim().split('\n');
    expect(lines[0]).toBe('field,value');
    expect(lines.some(l => l.includes('completed_tasks'))).toBe(true);
  });

  it('CSV escapes fields with commas', () => {
    const tmpl = getTemplateById(catalog, 'risk-register')!;
    const data = {
      rows: [{ risk_id: 'R-1', risk_statement: 'High, critical risk', category: 'technical', probability: 'medium', impact: 'high', owner: 'TL', status: 'open' }],
    };
    const rendered = renderArtifact(tmpl, data, 'csv');
    expect(rendered.content).toContain('"High, critical risk"');
  });
});

describe('Factory table validation', () => {
  it('validates table data when validateTable option is set', async () => {
    // This should succeed with valid risk-register data
    const outputs = await generateArtifact('risk-register', {
      rows: [
        { risk_id: 'R-1', risk_statement: 'Test risk', category: 'technical', probability: 'medium', impact: 'high', owner: 'TL', status: 'open' },
      ],
    }, {
      formats: ['csv'],
      validateTable: true,
    });
    expect(outputs).toHaveLength(1);
    expect(outputs[0].format).toBe('csv');
  });

  it('throws when table validation fails', async () => {
    await expect(
      generateArtifact('risk-register', {
        rows: [
          { risk_id: 'R-1', risk_statement: 'Missing required fields' }, // missing category, probability, etc.
        ],
      }, {
        formats: ['csv'],
        validateTable: true,
      })
    ).rejects.toThrow('Table validation failed');
  });

  it('skips table validation when template has no table_schema', async () => {
    // daily-briefing has no table_schema — validation is skipped
    const outputs = await generateArtifact('daily-briefing', { completed_tasks: 'Done' }, {
      formats: ['markdown'],
      validateTable: true,
    });
    expect(outputs).toHaveLength(1);
  });

  it('skips table validation when validateTable is false', async () => {
    // Even with invalid data, validation is skipped
    const outputs = await generateArtifact('risk-register', { anything: true }, {
      formats: ['json'],
      validateTable: false,
    });
    expect(outputs).toHaveLength(1);
  });
});
