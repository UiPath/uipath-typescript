# E2E Testing — On-the-Fly App

After implementing a new service, validate it end-to-end by scaffolding a temporary React app, exercising the new methods, and deleting the app when done. This catches issues unit tests miss — import path problems, build output errors, type declaration bugs, and runtime transform failures.

**No permanent boilerplate lives in the repo.** The skill creates the entire app from scratch each time and removes it after validation.

## Overview

```
Build SDK → Pack tarball → Scaffold temp app → Generate test component →
npm install → npm run dev → Validate in browser → Delete entire app
```

## Step 1: Build and Pack

From the repo root:

```bash
npm run build
npm version 1.0.0-test.1 --no-git-tag-version
npm pack
# → uipath-uipath-typescript-1.0.0-test.1.tgz
```

**Why change the version?** npm caches tarballs by version. A unique version forces a fresh install.

## Step 2: Scaffold the App

Create a temporary app at `samples/e2e-test/`. The entire directory is ephemeral — deleted after validation.

### Files to generate

**`package.json`**
```json
{
  "name": "e2e-test-app",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build"
  },
  "dependencies": {
    "@uipath/uipath-typescript": "file:../../uipath-uipath-typescript-1.0.0-test.1.tgz",
    "path-browserify": "^1.0.1",
    "react": "^19.1.1",
    "react-dom": "^19.1.1"
  },
  "devDependencies": {
    "@types/react": "^19.1.13",
    "@types/react-dom": "^19.1.9",
    "@vitejs/plugin-react": "^5.0.3",
    "autoprefixer": "^10.4.21",
    "postcss": "^8.5.6",
    "tailwindcss": "^3.4.17",
    "typescript": "~5.8.3",
    "vite": "^7.1.7"
  }
}
```

**`vite.config.ts`**

The browser may hit CORS errors when calling the UiPath API directly (e.g., `alpha.uipath.com` does not send CORS headers). Use a Vite proxy to route API calls through the dev server. Replace `__ORG_NAME__` and `__BASE_URL__` with actual values from `.env`.

```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  define: { global: 'globalThis' },
  resolve: { alias: { path: 'path-browserify' } },
  optimizeDeps: { include: ['@uipath/uipath-typescript'] },
  server: {
    proxy: {
      '/__ORG_NAME__': {
        target: '__BASE_URL__',
        changeOrigin: true,
        secure: true,
      },
    },
  },
})
```

**`tsconfig.json`**
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "useDefineForClassFields": true,
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "verbatimModuleSyntax": true,
    "moduleDetection": "force",
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true
  },
  "include": ["src"]
}
```

**`tailwind.config.js`**
```javascript
/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: { extend: {} },
  plugins: [],
}
```

**`postcss.config.js`**
```javascript
export default {
  plugins: { tailwindcss: {}, autoprefixer: {} },
}
```

**`index.html`**
```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>UiPath SDK — E2E Test</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

**`src/index.css`**
```css
@tailwind base;
@tailwind components;
@tailwind utilities;

body {
  margin: 0;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
  -webkit-font-smoothing: antialiased;
}
```

**`src/main.tsx`**
```typescript
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(<App />)
```

### SDK initialization — PAT auth

The app uses **PAT (secret-based) auth**, not OAuth. The SDK is ready immediately on construction — no `sdk.initialize()`, no redirect flow, no login screen.

**`src/hooks/useSdk.tsx`**

Read PAT and config from `.env` in the repo root. Parse it and pass values as Vite-compatible env vars in a `.env` file, OR read them at scaffold time and inline them into the hook.

The simplest approach — inline the values read from `.env` directly:

```typescript
import { createContext, useContext, useState } from 'react';
import type { ReactNode } from 'react';
import { UiPath } from '@uipath/uipath-typescript/core';

interface SdkContextType {
  sdk: UiPath;
  config: {
    baseUrl: string;
    orgName: string;
    tenantName: string;
  };
}

const SdkContext = createContext<SdkContextType | undefined>(undefined);

export const SdkProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // Values inlined from .env.skills at scaffold time
  // Use window.location.origin so requests route through the Vite proxy (avoids CORS)
  const baseUrl = window.location.origin;
  const orgName = '__ORG_NAME__';
  const tenantName = '__TENANT_NAME__';
  const secret = '__PAT_TOKEN__';

  const [sdk] = useState<UiPath>(() => new UiPath({
    baseUrl,
    orgName,
    tenantName,
    secret,
  }));

  const config = { baseUrl, orgName, tenantName };

  return (
    <SdkContext.Provider value={{ sdk, config }}>
      {children}
    </SdkContext.Provider>
  );
};

export const useSdk = () => {
  const context = useContext(SdkContext);
  if (!context) throw new Error('useSdk must be used within SdkProvider');
  return context;
};
```

When scaffolding, replace `__PAT_TOKEN__`, `__BASE_URL__`, `__ORG_NAME__`, `__TENANT_NAME__` with actual values from `.env`. This avoids needing a separate `.env` file in the temp app.

**`src/App.tsx`** — generated per service (see Step 3).

## Step 3: Generate Test Component

Create `src/App.tsx` with a test UI tailored to the onboarded methods. There is **no fixed template** — design the component to match what's being tested.

### SDK access pattern

Every component accesses the SDK via the `useSdk` hook:

```typescript
import { useSdk } from './hooks/useSdk';

function TestContent() {
  const { sdk, config } = useSdk();
  // sdk is ready immediately — PAT auth, no initialize() needed
}
```

### Design the component based on method types

| Method type | Component pattern |
|-------------|-------------------|
| `getAll` | Fetch on button click, render as table/list |
| `getById` | Input for ID, fetch on submit, render detail view |
| `create` / `insert` | Form with fields, submit button, show response |
| `update` | Fetch existing, pre-fill form, submit changes |
| `delete` | List with delete buttons, confirm + show result |
| `cancel` / `pause` / `resume` | Action buttons on fetched entities |
| Paginated methods | Show page controls, next/prev buttons |
| Bound methods | Fetch entity, then show buttons for each bound method |

### Key rules for the generated component

1. **Import SDK response types explicitly** — type your variables so TypeScript catches shape mismatches at compile time
2. **Display raw JSON responses** — use `<pre>{JSON.stringify(result, null, 2)}</pre>` so you can inspect field names, casing, and structure
3. **Show errors in the UI** — catch errors and display them, don't just console.log
4. **Test bound methods visually** — render a button for each bound method on retrieved entities
5. **Use Tailwind for layout** — keep it functional, not pretty

### App.tsx structure

```typescript
import { SdkProvider } from './hooks/useSdk';
// Import the test content component (inline or separate file)

function App() {
  return (
    <SdkProvider>
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 py-4">
            <h1 className="text-xl font-semibold text-gray-900">
              E2E Test — {ServiceName}
            </h1>
          </div>
        </header>
        <main className="max-w-7xl mx-auto px-4 py-8">
          <TestContent />
        </main>
      </div>
    </SdkProvider>
  );
}

export default App;
```

## Step 4: Install and Run

```bash
cd samples/e2e-test
npm install
npm run dev
# → Vite dev server at http://localhost:5173
```

Open the browser (or use Playwright `browser_navigate` if available) and interact with the test component.

## Step 5: Validate

### What to verify

| Check | Pass | Fail |
|-------|------|------|
| Import resolves | App loads without errors | `Cannot find module '@uipath/uipath-typescript/<path>'` |
| SDK initializes | No auth errors in console | 401/403 errors |
| Fields are camelCase | `createdTime`, `folderId` | `CreatedTime`, `organizationUnitId` |
| Dropped fields absent | Internal fields not in JSON output | `entityTypeId`, `isRbacEnabled` showing up |
| Bound methods exist | Method buttons render, calls succeed | `TypeError: entity.method is not a function` |
| Pagination shape | Page controls work, next/prev load data | Raw API shape leaking through |
| Types match runtime | No TypeScript errors during build | Type says `string` but runtime is `number` |
| Error cases | Errors display in the UI | White screen, console errors only |

Also check the browser console for import/module errors and unexpected PascalCase keys.

### When validation fails — fix loop

E2E failures mean the implementation has a bug that unit tests missed. Do NOT skip or work around.

| E2E Failure | Root cause location | Fix in |
|-------------|---------------------|--------|
| `Cannot find module` | Missing export or rollup entry | `package.json` exports + `rollup.config.js` |
| Fields still PascalCase | Missing `pascalToCamelCaseKeys()` | Service method transform pipeline |
| Dropped fields present | Field not excluded from public type | `{domain}.types.ts` (remove field) |
| `entity.method is not a function` | `create{Entity}WithMethods()` not applied | Service method return statement |
| Pagination shape wrong | `PaginationHelpers.getAll()` misconfigured | Pagination constants or helper call |
| Type mismatch at runtime | Type definition doesn't match real API | `{domain}.types.ts` field types |

**After fixing:**
1. Re-run `npm run typecheck && npm run lint && npm run test:unit && npm run build` (Step 5)
2. Bump version: `npm version 1.0.0-test.N --no-git-tag-version` (increment N to bust npm cache)
3. Repack: `npm pack`
4. Reinstall: `cd samples/e2e-test && npm install`
5. Restart: `npm run dev`
6. Revalidate the specific check that failed

Do NOT clean up until ALL checks pass. The app must survive failures so the fix loop can iterate without re-scaffolding.

## Step 6: Clean Up

**The calling skill controls when cleanup happens.** This section only describes what to delete — see the calling skill's own cleanup rules for when to run these commands.

Cleanup commands:

```bash
# From repo root
rm -rf samples/e2e-test
rm -f uipath-uipath-typescript-1.0.0-test.*.tgz

# Revert root package.json version
git checkout package.json
```

**Nothing from the E2E test gets committed.** The entire `samples/e2e-test/` directory is ephemeral.

## Critical: SDK Initialization in E2E Apps

**These three rules are non-negotiable.** Breaking any of them causes `"Invalid SDK instance"` errors that look like import/bundling bugs but are actually initialization bugs.

### 1. Use `secret` field, NOT `auth: { type: 'pat', token }`

```typescript
// CORRECT — triggers auto-initialize path, registers in SDKInternalsRegistry
new UiPath({ baseUrl, orgName, tenantName, secret: 'rt_...' })

// WRONG — does NOT register internals correctly for cross-subpath usage
new UiPath({ baseUrl, auth: { type: 'pat', token: 'rt_...' } })
```

**Why:** The `secret` field triggers the secret-based auto-initialize path in the UiPath constructor, which calls `SDKInternalsRegistry.set(this, ...)`. The `auth` object format follows a different code path that may not register internals in the same way, causing `SDKInternalsRegistry.get()` to throw when a service from a different subpath bundle tries to look up the instance.

### 2. Always instantiate inside `SdkProvider` + `useSdk()` hook

```typescript
// CORRECT — lazy init inside React lifecycle
const [sdk] = useState(() => new UiPath({ ... }));

// WRONG — module-level instantiation
const sdk = new UiPath({ ... });  // at file top
const jobs = new Jobs(sdk);       // at file top
```

**Why:** Module-level instantiation runs during Vite's dependency pre-bundling phase, before the module graph is fully resolved. This can cause the core and service bundles to load separate copies of shared code. The `useState` pattern defers instantiation to runtime when all modules are resolved.

### 3. Keep `optimizeDeps: { include: ['@uipath/uipath-typescript'] }` in vite.config.ts

```typescript
// CORRECT
optimizeDeps: { include: ['@uipath/uipath-typescript'] }

// WRONG — creates duplicate bundles with separate WeakMaps
optimizeDeps: { exclude: ['@uipath/uipath-typescript'] }

// WRONG — pre-bundles each subpath separately
optimizeDeps: { include: ['@uipath/uipath-typescript/core', '@uipath/uipath-typescript/jobs'] }
```

**Why:** The SDK uses subpath exports (`/core`, `/jobs`, etc.) that each bundle their own copy of `SDKInternalsRegistry` via rollup. Vite's `optimizeDeps.include` with the base package name tells Vite to treat the package as a single unit, deduplicating shared code. Listing subpaths separately or excluding the package defeats this.

**Always copy the scaffold templates from Step 2 exactly.** Do not freestyle the auth config or initialization pattern.

## Gotchas

These caused failures during real E2E runs:

| Gotcha | Fix |
|--------|-----|
| **`Invalid SDK instance` error** — service constructor throws | You broke one of the 3 rules above. Check auth format (`secret` not `auth`), initialization location (`useState` not module-level), and Vite `optimizeDeps` config |
| **Tarball packed from wrong branch** — `Missing "./jobs" specifier` error on import | Build and pack from the worktree/branch that has the new service, not the main working tree |
| **CORS error** — `Access to fetch blocked by CORS policy` | Vite proxy is configured by default (see vite.config.ts above). Ensure `baseUrl` is `window.location.origin` so requests go through the proxy |
| **npm uses cached tarball** — old version of SDK loads despite rebuilding | Change the version before packing (`npm version 1.0.0-test.N`) to bust npm cache |
| **Port 5173 in use** — Vite starts on 5174, proxy doesn't match | `lsof -ti:5173 \| xargs kill -9` before starting dev server |

## Quick Reference

| Item | Detail |
|------|--------|
| App location | `samples/e2e-test/` (temporary, deleted after) |
| Auth type | PAT / secret-based (auto-initializes, no login flow) |
| PAT source | `.env` in repo root (same token used for live API curl) |
| baseUrl | `window.location.origin` (routes through Vite proxy) |
| Vite proxy | `/{orgName}` → `{BASE_URL}` with `changeOrigin: true` |
| SDK dependency | `"file:../../uipath-uipath-typescript-{version}.tgz"` |
| Dev server | `npm run dev` → `http://localhost:5173` |
| Stack | React + Vite + Tailwind (same as other sample apps) |
| Cleanup | `rm -rf samples/e2e-test` + delete tarball + revert version |
