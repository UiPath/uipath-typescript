# UiPath Coded Apps - Developer Guide

This document provides a comprehensive overview of the UiPath Coded Apps system, covering the SDK, bundler plugin, CLI, and deployment flow.

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Developer Workflow](#developer-workflow)
4. [Configuration File (uipath.json)](#configuration-file-uipathjson)
5. [Bundler Plugin (@uipath/coded-apps)](#bundler-plugin-uipathcoded-apps)
6. [SDK Runtime Helpers](#sdk-runtime-helpers)
7. [CLI Commands](#cli-commands)
8. [Deployment Flow](#deployment-flow)
9. [Scenarios & Edge Cases](#scenarios--edge-cases)

---

## Overview

UiPath Coded Apps enables developers to build custom frontend applications (React, Angular, Vue, etc.) and deploy them to the UiPath platform. The system handles:

- **Local Development**: OAuth authentication, SDK configuration injection
- **Build & Package**: Creating deployable packages with metadata
- **Deployment**: Uploading to CDN, configuring OAuth clients, serving apps

### Key Components

| Component | Package | Purpose |
|-----------|---------|---------|
| SDK | `@uipath/sdk` | Runtime helpers for asset resolution and OAuth |
| Plugin | `@uipath/coded-apps` | Bundler plugin for config injection during build |
| CLI | `@uipath/cli` | Commands for pack, publish, deploy |
| Apps Server | (backend) | Processes packages, uploads to CDN, serves apps |

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         DEVELOPER WORKSTATION                            │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐               │
│  │ uipath.json  │    │   Bundler    │    │   CLI        │               │
│  │ (config)     │───▶│   Plugin     │    │  (pack)      │               │
│  └──────────────┘    └──────────────┘    └──────────────┘               │
│         │                   │                   │                        │
│         │            ┌──────▼──────┐     ┌──────▼──────┐                │
│         │            │  index.html │     │   .nupkg    │                │
│         │            │  (meta tags)│     │  (package)  │                │
│         │            └─────────────┘     └─────────────┘                │
│         │                                       │                        │
└─────────│───────────────────────────────────────│────────────────────────┘
          │                                       │
          │                                       ▼
┌─────────│─────────────────────────────────────────────────────────────────┐
│         │              UIPATH CLOUD PLATFORM                              │
├─────────│─────────────────────────────────────────────────────────────────┤
│         │                                                                 │
│         │         ┌─────────────────┐      ┌─────────────────┐           │
│         │         │  Orchestrator   │      │   Apps Server   │           │
│         └────────▶│  (package store)│─────▶│  (deployment)   │           │
│                   └─────────────────┘      └─────────────────┘           │
│                                                    │                      │
│                                             ┌──────▼──────┐              │
│                                             │  Azure CDN  │              │
│                                             │  (assets)   │              │
│                                             └─────────────┘              │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘
```

---

## Developer Workflow

### Step 1: Create Configuration File

Create `uipath.json` in project root:

```json
{
  "scope": "OR.Execution OR.Folders",
  "clientId": "",
  "orgName": "my-org",
  "tenantName": "my-tenant",
  "baseUrl": "https://cloud.uipath.com",
  "redirectUri": "http://localhost:5173"
}
```

### Step 2: Configure Bundler Plugin

```typescript
// vite.config.ts
import { uipathCodedApps } from '@uipath/coded-apps/vite'

export default {
  plugins: [uipathCodedApps()]
}
```

### Step 3: Use SDK Helpers (Optional)

```typescript
import { getAsset, getAppBase } from '@uipath/sdk'

// For assets in public folder
<img src={getAsset('/images/logo.png')} />

// For router configuration
<BrowserRouter basename={getAppBase()}>
```

### Step 4: Build Application

```bash
npm run build
```

### Step 5: Package Application

```bash
uipath pack ./dist
```

### Step 6: Publish & Deploy

```bash
uipath publish
# Deploy via UiPath Orchestrator UI
```

---

## Configuration File (uipath.json)

### Fields

| Field | Required | Local Dev | Production | Description |
|-------|----------|-----------|------------|-------------|
| `scope` | **Yes** | Yes | Yes | OAuth scopes (e.g., `OR.Execution OR.Folders`) |
| `clientId` | No | Yes* | Injected | OAuth client ID (* needed for local OAuth) |
| `orgName` | No | Yes | Injected | Organization name |
| `tenantName` | No | Yes | Injected | Tenant name |
| `baseUrl` | No | Yes | Injected | UiPath base URL |
| `redirectUri` | No | Yes | Injected | OAuth redirect URI |

### Scenarios

#### Scenario 1: Full Config (Local Development)

```json
{
  "scope": "OR.Execution OR.Folders",
  "clientId": "my-client-id",
  "orgName": "my-org",
  "tenantName": "my-tenant",
  "baseUrl": "https://cloud.uipath.com",
  "redirectUri": "http://localhost:5173"
}
```

**Result**: Local OAuth works, SDK can authenticate.

#### Scenario 2: Minimal Config (Production Only)

```json
{
  "scope": "OR.Execution OR.Folders"
}
```

**Result**:
- Local dev: Plugin shows warning about missing keys
- Production: Apps Server injects all values during deployment

#### Scenario 3: No uipath.json

**During `npm run dev`**:
- Plugin throws error: "Config file not found"
- Suggests creating `uipath.json` with sample config

**During `npm run build`**:
- Plugin logs info: "No uipath.json found - config will be injected at deployment"
- Build succeeds, no meta tags injected

**During `uipath pack`**:
- CLI prompts for scopes
- Creates `uipath.json` with empty placeholders

---

## Bundler Plugin (@uipath/coded-apps)

### Installation

```bash
npm install @uipath/coded-apps --save-dev
```

### Configuration

#### Vite

```typescript
import { uipathCodedApps } from '@uipath/coded-apps/vite'

export default defineConfig({
  plugins: [uipathCodedApps()]
})
```

#### Webpack

```javascript
const { uipathCodedApps } = require('@uipath/coded-apps/webpack')

module.exports = {
  plugins: [uipathCodedApps()]
}
```

#### Rollup

```javascript
import { uipathCodedApps } from '@uipath/coded-apps/rollup'

export default {
  plugins: [uipathCodedApps()]
}
```

#### esbuild

```javascript
import { uipathCodedApps } from '@uipath/coded-apps/esbuild'

await esbuild.build({
  plugins: [uipathCodedApps()]
})
```

### Options

```typescript
uipathCodedApps({
  configPath: 'uipath.json'  // Default: 'uipath.json'
})
```

### What the Plugin Does

1. **Reads** `uipath.json` from project root
2. **Validates** configuration:
   - Checks for typos (e.g., `clientid` → `clientId`)
   - Warns about unknown keys
   - Errors on missing required keys (in dev mode)
3. **Injects** meta tags into `index.html`:

```html
<head>
  <meta name="uipath:client-id" content="...">
  <meta name="uipath:scope" content="...">
  <meta name="uipath:org-name" content="...">
  <meta name="uipath:tenant-name" content="...">
  <meta name="uipath:base-url" content="...">
  <meta name="uipath:redirect-uri" content="...">
</head>
```

### Validation Behavior

| Environment | Missing `scope` | Missing other keys |
|-------------|-----------------|-------------------|
| Development | Error | Error |
| Production | Error | Warning (injected at deployment) |

### Exported Functions

```typescript
// Read and validate config
import { readConfig, validateConfig } from '@uipath/coded-apps'

const config = readConfig({ configPath: 'uipath.json' })
const result = validateConfig(config, 'uipath.json', isDev)
// result: { isValid: boolean, errors: string[], warnings: string[] }

// Generate meta tags
import { generateMetaTags, generateMetaTagsHtml } from '@uipath/coded-apps'

const tags = generateMetaTags(config)  // For Vite
const html = generateMetaTagsHtml(config)  // HTML string

// Transform HTML (for custom integrations)
import { transformHtml } from '@uipath/coded-apps'

const newHtml = transformHtml(htmlString, { configPath: 'uipath.json' })
```

### Constants

```typescript
import {
  PLUGIN_NAME,           // 'coded-apps'
  CONFIG_FILE_NAME,      // 'uipath.json'
  UIPATH_META_TAGS,      // { clientId: 'client-id', scope: 'scope', ... }
  VALID_CONFIG_KEYS,     // ['clientId', 'scope', 'orgName', ...]
  REQUIRED_KEY_ALWAYS,   // 'scope'
  REQUIRED_KEYS_DEV,     // ['scope', 'orgName', 'tenantName', 'baseUrl', 'redirectUri']
} from '@uipath/coded-apps'
```

---

## SDK Runtime Helpers

### Installation

```bash
npm install @uipath/sdk
```

### Functions

#### `getAsset(path: string): string`

Resolves asset paths to CDN URLs in production.

```typescript
import { getAsset } from '@uipath/sdk'

// Local development
getAsset('/images/logo.png')  // Returns: '/images/logo.png'

// Production (after deployment)
getAsset('/images/logo.png')  // Returns: 'https://cdn.../images/logo.png'
```

**Use Cases**:
- Images in `public/` folder
- Any static assets not processed by bundler

**When NOT Needed**:
- Imported assets (`import logo from './logo.png'`) - bundler handles these
- CSS `url()` references - bundler handles these

#### `getAppBase(): string`

Returns the app base path for router configuration.

```typescript
import { getAppBase } from '@uipath/sdk'

// Local development
getAppBase()  // Returns: '/'

// Production
getAppBase()  // Returns: '/orgId/apps_/default/run/.../public'
```

**Usage with React Router**:

```tsx
import { BrowserRouter } from 'react-router-dom'
import { getAppBase } from '@uipath/sdk'

function App() {
  return (
    <BrowserRouter basename={getAppBase()}>
      <Routes>...</Routes>
    </BrowserRouter>
  )
}
```

### How It Works

The SDK reads meta tags injected at deployment:

```html
<meta name="uipath:cdn-base" content="https://cdn.../appId/folderId">
<meta name="uipath:app-base" content="/orgId/apps_/.../public">
```

- If meta tags don't exist (local dev) → returns original path
- If meta tags exist (production) → prepends CDN/app base

---

## CLI Commands

### `uipath pack <dist>`

Packages the built application into a `.nupkg` file.

```bash
uipath pack ./dist [options]
```

#### Options

| Flag | Description | Default |
|------|-------------|---------|
| `--name, -n` | Package name | Prompted or from app config |
| `--version, -v` | Package version | `1.0.0` |
| `--output, -o` | Output directory | `./.uipath` |
| `--author, -a` | Package author | `UiPath Developer` |
| `--description` | Package description | Prompted |
| `--reuse-client` | Reuse existing clientId | `false` (prompts) |
| `--dry-run` | Preview without creating | `false` |

#### Flow

1. **Validate dist directory** - must exist and have files
2. **Load/Create uipath.json**:
   - If exists: validate and load
   - If not exists: prompt for scopes, create file
3. **ClientId handling**:
   - If `--reuse-client` flag: keep existing clientId
   - If clientId exists and no flag: prompt user
   - If user says no: clear clientId (UiPath creates new one)
4. **Copy uipath.json to dist** (with clientId handling)
5. **Create metadata files** (operate.json, bindings.json, etc.)
6. **Create .nupkg package**

#### ClientId Prompt

```
? Do you want to reuse the existing clientId from uipath.json in production
  or let UiPath create one? (Y/n)
```

- **Yes**: Existing clientId preserved in package
- **No**: clientId cleared, UiPath creates new OAuth client during deployment

#### Scope Prompt (if uipath.json missing)

```
? Enter the required scopes for your app (e.g., OR.Execution OR.Folders),
  please refer https://uipath.github.io/uipath-typescript/oauth-scopes/ for details:
```

Creates `uipath.json` with structure:

```json
{
  "scope": "user-provided-scope",
  "clientId": "",
  "orgName": "",
  "tenantName": "",
  "baseUrl": "",
  "redirectUri": ""
}
```

### `uipath publish`

Publishes the package to UiPath Orchestrator.

```bash
uipath publish [options]
```

### `uipath auth`

Authenticates with UiPath Cloud Platform.

```bash
uipath auth
```

---

## Deployment Flow

### What Apps Server Does

When a coded app package is deployed:

1. **Extract Package**: Unzip `.nupkg` to access contents

2. **Validate Config**:
   - Check `uipath.json` exists in package
   - Validate `scope` is provided
   - If `clientId` provided but no `scope` → Error

3. **Process index.html**:

   a. **Replace Asset Paths with CDN URLs**:
   ```html
   <!-- Before -->
   <script src="/assets/index.js"></script>

   <!-- After -->
   <script src="https://cdn.../assets/index.js?version=1.0.0"></script>
   ```

   b. **Remove existing `<base href>` tags** (from Angular, etc.)

   c. **Inject Runtime Meta Tags**:
   ```html
   <meta name="uipath:cdn-base" content="https://cdn.../appId/folderId">
   <meta name="uipath:app-base" content="/orgId/apps_/.../public">
   <base href="/orgId/apps_/.../public/">
   ```

   d. **Inject/Update SDK Config Meta Tags**:
   ```html
   <meta name="uipath:client-id" content="...">
   <meta name="uipath:scope" content="...">
   <meta name="uipath:org-name" content="...">
   <meta name="uipath:tenant-name" content="...">
   <meta name="uipath:base-url" content="...">
   <meta name="uipath:redirect-uri" content="...">
   ```

4. **Upload to CDN**: All assets uploaded to Azure CDN

5. **Create/Update OAuth Client** (if clientId not provided)

### Meta Tags Injected

| Meta Tag | Source | Purpose |
|----------|--------|---------|
| `uipath:cdn-base` | Deployment | CDN URL for `getAsset()` |
| `uipath:app-base` | Deployment | App path for `getAppBase()` |
| `uipath:client-id` | Package or Created | OAuth client ID |
| `uipath:scope` | Package | OAuth scopes |
| `uipath:org-name` | Deployment | Organization name |
| `uipath:tenant-name` | Deployment | Tenant name |
| `uipath:base-url` | Deployment | UiPath base URL |
| `uipath:redirect-uri` | Deployment | OAuth redirect URI |

---

## Scenarios & Edge Cases

### Scenario: Local Development Without Plugin

**Setup**: No `@uipath/coded-apps` plugin configured

**Result**:
- No meta tags injected during build
- SDK's `loadFromMetaTags()` returns `null`
- Must provide config manually to SDK:
  ```typescript
  const uipath = new UiPath({
    clientId: '...',
    scope: '...',
    // ...
  })
  ```

### Scenario: Production Without uipath.json in Package

**Result**: Deployment fails with error:
```
uipath.json not found in package. This file is required for coded app deployment.
```

### Scenario: clientId Provided, scope Missing

**Result**: Deployment fails with error:
```
clientId is provided but scope is missing. Both are required for OAuth to work.
```

### Scenario: Assets Not Loading in Production

**Cause**: Assets in `public/` folder not using `getAsset()`

**Fix**:
```tsx
// Wrong
<img src="/images/logo.png" />

// Correct
import { getAsset } from '@uipath/sdk'
<img src={getAsset('/images/logo.png')} />
```

### Scenario: Routing Not Working in Production

**Cause**: Router not configured with app base path

**Fix**:
```tsx
import { getAppBase } from '@uipath/sdk'

// React Router
<BrowserRouter basename={getAppBase()}>

// Vue Router
const router = createRouter({
  history: createWebHistory(getAppBase()),
  routes
})
```

### Scenario: Reusing OAuth Client Across Deployments

**Use Case**: Want same OAuth client for all deployments

**Solution**:
1. Create OAuth client manually in UiPath
2. Add `clientId` to `uipath.json`
3. Run `uipath pack ./dist --reuse-client`

### Scenario: Different Configs for Dev vs Prod

**Solution**: Only `scope` is required in `uipath.json` for production. Other values are injected during deployment.

```json
// Minimal uipath.json for production
{
  "scope": "OR.Execution OR.Folders"
}
```

For local development, add all required fields or use environment-specific config files.

---

## Quick Reference

### Required Files

| File | Location | Required For |
|------|----------|--------------|
| `uipath.json` | Project root | Pack command |
| `index.html` | Dist folder | Deployment |

### Meta Tags (Full List)

```html
<!-- Runtime (injected by Apps Server) -->
<meta name="uipath:cdn-base" content="...">
<meta name="uipath:app-base" content="...">

<!-- SDK Config (from uipath.json or injected) -->
<meta name="uipath:client-id" content="...">
<meta name="uipath:scope" content="...">
<meta name="uipath:org-name" content="...">
<meta name="uipath:tenant-name" content="...">
<meta name="uipath:base-url" content="...">
<meta name="uipath:redirect-uri" content="...">
```

### SDK Exports

```typescript
// Runtime helpers
export { getAsset, getAppBase } from '@uipath/sdk'

// Meta tag constants
export { RUNTIME_META_TAGS, UIPATH_META_TAGS } from '@uipath/sdk'

// Config loading
export { loadFromMetaTags } from '@uipath/sdk'
```

### Plugin Exports

```typescript
// Bundler plugins
export { uipathCodedApps } from '@uipath/coded-apps/vite'
export { uipathCodedApps } from '@uipath/coded-apps/webpack'
export { uipathCodedApps } from '@uipath/coded-apps/rollup'
export { uipathCodedApps } from '@uipath/coded-apps/esbuild'

// Core functions
export { readConfig, validateConfig, generateMetaTags } from '@uipath/coded-apps'

// Constants
export { CONFIG_FILE_NAME, UIPATH_META_TAGS, PLUGIN_NAME } from '@uipath/coded-apps'
```
