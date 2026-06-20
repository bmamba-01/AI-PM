/**
 * Generate OpenAPI YAML from server route definitions.
 *
 * This script reads the route arrays from approvals.ts and memory.ts,
 * then produces a minimal OpenAPI 3.0 document. It is intentionally
 * simple — the canonical spec lives at
 * docs/architecture/local-server-api-openapi.yaml and is hand-maintained.
 *
 * Usage:
 *   npx tsx packages/server/src/generate-api-docs.ts
 *   # or via package script:
 *   pnpm --filter @ai-pm/server generate:api-docs
 */

import { approvalRoutes } from "./routes/approvals.js";
import { memoryRoutes } from "./routes/memory.js";

interface RouteInfo {
  method: string;
  path: string;
  group: string;
}

function extractRoutes(
  routes: Array<{ method: string; pattern: RegExp }>,
  group: string,
): RouteInfo[] {
  return routes.map((r) => ({
    method: r.method,
    path: r.pattern.source
      .replace(/^\^/, "")
      .replace(/\$$/, "")
      .replace(/\(\?:\(\[\\w\+]+\)\)/g, (_, _k) => `/{id}`) // :id → {id}
      .replace(/\(\[^\/\]\+\)/g, "{param}"), // generic param
    group,
  }));
}

function generate(): void {
  const approval = extractRoutes(approvalRoutes, "Approvals");
  const memory = extractRoutes(memoryRoutes, "Memory");

  const all = [
    { method: "GET", path: "/api/health", group: "Health" },
    ...approval,
    ...memory,
  ];

  console.log("# Auto-generated route inventory (not the full OpenAPI spec)");
  console.log("# Canonical spec: docs/architecture/local-server-api-openapi.yaml\n");

  console.log(`# Total endpoints: ${all.length}\n`);

  for (const route of all) {
    console.log(`${route.method.padEnd(6)} ${route.path.padEnd(45)} [${route.group}]`);
  }

  console.log(`\n# Approval routes: ${approval.length}`);
  console.log(`# Memory routes:   ${memory.length}`);
  console.log(`# Health routes:   1`);
  console.log(`# Total:           ${all.length}`);
}

generate();
