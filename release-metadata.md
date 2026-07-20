# `release-metadata.json`

Machine-readable record of **what public capabilities the SDK exposes and the version each was introduced in**. Shipped in the npm package (`files`) and served at `https://unpkg.com/@uipath/uipath-typescript@latest/release-metadata.json`.

Consumers (e.g. the `uipath-coded-apps` agent skill) use it to answer: *a capability isn't in the user's installed SDK — which version adds it?* Reading a user's installed `.d.ts` tells you whether something exists **now**; only this file tells you the **version to upgrade to** when it's absent.

## Contract

```jsonc
{
  "schema": 1,                    // file-format version
  "sdkVersion": "1.5.5",          // SDK version this file DESCRIBES (captured-from). NOT an intro version.
  "services": [
    {
      "name": "Agents",           // public export name (not the internal `AgentService`)
      "subpath": "@uipath/uipath-typescript/agents",
      "since": "1.4.1",           // version the service was introduced; null = baseline
      "methods": [                // only methods whose version DIFFERS from the service
        { "name": "getSummary", "since": "1.5.0" }   // unlisted methods INHERIT the service `since`
      ]
    },
    { "name": "Entities", "subpath": "@uipath/uipath-typescript/entities", "since": null }
  ],
  "enums": [
    {
      "name": "EntityFieldDataType",
      "subpath": "@uipath/uipath-typescript/entities",
      "values": [ { "name": "MULTILINE_MAX", "since": "1.5.2" } ]
    }
  ]
}
```

- **`services` / `enums` are arrays of objects**, each with a `name` = public export name (`Agents`, not the internal `AgentService`).
- **`since`** = the version a capability was introduced. **`null` = baseline** (shipped before this file existed; not backfilled).
- **`methods`** = array of `{ name, since }`. **Inheritance:** a method with no entry inherits its service's `since`, so only list methods introduced *later* than their service.
- **Scope = presence + `since` only.** No signatures, no renames, no removals. Signature/behavior changes are visible in the installed `.d.ts`; renames are covered by the SDK's `@deprecated` + replacement pointers (deprecate-don't-remove policy).
- **`@internal` is excluded.** Anything a consumer shouldn't rely on must carry an `@internal` JSDoc tag.

## Adding a capability (every release)

1. New **service** → append `{ name, subpath, since: "<this version>" }` to `services`.
2. New **method** on an existing service → append `{ name, since: "<this version>" }` to that service's `methods` **only if** its version differs from the service `since` (else it inherits).
3. New **enum member** → append `{ name, since }` to that enum's `values`.
4. Bump `sdkVersion` to the release version.

Signature-only changes (new options on an existing method) → **no entry** (the installed types carry the shape).

## CI enforcement

`npm run release-metadata:check` (`scripts/check-release-metadata.mjs`, run in `.github/workflows/ci.yml` after a fresh `npm run build`) fails the build if:

- a public service (exported as `*Service as *` from a public subpath) has **no entry** → prints the JSON to add;
- an entry has **no matching public service** → warns (possible removal — confirm before dropping; removals are rare);
- `sdkVersion` ≠ `package.json` version.

The check reads the **freshly-built `dist/`**, never a local one (a stale local `dist/` can omit shipped symbols).

### v1 limitations (follow-ups)

- Enforcement is **service-level**; per-method and per-enum-member entries are authored/curated, not yet machine-verified.
- Non-class public exports (e.g. the `document-understanding` `DuFramework` namespace) are not enumerated.
- Author-assisted generation (auto-diff the surface and stamp new entries) is manual today, guided by the check's output.
