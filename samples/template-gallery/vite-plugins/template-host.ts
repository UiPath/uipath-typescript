// Dev stand-in for the Apps server's system route ("Open" in the design).
//
// GET /open/<template>/            -> the live version's index.html from template storage, with the
//                                     sign-in meta tags and the inputs from the query string injected
// GET /open/<template>/<asset>     -> the matching file from the same version folder
//
// What the real route does that this does not: pick the client from the first-party registration,
// read org and tenant from the host and `?tenant=`, cache at the edge. Here the client, org, tenant and
// redirect come from the gallery's own uipath.json so the template signs in with the gallery's session.

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { Plugin } from 'vite';

interface Options {
  storageBase: string; // https://<account>.blob.core.windows.net/<container>/templates
  uipathJsonPath: string;
}

interface Catalog {
  templates: Array<{ id: string; live: string; versions: string[] }>;
}

interface UiPathJson {
  clientId: string;
  scope: string;
  orgName: string;
  tenantName: string;
  baseUrl: string;
  redirectUri: string;
}

const TEMPLATE_ID = /^[a-z0-9][a-z0-9-]{1,62}$/;
const SEMVER = /^\d+\.\d+\.\d+$/;
const RESERVED_QUERY = new Set(['tenant', 'v']);
const CATALOG_TTL_MS = 15_000;

const MIME: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.map': 'application/json',
};

const escapeAttr = (s: string) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');

export function templateHost(opts: Options): Plugin {
  const storageBase = opts.storageBase.replace(/\/+$/, '');
  let catalog: { at: number; value: Catalog } | null = null;

  async function liveVersion(id: string): Promise<Catalog['templates'][number] | undefined> {
    if (!catalog || Date.now() - catalog.at > CATALOG_TTL_MS) {
      const res = await fetch(`${storageBase}/index.json`);
      if (!res.ok) throw new Error(`index.json: ${res.status}`);
      catalog = { at: Date.now(), value: (await res.json()) as Catalog };
    }
    return catalog.value.templates.find((t) => t.id === id);
  }

  function config(): UiPathJson {
    return JSON.parse(readFileSync(opts.uipathJsonPath, 'utf8')) as UiPathJson;
  }

  /** Meta tags the SDK reads, plus the inputs as the UIPATH_PUBLIC_* env the SDK's `env` exposes. */
  function inject(html: string, query: URLSearchParams, tenant: string): string {
    const c = config();
    const metas = [
      ['uipath:client-id', c.clientId],
      ['uipath:scope', c.scope],
      ['uipath:org-name', c.orgName],
      ['uipath:tenant-name', tenant],
      ['uipath:base-url', c.baseUrl],
      ['uipath:redirect-uri', c.redirectUri],
    ]
      .map(([n, v]) => `    <meta name="${n}" content="${escapeAttr(v)}">`)
      .join('\n');

    const env: Record<string, string> = {};
    for (const [k, v] of query) {
      if (RESERVED_QUERY.has(k) || !/^[A-Za-z][A-Za-z0-9_]*$/.test(k)) continue;
      env[`UIPATH_PUBLIC_${k.replace(/([a-z0-9])([A-Z])/g, '$1_$2').toUpperCase()}`] = v;
    }
    const envScript = `    <script>window.__UIPATH_ENV__ = ${JSON.stringify(env).replace(/</g, '\\u003c')};</script>`;

    // Drop any meta the build left in, then add ours in <head>.
    const cleaned = html.replace(/\s*<meta name="uipath:[^"]+"[^>]*>/g, '');
    return cleaned.replace(/<head>/i, `<head>\n${metas}\n${envScript}`);
  }

  return {
    name: 'template-host',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const url = new URL(req.url ?? '/', 'http://localhost');
        const m = url.pathname.match(/^\/open\/([^/]+)(\/.*)?$/);
        if (!m) return next();
        const [, id, rest] = m;
        if (!TEMPLATE_ID.test(id)) return send(res, 404, 'text/plain', 'unknown template');
        if (rest === undefined) {
          res.statusCode = 302;
          res.setHeader('Location', `/open/${id}/${url.search}`);
          return res.end();
        }

        try {
          const entry = await liveVersion(id);
          if (!entry) return send(res, 404, 'text/plain', 'unknown template');
          const requested = url.searchParams.get('v');
          const version = requested && SEMVER.test(requested) && entry.versions.includes(requested) ? requested : entry.live;
          const base = `${storageBase}/${id}/${version}`;

          const relative = rest.replace(/^\/+/, '');
          if (relative === '' || relative.endsWith('/')) {
            const upstream = await fetch(`${base}/index.html`);
            if (!upstream.ok) return send(res, 502, 'text/plain', 'template index not found');
            const tenant = url.searchParams.get('tenant') || config().tenantName;
            return send(res, 200, MIME['.html'], inject(await upstream.text(), url.searchParams, tenant));
          }

          // assets: one segment or assets/<file>, nothing else, no traversal
          if (!/^(assets\/)?[A-Za-z0-9._-]+$/.test(relative) || relative.includes('..')) {
            return send(res, 404, 'text/plain', 'not found');
          }
          const upstream = await fetch(`${base}/${relative}`);
          if (!upstream.ok) return send(res, upstream.status, 'text/plain', 'not found');
          const ext = relative.slice(relative.lastIndexOf('.'));
          res.statusCode = 200;
          res.setHeader('Content-Type', MIME[ext] ?? upstream.headers.get('content-type') ?? 'application/octet-stream');
          res.setHeader('Cache-Control', 'no-store');
          res.end(new Uint8Array(await upstream.arrayBuffer()));
        } catch (e) {
          send(res, 502, 'text/plain', `template storage error: ${e instanceof Error ? e.message : String(e)}`);
        }
      });
    },
  };

  function send(res: import('node:http').ServerResponse, status: number, type: string, body: string) {
    res.statusCode = status;
    res.setHeader('Content-Type', type);
    res.setHeader('Cache-Control', 'no-store');
    res.end(body);
  }
}

export function defaultUiPathJsonPath(root: string): string {
  return resolve(root, 'uipath.json');
}
