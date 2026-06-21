/**
 * Read-only Chat Gateway API.
 *
 * Provides structured JSON endpoints that a Hermes/OpenClaw-style chat adapter
 * can call for PM queries. No outbound chat messages — returns JSON only.
 *
 * Design principles:
 * - All endpoints are read-only. Mutations are rejected with approval_required: true.
 * - Project root comes from server config (PROJECT_ROOT env or cwd).
 * - Degrades gracefully when data is missing.
 */

import { type IncomingMessage, type ServerResponse } from "node:http";
import { ApprovalQueue, MemoryStore } from "@ai-pm/core/runtime";
import { readJSON, json, err } from "../helpers.js";

// ── Types ──────────────────────────────────────────────────────────────────

type Services = {
  queue: ApprovalQueue;
  memory: MemoryStore;
};

type ChatRoute = {
  method: string;
  pattern: RegExp;
  keys: string[];
  handler: (
    req: IncomingMessage,
    res: ServerResponse,
    params: Record<string, string>,
    services: Services,
  ) => Promise<void>;
};

function chatRoute(
  method: string,
  pattern: string,
  handler: ChatRoute["handler"],
): ChatRoute {
  const keys: string[] = [];
  const re = new RegExp(
    "^" +
      pattern.replace(/:(\w+)/g, (_, k: string) => {
        keys.push(k);
        return "([^/]+)";
      }) +
      "$",
  );
  return { method, pattern: re, keys, handler };
}

// ── Command registry ────────────────────────────────────────────────────────

interface CommandMeta {
  id: string;
  name: string;
  description: string;
  read_only: true;
  parameters: Array<{
    name: string;
    type: string;
    required: boolean;
    description: string;
  }>;
}

const COMMANDS: CommandMeta[] = [
  {
    id: "daily_brief",
    name: "Daily Brief",
    description:
      "Summarize today's priorities, blockers, approvals, and upcoming meetings.",
    read_only: true,
    parameters: [
      {
        name: "date",
        type: "string",
        required: false,
        description: "ISO date string (default: today)",
      },
    ],
  },
  {
    id: "weekly_status",
    name: "Weekly Status",
    description:
      "Summarize the past week: completed tasks, new artifacts, approval outcomes.",
    read_only: true,
    parameters: [
      {
        name: "date",
        type: "string",
        required: false,
        description: "ISO date string (default: end of this week)",
      },
    ],
  },
  {
    id: "risk_summary",
    name: "Risk Summary",
    description:
      "List tasks in failed or blocked state and stale artifacts as risk indicators.",
    read_only: true,
    parameters: [],
  },
  {
    id: "pending_approvals",
    name: "Pending Approvals",
    description: "List approval items awaiting a human decision.",
    read_only: true,
    parameters: [],
  },
];

const MUTATION_COMMANDS = new Set([
  "create_task",
  "complete_task",
  "archive_artifact",
  "decide_approval",
  "create_approval",
  "send_email",
  "publish_report",
]);

// ── Command executors (read-only) ──────────────────────────────────────────

async function execDailyBrief(
  services: Services,
  params: Record<string, string>,
): Promise<Record<string, unknown>> {
  const { memory, queue } = services;
  const today = params.date || new Date().toISOString().slice(0, 10);

  const [summary, pendingApprovals, tasks] = await Promise.all([
    memory.getSummary(),
    queue.listItems({ status: "pending" }),
    memory.listTasks(),
  ]);

  const todayTasks = tasks.filter(
    (t) => t.created_at.slice(0, 10) === today || t.updated_at.slice(0, 10) === today,
  );

  return {
    command: "daily_brief",
    date: today,
    project_summary: summary,
    pending_approvals: pendingApprovals.map((a) => ({
      approval_id: a.approval_id,
      title: a.title,
      priority: a.priority,
      target_system: a.target_system,
      created_at: a.created_at,
    })),
    today_activity: {
      tasks_updated: todayTasks.length,
      pending_tasks: tasks.filter((t) => t.status === "pending").length,
      completed_tasks: tasks.filter((t) => t.status === "completed").length,
    },
    assumptions: [
      "Data from local project memory and approval queue.",
      "No external MCP data included.",
    ],
  };
}

async function execWeeklyStatus(
  services: Services,
  params: Record<string, string>,
): Promise<Record<string, unknown>> {
  const { memory, queue } = services;
  const endDate = params.date || new Date().toISOString().slice(0, 10);
  const startDate = new Date(
    new Date(endDate).getTime() - 7 * 24 * 60 * 60 * 1000,
  )
    .toISOString()
    .slice(0, 10);

  const [summary, allApprovals, tasks] = await Promise.all([
    memory.getSummary(),
    queue.listItems(),
    memory.listTasks(),
  ]);

  const weekTasks = tasks.filter(
    (t) => t.updated_at.slice(0, 10) >= startDate,
  );
  const weekApprovals = allApprovals.filter(
    (a) => a.created_at.slice(0, 10) >= startDate,
  );

  return {
    command: "weekly_status",
    period: { from: startDate, to: endDate },
    project_summary: summary,
    approvals_summary: {
      total: weekApprovals.length,
      approved: weekApprovals.filter((a) => a.status === "approved").length,
      rejected: weekApprovals.filter((a) => a.status === "rejected").length,
      pending: weekApprovals.filter((a) => a.status === "pending").length,
    },
    tasks_summary: {
      total_updated: weekTasks.length,
      completed: weekTasks.filter((t) => t.status === "completed").length,
      failed: weekTasks.filter((t) => t.status === "failed").length,
    },
    assumptions: [
      "Data from local project memory and approval queue.",
      "No external MCP data included.",
    ],
  };
}

async function execRiskSummary(
  services: Services,
): Promise<Record<string, unknown>> {
  const { memory } = services;

  const [tasks, staleArtifacts, summary] = await Promise.all([
    memory.listTasks(),
    memory.getStaleArtifacts(30),
    memory.getSummary(),
  ]);

  const failedTasks = tasks.filter((t) => t.status === "failed");
  const inProgressTasks = tasks.filter((t) => t.status === "in_progress");

  return {
    command: "risk_summary",
    risk_signals: {
      failed_tasks: failedTasks.map((t) => ({
        task_id: t.task_id,
        name: t.name,
        assigned_to: t.assigned_to,
        updated_at: t.updated_at,
      })),
      stale_artifacts: staleArtifacts.map((a) => ({
        artifact_id: a.artifact_id,
        name: a.name,
        type: a.type,
        updated_at: a.updated_at,
      })),
      total_tasks: summary.totalTasks,
      completed_tasks: summary.completedTasks,
      stale_artifact_count: staleArtifacts.length,
    },
    assumptions: [
      "Stale threshold: 30 days since last update.",
      "Failed tasks are flagged as high risk.",
    ],
  };
}

async function execPendingApprovals(
  services: Services,
): Promise<Record<string, unknown>> {
  const { queue } = services;
  const pending = await queue.listItems({ status: "pending" });

  return {
    command: "pending_approvals",
    count: pending.length,
    items: pending.map((a) => ({
      approval_id: a.approval_id,
      title: a.title,
      description: a.description,
      priority: a.priority,
      target_system: a.target_system,
      target_id: a.target_id,
      requested_by_role: a.requested_by_role,
      confidence: a.confidence,
      created_at: a.created_at,
      deadline: a.deadline,
    })),
    assumptions: [
      "Only pending items shown. Approved/rejected items not included.",
    ],
  };
}

const READ_EXECUTORS: Record<
  string,
  (
    services: Services,
    params: Record<string, string>,
  ) => Promise<Record<string, unknown>>
> = {
  daily_brief: execDailyBrief,
  weekly_status: execWeeklyStatus,
  risk_summary: execRiskSummary,
  pending_approvals: execPendingApprovals,
};

// ── Routes ──────────────────────────────────────────────────────────────────

const GET_COMMANDS = chatRoute(
  "GET",
  "/api/chat/commands",
  async (_req, res, _params, _services) => {
    json(res, {
      commands: COMMANDS,
      total: COMMANDS.length,
    });
  },
);

const POST_QUERY = chatRoute(
  "POST",
  "/api/chat/query",
  async (req, res, _params, services) => {
    let body: Record<string, unknown>;
    try {
      body = await readJSON(req);
    } catch {
      err(res, 400, "Invalid JSON in request body");
      return;
    }

    const commandId = body.command as string | undefined;
    if (!commandId || typeof commandId !== "string") {
      err(res, 400, "Missing required field: command");
      return;
    }

    // Reject mutation commands
    if (MUTATION_COMMANDS.has(commandId)) {
      json(
        res,
        {
          command: commandId,
          approval_required: true,
          error: `Command '${commandId}' is a mutation. Approval required via /api/approvals.`,
          suggestion:
            "Create an approval item first, then execute after human approval.",
        },
        403,
      );
      return;
    }

    // Find the executor
    const executor = READ_EXECUTORS[commandId];
    if (!executor) {
      const validIds = [
        ...Object.keys(READ_EXECUTORS),
        ...MUTATION_COMMANDS,
      ].sort();
      err(
        res,
        404,
        `Unknown command '${commandId}'. Available: ${validIds.join(", ")}`,
      );
      return;
    }

    // Execute
    const params = (body.params as Record<string, string>) ?? {};
    try {
      const result = await executor(services, params);
      json(res, result);
    } catch (e: unknown) {
      err(
        res,
        500,
        `Command '${commandId}' failed: ${e instanceof Error ? e.message : "unknown error"}`,
      );
    }
  },
);

export const chatGatewayRoutes: ChatRoute[] = [GET_COMMANDS, POST_QUERY];

// Re-export for tests
export { COMMANDS, MUTATION_COMMANDS, READ_EXECUTORS };
