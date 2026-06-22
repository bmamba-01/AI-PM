/**
 * Tracking Adapter Registry
 *
 * Reads project profile tracking config and resolves the correct adapter.
 * Missing tracking config defaults to local_memory.
 */

import type { TrackingAdapter, TrackingSystem, TrackingConfig, TrackingMode } from './types.js';
import { LocalMemoryAdapter } from './localMemoryAdapter.js';

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

function createAdapter(
  system: TrackingSystem,
  mode: TrackingMode,
  projectRoot: string,
): TrackingAdapter {
  switch (system) {
    case 'local_memory':
    case 'excel':
    case 'notion':
    case 'jira':
    case 'linear':
    case 'github':
      // All systems currently use local_memory adapter as fallback.
      // Live adapters will be implemented when external connectors are added.
      return new LocalMemoryAdapter(projectRoot);
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
