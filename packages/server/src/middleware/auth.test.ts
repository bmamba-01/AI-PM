import { describe, expect, it } from 'vitest';
import { createAuthMiddleware } from './auth.js';

function makeReq(headers: Record<string, string | undefined>) {
  return { headers };
}
function makeRes() {
  const out: { statusCode: number; ended: boolean; body: string } = { statusCode: 200, ended: false, body: '' };
  return {
    get statusCode() { return out.statusCode; },
    set statusCode(v: number) { out.statusCode = v; },
    writeHead(code: number) { out.statusCode = code; },
    end(body?: string) { out.ended = true; out.body = body ?? ''; },
    get ended() { return out.ended; },
    get body() { return out.body; },
  };
}

describe('createAuthMiddleware', () => {
  it('allows matching token', () => {
    const middleware = createAuthMiddleware({ token: 'secret' });
    const req = makeReq({ 'x-pm-token': 'secret' });
    const res = makeRes();
    let nextCalled = false;
    const next = () => { nextCalled = true; };
    middleware(req as any, res as any, next);
    expect(nextCalled).toBe(true);
  });

  it('rejects missing token', () => {
    const middleware = createAuthMiddleware({ token: 'secret' });
    const req = makeReq({});
    const res = makeRes();
    let nextCalled = false;
    const next = () => { nextCalled = true; };
    middleware(req as any, res as any, next);
    expect(res.statusCode).toBe(401);
    expect(nextCalled).toBe(false);
  });

  it('rejects wrong token', () => {
    const middleware = createAuthMiddleware({ token: 'secret' });
    const req = makeReq({ 'x-pm-token': 'wrong' });
    const res = makeRes();
    let nextCalled = false;
    const next = () => { nextCalled = true; };
    middleware(req as any, res as any, next);
    expect(res.statusCode).toBe(401);
    expect(nextCalled).toBe(false);
  });
});
