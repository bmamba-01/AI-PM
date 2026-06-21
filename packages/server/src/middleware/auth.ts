// Auth middleware for local server (node:http based)
// Uses X-PM-Token header or PM_TOKEN env var.

export interface AuthConfig {
  token: string;
  allowedUserIds?: string[];
}

const DEFAULT_TOKEN = '';

function readTokenFromReq(req: { headers: Record<string, string | undefined> }): string | null {
  const header = req.headers['x-pm-token'] || req.headers['authorization']?.replace(/^Bearer\s+/i, '');
  return (header ?? null) as string | null;
}

export function createAuthMiddleware(config: AuthConfig) {
  const token = config.token || DEFAULT_TOKEN;
  const allowedUserIds = config.allowedUserIds ?? [];

  return function authMiddleware(
    req: { headers: Record<string, string | undefined>; actor?: Record<string, unknown> },
    res: { statusCode: number; writeHead: (code: number) => void; end: (body?: string) => void },
    next: () => void,
  ) {
    const provided = readTokenFromReq(req);

    if (!token || provided === token) {
      const userId = (req.headers['x-pm-user-id'] as string | undefined) ?? 'anonymous';
      if (allowedUserIds.length > 0 && !allowedUserIds.includes(userId)) {
        res.statusCode = 403;
        res.writeHead(403);
        res.end(JSON.stringify({ error: 'Forbidden', message: 'User ID not allowed.' }));
        return;
      }
      (req as Record<string, unknown>).actor = { userId, authenticated: Boolean(token) };
      return next();
    }

    res.writeHead(401);
    try { res.end(JSON.stringify({ error: 'Unauthorized', message: 'Missing or invalid token.' })); } catch {}
    return;
  };
}
