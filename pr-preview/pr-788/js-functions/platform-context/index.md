# Platform Context

Every function handler receives a [`FunctionContext`](../api/function-context/) as its second argument. This page explains what the platform injects and what you must forward yourself.

## FunctionContext at a glance

```
handler: async (input, ctx) => {
  ctx.user?.accessToken         // caller's OAuth token (forwarded from Authorization header)
  ctx.user?.sub                 // caller's user ID
  ctx.user?.name                // caller's display name (if present in claims)
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

`ctx.user` is `null` if the platform cannot identify the caller (e.g. unauthenticated local call). `ctx.robot` is `null` on local runs.

A job has no caller, so there is no caller identity to read: on a job invocation `ctx.user?.sub` and `ctx.user?.accessToken` are both `undefined`. Guard on `ctx.user?.accessToken` rather than on `ctx.user` itself, and use `ctx.robot.accessToken` for a job's outbound calls.

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

**Local dev fallback** — the token is absent locally. Put `UIPATH_ACCESS_TOKEN` in a `.env` file at the project root (or export it in your shell): `serve` loads `.env` on both runtimes — see [Getting Started — local dev](../getting-started/#2-run-locally).

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

**Local dev fallback** — no handler runs locally, so `serve` reads these environment variables instead. They are consulted only when the request carries no `X-UiPath-*` platform headers at all: once any of them is present, the headers are the sole source, so the coordinates can never be stitched together out of a header and a local env value.

The fallback belongs to the HTTP path only. `uip functions run` builds `ctx.platform` from the runtime-context file its host writes and never consults the environment, so a bare local `run` gets `ctx.platform: null` no matter what is exported.

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

### Path params also reach `input`

`ctx.params` is not the only place they land: the runtime merges them into the raw input before validating it, as `{ ...params, ...body-or-query }`. Two consequences:

- **The body (or query string, on `GET`) wins** on a name collision — the caller's value overrides the path segment of the same name.

- **Declare every path param in the `input` type.** `defineSchema<T>()` derives a *closed* object (`additionalProperties: false` unless the interface has an index signature), so a param the interface omits is rejected as an unknown key:

  ```
  { "error": "ValidationFailed",
    "details": { "formErrors": ["must NOT have additional properties"], "fieldErrors": {} } }
  ```

Declaring it is also the convenient path: `input.id` is typed, so the handler rarely needs `ctx.params` at all.

- **Declare a path param as a `string`,** and convert it in the handler. A URL carries text, and the contract states what arrives, so `input.id` is the segment as sent. The same holds for a `GET` query string. See [text-sourced input](../production-rules/#text-sourced-input-a-query-string-and-a-path-segment-are-strings).

A function with **no** `input` schema receives the path params alone as its input.

### Slug pattern syntax

| Pattern          | Matches                  | Example                                                                        |
| ---------------- | ------------------------ | ------------------------------------------------------------------------------ |
| `:param`         | exactly one segment      | `/users/:id` ← `/users/42` → `ctx.params.id === "42"`                          |
| `:param{regex}`  | one segment, constrained | `/users/:id{[0-9]+}/avatar` matches `/users/42/avatar`, not `/users/me/avatar` |
| `:param?`        | the segment, or nothing  | `/list/:filter?` matches both `/list` and `/list/open`                         |
| `:param{regex}?` | both, combined           | still sorts as the least specific param shape — `?` dominates the constraint   |
| `*` (trailing)   | zero or more segments    | `/users/:id/*` matches `/users/42/settings/email` — and `/users/42` too        |
| `*` (mid-path)   | exactly one segment      | `/wild/*/card` matches `/wild/12/card`, not `/wild/12/help/card`               |

Params land in `ctx.params` as strings, keyed by name. A `*` match is not exposed as a named param — use it for catch-all routes rather than to capture values. Because a trailing `*` also matches its bare prefix, `/files/*` answers `/files` as well; register the exact route too if it needs its own handler (it wins on specificity).

> **Calling a path-param function from `@uipath/uipath-typescript`.** `Functions.invoke()` does **not** substitute path params: it builds the URL from the declared slug verbatim and sends the whole input as query parameters (`GET`) or body, so the request arrives as `/invoices/:id?id=INV-001` with `:id` literal in the path. The call still succeeds — `:id` binds as an ordinary segment and the values come from the query string — so the handler receives the right input while `ctx.params.id` is the literal `":id"`. A **regex-constrained param can therefore never match through the SDK**, because `":id"` is not `[0-9]+`. Substitute the params yourself and call the resolved trigger URL if you need the real path.

### Matching rules

- **More specific routes win**, regardless of declaration order: with both `/users/me` and `/users/:id` registered, `GET /users/me` hits the literal route.

- **A path that matches nothing returns `404`.** Deployed, that is Orchestrator's trigger-lookup failure, with `errorCode 1623`:

  ```
  { "message": "HTTP trigger not found for path 'my-functions/invoices/a/b'.", "errorCode": 1623 }
  ```

  Local `serve` returns the same status with a plain-text `404 Not Found` body — the routing decision is identical, only the error rendering differs.

- **Extra segments are not absorbed silently.** `/list/:filter?` takes at most one extra segment, so `/list/a/b` is a `1623`, not a match with `filter = "a"`. Add an explicit `*` route if you want a catch-all.

- **Query parameters are read on `GET` only.** For a `GET`, the query string *is* the raw input and is validated against the `input` schema (independently of path matching) — use it for optional filters and path params for identity. For `POST`/`PUT`/`PATCH`/`DELETE` the input is the JSON body and the query string is **discarded**: there is no `ctx.query`, and `ctx` does not expose the request URL, so a value sent that way is unreachable. Put it in the body or in the path.

- **Same-shape routes are flagged at design time.** Two routes with the same method and the same segment shape (`/users/:id` vs `/users/:name`, or an exact duplicate) match the same requests and are separated only by an ordinal tie-break on the path string. `serve` (without `--production`) and `pack` print a warning naming both and the winner:

  ```
  Ambiguous route overlap: GET /users/:id (functions/a.ts) and GET /users/:name
  (functions/b.ts) match the same requests; "/users/:id" wins by deterministic tie-break.
  ```

Routes separated by specificity (`/order/create` vs `/order/:id`) and same-path routes on different methods are silent.

## Request headers

`ctx.headers` contains all request headers with lowercase keys:

```
const contentType = ctx.headers["content-type"];
const authHeader  = ctx.headers["authorization"];
```

There is no HTTP request behind a job invocation, so `ctx.headers` and `ctx.params` are both `{}` there. Anything a job needs must come from its input or from `ctx.robot` / `ctx.platform`.
