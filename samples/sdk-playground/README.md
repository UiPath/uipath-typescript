# UiPath SDK Playground

A Swagger-style explorer for the UiPath TypeScript SDK, built as a coded app. Pick an SDK version, browse every service and method that version exposes, fill in parameters through a generated form, and run the call live — against either the platform-injected connection or custom credentials.

## Features

- **Version-aware method catalog** — six SDK versions installed side by side (latest patch of every minor line, `1.0.0` → `1.5.5`). A build-time script extracts each version's services, methods, parameters, enums, and JSDoc from its published `.d.ts` files, so the catalog can never drift from what the version actually ships.
- **Live execution** — each version is code-split into its own lazy chunk; the browser downloads and instantiates only the selected version. Switching versions rebuilds the SDK client from scratch.
- **Connection modes**
  - *Platform default*: `new UiPath()` reads the meta tags UiPath Apps injects when this is deployed as a coded app — no configuration needed.
  - *PAT*: org, tenant, base URL, and a personal access token, for local development or cross-tenant testing.
  - *OAuth*: a Non-Confidential External Application's App ID (client ID), redirect URI, and scopes. Sign-in runs the SDK's PKCE flow via the UiPath identity server; needed for endpoints that reject PAT auth. The registered redirect URI must match the field value exactly (`http://localhost:5173` for local dev).
- **Generated forms** — enums become dropdowns, `Date` params become date pickers, object params get a JSON editor with a shape hint, and the SDK's own `@example` JSDoc is shown inline.
- **Copy as TypeScript** — every configured call can be copied as a runnable snippet (credentials always masked).
- **Bound-method discovery** — responses that carry SDK-attached entity methods (e.g. `task.assign()`) list them next to the JSON output.

## Getting started

```bash
npm install
npm run dev        # generates manifests, then starts Vite
```

`npm run build` regenerates manifests, typechecks, and produces `dist/` for deployment as a coded app.

## Adding or removing an SDK version

1. Add/remove the alias in `package.json`:
   ```json
   "sdk-v1_6_0": "npm:@uipath/uipath-typescript@1.6.0"
   ```
2. `npm install && npm run manifests`

The generator (`scripts/generate-manifests.mjs`) discovers aliases automatically, emits `src/manifests/<version>.json`, and rewrites the lazy-import registry (`src/sdk/registry.gen.ts`). Nothing else to touch.

## Security notes

- The personal access token is held **in memory only** — never persisted to localStorage/sessionStorage, never logged, never embedded in generated code snippets. Reload the tab and it's gone.
- OAuth mode persists only **public identifiers** (App ID, org/tenant, scopes, redirect URI) to sessionStorage so the connection survives the sign-in redirect — never tokens or secrets. Token storage and the PKCE exchange are handled by the SDK itself.
- Changing credentials, org/tenant, or SDK version always disposes the old SDK client and builds a fresh one, so a token obtained for one tenant is never reused against another.
- All calls execute in the browser with the entered token's permissions — server-side authorization applies exactly as it would for any SDK consumer.
- Do not hardcode credentials or tenant identifiers in `index.html` or commit `.env` files (ignored via `.gitignore`).
