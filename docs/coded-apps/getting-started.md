# Getting Started

A **Coded App** is a standard browser-based web application (React, Vue, Angular, etc.) that you build and deploy to UiPath. The platform handles hosting and OAuth — your app just imports the SDK and runs.

!!! warning "Cloud only"
    Coded Apps are currently available on **UiPath Automation Cloud** only. Automation Suite and Dedicated deployments are not supported at this time.

---

## Prerequisites

- **Node.js** 20.x or higher
- **npm** 9.x or higher

## Install the CLI

<!-- termynal -->

```bash
$ npm install -g @uipath/uipcli
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
| `scope` | No | OAuth scopes your app needs. Defaults to all scopes registered with the provided `clientId` |
| `orgName` | No | Your UiPath organization name or ID |
| `tenantName` | No | Your UiPath tenant name or ID |
| `baseUrl` | No | UiPath platform base URL (defaults to `https://cloud.uipath.com`) |
| `redirectUri` | No | OAuth redirect URI (only needed for local dev) |

!!! tip
    If `uipath.json` doesn't exist, `uipcli codedapp pack` creates it with empty values and warns you to fill in the required fields.

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

The plugin reads `uipath.json` and injects the following `<meta>` tags into your `index.html` during local development:

```html
<meta name="uipath:client-id"    content="your-oauth-client-id">
<meta name="uipath:scope"        content="OR.Execution OR.Folders">
<meta name="uipath:org-name"     content="your-org">
<meta name="uipath:tenant-name"  content="your-tenant">
<meta name="uipath:base-url"     content="https://api.uipath.com">
<meta name="uipath:redirect-uri" content="http://localhost:5173">
```

When deployed, the platform injects these same tags (plus `uipath:app-base` and `<base href>`) automatically — the plugin is only needed for local development.

---

## Pre-deployment Checklist

Since your app is served at `https://<orgName>.uipath.host/<appName>`, the platform injects `<base href="/your-app-name/">` into your `index.html` at deploy time. Make sure your app handles this correctly:

### 1. Configure relative asset paths

Your bundler must output relative asset paths so they resolve correctly via the injected `<base href>`. Without this, assets will fail to load when deployed.

=== "Vite"

    ```typescript title="vite.config.ts"
    export default defineConfig({
      base: './',
      plugins: [react(), uipathCodedApps()],
    })
    ```

=== "Vue CLI"

    ```javascript title="vue.config.js"
    module.exports = {
      publicPath: './',
    }
    ```

!!! note "Vite: asset references in JS/TS code"
    With `base: './'`, Vite rewrites paths in HTML and CSS automatically. For JS/TS code, import assets as ES modules or use `import.meta.env.BASE_URL` for files in the public folder:

    ```typescript
    // ✅ ES module import — Vite handles the path
    import logo from './assets/logo.svg'

    // ✅ Public folder — use BASE_URL, not an absolute path
    const src = `${import.meta.env.BASE_URL}vite.svg`

    // ❌ Breaks when deployed
    const src = '/vite.svg'
    ```

### 2. Configure router base path (if using a router)

If your app uses client-side routing, use `getAppBase()` as the router `basename`. It reads the `uipath:app-base` meta tag injected by the platform at runtime, and falls back to `'/'` locally — safe to use unconditionally.

=== "React (Vite)"

    ```tsx title="main.tsx"
    import { getAppBase } from '@uipath/uipath-typescript'
    import { BrowserRouter } from 'react-router-dom'

    createRoot(document.getElementById('root')!).render(
      <BrowserRouter basename={getAppBase()}>
        {/* your routes */}
      </BrowserRouter>
    )
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

### Also: UiPath SDK initialization

If your app uses `@uipath/uipath-typescript`, initialize it with no arguments — the SDK reads its configuration from the platform meta tags automatically.

```typescript
import { UiPath } from '@uipath/uipath-typescript'

const sdk = new UiPath()
await sdk.initialize()
```

---

## Deploy

<!-- termynal -->

```bash
$ uipcli login
$ npm run build
$ uipcli codedapp pack dist -n my-app -v 1.0.0
$ uipcli codedapp publish
$ uipcli codedapp deploy
```

Once deployed, your app is accessible at:

```
https://<orgName>.uipath.host/<appName>
```

See the [CLI Reference](cli-reference.md) for all flags, CI/CD usage, and the Studio Web push/pull workflow.
