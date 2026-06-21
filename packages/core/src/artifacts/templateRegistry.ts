import { readFile } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import yaml from 'js-yaml';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ── Types ───────────────────────────────────────────────────────────────────

export interface TemplateEntry {
  id: string;
  path: string;
  category: string;
  name: string;
  description: string;
  workflow: string;
  approval_required: boolean;
  output_format: string;
  owner_role: string;
  required_inputs: string[];
  approval_gate?: string;
  source_workflow: string;
  /** Optional table schema ID for CSV/table validation (e.g., "risk-register") */
  table_schema?: string;
}

export interface TemplateCatalog {
  version: number;
  templates: TemplateEntry[];
}

export interface RegistryValidationResult {
  valid: boolean;
  missingFamilies: string[];
  duplicateIds: string[];
  errors: string[];
}

// ── Required template families ───────────────────────────────────────────────

const REQUIRED_FAMILIES: Record<string, string[]> = {
  daily: ['daily-briefing'],
  weekly: ['weekly-status'],
  risk: ['risk-register'],
  scope: ['change-request', 'acceptance-criteria'],
  traceability: ['traceability-matrix'],
  code_review: ['merge-readiness'],
  test_plan: ['test-plan'],
  uat: ['uat-report'],
  user_guide: ['user-guide'],
  devops_readiness: ['devops-readiness'],
};

// ── Registry ────────────────────────────────────────────────────────────────

const DEFAULT_TEMPLATES_PATH = resolve(__dirname, '..', '..', '..', '..', 'templates', 'templates.yaml');

let _catalog: TemplateCatalog | null = null;

export async function loadTemplateCatalog(yamlPath?: string): Promise<TemplateCatalog> {
  const filePath = yamlPath ?? DEFAULT_TEMPLATES_PATH;
  const raw = await readFile(filePath, 'utf-8');
  const parsed = yaml.load(raw) as TemplateCatalog;

  if (!parsed || typeof parsed !== 'object' || !Array.isArray(parsed.templates)) {
    throw new Error(`Invalid template catalog format in ${filePath}`);
  }

  _catalog = parsed;
  return parsed;
}

export function validateTemplateFamilies(catalog: TemplateCatalog): RegistryValidationResult {
  const errors: string[] = [];
  const missingFamilies: string[] = [];
  const duplicateIds: string[] = [];

  // Check for duplicate IDs
  const seenIds = new Set<string>();
  for (const tmpl of catalog.templates) {
    if (seenIds.has(tmpl.id)) {
      duplicateIds.push(tmpl.id);
    }
    seenIds.add(tmpl.id);
  }

  if (duplicateIds.length > 0) {
    errors.push(`Duplicate template IDs: ${duplicateIds.join(', ')}`);
  }

  // Check required families — each family must have at least one template
  for (const [familyName, requiredIds] of Object.entries(REQUIRED_FAMILIES)) {
    const found = requiredIds.some(id => seenIds.has(id));
    if (!found) {
      missingFamilies.push(familyName);
      errors.push(`Missing required family "${familyName}": expected [${requiredIds.join(', ')}]`);
    }
  }

  // Validate individual templates
  for (const tmpl of catalog.templates) {
    if (!tmpl.id) errors.push('Template missing "id"');
    if (!tmpl.name) errors.push(`Template "${tmpl.id}" missing "name"`);
    if (!tmpl.category) errors.push(`Template "${tmpl.id}" missing "category"`);
    if (!tmpl.workflow) errors.push(`Template "${tmpl.id}" missing "workflow"`);
    if (!Array.isArray(tmpl.required_inputs)) {
      errors.push(`Template "${tmpl.id}" missing "required_inputs" array`);
    }
  }

  return {
    valid: errors.length === 0,
    missingFamilies,
    duplicateIds,
    errors,
  };
}

export function getTemplateById(catalog: TemplateCatalog, id: string): TemplateEntry | undefined {
  return catalog.templates.find(t => t.id === id);
}

export function getTemplatesByCategory(catalog: TemplateCatalog, category: string): TemplateEntry[] {
  return catalog.templates.filter(t => t.category === category);
}

export function getTemplatesByWorkflow(catalog: TemplateCatalog, workflow: string): TemplateEntry[] {
  return catalog.templates.filter(t => t.workflow === workflow);
}

export function listTemplateFamilies(): string[] {
  return Object.keys(REQUIRED_FAMILIES);
}
