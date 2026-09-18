# Calling Orchestrator

Two patterns for reading Orchestrator assets from a JS Function. Choose based on whether the asset is sensitive.

```
Is the asset sensitive (credentials, API keys, shared secrets)?
│
├─ Yes → Pattern 1: Secret Vault  ← the recommended default
│         Function reads with its own robot token.
│         Calling user has zero folder access required.
│         The only workable route for a Credential asset.
│
└─ No  → Pattern 2: Delegated access
          Function reads on behalf of the calling user.
          User must have Assets.View on the folder.
```

______________________________________________________________________

## Pattern 1 — Secret Vault

The function uses `ctx.robot.accessToken` — a platform-issued RS256 JWT (~24h TTL). The calling user has no folder access; the function's service account is the only principal that reads the restricted folder.

### Orchestrator setup

1. Create a dedicated folder (e.g. `Restricted-Secrets`).
1. Add assets to that folder.
1. Find the JS Function runtime service account in Orchestrator → Robots / Machines.
1. Grant that service account **Assets.View** on the restricted folder only.
1. Do **not** add the calling user to that folder.

### Function code

```
import { defineFunction, FunctionError, defineSchema } from "@uipath/coded-functions-js-sdk";
import { UiPath } from "@uipath/uipath-typescript/core";
import { Assets } from "@uipath/uipath-typescript/assets";
import type { AssetGetResponse } from "@uipath/uipath-typescript/assets";

interface GetAssetInput {
  assetName: string;
  /** Required — without it the SDK returns null values. */
  folderId: number;
}

export default defineFunction({
  name: "get-asset-secret-vault",
  method: "POST",
  path: "/get-asset-secret-vault",
  input: defineSchema<GetAssetInput>(),
  handler: async (inp, ctx) => {
    const workloadToken =
      ctx.robot?.accessToken ||             // populated by platform when deployed
      process.env["UIPATH_ACCESS_TOKEN"] || // local dev fallback
      "";

    if (!workloadToken) {
      throw new FunctionError(
        "Workload token not available — ctx.robot.accessToken is absent (local dev: set UIPATH_ACCESS_TOKEN in your shell)",
        500,
      );
    }

    if (!ctx.platform) {
      throw new FunctionError(
        "Platform context unavailable — local dev: set UIPATH_BASE_URL/UIPATH_ORG_ID/UIPATH_TENANT_ID",
        500,
      );
    }
    const { baseUrl, orgId, tenantId } = ctx.platform;

    const sdk = new UiPath({ baseUrl, orgName: orgId, tenantName: tenantId, secret: workloadToken });
    await sdk.initialize(); // no-op in secret mode

    const escaped = inp.assetName.replace(/'/g, "''");
    const response = await new Assets(sdk).getAll({
      filter: `Name eq '${escaped}'`,
      folderId: inp.folderId,
    }) as { items: AssetGetResponse[] };

    return { value: response.items[0]?.value ?? null };
  },
});
```

### package.json layout

`@uipath/uipath-typescript` must be in `dependencies`, not `devDependencies`. The production worker runs `npm install --omit=dev` — if the package lands in `devDependencies` the import fails silently at cold start and all functions hang with no logs.

```
{
  "dependencies": {
    "@uipath/uipath-typescript": "^1.x"
  },
  "devDependencies": {
    "@uipath/coded-functions-js-sdk": "^0.x",
    "@uipath/functions-tool": "...",
    "typescript": "..."
  }
}
```

### Local dev

`ctx.robot` and `ctx.platform` are `null` locally. Set these variables before starting the server — the runtime builds `ctx.platform` from the `UIPATH_BASE_URL`/`UIPATH_ORG_ID`/`UIPATH_TENANT_ID` fallback, and your code reads `UIPATH_ACCESS_TOKEN` for the token. A `.env` file at the project root is loaded by `serve` on both runtimes — see [Getting Started — local dev](../getting-started/#2-run-locally).

```
UIPATH_ACCESS_TOKEN=<valid OAuth token with Assets.View on the folder>
UIPATH_BASE_URL=https://cloud.uipath.com
UIPATH_ORG_ID=<org-UUID>
UIPATH_TENANT_ID=<tenant-UUID>
```

### Credential assets need the robot-execution endpoint

The SDK cannot return a Credential's `username` / `password` — OData returns those fields empty to every token. Reading one means calling Orchestrator's robot-execution endpoint yourself, the route a robot uses to resolve its own assets while executing:

```
// Org/tenant-scoped — not ctx.platform.baseUrl, which is the bare authority the UiPath SDK
// constructor takes.
const { baseUrl, orgId, tenantId } = ctx.platform;
const base = `${baseUrl}/${orgId}/${tenantId}/orchestrator_`;

const res = await fetch(
  `${base}/odata/Assets/UiPath.Server.Configuration.OData.GetRobotAssetByNameForRobotKey`,
  {
    method: "POST",
    headers: {
      Authorization: `Bearer ${ctx.robot.accessToken}`,
      "Content-Type": "application/json",
      "X-UIPATH-OrganizationUnitId": String(folderId),  // numeric Id, not the folder Key
    },
    body: JSON.stringify({
      robotKey: ctx.robot.key,
      assetName,
      supportsCredentialsProxyDisconnected: false,
    }),
  },
);
// -> { CredentialUsername, CredentialPassword, ... }
```

`ctx.robot` is `null` under local `serve`, so this is a deployed-only path; it works the same for HTTP triggers and jobs.

The endpoint itself is Orchestrator's

Its request shape, how to resolve the numeric folder Id from `ctx.platform.folderKey`, and what its error codes mean are Orchestrator API behavior — not this SDK's, and not covered by this repo's tests. Check Orchestrator's asset API documentation before debugging a response from it.

**Allowlist what it can read.** The robot is more privileged than the caller, so a handler that fetches whatever `assetName` arrives in the request is a confused deputy — it will hand over any credential the robot can see. Check a fixed set before the call, and return a derived result (a username, a length, a verdict) rather than the secret itself.

```
const ROBOT_READABLE = new Set(["PartnerApiCredential"]);

if (!ROBOT_READABLE.has(inp.assetName)) {
  throw new FunctionError(`"${inp.assetName}" is not readable by this function.`, 403);
}
```

______________________________________________________________________

## Pattern 2 — Delegated access

The function uses `ctx.user.accessToken` — the same OAuth token the caller sent in the `Authorization` header. The caller's Orchestrator permissions apply.

### Orchestrator setup

The calling user needs **Assets.View** on the folder containing the asset — that is the whole requirement. `AllowDirectApiAccess` does not come into it: the SDK reads through OData `GetFiltered`, which the flag does not gate, and which never returns a Credential's value however the flag is set. That is also why this pattern is for non-sensitive assets only — a limit of the route, not a setting you could switch on to lift it.

### Function code

```
import { defineFunction, FunctionError, defineSchema } from "@uipath/coded-functions-js-sdk";
import { UiPath } from "@uipath/uipath-typescript/core";
import { Assets } from "@uipath/uipath-typescript/assets";
import type { AssetGetResponse } from "@uipath/uipath-typescript/assets";

interface GetAssetInput {
  assetName: string;
  folderId: number;
}

export default defineFunction({
  name: "get-asset-delegated",
  method: "POST",
  path: "/get-asset-delegated",
  input: defineSchema<GetAssetInput>(),
  handler: async (inp, ctx) => {
    if (!ctx.user?.accessToken) {
      throw new FunctionError(
        "User access token not available — invoke from a logged-in coded app",
        403,
      );
    }

    if (!ctx.platform) {
      throw new FunctionError(
        "Platform context unavailable — local dev: set UIPATH_BASE_URL/UIPATH_ORG_ID/UIPATH_TENANT_ID",
        500,
      );
    }
    const { baseUrl, orgId, tenantId } = ctx.platform;

    const sdk = new UiPath({ baseUrl, orgName: orgId, tenantName: tenantId, secret: ctx.user.accessToken });
    await sdk.initialize(); // no-op in secret mode

    const escaped = inp.assetName.replace(/'/g, "''");
    const response = await new Assets(sdk).getAll({
      filter: `Name eq '${escaped}'`,
      folderId: inp.folderId,
    }) as { items: AssetGetResponse[] };

    return { value: response.items[0]?.value ?? null };
  },
});
```

______________________________________________________________________

## Rules that apply to both patterns

### folderId is required

`Assets.getAll()` without `folderId` calls `GetAssetsAcrossFolders` (metadata only) and silently returns `null` for all value fields. Always pass `folderId` to switch to `GetFiltered`, which returns actual values.

### AllowDirectApiAccess

An Orchestrator per-asset switch over a single route, `GET /api/Assets/name/{name}/value`. **Neither pattern on this page uses that route** — Pattern 1 goes through the robot-execution endpoint, Pattern 2 through OData — so neither needs the flag. Leave it off; for a Credential asset, off is what keeps the value readable by robots only.

### External App minimum configuration

When calling a function from a PKCE External App, the scope string must include `OR.Default`:

```
openid profile email offline_access OR.Default
```

`OR.Default` is auto-granted to any registered External App but must be explicit in the PKCE scope string. If omitted, the HTTP trigger returns 403.

### Security boundary

For **Pattern 2**, folder RBAC is the only effective security boundary. `OR.Default` (required for function invocation) already grants broad Orchestrator API access, so reducing External App scopes does not prevent users from reading assets they have folder access to.

**Pattern 1 removes that boundary by design**: the read happens under the robot's identity, so the caller's folder permissions do not apply and nothing outside your handler limits what gets read. The function's own code is the boundary — allowlist what it will fetch, and do not let the caller name the asset.

### Starting a job from a function

Use `Processes.start()` from `@uipath/uipath-typescript/processes`. The function delegates job creation to Orchestrator using the caller's token (`ctx.user.accessToken`):

```
import { defineFunction, FunctionError, defineSchema } from "@uipath/coded-functions-js-sdk";
import { UiPath } from "@uipath/uipath-typescript/core";
import { Processes } from "@uipath/uipath-typescript/processes";

interface StartJobInput {
  /** ReleaseKey UUID from /odata/Releases. */
  releaseKey: string;
  /** Arbitrary job input arguments — `unknown` values accept any JSON. */
  args?: Record<string, unknown>;
  folderId: number;
}

export default defineFunction({
  name: "start-job",
  method: "POST",
  path: "/start-job",
  input: defineSchema<StartJobInput>(),
  handler: async (inp, ctx) => {
    if (!ctx.user?.accessToken) {
      throw new FunctionError("User access token not available", 403);
    }

    if (!ctx.platform) {
      throw new FunctionError(
        "Platform context unavailable — local dev: set UIPATH_BASE_URL/UIPATH_ORG_ID/UIPATH_TENANT_ID",
        500,
      );
    }
    const { baseUrl, orgId, tenantId } = ctx.platform;

    const sdk = new UiPath({ baseUrl, orgName: orgId, tenantName: tenantId, secret: ctx.user.accessToken });
    await sdk.initialize(); // no-op in secret mode

    const results = await new Processes(sdk).start(
      {
        processKey:     inp.releaseKey,
        inputArguments: JSON.stringify(inp.args ?? {}),
        strategy:       "ModernJobsCount",
        jobsCount:       1,
      },
      inp.folderId,   // numeric folder ID — sets X-UIPATH-OrganizationUnitId automatically
    );

    return { jobId: results?.[0]?.id ?? null };
  },
});
```

**Note on folder scoping for job queries:** When listing jobs with `GET /odata/Jobs`, do **not** set `X-UIPATH-OrganizationUnitId` if the jobs may span multiple folders (e.g. when a Maestro process runs in a different folder than your storage bucket). Without the header, Orchestrator searches globally across all accessible folders.

### Platform context comes from `ctx.platform`

The runtime injects `baseUrl`, `orgId`, and `tenantId` as `ctx.platform` — callers do not need to forward them. See [Platform Context](../platform-context/#org--tenant-context-ctxplatform).

Forwarding them as `_baseUrl`/`_orgId`/`_tenantId` input fields is **deprecated**: those values are caller-controlled and can redirect the function's Orchestrator calls.
