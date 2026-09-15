# Production Rules

Rules that apply when deploying JS Functions. Violations typically cause silent failures or 15-minute hangs at cold start with no logs.

______________________________________________________________________

## Prefer `FunctionError` over plain `Error` for meaningful error responses

Every thrown error forwards its message — but a plain `Error` renders as a 500 with no error code, while a `FunctionError` lets you pick the status (and, in the job error info, a machine-readable code):

```
// ⚠️ HTTP caller sees 500 {"error":"Asset not found"}; job error info: code JsCodedFunction.HandlerError
throw new Error("Asset not found");

// ✅ HTTP caller sees 404 {"error":"Asset not found"}; job error info: code ASSET_NOT_FOUND, status 404
throw new FunctionError("Asset not found", 404, "ASSET_NOT_FOUND");
```

See [FunctionError](../api/function-error/).

______________________________________________________________________

## Functions must complete within ~20 seconds

The platform times out HTTP trigger calls at 25 seconds and issues an `HTTP 303 See Other` redirect to a polling URL. The redirect target is served from the `api.*` subdomain and sends `Access-Control-Allow-Origin: *`, so a browser follows it transparently and still receives the result.

Keep every function well under 20 seconds anyway: the redirect turns a fast call into a slow one, any intermediate proxy or client timeout in the path can still cut the connection, and work that legitimately runs longer belongs in a job-mode function (omit `method` and `path`), which has no gateway in front of it at all.

For any external API call, enforce a timeout:

```
const result = await fetch(url, {
  signal: AbortSignal.timeout(8_000),  // 8s per external call
});
```

For the overall handler:

```
handler: async (input, ctx) => Promise.race([
  actualHandler(input, ctx),
  new Promise<never>((_, reject) =>
    AbortSignal.timeout(18_000).addEventListener("abort", () =>
      reject(new FunctionError("Function timed out", 504))
    )
  ),
])
```

______________________________________________________________________

## GET functions: query-string coercion is automatic for schema-first contracts

Query string values always arrive as strings. With a schema-first contract — `defineSchema<T>()` or a JSON Schema literal — the runtime coerces them to the declared type before validation, so this just works:

```
interface ListInput {
  folderId: number;   // "123" arrives as a string; the runtime coerces it to 123
}

input: defineSchema<ListInput>()
```

Only functions still using a **zod** schema must opt into coercion themselves — a plain `z.number()` fails validation on any GET input:

```
// ❌ validation error with zod — "123" is a string, not a number
input: z.object({ folderId: z.number() })

// ✅ zod-authored functions need z.coerce
input: z.object({ folderId: z.coerce.number() })
```

This does not apply to POST functions — JSON body values preserve their types.

______________________________________________________________________

## Always send `body: '{}'` for POST functions with empty input

The platform gateway always parses the body as JSON when `Content-Type: application/json` is set. A POST request with no body returns `400 { "errorCode": 4804, "message": "Could not parse body as json." }` even when the function declares an empty input object.

```
// ❌ 400 errorCode 4804
await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" } });

// ✅ send empty object
await fetch(url, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: "{}",
});
```

______________________________________________________________________

## Regenerate the lockfile after any dependency change

The `.nupkg` includes the project's lock file — `package-lock.json` or `bun.lock`. The production worker installs from it with bun, which reads either format. A stale lockfile causes production install failures (errorCode 4801 on all routes), and `pack` now refuses one that no longer matches `package.json`.

```
npm install   # or `bun install` — always run this before pack after any package.json change
uip functions pack
```

______________________________________________________________________

## Import paths must include `.ts` extension

```
// ✅ correct
import { helper } from "./lib/helper.ts";

// ❌ hangs silently in production
import { helper } from "./lib/helper";
```

The local dev server (`tsx`) resolves extensionless imports. The production runtime does not. A broken import crashes the entire function runtime at cold start — all functions in the package hang with no logs.

______________________________________________________________________

## Runtime dependencies must be in `dependencies`, not `devDependencies`

The production worker runs `npm install --omit=dev`. Any package imported by your functions must be in `dependencies`.

```
{
  "dependencies": {
    "@uipath/uipath-typescript": "^1.x"   // ← must be here if your functions import it
  },
  "devDependencies": {
    "@uipath/coded-functions-js-sdk": "^0.x",
    "@uipath/functions-tool": "...",
    "typescript": "..."
  }
}
```

Schema-first contracts (`defineSchema<T>()` / JSON Schema literals) need **no** runtime dependency — validation lives in the platform runtime. Only packages your handlers actually import belong in `dependencies` (including a validator like `zod`, if you still use one for contracts).

If an import fails silently at cold start, all functions in the package hang for up to 15 minutes with no logs.

______________________________________________________________________

## No `Buffer` global

The production runtime does not polyfill Node.js globals. `Buffer` is not available. Use `Uint8Array` or `TextEncoder`/`TextDecoder` instead.

______________________________________________________________________

## Declare contracts schema-first

Declare `input`/`output` as a `defineSchema<T>()` marker (TypeScript) or a JSON Schema literal (JavaScript) — see [defineFunction — Declaring contracts](../api/define-function/#declaring-contracts). These are statically extractable (Studio Web reads the contract without executing your code) and add no runtime dependency.

Validator schemas remain supported for backwards compatibility: any object implementing both [Standard Schema](https://standardschema.dev/) and Standard JSON Schema works (`zod` >= 4.2, `arktype` >= 2.1.28, `valibot` >= 1.2 via `@valibot/to-json-schema` >= 1.5), but the contract can then only be obtained by executing the module, and the validator must ship in `dependencies`.

______________________________________________________________________

## The workload token is absent locally

`ctx.robot` is only populated by the platform in a deployed environment. In local `serve` mode it is `null`, so `ctx.robot?.accessToken` is `undefined`. Always provide an environment variable fallback:

```
const token =
  ctx.robot?.accessToken ||
  process.env["UIPATH_ACCESS_TOKEN"] ||
  "";
```

Set `UIPATH_ACCESS_TOKEN` in your shell before starting the server (see [Getting Started — local dev](../getting-started/#2-run-locally)). The `uip functions serve` Node runtime cannot auto-load `.env` via `--env-file` in some environments — use `--runtime deno` or load env vars in the shell manually.

______________________________________________________________________

## Read Orchestrator coordinates from `ctx.platform`, not input

The runtime injects `baseUrl`, `orgId`, and `tenantId` as `ctx.platform`. Do not accept them as input fields (`_baseUrl`/`_orgId`/`_tenantId` — deprecated): input is caller-controlled and can redirect the function's outbound Orchestrator calls. Environment variables are only a local-dev fallback and are `undefined` in production. See [Platform Context](../platform-context/#org--tenant-context-ctxplatform).

______________________________________________________________________

## Re-packing the same version overwrites the .nupkg

`uip functions pack` overwrites `.uipath/<name>.<version>.nupkg` if the file already exists. Older version files stay in `.uipath/`. The `publish` command picks the most recently modified file by mtime.

______________________________________________________________________

## `uip functions serve --production`

When run in the production container, pass `--production` to skip the server-runner dependency install and the `freePort` check. The CLI detects this flag and skips both steps if the server-runner directory already exists.
