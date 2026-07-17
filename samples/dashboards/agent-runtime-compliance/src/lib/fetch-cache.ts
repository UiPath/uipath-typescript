// Request dedupe + short-TTL cache for the dashboard.
//
// Every widget fetches its own data on mount. When several widgets issue the
// same API call at once (and React StrictMode double-fires effects in dev),
// those identical requests pile up and trip the API's 429 rate limit. This
// wraps the global `fetch` so identical requests share a single in-flight
// network call and reuse the response for a short TTL.
//
// What gets deduped/cached — ALL platform read APIs, not just Insights:
// - Every GET request (keyed by URL).
// - Every POST with a string/empty body (keyed by URL + body). The platform
//   exposes most read queries over POST — Insights RTM (Agents/AgentMemory/
//   Governance), and the OData/list endpoints behind Jobs, Traces.getById, etc.
//   Dashboards are READ-ONLY (metric modules never mutate), so caching read
//   POSTs is safe.
// The ONLY request never cached is the OAuth token exchange (`connect/token` /
// `oauth/token`) — serving a stale/replayed token would break auth. Requests
// with a non-string body (FormData/stream) and `Request` objects also pass
// through (can't key them synchronously). Failures are evicted so the next call
// retries; read-only data at most `ttlMs` stale is fine.
//
// Lifetime: the cache is an in-memory Map for the page session, so it is held
// "until the user reloads the dashboard" (reload drops the module + Map) OR until
// an entry's TTL expires — whichever comes first. TTL is 30s: long enough that the
// several widgets sharing a query (e.g. the governance widgets all calling the same
// AgentTraces.getGovernanceSummary POST) collapse to ONE network call instead of N.

const DEFAULT_TTL_MS = 30_000

/** Auth token endpoints — never cache (a replayed token breaks sign-in). */
const TOKEN_ENDPOINT = /\/(connect|oauth2?)\/token/i

interface CacheEntry {
  at: number
  response: Promise<Response>
}

let installed = false

/**
 * Install the fetch dedupe/cache once, before the app renders. Idempotent.
 * @param ttlMs how long an identical request is reused (default 30s)
 */
export function installFetchCache(ttlMs: number = DEFAULT_TTL_MS): void {
  if (installed) return
  installed = true

  const originalFetch = globalThis.fetch.bind(globalThis)
  const cache = new Map<string, CacheEntry>()

  /** Cache key for a request, or null when the request must not be cached. */
  function keyFor(input: RequestInfo | URL, init?: RequestInit): string | null {
    // Request objects can carry a stream body we can't key synchronously — pass through.
    if (input instanceof Request) return null
    const url = typeof input === 'string' ? input : input.href
    const method = (init?.method ?? 'GET').toUpperCase()
    if (TOKEN_ENDPOINT.test(url)) return null            // never cache token exchange
    if (method === 'GET') return `GET ${url}`
    if (method === 'POST') {                             // read POSTs across ALL services
      const body = init?.body
      if (body === undefined || body === null) return `POST ${url}`
      if (typeof body === 'string') return `POST ${url} ${body}`
    }
    return null                                          // non-string body → can't key
  }

  globalThis.fetch = (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const key = keyFor(input, init)
    if (!key) return originalFetch(input, init)

    const now = Date.now()
    const hit = cache.get(key)
    if (hit && now - hit.at < ttlMs) {
      // Clone so each caller gets its own readable body.
      return hit.response.then((r) => r.clone())
    }

    const response = originalFetch(input, init)
    cache.set(key, { at: now, response })
    // Don't keep failed responses around — let the next call retry.
    response.then(
      (r) => { if (!r.ok) cache.delete(key) },
      () => cache.delete(key),
    )
    return response.then((r) => r.clone())
  }
}
