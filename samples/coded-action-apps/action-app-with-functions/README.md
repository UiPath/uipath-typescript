# Action App With Functions

A UiPath Coded Action App for **Credential Verification**. The reviewer picks an Orchestrator asset, and a **coded function** resolves its value at runtime and hands it back to the app — including for asset types the browser cannot read at all.

This template demonstrates invoking a coded function from a coded action app with typed input and output, and using that function to reach a credential the Assets API will not return.

## Preview

<!-- TODO: record ./screenshots/preview.gif -->

---

## Why a coded function is required

The browser cannot read a `Credential` or `Secret` asset, with or without the signed-in user's token:

- A **`Credential`** asset comes back from the ordinary assets listing **without its password**. The API returns the asset's identity and metadata, never the secret half.
- A **`Secret`** asset is **omitted from the listing entirely** — a query returns no row for it at all, not a row with a blank value.
- Both are resolved only by `GetRobotAssetByNameForRobotKey`, which requires a **robot key**. That key reaches your code as `ctx.robot.key`, and only a deployed run has one.

So the function is the only place the read can happen. See [`coded-functions/lib/orchestrator.ts`](./coded-functions/lib/orchestrator.ts).

> Which field carries the value depends on the asset type: a `Credential` answers in **`CredentialPassword`** (with the client id in `CredentialUsername`), a `Secret` in **`SecretValue`**, and a `Text` asset in **`StringValue`**. Reading the wrong one returns an empty string, which looks exactly like a broken feature rather than a mismatched asset type.

> [!WARNING]
> **This app returns the resolved secret to the browser, which is a demo choice, not a production pattern.** It exists so the retrieval is visible end to end. A production reviewer app should keep the secret inside the function and return only a verdict — a SHA-256 fingerprint, the last four characters, or the result of a live token exchange. Changing that means narrowing `ReadCredentialOutput` in [`coded-functions/lib/contract.ts`](./coded-functions/lib/contract.ts); the app already treats the value as opaque.

---

## Architecture

```
action-app-with-functions/
├── action-schema.json              # the Action Center data contract
├── src/                            # the action app (React, runs in Action Center's iframe)
│   ├── uipath.ts                   # UiPath SDK + Assets + Functions + CodedActionApp
│   └── components/Form.tsx         # asset picker → invoke function → reveal
└── coded-functions/                # a separate, separately-deployed project
    ├── uipath.json                 # the functions map
    ├── lib/contract.ts             # shared I/O types (single source of truth)
    ├── lib/orchestrator.ts         # robot-identity asset read
    └── functions/read-credential.ts
```

`lib/contract.ts` is the single source of truth for the function's input and output types. The function imports it directly; the app imports it with `import type`, so the two halves share one definition and nothing is bundled across the boundary.

---

## Pre-requisites

- **Node.js** 20.x or later
- **npm** 8.x or later
- A `GITHUB_TOKEN` with the `read:packages` scope, exported in your shell. `@uipath/coded-functions-js-sdk` is published to **GitHub Packages**, not npmjs — [`coded-functions/.npmrc`](./coded-functions/.npmrc) routes the `@uipath` scope there and reads the token from the environment.

  ```bash
  gh auth refresh -h github.com -s read:packages
  export GITHUB_TOKEN=$(gh auth token)
  ```

- A **UiPath Automation Cloud** tenant with:
  - A non-confidential **External Application** (OAuth client). `OR.Default` is auto-granted and does not appear as a grantable scope, so register with the rest:

    ```bash
    uip admin external-apps create "action-app-with-functions" \
      --non-confidential \
      --redirect-uri "https://cloud.uipath.com" \
      --user-scope "OR.Assets.Read"
    ```

    An action app runs inside Action Center's iframe with a host-injected session and never performs a browser OAuth redirect, so the redirect URI only has to satisfy the CLI's required field.
  - A **Credential** asset (see step 2) in the folder the app is deployed to
- Install the [UiPath CLI](https://github.com/UiPath/cli#installation) and its tools

  ```bash
  npm i -g @uipath/cli
  uip tools install @uipath/function-tool       # uip functions ... (may already be available)
  uip tools install @uipath/codedapp-tool       # uip codedapp ...
  uip tools install @uipath/orchestrator-tool   # uip or ...
  uip login
  ```

---

## Setup

### 1. Install dependencies

```bash
npm install
cd coded-functions && npm install && cd ..
```

### 2. Create the asset

You need the **folder key** (a GUID) of the folder you will deploy to:

```bash
uip or folders list --output table
```

A `Credential` asset needs a credential store, so find one first:

```bash
uip or credential-stores list --output table
```

Then create the asset. The value is a single positional argument in **`username:password`** format — the client id and client secret:

```bash
uip or assets create "SalesforceClientSecret" "<client-id>:<client-secret>" \
  --type Credential \
  --credential-store-key <credential-store-key> \
  --folder-key <folder-key>
```

The app also works with `Secret`, `Text`, `Integer`, and `Bool` assets — the function normalises all five types onto the same output shape. Note that **`Secret` assets will not appear in the app's picker**, because the assets listing omits them entirely; to verify one, pass its name in from the automation instead of using the picker.

### 3. Deploy the function

```bash
cd coded-functions

# `pack` shells out to npm inside .uipath/server-runner/ to install
# @uipath/coded-functions-js-runtime. npm does not walk up parent directories, so
# that subdirectory cannot see coded-functions/.npmrc — GITHUB_TOKEN alone is not
# enough. Pass the registry and token as npm_config_* env vars, which do propagate
# (or put the same two lines in ~/.npmrc once).
env "npm_config_@uipath:registry=https://npm.pkg.github.com" \
    "npm_config_//npm.pkg.github.com/:_authToken=$GITHUB_TOKEN" \
    uip functions pack

uip functions publish --feed-id <folder-key>

uip or processes create \
  --name action-app-with-functions-fn \
  --package-key action-app-with-functions-fn --package-version 1.0.0 \
  --folder-key <folder-key> \
  --auto-create-triggers
cd ..
```

Publishing alone does not activate anything — the release has to point at the version before Orchestrator re-reads the manifest and syncs triggers. When you publish a new version later, recreate the process at that version.

Confirm the trigger exists:

```bash
uip or triggers list --folder-key <folder-key> --output table
```

You should see `action-app-with-functions-fn_read-credential`. A deployed function's registered name is **package-prefixed**: `read-credential` inside the `action-app-with-functions-fn` package registers as `action-app-with-functions-fn_read-credential`. Passing the bare name returns a not-found error listing what the folder actually exposes. The name is pinned in `FUNCTION_NAMES` in [`coded-functions/lib/contract.ts`](./coded-functions/lib/contract.ts).

> Schema bounds in `defineFunction` must be literal numbers, not identifiers, or the extractor silently drops the whole schema. To check after a pack:
>
> ```bash
> node -e "const e=require('./entry-points.json');for(const p of e.entryPoints)console.log(p.filePath, JSON.stringify(p.input))"
> ```

### 4. Configure `uipath.json`

Open `uipath.json` and update the clientId:

```json
{
  "scope": "OR.Default OR.Assets.Read",
  "clientId": "<external-application-clientId>"
}
```

- **`clientId`** — the App ID of your registered External Application in UiPath Cloud
- **`scope`** — the scopes required by the app. This must be a subset of the scopes granted to the external client above.
  - `OR.Default` is required to invoke the function through its HTTP trigger; without it the trigger returns `403`. It is a wildcard that grants fine-grained access based on the app's assigned role, and it must be requested explicitly even though it is auto-granted.
  - `OR.Assets.Read` is what populates the asset picker. Drop it if you switch to passing the asset name in from the automation.

`uipath.json.example` shows the full local-dev shape, including `baseUrl`. **Use the API subdomain for your environment, not the portal domain** — `https://api.uipath.com` for production, `https://alpha.api.uipath.com` for alpha, `https://staging.api.uipath.com` for staging. The portal domain sends no CORS headers and the browser blocks every call.

### 5. Deploy the action app

Build and deploy using the [`UiPath CLI`](https://uipath.github.io/uipath-typescript/coded-apps/getting-started/#deploy):

```bash
npm run build
uip codedapp pack dist -n <appName> --version 1.0.0
uip codedapp publish --type Action
uip codedapp deploy --folder-key <folder-key>
```

Deploy the app to the **same folder** as the function and the asset. The app invokes the function with the folder of the task it is opened from (`task.folderId`), and the function resolves the asset in its own folder.

---

## Action Schema

The action schema that drives this app expects the following inputs and produces the following outputs (defined in `action-schema.json`).

### Inputs

None. The reviewer picks the asset in the app, so the automation passes no input.

### Outputs

| Field | Type | Required | Description |
|---|---|---|---|
| `selectedAssetName` | string | Yes | Name of the Orchestrator asset the reviewer verified |
| `reviewerComments` | string | No | Free-text notes from the reviewer |

### Outcomes

| Outcome | Triggered by |
|---|---|
| `Approve` | Clicking the **Approve** button |
| `Reject` | Clicking the **Reject** button |

---

## SDK usage

Populating the picker. `getAll()` returns **one page per call**, so the app walks the cursor rather than reading `items.length` off a single response:

```typescript
const collected: AssetGetResponse[] = [];
let cursor: PaginationCursor | undefined;

do {
  const page: PaginatedResponse<AssetGetResponse> = await uipath.assetService.getAll({
    folderId,
    pageSize: ASSET_PAGE_SIZE,
    cursor,
  });
  collected.push(...page.items);
  cursor = page.hasNextPage ? page.nextCursor : undefined;
} while (cursor);
```

Resolving the credential through the function:

```typescript
const result = await uipath.functionService.invoke<ReadCredentialInput, ReadCredentialOutput>(
  { name: FUNCTION_NAMES.readCredential },
  { assetName: selectedAsset.name },
  { folderId },
);
```

> The `Functions` service is marked **`@experimental`** in the SDK and may change in a future release.

---

## Viewing the coded action app in Action Center

1. In **Studio Web**, add a **User Task** node to a process and set its **Action App** field to your deployed coded action app.
2. Click **Debug** to run the process — this will create an Action Center task backed by your app. The app takes no inputs, so there is nothing to fill in.
3. Open Action Center and complete the task to verify the full flow end-to-end.

--- OR ---

Create the task using an RPA workflow in **Studio Desktop** that uses the **Create App Task** activity, pointing to your deployed coded action app and passing the required inputs.

---

## Expected Results

When the app loads inside Action Center:

1. **Asset picker** — Shows the Orchestrator folder the task belongs to (read-only) and lists every asset in it, sorted by name and labelled with its type, e.g. `SalesforceClientSecret (Credential)`. `Secret` assets do not appear, because the listing omits them. If the folder has no assets, an empty-state message is shown; if the listing fails (for example a missing `OR.Assets.Read` scope), the error from Orchestrator is shown.

2. **Resolve via function** — Selecting an asset shows a **Resolve via function** button and a note explaining why the browser cannot read the value itself. Clicking it invokes `action-app-with-functions-fn_read-credential` in the task's folder. On success the panel shows:
   - the **Client ID** (from `CredentialUsername`), for `Credential` assets only
   - the **client secret**, masked behind a fixed-width placeholder with **Reveal** and **Copy** buttons. The mask length is fixed, so it does not leak the secret's length.
   - a **Resolved** chip with the timestamp from the function, alongside the asset's type, scope, last-modified time, and description

   Selecting a different asset discards the resolved credential, so a stale value is never shown against the wrong asset. If the function fails — no robot identity, asset not found, empty value — its error message is surfaced in place of the value.

3. **Completing the task** — Clicking **Approve** or **Reject** completes the Action Center task with the selected asset's name and the reviewer comments as outputs. The buttons stay disabled until an asset is selected, and while a resolve is in flight.

4. **Theme** — The app initializes in light or dark mode based on the Action Center theme preference and supports toggling via the button in the top-right corner.

5. **Read-only mode** — If the task is already completed or the current user does not have edit access, the picker, resolve button, and comments field are disabled and the Approve / Reject buttons are greyed out.

---

## Troubleshooting

| Symptom | Cause |
|---|---|
| `403` on invoke | `OR.Default` missing from the `scope` in `uipath.json` |
| Function not found, with a list of available names | The bare function name was used instead of the package-prefixed one, or the process was not created at the published version |
| `NO_ROBOT_IDENTITY` from the function | The function ran without a robot identity. A `Credential` or `Secret` asset can only be read by a deployed run, never by `uip functions run` locally |
| `ASSET_EMPTY` on a Credential asset | No value is set for this robot, or the asset is not assigned to the folder |
| A `Secret` asset is missing from the picker | Expected — the assets listing omits them. Pass its name in from the automation instead |
