# UiPath Sites

UiPath Sites is a Codex companion plugin for building UiPath coded apps from `@UiPath Sites` or matched `@Sites` prompts.

It keeps the app-building experience, but for matched UiPath requests it produces a UiPath coded app instead of a Sites-hosted app. Build, package, publish, and deploy are handled through the standard `uipath-coded-apps` workflow and `uip codedapp`.

## What It Does

- Routes `@UiPath Sites` and matched `@Sites` prompts into UiPath coded-app generation.
- Keeps the final deployment target as UiPath, not Sites hosting.
- Applies frontend-design guidance for visual polish only.
- Ensures the UiPath CLI and UiPath Codex skills are available at session start.
- Defers coded-app structure, auth, SDK usage, functional UI behavior, build, pack, publish, and deploy to `uipath-coded-apps`.

## Example Prompts

```text
Build a business-user-friendly case app with an Outlook inbox-style UI for browsing, reviewing, and approving cases.
Build a data table interface for Data Fabric entities with search, browse, and CRUD capabilities.
Build an Action Center task inbox for filtering work, reviewing task details, and completing assigned actions.
```

## Expected Flow

1. User starts with `@UiPath Sites`, or an `@Sites` prompt that mentions UiPath or coded-app intent.
2. The plugin routes the request to the UiPath coded-app path.
3. Codex builds a static Vite + React coded app.
4. The app uses `@uipath/uipath-typescript` and `uipath.json`.
5. Functional app behavior follows `uipath-coded-apps` and its relevant references.
6. Frontend overrides apply only visual presentation and must not replace coded-app functional patterns.
7. Normal Sites hosting, Cloudflare Worker output, D1, R2, and SIWC are skipped.
8. The `uipath-coded-apps` skill handles local validation and `uip codedapp` pack, publish, and deploy.

## Ownership

- UiPath Sites owns routing, Sites-hosting suppression, and the visual companion layer.
- `uipath-coded-apps` owns coded-app structure, SDK usage, auth/config, scopes, service-specific references, runtime data handling, functional UI behavior, build, pack, publish, and deploy.
- `frontend-design-overrides.md` owns visual presentation only and must not redefine functional UI mechanics.

## Prerequisites

- Codex with plugin support.
- Node.js and npm.
- Access to a UiPath tenant where coded apps can be published.
- A UiPath external application/client ID configured with the scopes required by the generated coded app.

The plugin includes a session-start hook that installs or updates `@uipath/cli` globally and runs:

```bash
uip skills install --agent codex
```

## Troubleshooting

- If the plugin does not route, use `@UiPath Sites` or include both `@Sites` and clear UiPath coded-app intent in the prompt.
- If cloud actions fail, check `uip login status --output json` and re-login to the target environment, org, and tenant.
- If a generated project contains `.openai/hosting.json`, Sites hosting assumptions leaked into the flow and should be removed.
- If another UiPath skill is selected, restate that the target is a UiPath coded app and not an RPA workflow, Solution package, Maestro flow, or platform admin operation.
- If functional UI behavior breaks, verify the generated app followed the relevant `uipath-coded-apps` reference rather than relying only on visual frontend guidance.

## Versioning

- `0.1.2`: explicit ownership split between routing, coded-app functional behavior, and visual-only frontend guidance.
- `0.1.1`: modular instruction cleanup and fresh plugin cache version.
- `0.1.0`: preview release for internal/public testing.
- `0.1.x`: metadata, docs, prompt, hook, and bug fixes.
- `0.2.0`: routing, bootstrap, or supported-app behavior changes.
- `1.0.0`: stable release after marketplace validation and repeated successful demos.
