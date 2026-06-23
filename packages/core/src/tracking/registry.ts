/**
 * Tracking Adapter Registry
 *
 * Reads project profile tracking config and resolves the correct adapter.
 * Missing tracking config defaults to local_memory.
 */

import type { TrackingAdapter, TrackingSystem, TrackingConfig, TrackingMode } from './types.js';
import { LocalMemoryAdapter } from './localMemoryAdapter.js';
import { NotionAdapter } from './notionAdapter.js';
import { ExcelAdapter } from './excelAdapter.js';

// ─── Profile reader ─────────────────────────────────────────────────────────

export interface ProfileTrackingSection {
  tracking?: TrackingConfig;
}

function extractTrackingConfig(profile: ProfileTrackingSection): TrackingConfig {
  if (!profile.tracking) {
    return { system: 'local_memory', mode: 'manual' };
  }
  return {
    system: profile.tracking.system ?? 'local_memory',
    mode: profile.tracking.mode ?? 'manual',
    database_name: profile.tracking.database_name,
    status_field: profile.tracking.status_field,
    done_status: profile.tracking.done_status,
    sync_policy: profile.tracking.sync_policy,
    local_import_files: profile.tracking.local_import_files,
  };
}

// ─── Adapter factory ────────────────────────────────────────────────────────

class UnsupportedTrackingAdapter implements TrackingAdapter {
  constructor(
    readonly adapter_id: TrackingSystem,
    readonly mode: TrackingMode,
  ) {}

  private unsupportedMessage(action: string): string {
    if (this.mode === 'live') {
      return `Tracking adapter "${this.adapter_id}" does not support live mode for ${action}`;
    }
    return `Tracking adapter "${this.adapter_id}" is not implemented for ${action}`;
  }

  async createTask(): Promise<never> {
    throw new Error(this.unsupportedMessage('createTask'));
  }

  async getTask(): Promise<null> {
    return null;
  }

  async updateStatus(): Promise<never> {
    throw new Error(this.unsupportedMessage('updateStatus'));
  }

  async attachReport(): Promise<never> {
    throw new Error(this.unsupportedMessage('attachReport'));
  }

  async addComment(): Promise<never> {
    throw new Error(this.unsupportedMessage('addComment'));
  }

  async listProjectTasks(): Promise<[]> {
    return [];
  }

  async verifyCompletion(): Promise<{ complete: false; evidence: string[] }> {
    return { complete: false, evidence: [this.unsupportedMessage('verifyCompletion')] };
  }
}

function createAdapter(
  system: TrackingSystem,
  mode: TrackingMode,
  projectRoot: string,
): TrackingAdapter {
  switch (system) {
    case 'local_memory':
      return new LocalMemoryAdapter(projectRoot);
    case 'excel':
      return new ExcelAdapter(projectRoot, mode);
    case 'notion':
      return new NotionAdapter(projectRoot, mode);
    case 'jira':
    case 'linear':
    case 'github':
      return new UnsupportedTrackingAdapter(system, mode);
    default:
      return new LocalMemoryAdapter(projectRoot);
  }
}

// ─── Public API ─────────────────────────────────────────────────────────────

/**
 * Resolve the tracking adapter for a project based on its profile.
 *
 * @param profile - The project profile (typically loaded from .ai-pm/profile.yaml)
 * @param projectRoot - The project root path
 * @returns The resolved tracking adapter
 */
export function resolveTrackingAdapter(
  profile: ProfileTrackingSection,
  projectRoot: string,
): TrackingAdapter {
  const config = extractTrackingConfig(profile);
  return createAdapter(config.system, config.mode, projectRoot);
}

/**
 * Get the tracking config from a profile, with defaults.
 */
export function getTrackingConfig(profile: ProfileTrackingSection): TrackingConfig {
  return extractTrackingConfig(profile);
}
