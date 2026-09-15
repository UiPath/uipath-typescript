# Platform Context

Every function handler receives a [`FunctionContext`](../api/function-context/) as its second argument. This page explains what the platform injects and what you must forward yourself.

## FunctionContext at a glance

```
handler: async (input, ctx) => {
  ctx.user?.accessToken         // caller's OAuth token (forwarded from Authorization header)
  ctx.user?.sub                 // caller's user ID
  ctx.user?.email               // caller's email (if present in claims)
  ctx.robot?.accessToken        // platform-issued workload token (~24h RS256 JWT)
  ctx.robot?.key                // serverless robot key (for Orchestrator per-robot endpoints)
  ctx.platform?.baseUrl         // bare authority, e.g. "https://cloud.uipath.com"
  ctx.platform?.orgId           // organization id (GUID)
  ctx.platform?.tenantId        // tenant id (GUID)
  ctx.platform?.folderKey       // folder key of the invocation, if any
  ctx.params                    // URL path params: { id: "INV-001" } for /invoices/:id
  ctx.headers                   // request headers, lowercase keys
}
```

`ctx.user` is `null` if the platform cannot identify the caller (e.g. unauthenticated local call), and always `null` for job invocations — jobs have no caller. `ctx.robot` is `null` on local runs.

## The workload token (`ctx.robot.accessToken`)

`ctx.robot.accessToken` is a platform-issued RS256 JWT granted to the function's service account. It is populated **only when the function is invoked in a deployed environment** (HTTP trigger or job). It is absent in local `serve` mode.

Token characteristics:

| Property    | Value                   |
| ----------- | ----------------------- |
| Algorithm   | RS256                   |
| `sub_type`  | `robot.user`            |
| `client_id` | platform service client |
| TTL         | ~24 hours               |

Use this token to call Orchestrator with the function's own service account identity (not the calling user). See [Calling Orchestrator — Secret Vault pattern](../calling-orchestrator/#pattern-1--secret-vault).

**Local dev fallback** — the token is absent locally. Set `UIPATH_ACCESS_TOKEN` before starting the server. Deno runtime reads `.env` natively; for Node, load env vars in your shell — see [Getting Started — local dev](../getting-started/#2-run-locally).

```
UIPATH_ACCESS_TOKEN=<OAuth token with Assets.View on the target folder>
```

Then in your handler:

```
const workloadToken =
  ctx.robot?.accessToken ||
  process.env["UIPATH_ACCESS_TOKEN"] ||
  ""
```

## accessToken

`ctx.user.accessToken` is the OAuth token from the caller's `Authorization: Bearer <token>` header. The caller's own Orchestrator permissions apply when you use this token.

Use this for delegated access patterns where the calling user should already have the required permissions. See [Calling Orchestrator — Delegated pattern](../calling-orchestrator/#pattern-2--delegated-access).

## Org / tenant context (`ctx.platform`)

The runtime injects trusted platform coordinates as `ctx.platform`:

```
handler: async (input, ctx) => {
  if (!ctx.platform) {
    throw new FunctionError("Platform context unavailable — local dev: set UIPATH_BASE_URL/UIPATH_ORG_ID/UIPATH_TENANT_ID", 500);
  }
  const { baseUrl, orgId, tenantId, folderKey } = ctx.platform;
  const sdk = new UiPath({ baseUrl, orgName: orgId, tenantName: tenantId, secret: token });
}
```

Deployed, the values come from the execution handler — never from the caller — so they cannot be redirected by request input or client-set headers. `ctx.platform` is `null` unless `baseUrl`, `orgId`, and `tenantId` are all available; `folderKey` alone can be `null` (folderless invocation). See [FunctionContext — platform](../api/function-context/#platform) for the full contract.

**Local dev fallback** — no handler runs locally, so the runtime reads these environment variables instead. They are consulted only when the request carries no `X-UiPath-*` platform headers at all: once any of them is present, the headers are the sole source, so the coordinates can never be stitched together out of a header and a local env value.

```
UIPATH_BASE_URL=https://cloud.uipath.com
UIPATH_ORG_ID=<org-UUID>
UIPATH_TENANT_ID=<tenant-UUID>
```

**Job invocations** — `ctx.platform` requires a handler version that writes the platform fields into the runtime context; on older handlers it is `null`.

### Deprecated: caller-forwarded `_baseUrl` / `_orgId` / `_tenantId`

Before `ctx.platform`, functions declared `_baseUrl`, `_orgId`, `_tenantId` as input fields and callers forwarded them explicitly. This pattern is **deprecated**: the values are caller-controlled, so a malicious caller could redirect the function's outbound Orchestrator calls. Existing functions keep working, but should migrate to `ctx.platform` and drop the `_*` input fields.

## Path parameters

Use `:param` syntax in the `path` field of `defineFunction`:

```
defineFunction({
  path: "/invoices/:id/approve",
  handler: async (input, ctx) => {
    const invoiceId = ctx.params.id;
  },
})
```

Path parameters work identically in local `serve` and when deployed. `path` becomes the HTTP trigger's slug verbatim — pattern segments included — and the deployed trigger is resolved by route matching, not exact-string comparison.

### Slug pattern syntax

| Pattern         | Matches                       | Example                                                                        |
| --------------- | ----------------------------- | ------------------------------------------------------------------------------ |
| `:param`        | exactly one segment           | `/users/:id` ← `/users/42` → `ctx.params.id === "42"`                          |
| `:param{regex}` | one segment, constrained      | `/users/:id{[0-9]+}/avatar` matches `/users/42/avatar`, not `/users/me/avatar` |
| `:param?`       | the segment, or nothing       | `/list/:filter?` matches both `/list` and `/list/open`                         |
| `*`             | one or more trailing segments | `/users/:id/*` matches `/users/42/settings/email`                              |

Params land in `ctx.params` as strings, keyed by name. A `*` match is not exposed as a named param — use it for catch-all routes rather than to capture values.

### Matching rules

- **More specific routes win**, regardless of declaration order: with both `/users/me` and `/users/:id` registered, `GET /users/me` hits the literal route.

- **A path that matches nothing returns `404`** with `errorCode 1623`:

  ```
  { "message": "HTTP trigger not found for path 'my-functions/invoices/a/b'.", "errorCode": 1623 }
  ```

- **Extra segments are not absorbed silently.** `/list/:filter?` takes at most one extra segment, so `/list/a/b` is a `1623`, not a match with `filter = "a"`. Add an explicit `*` route if you want a catch-all.

- **Query parameters remain available** and are independent of path matching — they are validated against the function's `input` schema. Use them for optional filters; use path params for identity.

## Request headers

`ctx.headers` contains all request headers with lowercase keys:

```
const contentType = ctx.headers["content-type"];
const authHeader  = ctx.headers["authorization"];
```
