/**
 * Project Profile — Runtime validation and defaults
 *
 * Validates project profile JSON against the schema.
 * Provides graceful defaults for missing fields.
 * No external calls — pure local validation.
 */

import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { VALID_TRACKING_SYSTEMS, VALID_TRACKING_MODES, type TrackingSystem, type TrackingMode, type TrackingConfig } from '../tracking/types.js';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface ProjectProfile {
  version: number;
  project: {
    project_id: string;
    name: string;
    root: string;
    description?: string;
    methodology?: string | null;
    project_type?: string | null;
    timezone?: string;
    tags?: string[];
  };
  connectors?: Record<string, { enabled?: boolean; [key: string]: unknown }>;
  artifacts?: {
    root?: string;
    reports?: string;
    templates?: string;
    notes?: string;
  };
  approval_policy?: Record<string, boolean>;
  tracking?: TrackingConfig;
}

export interface ProfileValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  profile: ProjectProfile;
}

// ─── Defaults ────────────────────────────────────────────────────────────────

export function applyProfileDefaults(profile: Partial<ProjectProfile>): ProjectProfile {
  const p = profile as ProjectProfile;
  p.version = p.version ?? 1;
  p.project = p.project ?? { project_id: 'unknown', name: 'Unknown Project', root: '.' };
  p.project.project_id = p.project.project_id || 'unknown';
  p.project.name = p.project.name || 'Unknown Project';
  p.project.root = p.project.root || '.';
  p.project.description = p.project.description ?? '';
  p.project.methodology = p.project.methodology ?? null;
  p.project.project_type = p.project.project_type ?? null;
  p.project.timezone = p.project.timezone ?? 'UTC';
  p.project.tags = p.project.tags ?? [];

  p.connectors = p.connectors ?? {};
  p.artifacts = p.artifacts ?? { root: '.', reports: 'reports', templates: 'templates', notes: 'notes' };
  p.approval_policy = p.approval_policy ?? {
    require_approval_for_email: true,
    require_approval_for_chat: true,
    require_approval_for_issue_update: true,
    require_approval_for_pr_comment: true,
    require_approval_for_report_publish: true,
    require_approval_for_scope_change: true,
    auto_approve_read_only: true,
  };

  return p;
}

// ─── Validation ──────────────────────────────────────────────────────────────

const VALID_METHODOLOGIES = ['scrum', 'kanban', 'waterfall', 'hybrid'];
const VALID_PROJECT_TYPES = ['tm', 'fixed_cost', 'maintenance', 'product'];

export function validateProfile(profile: unknown): ProfileValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!profile || typeof profile !== 'object') {
    return { valid: false, errors: ['Profile is not an object'], warnings: [], profile: applyProfileDefaults({}) };
  }

  const p = profile as Record<string, unknown>;

  // version
  if (typeof p.version !== 'number' || p.version < 1) {
    errors.push('version must be a positive integer');
  }

  // project
  if (!p.project || typeof p.project !== 'object') {
    errors.push('project is required');
  } else {
    const proj = p.project as Record<string, unknown>;
    if (!proj.project_id || typeof proj.project_id !== 'string') {
      errors.push('project.project_id is required');
    }
    if (!proj.name || typeof proj.name !== 'string') {
      errors.push('project.name is required');
    }
    if (!proj.root || typeof proj.root !== 'string') {
      errors.push('project.root is required');
    }
    if (proj.methodology !== null && proj.methodology !== undefined && proj.methodology !== '') {
      if (typeof proj.methodology !== 'string' || !VALID_METHODOLOGIES.includes(proj.methodology as string)) {
        errors.push(`project.methodology must be one of: ${VALID_METHODOLOGIES.join(', ')}`);
      }
    }
    if (proj.project_type !== null && proj.project_type !== undefined && proj.project_type !== '') {
      if (typeof proj.project_type !== 'string' || !VALID_PROJECT_TYPES.includes(proj.project_type as string)) {
        errors.push(`project.project_type must be one of: ${VALID_PROJECT_TYPES.join(', ')}`);
      }
    }
    if (proj.tags !== undefined && !Array.isArray(proj.tags)) {
      errors.push('project.tags must be an array');
    }
  }

  // connectors — optional, warn on unknown
  if (p.connectors !== undefined && typeof p.connectors === 'object') {
    const validConnectors = ['github', 'jira', 'linear', 'calendar', 'email', 'confluence', 'notion', 'slack', 'discord', 'connector_profile'];
    for (const key of Object.keys(p.connectors as Record<string, unknown>)) {
      if (!validConnectors.includes(key)) {
        warnings.push(`Unknown connector: ${key}`);
      }
    }
  }

  // approval_policy — optional
  if (p.approval_policy !== undefined && typeof p.approval_policy === 'object') {
    for (const [key, val] of Object.entries(p.approval_policy as Record<string, unknown>)) {
      if (typeof val !== 'boolean') {
        errors.push(`approval_policy.${key} must be boolean`);
      }
    }
  }

  // tracking — optional, validate system and mode
  if (p.tracking !== undefined && typeof p.tracking === 'object') {
    const tracking = p.tracking as Record<string, unknown>;
    if (tracking.system !== undefined && typeof tracking.system === 'string') {
      if (!VALID_TRACKING_SYSTEMS.includes(tracking.system as TrackingSystem)) {
        errors.push(`tracking.system must be one of: ${VALID_TRACKING_SYSTEMS.join(', ')}`);
      }
    }
    if (tracking.mode !== undefined && typeof tracking.mode === 'string') {
      if (!VALID_TRACKING_MODES.includes(tracking.mode as TrackingMode)) {
        errors.push(`tracking.mode must be one of: ${VALID_TRACKING_MODES.join(', ')}`);
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    profile: applyProfileDefaults(profile as Partial<ProjectProfile>),
  };
}

// ─── Load from file ──────────────────────────────────────────────────────────

export async function loadProfile(projectRoot: string): Promise<ProfileValidationResult> {
  const profilePath = path.join(projectRoot, '.ai-pm', 'profile.yaml');
  try {
    const raw = await readFile(profilePath, 'utf-8');
    // Simple YAML→JSON parse for flat structures
    const profile = parseSimpleYaml(raw);
    return validateProfile(profile);
  } catch {
    return {
      valid: false,
      errors: ['Profile file not found or unreadable'],
      warnings: [],
      profile: applyProfileDefaults({}),
    };
  }
}

// ─── Simple YAML parser (for profile files only) ────────────────────────────

function parseSimpleYaml(raw: string): Record<string, unknown> {
  const root: Record<string, unknown> = {};
  const stack: Array<{ indent: number; obj: Record<string, unknown> }> = [{ indent: -1, obj: root }];

  for (const line of raw.split('\n')) {
    const withoutComment = line.replace(/\s+#.*$/, '');
    const trimmed = withoutComment.trim();
    if (!trimmed || trimmed.startsWith('#') || trimmed.startsWith('- ')) continue;

    const sep = trimmed.indexOf(':');
    if (sep < 0) continue;

    const indent = withoutComment.search(/\S/);
    const key = trimmed.slice(0, sep).trim();
    const rawValue = trimmed.slice(sep + 1).trim();

    while (stack.length > 1 && indent <= stack[stack.length - 1].indent) {
      stack.pop();
    }

    const parent = stack[stack.length - 1].obj;
    if (rawValue === '') {
      const child: Record<string, unknown> = {};
      parent[key] = child;
      stack.push({ indent, obj: child });
    } else {
      parent[key] = parseValue(rawValue);
    }
  }

  return root;
}

function parseValue(val: string): unknown {
  if (val === 'null') return null;
  if (val === 'true') return true;
  if (val === 'false') return false;
  if (/^\d+$/.test(val)) return parseInt(val, 10);
  if (val.startsWith('[') && val.endsWith(']')) {
    try {
      return JSON.parse(val);
    } catch {
      return val
        .slice(1, -1)
        .split(',')
        .map(item => item.trim().replace(/^["']|["']$/g, ''))
        .filter(Boolean);
    }
  }
  // Remove quotes
  if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
    return val.slice(1, -1);
  }
  if (val === '[]') return [];
  return val;
}
