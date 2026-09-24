# Case Management — UiPath Coded Web App

A single-case operations workspace for **UiPath Maestro Cases**, built with React + Vite, the
[`@uipath/uipath-typescript`](https://www.npmjs.com/package/@uipath/uipath-typescript) SDK, and the
**Apollo Vertex** design system (`@uipath/apollo-wind`, light/dark theme).

The app is scoped to **one** Maestro case (set by `processKey`) and provides:

- **Home** — live status breakdown, SLA watchlist, recently-viewed cases
- **Cases** — paginated case instances (cursor-based) with SLA annotations
- **Actions** — Action Center tasks across the page's instances, embedded inline
- **Analytics** — instance/SLA/failing-step charts (Insights RTM)
- **Case detail** — Overview, Case details, Stages, Actions, History (actor-classified
  execution timeline), and Variables tabs

## SDK surface used

| Area | SDK |
|------|-----|
| Case definition + analytics | `Cases` (`getAll`, `getTopElementFailedCount`, …) |
| Instances, stages, tasks, SLA, lifecycle | `CaseInstances` |
| Variables + incidents | `ProcessInstances` (`getVariables`, `getIncidents`) |

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

**Required OAuth scopes:** `PIMS OR.Execution.Read OR.Tasks Insights.RealTimeData Insights OR.Folders.Read`
(Analytics + SLA views need Insights RTM provisioned on the tenant; they degrade gracefully if it isn't.)

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
