# Getting Started

**Coded Apps** is a static-site hosting service through which one can build and deploy standard browser-based web application (React, Vue, Angular, etc.) to UiPath. The platform offers uipath-typescript sdk using which one can handle OAuth and integration with UiPath artifacts.

!!! warning "Static builds only"
    Coded Apps hosts static builds only. You can use any framework that builds to static HTML, CSS, and JavaScript files, and the build output must include an `index.html` file at its root. Server-side rendering (SSR) frameworks are not supported (Next.js, Nuxt, Remix, etc.).

---

## Prerequisites

- **Node.js** 20.x or higher
- **npm** 8.x or higher

## Install the CLI

<!-- termynal -->

```bash
$ npm install -g @uipath/cli

$ uip tools install codedapp
```

For minimum versions and updates, see [CLI Reference](cli-reference.md#installation).

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

Coded app will be deployed and served at `https://<orgName>.uipath.host/<appName>`. When deployed, platform injects `<base href="/your-app-name/">` into your `index.html`. Make sure your app handles this correctly by following the best practices below:

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

!!! tip "Tip: Overriding the redirect URI"
    By default, the SDK reads `redirectUri` from the `<meta name="uipath:redirect-uri">` tag. You can also compute it at runtime, which is useful when the same app is reachable at multiple URLs (for example, orgs whose name contains `_` are also reachable at the hyphen form, or apps served from both a self-hosted URL and `uipath.host`):

    ```typescript
    import { UiPath } from '@uipath/uipath-typescript/core'
    import { getAppBase } from '@uipath/uipath-typescript'

    const sdk = new UiPath({
      redirectUri: window.location.origin + getAppBase(),
    })
    await sdk.initialize()
    ```

    `getAppBase()` returns the app root injected by the platform, so the URI stays stable regardless of which route the user is on.

    Overrides work per field — `clientId` and `scope` still come from the meta tags. Passing `secret` instead is not a field override: it selects secret authentication for the instance and the injected OAuth fields are dropped.

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

To serve the app at a different path, pass `--path-name` to `uip codedapp deploy`.

Refer to [CLI Reference](cli-reference.md) for details.

!!! info "Coded apps deployment domain"
    Coded Apps uses `uipath.host` domain (for example, `<orgname>.uipath.host`) because Coded Apps is a static-site hosting service separate from the main UiPath application site. Key reasons are:

    - Separation of concerns: Coded Apps publishes static HTML/CSS/JS from your package and exposes it at a dedicated site URL under uipath.host rather than the UiPath product domain.
    - Site types and naming: Coded app sites are published under `https://<orgname>.uipath.host/<appname>`. This provides a predictable, account-scoped URL scheme.

To deploy the app as part of a solution instead, see [Deploy with Solutions](#deploy-with-solutions).

## Deploy with Solutions

A coded app can live in a solution and be deployed with it, from Studio Web or with the CLI. The same package can be deployed as an internal app or a public app: you choose with the **Authentication** setting at deploy time. [Public coded apps](#public-coded-apps-preview) deploy only this way.

### Get the app into a solution

- **Cloud solution:** run `uip codedapp push --solution-name "<Solution>" --project-name "<App>"` from the app folder. The first push creates the solution and the coded app project in the Studio Web **Cloud Workspace**.
- **Local solution**, a solution stored on your machine (see [Solutions in the Local Workspace](https://docs.uipath.com/studio-web/automation-cloud/latest/user-guide/solutions-in-the-local-workspace)): create it with `uip solution init` and `uip codedapp init`. Upload it to the Cloud Workspace to deploy from Studio Web, or deploy it with the CLI.

For the commands, see [CLI Reference: Deploy with a solution](cli-reference.md#deploy-with-a-solution).

### Deploy from Studio Web

1. Open the solution in Studio Web, select the arrow on **Deploy**, and then select **Deploy**.
2. Check the version, the location and the solution folder name.
3. Select the arrow on the **Deploy** button at the bottom, and then select **Customize**. Studio Web packs and publishes the solution, then opens the resource settings.
4. Under **Apps**, select the coded app and set:

    | Setting | Internal app | Public app (preview) |
    |---|---|---|
    | **Path name** | The path the app is served at | The path the app is served at |
    | **Authentication** | **User sign-in** | **Public**. Set it before **External application**. |
    | **External application** | The non-confidential external application users log in with | A confidential external application. The list shows these only once **Public** is selected. |
    | **Client secret** | Not used | The external application's secret |

5. Select **Validate**, and then **Continue**.

### Deploy from the CLI

Pack, publish and deploy the solution with `uip solution`, setting the same values as in the table above. See [CLI Reference: Deploy with a solution](cli-reference.md#deploy-with-a-solution). For a pipeline, see [Coded App inside Solution](ci-cd-github-actions.md#coded-app-inside-solution).

### After deploying a public app

1. **Give the external application a role** in the folder the deployment created (`<location>/<solution folder>`): in Orchestrator, open the folder, select **Assign accounts/group/external app**, and assign a role such as **Automation User**. Data Fabric entities need **View** and **Create** on entity records.
2. **Open the app** in a private window. It opens without a login.

An upgrade keeps the public app's client secret and the scope bound to it. To apply a changed `scope` from `uipath.json`, enter the client secret again when you upgrade.

## Public coded apps (preview)

A public coded app opens without a login. For the product overview, see [Public coded apps](https://docs.uipath.com/apps/automation-cloud/latest/user-guide-ca/public-coded-apps).

Requires:

- `@uipath/uipath-typescript` `1.8.5` or later
- UiPath CLI (`@uipath/cli`) `1.206.0` or later
- `@uipath/coded-apps-dev` `1.0.0` or later, to run the app locally
- For AI coding agents, the UiPath skills (`@uipath/skills`) `1.207.0` or later. Until `1.207.0` is released, use the preview: `npm install @uipath/skills@preview`.

You don't change any code to make an app public. Initialize the SDK as usual:

```typescript
const sdk = new UiPath();
await sdk.initialize();
```

When the app is deployed as public, the platform adds a `uipath:app-key` meta tag to the page. The SDK reads it and switches to public mode:

- `initialize()` starts a session for the visitor instead of redirecting to the UiPath login.
- Each call goes to the Apps service, which makes it as the app's confidential external application, and only for the resources the app declares.
- When the session expires, the SDK starts a new one.

### Supported calls

| Call | Notes |
|---|---|
| `processes.start(...)` | Starts a job. The job key is `result[0].key`. |
| `new Jobs(sdk).getOutput(jobKey)` | `Jobs` comes from `@uipath/uipath-typescript/jobs`. |
| `entities.insertRecord({ name }, data)` | |
| `entities.getRecordByName(name, recordId)` | |
| `entities.getRecordsByName(name, options?)` | Supports `pageSize`, `jumpToPage` and `cursor`. |
| `buckets.uploadFile({ name }, fileName, content, options?)` | Returns the stored `path`. |

Any other call throws a `ValidationError`. For anything else, start a process that does it.

### Declaring resources

List every resource the app uses in `bindings_v2.json`, next to `package.json` (in a local solution, in the app's project folder next to `source/`). Today you write this file by hand; generating it from your code is coming soon.

```json
{
  "version": "2.0",
  "resources": [
    {
      "resource": "process",
      "key": "Invoices.Shared",
      "value": {
        "name": { "defaultValue": "Invoices", "isExpression": false, "displayName": "Name" },
        "folderPath": { "defaultValue": "Shared", "isExpression": false, "displayName": "Folder Path" }
      },
      "metadata": { "BindingsVersion": "2.2" }
    }
  ]
}
```

- `resource`: `process`, `entity` or `bucket`.
- `key`: `Name.FolderPath`. For an entity, the name alone, with folder path `"."`.

In code, pass the same name and folder. A resource that isn't listed is refused with `403`.

```typescript
await sdk.processes.start({ name: 'Invoices' }, { folderPath: 'Shared' });
```

### Who can read what

Set an access mode per resource in `uipath.json`, by binding key. `uipath.json` must be in the build output:

```json
{
  "scope": "<scopes>",
  "access": [
    { "resource": "entity", "key": "Orders", "mode": "session" },
    { "resource": "process", "key": "Invoices.Shared", "mode": "all" }
  ]
}
```

- `session`: a visitor can read only the data they added in their own session.
- `all`: the data in the declared resource is shared with every visitor. This is the default.

!!! note
    A visitor is identified by their browser session. Opening the app in another browser or a private window, or clearing cookies, starts a new session, and a new session cannot read what an earlier session added.

`scope` must list only application scopes of the external application, for what the app calls, and include `OR.Execution`. Don't add `openid` or `offline_access`.

### Running it locally

With `@uipath/coded-apps-dev` `1.0.0` or later, the dev server runs the app as a public app. Add the external application to `.env.local` and keep that file out of source control:

```bash title=".env.local"
UIPATH_PUBLIC_APP=true
UIPATH_PUBLIC_APP_CLIENT_ID=<external app id>
UIPATH_PUBLIC_APP_CLIENT_SECRET=<client secret>
# Optional: folder used for resources declared without a folder
UIPATH_PUBLIC_APP_FOLDER_KEY=<folder key>
```

Run `npm run dev`. The page opens without a login, and the dev server applies the same bindings and access modes as a deployed app. The secret never reaches the browser. Solution overrides apply only after you deploy.

### Deploying

Public apps deploy only through Solutions, with **Authentication** set to **Public**. See [Deploy with Solutions](#deploy-with-solutions).

## Network requirements

### Allowlisting Domains

To ensure the proper functioning of Coded Apps, it is essential to allowlist specific domains in your firewall settings. This allows the app to communicate with necessary services and resources. The required domains include:

| Description | Domain |
|---|---|
| Host path for coded apps | `<orgname>.uipath.host` |
| API domain for coded apps | `api.uipath.com` |
