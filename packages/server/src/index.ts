import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { ApprovalQueue, MemoryStore } from "@ai-pm/core/runtime";
import { approvalRoutes } from "./routes/approvals.js";
import { memoryRoutes } from "./routes/memory.js";
import { chatGatewayRoutes } from "./routes/chatGateway.js";
import { json, err } from "./helpers.js";

const PORT = Number(process.env.PORT ?? 3847);
const HOST = process.env.HOST ?? "127.0.0.1";
const PROJECT_ROOT = process.env.PROJECT_ROOT ?? process.cwd();
const AUTH_TOKEN = process.env.AI_PM_AUTH_TOKEN || null;

const queue = new ApprovalQueue(PROJECT_ROOT);
const memory = new MemoryStore(PROJECT_ROOT);

// ── CORS ────────────────────────────────────────────────────────────────────

const ALLOWED_ORIGINS = [
  "http://localhost:3847",
  "http://localhost:3848",
  "http://localhost:19006",
  "http://localhost:3000",
  "http://localhost:5173",
];

function setCors(res: ServerResponse, origin: string | undefined): void {
  if (origin && ALLOWED_ORIGINS.some((o) => origin.startsWith(o))) {
    res.setHeader("Access-Control-Allow-Origin", origin);
  }
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

// ── Route matching ──────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyHandler = (...args: any[]) => Promise<void>;

interface Route {
  method: string;
  pattern: RegExp;
  keys: string[];
  handler: AnyHandler;
  service: unknown;
}

const ALL_ROUTES: Route[] = [
  ...approvalRoutes.map((r) => ({ ...r, service: queue })),
  ...memoryRoutes.map((r) => ({ ...r, service: memory })),
  ...chatGatewayRoutes.map((r) => ({ ...r, service: { queue, memory } })),
];

function matchRoute(
  routes: Route[],
  method: string,
  pathname: string,
): { route: Route; params: Record<string, string> } | null {
  for (const route of routes) {
    if (route.method !== method) continue;
    const m = route.pattern.exec(pathname);
    if (!m) continue;
    const params: Record<string, string> = {};
    route.keys.forEach((k, i) => {
      params[k] = decodeURIComponent(m[i + 1]);
    });
    return { route, params };
  }
  return null;
}

// ── Request handler ─────────────────────────────────────────────────────────

function checkAuth(req: IncomingMessage, res: ServerResponse): boolean {
  if (!AUTH_TOKEN) return true; // Phase 1: no auth configured

  // Skip auth for health check and CORS preflight
  const url = new URL(req.url!, `http://${req.headers.host}`);
  if (url.pathname === "/api/health" || req.method === "OPTIONS") return true;

  const authHeader = req.headers.authorization ?? "";
  if (authHeader === `Bearer ${AUTH_TOKEN}`) return true;

  err(res, 401, "Unauthorized. Provide Authorization: Bearer <token> header.");
  return false;
}

async function handleRequest(req: IncomingMessage, res: ServerResponse): Promise<void> {
  const origin = req.headers.origin as string | undefined;
  setCors(res, origin);

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  // Phase 2 auth check
  if (!checkAuth(req, res)) return;

  const url = new URL(req.url!, `http://${req.headers.host}`);
  const pathname = url.pathname;

  // Health check
  if (pathname === "/api/health" && req.method === "GET") {
    json(res, { status: "ok", version: "0.1.0" });
    return;
  }

  const match = matchRoute(ALL_ROUTES, req.method ?? "GET", pathname);
  if (!match) {
    err(res, 404, "Not found");
    return;
  }

  const { route, params } = match;
  try {
    await route.handler(req, res, params, route.service);
  } catch (e: unknown) {
    console.error(`[server] ${req.method} ${pathname} error:`, e);
    err(res, 500, e instanceof Error ? e.message : "internal error");
  }
}

// ── Start ───────────────────────────────────────────────────────────────────

const server = createServer(handleRequest);

server.listen(PORT, HOST, () => {
  console.log(`[ai-pm server] listening on http://${HOST}:${PORT}`);
  console.log(`[ai-pm server] project root: ${PROJECT_ROOT}`);
  if (AUTH_TOKEN) {
    console.log(`[ai-pm server] auth: bearer token enabled (Phase 2)`);
  } else {
    console.log(`[ai-pm server] auth: localhost trust (Phase 1)`);
  }
});
