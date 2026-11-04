// Local host for the function in functions/copies.ts, standing in for `uip function serve`
// until the function tool is installable. Same contract: Bearer token -> ctx.user, platform
// coordinates from env -> ctx.platform, JSON in, JSON out, {error} on failure, CORS open.
//
//   set -a && source .env && set +a && bun run server.ts        (or: bun --env-file=.env run server.ts)

import copies from './functions/copies.ts';
import templates from './functions/templates.ts';
import folders from './functions/folders.ts';
import deployments from './functions/deployments.ts';
import { FunctionError, type FunctionContext } from './functions/_sdk-shim.ts';

const PORT = Number(process.env.PORT ?? 7070);
// Only the gallery's dev origin may call this host from a browser (uip function serve answers `*`).
const CORS_ORIGIN = process.env.CORS_ORIGIN ?? 'http://localhost:5173';
const CORS = {
  'Access-Control-Allow-Origin': CORS_ORIGIN,
  'Access-Control-Allow-Headers': 'authorization, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  Vary: 'Origin',
};

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', ...CORS } });
}

function platformFromEnv(): FunctionContext['platform'] {
  const baseUrl = process.env.UIPATH_BASE_URL;
  const orgId = process.env.UIPATH_ORG_ID;
  const tenantId = process.env.UIPATH_TENANT_ID;
  if (!baseUrl || !orgId || !tenantId) return null;
  return { baseUrl: baseUrl.replace(/\/+$/, ''), orgId, tenantId, folderKey: process.env.UIPATH_FOLDER_KEY ?? null };
}

function userFromBearer(header: string | null): FunctionContext['user'] {
  if (!header?.startsWith('Bearer ')) return null;
  const accessToken = header.slice(7).trim();
  try {
    const payload = accessToken.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    const claims = JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(payload), (c) => c.charCodeAt(0)))) as Record<string, string>;
    return { sub: claims.sub ?? '', name: claims.name, email: claims.email ?? claims.preferred_username, accessToken };
  } catch {
    return { sub: '', accessToken };
  }
}

const routes = [templates, folders, copies, deployments];

Bun.serve({
  port: PORT,
  idleTimeout: 120,
  async fetch(req) {
    const url = new URL(req.url);
    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });
    if (req.method === 'GET' && url.pathname === '/') {
      return json(200, { ok: true, routes: routes.map((r) => `${r.method} ${r.path}`) });
    }
    const fn = routes.find((r) => r.method === req.method && r.path === url.pathname);
    if (!fn) return json(404, { error: 'NotFound' });

    // GET: the query string is the input (as uip function serve does). Other methods: a JSON body.
    let input: unknown = {};
    if (req.method === 'GET') {
      input = Object.fromEntries(url.searchParams);
    } else {
      if (!(req.headers.get('content-type') ?? '').toLowerCase().startsWith('application/json')) {
        return json(415, { error: 'Content-Type must be application/json' });
      }
      try {
        input = await req.json();
      } catch {
        return json(400, { error: 'ValidationFailed', details: 'body must be JSON' });
      }
    }
    const ctx: FunctionContext = {
      user: userFromBearer(req.headers.get('authorization')),
      robot: null,
      platform: platformFromEnv(),
      headers: Object.fromEntries(req.headers),
      params: Object.fromEntries(url.searchParams),
      logger: {
        info: (m) => console.log(`[info] ${m}`),
        warn: (m) => console.warn(`[warn] ${m}`),
        error: (m) => console.error(`[error] ${m}`),
      },
    };
    try {
      const started = Date.now();
      const out = await fn.handler(input as never, ctx);
      console.log(`[info] ${fn.method} ${fn.path} ok in ${Date.now() - started} ms`);
      return json(200, out);
    } catch (e) {
      if (e instanceof FunctionError) return json(e.status, { error: e.message });
      const message = e instanceof Error ? e.message : String(e);
      console.error(`[error] ${fn.method} ${fn.path}: ${message}`);
      return json(500, { error: message });
    }
  },
});

console.log(`copies function listening on http://localhost:${PORT}  (platform: ${platformFromEnv() ? 'from env' : 'MISSING, set UIPATH_BASE_URL/ORG_ID/TENANT_ID'})`);
