# Coded Apps With Functions Samples

A collection of UiPath **Coded App + Coded Functions** samples, built with the
`@uipath/coded-functions-js-sdk` and `@uipath/uipath-typescript` SDKs. Every sample pairs a web front
end with a JS functions backend and ships them as **one solution**, so a single `pack` / `publish` /
`deploy` stands up the app, the functions, their triggers and any Orchestrator resource they need.

Each sample answers one question: **what is the function for here, and what would break without it?**
Pick the one that matches your case, then open its folder and follow that README to set up and
deploy.

## Choose a sample

| Sample | Use it when… | Demonstrates | OAuth scopes |
|--------|--------------|--------------|--------------|
| [`secrets`](./secrets) | A **credential or secret** must never reach the browser | Reading a Credential asset with the function's own robot identity, and an allowlist that stops the function becoming a confused deputy | `OR.Execution`, `OR.Folders`, `OR.Jobs` |
| `identities` _(planned)_ | You need to know **which identity** a call runs as | The two identities every function gets — `ctx.user` and `ctx.robot` — and what each one can and cannot do | — |
| [`rest-backend`](./rest-backend) | The front end expects a **REST API** | Three functions shaped as REST resources — a collection, an item, and a nested sub-resource — with path params, query filters and 404s that name what would have worked | `OR.Execution`, `OR.Folders`, `OR.Jobs` |
| `connections` _(planned)_ | The app must call a **third-party system** | Integration Service connections: the shared-connection pattern that needs a function, and the personal-connection pattern that will not | — |
| [`calling-mode`](./calling-mode) | You need to choose **how** a function is called | Two functions with identical handlers — one with `method` + `path`, one without — and what each channel can carry: HTTP fails over ~10 KB in and returns an empty `200` over ~512 KB out, where a job uses attachments and handles megabytes | `OR.Execution`, `OR.Folders`, `OR.Jobs` |

## Common prerequisites

All samples share the same baseline:

- **Node.js** 20.x or later and **npm** 8.x or later
- A **UiPath Automation Cloud** tenant
- The [uip](https://github.com/UiPath/cli#installation) CLI: `npm i -g @uipath/cli`, with the
  solution, orchestrator and admin tools:

  ```bash
  uip tools install @uipath/solution-tool       # uip solution ...
  uip tools install @uipath/orchestrator-tool   # uip or ...
  uip tools install @uipath/admin-tool          # uip admin ...
  ```

- A non-confidential **External Application** (OAuth client) with the scopes listed above. Each
  sample README gives the exact registration command.

## Getting started

Both halves need their dependencies installed — `uip solution pack` reads the functions SDK to
generate the package manifest, and it takes the app's bundle prebuilt:

```bash
cd <sample-folder>

(cd <name>-functions && npm install)
(cd <name>-app/source && npm install && npm run build)
```

Then follow the **Setup** section in that sample's README to deploy with the UiPath CLI.

## Conventions shared by every sample

- **`lib/contract.ts` is the source of truth for I/O types.** The functions import it directly, the
  app imports it with `import type`. A mismatch between the two halves is a build error, not a
  runtime 400.
- **`deploy-config.json` ships filled in**, dummy secrets included, so the documented commands work
  as written. Only your OAuth client id is yours to supply.
- **The app bundle is built, not committed.** `uip solution pack` takes the prebuilt bundle from
  `<name>-app/source/dist` and does not build it for you.
- **A hosted app's OAuth scope comes from the OAuth registration, not from `uipath.json`.** The
  platform injects the app's configuration as `<meta name="uipath:*">` tags at serve time;
  `uipath.json` is used only by the `@uipath/coded-apps-dev` Vite plugin for local development.

For a Coded App that calls functions **without** a solution — the two halves packed and deployed
separately — see [`../functions-app`](../functions-app).
