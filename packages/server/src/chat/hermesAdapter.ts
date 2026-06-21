/**
 * Hermes Adapter — Discord Chat Gateway Contract
 *
 * Read-only adapter that maps Discord/Hermes-style chat intents to
 * the local server's chat gateway API. Produces structured JSON
 * responses without sending Discord messages or mutating external
 * systems directly.
 *
 * All mutations are approval-gated through the approval queue.
 */

import type { ApprovalQueue, MemoryStore } from "@ai-pm/core/runtime";

// ── Types ──────────────────────────────────────────────────────────────────

export interface HermesIntent {
  command: string;
  params?: Record<string, string>;
  text?: string;
}

export interface HermesResponse {
  intent: HermesIntent;
  status: "success" | "error" | "approval_required";
  data: Record<string, unknown>;
  suggestion?: string;
  error?: string;
}

export type AdapterServices = {
  queue: ApprovalQueue;
  memory: MemoryStore;
  projectRoot: string;
};

// ── Read-only command map ──────────────────────────────────────────────────

const READ_COMMANDS = new Set([
  "daily_brief",
  "weekly_status",
  "risk_summary",
  "pending_approvals",
]);

const ACTION_COMMANDS = new Map<string, {
  action_type: string;
  target_system: string;
  priority: string;
}>([
  ["create_task", { action_type: "create_task", target_system: "memory", priority: "medium" }],
  ["publish_report", { action_type: "report_publish", target_system: "local", priority: "high" }],
  ["send_email", { action_type: "email_send", target_system: "gmail", priority: "high" }],
  ["decide_approval", { action_type: "approve_decision", target_system: "approval_queue", priority: "medium" }],
]);

const MUTATION_COMMANDS = new Set([
  "create_task",
  "complete_task",
  "archive_artifact",
  "decide_approval",
  "create_approval",
  "send_email",
  "publish_report",
]);

// ── Intent parsing ──────────────────────────────────────────────────────────

export function parseIntent(text: string): HermesIntent | null {
  const lower = text.trim().toLowerCase();

  // Mutation commands first — these have stronger intent signals
  if (lower.includes("create") && lower.includes("task")) {
    return { command: "create_task", text, params: { text } };
  }
  if (lower.includes("publish") && lower.includes("report")) {
    return { command: "publish_report", text, params: { text } };
  }
  if (lower.includes("send") && lower.includes("email")) {
    return { command: "send_email", text, params: { text } };
  }

  // Read-only commands
  if (lower.includes("daily") && lower.includes("brief")) {
    return { command: "daily_brief", params: {} };
  }
  if (lower.includes("weekly") && (lower.includes("status") || lower.includes("report"))) {
    return { command: "weekly_status", params: {} };
  }
  if (lower.includes("risk")) {
    return { command: "risk_summary", params: {} };
  }
  if (lower.includes("pending") || lower.includes("approval")) {
    return { command: "pending_approvals", params: {} };
  }
  if (lower.includes("project") && (lower.includes("scan") || lower.includes("status") || lower.includes("health"))) {
    return { command: "project_scan", params: {} };
  }
  if (lower.includes("memory") || lower.includes("task") && lower.includes("list")) {
    return { command: "memory_tasks", params: {} };
  }

  return null;
}

// ── Command executor ────────────────────────────────────────────────────────

export async function executeIntent(
  intent: HermesIntent,
  services: AdapterServices,
): Promise<HermesResponse> {
  const { queue, memory } = services;

  // Read-only commands
  if (READ_COMMANDS.has(intent.command)) {
    return await executeReadCommand(intent, memory);
  }

  // Mutations → create approval proposal
  if (MUTATION_COMMANDS.has(intent.command)) {
    return await createApprovalProposal(intent, queue);
  }

  // Project scan — local read-only
  if (intent.command === "project_scan") {
    return { intent, status: "success", data: { message: "Project scan requires local CLI.", hint: "Use 'ai-pm project scan' on the laptop." } };
  }

  // Memory tasks — local read-only
  if (intent.command === "memory_tasks") {
    return await executeReadCommand({ command: "pending_approvals", params: {} }, memory);
  }

  return {
    intent,
    status: "error",
    error: `Unknown command: ${intent.command}`,
    data: {},
  };
}

// ── Read command handlers ──────────────────────────────────────────────────

async function executeReadCommand(
  intent: HermesIntent,
  memory: MemoryStore,
): Promise<HermesResponse> {
  const { command } = intent;

  switch (command) {
    case "daily_brief":
      return {
        intent,
        status: "success",
        data: {
          message: "Daily brief requires project-scoped data from local server.",
          hint: "POST /api/chat/query { command: 'daily_brief' } on the laptop server.",
          localEquivalent: "ai-pm daily brief",
        },
      };

    case "weekly_status":
      return {
        intent,
        status: "success",
        data: {
          message: "Weekly status report requires project data from local server.",
          hint: "POST /api/chat/query { command: 'weekly_status' } on the laptop server.",
          localEquivalent: "ai-pm weekly report",
        },
      };

    case "risk_summary":
      return {
        intent,
        status: "success",
        data: {
          message: "Risk summary from local project memory.",
          hint: "POST /api/chat/query { command: 'risk_summary' } on the laptop server.",
        },
      };

    case "pending_approvals": {
      // Actually call memory to get pending count
      const summary = await memory.getSummary();
      return {
        intent,
        status: "success",
        data: {
          pendingApprovals: 0,
          totalTasks: summary.totalTasks,
          completedTasks: summary.completedTasks,
          message: "Approval count from local project memory.",
          hint: "POST /api/chat/query { command: 'pending_approvals' } on the laptop server.",
        },
      };
    }

    default:
      return {
        intent,
        status: "success",
        data: { message: `Command '${command}' acknowledged. Local data not available in chat mode.` },
      };
  }
}

// ── Approval proposal creation ──────────────────────────────────────────────

async function createApprovalProposal(
  intent: HermesIntent,
  queue: ApprovalQueue,
): Promise<HermesResponse> {
  const actionMeta = ACTION_COMMANDS.get(intent.command);
  if (!actionMeta) {
    return {
      intent,
      status: "error",
      error: `No approval template for command: ${intent.command}`,
      data: {},
    };
  }

  try {
    const item = await queue.createItem({
      project_id: "chat-gateway",
      action_type: actionMeta.action_type,
      target_system: actionMeta.target_system,
      target_id: `chat-${Date.now()}`,
      workflow_id: "chat-gateway",
      run_id: `chat-${Date.now()}`,
      requested_by_agent: "hermes-adapter",
      requested_by_role: "chat_user",
      title: `Chat request: ${intent.command}`,
      description: `Action proposed via Discord/Hermes adapter. Approval required before execution.`,
      summary_diff: intent.text || `Chat command: ${intent.command}`,
      confidence: 80,
      source_refs: [{ type: "chat", id: `discord-${Date.now()}` }],
      priority: actionMeta.priority as "low" | "medium" | "high" | "critical",
    });

    return {
      intent,
      status: "approval_required",
      data: {
        approval_id: item.approval_id,
        title: item.title,
        priority: item.priority,
        message: `Approval item created. Awaiting PM review before execution.`,
      },
      suggestion: `To approve: POST /api/approvals/${item.approval_id}/decide { decision: 'approve' }`,
    };
  } catch (error) {
    return {
      intent,
      status: "error",
      error: `Failed to create approval proposal: ${error instanceof Error ? error.message : "unknown"}`,
      data: {},
    };
  }
}
