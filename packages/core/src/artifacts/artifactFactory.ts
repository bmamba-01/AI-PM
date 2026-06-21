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

export async function generateArtifact(
  templateId: string,
  data: Record<string, unknown>,
  formats: RenderFormat[] = ['markdown', 'html', 'json'],
  outputPath?: string,
): Promise<ArtifactOutput[]> {
  const catalog = await getCatalog();
  const template = getTemplateById(catalog, templateId);

  if (!template) {
    throw new Error(`Template "${templateId}" not found in catalog`);
  }

  const outputs: ArtifactOutput[] = [];

  for (const format of formats) {
    const rendered = renderArtifact(template, data, format);
    const ext = format === 'markdown' ? 'md' : format === 'html' ? 'html' : 'json';
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
  const outputs = await generateArtifact(templateId, data, formats, targetDir);
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
