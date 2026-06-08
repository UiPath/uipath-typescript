# UiPath Coded App — build rules

How to produce something the plugin can pack, publish, and deploy. Verified
against `uip codedapp` (CLI 1.1.1).

## The deployable artifact

A coded app deploys from two things at the project root:

1. **`dist/`** — a static, browser-served build (an `index.html` plus assets).
   No server, no SSR. This is what gets packed and hosted by UiPath.
2. **`uipath.json`** — the coded-app config. The `uip codedapp init` starter
   creates it with these fields, initially empty:

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

   **Do not hand-fill the client/org/tenant/baseUrl fields.** `uip codedapp pack`
   populates them from the authenticated session and registers (or reuses) the
   OAuth client. Keep `uipath.json` at the root so pack can find and fill it.

## Getting a baseline

Always start from the CLI starter to get a correct `uipath.json`:

```
uip codedapp init <folder> --template <form|dashboard|inline-automation>
```

This writes `dist/index.html` (a minimal stub) and `uipath.json`. Pick the
template by intent:

- **form** — data-entry / request-submission apps (default when unsure)
- **dashboard** — view/monitor data, charts, lists
- **inline-automation** — apps that trigger or interact with automations/jobs

## Building the actual app — two paths

**Path A — simple static app (no build step).**
Write the app directly into `dist/` (HTML/CSS/JS, self-contained). Fast and
reliable for apps that don't need live UiPath data. The plugin packs `dist/`
as-is. Keep all asset paths relative.

**Path B — rich SPA that uses the UiPath platform.**
Scaffold a **Vite + React** project that builds into `dist/`:

- Set **`base: './'`** in `vite.config.*`; keep asset references relative.
- Build output must land in **`dist/`**.
- Use **`@uipath/uipath-typescript`** for any UiPath data/actions (Orchestrator,
  Data Fabric, Action Center, etc.) — do not hand-roll fetch calls.
- Use **`@uipath/coded-apps-dev`** as a dev dependency so auth/runtime works at
  the local preview URL.
- If using a client-side router, set its basename from the helper the runtime
  provides (e.g. `getAppBase()`), never a hardcoded `/` — the app is served from
  a sub-path on the UiPath domain.
- Keep the `uipath.json` from `uip codedapp init` at the project root.

The plugin's deploy step auto-detects which path you used: a `package.json` with
a `build` script is built first; otherwise the existing `dist/` is packed.

## Do not

- Do not introduce a backend server, SSR, or non-static hosting.
- Do not remove `uipath.json` or manually fill its client/org/tenant fields.
- Do not use absolute asset paths or a hardcoded router basename.
- Do not deploy these apps to a non-UiPath target unless the user explicitly
  asks for an additional one.

## Canonical flow (handled by the plugin's scripts)

```
uip codedapp init <folder> --template <form|dashboard|inline-automation>
# build the app into dist/ (Path A: edit dist directly; Path B: npm run build)
uip codedapp pack dist -n "<App Name>" -v <version> --content-type webapp
uip codedapp publish -n "<App Name>" -v <version> -t Web
uip codedapp deploy  -n "<App Name>" -v <version> [--folder-key <key>]
```
