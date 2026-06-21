import { mkdir, writeFile } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import {
  loadTemplateCatalog,
  validateTemplateFamilies,
  getTemplateById,
  type TemplateCatalog,
  type TemplateEntry,
  type RegistryValidationResult,
} from './templateRegistry.js';
import { renderArtifact, type RenderFormat, type RenderedArtifact } from './artifactRenderer.js';
import { validateArtifactTable, type TableValidationResult } from './tableSchema.js';

// ── Types ───────────────────────────────────────────────────────────────────

export interface ArtifactOutput {
  path: string;
  format: RenderFormat;
  content: string;
  metadata: import('./artifactRenderer.js').ArtifactMetadata;
}

export interface FactoryResult {
  templateId: string;
  outputs: ArtifactOutput[];
  validation: RegistryValidationResult;
}

export interface GenerateArtifactOptions {
  formats?: RenderFormat[];
  outputPath?: string;
  /** When true, validates table data against the template's table_schema before rendering */
  validateTable?: boolean;
  /** Override schemas directory for table validation */
  tableSchemasDir?: string;
}

// ── Factory ─────────────────────────────────────────────────────────────────

let _catalog: TemplateCatalog | null = null;

export async function getCatalog(yamlPath?: string): Promise<TemplateCatalog> {
  if (!_catalog) {
    _catalog = await loadTemplateCatalog(yamlPath);
  }
  return _catalog;
}

export async function validateRegistry(yamlPath?: string): Promise<RegistryValidationResult> {
  const catalog = await getCatalog(yamlPath);
  return validateTemplateFamilies(catalog);
}

export interface GenerateArtifactResult {
  outputs: ArtifactOutput[];
  tableValidation?: TableValidationResult;
}

export async function generateArtifact(
  templateId: string,
  data: Record<string, unknown>,
  formatsOrOptions?: RenderFormat[] | GenerateArtifactOptions,
): Promise<ArtifactOutput[]> {
  // Support legacy signature: generateArtifact(id, data, formats[], path?)
  let formats: RenderFormat[] = ['markdown', 'html', 'json'];
  let outputPath: string | undefined;
  let validateTable = false;
  let tableSchemasDir: string | undefined;

  if (Array.isArray(formatsOrOptions)) {
    formats = formatsOrOptions;
  } else if (formatsOrOptions) {
    formats = formatsOrOptions.formats ?? formats;
    outputPath = formatsOrOptions.outputPath;
    validateTable = formatsOrOptions.validateTable ?? false;
    tableSchemasDir = formatsOrOptions.tableSchemasDir;
  }

  const catalog = await getCatalog();
  const template = getTemplateById(catalog, templateId);

  if (!template) {
    throw new Error(`Template "${templateId}" not found in catalog`);
  }

  // Table validation: if template has table_schema and data is tabular (rows array)
  if (validateTable && template.table_schema) {
    const rows = Array.isArray(data.rows) ? data.rows as Array<Record<string, unknown>> : [data];
    const tableResult = await validateArtifactTable(template.table_schema, rows, tableSchemasDir);
    if (!tableResult.valid) {
      throw new Error(
        `Table validation failed for schema "${template.table_schema}":\n` +
        tableResult.errors.join('\n')
      );
    }
  }

  const outputs: ArtifactOutput[] = [];

  for (const format of formats) {
    const rendered = renderArtifact(template, data, format);
    const ext = format === 'markdown' ? 'md' : format === 'html' ? 'html' : format === 'csv' ? 'csv' : 'json';
    const filePath = outputPath
      ? resolve(outputPath, `${templateId}.${ext}`)
      : `${template.path.replace(/\.[^.]+$/, '')}.${ext}`;

    outputs.push({
      path: filePath,
      format,
      content: rendered.content,
      metadata: rendered.metadata,
    });
  }

  return outputs;
}

export async function writeArtifact(
  output: ArtifactOutput,
  targetDir: string,
): Promise<string> {
  const filePath = resolve(targetDir, output.path);
  await mkdir(dirname(filePath), { recursive: true });
  await writeFile(filePath, output.content, 'utf-8');
  return filePath;
}

export async function generateAndWrite(
  templateId: string,
  data: Record<string, unknown>,
  targetDir: string,
  formats: RenderFormat[] = ['markdown', 'html', 'json'],
): Promise<string[]> {
  const outputs = await generateArtifact(templateId, data, { formats, outputPath: targetDir });
  const paths: string[] = [];

  for (const output of outputs) {
    const filePath = await writeArtifact(output, targetDir);
    paths.push(filePath);
  }

  return paths;
}

export function getTemplateInfo(templateId: string): TemplateEntry | undefined {
  if (!_catalog) return undefined;
  return getTemplateById(_catalog, templateId);
}
