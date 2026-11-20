# SETUP.md

Machine-executable setup, build, and test instructions for the UiPath TypeScript SDK.

## Prerequisites

- Node.js 20+ (npm 10+ is bundled)
- git

### Supported platforms

- [x] Linux
- [x] macOS
- [ ] Windows

## Environment Variables

None. All dependencies, including `@uipath/*`, resolve from the public npm registry, and unit tests are fully mocked and need no credentials or external infrastructure. (Integration tests against a live UiPath tenant exist under `tests/integration/` but are not part of this loop.)

## Setup

```bash
# Install exact locked dependencies.
npm ci --no-audit --no-fund
```

## Verify Setup

```bash
node --version
npm ls rollup vitest typescript --depth=0
```

`node --version` confirms Node 20+ is on PATH; `npm ls` exits non-zero if the build/test toolchain failed to install.

## Build

```bash
# The .d.ts bundling across the subpath modules peaks above a 4GB heap — grant
# 6GB, as the repo's CI does (coverage.yml, publish.yml), to avoid an OOM abort.
NODE_OPTIONS="--max-old-space-size=6144" npm run build
```

Runs rollup and emits ESM, CJS, UMD bundles and `.d.ts` files per module into `dist/`.

## Test

```bash
npm run test:unit
```

Runs the full vitest unit suite (no network, no credentials required).

## Sample Code Change

### The change

Add a new exported function `filterNullish` to `src/utils/object.ts` — the symmetric complement of the existing `filterUndefined` (which removes only `undefined` values), removing both `null` and `undefined`. Append at the end of the file:

```typescript
/**
 * Filters out null and undefined values from an object
 * @param obj The source object
 * @returns A new object without null or undefined values
 */
export function filterNullish<T extends Record<string, any>>(obj: T): Partial<T> {
  const result: Partial<T> = {};

  for (const [key, value] of Object.entries(obj)) {
    if (value !== null && value !== undefined) {
      result[key as keyof T] = value;
    }
  }

  return result;
}
```

Then create a new test file `tests/unit/utils/object.test.ts` with exactly this content:

```typescript
import { describe, it, expect } from 'vitest';
import { filterNullish } from '@/utils/object';

describe('filterNullish', () => {
  it('removes null and undefined values', () => {
    expect(filterNullish({ a: 1, b: undefined, c: null, d: 'x' })).toEqual({ a: 1, d: 'x' });
  });

  it('returns an equal object when no nullish values are present', () => {
    expect(filterNullish({ a: 1, b: 'x', c: false, d: 0 })).toEqual({ a: 1, b: 'x', c: false, d: 0 });
  });
});
```

Do not modify any existing function, export, or test.

### Verification

```bash
npx vitest run tests/unit/utils/object.test.ts
npm run typecheck
```

## Troubleshooting

### Build aborts with `FatalProcessOutOfMemory` / `JavaScript heap out of memory`

The build's peak heap is above both Node's default cap and 4GB. Re-run with the 6GB heap the repo's CI uses: `NODE_OPTIONS="--max-old-space-size=6144" npm run build`.

### `vitest: command not found` / `rollup: command not found`

Dependencies are not installed — run `npm ci` from the repo root and invoke tools through npm scripts (`npm run build`, `npm run test:unit`) or `npx`.

## Architecture

- `src/core/` — UiPath client, auth (OAuth + secret-based), config, errors, HTTP client, telemetry
- `src/services/` — typed service clients per platform area (Action Center, Conversational Agent, Data Fabric, Maestro, Orchestrator)
- `src/models/` — TypeScript interfaces/types per service domain
- `src/utils/` — constants, pagination, encoding, HTTP helpers
- `tests/unit/` — vitest unit tests (mocked, no network); `tests/integration/` — live-API tests, excluded from this loop
- Build is rollup-based (`rollup.config.js`); each service is published as a separate subpath export
