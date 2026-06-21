import { access } from 'node:fs/promises';
import path from 'node:path';

export interface ScanCheck {
  id: string;
  label: string;
  path: string;
  required: boolean;
  present: boolean;
}

export interface ScanResult {
  projectRoot: string;
  score: number;
  totalRequired: number;
  passedRequired: number;
  totalOptional: number;
  passedOptional: number;
  checks: ScanCheck[];
  ready: boolean;
}

const REQUIRED_CHECKS: Omit<ScanCheck, 'present'>[] = [
  { id: 'agents-md',       label: 'AGENTS.md',           path: 'AGENTS.md',                       required: true },
  { id: 'readme-md',       label: 'README.md',           path: 'README.md',                       required: true },
  { id: 'design-spec',     label: 'Design spec',         path: 'docs/superpowers/specs',           required: true },
  { id: 'active-plan',     label: 'Active plan',         path: 'docs/superpowers/plans',           required: true },
  { id: 'workflows-dir',   label: 'Workflows',           path: 'workflows',                       required: true },
  { id: 'playbooks-dir',   label: 'Playbooks',           path: 'playbooks',                       required: true },
  { id: 'mcp-registry',    label: 'MCP registry',        path: 'mcp/registry.yaml',               required: true },
  { id: 'templates-dir',   label: 'Templates',           path: 'templates',                       required: false },
  { id: 'schemas-dir',     label: 'JSON schemas',        path: 'schemas',                         required: false },
  { id: 'operating-model', label: 'Operating model docs', path: 'docs/operating-model',            required: false },
  { id: 'claude-md',       label: 'CLAUDE.md',           path: 'CLAUDE.md',                       required: false },
  { id: 'codex-md',        label: 'CODEX.md',            path: 'CODEX.md',                        required: false },
  { id: 'requirements-dir', label: 'Requirements',       path: 'requirements',                    required: false },
  { id: 'risks-dir',       label: 'Risks',               path: 'risks',                           required: false },
  { id: 'meetings-dir',    label: 'Meetings',            path: 'meetings',                        required: false },
  { id: 'artifacts-dir',   label: 'Artifacts',           path: 'artifacts',                       required: false },
  { id: 'reports-dir',     label: 'Reports',             path: 'reports',                         required: false },
];

async function pathExists(projectRoot: string, relativePath: string): Promise<boolean> {
  try {
    await access(path.join(projectRoot, relativePath));
    return true;
  } catch {
    return false;
  }
}

export async function scanProject(projectRoot: string): Promise<ScanResult> {
  const checks: ScanCheck[] = [];

  for (const check of REQUIRED_CHECKS) {
    const present = await pathExists(projectRoot, check.path);
    checks.push({ ...check, present });
  }

  const requiredChecks = checks.filter(c => c.required);
  const optionalChecks = checks.filter(c => !c.required);
  const passedRequired = requiredChecks.filter(c => c.present).length;
  const passedOptional = optionalChecks.filter(c => c.present).length;

  const score = requiredChecks.length > 0
    ? Math.round((passedRequired / requiredChecks.length) * 100)
    : 100;

  return {
    projectRoot,
    score,
    totalRequired: requiredChecks.length,
    passedRequired,
    totalOptional: optionalChecks.length,
    passedOptional,
    checks,
    ready: passedRequired === requiredChecks.length,
  };
}
