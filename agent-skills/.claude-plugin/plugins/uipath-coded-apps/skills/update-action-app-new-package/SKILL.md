---
description: Migrate a UiPath coded action app from the old monolithic SDK (@uipath/uipath-typescript dev/local build) to the new split SDK (@uipath/uipath-typescript published + @uipath/uipath-ts-coded-action-apps). Use when the user asks to migrate action apps from the old UiPath SDK, update uipath-typescript, or replace a dev SDK build with the published packages.
tools: Read, Edit, Write, Glob, Grep, Bash
---

# UiPath SDK Migration

Migrate a UiPath coded action app from the old monolithic SDK to the new split SDK.

> **Communication rule**: Before editing each file, tell the user which file you are about to modify and summarise every change you plan to make to it. After editing, confirm what was changed and why.

## Pre-flight: collect required information

Before making any changes, ask the user:

> "What is the **routing name** for this app in UiPath Action Center? This will be used as the `base` path in `vite.config.ts` (e.g. `my-action-app`)."

Store the answer as `<routing-name>` and use it in Step 10.

---

## Steps

### 1. Update `package.json`

**Tell the user:** "Updating `package.json` — removing the old local `.tgz` reference for `@uipath/uipath-typescript`, pinning it to `1.1.3`, adding `@uipath/uipath-ts-coded-action-apps`, and upgrading `zod` to v4."

**Remove** the local `.tgz` reference:
```json
"@uipath/uipath-typescript": "file:../uipath-uipath-typescript-*.tgz"
```

**Add** the published packages, always using these exact versions:
```json
"@uipath/uipath-typescript": "1.1.3",
"@uipath/uipath-ts-coded-action-apps": "1.0.0-beta.1"
```

Also update `zod` to v4 — it is now a peer dependency of the new SDK rather than a direct dependency.

**Install with fallback**: Run `npm install`. If the install fails (e.g. `@uipath/uipath-ts-coded-action-apps@1.0.0-beta.1` is not resolvable from the registry), automatically fall back:
1. Ask the user to provide the path to the local `.tgz` file for `@uipath/uipath-ts-coded-action-apps`.
2. Replace the `"1.0.0-beta.1"` version with `"file:<path-to-.tgz>"` in `package.json`.
3. Run `npm install` again.
4. Tell the user which fallback path was used.

If the fallback install also fails, **stop immediately** and show the user this error — do not proceed with any further migration steps:

> **Error: `@uipath/uipath-ts-coded-action-apps` could not be installed.**
>
> This package is required for the migration. Installation was attempted in two ways:
> 1. From the npm registry (`1.0.0-beta.1`) — failed.
> 2. From the local `.tgz` file you provided — also failed.
>
> Please resolve the installation issue before retrying the migration. Common causes:
> - The `.tgz` path was incorrect or the file is corrupted — verify the file exists and re-run.
> - Registry access issues — check your npm config / VPN / proxy settings.
>
> Migration has been aborted. No files have been modified beyond `package.json`.

Otherwise, tell the user once install succeeds: "Dependencies installed successfully."

---

### 2. Rewrite the UiPath setup file (`src/uipath.ts`)

**Tell the user:** "Rewriting `src/uipath.ts` — replacing the monolithic `UiPath` import with subpath imports, removing manual config/token refresh, and exporting a named-property object with each service instance."

**Old pattern** — monolithic import, required manual config passed at runtime, exported a reinit function:
```typescript
import { UiPath } from '@uipath/uipath-typescript';

let sdk = new UiPath({ baseUrl, orgName, tenantName, secret });

export const initializeSdk = (config) => { sdk = new UiPath({ ...config }); };
export default sdk;
```

**New pattern** — split subpath imports, no config required, services instantiated from the core client:
```typescript
import { UiPath } from '@uipath/uipath-typescript/core';
import { <ServiceClass> } from '@uipath/uipath-typescript/<service-subpath>';
// ... repeat for each service the app uses
import { CodedActionAppsService } from '@uipath/uipath-ts-coded-action-apps';

const sdk = new UiPath();                          // no config needed
const codedActionAppsService = new CodedActionAppsService();
const <serviceName> = new <ServiceClass>(sdk);    // pass sdk to each service
// ... repeat for each service used

export default { codedActionAppsService, <serviceName>, ... };
```

Key points:
- `UiPath` is now imported from `@uipath/uipath-typescript/core`, not the package root.
- Each SDK service has its own subpath import — use the **SDK Module Import Table** in the [SDK Reference](#sdk-reference) section below. Do NOT inspect `node_modules` or the SDK source.
- `CodedActionAppsService` comes entirely from `@uipath/uipath-ts-coded-action-apps`.
- The `initializeSdk` export and any manual token-refresh logic (`sdk.updateToken`) are no longer needed — remove them.
- **Before writing any service code, read the relevant reference file** from `../create-app/references/` (see the [Reference Files](#reference-files) table in the SDK Reference section).

---

### 3. Update component imports

**Tell the user:** "Updating component imports — removing `initializeSdk` and old SDK utility imports, adding `Theme` and `MessageSeverity` from `@uipath/uipath-ts-coded-action-apps`."

**Remove:**
- `import sdk, { initializeSdk } from '../uipath'`
- Any utility functions that were workarounds for old SDK limitations (e.g., asset URL resolution helpers)

**Add:**
```typescript
import uipath from '../uipath';
import { Theme, MessageSeverity } from '@uipath/uipath-ts-coded-action-apps';
```

---

### 4. Replace task initialization pattern

**Tell the user:** "Replacing the old callback-based task init with the new promise-based `codedActionAppsService.getTask()` call. Removing the `actionCenterData` state and adding `folderId` and `isReadOnly` states in its place."

**Old — callback-based, requires manual SDK re-init inside callback:**
```typescript
useEffect(() => {
  sdk.taskEvents.getTaskDetailsFromActionCenter((data) => {
    initializeSdk({ baseUrl: data.baseUrl, ... });
    if (data.newToken) sdk.updateToken(data.newToken);
    setFormData(data.data);
    setActionCenterData(data);
  });
  sdk.taskEvents.initializeInActionCenter();
}, []);
```

**New — promise-based, SDK self-configures:**
```typescript
const [isReadOnly, setIsReadOnly] = useState(false);
const [folderId, setFolderId] = useState<any>(null);

useEffect(() => {
  uipath.codedActionAppsService.getTask().then((task) => {
    if (task.data) setFormData(task.data as FormData);
    setFolderId(task.folderId);          // replaces actionCenterData.organizationUnitId
    setIsReadOnly(task.isReadOnly);
    // optional: propagate theme to parent
    // onInitTheme(isDarkTheme(task.theme));
  });
}, []);
```

- Replace all uses of `actionCenterData.organizationUnitId` with the `folderId` state.
- Remove the `actionCenterData` state entirely.

---

### 5. Replace task event methods

**Tell the user:** "Updating task event call sites — replacing `sdk.taskEvents.completeTask` with the async `uipath.codedActionAppsService.completeTask`, and `sdk.taskEvents.dataChanged` with `uipath.codedActionAppsService.setTaskData`. Making affected handlers `async`."

| Old | New |
|-----|-----|
| `sdk.taskEvents.completeTask(action, data)` | `await uipath.codedActionAppsService.completeTask(action, data)` |
| `sdk.taskEvents.dataChanged(data)` | `uipath.codedActionAppsService.setTaskData(data)` |
| *(no equivalent)* | `uipath.codedActionAppsService.showMessage(msg, MessageSeverity.Error\|Info\|Warning)` |

Make action handlers async since `completeTask` is now a promise.

---

### 6. Update SDK service call sites

**Tell the user:** "Updating all SDK service call sites — switching from `sdk.<oldNamespace>.*` to `uipath.<serviceName>.*`. Checking for deprecated methods in the new SDK's TypeScript definitions and replacing them with their documented replacements."

For each SDK service used in the app:

1. Update the call site to use the new service instance from `uipath.<serviceName>` instead of `sdk.<oldNamespace>`.
2. **Read the relevant `../create-app/references/` file** (see the [Reference Files](#reference-files) table) for the service's current method signatures. Only fall back to inspecting `node_modules` type definitions if the reference file does not cover the specific method or type you need.
3. If a method the app was calling does not appear in the reference file, check whether it has been renamed or removed — use the documented replacement.
4. The method signatures are generally the same unless renamed; only the access path changes.

---

### 7. Handle theme from task (optional)

**Tell the user:** "Removing any `ThemeContext` or `localStorage` theme logic and replacing it with `task.theme` from `getTask()`, using the `Theme` enum from `@uipath/uipath-ts-coded-action-apps`."

If the app supports light/dark theming:

```typescript
import { Theme } from '@uipath/uipath-ts-coded-action-apps';

const isDarkTheme = (theme: Theme): boolean =>
  theme === Theme.Dark || theme === Theme.DarkHighContrast;

// Inside getTask().then():
onInitTheme(isDarkTheme(task.theme));
```

Remove any `ThemeContext` / `localStorage`-based theme logic and drive the theme from `task.theme` instead.

---

### 8. Apply `isReadOnly` to form inputs

**Tell the user:** "Adding `isReadOnly` guards to change handlers and JSX inputs/textareas, and gating action buttons on `!isReadOnly`."

The new SDK exposes `task.isReadOnly`. Guard mutations and mark inputs accordingly:

```typescript
const handleChange = (e) => {
  if (isReadOnly) return;
  // ... existing logic
  uipath.codedActionAppsService.setTaskData(updatedData);
};

// In JSX:
<input readOnly={isReadOnly} ... />
<textarea readOnly={isReadOnly} ... />
```

Also gate action buttons on `!isReadOnly` in your form-valid check.

---

### 9. Remove SDK workaround utilities

**Tell the user:** "Removing runtime asset-URL helper utilities that were workarounds for the old SDK. Replacing their usages with direct bundler asset imports."

The old SDK required runtime helpers to work around its limitations (e.g., resolving bundled asset base URLs). These are no longer needed. Delete them and use direct bundler asset imports instead:

```typescript
// Old — runtime workaround
<img src={someHelperFn(assetPath)} />

// New — direct import, bundler handles it
import assetFile from '../assets/file.svg';
<img src={assetFile} />
```

---

### 10. Update `vite.config.ts`

**Tell the user:** "Updating `vite.config.ts` — setting `base` to `/<routing-name>` (the routing name you provided) so assets resolve correctly when the app is served under its Action Center path."

Add the `base` path using the routing name collected in the pre-flight step:
```typescript
base: "/<routing-name>"  // the routing name provided by the user
```

---

## SDK Reference

> Reference files live in the `create-app` skill: `../create-app/references/`. Always read the relevant file before writing or updating any service code. Only fall back to inspecting `node_modules` type definitions if the reference files do not cover what you need.

---

### SDK Module Import Table

| Subpath | Classes |
|---------|---------|
| `@uipath/uipath-typescript/core` | `UiPath`, `UiPathError`, pagination types |
| `@uipath/uipath-typescript/entities` | `Entities`, `ChoiceSets` |
| `@uipath/uipath-typescript/buckets` | `Buckets` |
| `@uipath/uipath-typescript/assets` | `Assets` |
| `@uipath/uipath-typescript/tasks` | `Tasks` |
| `@uipath/uipath-typescript/queues` | `Queues` |
| `@uipath/uipath-typescript/processes` | `Processes` |
| `@uipath/uipath-typescript/maestro-processes` | `MaestroProcesses` |
| `@uipath/uipath-typescript/conversational-agent` | `ConversationalAgent`, `Exchanges`, `Messages` |
| `@uipath/uipath-ts-coded-action-apps` | `CodedActionAppsService`, `Theme`, `MessageSeverity` |

Types, enums, and option interfaces are exported from the same subpath as their service class.

---

### Reference Files

**MANDATORY — read the reference file for each service the app uses** before updating any service call site.

| Reference | Services | When to read |
|-----------|----------|--------------|
| [data-fabric.md](../create-app/references/data-fabric.md) | `Entities`, `ChoiceSets` | App reads/writes Data Fabric entities — **ask the user whether entities are tenant-scoped or folder-scoped; add `OR.Users` only if folder-scoped** |
| [orchestrator.md](../create-app/references/orchestrator.md) | `Assets`, `Queues`, `Buckets`, `Processes` | App uses Orchestrator resources |
| [action-center.md](../create-app/references/action-center.md) | `Tasks` | App creates, assigns, or completes Action Center tasks |
| [maestro.md](../create-app/references/maestro.md) | `MaestroProcesses`, `ProcessInstances`, `Cases` | App monitors or manages process/case instances |
| [patterns.md](../create-app/references/patterns.md) | polling, BPMN | App needs polling or process variable display |
| [oauth-scopes.md](../create-app/references/oauth-scopes.md) | All | Always when `@uipath/uipath-typescript` is used |
| [conversational-agent.md](../create-app/references/conversational-agent.md) | `ConversationalAgent` | App uses real-time AI chat |
| [pagination.md](../create-app/references/pagination.md) | All paginated services | App has any list view |

---

### Anti-Patterns — NEVER Do These

- **Prefer `../create-app/references/` over `node_modules`** — always check the reference files first. Only fall back to inspecting `node_modules` type definitions if the reference files do not cover the specific method or type you need.
- **NEVER import service classes from the root package** (`import { Entities } from '@uipath/uipath-typescript'`). Service classes are only available via subpath imports.
- **NEVER use deprecated dot-chain access** like `sdk.entities.getAll()`. Always use constructor-based DI: `const entities = new Entities(sdk)`.
- **NEVER guess field names** on response objects. Import the response type and read its interface from the reference file.
- **NEVER add `offline_access` to the scopes string.** Only use scopes from `../create-app/references/oauth-scopes.md`.
- **Ask the user whether their Data Fabric `Entities` are tenant-scoped or folder-scoped before finalising scopes.** Only add `OR.Users` if they confirm folder-scoped — it is not needed for tenant-scoped entities.

---

## Checklist

- [ ] `package.json`: local tgz replaced with published packages; zod updated to v4
- [ ] `src/uipath.ts`: rewritten with subpath imports, no config, services exported as named properties
- [ ] `initializeSdk` export and `sdk.updateToken` calls removed
- [ ] Task init: callback pattern replaced with `codedActionAppsService.getTask()` promise
- [ ] `actionCenterData` state removed; `folderId` state added in its place
- [ ] Action handlers made async; `completeTask` awaited
- [ ] `dataChanged` → `setTaskData`
- [ ] All service call sites updated to new access path; deprecated methods replaced per SDK type definitions
- [ ] `isReadOnly` state wired to inputs and action buttons
- [ ] SDK workaround utilities removed; direct bundler asset imports used
- [ ] `ThemeContext` removed if present; theme driven by `task.theme`
- [ ] `vite.config.ts`: `base` path added
- [ ] `npm install` run after package changes
- [ ] `uipath.json` created/updated with `clientId` and `scope`

---

## Warning: Input fields must be read-only

After migration is complete, show the user this warning:

> **Important — action-schema.json field types determine editability.**
>
> Maestro and Agents only track the declared **inputs**, **outputs**, and **inouts** of each stage — they read input values coming in and forward output/inout values to the next stage.
>
> Follow these rules when rendering form fields:
>
> | `action-schema.json` type | Editable in form? |
> |---------------------------|-------------------|
> | `input`                   | No — render as **read-only** |
> | `output`                  | Yes — user fills this in |
> | `inout`                   | Yes — pre-populated from upstream, user can modify |
>
> If you allow users to edit a pure **input** field, those changes are silently ignored — Maestro/the Agent always uses the original value passed in from the previous stage, causing a mismatch between what the user sees and what is forwarded downstream.
>
> ```tsx
> // input fields → always read-only
> <input readOnly value={inputField} />
>
> // output and inout fields → editable
> <input value={outputOrInoutField} onChange={handleChange} />
> ```

---

## Final step: create or update `uipath.json`

### Step A — Determine SDK usage

Check whether `@uipath/uipath-typescript` is present in the project's `package.json` dependencies after migration. Store the result as `<sdk-used>` (true/false).

### Step B — Read any existing values

Check whether `uipath.json` already exists and, if so, read the current `clientId` and `scope` fields:

```bash
# Check for uipath.json and print clientId / scope if present
if [ -f uipath.json ]; then
  echo "exists"
  node -e "const f=require('./uipath.json'); console.log('clientId='+f.clientId); console.log('scope='+f.scope);"
else
  echo "not found"
fi
```

Store any non-empty values found as `<existing-client-id>` and `<existing-scope>`.

---

### Case 1: SDK not used (`<sdk-used>` = false)

**Tell the user:** "The TypeScript SDK (`@uipath/uipath-typescript`) is not used in this app. Writing `uipath.json` with empty credential fields — no External Application is required."

Create/overwrite `uipath.json` in the project root:

```json
{
  "scope": "",
  "clientId": "",
  "orgName": "",
  "tenantName": "",
  "baseUrl": "",
  "redirectUri": ""
}
```

---

### Case 2: SDK is used (`<sdk-used>` = true)

#### Step C — Collect clientId

- If `<existing-client-id>` is **non-empty**, tell the user:
  > "Found existing `clientId`: `<existing-client-id>`. I'll use this value. Reply **change** if you want to provide a different one."
  - If they reply "change", proceed to ask below.
  - Otherwise store `<existing-client-id>` as `<client-id>`.

- If `<existing-client-id>` is **empty**, ask:
  > "What is the **Client ID** of your UiPath External Application?
  >
  > If you haven't created one yet:
  > 1. Go to **UiPath Automation Cloud** → your org → **Admin** → **External Applications**.
  > 2. Click **Add Application**, choose type **Non-confidential**.
  > 3. Under **Scopes**, grant the OAuth scopes your app needs (e.g. `OR.Tasks OR.Tasks.Read OR.Folders`).
  > 4. Under **Redirect URIs**, add:
  >    `https://cloud.uipath.com/<orgName>/<tenantName>/actions_`
  >    (replace `<orgName>` and `<tenantName>` with your actual org slug and tenant name)
  > 5. Save and copy the **Client ID** shown."

  Store the answer as `<client-id>`.

#### Step D — Collect scope

- If `<existing-scope>` is **non-empty**, tell the user:
  > "Found existing `scope`: `<existing-scope>`. I'll use this value. Reply **change** if you want to provide a different one."
  - If they reply "change", proceed to ask below.
  - Otherwise store `<existing-scope>` as `<scope>`.

- If `<existing-scope>` is **empty**, ask:
  > "What OAuth scopes does this app need? (e.g. `OR.Tasks OR.Tasks.Read OR.Folders`)"

  Store the answer as `<scope>`.

#### Step E — Write `uipath.json`

Create/overwrite `uipath.json` in the project root:

```json
{
  "scope": "<scope>",
  "clientId": "<client-id>",
  "orgName": "",
  "tenantName": "",
  "baseUrl": "",
  "redirectUri": ""
}
```

**Tell the user** after writing: "Written `uipath.json` with your `clientId` and `scope`."

> **Important — redirect URI.**
> When registering (or verifying) your External Application in UiPath Automation Cloud, confirm the redirect URI is set to:
>
> `https://cloud.uipath.com/<orgName>/<tenantName>/actions_`
>
> Replace `<orgName>` and `<tenantName>` with your actual org slug and tenant name. Without the correct redirect URI the OAuth flow will fail when the app loads in Action Center.
