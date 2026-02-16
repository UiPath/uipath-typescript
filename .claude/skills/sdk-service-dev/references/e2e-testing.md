# E2E Testing with Sample App

After implementing a new service, validate it end-to-end by building a test package and exercising the new methods in `samples/process-app-v1`. This catches issues that unit tests miss — import path problems, build output errors, type declaration bugs, and runtime transform failures.

## Overview

```
Build SDK → Pack tarball → Install in sample app → Add test code → Run dev server →
Validate with Playwright → Clean up test code
```

The sample app uses **OAuth frontend auth** and **Vite dev server** at `http://localhost:5173`.

## Step 1: Build and Pack

From the repo root:

```bash
# Build all modules (ESM, CJS, UMD, .d.ts)
npm run build

# Create test tarball with a unique name to avoid caching issues
# Bump the patch version or add a prerelease tag to force npm to reinstall
npm version 1.0.0-test.1 --no-git-tag-version
npm pack
# → uipath-uipath-typescript-1.0.0-test.1.tgz
```

**Why change the version?** npm caches tarballs by version. If you rebuild and repack at `1.0.0`, `npm install` may use the cached copy instead of the new one. A unique version forces a fresh install.

## Step 2: Install in Sample App

```bash
cd samples/process-app-v1

# Update package.json to point to the new tarball
# Change: "file:../../uipath-uipath-typescript-1.0.0.tgz"
# To:     "file:../../uipath-uipath-typescript-1.0.0-test.1.tgz"
npm install
```

Verify the new service's types are available:
```bash
# Quick check — does the new import path resolve?
node -e "require('@uipath/uipath-typescript/<new-service>')"
```

## Step 3: Add Test Code to Sample App

Add a temporary test component or modify an existing one to exercise the new service methods. The goal is to call every new method and log the responses.

### What to test

For each new method:
1. **Import works** — the modular import path resolves (`import { NewService } from '@uipath/uipath-typescript/<path>'`)
2. **Instantiation works** — `new NewService(sdk)` doesn't throw
3. **Method calls work** — actual API calls return data with correct types
4. **Response shape is correct** — fields are camelCase, renames applied, dropped fields absent
5. **Bound methods work** (if applicable) — `entity.methodName()` exists and calls succeed
6. **Pagination works** (if applicable) — `getAll({ top: 5 })` returns paginated response with navigation

### Example test pattern

Always import the SDK response interfaces and type your variables explicitly. This catches type mismatches at compile time — if a field was renamed, dropped, or has the wrong type, TypeScript will flag it before you even run the app.

Add a temporary file like `src/components/TestNewService.tsx`:

```typescript
import { NewService } from '@uipath/uipath-typescript/<import-path>';
import type {
  NewEntityGetResponse,
  NewEntityGetAllResponse,
  NewEntityGetAllOptions,
} from '@uipath/uipath-typescript/<import-path>';
import { useAuth } from '../hooks/useAuth';

export function TestNewService() {
  const { sdk } = useAuth();

  const runTests = async () => {
    const service = new NewService(sdk);

    // Test getAll — type the response to catch shape mismatches
    console.log('[TEST] getAll:');
    const all: NewEntityGetAllResponse[] = await service.getAll();
    console.log('[TEST] getAll response:', JSON.stringify(all, null, 2));

    // Test getById — type the response to verify field names and bound methods
    console.log('[TEST] getById:');
    const item: NewEntityGetResponse = await service.getById('<testId>');
    console.log('[TEST] getById response:', JSON.stringify(item, null, 2));
    console.log('[TEST] response fields:', Object.keys(item));

    // Access typed fields — TS will error if these don't exist on the response type
    console.log('[TEST] typed field access:', item.id, item.createdTime);

    // Test bound methods (if applicable) — TS verifies these exist on the type
    if (typeof item.someMethod === 'function') {
      console.log('[TEST] bound method someMethod exists');
      const result = await item.someMethod(testData);
      console.log('[TEST] someMethod result:', JSON.stringify(result, null, 2));
    }

    // Test pagination (if applicable) — type the options to verify option names
    console.log('[TEST] pagination:');
    const options: NewEntityGetAllOptions = { top: 2 };
    const paginated = await service.getAll(options);
    console.log('[TEST] paginated response:', JSON.stringify(paginated, null, 2));
    console.log('[TEST] has nextPage:', 'nextPage' in paginated);
  };

  return <button onClick={runTests}>Run New Service Tests</button>;
}
```

**Why explicit types matter:** If the SDK response type says `createdTime: string` but the transform pipeline forgot to rename `createTime`, TypeScript will show an error on `item.createdTime` — you catch it before runtime. Similarly, if a bound method is missing from the type, `item.someMethod` will be a TS error. This is a compile-time safety net for the entire transform + binding pipeline.

Wire it into `App.tsx` temporarily (behind the auth check).

## Step 4: Run and Validate

Before starting the dev server, ensure the redirect URI port is free. The OAuth flow requires the app to run on the exact port configured in `VITE_UIPATH_REDIRECT_URI` (default `http://localhost:5173`).

```bash
# Make sure .env exists with valid OAuth credentials
# (copy from .env.example if needed, fill in real values)

# Read the port from .env (defaults to 5173)
REDIRECT_PORT=$(grep VITE_UIPATH_REDIRECT_URI .env | grep -oE '[0-9]+$' || echo 5173)

# Kill any process already using that port
lsof -ti:$REDIRECT_PORT | xargs kill -9 2>/dev/null || true

npm run dev
# → Vite dev server must start on the REDIRECT_URI port for OAuth to work
```

If Vite starts on a different port (e.g., 5174 because 5173 was busy), OAuth will fail with a redirect mismatch. Always clear the port first.

### Validate with Playwright

Use the Playwright browser automation tools to:

1. Navigate to `http://localhost:5173`
2. Complete OAuth login (if not already authenticated)
3. Click the test button / trigger the test component
4. Read console logs to verify responses

### Handling OAuth login failures or signin failed on clicking signin with uipath

If the OAuth login fails or the page is stuck (redirect loop, blank screen, stale session, or sign in / login failed) follow below steps:

1. **Clear session storage first** — run in the browser console:
   ```javascript
   sessionStorage.clear();
   localStorage.clear();
   ```
2. **Re-click the sign-in button** — navigate back to `http://localhost:5173` and trigger login again
3. If it still fails, check the `.env` values (client ID, redirect URI, scopes) match the OAuth app registration

```
Check console output for:
  ✓ [TEST] getAll response — has expected fields, no dropped fields
  ✓ [TEST] getById response — correct field names (camelCase, renamed)
  ✓ [TEST] bound methods exist — typeof check passes
  ✓ [TEST] bound method results — operations succeed
  ✓ [TEST] pagination — correct structure (PaginatedResponse or NonPaginatedResponse)
```

### What to look for

| Check | Pass | Fail |
|-------|------|------|
| Import resolves | No module-not-found error | `Cannot find module '@uipath/uipath-typescript/<path>'` |
| Fields are camelCase | `createdTime`, `folderId` | `CreatedTime`, `organizationUnitId` |
| Dropped fields absent | Internal fields not in response | `entityTypeId`, `isRbacEnabled` showing up |
| Bound methods exist | `typeof entity.method === 'function'` | `entity.method is undefined` |
| Pagination shape | `{ data: [...], nextPage }` or `{ data: [...], totalCount }` | Raw API shape leaking through |
| Types match runtime | No TypeScript errors in IDE | Type says `string` but runtime is `number` |

## Step 5: Clean Up

After validation, revert all test changes:

1. **Remove test component** — delete `src/components/TestNewService.tsx`
2. **Revert App.tsx** — remove the test component import/usage
3. **Revert root package.json version** — restore to `1.0.0` (or whatever it was)
4. **Revert sample app package.json** — restore tarball reference to original
5. **Delete test tarball** — `rm uipath-uipath-typescript-1.0.0-test.1.tgz`
6. **Don't commit any of these test changes**

## Quick Reference

| Item | Path / Command |
|------|---------------|
| Build SDK | `npm run build` (from repo root) |
| Pack SDK | `npm pack` (from repo root) |
| Tarball output | `uipath-uipath-typescript-{version}.tgz` (repo root) |
| Sample app | `samples/process-app-v1/` |
| App dev server | `npm run dev` → `http://localhost:5173` |
| SDK dependency in app | `"file:../../uipath-uipath-typescript-{version}.tgz"` in package.json |
| Auth config | `samples/process-app-v1/.env` (copy from `.env.example`) |
| Auth type | OAuth 2.0 frontend flow |
| Existing services in app | MaestroProcesses, ProcessInstances, Entities |
