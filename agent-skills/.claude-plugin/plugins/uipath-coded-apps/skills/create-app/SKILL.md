---
description: Use when the user asks to create a new UiPath web app, build a React dashboard with UiPath data, add UiPath SDK services (@uipath/uipath-typescript) to an existing React project, or deploy a coded app to UiPath Cloud. Covers project scaffolding, OAuth authentication, SDK service integration (Entities, Tasks, Processes, Assets, Queues, Buckets, Maestro, Conversational Agent), pagination, polling, BPMN rendering, real-time chat with AI agents, and deployment via UiPath CLI.
allowed-tools: Bash, Read, Write, Edit, Glob, Grep, AskUserQuestion, Task, mcp__playwright__browser_navigate, mcp__playwright__browser_snapshot, mcp__playwright__browser_evaluate, mcp__playwright__browser_console_messages, mcp__playwright__browser_network_requests, mcp__playwright__browser_click, mcp__playwright__browser_type, mcp__playwright__browser_press_key, mcp__playwright__browser_select_option, mcp__playwright__browser_close, mcp__playwright__browser_tabs
---

# Creating UiPath Coded Apps

## 1. Project Initialization

### Step 1: Ask for environment, org, tenant, and whether they have a client ID

Use a **single** `AskUserQuestion` call with exactly these 4 questions:

```
Question 1:
  question: "Which UiPath environment?"
  header: "Environment"
  options:
    - label: "cloud (Recommended)"   description: "Production — cloud.uipath.com"
    - label: "staging"               description: "Staging — staging.uipath.com"
    - label: "alpha"                 description: "Alpha — alpha.uipath.com"
  multiSelect: false

Question 2:
  question: "What is your UiPath organization name?"
  header: "Org name"
  options:
    - label: "I'll type it"   description: "Select Other and type your org name"
    - label: "Find from browser"   description: "I'm logged into UiPath — read org from URL"
  multiSelect: false

Question 3:
  question: "What is your UiPath tenant name?"
  header: "Tenant"
  options:
    - label: "DefaultTenant"   description: "Most common default tenant name"
    - label: "I'll type it"   description: "Select Other and type your tenant name"
  multiSelect: false

Question 4:
  question: "Do you have an existing OAuth client ID for this app?"
  header: "Client ID"
  options:
    - label: "Yes, I'll provide it"   description: "I already have a client ID — select Other and paste it"
    - label: "No, create one for me"  description: "Use browser automation to create one in UiPath admin"
  multiSelect: false
```

### Step 1.5: Ensure Playwright MCP Availability

**IMPORTANT: This skill uses Playwright MCP (`mcp__playwright__*`) for all browser automation. Do NOT use `mcp__claude-in-chrome__*` tools.**

Before any browser automation step (org name from browser, client ID creation), verify Playwright MCP is available by attempting `mcp__playwright__browser_snapshot`.

**If Playwright MCP tools are NOT available:**

1. **Check for `.mcp.json`** in the project root:
   ```
   Use Glob to find: **/.mcp.json
   ```

2. **If `.mcp.json` does not exist**, create it:
   ```
   Use Write to create .mcp.json at the project root with:
   {
     "mcpServers": {
       "playwright": {
         "command": "npx",
         "args": ["@playwright/mcp@latest"]
       }
     }
   }
   ```

3. **If `.mcp.json` already exists but doesn't have the playwright server**, read it and add the playwright entry to the `mcpServers` object.

4. After creating/updating `.mcp.json`, tell the user:
   > **I've added the Playwright MCP server configuration to your project's `.mcp.json`. Please restart Claude Code for the MCP server to become available, then run this skill again.**

   **IMPORTANT**: MCP servers are loaded when Claude Code starts — a newly created `.mcp.json` won't take effect until the session is restarted. Do NOT proceed with browser automation if you just created the file.

5. **Only skip browser automation** if the `.mcp.json` already had the playwright server configured AND the tools still aren't available. In that case, ask the user to provide the values manually.

### Step 2: Resolve the org name

**If user typed their org name or selected "Other":** Use the value they provided.

**If user selected "Find from browser":** Use `mcp__playwright__browser_navigate` to go to the UiPath cloud host for the chosen environment (e.g., `https://staging.uipath.com`). Take a `mcp__playwright__browser_snapshot` — if the user is logged in, the URL or page content will contain the org name. Extract it from the URL path (it's the first segment after the domain: `https://staging.uipath.com/{orgName}/...`).

### Step 3: Get or create the client ID

**If the user provided a client ID** (selected "Other" and pasted it): Use it directly.

**If the user chose "No, create one for me":** First determine which OAuth scopes are needed based on the services the app will use (read `references/oauth-scopes.md`). Then **read [oauth-client-setup.md](references/oauth-client-setup.md) and follow it exactly** to create an External Application via Playwright MCP browser automation. That reference has all the step-by-step browser interaction details.

### Step 4: Run setup script

Once you have all values (org, tenant, client ID, environment, scopes), run the setup script.

**Script paths:** The setup script is in this skill's `scripts/` subdirectory. Use the **"Base directory for this skill"** path shown at the top when this skill was loaded — that is the absolute path to this skill's directory.

```bash
bash <skill-base-dir>/scripts/setup.sh <app-name> <org-name> <tenant-name> <client-id> "<scopes>" <environment>
```

**IMPORTANT — Bash tool timeout:** The setup script runs `npx create-vite` and `npm install`, which can take several minutes. **Always set `timeout: 300000`** (5 minutes) on the Bash tool call to avoid a premature timeout. The default 2-minute timeout is not enough for npm operations.

All 4 required values are passed as positional arguments — the script has no interactive prompts.

It creates the full project:
- Vite project with React + TypeScript template
- `.env` with UiPath OAuth configuration (see `.env` structure below)
- `src/hooks/useAuth.tsx` — auth hook handling OAuth callback detection (`sdk.isInOAuthCallback()` / `sdk.completeOAuth()`) and login (`sdk.initialize()`)
- `src/App.tsx` — wraps app with `<AuthProvider config={authConfig}>`, builds `UiPathSDKConfig` from env vars
- Tailwind CSS configured with directives in `src/index.css`

### `.env` structure

The `.env` file uses this structure:

```env
UIPATH_BASE_URL=https://api.uipath.com
UIPATH_REDIRECT_URI=http://localhost:5173
UIPATH_ORG_NAME=<org-name>
UIPATH_TENANT_NAME=<tenant-name>

VITE_UIPATH_BASE_URL=${UIPATH_BASE_URL}
VITE_UIPATH_REDIRECT_URI=${UIPATH_REDIRECT_URI}
VITE_UIPATH_CLIENT_ID=<client-id>
VITE_UIPATH_ORG_NAME=<org-name>
VITE_UIPATH_TENANT_NAME=<tenant-name>
VITE_UIPATH_SCOPES=<scopes>
```

**Why `${}` for BASE_URL and REDIRECT_URI only:** When the app is deployed via the UiPath CLI, the CLI overwrites `UIPATH_BASE_URL` and `UIPATH_REDIRECT_URI` with production values. The `VITE_` versions reference them via `${}` so they automatically pick up the new values. The other variables (client ID, org, tenant, scopes) are set directly.

**Port availability:** Before writing `http://localhost:5173` as the redirect URI, check that port 5173 is free (e.g., `lsof -i :5173`). If it's in use, pick the port which you get on doing npm run dev and put that in `UIPATH_REDIRECT_URI`. and then stop npm run dev server

### Build workflow — start writing immediately after setup

**Do NOT run the validate script.** The setup script is deterministic — proceed directly to building.

**Execute these steps in order immediately after setup completes:**

1. **Read the reference files** for the services you already chose scopes for (you decided the services when picking scopes — use the same list). Do NOT read scaffolded files (`useAuth.tsx`, `App.tsx`, `vite.config.ts`, `.env`) — this skill documents their contents.
2. **Write `src/App.tsx`** — replace the generated one with the actual layout (sidebar, main content area, routing). Define component imports and shared state here.
3. **Write components one by one** — simplest first (list views), then complex (detail panels). Each component you write can reference previous ones, keeping exports consistent.
4. **Run `npm run build`** — fix all TypeScript errors before proceeding (see "Build verification" below).
5. **Run the dev server** — verify the app starts (see "Local smoke test" below).

**Do NOT:**
- Re-read files you just wrote to "review quality"

### Build verification — MANDATORY before starting dev server

After writing all components, **always run `npm run build` first** to catch TypeScript errors:

```bash
cd <app-name> && npm run build
```

This runs `tsc -b && vite build` which performs full TypeScript type-checking. The dev server (`npm run dev`) does NOT type-check — it only transpiles, so type errors silently pass. Common errors caught by build:
- **TS6133 (unused imports/variables)** — remove them
- **TS2322 (type mismatch)** — e.g., passing `string` where `PaginationCursor` is expected
- **TS2345 (argument type mismatch)** — e.g., wrong types for SDK method parameters

**Fix ALL errors before proceeding.** Re-run `npm run build` after each fix until it succeeds with zero errors.

### Local smoke test

After the build succeeds, run the dev server to verify the app starts:

```bash
cd <app-name> && npm run dev
```

Run this in the background. Wait a few seconds for Vite to start, then check the output for:
- **Success**: `Local: http://localhost:<port>` — the app is running. Report the URL to the user.
- **Failure**: runtime errors or missing dependencies — fix them before considering the task done.

**IMPORTANT — verify the port matches the redirect URI:** Vite may start on a different port than 5173 if that port is busy (e.g., 5174, 5175). Check the actual port in Vite's output. If it differs from `UIPATH_REDIRECT_URI` in `.env`, update `.env` to match (e.g., `UIPATH_REDIRECT_URI=http://localhost:5174`). OAuth will fail silently if the redirect URI doesn't match the running port.

If there are errors, fix the issues, re-run `npm run build` to verify, then re-run `npm run dev`. Do not mark the task as complete until both the build succeeds and the dev server starts.

## 2. UiPath Services Overview

Understand what each service area represents before using its SDK module:

- **Orchestrator Processes** — the core execution unit in UiPath. A "process" can be an RPA automation, an agentic process (AI agent), or a case management process. **To start any of these — including Maestro processes, cases, or agents — use `Processes.start()`** from `@uipath/uipath-typescript/processes`. The SDK does not have a dedicated agent service, but agents are processes and can be started the same way.
- **Buckets** — cloud storage buckets used by automations to store and retrieve files (documents, data exports, etc.).
- **Assets** — key-value configuration stored in Orchestrator (credentials, settings, connection strings) that automations read at runtime.
- **Queues** — work queues that hold transaction items for automations to process (e.g., invoice records, customer requests).
- **Entities (Data Fabric)** — structured data tables in UiPath's Data Service. Think of them as database tables with schema, records, and relationships. ChoiceSets are enum-like picklists for entity fields.
- **Tasks (Action Center)** — human-in-the-loop tasks or escalations created by automations when human input/approval is needed. Users can create, assign, reassign, and complete tasks. **To check if a process instance is pending on a HITL task**, use `getVariables()` + `getBpmn()` to detect if the current BPMN element is a `userTask` — see the "HITL Detection" section in [patterns.md](references/patterns.md). To get the actual task details, use `tasks.getAll({ filter: "CreatorJobKey eq ${instanceId}" })` where `instanceId` is the Maestro process instance ID — see [action-center.md](references/action-center.md). There is NO shortcut from the instance's `latestRunStatus` alone — a process waiting on HITL still shows as "Running".
- **Maestro Processes & Cases** — orchestration layer for complex workflows. MaestroProcesses are monitored process definitions; ProcessInstances are running executions. Cases are long-running business cases with stages. **To start a Maestro process or case, use `Processes.start()`** (they are Orchestrator processes underneath).
- **Process Incidents** — errors or exceptions that occur during process instance execution.
- **Conversational Agent** — real-time chat with UiPath AI agents via WebSocket. Discover available agents, create conversations, send/receive streaming messages, handle tool call confirmations, upload file attachments, and retrieve conversation history with feedback.

## 3. SDK Module Import Table

| Subpath | Classes |
|---------|---------|
| `@uipath/uipath-typescript/core` | `UiPath`, `UiPathError`, `UiPathSDKConfig`, pagination types |
| `@uipath/uipath-typescript/entities` | `Entities`, `ChoiceSets` |
| `@uipath/uipath-typescript/tasks` | `Tasks` |
| `@uipath/uipath-typescript/maestro-processes` | `MaestroProcesses`, `ProcessInstances`, `ProcessIncidents` |
| `@uipath/uipath-typescript/cases` | `Cases`, `CaseInstances` |
| `@uipath/uipath-typescript/assets` | `Assets` |
| `@uipath/uipath-typescript/queues` | `Queues` |
| `@uipath/uipath-typescript/buckets` | `Buckets` |
| `@uipath/uipath-typescript/processes` | `Processes` |
| `@uipath/uipath-typescript/conversational-agent` | `ConversationalAgent`, `Exchanges`, `Messages` |

Types, enums, and option interfaces are exported from the same subpath as their service class.

## 4. Type-Driven Development Rules

When using any SDK service method, follow these rules strictly:

1. **Always import the response type** from the same subpath as the service class. Example: `import type { AssetGetResponse } from '@uipath/uipath-typescript/assets'`
2. **Read the imported interface** to know what fields are available. Only access properties defined in the type. Never guess field names.
3. **Import option types** for method parameters. Example: `import type { AssetGetAllOptions } from '@uipath/uipath-typescript/assets'`
4. **Import enums** from the SDK for any field that uses an enum value. Example: `import { TaskPriority, TaskType, TaskStatus } from '@uipath/uipath-typescript/tasks'`
5. **Use `OperationResponse<T>`** type for mutation results (import from `@uipath/uipath-typescript`). Has shape `{ success: boolean; data: T }`.
6. **Method-attached responses**: Some `getById`/`getAll` responses include callable methods. The response type is a union: `EntityGetResponse = RawEntityGetResponse & EntityMethods`. Read the `*Methods` interface to know available instance methods.
7. **Reference files are your primary source.** The `references/` files in this skill contain all method signatures, types, enums, and fields you need. **Do NOT explore `node_modules` or the SDK source code if the information is already in a reference file.** Only fall back to `node_modules/@uipath/uipath-typescript/` as a last resort when the reference files don't cover something (e.g., a newly added method or an edge case not documented). Check `.d.ts` files for types if you must.

## 5. Anti-Patterns — NEVER Do These

- **NEVER import service classes from the root package** (`import { Entities } from '@uipath/uipath-typescript'`). Service classes are only available via subpath imports: `@uipath/uipath-typescript/entities`, `/tasks`, `/processes`, etc. The root export only has the deprecated legacy `UiPath` class and type interfaces.
- **NEVER use deprecated dot-chain access** like `sdk.entities.getAll()` or `sdk.maestro.processes.instances.getVariables(...)`. The legacy `UiPath` class from `@uipath/uipath-typescript` supports this but it is **deprecated**. Always use constructor-based DI: `import { UiPath } from '@uipath/uipath-typescript/core'` and `const entities = new Entities(sdk)`.
- **NEVER guess field names** on response objects. Import the response type and read its interface. Fields differ across services and don't follow a single pattern.
- **NEVER hardcode `VITE_UIPATH_BASE_URL` or `VITE_UIPATH_REDIRECT_URI`.** These two must reference their `UIPATH_` counterparts via `${}` (e.g., `VITE_UIPATH_BASE_URL=${UIPATH_BASE_URL}`) so the CLI can overwrite them during deployment. Other `VITE_` vars (`CLIENT_ID`, `ORG_NAME`, `TENANT_NAME`, `SCOPES`) are set directly.
- **NEVER add `offline_access` to the scopes string.** It is not a valid scope for this SDK. Only use scopes from `references/oauth-scopes.md`.
- **NEVER pass `expand: 'TaskSource'` to `tasks.getAll()`.** The `taskSource` field is a direct property on the task response — NOT an OData navigation property. Passing it as an expand value causes a backend error ("Could not find a property named 'TaskSource'"). The SDK already expands `AssignedToUser`, `CreatorUser`, and `LastModifierUser` by default. Only pass `expand` for valid OData navigation properties (e.g., `'TaskAssignments'`).
- **NEVER use `taskSource`, `taskSourceMetadata`, `tags`, or `parentOperationId` to correlate tasks with process instances.** These fields are unreliable for instance-to-task mapping. The correct approach is to filter tasks by `CreatorJobKey`: `tasks.getAll({ filter: "CreatorJobKey eq ${instanceId}" })` where `instanceId` is the Maestro process instance ID.
- **NEVER call paginated methods without `pageSize`** for production use. Unpaginated calls fetch all records and can be slow or hit limits.
- **NEVER store or manage tokens manually.** The SDK handles token persistence in `sessionStorage` and automatic refresh on 401. Do not read/write `sessionStorage` for auth tokens.
- **NEVER call `sdk.initialize()` more than once.** It triggers the full OAuth redirect. Use `sdk.isAuthenticated()` or `useAuth().isAuthenticated` to check status first.
- **NEVER mix `folderId` (number) with `folderKey` (string), and NEVER use `parseInt(folderKey)` to convert between them.** They are completely different identifiers — `folderKey` is a GUID string (e.g., `"a1b2c3d4-..."`), `folderId` is a numeric ID (e.g., `14518163`). `parseInt` on a GUID returns `NaN`. Orchestrator services (Assets, Queues, Buckets, Processes) use numeric `folderId`. Maestro services (ProcessInstances, CaseInstances) use string `folderKey`. When you have a `folderKey` from Maestro but need a `folderId` for Orchestrator (e.g., to call `Processes.start()`), use the bridging pattern: call `Processes.getAll()` without a folderId filter, find the process whose `folderKey` matches, and use its `folderId`. See "Bridging folderKey ↔ folderId" in [orchestrator.md](references/orchestrator.md).
- **NEVER use a process name as a `processKey`.** The human-readable name (e.g., `"Loan.Origination.and.Review"`) is the `name` field, NOT the `processKey`. When the user provides a process name, first call `MaestroProcesses.getAll()`, find the matching process by `name`, then use its `processKey` and `folderKey` for all subsequent calls (`ProcessInstances.getAll({ processKey })`, `getById()`, etc.). Hardcoding the process name as the key will return empty results.
- **NEVER use `packageId` as a `processKey` when calling `Processes.start()`.** `MaestroProcessGetAllResponse` has both `processKey` and `packageId` — they are different fields. `processKey` is the Orchestrator release key needed by `ProcessStartRequest`. `packageId` is the NuGet package identifier. Writing `{ processKey: process.packageId }` will fail. The correct mapping is `{ processKey: process.processKey }`.
- **NEVER explore `node_modules` or SDK source code when the skill's `references/` files already contain the information.** The reference files have all method signatures, types, enums, and fields. Exploring `node_modules` wastes tokens and time. Only use `node_modules` as a last resort for information not covered in any reference file.
- **NEVER render `getVariables()` arrays directly in polled components.** The API returns different variable subsets and in non-deterministic order across polls — rows will appear, disappear, and shuffle. Instead: (1) accumulate variables into a `Map<id, variable>` ref (latest value wins), (2) sort by name for stable row order, (3) use `lastDataRef` to preserve raw data so the table DOM is never torn down, (4) reset everything when switching instances. See [patterns.md](references/patterns.md) "Flicker-free updates" Rules 2 and 3 for the complete pattern with code.
- **NEVER render a detail component without `key={selectedId}` in a master-detail layout.** When a list on the left drives a detail panel on the right, the detail component MUST have `key={selectedItem.id}` so React fully remounts it when the selection changes. Without `key`, hooks keep stale state from the previous item, the loading spinner never shows, and old data stays visible. Also pass `deps: [itemId]` to every `usePolling` call in the detail component.
- **NEVER call `usePolling` without `deps` when the polled target can change.** If the component receives an ID prop that determines what gets fetched (e.g., `instanceId`, `conversationId`), always pass `deps: [thatId]` to `usePolling`. Without it, switching items shows stale data with no loading state because `hasLoadedRef` stays `true` and `data` keeps the old value.
- **NEVER toggle loading/polling state on each fetch cycle.** The `usePolling` hook's `isLoading` must only transition once (true→false after first fetch), then resets to true only when `deps` change (item switch). Use `isActive` for "Live" indicators (pure CSS animation, no state toggle).
- **NEVER widen task search when the `CreatorJobKey` filter returns no results.** Show a clear error message ("No pending task found for this instance"). Do NOT fall back to "pick the first Maestro task" or "pick any pending task in the folder" — this risks completing the WRONG task. Empty results mean the task was already completed or the instance has no HITL step.
- **NEVER compare `task.type` against string literals** like `'FormTask'`, `'AppTask'`, `'ExternalTask'`. Always use the `TaskType` enum: `TaskType.Form`, `TaskType.App`, `TaskType.External`. Use `task.type as TaskType` when passing to `complete()`.
- **NEVER call `tasks.complete()` (service method) when you already have the task object from `getAll()`/`getById()`.** Use `task.complete()` (attached method) instead — it doesn't require `taskId` or `folderId`. See [action-center.md](references/action-center.md) "Completing Tasks" for patterns.
- **NEVER cast SDK response types (e.g., `TaskGetResponse`, `ProcessInstanceGetResponse`) to `Record<string, unknown>` or other generic types.** SDK response interfaces have concrete typed fields and are NOT compatible with index-signature types. TypeScript will reject `someResponse as Record<string, unknown>` with TS2352. If you need to pass data to `tasks.create({ data })` or `task.complete({ data })`, construct a plain object with only the fields you need: `{ key: value }`. Do NOT pass the entire response object as `data`.

## 6. Authentication

The setup script generates `src/hooks/useAuth.tsx` which provides an `AuthProvider` context and `useAuth` hook. This is the primary auth interface for components.

### useAuth hook API

```typescript
const { isAuthenticated, isLoading, sdk, login, logout, error } = useAuth();
```

| Field | Type | Description |
|---|---|---|
| `isAuthenticated` | `boolean` | Whether the user has a valid token |
| `isLoading` | `boolean` | True during login/initialization |
| `sdk` | `UiPath` | The SDK instance — pass to service constructors |
| `login` | `() => Promise<void>` | Triggers OAuth login flow (redirects to UiPath) |
| `logout` | `() => void` | Clears tokens from sessionStorage and creates a fresh SDK instance |
| `error` | `string \| null` | Auth error message, if any |

### How auth works

1. **On mount**, `AuthProvider` checks `sdk.isInOAuthCallback()`. If the user is returning from the OAuth redirect, it calls `sdk.completeOAuth()` to exchange the auth code for tokens.
2. **Login** calls `sdk.initialize()`, which redirects the user to UiPath's OAuth consent page.
3. **After consent**, UiPath redirects back to the app. Step 1 detects the callback and completes the flow.
4. **Logout** must clear the token from `sessionStorage` **before** creating a new `UiPath` instance. The SDK stores OAuth tokens in `sessionStorage` under the key `uipath_sdk_user_token-{clientId}`, and a new UiPath instance auto-loads tokens from storage on construction. If you don't clear storage first, the new instance immediately reloads the old token and the user stays logged in. The correct logout pattern:
   ```typescript
   const logout = () => {
     // Clear OAuth tokens from sessionStorage FIRST
     sessionStorage.removeItem(`uipath_sdk_user_token-${clientId}`);
     sessionStorage.removeItem('uipath_sdk_oauth_context');
     sessionStorage.removeItem('uipath_sdk_code_verifier');
     setIsAuthenticated(false);
     setError(null);
     setSdk(new UiPath(config));
   };
   ```
5. **Token refresh** is automatic. When a service call gets a 401, the SDK refreshes the token using the refresh token internally. App code never needs to handle this.
6. **Token persistence**: OAuth tokens are stored in `sessionStorage` (key: `uipath_sdk_user_token-{clientId}`), so they survive page refreshes within the same tab.

### Additional UiPath methods

These are available on the `sdk` instance from `useAuth()` but not directly exposed by the hook:

- **`sdk.isInitialized()`** — returns `boolean`. Check if SDK has completed initialization before making service calls.
- **`sdk.getToken()`** — returns `string | undefined`. The raw access token. Only needed for direct API calls outside the SDK or debugging.
- **`sdk.config`** — read-only `{ baseUrl, orgName, tenantName }`. Useful for displaying the connected org/tenant in the UI.

### When to use what

| Scenario | What to use |
|---|---|
| Check if user is logged in | `isAuthenticated` from `useAuth()` |
| Show a login button | `login` from `useAuth()` |
| Log the user out | `logout` from `useAuth()` |
| Create a service instance | `new ServiceClass(sdk)` where `sdk` is from `useAuth()` |
| Pass token to a non-SDK API | `sdk.getToken()` |
| Show which org is connected | `sdk.config.orgName` |
| Guard a route before auth completes | `isLoading` from `useAuth()` |

## 7. OAuth Scopes

**CRITICAL: Only use scopes from [oauth-scopes.md](references/oauth-scopes.md).** That file is the single source of truth for which OAuth scopes each SDK method requires.

Rules:
- **Read `references/oauth-scopes.md`** before deciding scopes. Find the exact methods the app will use and collect their scopes from the tables.
- **Only include scopes listed in that file.** Never guess or invent scopes. Do NOT add scopes that don't appear there (e.g., `offline_access` is NOT a valid scope for the `scopes` field).
- **Only request scopes the app actually needs** based on which SDK methods it calls. Don't add broad scopes "just in case."

## 8. Service Usage Pattern in Components

**Data fetching rules — follow these for every component:**

1. **Always use pagination with UI controls.** If a service method supports pagination, always pass `pageSize` and build Previous/Next pagination controls at the bottom of the list. Use the `usePagination` hook and `PaginationControls` component from section 9. Never load a single page with no way to navigate to more results.
2. **Show data as it arrives.** Don't wait for all fetches to complete before rendering. Use independent loading states per data source so each section renders as soon as its data is ready.
3. **Fetch in parallel.** When a component needs data from multiple services, use `Promise.all()` or separate `useEffect` hooks with independent state — never await one fetch before starting another unrelated one.
4. **NEVER dump raw JSON in the UI.** When displaying complex data from SDK responses (especially `getVariables()`, execution history, or any response with nested objects), always parse and render structured UI — tables, key-value grids, collapsible cards. See [patterns.md](references/patterns.md) "Rendering Process Instance Data" for the required patterns and components.

SDK service pattern (use in every component):

```typescript
const { sdk } = useAuth();
const service = useMemo(() => new ServiceClass(sdk), [sdk]);
// Paginated: await service.getAll({ pageSize: 20 })
// Non-paginated: await service.getAll()
// By ID: await service.getById(id, folderId)
// Errors: catch (err) { err instanceof UiPathError ? err.message : 'Failed' }
// Parallel: const [a, b] = await Promise.all([svcA.getAll(...), svcB.getAll(...)])
```

## 9. Pagination

Import pagination types from `@uipath/uipath-typescript/core`:

- `PaginationCursor`: `{ value: string }` — an **object**, not a plain string. All cursor fields use this type.
- `PaginationOptions`: `{ pageSize?, cursor?: PaginationCursor, jumpToPage? }` (cursor and jumpToPage are mutually exclusive)
- `PaginatedResponse<T>`: `{ items, hasNextPage, nextCursor?: PaginationCursor, previousCursor?: PaginationCursor, totalCount?, currentPage?, totalPages?, supportsPageJump }`
- `NonPaginatedResponse<T>`: `{ items, totalCount? }`

Behavior:
- No pagination options passed -> returns `NonPaginatedResponse<T>`
- Any pagination option passed (pageSize, cursor, or jumpToPage) -> returns `PaginatedResponse<T>`

Cursor navigation example:

```typescript
// First page
const page1 = await service.getAll({ pageSize: 10 });

// Next page using cursor
if (page1.hasNextPage && page1.nextCursor) {
  const page2 = await service.getAll({ cursor: page1.nextCursor });
}

// Jump to page (only for offset-based services: Assets, Queues, Tasks, Entities)
const page5 = await service.getAll({ jumpToPage: 5, pageSize: 10 });
```

### Type narrowing for pagination responses

TypeScript narrows the return type at compile-time based on whether pagination options are passed. At runtime, use `'hasNextPage' in result` to discriminate — this field exists only on `PaginatedResponse`, never on `NonPaginatedResponse`.

```typescript
import type { PaginatedResponse } from '@uipath/uipath-typescript/core';

// Pattern 1: When you always pass pagination options, assert the type
const result = await tasks.getAll({ pageSize: 10 });
// TypeScript already infers PaginatedResponse here, but if using dynamic options:
const paginated = result as PaginatedResponse<TaskGetResponse>;

// Pattern 2: When options are dynamic and you don't know the return type
const result = await tasks.getAll(options);
if ('hasNextPage' in result) {
  // PaginatedResponse — safe to access nextCursor, supportsPageJump, etc.
  if (result.hasNextPage && result.nextCursor) {
    const nextPage = await tasks.getAll({ cursor: result.nextCursor });
  }
} else {
  // NonPaginatedResponse — only has items and totalCount
  console.log(`All ${result.items.length} items returned`);
}
```

### Pagination hook and UI controls — MANDATORY for any list view

When building any list that uses paginated data (instances, conversations, tasks, entities, etc.), **always implement proper pagination with next/previous controls**. Never load a single page and stop. Use this hook:

```typescript
// src/hooks/usePagination.ts
import { useState, useCallback } from 'react';
import type { PaginatedResponse, PaginationCursor } from '@uipath/uipath-typescript/core';

interface UsePaginationOptions<T> {
  fetchFn: (params: { pageSize: number; cursor?: PaginationCursor }) => Promise<PaginatedResponse<T>>;
  pageSize?: number;
}

interface UsePaginationResult<T> {
  items: T[];
  isLoading: boolean;
  error: Error | null;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  goToNextPage: () => Promise<void>;
  goToPreviousPage: () => Promise<void>;
  refresh: () => Promise<void>;
  totalCount?: number;
}

export function usePagination<T>({ fetchFn, pageSize = 20 }: UsePaginationOptions<T>): UsePaginationResult<T> {
  const [items, setItems] = useState<T[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [nextCursor, setNextCursor] = useState<PaginationCursor | undefined>();
  const [prevCursors, setPrevCursors] = useState<PaginationCursor[]>([]);
  const [currentCursor, setCurrentCursor] = useState<PaginationCursor | undefined>();
  const [hasNextPage, setHasNextPage] = useState(false);
  const [totalCount, setTotalCount] = useState<number | undefined>();

  const fetchPage = useCallback(async (cursor?: PaginationCursor) => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await fetchFn({ pageSize, cursor });
      setItems(result.items);
      setNextCursor(result.nextCursor);
      setHasNextPage(result.hasNextPage);
      setTotalCount(result.totalCount);
      setCurrentCursor(cursor);
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setIsLoading(false);
    }
  }, [fetchFn, pageSize]);

  // Load first page on mount
  useState(() => { fetchPage(); });

  const goToNextPage = useCallback(async () => {
    if (!nextCursor) return;
    setPrevCursors(prev => currentCursor ? [...prev, currentCursor] : prev);
    await fetchPage(nextCursor);
  }, [nextCursor, currentCursor, fetchPage]);

  const goToPreviousPage = useCallback(async () => {
    if (prevCursors.length === 0) return;
    const newPrevCursors = [...prevCursors];
    const prevCursor = newPrevCursors.pop();
    setPrevCursors(newPrevCursors);
    await fetchPage(prevCursor);
  }, [prevCursors, fetchPage]);

  const refresh = useCallback(() => fetchPage(currentCursor), [currentCursor, fetchPage]);

  return {
    items, isLoading, error, hasNextPage,
    hasPreviousPage: prevCursors.length > 0,
    goToNextPage, goToPreviousPage, refresh, totalCount,
  };
}
```

Pagination controls component (place at the bottom of any list):

```typescript
interface PaginationControlsProps {
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  onNext: () => void;
  onPrevious: () => void;
  isLoading: boolean;
  totalCount?: number;
  itemCount: number;
}

function PaginationControls({
  hasNextPage, hasPreviousPage, onNext, onPrevious, isLoading, totalCount, itemCount,
}: PaginationControlsProps) {
  return (
    <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200">
      <span className="text-sm text-gray-500">
        {totalCount !== undefined ? `${itemCount} of ${totalCount}` : `${itemCount} items`}
      </span>
      <div className="flex gap-2">
        <button
          onClick={onPrevious}
          disabled={!hasPreviousPage || isLoading}
          className="px-3 py-1.5 text-sm border rounded-md disabled:opacity-40 hover:bg-gray-50"
        >
          Previous
        </button>
        <button
          onClick={onNext}
          disabled={!hasNextPage || isLoading}
          className="px-3 py-1.5 text-sm border rounded-md disabled:opacity-40 hover:bg-gray-50"
        >
          Next
        </button>
      </div>
    </div>
  );
}
```

Usage in a list component:

```typescript
const { items: instances, isLoading, hasNextPage, hasPreviousPage, goToNextPage, goToPreviousPage, totalCount }
  = usePagination({
    fetchFn: ({ pageSize, cursor }) => processInstances.getAll({ processKey, pageSize, cursor }),
    pageSize: 20,
  });

// In JSX:
<div className="flex flex-col h-full">
  <div className="flex-1 overflow-y-auto">
    {instances.map(inst => /* render list items */)}
  </div>
  <PaginationControls
    hasNextPage={hasNextPage}
    hasPreviousPage={hasPreviousPage}
    onNext={goToNextPage}
    onPrevious={goToPreviousPage}
    isLoading={isLoading}
    totalCount={totalCount}
    itemCount={instances.length}
  />
</div>
```

**Rules:**
- **Every list view MUST have pagination controls** — never show a single page with no way to navigate.
- Use `pageSize: 20` as default for list panels (not 50 — keeps the UI responsive).
- Always show the `PaginationControls` at the bottom of the list with Previous/Next buttons.
- Disable buttons appropriately (`hasPreviousPage` for Previous, `hasNextPage` for Next).

## 10. Polling, BPMN Rendering, Process Data & Embedding Action Tasks

For real-time data updates, process diagram visualization, structured data display, and embedding HITL tasks, see the patterns reference.

**MANDATORY — read [patterns.md](references/patterns.md)** when building components that need:
- Auto-refreshing data (polling hook implementation + SDK usage example)
- BPMN diagram rendering (`bpmn-js` setup, viewer component, fetching XML)
- **Displaying process instance variables / element data** (structured tables, collapsible cards, value formatters — **never raw JSON**)
- **HITL detection** — detecting if a process instance is waiting on a human task using `getVariables()` + `getBpmn()` (BPMN element type check), with `detectHitlStatus()` helper and UI rendering patterns
- Embedding Action Center tasks / HITL tasks / action apps inside the app via iframe (embed URL format, Tasks API correlation for task link, iframe component)

## 11. Conversational Agent Chat UI Rules

When building a chat component or widget using the Conversational Agent service, follow these rules:

1. **Add the assistant placeholder message IMMEDIATELY in `sendMessage()`** — add both the user message and an empty assistant message (`{ content: '', isStreaming: true }`) to the messages array BEFORE calling `startExchange()`. Do NOT wait for `onMessageStart` or `onExchangeStart`. There's a multi-second gap between send and first response where the user sees nothing otherwise.
2. **Pre-register exchangeId → assistantMessageId mapping** before `startExchange()`. Generate the `exchangeId` upfront (e.g., `exchange-${Date.now()}-${crypto.randomUUID().slice(0, 12)}`), store the mapping in a ref (`exchangeAssistantIdRef`), and pass the `exchangeId` to `session.startExchange({ exchangeId })`. The `onExchangeStart` handler looks up this mapping to wire chunk handlers to the correct assistant message.
3. **Show bouncing dots INSIDE the assistant message bubble** when `isStreaming && !content`. Once chunks arrive, the dots are naturally replaced by the growing text. Do NOT use a separate typing indicator element outside the message list — it creates visual jumps.
4. **Use a single `isStreaming` state** — set `true` in `sendMessage()`, set `false` in `onExchangeEnd()` (NOT `onMessageEnd` — an exchange can have multiple messages). Disable the input while `isStreaming` is true.
5. **Use `echo: true`** on `startSession()` so all exchanges fire through `onExchangeStart`, giving a single code path for handling responses.
6. **Auto-scroll to the latest message.** Use a `useRef` on the message container bottom and call `scrollIntoView()` after new messages or chunks arrive.
7. **Send messages using explicit message/contentPart API** — use `exchange.startMessage({ role: MessageRole.User })` then `message.sendContentPart({ data })` then `message.sendMessageEnd()`. This gives control over message role and supports attachments.

## 12. Error Handling

All SDK errors extend `UiPathError` (import from `@uipath/uipath-typescript/core`).

Specific error types: `AuthenticationError`, `AuthorizationError`, `ValidationError`, `NotFoundError`, `RateLimitError`, `ServerError`, `NetworkError`.

```typescript
import { UiPathError, AuthenticationError, NotFoundError } from '@uipath/uipath-typescript/core';

try {
  const result = await service.getById(id, folderId);
} catch (err) {
  if (err instanceof AuthenticationError) {
    // Token expired, trigger re-login
  } else if (err instanceof NotFoundError) {
    // Resource not found
  } else if (err instanceof UiPathError) {
    // Other SDK error
    console.error(err.message);
  }
}
```

## 13. Service Reference Files

**MANDATORY — read the reference file for each service your component uses** before writing any service code. These contain exact method signatures, types, enums, and bound methods.

**When determining OAuth scopes:** MANDATORY — read [oauth-scopes.md](references/oauth-scopes.md) first. Do NOT guess scopes.

**Do NOT load** `deployment.md` unless the user asks about deploying. Do NOT load reference files for services the app doesn't use.

| Reference | Services | When to load |
|-----------|----------|--------------|
| [data-fabric.md](references/data-fabric.md) | Entities, ChoiceSets | App reads/writes Data Service entities |
| [maestro.md](references/maestro.md) | MaestroProcesses, ProcessInstances, ProcessIncidents, Cases, CaseInstances | App monitors or manages process/case instances |
| [orchestrator.md](references/orchestrator.md) | Assets, Queues, Buckets, Processes | App uses Orchestrator resources or starts processes |
| [action-center.md](references/action-center.md) | Tasks | App creates, assigns, or completes Action Center tasks |
| [patterns.md](references/patterns.md) | usePolling hook, BPMN viewer, HITL detection, embedded action tasks, process data rendering | App needs auto-refreshing data, process diagram rendering, HITL detection via BPMN, embedded HITL tasks, or displays process instance variables/element data |
| [deployment.md](references/deployment.md) | UiPath CLI | User asks to deploy the app to UiPath Cloud |
| [oauth-scopes.md](references/oauth-scopes.md) | All | **Always** — read before setting scopes in setup |
| [conversational-agent.md](references/conversational-agent.md) | ConversationalAgent, Exchanges, Messages | App uses real-time chat with UiPath AI agents |
| [oauth-client-setup.md](references/oauth-client-setup.md) | Playwright browser automation | User doesn't have a client ID and needs one created via UiPath admin portal |
