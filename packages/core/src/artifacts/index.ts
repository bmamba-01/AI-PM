export {
  loadTemplateCatalog,
  validateTemplateFamilies,
  getTemplateById,
  getTemplatesByCategory,
  getTemplatesByWorkflow,
  listTemplateFamilies,
  type TemplateEntry,
  type TemplateCatalog,
  type RegistryValidationResult,
} from './templateRegistry.js';

export {
  renderArtifact,
  type RenderFormat,
  type RenderedArtifact,
  type ArtifactMetadata,
} from './artifactRenderer.js';

export {
  getCatalog,
  validateRegistry,
  generateArtifact,
  writeArtifact,
  generateAndWrite,
  getTemplateInfo,
  type ArtifactOutput,
  type FactoryResult,
  type GenerateArtifactOptions,
  type GenerateArtifactResult,
} from './artifactFactory.js';

export {
  loadTableSchema,
  validateArtifactTable,
  listTableSchemas,
  type TableSchema,
  type TableSchemaId,
  type TableValidationResult,
  type ColumnDef,
  type ColumnType,
} from './tableSchema.js';
