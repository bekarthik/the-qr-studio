/**
 * QR Studio microservice (Cloudflare Worker).
 *
 * Abuse / DDoS posture, in layers from the edge inward:
 *  1. Cloudflare's network absorbs L3/L4 volumetric attacks for free.
 *  2. GET responses are deterministic, so we cache them at the edge — a flood of
 *     identical requests is served from cache and never re-invokes the Worker.
 *  3. A per-IP rate limit (binding) caps how fast any one client can hit origin.
 *  4. Strict body-size, method and input validation reject malformed/oversized
 *     requests before any rendering work happens.
 *  5. Logos are data-URLs only — the Worker never fetches a remote URL (no SSRF).
 */
import { parseRequest, ValidationError } from './validate';
import { buildSvg, rasterize, verifyPixels } from './render';
import { landingPage } from './landing';

export interface Env {
  // Optional Cloudflare Rate Limiting binding (see wrangler.toml). Guarded so
  // the Worker still runs locally / in tests when the binding is absent.
  RATE_LIMITER?: { limit(opts: { key: string }): Promise<{ success: boolean }> };
  ALLOW_ORIGIN?: string;
}

// Worker-specific global not present in the DOM lib we typecheck against.
interface ExecutionContext {
  waitUntil(promise: Promise<unknown>): void;
  passThroughOnException(): void;
}

// Reject bodies larger than this before reading them (logo data-URLs included).
const MAX_BODY_BYTES = 320_000;

const SECURITY_HEADERS: Record<string, string> = {
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'no-referrer',
  'X-Frame-Options': 'DENY',
};

function corsHeaders(env: Env): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': env.ALLOW_ORIGIN || '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
  };
}

function json(body: unknown, status: number, env: Env, extra: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...SECURITY_HEADERS, ...corsHeaders(env), ...extra },
  });
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    const method = request.method.toUpperCase();

    if (method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: { ...corsHeaders(env), ...SECURITY_HEADERS } });
    }
    if (method !== 'GET' && method !== 'POST') {
      return json({ error: 'Method not allowed' }, 405, env, { Allow: 'GET, POST, OPTIONS' });
    }

    // Health + docs.
    if (url.pathname === '/health' || url.pathname === '/healthz') {
      return new Response('ok', { status: 200, headers: SECURITY_HEADERS });
    }
    if (url.pathname === '/' || url.pathname === '') {
      return new Response(landingPage(url.origin), {
        status: 200,
        headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'public, max-age=3600', ...SECURITY_HEADERS },
      });
    }
    if (url.pathname !== '/qr' && url.pathname !== '/v1/qr') {
      return json({ error: 'Not found' }, 404, env);
    }

    // --- Edge cache for GETs: identical query => served without re-invoking. ---
    const cache = (caches as unknown as { default: Cache }).default;
    if (method === 'GET') {
      const hit = await cache.match(request);
      if (hit) return hit;
    }

    // --- Per-IP rate limit (after cache, so cached hits don't spend budget). ---
    if (env.RATE_LIMITER) {
      const ip = request.headers.get('cf-connecting-ip') || 'anon';
      const { success } = await env.RATE_LIMITER.limit({ key: ip });
      if (!success) {
        return json({ error: 'Rate limit exceeded. Try again shortly.' }, 429, env, { 'Retry-After': '60' });
      }
    }

    // --- Parse + validate input. ---
    let body: Record<string, unknown> = {};
    if (method === 'POST') {
      const len = Number(request.headers.get('content-length') || '0');
      if (len > MAX_BODY_BYTES) return json({ error: 'Request body too large' }, 413, env);
      const raw = await request.text();
      if (raw.length > MAX_BODY_BYTES) return json({ error: 'Request body too large' }, 413, env);
      if (raw.trim()) {
        try {
          body = JSON.parse(raw);
        } catch {
          return json({ error: 'Invalid JSON body' }, 400, env);
        }
        if (typeof body !== 'object' || body === null || Array.isArray(body)) {
          return json({ error: 'JSON body must be an object' }, 400, env);
        }
      }
    }

    let req;
    try {
      req = parseRequest(url.searchParams, body);
    } catch (e) {
      const msg = e instanceof ValidationError ? e.message : 'Invalid request';
      return json({ error: msg }, 400, env);
    }

    // --- Render. ---
    let response: Response;
    try {
      const svg = buildSvg(req);
      let verified: boolean | null = null;

      if (req.format === 'svg') {
        if (req.verify) {
          // Rasterise at a modest size purely to confirm the vector scans.
          const r = await rasterize(svg, Math.min(req.size, 512), req.bg);
          verified = verifyPixels(r, req.data);
        }
        response = new Response(svg, {
          status: 200,
          headers: {
            'Content-Type': 'image/svg+xml; charset=utf-8',
            'Cache-Control': 'public, max-age=86400, immutable',
            ...(verified !== null ? { 'X-QR-Verified': String(verified) } : {}),
            ...SECURITY_HEADERS,
            ...corsHeaders(env),
          },
        });
      } else {
        const r = await rasterize(svg, req.size, req.bg);
        if (req.verify) verified = verifyPixels(r, req.data);
        response = new Response(r.png as BodyInit, {
          status: 200,
          headers: {
            'Content-Type': 'image/png',
            'Cache-Control': 'public, max-age=86400, immutable',
            ...(verified !== null ? { 'X-QR-Verified': String(verified) } : {}),
            ...SECURITY_HEADERS,
            ...corsHeaders(env),
          },
        });
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Render failed';
      // Payload-too-long from the encoder surfaces as a 400, not a 500.
      const status = /too (long|big)|capacity|code length overflow/i.test(msg) ? 400 : 500;
      return json({ error: status === 400 ? 'Payload too large to encode' : 'Render failed' }, status, env);
    }

    if (method === 'GET') ctx.waitUntil(cache.put(request, response.clone()));
    return response;
  },
};
