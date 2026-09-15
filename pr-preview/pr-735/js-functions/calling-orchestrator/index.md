# Calling Orchestrator

Two patterns for reading Orchestrator assets from a JS Function. Choose based on whether the asset is sensitive.

```
Is the asset sensitive (credentials, API keys, shared secrets)?
│
├─ Yes → Pattern 1: Secret Vault
│         Function reads with its own platform token.
│         Calling user has zero folder access required.
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

`ctx.robot` and `ctx.platform` are `null` locally. Set these variables before starting the server — the runtime builds `ctx.platform` from the `UIPATH_BASE_URL`/`UIPATH_ORG_ID`/`UIPATH_TENANT_ID` fallback, and your code reads `UIPATH_ACCESS_TOKEN` for the token. Deno runtime reads `.env` natively; for Node, load env vars in your shell — see [Getting Started — local dev](../getting-started/#2-run-locally).

```
UIPATH_ACCESS_TOKEN=<valid OAuth token with Assets.View on the folder>
UIPATH_BASE_URL=https://cloud.uipath.com
UIPATH_ORG_ID=<org-UUID>
UIPATH_TENANT_ID=<tenant-UUID>
```

______________________________________________________________________

## Pattern 2 — Delegated access

The function uses `ctx.user.accessToken` — the same OAuth token the caller sent in the `Authorization` header. The caller's Orchestrator permissions apply.

### Orchestrator setup

The calling user must have **Assets.View** on the folder containing the asset.

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

### AllowDirectApiAccess flag

This flag is **irrelevant** for OData endpoints. It is only enforced on `/api/Assets/name/{name}/value`, which the SDK never calls. Do not add it to your Orchestrator setup.

### External App minimum configuration

When calling a function from a PKCE External App, the scope string must include `OR.Default`:

```
openid profile email offline_access OR.Default
```

`OR.Default` is auto-granted to any registered External App but must be explicit in the PKCE scope string. If omitted, the HTTP trigger returns 403.

### Security boundary

Folder RBAC is the only effective security boundary. `OR.Default` (required for function invocation) already grants broad Orchestrator API access. Reducing External App scopes does not prevent users from reading assets if they have folder access.

### OData filter: single-quote string and GUID values

All string and GUID comparisons in OData `$filter` must use single quotes. Missing quotes cause `400 Bad Request` which the SDK or raw fetch may silently return as an empty list.

```
// ❌ 400 Bad Request — GUID treated as unquoted token
const filter = `CreatorUserKey eq ${userId}`;

// ✅ correct
const escaped = value.replace(/'/g, "''");   // escape embedded single quotes
const filter  = `Name eq '${escaped}'`;
const filter2 = `CreatorUserKey eq '${userId}'`;
```

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
