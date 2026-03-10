# Getting Started

A **Coded App** is a standard browser-based web application (React, Vue, Angular, etc.) that you build and deploy to UiPath. The platform handles hosting and OAuth — your app just imports the SDK and runs.

---

## Prerequisites

- **Node.js** 20.x or higher
- **npm** 8.x or higher (or yarn/pnpm)
- **UiPath CLI** installed globally:

<!-- termynal -->

```bash
$ npm install -g @uipath/uipath-typescript
```

---

## Configure `uipath.json`

Create a `uipath.json` at the root of your project. This file holds SDK and OAuth configuration used both during local development and at deployment time.

```json
{
  "clientId": "your-oauth-client-id",
  "scope": "OR.Execution OR.Folders",
  "orgName": "your-org",
  "tenantName": "your-tenant",
  "baseUrl": "https://cloud.uipath.com",
  "redirectUri": "http://localhost:5173"
}
```

| Field | Required | Description |
|-------|----------|-------------|
| `clientId` | **Yes** (Web apps) | A **non-confidential** OAuth client ID registered in your UiPath org |
| `scope` | No | OAuth scopes your app needs (e.g. `OR.Execution OR.Folders`) |
| `orgName` | No | Your UiPath organization name |
| `tenantName` | No | Your UiPath tenant name |
| `baseUrl` | No | UiPath platform base URL (defaults to `https://cloud.uipath.com`) |
| `redirectUri` | No | OAuth redirect URI (only needed for local dev) |

!!! tip
    If `uipath.json` doesn't exist, `uipath pack` creates it with empty values and warns you to fill in the required fields.

---

## Set Up Local Development

Install `@uipath/coded-apps` — a bundler plugin that injects SDK configuration into your app during local development, so you can run and test it against your UiPath tenant without any manual config.

=== "npm"

    <!-- termynal -->

    ```bash
    $ npm install --save-dev @uipath/coded-apps
    ```

=== "yarn"

    <!-- termynal -->

    ```bash
    $ yarn add --dev @uipath/coded-apps
    ```

=== "pnpm"

    <!-- termynal -->

    ```bash
    $ pnpm add --save-dev @uipath/coded-apps
    ```

Then add the plugin to your bundler config:

=== "Vite"

    ```typescript title="vite.config.ts"
    import { defineConfig } from 'vite'
    import react from '@vitejs/plugin-react'
    import { uipathCodedApps } from '@uipath/coded-apps/vite'

    export default defineConfig({
      base: './',
      plugins: [
        react(),
        uipathCodedApps(),
      ],
    })
    ```

=== "Webpack"

    ```javascript title="webpack.config.js"
    const { uipathCodedApps } = require('@uipath/coded-apps/webpack')

    module.exports = {
      plugins: [uipathCodedApps()],
    }
    ```

=== "Rollup"

    ```javascript title="rollup.config.js"
    import { uipathCodedApps } from '@uipath/coded-apps/rollup'

    export default {
      plugins: [uipathCodedApps()],
    }
    ```

=== "esbuild"

    ```javascript title="esbuild.config.js"
    const { uipathCodedApps } = require('@uipath/coded-apps/esbuild')

    require('esbuild').build({
      plugins: [uipathCodedApps()],
    })
    ```

---

## Required Code Changes

Two changes are needed to make your app work correctly when deployed to UiPath.

### 1. Initialize the SDK from platform config

Construct `UiPath` with no arguments. The SDK automatically reads its configuration from the platform at runtime — no hardcoded values needed.

```typescript
import { UiPath } from '@uipath/uipath-typescript'

const sdk = new UiPath()
await sdk.initialize()
```

### 2. Set the router base path

Your app is served from a URL prefix specific to your deployment. Use `getAppBase()` as the router `basename` so client-side routing works correctly. In local development it returns `'/'`, so it's safe to use unconditionally.

=== "React Router"

    ```tsx title="App.tsx"
    import { getAppBase } from '@uipath/uipath-typescript'
    import { BrowserRouter } from 'react-router-dom'

    function App() {
      return (
        <BrowserRouter basename={getAppBase()}>
          {/* your routes */}
        </BrowserRouter>
      )
    }
    ```

=== "React Router v6 (createBrowserRouter)"

    ```tsx title="main.tsx"
    import { getAppBase } from '@uipath/uipath-typescript'
    import { createBrowserRouter, RouterProvider } from 'react-router-dom'

    const router = createBrowserRouter(routes, {
      basename: getAppBase(),
    })
    ```

=== "Vue Router"

    ```typescript title="router/index.ts"
    import { getAppBase } from '@uipath/uipath-typescript'
    import { createRouter, createWebHistory } from 'vue-router'

    const router = createRouter({
      history: createWebHistory(getAppBase()),
      routes,
    })
    ```

!!! note "Angular"
    Angular apps using `<base href>` in `index.html` work automatically — no extra changes needed.

---

## Deploy

Once your app is built (`npm run build`), run these four commands:

<!-- termynal -->

```bash
$ uipath auth
$ uipath pack ./dist --name my-app
$ uipath publish
$ uipath deploy
```

The CLI is interactive on first run — it prompts for tenant, folder, and app name, then saves everything to `.uipath/app.config.json` for subsequent runs.

See the [CLI Reference](cli-reference.md) for all flags and CI/CD usage.
