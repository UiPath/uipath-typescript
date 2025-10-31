# E2E Testing Strategy

## Overview

This document outlines our E2E testing strategy for the UiPath TypeScript SDK, ensuring the SDK works correctly across all consumption scenarios: different module systems, bundlers, frameworks, and environments.

---

## Core Testing Categories

### 1. Module Testing
**What**: Testing how the SDK loads as a JavaScript/TypeScript module.

**What we test**:
- ✅ ESM imports (`import { UiPath } from '@uipath/uipath-typescript'`)
- ✅ CommonJS requires (`const { UiPath } = require(...)`)
- ✅ UMD browser globals (`window.UiPathSDK`)
- ✅ TypeScript type definitions
- ✅ Tree-shaking effectiveness
- ✅ Package.json exports configuration

**Tools**: Vitest (Node.js testing, no browser needed)

---

### 2. Framework Testing
**What**: Testing basic SDK functionality within real application frameworks.

**Why framework testing?**
While frameworks are built on modules, they add layers that can break our SDK:
- **Different build processes**: React (Vite), Angular (Webpack) process modules differently
- **Different bundler configs**: Framework CLIs have opinionated bundler setups
- **Runtime environments**: SSR runs in Node.js, client runs in browser
- **Build optimizations**: Each framework's build tool may transform our code differently

Module testing verifies imports work, but doesn't catch:
- Build failures in Create React App's Webpack setup
- Vue CLI's bundle optimization breaking tree-shaking
- Angular's AOT compiler issues with our TypeScript types
- Next.js SSR importing browser-only code

**What we test**:
- ✅ SDK initializes correctly in each framework
- ✅ Framework's build process completes successfully
- ✅ SDK doesn't break HMR during development
- ✅ SSR doesn't crash (Next.js, Nuxt)

---

### 3. Bundler Testing
**What**: Testing how users' bundlers process our SDK.

**Why this matters**:
When users install our SDK and build their apps with Webpack, Vite, or Rollup, **their bundlers** process our SDK. Even though we build correctly with Rollup, users' bundlers can:
- Break imports (Webpack picks wrong export format)
- Duplicate code (bundles both ESM + CJS versions)
- Inflate bundle size (failed tree-shaking)
- Cause runtime errors (incorrect module resolution)

**What we test**:
- ✅ **No duplicate code**: SDK isn't bundled twice (both ESM + CJS versions)
- ✅ **Tree-shaking works**: When user imports only `queues`, other services 
- ✅ **Dependencies not duplicated**: If both user's app and our SDK use a dependency (axios), it's only bundled once (not twice)
- ✅ **Correct module resolution**: Bundler picks the right format (ESM vs CJS)
- ✅ **Code splitting works**: Dynamic imports don't break SDK

*note*: playwright not needed


---

## Directory Structure

```
tests/e2e/
├── module-tests/              # Pure module format testing
│   ├── esm/
│   │   ├── import.test.ts
│   │   └── tree-shaking.test.ts
│   ├── commonjs/
│   │   └── require.test.ts
│   └── umd/
│       └── browser-global.test.ts
│
├── framework-tests/           # Test specs for frameworks
│   ├── react.spec.ts
│   ├── vue.spec.ts
│   └── angular.spec.ts
│
├── test-apps/                 # Minimal demo apps
│   ├── react-app/
│   │   ├── src/App.tsx
│   │   ├── package.json       # Only React + SDK
│   │   └── vite.config.ts
│   ├── vue-app/
│   └── angular-app/
│
├── bundler-tests/             # Build analysis
│   ├── webpack.spec.ts        # Build & analyze
│   ├── vite.spec.ts           # Build & analyze
│   ├── rollup.spec.ts         # Build & analyze
│   └── browser-umd.spec.ts    # ⚠️ Needs Playwright
│
├── playwright.config.ts       # Single config for all
└── package.json               # All test dependencies
```

---

## What We're Testing For

### Module Loading
```typescript
✓ ESM named imports
✓ ESM default import
✓ CommonJS require
✓ Dynamic import()
✓ UMD global variable
✓ TypeScript types
```

### API Surface
```typescript
✓ All classes exported
✓ All interfaces/types exported
✓ No internal APIs exposed
```

### Build Artifacts
```typescript
✓ dist/index.mjs (ESM)
✓ dist/index.cjs (CommonJS)
✓ dist/index.umd.js (UMD)
✓ dist/index.d.ts (Types)
✓ Source maps accurate
```

### Bundle Quality
```typescript
✓ Tree-shaking removes unused code
✓ No duplicate dependencies
✓ Code splitting works
✓ Minification safe
```

### Real-World Problems We Catch

1. **Tree-shaking Failure**: Entire SDK bundled when user only imports one service
   → Result: 300KB bundle instead of 50KB

2. **Module Resolution Errors**: "Cannot use import statement"
   → Result: Runtime crashes

---

## Tool Requirements

### When to Use Playwright

| Test Type | Needs Playwright? | Reason |
|-----------|------------------|--------|
| Module Tests (ESM/CJS) | ❌ No | Just Node.js testing |
| Bundler Tests (analysis) | ❌ No | Run bundlers, analyze output |
| UMD in browser | ✅ Yes | Need real browser |
| Framework Apps | ✅ Yes | Testing real apps in browser |
| OAuth flows | ✅ Yes | Browser redirects |
| Tree-shaking | ❌ No | Analyze build output |
| TypeScript types | ❌ No | Use tsc API |

---

## Example Test Scenarios

### Module Test
```typescript
// ESM import works correctly
import { UiPath } from '@uipath/uipath-typescript';
const sdk = new UiPath(config);
expect(sdk.queues).toBeDefined();
```

### Framework Test (Playwright)
```typescript
// React: Basic SDK functionality works
test('SDK works in React app', async ({ page }) => {
  await page.goto('http://localhost:3000');

  // SDK initialized
  await expect(page.locator('[data-testid="sdk-ready"]')).toBeVisible();

  // Basic API call works
  await page.click('[data-testid="load-queues"]');
  await expect(page.locator('.queues-list')).toBeVisible();
});
```

### Bundler Test (No Playwright)
```typescript
// Vite: Tree-shaking works
const minimalBuild = await build({ input: 'minimal.js' });
const minimalSize = minimalBuild.output[0].code.length;
expect(minimalSize).toBeLessThan(50_000); // <50KB
```