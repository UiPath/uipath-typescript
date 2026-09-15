# FunctionContext

The second argument to every handler. Carries caller identity, the function's own platform identity, path parameters, and request headers.

```
import type { FunctionContext } from "@uipath/coded-functions-js-sdk";
```

## Interface

```
interface FunctionContext {
  user: IdentityContext | null;
  robot: RobotContext | null;
  platform: PlatformContext | null;
  params: Record<string, string>;
  headers: Record<string, string>;
}
```

## user

The identity of the caller. `null` if the platform cannot identify the caller (unauthenticated request) — and always `null` for job invocations, which have no caller.

### IdentityContext

```
interface IdentityContext {
  sub: string;                     // caller's user ID
  name?: string;                   // display name, if present in claims
  email?: string;                  // email, if present in claims
  accessToken?: string;            // caller's OAuth token (from Authorization header)
}
```

#### `accessToken`

The OAuth token from the caller's `Authorization: Bearer` header. Use for delegated calls to Orchestrator — the caller's own folder permissions apply.

```
if (!ctx.user?.accessToken) {
  throw new FunctionError("Not authenticated", 403);
}
const sdk = new UiPath({ secret: ctx.user.accessToken, ... });
```

## robot

The function's own platform identity — the serverless robot it runs as. `null` on local runs.

### RobotContext

```
interface RobotContext {
  key: string | null;          // serverless robot key
  accessToken: string | null;  // platform-issued workload token (~24h RS256 JWT)
}
```

#### `accessToken`

A platform-issued RS256 JWT (`sub_type: robot.user`, ~24h TTL) for the function's service account. Use for Secret Vault pattern — reads assets without requiring the caller to have folder access.

**Availability:**

| Context                   | Available?                               |
| ------------------------- | ---------------------------------------- |
| HTTP trigger (deployed)   | Yes                                      |
| Job invocation (deployed) | Yes                                      |
| Local `serve`             | No — use `UIPATH_ACCESS_TOKEN` in `.env` |

```
const token =
  ctx.robot?.accessToken ||
  process.env["UIPATH_ACCESS_TOKEN"] ||
  "";
```

#### `key`

The serverless robot's key. Required by Orchestrator's per-robot endpoints — notably Secret asset retrieval via `GetRobotAssetByNameForRobotKey`, the only endpoint that releases Secret asset values.

## platform

Trusted platform coordinates for outbound UiPath calls, injected by the runtime. Use these instead of caller-forwarded input fields — input is caller-controlled and can redirect your Orchestrator calls.

### PlatformContext

```
interface PlatformContext {
  baseUrl: string;           // bare authority, e.g. "https://cloud.uipath.com"
  orgId: string;             // organization id (GUID, not slug)
  tenantId: string;          // tenant id (GUID, not slug)
  folderKey: string | null;  // folder key of the invocation, if any
}
```

**Availability:**

| Context                   | Available?                                                                                                    |
| ------------------------- | ------------------------------------------------------------------------------------------------------------- |
| HTTP trigger (deployed)   | Yes — from handler-authored headers                                                                           |
| Job invocation (deployed) | Yes — from the runtime context (requires a handler that writes the platform fields; `null` on older handlers) |
| Local `serve` / `run`     | Only with `UIPATH_BASE_URL`, `UIPATH_ORG_ID`, `UIPATH_TENANT_ID` set                                          |

`platform` is all-or-nothing: it is `null` unless `baseUrl`, `orgId`, and `tenantId` are all available. `folderKey` can be `null` independently (folderless invocation).

```
if (!ctx.platform) {
  throw new FunctionError("Platform context unavailable — local dev: set UIPATH_BASE_URL/UIPATH_ORG_ID/UIPATH_TENANT_ID", 500);
}
const sdk = new UiPath({
  baseUrl: ctx.platform.baseUrl,
  orgName: ctx.platform.orgId,
  tenantName: ctx.platform.tenantId,
  secret: token,
});
```

The org-scoped URL (as sent in `X-UiPath-Url`) is `${baseUrl}/${orgId}/${tenantId}`.

## params

Path parameters from `:param` segments in the function's `path`.

```
// defineFunction({ path: "/invoices/:id/approve" })
const invoiceId = ctx.params.id;   // "INV-001"
```

## headers

All request headers, with lowercase keys.

```
const auth = ctx.headers["authorization"];   // "Bearer eyJ..."
const type = ctx.headers["content-type"];
```

## Importing FunctionContext for helper functions

`FunctionContext` is exported from the SDK. Import it explicitly when you split handler logic into typed helper functions:

```
import type { FunctionContext } from "@uipath/coded-functions-js-sdk";

interface MyInput {
  id: string;
}

// The same interface declares the contract (input: defineSchema<MyInput>()) and types the helper.
async function processItem(input: MyInput, ctx: FunctionContext) {
  const userId = ctx.user?.sub ?? "anonymous";
  // ...
}
```

Without the explicit import, the only alternative is `ctx: any`, which loses all type safety.

## Usage example

```
export default defineFunction({
  name: "example",
  method: "POST",
  path: "/example/:id",
  handler: async (input, ctx) => {
    // Identity
    const userId = ctx.user?.sub ?? "anonymous";

    // Path param
    const resourceId = ctx.params.id;

    // Token selection
    const token =
      ctx.robot?.accessToken ||
      process.env["UIPATH_ACCESS_TOKEN"] ||
      "";

    return { userId, resourceId };
  },
});
```
