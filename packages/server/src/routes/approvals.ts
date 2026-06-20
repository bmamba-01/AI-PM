import { type IncomingMessage, type ServerResponse } from "node:http";
import { ApprovalQueue, type DecidePayload } from "@ai-pm/core/runtime";
import { readJSON, json, err } from "../helpers.js";

export type Route = {
  method: string;
  pattern: RegExp;
  keys: string[];
  handler: (req: IncomingMessage, res: ServerResponse, params: Record<string, string>, queue: ApprovalQueue) => Promise<void>;
};

function route(method: string, pattern: string, handler: Route["handler"]): Route {
  const keys: string[] = [];
  const re = new RegExp(
    "^" + pattern.replace(/:(\w+)/g, (_, k) => { keys.push(k); return "([^/]+)"; }) + "$",
  );
  return { method, pattern: re, keys, handler };
}

function match(r: Route, method: string, pathname: string): Record<string, string> | null {
  if (r.method !== method) return null;
  const m = r.pattern.exec(pathname);
  if (!m) return null;
  const params: Record<string, string> = {};
  r.keys.forEach((k, i) => { params[k] = decodeURIComponent(m[i + 1]); });
  return params;
}

// ── routes ──────────────────────────────────────────────────────────────────

const GET_LIST = route("GET", "/api/approvals", async (_req, res, _p, queue) => {
  const url = new URL(_req.url!, `http://${_req.headers.host}`);
  const filter: { status?: string; priority?: string } = {};
  const s = url.searchParams.get("status");
  const pr = url.searchParams.get("priority");
  if (s) filter.status = s;
  if (pr) filter.priority = pr;
  const items = await queue.listItems(filter);
  json(res, items);
});

const GET_COUNTS = route("GET", "/api/approvals/counts", async (_req, res, _p, queue) => {
  json(res, await queue.getCounts());
});

const GET_COUNT = route("GET", "/api/approvals/count", async (_req, res, _p, queue) => {
  json(res, await queue.getCounts());
});

const GET_ONE = route("GET", "/api/approvals/:id", async (_req, res, params, queue) => {
  const item = await queue.getItem(params.id);
  if (!item) return err(res, 404, "Not found");
  json(res, item);
});

const POST_CREATE = route("POST", "/api/approvals", async (req, res, _p, queue) => {
  let body: Record<string, unknown>;
  try {
    body = await readJSON(req);
  } catch {
    err(res, 400, "Invalid JSON in request body");
    return;
  }
  try {
    const item = await queue.createItem(body as unknown as Parameters<typeof queue.createItem>[0]);
    json(res, item, 201);
  } catch (e: unknown) {
    err(res, 400, e instanceof Error ? e.message : "create failed");
  }
});

const POST_DECIDE = route("POST", "/api/approvals/:id/decide", async (req, res, params, queue) => {
  const body = (await readJSON(req)) as unknown as DecidePayload;
  try {
    const item = await queue.decide(params.id, body);
    json(res, item);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "decide failed";
    const status = msg.includes("not found") ? 404 : 400;
    err(res, status, msg);
  }
});

const POST_RESUBMIT = route("POST", "/api/approvals/:id/resubmit", async (req, res, params, queue) => {
  const body = (await readJSON(req)) as { summary_diff: string };
  try {
    const item = await queue.resubmit(params.id, body.summary_diff);
    json(res, item);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "resubmit failed";
    const status = msg.includes("not found") ? 404 : 400;
    err(res, status, msg);
  }
});

export const approvalRoutes: Route[] = [
  GET_LIST,
  GET_COUNTS,
  GET_COUNT,
  GET_ONE,
  POST_CREATE,
  POST_DECIDE,
  POST_RESUBMIT,
];

export { match };
