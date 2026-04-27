# Getting Started

**Coded Apps** is a static-site hosting service through which one can build and deploy standard browser-based web application (React, Vue, Angular, etc.) to UiPath. The platform offers uipath-typescript sdk using which one can handle OAuth and integration with UiPath artifacts.

!!! warning "Cloud only"
    Coded Apps are currently available on **UiPath Automation Cloud** only. Automation Suite and Dedicated deployments are not supported at this time.

---

## Prerequisites

- **Node.js** 20.x or higher
- **npm** 9.x or higher

## Install the CLI

<!-- termynal -->

```bash
$ npm install -g @uipath/cli

$ uip tools install codedapp
```

!!! info "Minimum versions"
    Coded Apps requires **CLI version >= 0.1.21** and **codedapp tool version >= 0.1.14**.

    Check your installed CLI version:

    ```bash
    uip --version
    ```

    Check your installed codedapp tool version:

    ```bash
    uip tools list
    ```

    To update the codedapp tool to the latest version:

    ```bash
    uip tools update
    ```

---

## Configure `uipath.json`

Create a `uipath.json` at the root of your project. This file holds SDK and OAuth configuration used both during local development and at deployment time.

```json
{
  "clientId": "your-oauth-client-id",
  "scope": "your-scopes",
  "orgName": "your-org",
  "tenantName": "your-tenant",
  "baseUrl": "https://api.uipath.com",
  "redirectUri": "your-redirect-url"
}
```

| Field | Required | Description |
|-------|----------|-------------|
| `clientId` | **Yes** | A **non-confidential** OAuth client ID registered in your UiPath org |
| `scope` | No | OAuth scopes your app needs. Defaults to all scopes registered with the provided `clientId` |
| `orgName` | No | Your UiPath organization name or ID |
| `tenantName` | No | Your UiPath tenant name or ID |
| `baseUrl` | No | UiPath platform base URL (defaults to `https://api.uipath.com`) |
| `redirectUri` | No | OAuth redirect URI (only needed for local dev) |

!!! tip
    If `uipath.json` doesn't exist, `uip codedapp pack` creates it with empty values and warns you to fill in the required fields.

---

## Set Up Local Development

Install `@uipath/coded-apps-dev` — a bundler plugin that injects SDK configuration into your app during local development, so you can run and test it against your UiPath tenant without any manual config.

=== "npm"

    <!-- termynal -->

    ```bash
    $ npm install --save-dev @uipath/coded-apps-dev
    ```

=== "yarn"

    <!-- termynal -->

    ```bash
    $ yarn add --dev @uipath/coded-apps-dev
    ```

=== "pnpm"

    <!-- termynal -->

    ```bash
    $ pnpm add --save-dev @uipath/coded-apps-dev
    ```

Then add the plugin to your bundler config:

=== "Vite"

    ```typescript title="vite.config.ts"
    import { defineConfig } from 'vite'
    import react from '@vitejs/plugin-react'
    import { uipathCodedApps } from '@uipath/coded-apps-dev/vite'

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
    const { uipathCodedApps } = require('@uipath/coded-apps-dev/webpack')

    module.exports = {
      plugins: [uipathCodedApps()],
    }
    ```

=== "Rollup"

    ```javascript title="rollup.config.js"
    import { uipathCodedApps } from '@uipath/coded-apps-dev/rollup'

    export default {
      plugins: [uipathCodedApps()],
    }
    ```

=== "esbuild"

    ```javascript title="esbuild.config.js"
    const { uipathCodedApps } = require('@uipath/coded-apps-dev/esbuild')

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

When deployed, the platform injects these config tags automatically — the plugin is only needed for local development. At deployment, the platform also injects:

```html
<meta name="uipath:app-base"  content="/your-app-name/">
<base href="/your-app-name/">
```

---

## Pre-deployment Checklist

Coded app will be deployed and served at `https://<orgName>.uipath.host/<appName>`. When deployed, platform injects `<base href="/your-app-name/">` into your `index.html`. Make sure your app handles this correctly by following below best practices:

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

### 3. Initialize the UiPath SDK

For all apps using `@uipath/uipath-typescript`, no constructor arguments are needed for initialization — the SDK reads its configuration from the platform meta tags automatically.

```typescript
import { UiPath } from '@uipath/uipath-typescript/core'

const sdk = new UiPath()
await sdk.initialize()
```

---

## Deploy

<!-- termynal -->

```bash
$ uip login
$ npm run build
$ uip codedapp pack dist -n <appName> --version 1.0.0
$ uip codedapp publish
$ uip codedapp deploy
```

Once deployed, your app is accessible at:

```
https://<orgName>.uipath.host/<appName>
```
Refer to [CLI Reference](cli-reference.md) for details.

!!! info "Coded apps deployment domain"
    Coded Apps uses `uipath.host` domain (for example, <orgname>.uipath.host) because Coded Apps is a static-site hosting service separate from the main UiPath application site. Key reasons are:

    - Separation of concerns: Coded Apps publishes static HTML/CSS/JS from your package and exposes it at a dedicated site URL under uipath.host rather than the UiPath product domain. 
    - Site types and naming: Coded app sites are published under https://<orgname>.uipath.host/<appname>. This provides a predictable, account-scoped URL scheme.

## Network requirements

### Whitelisting Domains

To ensure the proper functioning of Coded Apps, it is essential to whitelist specific domains in your firewall settings. This allows the app to communicate with necessary services and resources. The required domains include:

| Description | Domain |
|---|---|
| Host path for coded apps | `<orgname>.uipath.host` |
| API domain for coded apps | `api.uipath.com` |
