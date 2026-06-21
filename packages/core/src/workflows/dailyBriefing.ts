import path from 'node:path';

export type DailyBriefingItemType = 'priority' | 'meeting' | 'blocker' | 'risk' | 'approval' | 'follow_up';

export type DailyBriefingPriority = 'critical' | 'high' | 'medium' | 'low';

export interface DailyBriefingInputItem {
  source: string;
  type: DailyBriefingItemType;
  title: string;
  priority?: DailyBriefingPriority;
}

export interface DailyBriefingInput {
  projectId: string;
  date: string;
  items: DailyBriefingInputItem[];
  unavailableSources?: string[];
  assumptions?: string[];
}

export interface DailyBriefing {
  projectId: string;
  date: string;
  methodology?: string;
  projectType?: string;
  topPriorities: string[];
  meetingsToPrepare: string[];
  urgentBlockers: string[];
  risksToReview: string[];
  pendingApprovals: string[];
  suggestedFollowups: string[];
  memoryTasks: { total: number; active: number; completed: number };
  memoryArtifacts: { total: number; active: number };
  connectorStatus: Record<string, 'available' | 'unavailable' | 'degraded'>;
  sourceCoverage: string[];
  degradedSources: string[];
  assumptions: string[];
  confidence: number;
}

export interface DailyBriefingContext {
  projectRoot: string;
  methodology?: string;
  projectType?: string;
}

const priorityRank: Record<DailyBriefingPriority, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
};

function titlesFor(items: DailyBriefingInputItem[], type: DailyBriefingItemType): string[] {
  return items.filter(item => item.type === type).map(item => item.title);
}

function sourceCoverage(input: DailyBriefingInput): string[] {
  const available = Array.from(new Set(input.items.map(item => item.source))).sort();
  const unavailable = (input.unavailableSources ?? []).map(source => `unavailable:${source}`);
  return [...available, ...unavailable];
}

function confidenceFor(input: DailyBriefingInput): number {
  const unavailablePenalty = (input.unavailableSources?.length ?? 0) * 10;
  const emptyPenalty = input.items.length === 0 ? 30 : 0;
  return Math.max(40, 100 - unavailablePenalty - emptyPenalty);
}

export function generateDailyBriefing(input: DailyBriefingInput): DailyBriefing {
  const sorted = [...input.items].sort((a, b) => {
    const aRank = priorityRank[a.priority ?? 'medium'];
    const bRank = priorityRank[b.priority ?? 'medium'];
    return aRank - bRank;
  });

  return {
    projectId: input.projectId,
    date: input.date,
    topPriorities: sorted
      .filter(item => item.type === 'priority' || item.type === 'blocker' || item.type === 'meeting' || item.type === 'risk')
      .slice(0, 3)
      .map(item => item.title),
    meetingsToPrepare: titlesFor(input.items, 'meeting'),
    urgentBlockers: titlesFor(input.items, 'blocker'),
    risksToReview: titlesFor(input.items, 'risk'),
    pendingApprovals: titlesFor(input.items, 'approval'),
    suggestedFollowups: titlesFor(input.items, 'follow_up'),
    memoryTasks: { total: 0, active: 0, completed: 0 },
    memoryArtifacts: { total: 0, active: 0 },
    connectorStatus: {},
    sourceCoverage: sourceCoverage(input),
    degradedSources: input.unavailableSources ?? [],
    assumptions: input.assumptions ?? [],
    confidence: confidenceFor(input),
  };
}

/**
 * Generate a contextual daily briefing by loading data from runtime stores.
 * This is the upgraded entry point that loads real project context.
 */
export async function generateContextualBriefing(
  ctx: DailyBriefingContext,
): Promise<DailyBriefing> {
  const { projectRoot, methodology, projectType } = ctx;
  const projectId = path.basename(projectRoot);
  const today = new Date().toISOString().slice(0, 10);
  const degradedSources: string[] = [];
  const assumptions: string[] = [];
  const items: DailyBriefingInputItem[] = [];
  const connectorStatus: Record<string, 'available' | 'unavailable' | 'degraded'> = {};

  // --- 1. Load MCP Context Snapshot (connector availability) ---
  try {
    const { buildContextPack } = await import('../orchestrator/contextSnapshot.js');
    const pack = await buildContextPack(projectRoot);
    for (const snap of pack.snapshot) {
      connectorStatus[snap.connectorId] = snap.enabled ? 'available' : 'unavailable';
      if (snap.health === 'degraded') {
        connectorStatus[snap.connectorId] = 'degraded';
        degradedSources.push(snap.connectorId);
      }
      if (!snap.enabled) {
        degradedSources.push(snap.connectorId);
      }
    }
    assumptions.push(`Context snapshot loaded: ${pack.snapshot.length} connectors registered.`);
  } catch (err) {
    degradedSources.push('mcp-context');
    assumptions.push('MCP context snapshot unavailable — connector status unknown.');
  }

  // --- 2. Load Approval Queue pending items ---
  let pendingApprovalCount = 0;
  try {
    const { readFile } = await import('node:fs/promises');
    const approvalPath = path.join(projectRoot, '.ai-pm', 'approvals.json');
    try {
      await readFile(approvalPath, 'utf-8');
      const { ApprovalQueue } = await import('../runtime/approvalQueue.js');
      const queue = new ApprovalQueue(projectRoot);
      const approvals = await queue.listItems({ status: 'pending' });
      pendingApprovalCount = approvals.length;
      for (const approval of approvals.slice(0, 5)) {
        items.push({
          source: 'approval-queue',
          type: 'approval',
          title: approval.title,
          priority: approval.priority === 'critical' || approval.priority === 'high'
            ? approval.priority
            : 'medium',
        });
      }
      connectorStatus['approval-queue'] = 'available';
    } catch {
      connectorStatus['approval-queue'] = 'unavailable';
      degradedSources.push('approval-queue');
    }
  } catch {
    connectorStatus['approval-queue'] = 'unavailable';
    degradedSources.push('approval-queue');
  }

  // --- 3. Load Memory Tasks and Artifacts ---
  let memoryTasks = { total: 0, active: 0, completed: 0 };
  let memoryArtifacts = { total: 0, active: 0 };
  try {
    const { readFile } = await import('node:fs/promises');
    const memPath = path.join(projectRoot, '.ai-pm', 'memory', 'state.json');
    try {
      await readFile(memPath, 'utf-8');
      const { MemoryStore } = await import('../runtime/memory.js');
      const memStore = new MemoryStore(projectRoot);
      const tasks = await memStore.listTasks();
      const activeTasks = tasks.filter(t => t.status === 'in_progress' || t.status === 'pending');
      const completedTasks = tasks.filter(t => t.status === 'completed');
      memoryTasks = { total: tasks.length, active: activeTasks.length, completed: completedTasks.length };

      for (const task of activeTasks.slice(0, 3)) {
        items.push({
          source: 'memory-store',
          type: 'priority',
          title: task.name,
          priority: task.status === 'in_progress' ? 'high' : 'medium',
        });
      }

      const artifacts = await memStore.listArtifacts();
      memoryArtifacts = {
        total: artifacts.length,
        active: artifacts.filter(a => a.status === 'active').length,
      };
      connectorStatus['memory-store'] = 'available';
    } catch {
      connectorStatus['memory-store'] = 'unavailable';
      degradedSources.push('memory-store');
    }
  } catch {
    connectorStatus['memory-store'] = 'unavailable';
    degradedSources.push('memory-store');
  }

  // --- 4. Load Risk Register Items ---
  let riskCount = 0;
  if (connectorStatus['memory-store'] === 'available') {
    try {
      const { listProjectRisks } = await import('./riskControl.js');
      const { MemoryStore } = await import('../runtime/memory.js');
      const memStore = new MemoryStore(projectRoot);
      const risks = await listProjectRisks({ store: memStore });
      const openRisks = risks.filter(r => r.status === 'open' || r.status === 'mitigating');
      riskCount = openRisks.length;

      for (const risk of openRisks.slice(0, 3)) {
        items.push({
          source: 'risk-register',
          type: 'risk',
          title: risk.title,
          priority: risk.impact === 'critical' || risk.probability === 'high'
            ? 'high'
            : 'medium',
        });
      }
      connectorStatus['risk-register'] = 'available';
    } catch {
      connectorStatus['risk-register'] = 'unavailable';
      degradedSources.push('risk-register');
    }
  } else {
    connectorStatus['risk-register'] = 'unavailable';
    degradedSources.push('risk-register');
  }

  // --- 5. Load local daily-items.json (existing behavior) ---
  try {
    const { LocalProjectStore } = await import('../runtime/localProjectStore.js');
    const store = new LocalProjectStore(projectRoot);
    const localItems = await store.loadDailyBriefingItems();
    if (localItems.length > 0) {
      items.push(...localItems);
      connectorStatus['daily-items-json'] = 'available';
    }
  } catch (err) {
    degradedSources.push('daily-items-json');
  }

  // --- 6. Build final output ---
  const availableCount = Object.values(connectorStatus).filter(s => s === 'available').length;
  const totalConnectors = Object.keys(connectorStatus).length;
  const allSources = Array.from(new Set(items.map(i => i.source))).sort();

  const enrichedInput: DailyBriefingInput = {
    projectId,
    date: today,
    items,
    unavailableSources: degradedSources,
    assumptions,
  };

  const briefing = generateDailyBriefing(enrichedInput);

  // Enrich with context-specific fields
  briefing.methodology = methodology;
  briefing.projectType = projectType;
  briefing.memoryTasks = memoryTasks;
  briefing.memoryArtifacts = memoryArtifacts;
  briefing.connectorStatus = connectorStatus;
  briefing.degradedSources = [...new Set(degradedSources)];
  briefing.sourceCoverage = [...allSources, ...degradedSources.map(s => `unavailable:${s}`)];

  // Recalculate confidence based on actual source availability
  if (totalConnectors > 0) {
    const availabilityRatio = availableCount / totalConnectors;
    briefing.confidence = Math.round(
      briefing.confidence * 0.5 + availabilityRatio * 50,
    );
  }

  if (assumptions.length > 0) {
    briefing.assumptions.push(...assumptions);
  }

  return briefing;
}

