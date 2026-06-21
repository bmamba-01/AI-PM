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
      ['markdown', 'html', 'json'],
      '/tmp/test-output',
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
    const outputs = await generateArtifact('daily-briefing', { completed_tasks: 'Done' });
    expect(outputs).toHaveLength(3);
    expect(outputs.map(o => o.format).sort()).toEqual(['html', 'json', 'markdown']);
  });
});
