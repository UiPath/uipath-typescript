# Case Management — UiPath Coded Web App

A single-case operations workspace for **UiPath Maestro Cases**, built with React + Vite, the
[`@uipath/uipath-typescript`](https://www.npmjs.com/package/@uipath/uipath-typescript) SDK, and the
**Apollo Vertex** design system (`@uipath/apollo-wind`, light/dark theme).

The app is scoped to **one** Maestro case (set by `processKey`) and provides:

- **Home** — live status breakdown, SLA watchlist, recently-viewed cases
- **Cases** — paginated case instances (cursor-based) with SLA annotations
- **Actions** — Action Center tasks across the page's instances, rendered natively from their
  schema (with the Action Center embed one tab away)
- **Analytics** — instance/SLA/failing-step charts (Insights RTM)
- **Case detail** — Overview, Case details, Stages, Actions, History (actor-classified
  execution timeline), and Variables tabs

## SDK surface used

| Area | SDK |
|------|-----|
| Case definition + analytics | `Cases` (`getAll`, `getTopElementFailedCount`, …) |
| Instances, stages, tasks, SLA, lifecycle | `CaseInstances` |
| Variables + incidents | `ProcessInstances` (`getVariables`, `getIncidents`) |
| Task detail, completion, drafts | `Tasks` (`getById`, `getDataById`, `complete`, `saveData`) |

All SDK calls are wrapped in [`src/lib/sdk.ts`](src/lib/sdk.ts) and typed against the SDK's exported
response types (no `as unknown as`, no `any`).

## Configure

Copy the template and fill in your details — the real `uipath.json` is gitignored so your
org/tenant/client ID aren't committed:

```bash
cp uipath.json.example uipath.json   # then edit clientId / orgName / tenantName / baseUrl
```

Auth/connection config (org, tenant, base URL, client ID, scopes) is read at runtime from the
`<meta name="uipath:*">` tags injected by `@uipath/coded-apps-dev` (locally, from `uipath.json` +
`.uipath/`) or by the platform (in production).

**Choosing the case:** on first load the app lists every Maestro case in the tenant and lets you
pick which one to manage; the choice is remembered (localStorage) and can be changed anytime from the
sidebar switcher. If the tenant has exactly one case it's selected automatically. There's nothing to
configure for case selection.

**Required OAuth scopes:** `PIMS OR.Execution.Read OR.Tasks Apps.Read Insights.RealTimeData Insights OR.Folders.Read`
(Analytics + SLA views need Insights RTM provisioned on the tenant; they degrade gracefully if it isn't.)
`Apps.Read` is what lets Action Center hand back an action app's schema — see below. The scope must
be granted on the External Application in Admin as well as listed here.

## Rendering Action Center tasks

Every task is shown two ways, behind tabs on the task card ([`TaskDetail`](src/components/TaskDetail.tsx)):

| Tab | What it is | Source |
|-----|------------|--------|
| **Form** (default) | A native form built from the task's schema: inputs read-only, inOuts/outputs editable, one button per outcome. Submitting calls `Tasks.complete`; **Save draft** calls `Tasks.saveData`. | see table below |
| **Action Center** | The task embedded from Action Center (`/embed_/…/actions_/current-task/tasks/{id}`) — the exact experience the app designer built. | Action Center |

Where the schema comes from, by task type ([`src/lib/taskSchema.ts`](src/lib/taskSchema.ts)):

| Task type | Schema | Values |
|-----------|--------|--------|
| **App task** — coded action app | `GET tasks/AppTasks/GetAppTaskByKey` → `taskSchema` (the app's `action-schema.json`, parsed by Action Center into .NET-typed properties) | same response, `data` |
| **App task** — low-code action app | same endpoint; the same .NET types (`String`, `Int32`, `Decimal`, `DateTime`, `DataTable`, `File`, …) describe the app's fields | same response, `data` |
| **Quick Form** (`QuickFormTask`, Maestro/Flow HITL node) | `GET tasks/TaskSchemas/GetByKey?key={task.taskSchemaKey}` → `fields[]` + `outcomes[]` | `Tasks.getDataById` |
| External / legacy Form | none — falls back to a key/value view of `data` with a free-text action | `Tasks.getById` |

Neither schema `GET` above is wrapped by the SDK yet, so the sample calls them with the SDK's access
token (`sdk.getToken()`); swap them for the SDK methods once they ship. `Tasks.getById` is not a
substitute for the first: for an app task it routes to `GetAppTaskById`, which returns
`taskSchema: null` — only the `ByKey` variant carries the parsed schema. Every other call goes
through the wrappers in [`src/lib/sdk.ts`](src/lib/sdk.ts).

Two things to know about the app-task schema:

- **`Apps.Read` is required.** Action Center fetches the schema from the Apps service **with the
  caller's token**. Without an Apps scope the call still returns `200` with an empty schema; the card
  says so and falls back to the raw values.
- **A property's `name` is its data key.** The parsed schema also carries a `key`, but that is a UUID
  the Apps designer generates per property and it never appears in the task's `data`. Outcomes work
  the same way: the `name` (e.g. `Approve`) is the action string used to complete the task.

## Run locally

```bash
npm install
uip login --authority https://alpha.uipath.com   # populates .uipath/ (org/tenant/base URL)
npm run dev                                        # http://localhost:5173
```

## Deploy

```bash
npm run build
uip codedapp pack dist -n case-management --version 1.0.0
uip codedapp publish
uip codedapp deploy -n case-management --folder-key <FOLDER_GUID>
```
