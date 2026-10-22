# OracleReimbursement_App

Converted from an Apps Studio `.uiapp` by `uiapp-convert`. This is ordinary React
+ TypeScript — yours to own and modify.

```bash
npm install
npm run dev
```

## Layout

| Path | What it is |
|---|---|
| `src/pages/` | one component, stylesheet and typed bindings module per page — **your app** |
| `src/components/ui/` | the control components the pages render |
| `src/store/` | app state (Redux Toolkit): app variables, control state, data sources |
| `src/lib/runtime.ts` | the accessors expressions call, in render and handler form |
| `src/lib/rules.ts` | navigation and UI feedback behind the converted rules |
| `src/lib/compat.ts` | the handful of VB-vs-JavaScript behaviour differences. Read it |
| `src/styles/tokens.css` | every colour and font — re-theme here |

## What did not convert

Nothing — every expression and rule converted.

## Installing

`@uipath/du-validation-station-wc` (the Validation Station web component) is published to
GitHub Packages, not to npmjs, so `npm install` needs the `@uipath` scope pointed there with a
token that has `read:packages`:

```
@uipath:registry=https://npm.pkg.github.com/
//npm.pkg.github.com/:_authToken=<your GitHub token>
```

in `~/.npmrc`. The committed `package-lock.json` was generated against that registry.

## Configuration

The tenant resources this app uses — the two entities, the two admin groups, the two assets,
the performer queue and its folder — are read from `.env` by `src/app-config.ts`. Copy
`.env.example` to `.env` and fill in the names from your tenant; the defaults are placeholders.
The resources must exist in the tenant named in `uipath.json`. Entities are resolved by name.

## Before this talks to UiPath

Fill in `uipath.json` — it is the ONLY configuration, for local runs and deployed
alike:

```json
{
  "clientId": "<external-application-clientId>",
  "scope": "…",
  "orgName": "<your-org>",
  "tenantName": "…",
  "baseUrl": "…",
  "redirectUri": "http://localhost:5173"
}
```

`@uipath/coded-apps-dev` reads it and injects the connection as
`<meta name="uipath:*">` tags for `npm run dev`; deployed, the platform injects the
same tags and supplies everything but `clientId` and `scope` itself. So the SDK is
constructed the same way in both — `new UiPath()`, no arguments, no `.env`.

Register the client id as a NON-CONFIDENTIAL (public) external application, and trim
`scope` to what this app actually does — a token is minted per audience, so a set
covering only `OR.*` fails Data Fabric calls with a 401, not a 403. Never put a client
secret in this app: it is a static bundle and everything in it is public.

`PM.User.Read PM.Group.Read` are there because this app reads the signed-in user's groups
(`CurrentUser.Groups`). The token does not carry them, so at sign-in the app reads the
user record and the group names from Identity — grant both scopes on the external
application, or every group check answers "not a member". Only local groups resolve;
directory (AD / Entra) groups do not.

## Start page and deep links

Every page has its own URL, but a fresh load of an inner page — a pasted link, a bookmark, a
reload while on it — goes to the start page first, as Apps does. The start page's load rules
fill the app variables every other page reads; a page opened without them ran with empty
state. To allow opening inner pages directly, set `DEEP_LINKS = true` in `src/routes.tsx`,
and make sure each page can be the first one shown.

## Deploying to UiPath

The deployment metadata is already here: `webAppManifest.json` (marks this a coded
app), `project.uiproj`, `uipath.json`.

Put your OAuth client id in `uipath.json` first — `scope` is pre-filled, and should be
trimmed to what this app actually does:

```json
{ "scope": "…", "clientId": "<external-application-clientId>" }
```

`uipath.json` is **git-ignored**: it ends up holding a real client id and the org and
tenant you configured, and none of that belongs in everyone else's checkout. The committed
copy is `uipath.json.example`, which carries the same shape and the same scopes with
placeholders in place of the tenant. Cloning this project, start by copying it:

```bash
cp uipath.json.example uipath.json
```

A pipeline that deploys this app needs the real file written into the working directory
before `uip codedapp` runs — from a CI secret or variable group — since it is no longer
checked out with the source.

```bash
npm i -g @uipath/cli
uip login
npm run build
uip codedapp pack dist -n oraclereimbursement-app --version 1.0.0
uip codedapp publish
uip codedapp deploy
```

- Bump `--version` every time; Orchestrator rejects republishing one that exists.
- `--path-name` is for the FIRST deploy only — passing it on an upgrade fails with
  `400 routing name must be unique`.

Once deployed you do **not** need `.env`: the platform serves the app with its
connection in `<meta name="uipath:*">` tags — client id, scope, org, tenant, base url,
redirect uri and the folder key — and `lib/sdk.ts` uses those in preference to `.env`,
which exists only for `npm run dev`.
