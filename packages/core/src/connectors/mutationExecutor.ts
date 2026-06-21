// Approved External Mutation Queue — execution skeleton that runs only when approval is granted

export type MutationStatus = 'pending' | 'executing' | 'completed' | 'failed';

export interface MutationInput {
  approval_id: string;
  connector: string;
  action: string;
  payload: Record<string, unknown>;
  dry_run?: boolean;
}

export interface MutationResult {
  mutation_id: string;
  approval_id: string;
  connector: string;
  action: string;
  status: MutationStatus;
  dry_run: boolean;
  result?: Record<string, unknown>;
  error?: string;
  executed_at: string;
}

// ── Connector registry (static) ──────────────────────────────────────────────

interface ConnectorAdapter {
  name: string;
  supported_actions: string[];
  execute: (action: string, payload: Record<string, unknown>, dryRun: boolean) => Promise<Record<string, unknown>>;
}

const connectorRegistry = new Map<string, ConnectorAdapter>();

export function registerConnector(adapter: ConnectorAdapter): void {
  connectorRegistry.set(adapter.name, adapter);
}

export function getConnector(name: string): ConnectorAdapter | undefined {
  return connectorRegistry.get(name);
}

export function listConnectors(): string[] {
  return [...connectorRegistry.keys()];
}

// ── Execution ────────────────────────────────────────────────────────────────

let _mutationCounter = 0;
function nextMutationId(): string {
  return `MUT-${String(++_mutationCounter).padStart(6, '0')}`;
}

export async function executeMutation(input: MutationInput): Promise<MutationResult> {
  const mutationId = nextMutationId();
  const now = new Date().toISOString();

  const adapter = connectorRegistry.get(input.connector);
  if (!adapter) {
    return {
      mutation_id: mutationId,
      approval_id: input.approval_id,
      connector: input.connector,
      action: input.action,
      status: 'failed',
      dry_run: input.dry_run ?? true,
      error: `Connector "${input.connector}" not registered`,
      executed_at: now,
    };
  }

  if (!adapter.supported_actions.includes(input.action)) {
    return {
      mutation_id: mutationId,
      approval_id: input.approval_id,
      connector: input.connector,
      action: input.action,
      status: 'failed',
      dry_run: input.dry_run ?? true,
      error: `Action "${input.action}" not supported by connector "${input.connector}"`,
      executed_at: now,
    };
  }

  try {
    const dryRun = input.dry_run ?? true;
    const result = await adapter.execute(input.action, input.payload, dryRun);
    return {
      mutation_id: mutationId,
      approval_id: input.approval_id,
      connector: input.connector,
      action: input.action,
      status: 'completed',
      dry_run: dryRun,
      result,
      executed_at: now,
    };
  } catch (e: unknown) {
    return {
      mutation_id: mutationId,
      approval_id: input.approval_id,
      connector: input.connector,
      action: input.action,
      status: 'failed',
      dry_run: input.dry_run ?? true,
      error: e instanceof Error ? e.message : String(e),
      executed_at: now,
    };
  }
}
