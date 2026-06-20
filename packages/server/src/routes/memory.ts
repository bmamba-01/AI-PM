import { type IncomingMessage, type ServerResponse } from "node:http";
import { MemoryStore } from "@ai-pm/core/runtime";
import { readJSON, json, err } from "../helpers.js";

type Route = {
  method: string;
  pattern: RegExp;
  keys: string[];
  handler: (req: IncomingMessage, res: ServerResponse, params: Record<string, string>, store: MemoryStore) => Promise<void>;
};

function route(method: string, pattern: string, handler: Route["handler"]): Route {
  const keys: string[] = [];
  const re = new RegExp(
    "^" + pattern.replace(/:(\w+)/g, (_, k) => { keys.push(k); return "([^/]+)"; }) + "$",
  );
  return { method, pattern: re, keys, handler };
}

export function match(r: Route, method: string, pathname: string): Record<string, string> | null {
  if (r.method !== method) return null;
  const m = r.pattern.exec(pathname);
  if (!m) return null;
  const params: Record<string, string> = {};
  r.keys.forEach((k, i) => { params[k] = decodeURIComponent(m[i + 1]); });
  return params;
}

// ── routes ──────────────────────────────────────────────────────────────────

const GET_SUMMARY = route("GET", "/api/memory/summary", async (_req, res, _p, store) => {
  json(res, await store.getSummary());
});

const GET_TASKS = route("GET", "/api/memory/tasks", async (req, res, _p, store) => {
  const url = new URL(req.url!, `http://${req.headers.host}`);
  const status = url.searchParams.get("status");
  const tasks = await store.listTasks(status ? { status: status as "pending" | "in_progress" | "completed" | "failed" | "cancelled" } : undefined);
  json(res, { tasks, total: tasks.length });
});

const POST_TASKS = route("POST", "/api/memory/tasks", async (req, res, _p, store) => {
  const body = await readJSON(req);
  try {
    const task = await store.createTask({
      project_id: (body.project_id as string) ?? "",
      name: (body.name as string) ?? "",
      description: (body.description as string) ?? "",
      status: (body.status as string as "pending") ?? "pending",
      assigned_to: (body.assigned_to as string) ?? "",
      completed_at: null,
      dependencies: (body.dependencies as string[]) ?? [],
      artifacts: (body.artifacts as string[]) ?? [],
      tags: (body.tags as string[]) ?? [],
    });
    json(res, task, 201);
  } catch (e: unknown) {
    err(res, 400, e instanceof Error ? e.message : "create task failed");
  }
});

const GET_TASK = route("GET", "/api/memory/tasks/:id", async (_req, res, params, store) => {
  const task = await store.getTask(params.id);
  if (!task) {
    err(res, 404, `Task ${params.id} not found`);
    return;
  }
  json(res, task);
});

const PUT_TASK_COMPLETE = route("PUT", "/api/memory/tasks/:id/complete", async (_req, res, params, store) => {
  try {
    const task = await store.completeTask(params.id);
    json(res, task);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "complete task failed";
    const status = msg.includes("not found") ? 404 : 400;
    err(res, status, msg);
  }
});

const GET_ARTIFACTS = route("GET", "/api/memory/artifacts", async (req, res, _p, store) => {
  const url = new URL(req.url!, `http://${req.headers.host}`);
  const status = url.searchParams.get("status");
  const type = url.searchParams.get("type") ?? undefined;
  const filter: { status?: "draft" | "active" | "archived" | "deleted"; type?: string } = {};
  if (status) filter.status = status as "draft" | "active" | "archived" | "deleted";
  if (type) filter.type = type;
  const artifacts = await store.listArtifacts(Object.keys(filter).length > 0 ? filter : undefined);
  json(res, { artifacts, total: artifacts.length });
});

// Primary path: POST /api/memory/artifacts/:id/archive
// Backward-compat alias: POST /api/memory/artifacts/archive/:id
const POST_ARCHIVE = route("POST", "/api/memory/artifacts/:id/archive", async (req, res, params, store) => {
  let reason = "Archived via API";
  try {
    const body = await readJSON(req);
    if (body.reason && typeof body.reason === "string") reason = body.reason;
  } catch { /* empty body is fine */ }
  try {
    const artifact = await store.archiveArtifact(params.id, reason);
    json(res, artifact);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "archive failed";
    const status = msg.includes("not found") ? 404 : 400;
    err(res, status, msg);
  }
});

const POST_ARCHIVE_COMPAT = route("POST", "/api/memory/artifacts/archive/:id", async (req, res, params, store) => {
  let reason = "Archived via API";
  try {
    const body = await readJSON(req);
    if (body.reason && typeof body.reason === "string") reason = body.reason;
  } catch { /* empty body is fine */ }
  try {
    const artifact = await store.archiveArtifact(params.id, reason);
    json(res, artifact);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "archive failed";
    const status = msg.includes("not found") ? 404 : 400;
    err(res, status, msg);
  }
});

export const memoryRoutes: Route[] = [
  GET_SUMMARY,
  GET_TASKS,
  POST_TASKS,
  GET_TASK,
  PUT_TASK_COMPLETE,
  GET_ARTIFACTS,
  POST_ARCHIVE,
  POST_ARCHIVE_COMPAT,
];
