/**
 * Setup Profile — Core Setup Contract
 *
 * Defines setup modes, defaults, readiness checks, scoring, and next-command generation.
 * Consumed by CLI, desktop, mobile, and server.
 * No external calls — pure local.
 */

import { access } from 'node:fs/promises';
import path from 'node:path';

// ─── Setup Modes ─────────────────────────────────────────────────────────────

export const SETUP_MODES = ['new_project', 'adopt_existing', 'demo'] as const;
export type SetupMode = (typeof SETUP_MODES)[number];

// ─── Setup Defaults ──────────────────────────────────────────────────────────

export interface SetupDefaults {
  methodology: string;
  project_type: string;
  commercial_model: string;
  timezone: string;
  connector_profile: string;
  approval_gated: boolean;
}

export const DEFAULT_SETUP: SetupDefaults = {
  methodology: 'scrum',
  project_type: 'software',
  commercial_model: 'fixed_cost',
  timezone: 'Asia/Saigon',
  connector_profile: 'offline-local',
  approval_gated: true,
};

// ─── Readiness Check ─────────────────────────────────────────────────────────

export interface SetupReadinessCheck {
  id: string;
  label: string;
  required: boolean;
  present: boolean;
  path?: string;
}

export type SetupCategory = 'profile' | 'memory' | 'audit' | 'approvals' | 'templates' | 'mcp' | 'doctor' | 'entrypoints';

export const READINESS_CHECKS: Array<SetupReadinessCheck & { category: SetupCategory }> = [
  { id: 'profile',      label: 'Project profile (.ai-pm/profile.yaml)',   required: true,  present: false, category: 'profile' },
  { id: 'memory-state', label: 'Memory state (.ai-pm/memory/state.json)', required: true,  present: false, category: 'memory' },
  { id: 'memory-dir',   label: 'Memory directory (.ai-pm/memory/)',       required: true,  present: false, category: 'memory' },
  { id: 'audit-dir',    label: 'Audit directory (.ai-pm/audit/)',         required: true,  present: false, category: 'audit' },
  { id: 'approvals',    label: 'Approval queue (.ai-pm/approvals.json)',  required: true,  present: false, category: 'approvals' },
  { id: 'reports-dir',  label: 'Reports directory (reports/)',             required: false, present: false, category: 'templates' },
  { id: 'templates-dir',label: 'Templates directory (templates/)',         required: false, present: false, category: 'templates' },
  { id: 'mcp-registry', label: 'MCP registry (mcp/registry.yaml)',        required: false, present: false, category: 'mcp' },
  { id: 'doctor-seed',  label: 'MCP doctor seed',                         required: false, present: false, category: 'doctor' },
  { id: 'agents-md',    label: 'Agent entrypoint (AGENTS.md)',            required: true,  present: false, category: 'entrypoints' },
  { id: 'codex-md',     label: 'Codex entrypoint (CODEX.md)',             required: false, present: false, category: 'entrypoints' },
  { id: 'claude-md',    label: 'Claude entrypoint (CLAUDE.md)',           required: false, present: false, category: 'entrypoints' },
];

// ─── Readiness Result ────────────────────────────────────────────────────────

export interface SetupReadinessResult {
  mode: SetupMode;
  projectRoot: string;
  score: number;
  checks: SetupReadinessCheck[];
  blocking: string[];
  warnings: string[];
  nextCommands: string[];
}

// ─── Path Exists Helper ──────────────────────────────────────────────────────

async function pathExists(projectRoot: string, relativePath: string): Promise<boolean> {
  try {
    await access(path.join(projectRoot, relativePath));
    return true;
  } catch {
    return false;
  }
}

// ─── Check Readiness ─────────────────────────────────────────────────────────

export async function checkReadiness(projectRoot: string): Promise<SetupReadinessResult> {
  const checks: SetupReadinessCheck[] = [];

  // Profile check
  checks.push({
    id: 'profile',
    label: 'Project profile (.ai-pm/profile.yaml)',
    required: true,
    present: await pathExists(projectRoot, '.ai-pm/profile.yaml'),
  });

  // Memory checks
  checks.push({
    id: 'memory-state',
    label: 'Memory state (.ai-pm/memory/state.json)',
    required: true,
    present: await pathExists(projectRoot, '.ai-pm/memory/state.json'),
  });
  checks.push({
    id: 'memory-dir',
    label: 'Memory directory (.ai-pm/memory/)',
    required: true,
    present: await pathExists(projectRoot, '.ai-pm/memory'),
  });

  // Audit check
  checks.push({
    id: 'audit-dir',
    label: 'Audit directory (.ai-pm/audit/)',
    required: true,
    present: await pathExists(projectRoot, '.ai-pm/audit'),
  });

  // Approvals check
  checks.push({
    id: 'approvals',
    label: 'Approval queue (.ai-pm/approvals.json)',
    required: true,
    present: await pathExists(projectRoot, '.ai-pm/approvals.json'),
  });

  // Template checks
  checks.push({
    id: 'reports-dir',
    label: 'Reports directory (reports/)',
    required: false,
    present: await pathExists(projectRoot, 'reports'),
  });
  checks.push({
    id: 'templates-dir',
    label: 'Templates directory (templates/)',
    required: false,
    present: await pathExists(projectRoot, 'templates'),
  });

  // MCP check
  checks.push({
    id: 'mcp-registry',
    label: 'MCP registry (mcp/registry.yaml)',
    required: false,
    present: await pathExists(projectRoot, 'mcp/registry.yaml'),
  });

  // Doctor check
  checks.push({
    id: 'doctor-seed',
    label: 'MCP doctor seed',
    required: false,
    present: await pathExists(projectRoot, '.ai-pm/profile.yaml'),
  });

  // Entrypoint checks
  checks.push({
    id: 'agents-md',
    label: 'Agent entrypoint (AGENTS.md)',
    required: true,
    present: await pathExists(projectRoot, 'AGENTS.md'),
  });
  checks.push({
    id: 'codex-md',
    label: 'Codex entrypoint (CODEX.md)',
    required: false,
    present: await pathExists(projectRoot, 'CODEX.md'),
  });
  checks.push({
    id: 'claude-md',
    label: 'Claude entrypoint (CLAUDE.md)',
    required: false,
    present: await pathExists(projectRoot, 'CLAUDE.md'),
  });

  const required = checks.filter(c => c.required);
  const passedRequired = required.filter(c => c.present).length;
  const passedOptional = checks.filter(c => !c.required).filter(c => c.present).length;
  const totalOptional = checks.filter(c => !c.required).length;

  const score = Math.round(((passedRequired / required.length) * 80) + ((passedOptional / totalOptional) * 20));

  const blocking = required.filter(c => !c.present).map(c => c.label);
  const warnings = checks.filter(c => !c.required && !c.present).map(c => c.label);

  return {
    mode: await determineSetupMode(projectRoot),
    projectRoot,
    score,
    checks,
    blocking,
    warnings,
    nextCommands: generateNextCommands(blocking, warnings),
  };
}

// ─── Next Command Generator ──────────────────────────────────────────────────

function generateNextCommands(blocking: string[], warnings: string[]): string[] {
  const commands: string[] = [];

  if (blocking.length > 0) {
    commands.push('ai-pm setup repair --path . --json');
  }

  if (warnings.length > 0) {
    commands.push('ai-pm setup doctor --path . --json');
  }

  commands.push('ai-pm project scan --json');
  commands.push('ai-pm mcp validate --json');

  return commands;
}

// ─── Determine Setup Mode ────────────────────────────────────────────────────

export async function determineSetupMode(projectRoot: string): Promise<SetupMode> {
  const hasProfile = await pathExists(projectRoot, '.ai-pm/profile.yaml');
  if (hasProfile) return 'adopt_existing';

  const hasAnyAiPm = await pathExists(projectRoot, '.ai-pm');
  if (hasAnyAiPm) return 'adopt_existing';

  return 'new_project';
}

// ─── Summary ─────────────────────────────────────────────────────────────────

export function formatReadinessSummary(result: SetupReadinessResult): string {
  const lines: string[] = [];
  lines.push(`Setup Mode: ${result.mode}`);
  lines.push(`Readiness Score: ${result.score}%`);
  lines.push(`Checks: ${result.checks.filter(c => c.present).length}/${result.checks.length}`);
  lines.push('');

  if (result.blocking.length > 0) {
    lines.push(`BLOCKING (${result.blocking.length}):`);
    for (const item of result.blocking) {
      lines.push(`  ✗ ${item}`);
    }
  }

  if (result.warnings.length > 0) {
    lines.push(`WARNINGS (${result.warnings.length}):`);
    for (const item of result.warnings) {
      lines.push(`  ⚠ ${item}`);
    }
  }

  if (result.blocking.length === 0 && result.warnings.length === 0) {
    lines.push('✓ All checks passed');
  }

  lines.push('');
  lines.push('Next commands:');
  for (const cmd of result.nextCommands) {
    lines.push(`  ${cmd}`);
  }

  return lines.join('\n');
}
