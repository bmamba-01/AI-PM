/**
 * Chat Gateway API.
 *
 * Provides structured JSON endpoints that a Hermes/OpenClaw-style chat adapter
 * can call for PM queries and action proposals.
 *
 * Design principles:
 * - Query endpoints are read-only. Mutations are rejected with approval_required: true.
 * - Action proposals return structured JSON with no side effects. External mutations
 *   create only an approval proposal or return approval_required: true.
 * - Command history is persisted locally for audit and replay.
 * - Project root comes from server config (PROJECT_ROOT env or cwd).
 * - Degrades gracefully when data is missing.
 */

import { readFile, writeFile, mkdir, unlink } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { type IncomingMessage, type ServerResponse } from "node:http";
import { ApprovalQueue, MemoryStore } from "@ai-pm/core/runtime";
import { readJSON, json, err } from "../helpers.js";

// ── Types ──────────────────────────────────────────────────────────────────

type Services = {
  queue: ApprovalQueue;
  memory: MemoryStore;
  projectRoot: string;
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

// ── Command history persistence ─────────────────────────────────────────────

interface HistoryRecord {
  id: string;
  type: "query" | "action";
  command: string;
  params: Record<string, unknown>;
  status: "success" | "error" | "approval_required" | "rejected";
  result_summary: string;
  timestamp: string;
}

const HISTORY_MAX_RECORDS = 500; // prune when file exceeds this many lines

async function historyFilePath(projectRoot: string): Promise<string> {
  const dir = path.join(projectRoot, ".ai-pm", "chat");
  await mkdir(dir, { recursive: true });
  return path.join(dir, "history.jsonl");
}

async function appendHistory(projectRoot: string, record: HistoryRecord): Promise<void> {
  try {
    const filePath = await historyFilePath(projectRoot);
    await writeFile(filePath, JSON.stringify(record) + "\n", { flag: "a" });
    // Prune if file has grown too large
    await pruneHistoryIfNeeded(projectRoot, filePath);
  } catch {
    // Best-effort: do not fail the request if history write fails
  }
}

async function pruneHistoryIfNeeded(projectRoot: string, filePath: string): Promise<void> {
  try {
    const raw = await readFile(filePath, "utf-8");
    const lines = raw.trim().split("\n").filter(Boolean);
    if (lines.length <= HISTORY_MAX_RECORDS) return;

    // Keep only the most recent records
    const kept = lines.slice(-HISTORY_MAX_RECORDS);
    await writeFile(filePath, kept.join("\n") + "\n");
  } catch {
    // Best-effort pruning
  }
}

async function readHistory(projectRoot: string, limit = 50): Promise<HistoryRecord[]> {
  try {
    const filePath = await historyFilePath(projectRoot);
    const raw = await readFile(filePath, "utf-8");
    const lines = raw.trim().split("\n").filter(Boolean);
    const records: HistoryRecord[] = [];
    for (const line of lines.slice(-limit)) {
      try {
        records.push(JSON.parse(line));
      } catch { /* skip malformed */ }
    }
    return records.reverse(); // most recent first
  } catch {
    return [];
  }
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

// ── Action registry (approval-safe proposals) ──────────────────────────────

interface ActionMeta {
  id: string;
  name: string;
  description: string;
  approval_required: true;
  side_effects: string[];
  parameters: Array<{
    name: string;
    type: string;
    required: boolean;
    description: string;
  }>;
}

const ACTION_DEFS: ActionMeta[] = [
  {
    id: "draft_weekly_report",
    name: "Draft Weekly Report",
    description:
      "Generate a draft weekly report from local project data. Returns the draft without publishing.",
    approval_required: true,
    side_effects: [],
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
    id: "create_traceability_matrix",
    name: "Create Traceability Matrix",
    description:
      "Generate a traceability matrix mapping requirements to tasks and artifacts. Returns the matrix without publishing.",
    approval_required: true,
    side_effects: [],
    parameters: [],
  },
  {
    id: "run_code_quality_review",
    name: "Run Code Quality Review",
    description:
      "Run a code quality review against local project files. Returns findings without modifying anything.",
    approval_required: true,
    side_effects: [],
    parameters: [],
  },
  {
    id: "request_publication_approval",
    name: "Request Publication Approval",
    description:
      "Create an approval request for publishing a report or document externally. Returns the approval item without executing.",
    approval_required: true,
    side_effects: [],
    parameters: [
      {
        name: "title",
        type: "string",
        required: true,
        description: "Title of the publication request",
      },
      {
        name: "target_system",
        type: "string",
        required: false,
        description: "Target system (default: gmail)",
      },
    ],
  },
];

// ── Action executors (approval-safe, no side effects) ──────────────────────

async function execActionDraftWeeklyReport(
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

  const completedTasks = tasks.filter((t) => t.status === "completed");
  const pendingTasks = tasks.filter((t) => t.status === "pending");
  const failedTasks = tasks.filter((t) => t.status === "failed");

  return {
    action: "draft_weekly_report",
    approval_required: true,
    side_effects: [],
    draft: {
      title: `Weekly Status Report — ${startDate} to ${endDate}`,
      period: { from: startDate, to: endDate },
      project_summary: summary,
      completed_this_week: weekTasks.filter((t) => t.status === "completed").length,
      total_completed: completedTasks.length,
      total_pending: pendingTasks.length,
      total_failed: failedTasks.length,
      approvals_this_week: {
        total: weekApprovals.length,
        approved: weekApprovals.filter((a) => a.status === "approved").length,
        rejected: weekApprovals.filter((a) => a.status === "rejected").length,
        pending: weekApprovals.filter((a) => a.status === "pending").length,
      },
    },
    suggested_approval: {
      title: `Publish weekly report: ${startDate} to ${endDate}`,
      action_type: "report_publish",
      target_system: "gmail",
      priority: "high",
    },
    assumptions: [
      "Draft generated from local project memory and approval queue.",
      "No external MCP data included.",
      "Draft is not published — approval required first.",
    ],
  };
}

async function execActionCreateTraceabilityMatrix(
  services: Services,
): Promise<Record<string, unknown>> {
  const { memory } = services;
  const [tasks, artifacts] = await Promise.all([
    memory.listTasks(),
    memory.listArtifacts(),
  ]);

  const matrix = tasks.map((t) => ({
    task_id: t.task_id,
    task_name: t.name,
    status: t.status,
    assigned_to: t.assigned_to,
    linked_artifacts: artifacts.filter((a) => t.artifacts.includes(a.artifact_id)).map((a) => ({
      artifact_id: a.artifact_id,
      name: a.name,
      type: a.type,
      status: a.status,
    })),
    tags: t.tags,
  }));

  return {
    action: "create_traceability_matrix",
    approval_required: true,
    side_effects: [],
    matrix,
    summary: {
      total_tasks: tasks.length,
      tasks_with_artifacts: matrix.filter((m) => m.linked_artifacts.length > 0).length,
      tasks_without_artifacts: matrix.filter((m) => m.linked_artifacts.length === 0).length,
      total_artifacts: artifacts.length,
      archived_artifacts: artifacts.filter((a) => a.status === "archived").length,
    },
    assumptions: [
      "Matrix built from local project memory.",
      "No external requirement sources included.",
      "Matrix is not saved — approval required first.",
    ],
  };
}

async function execActionRunCodeQualityReview(
  services: Services,
): Promise<Record<string, unknown>> {
  const { memory } = services;
  const [tasks, artifacts, summary] = await Promise.all([
    memory.listTasks(),
    memory.listArtifacts(),
    memory.getSummary(),
  ]);

  const codeArtifacts = artifacts.filter(
    (a) => a.type === "code" || a.type === "schema" || a.name.endsWith(".ts") || a.name.endsWith(".js"),
  );
  const staleCode = codeArtifacts.filter((a) => {
    const updated = new Date(a.updated_at).getTime();
    const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
    return updated < cutoff;
  });

  const failedTasks = tasks.filter((t) => t.status === "failed");

  const findings = [
    ...staleCode.map((a) => ({
      severity: "warning",
      type: "stale_code",
      artifact_id: a.artifact_id,
      name: a.name,
      message: `Code artifact "${a.name}" has not been updated in over 30 days.`,
    })),
    ...failedTasks.map((t) => ({
      severity: "error",
      type: "failed_task",
      task_id: t.task_id,
      name: t.name,
      message: `Task "${t.name}" is in failed state and may indicate code quality issues.`,
    })),
  ];

  return {
    action: "run_code_quality_review",
    approval_required: true,
    side_effects: [],
    findings,
    summary: {
      total_code_artifacts: codeArtifacts.length,
      stale_code_artifacts: staleCode.length,
      failed_tasks: failedTasks.length,
      total_findings: findings.length,
      confidence: findings.length === 0 ? 100 : Math.max(0, 100 - findings.length * 10),
    },
    assumptions: [
      "Review based on local project artifacts and task status.",
      "No external CI/lint/test data included.",
      "Review is not saved — approval required first.",
    ],
  };
}

async function execActionRequestPublicationApproval(
  services: Services,
  params: Record<string, string>,
): Promise<Record<string, unknown>> {
  const title = params.title;
  if (!title) {
    return {
      action: "request_publication_approval",
      approval_required: true,
      side_effects: [],
      error: "Missing required parameter: title",
    };
  }

  const targetSystem = params.target_system || "gmail";

  return {
    action: "request_publication_approval",
    approval_required: true,
    side_effects: [],
    proposed_approval: {
      title,
      action_type: "report_publish",
      target_system: targetSystem,
      target_id: `pub-${randomUUID().slice(0, 8)}`,
      priority: "high",
      description: `Publication request via chat gateway: ${title}`,
      summary_diff: `Chat adapter requested publication to ${targetSystem}.`,
      confidence: 100,
      source_refs: [],
    },
    instructions:
      "To execute this publication, create an approval item via POST /api/approvals using the proposed_approval fields, then wait for human approval.",
    assumptions: [
      "No external systems were touched.",
      "Approval item has not been created yet.",
    ],
  };
}

const ACTION_EXECUTORS: Record<
  string,
  (
    services: Services,
    params: Record<string, string>,
  ) => Promise<Record<string, unknown>>
> = {
  draft_weekly_report: execActionDraftWeeklyReport,
  create_traceability_matrix: execActionCreateTraceabilityMatrix,
  run_code_quality_review: execActionRunCodeQualityReview,
  request_publication_approval: execActionRequestPublicationApproval,
};

// ── Read command executors ──────────────────────────────────────────────────

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

const GET_HISTORY = chatRoute(
  "GET",
  "/api/chat/history",
  async (req, res, _params, services) => {
    const url = new URL(req.url!, `http://${req.headers.host}`);
    const limit = parseInt(url.searchParams.get("limit") ?? "50", 10);
    const history = await readHistory(services.projectRoot, limit);
    json(res, {
      records: history,
      total: history.length,
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
      const record: HistoryRecord = {
        id: randomUUID(),
        type: "query",
        command: commandId,
        params: (body.params as Record<string, unknown>) ?? {},
        status: "rejected",
        result_summary: `Mutation '${commandId}' rejected: approval_required`,
        timestamp: new Date().toISOString(),
      };
      await appendHistory(services.projectRoot, record);

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

      const record: HistoryRecord = {
        id: randomUUID(),
        type: "query",
        command: commandId,
        params: body.params as Record<string, unknown> ?? {},
        status: "success",
        result_summary: `Query '${commandId}' executed successfully`,
        timestamp: new Date().toISOString(),
      };
      await appendHistory(services.projectRoot, record);

      json(res, result);
    } catch (e: unknown) {
      const record: HistoryRecord = {
        id: randomUUID(),
        type: "query",
        command: commandId,
        params: body.params as Record<string, unknown> ?? {},
        status: "error",
        result_summary: e instanceof Error ? e.message : "unknown error",
        timestamp: new Date().toISOString(),
      };
      await appendHistory(services.projectRoot, record);

      err(
        res,
        500,
        `Command '${commandId}' failed: ${e instanceof Error ? e.message : "unknown error"}`,
      );
    }
  },
);

const POST_ACTION = chatRoute(
  "POST",
  "/api/chat/action",
  async (req, res, _params, services) => {
    let body: Record<string, unknown>;
    try {
      body = await readJSON(req);
    } catch {
      err(res, 400, "Invalid JSON in request body");
      return;
    }

    const actionId = body.action as string | undefined;
    if (!actionId || typeof actionId !== "string") {
      err(res, 400, "Missing required field: action");
      return;
    }

    // Find the action executor
    const executor = ACTION_EXECUTORS[actionId];
    if (!executor) {
      const validIds = Object.keys(ACTION_EXECUTORS).sort();
      err(
        res,
        404,
        `Unknown action '${actionId}'. Available: ${validIds.join(", ")}`,
      );
      return;
    }

    // Execute the action proposal
    const params = (body.params as Record<string, string>) ?? {};
    try {
      const result = await executor(services, params);

      // Record in history
      const record: HistoryRecord = {
        id: randomUUID(),
        type: "action",
        command: actionId,
        params: body.params as Record<string, unknown> ?? {},
        status: "approval_required",
        result_summary: `Action '${actionId}' proposed — approval required`,
        timestamp: new Date().toISOString(),
      };
      await appendHistory(services.projectRoot, record);

      json(res, result);
    } catch (e: unknown) {
      const record: HistoryRecord = {
        id: randomUUID(),
        type: "action",
        command: actionId,
        params: body.params as Record<string, unknown> ?? {},
        status: "error",
        result_summary: e instanceof Error ? e.message : "unknown error",
        timestamp: new Date().toISOString(),
      };
      await appendHistory(services.projectRoot, record);

      err(
        res,
        500,
        `Action '${actionId}' failed: ${e instanceof Error ? e.message : "unknown error"}`,
      );
    }
  },
);

export const chatGatewayRoutes: ChatRoute[] = [
  GET_COMMANDS,
  GET_HISTORY,
  POST_QUERY,
  POST_ACTION,
];

// Re-export for tests
export { COMMANDS, MUTATION_COMMANDS, READ_EXECUTORS, ACTION_DEFS, ACTION_EXECUTORS };
