import { type IncomingMessage, type ServerResponse } from "node:http";

/** Read the full request body as a string. */
export function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on("data", (c) => chunks.push(c));
    req.on("end", () => resolve(Buffer.concat(chunks).toString()));
    req.on("error", reject);
  });
}

/** Read and parse the request body as JSON. */
export async function readJSON(req: IncomingMessage): Promise<Record<string, unknown>> {
  const raw = await readBody(req);
  if (!raw) return {};
  return JSON.parse(raw) as Record<string, unknown>;
}

/** Send a JSON response. */
export function json(res: ServerResponse, data: unknown, status = 200): void {
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify(data));
}

/** Send an error response. */
export function err(res: ServerResponse, status: number, message: string): void {
  json(res, { error: message }, status);
}
